import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployers, setFilters } from "../../../../redux/Slices/employer/EmployerSlice";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { clearSessionViewState, clearViewState, loadSessionViewState, loadViewState, saveSessionViewState, saveViewState } from "../../../../services/commonService";
import { SEARCH_DEBOUNCE_MS } from "../../../../components/ReusableComponents/constants";
import debounce from "../../../../utils/debounce";
import {
    DEFAULT_EMPLOYER_FILTERS,
    buildEmployerListPayload,
    createdPresetToRange,
    hasActiveFilters,
    sanitizeSavedFilters,
    searchFormatError,
} from "./employerDashboardConfig";
import { EMPLOYER_VIEW_STATE_KEY, EMPLOYER_RESTRICTED_ROW_CAP, EMPLOYER_SEARCH_SESSION_KEY } from "./employerNewUiConstants";

const useEmployerDashboard = ({ searchEnabled = true, restricted = false } = {}) => {
    const dispatch = useDispatch();
    const { employers, totalPages, totalEmployers, totalAccessible, lastUpdated } = useSelector((state) => state.employer);

    const saved = useMemo(() => loadViewState(EMPLOYER_VIEW_STATE_KEY), []);
    /* the typed search survives a round trip to a record, never a new browser session (U-0026) */
    const savedSearch = useMemo(() => loadSessionViewState(EMPLOYER_SEARCH_SESSION_KEY), []);
    const [filters, setLocalFilters] = useState({
        ...(saved?.filters ? { ...DEFAULT_EMPLOYER_FILTERS, ...sanitizeSavedFilters(saved.filters) } : DEFAULT_EMPLOYER_FILTERS),
        search_text: savedSearch?.search_text || "",
    });
    const [searchInput, setSearchInput] = useState(savedSearch?.searchInput || "");
    const formatError = useMemo(() => searchFormatError(searchInput), [searchInput]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadNonce, setReloadNonce] = useState(0);
    const requestSeq = useRef(0);

    const patchFilters = useCallback((patch) => {
        setLocalFilters((prev) => ({ ...prev, ...patch }));
    }, []);

    /* audit L12: a malformed HKID / email shows the format message AND withdraws the applied search — stale rows never keep
       filtering under an error; an unchanged value is not re-applied */
    const applySearch = useCallback((value) => {
        const next = searchFormatError(value) ? "" : value.trim();
        setLocalFilters((prev) => (prev.search_text === next ? prev : { ...prev, search_text: next, page: 1 }));
    }, []);
    const debouncedSearch = useMemo(() => debounce(applySearch, SEARCH_DEBOUNCE_MS), [applySearch]);
    useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

    const onSearchChange = useCallback((value) => {
        setSearchInput(value);
        debouncedSearch(value);
    }, [debouncedSearch]);

    const setFilter = useCallback((key, value) => {
        if (key === "created") {
            patchFilters({ created: value, ...createdPresetToRange(value), page: 1 });
            return;
        }
        if (key === "location") {
            /* Branch AND District follow the Location (Priyanka 28 Oct: a Hong Kong district stayed applied — invisibly — after
               switching to Macau; the server applies exactly what is sent) */
            patchFilters({ location: value, branch_id: [], district: [], page: 1 });
            return;
        }
        if (key === "sort_by") {
            /* audit L10 / W29 (prototype listing.js setValue('sort')): a column picked from the menu starts ascending;
               Default clears both keys so nothing stale lingers and Clear filters goes away */
            patchFilters({ sort_by: value, sort_order: value ? "ASC" : DEFAULT_EMPLOYER_FILTERS.sort_order, page: 1 });
            return;
        }
        patchFilters({ [key]: value, page: 1 });
    }, [patchFilters]);

    const setCustomCreatedRange = useCallback((start, end) => {
        patchFilters({ created: "custom", start_date: start, end_date: end, page: 1 });
    }, [patchFilters]);

    /* header click: asc → desc → default (listing.js D-SORT-01); the Sort By menu sets a key directly */
    const setSort = useCallback((sortKey) => {
        setLocalFilters((prev) => {
            if (prev.sort_by === sortKey && prev.sort_order === "DESC") {
                return { ...prev, sort_by: DEFAULT_EMPLOYER_FILTERS.sort_by, sort_order: DEFAULT_EMPLOYER_FILTERS.sort_order, page: 1 };
            }
            return { ...prev, sort_by: sortKey, sort_order: prev.sort_by === sortKey && prev.sort_order === "ASC" ? "DESC" : "ASC", page: 1 };
        });
    }, []);

    const setPage = useCallback((page) => {
        if (page < 1 || page > Math.max(totalPages, 1)) return;
        patchFilters({ page });
    }, [patchFilters, totalPages]);

    const setLimit = useCallback((limit) => patchFilters({ limit, page: 1 }), [patchFilters]);

    const clearFilters = useCallback(() => {
        debouncedSearch.cancel();
        setSearchInput("");
        setLocalFilters(DEFAULT_EMPLOYER_FILTERS);
        clearViewState(EMPLOYER_VIEW_STATE_KEY);
        clearSessionViewState(EMPLOYER_SEARCH_SESSION_KEY);
    }, [debouncedSearch]);

    useEffect(() => {
        saveViewState(EMPLOYER_VIEW_STATE_KEY, { filters: { ...filters, search_text: "" } });
        saveSessionViewState(EMPLOYER_SEARCH_SESSION_KEY, { searchInput, search_text: filters.search_text });
    }, [filters, searchInput]);

    const refresh = useCallback(() => setReloadNonce((n) => n + 1), []);

    useEffect(() => {
        const seq = ++requestSeq.current;
        setIsLoading(true);
        setError(null);
        dispatch(setFilters({ limit: filters.limit, page: filters.page }));
        /* the request follows the grant, not only the control: no search text without Search Access; a Restricted
           actor asks for one page of 10 (the server enforces the same cap) */
        const effective = {
            ...filters,
            ...(searchEnabled ? {} : { search_text: "" }),
            ...(restricted ? { limit: EMPLOYER_RESTRICTED_ROW_CAP, page: 1 } : {}),
        };
        dispatch(fetchEmployers(buildEmployerListPayload(effective)))
            .unwrap()
            .catch((err) => {
                if (seq !== requestSeq.current) return;
                const message = err?.data?.data?.message;
                setError(message || true);
                if (message) ShowToast("error", message);
            })
            .finally(() => {
                if (seq === requestSeq.current) setIsLoading(false);
            });
    }, [dispatch, filters, reloadNonce, searchEnabled, restricted]);

    /* audit W35: a remembered page past the last page (rows removed, filters narrowed) falls back to the last page instead
       of showing an empty list */
    useEffect(() => {
        const last = Number(totalPages) || 0;
        if (!isLoading && !error && last >= 1 && filters.page > last) patchFilters({ page: last });
    }, [isLoading, error, totalPages, filters.page, patchFilters]);

    const pageInfo = useMemo(() => {
        const rawTotal = Number(totalEmployers) || 0;
        /* L-47 footer variants: "X of TOTAL employers match(es) your search / these filters" — TOTAL = the accessible population
           (backend 375 `total_accessible`); searching wins over filtering when both apply */
        const scope = { accessible: Number(totalAccessible) || 0, searching: Boolean(filters.search_text), filtered: hasActiveFilters(filters) };
        if (restricted) {
            const total = Math.min(rawTotal, EMPLOYER_RESTRICTED_ROW_CAP);
            return { from: total ? 1 : 0, to: total, total, currentPage: 1, lastPage: 1, limit: EMPLOYER_RESTRICTED_ROW_CAP, tooMany: rawTotal > EMPLOYER_RESTRICTED_ROW_CAP, ...scope };
        }
        const total = rawTotal;
        const from = total ? (filters.page - 1) * filters.limit + 1 : 0;
        const to = total ? Math.min(filters.page * filters.limit, total) : 0;
        return { from, to, total, currentPage: filters.page, lastPage: Math.max(Number(totalPages) || 1, 1), limit: filters.limit, tooMany: false, ...scope };
    }, [filters, totalEmployers, totalPages, restricted, totalAccessible]);

    return {
        rows: Array.isArray(employers) ? employers : [],
        filters,
        searchInput,
        formatError,
        isLoading,
        error,
        lastUpdated,
        pageInfo,
        isFiltered: hasActiveFilters(filters),
        onSearchChange,
        setFilter,
        setCustomCreatedRange,
        setSort,
        setPage,
        setLimit,
        clearFilters,
        refresh,
    };
};

export default useEmployerDashboard;
