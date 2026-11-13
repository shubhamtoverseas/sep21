import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { clearViewState, loadViewState, saveViewState } from "../../../../services/commonService";
import { SEARCH_DEBOUNCE_MS } from "../../../../components/ReusableComponents/constants";
import debounce from "../../../../utils/debounce";
import { DEFAULT_SETTINGS_LIST_FILTERS, SORT_ORDER } from "./settingsNewUiConstants";
import { buildStatusListPayload, hasActiveStatusListFilters } from "./settingsListConfig";


const useSettingsList = ({ viewStateKey, fetchAction, selectList, defaultFilters = DEFAULT_SETTINGS_LIST_FILTERS, buildPayload = buildStatusListPayload }) => {
    const dispatch = useDispatch();
    const { byId, order, rows: sliceRows, totalPages, total, lastUpdated } = useSelector(selectList, shallowEqual);

    const saved = useMemo(() => loadViewState(viewStateKey), [viewStateKey]);
    const [filters, setLocalFilters] = useState(saved?.filters ? { ...defaultFilters, ...saved.filters } : defaultFilters);
    const [searchInput, setSearchInput] = useState(saved?.searchInput || "");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadNonce, setReloadNonce] = useState(0);
    const requestSeq = useRef(0);

    const patchFilters = useCallback((patch) => {
        setLocalFilters((prev) => ({ ...prev, ...patch }));
    }, []);

    const debouncedSearch = useMemo(
        () => debounce((value) => patchFilters({ search_text: value.trim(), page: 1 }), SEARCH_DEBOUNCE_MS),
        [patchFilters]
    );
    useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

    const onSearchChange = useCallback((value) => {
        setSearchInput(value);
        debouncedSearch(value);
    }, [debouncedSearch]);

    const setFilter = useCallback((key, value) => patchFilters({ [key]: value, page: 1 }), [patchFilters]);

    const setSort = useCallback((sortKey) => {
        setLocalFilters((prev) => ({
            ...prev,
            sort_by: sortKey,
            sort_order: prev.sort_by === sortKey && prev.sort_order === SORT_ORDER.ASC ? SORT_ORDER.DESC : SORT_ORDER.ASC,
            page: 1,
        }));
    }, []);

    const setPage = useCallback((page) => {
        if (page < 1 || page > Math.max(Number(totalPages) || 1, 1)) return;
        patchFilters({ page });
    }, [patchFilters, totalPages]);

    const setLimit = useCallback((limit) => patchFilters({ limit, page: 1 }), [patchFilters]);

    const clearFilters = useCallback(() => {
        debouncedSearch.cancel();
        setSearchInput("");
        setLocalFilters(defaultFilters);
        clearViewState(viewStateKey);
    }, [debouncedSearch, defaultFilters, viewStateKey]);

    useEffect(() => {
        saveViewState(viewStateKey, { filters, searchInput });
    }, [viewStateKey, filters, searchInput]);

    const refresh = useCallback(() => setReloadNonce((n) => n + 1), []);

    useEffect(() => {
        const seq = ++requestSeq.current;
        setIsLoading(true);
        setError(null);
        dispatch(fetchAction(buildPayload(filters)))
            .unwrap()
            .catch((err) => {
                if (seq !== requestSeq.current) return;
                const message = err?.message || err?.data?.message;
                setError(message || true);
                if (message) ShowToast("error", message);
            })
            .finally(() => {
                if (seq === requestSeq.current) setIsLoading(false);
            });
    }, [dispatch, fetchAction, buildPayload, filters, reloadNonce]);

    /* Slices keep either an id-map + order (agencies…) or a plain array (holidays). */
    const rows = useMemo(() => {
        if (Array.isArray(sliceRows)) return sliceRows;
        return Array.isArray(order) ? order.map((id) => byId?.[id]).filter(Boolean) : [];
    }, [byId, order, sliceRows]);

    const pageInfo = useMemo(() => {
        const count = Number(total) || 0;
        const from = count ? (filters.page - 1) * filters.limit + 1 : 0;
        const to = count ? Math.min(filters.page * filters.limit, count) : 0;
        return { from, to, total: count, currentPage: filters.page, lastPage: Math.max(Number(totalPages) || 1, 1), limit: filters.limit };
    }, [filters.page, filters.limit, total, totalPages]);

    return {
        rows,
        filters,
        searchInput,
        isLoading,
        error,
        lastUpdated,
        pageInfo,
        isFiltered: hasActiveStatusListFilters(filters, defaultFilters),
        onSearchChange,
        setFilter,
        setSort,
        setPage,
        setLimit,
        clearFilters,
        refresh,
    };
};

export default useSettingsList;
