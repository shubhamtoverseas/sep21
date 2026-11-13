import constData from "../../../../components/ReusableComponents/constants";
import translation from "../../../../utils/translation";
import {
    SETTINGS_STATUS,
    SETTINGS_STATUS_FILTER_ORDER,
    DEFAULT_SETTINGS_LIST_FILTERS,
    DEFAULT_PAGE_LIMIT,
    SORT_ORDER,
} from "./settingsNewUiConstants";

export const STATUS_FILTER_OPTIONS = () =>
    SETTINGS_STATUS_FILTER_ORDER
        .map((id) => constData.status.find((item) => item.id === id))
        .filter(Boolean)
        .map((item) => ({ value: item.id, label: translation(item.name) }));

/** Legacy settings list contract: search_text always sent, status null means "All". */
export const buildStatusListPayload = (filters) => {
    const payload = {
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || DEFAULT_PAGE_LIMIT,
        search_text: filters.search_text || "",
        status: Number(filters.status) !== SETTINGS_STATUS.ALL ? Number(filters.status) : null,
    };
    if (filters.sort_by) {
        payload.sort_by = filters.sort_by;
        payload.sort_order = filters.sort_order || SORT_ORDER.ASC;
    }
    return payload;
};

/** Sort + paging only (lists without search/status, e.g. leave policy master). */
export const buildSortedListPayload = (filters) => {
    const payload = {
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || DEFAULT_PAGE_LIMIT,
    };
    if (filters.sort_by) {
        payload.sort_by = filters.sort_by;
        payload.sort_order = filters.sort_order || SORT_ORDER.ASC;
    }
    return payload;
};

/** True when any filter differs from its default (array filters count when non-empty). */
export const hasActiveStatusListFilters = (filters, defaults = DEFAULT_SETTINGS_LIST_FILTERS) =>
    Object.keys(defaults).some((key) => {
        const value = filters[key];
        const base = defaults[key];
        if (Array.isArray(base)) return Array.isArray(value) && value.length > 0;
        if (key === "status") return Number(value) !== Number(base);
        return value !== base;
    });

/** DataTable pageInfo from legacy slice pagination fields (currentPage, totalPages, total, limit). */
export const buildSlicePageInfo = ({ currentPage, totalPages, total, limit }) => {
    const page = parseInt(currentPage, 10) || 1;
    const perPage = Number(limit) || DEFAULT_PAGE_LIMIT;
    const count = Number(total) || 0;
    return {
        from: count ? (page - 1) * perPage + 1 : 0,
        to: Math.min(page * perPage, count),
        total: count,
        currentPage: page,
        lastPage: Number(totalPages) || 0,
        limit: perPage,
    };
};
