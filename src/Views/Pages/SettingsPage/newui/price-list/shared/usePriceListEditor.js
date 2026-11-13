import { useCallback, useEffect, useMemo, useState } from "react";
import translation from "../../../../../../utils/translation";
import { interpolate } from "../../../../../../i18n/interpolate";
import { changedKeys, invalidKeys } from "./priceEntries";
import { useFrameReport } from "./priceListFrame";

/* NO_PERMISSION: the contract's checkPermission refuses with 401 "Access Denied" (a logged-out session is handled by the
   shared interceptor before this point, and an expired token is refreshed and retried once) */
const STATUS = Object.freeze({ NO_PERMISSION: 401, CONFLICT: 409 });

/* The server's answer to a refused request (rejectWithValue keeps the axios response under payload.data). */
const refusal = (res) => ({ status: res?.payload?.data?.status, message: res?.payload?.data?.data?.message });

/**
 * One Price List page (27 Oct package): its saved schedule, a draft over it, Review changes, Save changes.
 *   data       the page's saved schedule from the store (null until loaded)
 *   fetch()    loads it; save(body) saves it — both dispatch a thunk and are stable (useCallback)
 *   toSaved(data) -> { key: value }; toPayload(data, draft, saved, note) -> the save body
 *   changesOf / invalidOf (draft, saved) -> the changes and the entries to correct; by default the draft is price
 *   entries ({ key: what staff typed }). A page with a structured draft (Pricing countries) passes its own and edits
 *   the draft with updateDraft.
 * As on the package's reference page, staff who may edit the page always see its inputs (there is no Edit step); the
 * footer bar's Cancel discards the draft and Review changes opens the review. Saving is checked again on the server
 * (permission, values, version); a refused save keeps the draft. `note` carries what the draft came from (Copy pricing)
 * into the review and the save.
 */
const usePriceListEditor = ({ data, canEdit, fetch, save, toSaved, toPayload, changesOf = changedKeys, invalidOf = invalidKeys }) => {
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [draft, setDraft] = useState({});
    const [note, setNote] = useState(null);
    const [checked, setChecked] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [discardOpen, setDiscardOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [footErr, setFootErr] = useState("");
    const [footMsg, setFootMsg] = useState("");
    const [blocked, setBlocked] = useState("");
    /* staff who may edit the page always see its inputs */
    const isEditMode = Boolean(canEdit);

    const load = useCallback(() => {
        setLoading(true);
        setLoadError("");
        Promise.resolve(fetch())
            .then((res) => { if (res?.error) setLoadError(refusal(res).message || translation("key_pl_load_failed")); })
            .finally(() => setLoading(false));
    }, [fetch]);

    useEffect(() => { load(); }, [load]);

    const saved = useMemo(() => toSaved(data), [data, toSaved]);
    const changes = useMemo(() => changesOf(draft, saved), [changesOf, draft, saved]);
    const invalid = useMemo(() => invalidOf(draft, saved), [invalidOf, draft, saved]);
    /* the alert under the title, as on the reference page: saved prices not loaded, or saving blocked with unsaved changes */
    useFrameReport(changes.length, Boolean(canEdit), loadError || (blocked && changes.length ? blocked : ""));

    const setEntry = useCallback((key, raw) => {
        setDraft((prev) => ({ ...prev, [key]: raw }));
        setFootErr("");
        setFootMsg("");
    }, []);

    /* a structured draft: next = fn(current draft) */
    const updateDraft = useCallback((fn) => {
        setDraft((prev) => fn(prev));
        setFootErr("");
        setFootMsg("");
    }, []);

    /* several entries at once (Copy pricing): replaces those entries in the draft */
    const replaceEntries = useCallback((values, nextNote = null) => {
        setDraft((prev) => ({ ...prev, ...values }));
        setNote(nextNote);
        setFootErr("");
        setFootMsg("");
    }, []);

    const clearDraft = useCallback(() => {
        setDraft({});
        setNote(null);
        setChecked(false);
        setFootErr("");
    }, []);

    const discard = useCallback(() => {
        const wasBlocked = Boolean(blocked);
        setDiscardOpen(false);
        setBlocked("");
        clearDraft();
        if (wasBlocked) load();
    }, [blocked, clearDraft, load]);

    /* Cancel: unsaved changes are never discarded silently */
    const cancel = useCallback(() => {
        if (changes.length) setDiscardOpen(true);
    }, [changes.length]);

    const review = useCallback(() => {
        if (invalid.length) {
            setChecked(true);
            setFootErr(interpolate(translation(invalid.length === 1 ? "key_pl_correct_entry" : "key_pl_correct_entries"), invalid.length));
            return;
        }
        if (changes.length) setReviewOpen(true);
    }, [changes.length, invalid.length]);

    const submit = useCallback(() => {
        setIsSaving(true);
        Promise.resolve(save(toPayload(data, draft, saved, note)))
            .then((res) => {
                setReviewOpen(false);
                if (!res?.error) {
                    clearDraft();
                    setFootMsg(translation("key_pl_changes_saved"));
                    return;
                }
                const { status, message } = refusal(res);
                if (status === STATUS.CONFLICT) {
                    const text = message || translation("key_pl_changed_elsewhere");
                    setBlocked(text);
                    setFootErr(text);
                } else if (status === STATUS.NO_PERMISSION) {
                    // Edit removed while the page is open is refused here, at save, with the changes kept; no live check
                    // (OP-27-34, decided 28 Oct 2026; revisit if product asks)
                    setFootErr(translation("key_pl_not_saved_no_edit"));
                } else {
                    setFootErr(message || translation("key_pl_save_failed"));
                }
            })
            .finally(() => setIsSaving(false));
    }, [clearDraft, data, draft, note, save, saved, toPayload]);

    return {
        data, saved, draft, note, loading, loadError, load, canEdit, isEditMode, checked, changes, invalid,
        reviewOpen, discardOpen, isSaving, footErr, footMsg, blocked,
        setEntry, replaceEntries, updateDraft, cancel, discard, review, save: submit,
        closeReview: () => setReviewOpen(false),
        closeDiscard: () => setDiscardOpen(false),
    };
};

export default usePriceListEditor;
