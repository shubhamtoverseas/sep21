import dayjs from "dayjs";
import constData, { MACAU_LOCATION_ID } from "../../../../../components/ReusableComponents/constants";
import translation from "../../../../../utils/translation";
import {
    JO_DASH_API_DATE, JO_DASH_DEFAULT_FILTERS, JO_DASH_SORT_API, JO_DASH_SORT_OPTIONS, JO_DASH_STATUS_FILTER_IDS, JO_DASH_TYPE_OPTIONS,
    JO_SORT_COPY, JO_STATUS,
} from "../../jobOfferConstants";

const ALL = '';
/* card / JO Status option wording: `filterLabel` where it differs from the tag text */
export const joStatusFilterLabel = (meta) => meta.filterLabel || (meta.key ? translation(meta.key) : meta.label);

export const createdOptions = () => [
    { value: ALL, label: translation('key_all') },
    ...constData.EMPLOYER_CREATED_PRESETS.map((preset) => ({ value: preset.value, label: translation(preset.translationKey) })),
];
export const createdPresetToRange = (preset) => {
    const match = constData.EMPLOYER_CREATED_PRESETS.find((item) => item.value === preset);
    if (!match || match.days === null) return { from_date: '', to_date: '' };
    const today = dayjs().startOf('day');
    if (match.days === 1) {
        const yesterday = today.subtract(1, 'day');
        return { from_date: yesterday.format(JO_DASH_API_DATE), to_date: yesterday.format(JO_DASH_API_DATE) };
    }
    return { from_date: today.subtract(match.days, 'day').format(JO_DASH_API_DATE), to_date: today.format(JO_DASH_API_DATE) };
};

/* Global Filter (JO Status): a status the actor is not granted is absent from the filter, not disabled (PERM §4.7) */
export const statusOptions = (allowedIds, isAdmin) => [
    { value: ALL, label: translation('key_all') },
    ...JO_DASH_STATUS_FILTER_IDS
        .filter((id) => isAdmin || allowedIds.length === 0 || allowedIds.includes(id))
        .map((id) => ({ value: String(id), label: joStatusFilterLabel(JO_STATUS[id]) })),
];
export const typeOptions = () => [{ value: ALL, label: translation('key_all') }, ...JO_DASH_TYPE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))];
export const sortOptions = () => [{ value: ALL, label: translation('key_default') }, ...JO_DASH_SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))];

export const sortNextActionLabel = (label, active, order) => {
    if (!active) return `${ JO_SORT_COPY.by } ${ label }, ${ JO_SORT_COPY.asc }`;
    if (order === 'ASC') return `${ JO_SORT_COPY.by } ${ label }, ${ JO_SORT_COPY.desc }`;
    return JO_SORT_COPY.clear;
};

export const isMacauLocation = (locationId) => Number(locationId) === MACAU_LOCATION_ID;

export const buildJobListPayload = (filters) => {
    const payload = { page: Number(filters.page) || 1, limit: Number(filters.limit) || JO_DASH_DEFAULT_FILTERS.limit };
    if (filters.search_text) payload.search_text = filters.search_text;
    if (filters.sort_by) {
        payload.sort_by = JO_DASH_SORT_API[filters.sort_by] || filters.sort_by;
        payload.sort_order = filters.sort_order || 'ASC';
    }
    if (filters.location) payload.location = Number(filters.location);
    if (filters.branch_location?.length) payload.branch_location = filters.branch_location.map(Number);
    if (filters.status?.length) payload.status = filters.status.map(Number);
    if (filters.current_engagement) payload.current_engagement = filters.current_engagement;
    if (filters.cs_owner_id?.length) payload.cs_owner_id = filters.cs_owner_id.map(Number);
    if (filters.from_date && filters.to_date) { payload.from_date = filters.from_date; payload.to_date = filters.to_date; }
    return payload;
};

/* prototype: Location is a view, not a filter — changing it alone never shows "Clear filters" */
export const hasActiveFilters = (filters) =>
    Boolean(filters.search_text || filters.status?.length || filters.current_engagement || filters.branch_location?.length || filters.cs_owner_id?.length || filters.created || filters.sort_by);

export const sanitizeSavedFilters = (saved) => {
    if (!saved) return saved;
    const allowed = new Set(JO_DASH_SORT_OPTIONS.map((o) => o.key));
    const engagements = new Set(JO_DASH_TYPE_OPTIONS.map((o) => o.value));
    /* a saved view from before the Type filter became `current_engagement` carried device ids */
    const rest = Object.fromEntries(Object.entries(saved).filter(([key]) => key !== 'device_type'));
    const next = engagements.has(rest.current_engagement) ? rest : { ...rest, current_engagement: '' };
    return allowed.has(next.sort_by) || !next.sort_by ? next : { ...next, sort_by: '', sort_order: '' };
};

export const relativeActivity = (iso) => {
    if (!iso) return '';
    const then = dayjs(iso);
    if (!then.isValid()) return '';
    const minutes = Math.max(0, dayjs().diff(then, 'minute'));
    if (minutes < 60) return `${ minutes }m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${ hours }h ago`;
    return `${ Math.floor(hours / 24) }d ago`;
};

export const abbrevOwner = (full) => {
    const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return parts[0] || '';
    const initial = parts[parts.length - 1][0];
    /* a non-Latin surname never abbreviates to an initial — the whole name stays (prototype reconcile.js) */
    if (!/[A-Za-z]/.test(initial)) return parts.join(' ');
    return `${ parts[0] } ${ initial }.`;
};

export const toOptionList = (rows, valueKey = 'id', labelKey = 'name') =>
    (Array.isArray(rows) ? rows.map((row) => ({ value: String(row[valueKey]), label: row[labelKey] })) : []);
