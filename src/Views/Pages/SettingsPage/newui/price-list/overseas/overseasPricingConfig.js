import translation from "../../../../../../utils/translation";
import { interpolate } from "../../../../../../i18n/interpolate";
import { changedKeys, currentValue, toReviewGroups } from "../shared/priceEntries";

/*
 * Price List · Overseas (27 Oct package, PL-S3).
 * Overseas page: one base fee per nationality, shared by its partner agencies, and the one Overseas replacement %.
 * Agency schedule: the agency's No Overseas Experience amount, its six history rates per pricing group (PL-S4) and its
 * profile-linked skill supplements; the nationality base and the % are shown read-only from the Overseas page.
 * The entry rules shared by every Price List page are in ../shared/priceEntries.js.
 */

/* ---------------- Overseas page ---------------- */

export const OS_PERCENT_KEY = "os|repl";
export const baseKey = (nationalityId) => `os|base|${nationalityId}`;

/** Saved values by key, in screen order: the %, then each nationality's base. */
export const savedOverseas = (data) => {
    const values = { [OS_PERCENT_KEY]: data?.overseas_replacement_percent ?? null };
    (data?.nationalities || []).forEach((n) => { values[baseKey(n.id)] = n.fee ?? null; });
    return values;
};

/** The body of POST /price-list/overseas: the changed bases, and the % when it changed. */
export const buildOverseasPayload = (data, draft, saved) => {
    const changed = new Set(changedKeys(draft, saved));
    const body = { base_version: data?.version ?? null, base_fees: [] };
    if (changed.has(OS_PERCENT_KEY)) body.overseas_replacement_percent = currentValue(OS_PERCENT_KEY, draft, saved);
    (data?.nationalities || []).forEach((n) => {
        if (changed.has(baseKey(n.id))) body.base_fees.push({ nationality_id: n.id, fee: currentValue(baseKey(n.id), draft, saved) });
    });
    return body;
};

const nationalityOf = (data, key) => (data?.nationalities || []).find((n) => baseKey(n.id) === key);

/** "Filipino · Base fee" / "Overseas replacement discount" — the package's labels. */
export const overseasLabel = (data, key) => (key === OS_PERCENT_KEY
    ? translation("key_pl_overseas_replacement_discount")
    : interpolate(translation("key_pl_os_base_label"), nationalityOf(data, key)?.name || ""));

export const overseasReviewGroups = (data, draft, saved) => toReviewGroups([
    { title: translation("key_pl_replacement_discount"), keys: [OS_PERCENT_KEY] },
    { title: translation("key_pl_base_fees"), keys: (data?.nationalities || []).map((n) => baseKey(n.id)) },
], (key) => overseasLabel(data, key), draft, saved);

/** The search: a code or a full agency name (requirements section 15: full names are searchable, not shown). */
export const agencyMatches = (agency, query) => {
    const q = (query || "").trim().toLowerCase();
    return !q || `${agency.name} ${agency.code}`.toLowerCase().includes(q);
};

/** "BGS Manpower Services (BGS)" */
export const agencyText = (agency) => interpolate(translation("key_pl_agency_text"), agency.name, agency.code);

/* ---------------- Agency schedule ---------------- */

export const NOE_KEY = "agency|noexp";
export const skillKey = (skillId) => `agency|skill|${skillId}`;

/* A6 (PL-S4): six history rates per pricing group (requirements section 8). Finished up to 24 months and Terminated
   under 12 months never qualify, so they have no rate. Ids as the server sends them (domain/priceList/experience.ts). */
export const EXPERIENCE_POSITIONS = Object.freeze([
    { id: "we1", labelKey: "key_pl_we1", longKey: "key_pl_we1_long" },
    { id: "earlier", labelKey: "key_pl_earlier", longKey: "key_pl_earlier" },
]);
export const EXPERIENCE_COLUMNS = Object.freeze([
    { outcome: "finished", band: "over_24" },
    { outcome: "terminated", band: "12_to_24" },
    { outcome: "terminated", band: "over_24" },
]);
const OUTCOME_LABEL = Object.freeze({ finished: "key_pl_finished", terminated: "key_pl_terminated" });
const BAND_LABEL = Object.freeze({ over_24: "key_pl_band_over_24", "12_to_24": "key_pl_band_12_24" });
export const outcomeName = (outcome) => translation(OUTCOME_LABEL[outcome]);
export const bandName = (band) => translation(BAND_LABEL[band]);

const EXP_PREFIX = "agency|exp|";
export const expKey = (groupId, position, outcome, band) => `${EXP_PREFIX}${groupId}|${position}|${outcome}|${band}`;
const parseExpKey = (key) => {
    const [groupId, position, outcome, band] = key.slice(EXP_PREFIX.length).split("|");
    return { country_group_id: Number(groupId), position, outcome, band };
};

export const historyGroups = (data) => data?.history?.groups || [];
/** A pricing group's name; "Other countries" in the screen's language. */
export const groupName = (group) => (group?.is_other ? translation("key_pl_other_countries") : group?.name || "");
export const groupExpKeys = (group) => EXPERIENCE_POSITIONS.flatMap((p) => EXPERIENCE_COLUMNS.map((c) => expKey(group.id, p.id, c.outcome, c.band)));
export const expKeys = (data) => historyGroups(data).flatMap(groupExpKeys);

export const skillKeys = (data) => (data?.skills || []).map((s) => skillKey(s.id));
/** Every entry of the schedule (requirements section 15 completeness): No Overseas Experience, every history rate, every skill. */
export const scheduleKeys = (data) => [NOE_KEY, ...expKeys(data), ...skillKeys(data)];

export const savedAgency = (data) => {
    const values = { [NOE_KEY]: data?.no_overseas_experience_fee ?? null };
    (data?.history?.rates || []).forEach((r) => { values[expKey(r.country_group_id, r.position, r.outcome, r.band)] = r.rate ?? null; });
    (data?.skills || []).forEach((s) => { values[skillKey(s.id)] = s.fee ?? null; });
    return values;
};

/** The body of POST /price-list/agencies/:id: the changed amounts, and the agency the draft was copied from. */
export const buildAgencyPayload = (data, draft, saved, note) => {
    const changed = new Set(changedKeys(draft, saved));
    const body = { base_version: data?.version ?? null, rates: [], skill_fees: [] };
    if (changed.has(NOE_KEY)) body.no_overseas_experience_fee = currentValue(NOE_KEY, draft, saved);
    expKeys(data).forEach((key) => {
        if (changed.has(key)) body.rates.push({ ...parseExpKey(key), rate: currentValue(key, draft, saved) });
    });
    (data?.skills || []).forEach((s) => {
        if (changed.has(skillKey(s.id))) body.skill_fees.push({ skill_id: s.id, fee: currentValue(skillKey(s.id), draft, saved) });
    });
    if (note?.copiedFrom) body.copied_from = note.copiedFrom.id;
    return body;
};

/** "No Overseas Experience", "Hong Kong and Macau · WE1 · Finished · More than 24 months", a skill's name. */
export const agencyLabel = (data, key) => {
    if (key === NOE_KEY) return translation("key_pl_no_overseas_experience");
    if (key.startsWith(EXP_PREFIX)) {
        const cell = parseExpKey(key);
        const group = historyGroups(data).find((g) => g.id === cell.country_group_id);
        const position = EXPERIENCE_POSITIONS.find((p) => p.id === cell.position);
        return [groupName(group), position ? translation(position.labelKey) : cell.position, outcomeName(cell.outcome), bandName(cell.band)].join(" · ");
    }
    return (data?.skills || []).find((s) => skillKey(s.id) === key)?.name || "";
};

export const agencyReviewGroups = (data, draft, saved) => toReviewGroups([
    { title: translation("key_pl_experience_supplement"), keys: [NOE_KEY, ...expKeys(data)] },
    { title: translation("key_pl_skill_supplements"), keys: skillKeys(data) },
], (key) => agencyLabel(data, key), draft, saved);

/**
 * Copy pricing (requirements section 23): the source's saved schedule as draft entries for the destination — No Overseas
 * Experience, every history rate and both skill amounts; zeros as zero, missing as missing (blank). Base fees and the
 * shared % are not part of a schedule and are never copied.
 */
export const copiedEntries = (destination, source) => {
    const sourceValues = savedAgency(source);
    const text = (value) => (value == null ? "" : String(value));
    const entries = {};
    scheduleKeys(destination).forEach((key) => { entries[key] = text(sourceValues[key]); });
    return entries;
};

/** "Hong Kong, Macau" / "Saudi Arabia, United Arab Emirates and 6 more" / "All other countries". */
export const groupCountriesText = (group) => {
    if (group?.is_other) return translation("key_pl_all_other_countries");
    const list = group?.countries || [];
    return list.length > 3
        ? interpolate(translation("key_pl_countries_more"), list.slice(0, 2).join(", "), list.length - 2)
        : list.join(", ");
};

/** "Filipino · BGS" — the scope of an agency schedule. */
export const agencyScope = (agency) => `${agency?.nationality_name || ""} · ${agency?.code || ""}`;
