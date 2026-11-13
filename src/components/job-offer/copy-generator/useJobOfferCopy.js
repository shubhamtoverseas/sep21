import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generateJobOfferCopyAPI } from '../../../services/jobOfferCopy';
import { buildCopyInput, copySnapshotHash, diffCopySources } from './buildCopyInput';
import { COPY_LIMITS, COPY_ORIGINS, COPY_STALE_HASH, codePointLength } from './copyGeneratorConfig';

const newRequestKey = () => (window.crypto?.randomUUID
  ? window.crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const normalizeText = (value) => (value || '').normalize('NFC').trim();

const LANGUAGE_KEYS = ['en', 'id', 'zh'];
const EN_TERMINATORS = /[.!?]$/;
const ZH_TERMINATORS = /[。！？.!?]$/;

// The D-08 response is flat: { version, headline_en, description_en, headline_id, description_id, headline_zh, description_zh }
// (`headline_zh` / `description_zh` per field — backend 12 Oct ask 16; the older single `back_translation_zh` still reads)
const flatPackage = (responseData) => {
  const flat = responseData?.data?.headline_en != null ? responseData.data : (responseData?.headline_en != null ? responseData : null);
  if (!flat) return null;
  return {
    version: flat.version,
    en: { headline: flat.headline_en, description: flat.description_en },
    id: { headline: flat.headline_id, description: flat.description_id },
    zh: { headline: flat.headline_zh || '', description: flat.description_zh || flat.back_translation_zh || '' },
  };
};
// A saved package (detail.copy, D-09) → the same text shape, with the Chinese reading when the record kept it
const textFromSaved = (pkg) => (pkg?.headline_en || pkg?.description_en ? {
  en: { headline: normalizeText(pkg.headline_en), description: normalizeText(pkg.description_en) },
  id: { headline: normalizeText(pkg.headline_id), description: normalizeText(pkg.description_id) },
  zh: { headline: normalizeText(pkg.headline_zh), description: normalizeText(pkg.description_zh || pkg.back_translation_zh) },
} : null);

// Client-side mirror of copy_output_schema_v2: English and Indonesian must pass before a version becomes
// current; the Chinese review aid is checked only when the service returns a headline for it (the flat
// D-08 shape carries a back-translation alone). Anything else is INVALID_MODEL_OUTPUT.
const parseAndValidatePackage = (responseData) => {
  const flat = flatPackage(responseData);
  const copy = flat || responseData?.copy || responseData?.data?.copy;
  if (!copy) return { error: 'INVALID_MODEL_OUTPUT' };
  const source = flat ? { en: flat.en, id: flat.id, zh: flat.zh } : {
    en: copy.english,
    id: copy.indonesian,
    zh: copy.traditional_chinese_review,
  };
  const text = {};
  for (const lang of LANGUAGE_KEYS) {
    const headline = normalizeText(source[lang]?.headline);
    const description = normalizeText(source[lang]?.description);
    const [headlineMax, descriptionMax] = COPY_LIMITS[lang];
    const terminator = lang === 'zh' ? ZH_TERMINATORS : EN_TERMINATORS;
    if (lang === 'zh' && !headline) { text.zh = { headline: '', description }; continue; }
    if (!headline || codePointLength(headline) > headlineMax) return { error: 'INVALID_MODEL_OUTPUT' };
    if (!description || codePointLength(description) > descriptionMax || !terminator.test(description)) {
      return { error: 'INVALID_MODEL_OUTPUT' };
    }
    text[lang] = { headline, description };
  }
  return { text, version: flat?.version ?? null };
};

/**
 * Session-local copy state machine for the add-JO flow (no revision exists yet,
 * so versions live in memory until the offer is saved). Mirrors the v2.0 brief:
 * append-only history including failed attempts, Keep Existing Copy without a
 * model call, restore-as-new keeping the restored version's own source hash,
 * and retry replaying the identical request key.
 */
const useJobOfferCopy = ({ copySource, onPackageApplied, jobId = null, initialPackage = null }) => {
  const [versions, setVersions] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [pending, setPending] = useState(null);
  const [failure, setFailure] = useState(null);
  const nextNumberRef = useRef(1);
  const seededRef = useRef(false);

  const currentVersion = useMemo(
    () => versions.find((version) => version.id === currentId) || null,
    [versions, currentId]
  );

  const currentHash = useMemo(() => copySnapshotHash(copySource), [copySource]);

  const copyState = useMemo(() => {
    if (pending) return 'pending';
    if (!currentVersion) return 'none';
    /* a seeded (saved) version binds to the first facts the form shows — until then it is in step by definition */
    return currentVersion.sourceHash === null || currentVersion.sourceHash === currentHash ? 'ready' : 'review';
  }, [pending, currentVersion, currentHash]);

  const changedFields = useMemo(
    () => (copyState === 'review' ? diffCopySources(currentVersion?.source, copySource) : []),
    [copyState, currentVersion, copySource]
  );

  const appendVersion = useCallback((version) => {
    const explicit = Number.isFinite(Number(version.number)) && Number(version.number) > 0 ? Number(version.number) : null;
    const number = version.state === 'COMPLETE' ? (explicit ?? nextNumberRef.current) : null;
    const record = { ...version, id: newRequestKey(), at: version.at || new Date(), number };
    if (number != null) nextNumberRef.current = Math.max(nextNumberRef.current, number) + 1;
    setVersions((prev) => [...prev, record]);
    return record;
  }, []);

  // D-09: the package saved on the record seeds the history once; its facts bind on the first hydrated source.
  // `copy.history[]` (backend 12 Oct ask 16) seeds every earlier round first, oldest to newest, each with the reason /
  // note it was regenerated for; the current package is the version the record carries.
  useEffect(() => {
    if (seededRef.current || !initialPackage) return;
    const text = textFromSaved(initialPackage);
    if (!text) return;
    seededRef.current = true;
    const rounds = (Array.isArray(initialPackage.history) ? initialPackage.history : [])
      .filter((round) => round && Number(round.version) !== Number(initialPackage.version) && textFromSaved(round))
      .sort((a, b) => Number(a.version) - Number(b.version));
    /* U-0244: an earlier round was generated before the current facts — restoring it leaves the copy stale (review) until regenerated */
    rounds.forEach((round) => appendVersion({
      origin: round.reason || round.note ? COPY_ORIGINS.REGENERATION : COPY_ORIGINS.GENERATION, state: 'COMPLETE', text: textFromSaved(round), source: null, sourceHash: COPY_STALE_HASH,
      instruction: [round.reason, round.note].filter(Boolean).join(' — ') || null, parentNumber: null,
      number: round.version, approved: Boolean(round.approved), approvedAt: round.approved_at || null, approvedBy: round.approved_by_name || null,
      at: round.created_at ? new Date(round.created_at) : new Date(),
    }));
    const record = appendVersion({
      origin: initialPackage.reason || initialPackage.note ? COPY_ORIGINS.REGENERATION : COPY_ORIGINS.GENERATION, state: 'COMPLETE', text, source: null, sourceHash: null,
      instruction: [initialPackage.reason, initialPackage.note].filter(Boolean).join(' — ') || null, parentNumber: null,
      number: initialPackage.version, approved: Boolean(initialPackage.approved), approvedAt: initialPackage.approved_at || null, approvedBy: initialPackage.approved_by_name || null,
      at: initialPackage.approved_at ? new Date(initialPackage.approved_at) : new Date(),
    });
    setCurrentId(record.id);
  }, [initialPackage, appendVersion]);
  const seedBoundRef = useRef(false);
  useEffect(() => {
    if (!seededRef.current || seedBoundRef.current || !currentVersion || currentVersion.sourceHash !== null) return;
    if (!copySource?.primary_main_duty && !copySource?.accommodation) return;
    seedBoundRef.current = true;
    setVersions((prev) => prev.map((version) => (version.id === currentVersion.id ? { ...version, source: copySource, sourceHash: currentHash } : version)));
  }, [copySource, currentHash, currentVersion]);

  const runRequest = useCallback((operation, instruction, requestKey, why = null) => {
    const source = copySource;
    const sourceHash = copySnapshotHash(source);
    const parentNumber = currentVersion?.number || null;
    const kind = operation === 'GENERATE' ? 'generate' : 'regenerate';
    setFailure(null);
    setPending({ kind, operation, instruction, requestKey });

    generateJobOfferCopyAPI(buildCopyInput(source, operation, instruction, why), requestKey, jobId)
      .then((response) => {
        const { text, error, version } = parseAndValidatePackage(response?.data);
        if (error) throw new Error(error);
        setPending(null);
        const record = appendVersion({
          origin: operation === 'GENERATE' ? COPY_ORIGINS.GENERATION : COPY_ORIGINS.REGENERATION,
          state: 'COMPLETE',
          text,
          source,
          sourceHash,
          instruction: instruction || null,
          parentNumber,
          number: version,
        });
        setCurrentId(record.id);
        onPackageApplied(record.text);
      })
      .catch((error) => {
        const code = error?.message === 'INVALID_MODEL_OUTPUT' ? 'INVALID_MODEL_OUTPUT' : 'MODEL_REQUEST_FAILED';
        setPending(null);
        setFailure({ kind, operation, instruction, requestKey, code, why });
        appendVersion({ origin: null, state: 'FAILED', kind, instruction: instruction || null, source, sourceHash, text: null });
      });
  }, [copySource, currentVersion, onPackageApplied, appendVersion, jobId]);

  const generate = useCallback(() => {
    if (pending || currentVersion) return;
    runRequest('GENERATE', null, newRequestKey());
  }, [pending, currentVersion, runRequest]);

  const regenerate = useCallback((instruction, why = null) => {
    if (pending || !currentVersion) return;
    runRequest('REGENERATE', (instruction || '').trim() || null, newRequestKey(), why);
  }, [pending, currentVersion, runRequest]);

  // Retry replays the exact same request (same idempotency key) per spec.
  const retry = useCallback(() => {
    if (!failure || pending) return;
    runRequest(failure.operation, failure.instruction, failure.requestKey, failure.why || null);
  }, [failure, pending, runRequest]);

  const dismissFailure = useCallback(() => setFailure(null), []);

  // Restore carries the restored version's own source hash — stale copy re-opens copy review rather than silently
  // rebinding (U-0244: restore-then-revalidate; Keep Existing Copy no longer exists).
  const restore = useCallback((versionId) => {
    if (pending) return;
    const target = versions.find((version) => version.id === versionId);
    if (!target || target.state !== 'COMPLETE' || target.id === currentId) return;
    const record = appendVersion({
      origin: COPY_ORIGINS.RESTORE_AS_NEW,
      state: 'COMPLETE',
      text: target.text,
      source: target.source,
      sourceHash: target.sourceHash,
      instruction: null,
      parentNumber: versions.find((version) => version.id === currentId)?.number || null,
      restoredFromNumber: target.number,
    });
    setCurrentId(record.id);
    onPackageApplied(record.text);
  }, [pending, versions, currentId, appendVersion, onPackageApplied]);

  return {
    copyState,
    versions,
    currentVersion,
    currentHash,
    pending,
    failure,
    changedFields,
    generate,
    regenerate,
    restore,
    retry,
    dismissFailure,
  };
};

export default useJobOfferCopy;
