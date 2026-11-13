import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ensureInsuranceMeta, fetchInsuranceRecords } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import {
    clearSessionViewState, clearViewState, loadSessionViewState, loadViewState, saveSessionViewState, saveViewState,
} from "../../../../services/commonService";
import debounce from "../../../../utils/debounce";
import {
    DEFAULT_FILTERS, DEFAULT_SORT, INSURANCE_RETURN_STATE_KEY, INSURANCE_VIEW_STATE_KEY, SEARCH_DEBOUNCE_MS, buildSearchPayload,
    isFilterActive,
} from "./insuranceDashboardConfig";

/* A remembered filter the actor may no longer use is dropped (e.g. a CS Owner no longer offered, d:142) */
const sanitizeFilters = (saved, meta) => {
    const next = { ...DEFAULT_FILTERS, ...saved, page: 1 };
    if (!meta) return next;
    const branchIds = new Set((meta.branches || []).map((b) => String(b.id)));
    next.branch = (next.branch || []).filter((id) => branchIds.has(String(id)));
    const owners = meta.owners || {};
    const ownerOk = next.owner === "all"
        || (next.owner === "mine" && owners.mine)
        || (owners.staff || []).some((s) => String(s.id) === String(next.owner));
    if (!owners.offered || !ownerOk) next.owner = "all";
    if (next.activity?.preset && !(meta.datePresets || []).includes(next.activity.preset)) next.activity = null;
    if (next.activity?.duration && !(meta.customDurations || []).includes(next.activity.duration)) next.activity = null;
    if (!meta.search?.enabled) next.q = "";
    return next;
};

const useInsuranceDashboard = () => {
    const dispatch = useDispatch();
    const meta = useSelector((state) => state.insurance.meta);
    const metaStatus = useSelector((state) => state.insurance.metaStatus);
    const records = useSelector((state) => state.insurance.records);

    const saved = useMemo(() => loadViewState(INSURANCE_VIEW_STATE_KEY), []);
    /* back from a record (dashboard.js open → renderTable; register #86): the page it was opened from, and the row to refocus
       at the scroll it was opened at; read once, then cleared */
    const [returnTo, setReturnTo] = useState(() => {
        const ret = loadSessionViewState(INSURANCE_RETURN_STATE_KEY);
        return ret?.ref ? ret : null;
    });
    useEffect(() => { clearSessionViewState(INSURANCE_RETURN_STATE_KEY); }, []);
    const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS, ...(saved?.filters || {}), page: returnTo?.page || 1 }));
    const [searchInput, setSearchInput] = useState(saved?.filters?.q || "");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadNonce, setReloadNonce] = useState(0);
    const requestSeq = useRef(0);
    /* the remembered filters have been checked against the grants: the first search waits for it */
    const [ready, setReady] = useState(false);

    useEffect(() => { dispatch(ensureInsuranceMeta()); }, [dispatch]);

    /* once the grants are known, drop remembered values the actor may not use */
    useEffect(() => {
        if (!meta?.access || ready) return;
        setFilters((prev) => {
            const next = sanitizeFilters(prev, meta);
            /* the page returned to holds while no remembered filter had to be dropped */
            return JSON.stringify({ ...next, page: 0 }) === JSON.stringify({ ...prev, page: 0 }) ? { ...next, page: prev.page } : next;
        });
        if (!meta.search?.enabled) setSearchInput("");
        setReady(true);
    }, [meta, ready]);

    const patch = useCallback((p) => setFilters((prev) => ({ ...prev, ...p })), []);

    const debouncedSearch = useMemo(
        () => debounce((value) => patch({ q: value, page: 1 }), SEARCH_DEBOUNCE_MS),
        [patch]
    );
    useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

    const onSearchChange = useCallback((value) => {
        setSearchInput(value);
        debouncedSearch(value);
    }, [debouncedSearch]);

    const setFilter = useCallback((key, value) => patch({ [key]: value, page: 1 }), [patch]);

    /* first click ascending, except Activity (descending); a second click flips */
    const setSort = useCallback((key) => {
        setFilters((prev) => {
            const same = prev.sort?.key === key;
            const dir = same ? (prev.sort.dir === "asc" ? "desc" : "asc") : (key === "lastActivity" ? "desc" : "asc");
            return { ...prev, sort: { key, dir }, page: 1 };
        });
    }, []);

    const setPage = useCallback((page) => patch({ page }), [patch]);
    const setLimit = useCallback((limit) => patch({ limit, page: 1 }), [patch]);

    const clearFilters = useCallback(() => {
        debouncedSearch.cancel();
        setSearchInput("");
        setFilters((prev) => ({ ...DEFAULT_FILTERS, sort: prev.sort || DEFAULT_SORT, limit: prev.limit }));
    }, [debouncedSearch]);

    const resetView = useCallback(() => {
        clearViewState(INSURANCE_VIEW_STATE_KEY);
        clearFilters();
    }, [clearFilters]);

    useEffect(() => {
        const remembered = { ...filters };
        delete remembered.page;
        saveViewState(INSURANCE_VIEW_STATE_KEY, { ...(loadViewState(INSURANCE_VIEW_STATE_KEY) || {}), filters: remembered });
    }, [filters]);

    const refresh = useCallback(() => setReloadNonce((n) => n + 1), []);

    /* opening a record remembers where it was opened from (dashboard.js open: u.scrollY, u.focusRow) */
    const markReturn = useCallback((ref) => {
        saveSessionViewState(INSURANCE_RETURN_STATE_KEY, { ref, page: filters.page, scrollY: window.scrollY });
    }, [filters.page]);
    const returned = useCallback(() => setReturnTo(null), []);

    const hasAccess = Boolean(meta?.access);
    /* the request itself: a filter change that leaves it unchanged (1–2 characters typed on page 1, a trailing space)
       sends nothing; Refresh and Retry send it again */
    const searchKey = JSON.stringify(buildSearchPayload(filters));
    useEffect(() => {
        if (!hasAccess || !ready) return;
        const seq = ++requestSeq.current;
        setIsLoading(true);
        setError(null);
        dispatch(fetchInsuranceRecords(JSON.parse(searchKey)))
            .unwrap()
            .catch((err) => {
                if (seq !== requestSeq.current) return;
                const message = err?.data?.message;
                setError(message || true);
                if (message) ShowToast("error", message);
            })
            .finally(() => {
                if (seq === requestSeq.current) setIsLoading(false);
            });
    }, [dispatch, searchKey, reloadNonce, hasAccess, ready]);

    const pageInfo = useMemo(() => {
        const total = Number(records.total) || 0;
        const limit = records.limit || filters.limit;
        const lastPage = records.restricted ? 1 : Math.max(Math.ceil(total / limit), 1);
        return { total, currentPage: records.page || filters.page, lastPage, limit };
    }, [records, filters.page, filters.limit]);

    return {
        meta,
        metaStatus,
        records,
        filters,
        searchInput,
        isLoading,
        error,
        pageInfo,
        isFiltered: isFilterActive(filters),
        onSearchChange,
        setFilter,
        setSort,
        setPage,
        setLimit,
        clearFilters,
        resetView,
        refresh,
        returnTo,
        markReturn,
        returned,
    };
};

export default useInsuranceDashboard;
