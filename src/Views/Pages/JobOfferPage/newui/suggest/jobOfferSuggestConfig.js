import dayjs from "dayjs";
import { loadViewState, saveViewState } from "../../../../../services/commonService";
import translation from "../../../../../utils/translation";
import {
    JO_STAGE_ID, JO_SUGGEST_AGE, JO_SUGGEST_COPY, JO_SUGGEST_FIELD_KIND, JO_SUGGEST_FIELDS, JO_SUGGEST_JO_DEFAULTS, JO_SUGGEST_MODE,
    JO_SUGGEST_MODE_TYPE, JO_SUGGEST_OUTCOME_TONE, JO_SUGGEST_PAGE_LIMIT, JO_SUGGEST_SHARE_ROOM_RULES, jobOfferDayOffRows, JO_SUGGESTED_STATUS,
} from "../../jobOfferConstants";

const API_DATE = 'YYYY-MM-DD';
const { MULTI, RANGE, NUMBER } = JO_SUGGEST_FIELD_KIND;

export const fieldLabel = (field) => (field.labelKey ? translation(field.labelKey) : field.label || '');
export const fieldHint = (field) => (field.hint ? translation(field.hint) : undefined);

export const emptyFilters = () => {
    const out = { start_date: '' };
    JO_SUGGEST_FIELDS.forEach((f) => {
        if (f.kind === MULTI) out[f.k] = [];
        else if (f.kind === RANGE) out[f.k] = { min: '', max: '' };
        else out[f.k] = '';
    });
    return out;
};

const parseIdList = (value) => {
    if (Array.isArray(value)) return value.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    return String(value ?? '').split(',').map((part) => Number(part.trim())).filter((n) => Number.isFinite(n) && n > 0);
};

export const defaultsFromJob = (job) => {
    const out = emptyFilters();
    if (!job) return out;
    const nationality = parseIdList(job[JO_SUGGEST_JO_DEFAULTS.nationality]);
    if (nationality.length) out.nationality = nationality;
    const language = parseIdList(job[JO_SUGGEST_JO_DEFAULTS.language]);
    if (language.length) out.language = language;
    const start = job[JO_SUGGEST_JO_DEFAULTS.start_date];
    if (start && dayjs(start).isValid()) out.start_date = dayjs(start).format(API_DATE);
    /* Day Off is multi on the Job Offer (backend 12 Oct ask 12): every chosen day pre-fills */
    const dayOff = jobOfferDayOffRows(job).map((row) => Number(row?.id ?? row)).filter((n) => Number.isFinite(n) && n > 0);
    if (dayOff.length) out.day_off = dayOff;
    /* Share a room from the accommodation master's `share_room_equivalent` (1 / 0 / null — backend 12 Oct ask 13); the
       name prefixes are the fallback for a master without it */
    const accommodationRow = job[JO_SUGGEST_JO_DEFAULTS.accommodation];
    const equivalent = accommodationRow?.share_room_equivalent;
    if (equivalent === 1 || equivalent === 0 || equivalent === '1' || equivalent === '0') out.share_room = String(equivalent);
    else {
        const accommodation = String(accommodationRow?.name || '').trim().toLowerCase();
        const shareRoom = JO_SUGGEST_SHARE_ROOM_RULES.find((rule) => accommodation.startsWith(rule.prefix));
        if (shareRoom) out.share_room = shareRoom.value;
    }
    return out;
};

export const fieldVisible = (field, mode) => !field.scope || field.scope === mode;
/* a dependent field is open only while its gate holds (prototype `dep`); closed → disabled and cleared */
export const depOpen = (field, filters) => {
    if (!field.dep) return true;
    const v = String(filters?.[field.dep.k] ?? '');
    if (field.dep.eq !== undefined) return v === field.dep.eq;
    if (field.dep.ne !== undefined) return v !== field.dep.ne;
    return true;
};
export const fieldActive = (field, mode, filters) => fieldVisible(field, mode) && depOpen(field, filters);
export const clearClosedDeps = (filters) => {
    const next = { ...filters };
    JO_SUGGEST_FIELDS.forEach((f) => {
        if (!f.dep || depOpen(f, next)) return;
        next[f.k] = f.kind === MULTI ? [] : (f.kind === RANGE ? { min: '', max: '' } : '');
    });
    return next;
};

export const isUnset = (field, value) => {
    if (field.kind === MULTI) return !Array.isArray(value) || value.length === 0;
    if (field.kind === RANGE) return !value?.min && !value?.max;
    return value === '' || value === null || value === undefined;
};

export const activeCount = (filters, mode) => JO_SUGGEST_FIELDS.filter((f) => fieldActive(f, mode, filters) && !isUnset(f, filters[f.k])).length;
export const isCleared = (filters, mode) => activeCount(filters, mode) === 0 && !filters.start_date;

/* only the fields the current mode shows take part in the "same as the Job Offer defaults" comparison */
const norm = (filters, mode) => {
    const out = { start_date: filters.start_date || '' };
    JO_SUGGEST_FIELDS.forEach((f) => {
        if (!fieldActive(f, mode, filters)) return;
        const v = filters[f.k];
        if (f.kind === MULTI) out[f.k] = [...(Array.isArray(v) ? v : [])].map(String).sort();
        else if (f.kind === RANGE) out[f.k] = [String(v?.min ?? ''), String(v?.max ?? '')];
        else out[f.k] = String(v ?? '');
    });
    return JSON.stringify(out);
};
export const sameFilters = (a, b, mode) => norm(a, mode) === norm(b, mode);

export const toggleMulti = (current, value) => {
    const list = Array.isArray(current) ? current.map(Number) : [];
    const v = Number(value);
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
};

const YES = { value: '1', label: () => translation('key_yes') };
const NO = { value: '0', label: () => translation('key_no') };
export const yesNoOptions = (noFirst) => [
    { value: '', label: JO_SUGGEST_COPY.noPreference },
    ...(noFirst ? [NO, YES] : [YES, NO]).map((o) => ({ value: o.value, label: o.label() })),
];
/* a multi list has no "No preference" row — unset means All */
export const fieldOptions = (field, lists) => {
    if (field.yesNo) return yesNoOptions(field.noFirst);
    const list = Array.isArray(lists?.[field.list]) ? lists[field.list] : [];
    const labelOf = (item) => item?.[field.labelField || 'name'] ?? item?.name ?? '';
    const options = list.map((item) => ({ value: item.id, label: labelOf(item) }));
    if (field.kind !== MULTI) options.unshift({ value: '', label: JO_SUGGEST_COPY.noPreference });
    return options;
};
export const multiSummary = (field, value, lists) => {
    if (isUnset(field, value)) return JO_SUGGEST_COPY.all;
    const options = fieldOptions(field, lists);
    return value.map((v) => options.find((o) => String(o.value) === String(v))?.label).filter(Boolean).join(', ') || JO_SUGGEST_COPY.all;
};

/* `search_text` (D-14) is never persisted; a range with `params` sends its two ends as integers (D-13) */
export const buildFindWorkerPayload = ({ filters, mode, jobId, page, search }) => {
    const payload = { job_id: jobId, limit: JO_SUGGEST_PAGE_LIMIT, page, type: JO_SUGGEST_MODE_TYPE[mode] ?? JO_SUGGEST_MODE_TYPE[JO_SUGGEST_MODE.LOCAL] };
    if (search) payload.search_text = search;
    if (filters.start_date) payload.start_date = dayjs(filters.start_date).format(API_DATE);
    JO_SUGGEST_FIELDS.forEach((f) => {
        if (!fieldActive(f, mode, filters) || isUnset(f, filters[f.k])) return;
        const v = filters[f.k];
        if (f.kind === RANGE && f.params) {
            if (v.min) payload[f.params[0]] = Number(v.min);
            if (v.max) payload[f.params[1]] = Number(v.max);
        } else if (f.kind === RANGE) payload[f.k] = `${ v.min || JO_SUGGEST_AGE.MIN }-${ v.max || JO_SUGGEST_AGE.MAX }`;
        else if (f.kind === NUMBER) payload[f.k] = Number(v);
        else payload[f.k] = v;
    });
    return payload;
};

export const loadSuggestState = (key) => {
    const saved = loadViewState(key);
    return saved && saved.v === 1 ? saved : null;
};
export const saveSuggestState = (key, { mode, filters }) => saveViewState(key, { v: 1, mode, filters });

/* an already-ended contract has no days remaining → em dash */
export const daysRemaining = (contractEnd) => {
    if (!contractEnd || contractEnd === '-') return null;
    const end = dayjs(contractEnd);
    if (!end.isValid()) return null;
    const days = end.startOf('day').diff(dayjs().startOf('day'), 'day');
    return days < 0 ? null : days;
};
export const earliestStartOf = (row) => row?.earliest_can_start_date || row?.earliest_start_date || row?.start_date || null;
export const formatDate = (value) => (value && dayjs(value).isValid() ? dayjs(value).format('DD/MM/YYYY') : null);

/* Suggested list outcome (D-16): `suggestion_outcome` first, the stage as the fallback */
export const suggestedStatusOf = (row) => {
    const outcome = row?.suggestion_outcome;
    if (outcome && JO_SUGGESTED_STATUS[outcome]) return JO_SUGGESTED_STATUS[outcome];
    return Number(row?.job_stage_status_id) === JO_STAGE_ID.SUGGESTED ? JO_SUGGESTED_STATUS.awaiting : row?.job_stage_status_name || null;
};
export const suggestedToneOf = (row) => {
    const outcome = row?.suggestion_outcome;
    if (outcome && JO_SUGGEST_OUTCOME_TONE[outcome]) return JO_SUGGEST_OUTCOME_TONE[outcome];
    const stage = Number(row?.job_stage_status_id);
    if (stage === JO_STAGE_ID.APPLIED) return JO_SUGGEST_OUTCOME_TONE.applied;
    if (stage === JO_STAGE_ID.MATCHED) return JO_SUGGEST_OUTCOME_TONE.matched;
    return stage === JO_STAGE_ID.SUGGESTED ? JO_SUGGEST_OUTCOME_TONE.awaiting : JO_SUGGEST_OUTCOME_TONE.worker_declined;
};

export const pageOf = (block) => ({
    rows: Array.isArray(block?.data) ? block.data : [],
    currentPage: Number(block?.current_page) || 1,
    totalPages: Number(block?.last_page) || 1,
    total: Number(block?.total) || (Array.isArray(block?.data) ? block.data.length : 0),
});
