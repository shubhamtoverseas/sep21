import dayjs from "dayjs";
import constData from "../../../../components/ReusableComponents/constants";
import translation from "../../../../utils/translation";
import { validateHKIDStripped } from "../../../../utils/utils";
import {
    DEFAULT_PAGE_LIMIT, DEFAULT_EMPLOYER_FILTERS, ALL_OPTION_VALUE, API_DATE_FORMAT, EMPLOYER_SORT_NEXT, EMPLOYER_SEARCH_FORMAT, EMPLOYER_SEARCH_FORMAT_ERROR } from "./employerNewUiConstants";
import { MACAU_LOCATION_ID } from "../../../../components/ReusableComponents/constants";

export { DEFAULT_PAGE_LIMIT, DEFAULT_EMPLOYER_FILTERS, ALL_OPTION_VALUE } from "./employerNewUiConstants";

export const SORT_OPTIONS = () => [
    { value: ALL_OPTION_VALUE, label: translation("key_default") },
    { value: constData.EMPLOYER_SORT_KEYS.NAME, label: translation("key_employer") },
    { value: constData.EMPLOYER_SORT_KEYS.CODE, label: translation("key_employer_code") },
];

/* accessible name of a header sort button = the action its next click performs */
export const sortNextActionLabel = (label, active, order) => {
    if (!active) return `${ translation("key_sort_by") } ${ label }, ${ translation(EMPLOYER_SORT_NEXT.asc) }`;
    if (order === "ASC") return `${ translation("key_sort_by") } ${ label }, ${ translation(EMPLOYER_SORT_NEXT.desc) }`;
    return translation(EMPLOYER_SORT_NEXT.clear);
};

/* A remembered sort on a column that no longer exists (E-01: Activity) falls back to the default order */
export const sanitizeSavedFilters = (savedFilters) => {
    if (!savedFilters) return savedFilters;
    /* E-6 / U-0039: a remembered `spoken_language` selection (before 16 Oct) is discarded — the filter is `primary_language` now */
    const filters = { ...savedFilters };
    delete filters.spoken_language;
    const allowedSortKeys = new Set(SORT_OPTIONS().map((option) => option.value));
    if (allowedSortKeys.has(filters.sort_by ?? ALL_OPTION_VALUE)) return filters;
    return { ...filters, sort_by: DEFAULT_EMPLOYER_FILTERS.sort_by, sort_order: DEFAULT_EMPLOYER_FILTERS.sort_order };
};

export const CREATED_OPTIONS = () => [
    { value: ALL_OPTION_VALUE, label: translation("key_all") },
    ...constData.EMPLOYER_CREATED_PRESETS.map((preset) => ({ value: preset.value, label: translation(preset.translationKey) })),
];

export const createdPresetToRange = (preset) => {
    const match = constData.EMPLOYER_CREATED_PRESETS.find((item) => item.value === preset);
    if (!match || match.days === null) return { start_date: null, end_date: null };
    const today = dayjs().startOf("day");
    if (match.days === 1) {
        const yesterday = today.subtract(1, "day");
        return { start_date: yesterday.format(API_DATE_FORMAT), end_date: yesterday.format(API_DATE_FORMAT) };
    }
    return { start_date: today.subtract(match.days, "day").format(API_DATE_FORMAT), end_date: today.format(API_DATE_FORMAT) };
};

export const buildEmployerListPayload = (filters) => {
    const payload = {
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || DEFAULT_PAGE_LIMIT,
        context: "list",
    };
    if (filters.search_text) payload.search_text = filters.search_text;
    if (filters.sort_by) {
        payload.sort_by = filters.sort_by;
        payload.sort_order = filters.sort_order || "ASC";
    }
    if (filters.location?.length) payload.location = filters.location;
    if (filters.branch_id?.length) payload.branch_id = filters.branch_id;
    /* U-0039: All = omit; legacy script values match no filter value */
    if (filters.primary_language?.length) payload.primary_language = filters.primary_language;
    if (filters.district?.length) payload.district = filters.district;
    /* backend 321 (28 Oct): the list reads the Created range as search_start_date / search_end_date (the legacy contract the
       Job Offer / Worker lists use); start_date / end_date was never read, so every preset returned the full list */
    if (filters.start_date && filters.end_date) {
        payload.search_start_date = filters.start_date;
        payload.search_end_date = filters.end_date;
    }
    return payload;
};

/* DASH §7.3 + SEARCH.md: a malformed HKID or email gets a format message and is not sent; the message never echoes the
   text and never says whether anything matched */
export const searchFormatError = (text) => {
    const value = String(text || "").trim();
    if (!value) return "";
    if (EMPLOYER_SEARCH_FORMAT.emailAttempt.test(value)) return EMPLOYER_SEARCH_FORMAT.email.test(value) ? "" : EMPLOYER_SEARCH_FORMAT_ERROR.email;
    /* U-0399 (10 Nov package): one verified HKID validator everywhere — the local format regex is replaced */
    if (EMPLOYER_SEARCH_FORMAT.hkidAttempt.test(value)) return validateHKIDStripped(value).valid ? "" : EMPLOYER_SEARCH_FORMAT_ERROR.hkid;
    return "";
};

/* DASH §10: Clear filters appears when search, a filter or the sort leaves the default — paging and page size are not filters (audit L21) */
export const hasActiveFilters = (filters) =>
    Boolean(filters.search_text || filters.location?.length || filters.branch_id?.length || filters.primary_language?.length || filters.district?.length || filters.created)
    || filters.sort_by !== DEFAULT_EMPLOYER_FILTERS.sort_by
    || filters.sort_order !== DEFAULT_EMPLOYER_FILTERS.sort_order;



/* District as carried on a list row: `district_name` / `district_info{id,name}` / `district` as { id, name } or a bare id */
const districtObject = (row) => (row?.district && typeof row.district === "object" ? row.district : null);
export const districtName = (row) => row?.district_name || row?.district_info?.name || districtObject(row)?.name || "";
const districtId = (row) =>
    row?.district_id ?? row?.district_info?.id ?? districtObject(row)?.id ?? (typeof row?.district === "number" ? row.district : null) ?? districtName(row);

/* DASH §3: District options come from the accessible displayed rows, sorted, plus All; none → control not offered */
export const buildDistrictOptions = (rows, allOption) => {
    const seen = new Map();
    (rows || []).forEach((row) => {
        const label = districtName(row);
        if (label && !seen.has(String(districtId(row)))) seen.set(String(districtId(row)), { value: districtId(row), label });
    });
    const options = Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
    return options.length ? [allOption, ...options] : [];
};

/* DASH §3: Branch is withdrawn while the Location selection is Macau only — Macau is never a Branch */
export const isMacauOnlyLocation = (locationIds) =>
    Array.isArray(locationIds) && locationIds.length > 0 && locationIds.every((id) => Number(id) === MACAU_LOCATION_ID);

export const toOptionList = (rows, valueKey = "id", labelKey = "name") =>
    Array.isArray(rows) ? rows.map((row) => ({ value: row[valueKey], label: row[labelKey] })) : [];

export const indexById = (rows, key = "id") =>
    Array.isArray(rows) ? rows.reduce((acc, row) => { acc[row[key]] = row; return acc; }, {}) : {};
