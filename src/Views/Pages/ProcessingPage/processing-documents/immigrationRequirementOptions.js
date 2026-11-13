import translation from "../../../../utils/translation";
import { isMark } from "../../../../services/commonService";
import { IMMIGRATION_APPLICABILITY, IMMIGRATION_GROUP, IMMIGRATION_GROUP_LABEL_KEYS, IMMIGRATION_ROW_REGISTRY, IMMIGRATION_SECTION_LABEL_KEYS, IMMIGRATION_TREATMENT } from "../processingConstants";

/*
 * The Immigration working checklist, read from `GET /get-processing-details/:id/immigration` → `immigration_checklist`
 * (backend contract 22 Oct 2026 — C15): `rows[]` in display order with { key, treatment, section, blocking, physical, upload },
 * `sections[]` = the conditional sections in force, `purpose` / `resolved`. The marks and the derived Uploaded flag sit on the
 * same response as `<key>_prepared` / `<key>_ready` / `<key>_uploaded`. The frontend adds the label, the Contracts / Employer /
 * Helper grouping and the system-form download key (IMMIGRATION_ROW_REGISTRY) — never a row the server did not list.
 */
const { CASE_ONLY, OPTIONAL } = IMMIGRATION_TREATMENT;

const labelOf = (key, entry) => (entry?.label ? entry.label : translation(entry?.labelKey || `key_${ key }`));
/* a key outside the registry: Employer by prefix, otherwise Helper (the server's row order is kept either way) */
const groupOf = (key, entry) => entry?.group || (key.startsWith("employer_") ? IMMIGRATION_GROUP.EMPLOYER : IMMIGRATION_GROUP.HELPER);

/** One checklist row for the stage tab and the Documents view. */
export const toImmigrationRow = (details, api) => {
    const key = api.key;
    const entry = IMMIGRATION_ROW_REGISTRY[key];
    const physical = Boolean(api.physical);
    const uploaded = physical ? null : isMark(details[`${ key }_uploaded`]);
    return {
        requirementKey: key,
        key: entry?.pdfKey || null,                       /* system-form download key (null = nothing to open) */
        label: labelOf(key, entry),
        sub: entry?.subKey ? translation(entry.subKey) : "",
        group: api.section ? null : (api.treatment === OPTIONAL ? IMMIGRATION_GROUP.OPTIONAL : groupOf(key, entry)),
        section: api.section || null,
        treatment: api.treatment,
        caseOnly: api.treatment === CASE_ONLY,
        optional: api.treatment === OPTIONAL,
        blocking: api.blocking !== false,
        physical,
        upload: api.upload !== false && !physical,
        prepared: isMark(details[`${ key }_prepared`]),
        ready: isMark(details[`${ key }_ready`]),
        isDoc: Boolean(uploaded),
        uploaded: physical ? null : (uploaded ? "Yes" : "No"),
        isPdfLoading: false,
    };
};

export const immigrationChecklistRows = (details) => {
    const rows = details?.immigration_checklist?.rows;
    return Array.isArray(rows) ? rows.filter((r) => r && typeof r.key === "string").map((r) => toImmigrationRow(details, r)) : [];
};

/** the section keys in force, in the server's order */
export const immigrationChecklistSections = (details) => {
    const sections = details?.immigration_checklist?.sections;
    return Array.isArray(sections) ? sections.filter((s) => typeof s === "string") : [];
};

export const immigrationSectionLabel = (sectionKey) => translation(IMMIGRATION_SECTION_LABEL_KEYS[sectionKey] || `key_${ sectionKey }`);

/* rows that count toward "n / m current requirements" (never case-only, optional, or the supporter rows marked non-blocking) */
export const countsTowardReady = (row) => Boolean(row?.blocking);
export const isImmigrationRowDone = (row) => Boolean(row?.prepared && row?.ready);

/**
 * The checklist grouped the way the Immigration stage and the Documents view show it: Contracts → Employer → Helper (rows
 * outside the sections), then each section in force with its applicability, then Optional. A section assessed
 * "does_not_apply" is left out when `hideNotApplicable` is set (Documents view); an unassessed section stays — it is never
 * treated as not applicable.
 */
export const buildImmigrationRequirementGroups = (details, { hideNotApplicable = false } = {}) => {
    if (!details) return [];
    const rows = immigrationChecklistRows(details);
    if (rows.length === 0) return [];
    const applicability = details.immigration_applicability || {};
    const base = [IMMIGRATION_GROUP.CONTRACT, IMMIGRATION_GROUP.EMPLOYER, IMMIGRATION_GROUP.HELPER].map((g) => ({
        key: g, label: translation(IMMIGRATION_GROUP_LABEL_KEYS[g]), rows: rows.filter((r) => r.group === g),
    }));
    const listed = immigrationChecklistSections(details);
    /* a row whose section the server did not list still renders, under its own section heading, after the listed ones */
    const extra = rows.map((r) => r.section).filter((s, i, a) => s && !listed.includes(s) && a.indexOf(s) === i);
    const sections = [...listed, ...extra].map((s) => ({
        key: s, label: immigrationSectionLabel(s), section: true, rows: rows.filter((r) => r.section === s), applicability: applicability[s]?.assessment,
    }));
    const optional = { key: IMMIGRATION_GROUP.OPTIONAL, label: translation(IMMIGRATION_GROUP_LABEL_KEYS[IMMIGRATION_GROUP.OPTIONAL]), optional: true, rows: rows.filter((r) => r.group === IMMIGRATION_GROUP.OPTIONAL) };
    return [...base, ...sections, optional].filter((g) => g.rows.length > 0 && !(hideNotApplicable && g.applicability === IMMIGRATION_APPLICABILITY.NOT_APPLIES));
};

/* The groups' rows flattened for a select: `optionLabel` = the label, suffixed with the section when the same label exists
   in more than one group (Financial Support vs If Company Support carry the same three names under distinct `_company`
   keys — backend note 22 Oct). Rows are matched on `requirementKey`, never on label. */
export const flattenImmigrationRequirementRows = (groups) => {
    const counts = {};
    groups.forEach((g) => g.rows.forEach((r) => { counts[r.label] = (counts[r.label] || 0) + 1; }));
    return groups.flatMap((g) => g.rows.map((r) => ({ ...r, optionLabel: counts[r.label] > 1 && g.label ? `${ r.label } — ${ g.label }` : r.label })));
};

/* Requirement options for linking an Immigration file (Excel Contract No. 11): the rows a file can be linked to
   (`upload: true` — physical originals have none), keyed by their stable requirement ID. */
export const buildImmigrationRequirementOptions = (details) => {
    const rows = flattenImmigrationRequirementRows(buildImmigrationRequirementGroups(details));
    const seen = new Set();
    return rows
        .filter((row) => row.requirementKey && row.upload)
        .filter((row) => (seen.has(row.requirementKey) ? false : seen.add(row.requirementKey)))
        .map((row) => ({ value: row.requirementKey, label: row.optionLabel }));
};

/** POST /update-processing-full-details body: every row's Prepared / Ready as 0 / 1 on its stable key (Uploaded is derived server-side). */
export const immigrationMarksPayload = (rows) => rows.reduce((payload, row) => {
    if (!row?.requirementKey) return payload;
    payload[`${ row.requirementKey }_prepared`] = row.prepared ? 1 : 0;
    payload[`${ row.requirementKey }_ready`] = row.ready ? 1 : 0;
    return payload;
}, {});
