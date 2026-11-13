import { useCallback, useEffect, useMemo, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import debounce from "../../../../../utils/debounce";
import { deletePromptManager, fetchPromptManagerList, togglePromptManager } from "../../../../../redux/Slices/settings/prompt-manager/PromptManagerSlice";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { asArray, buildPromptPageInfo } from "./promptManagerConfig";
import { DEFAULT_PROMPT_SORT, PRICE_LIST_LOADING_STATUS, PROMPT_LIST_DEBOUNCE_MS, PROMPT_SORT_ORDER } from "../settingsNewUiConstants";

const selectPromptManager = (state) => ({
    promptManagerList: state.promptManager.promptManagerList,
    currentPage: state.promptManager.currentPage,
    totalCount: state.promptManager.totalCount,
    lastUpdate: state.promptManager.lastUpdate,
    perPage: state.promptManager.perPage,
    totalPages: state.promptManager.totalPages,
    status: state.promptManager.status,
});

/** Ports PromptManager.js: debounced fetchData, sort toggle, paging, toggle + delete with refetch. */
const usePromptManagerList = () => {
    const dispatch = useDispatch();
    const slice = useSelector(selectPromptManager, shallowEqual);
    const [tableHeaderFilter, setTableHeaderFilter] = useState(DEFAULT_PROMPT_SORT);
    const [deletingId, setDeletingId] = useState(null);

    const currentPage = parseInt(slice.currentPage, 10);
    const rows = useMemo(() => asArray(slice.promptManagerList), [slice.promptManagerList]);

    const debouncedFetch = useMemo(
        () => debounce((params) => { dispatch(fetchPromptManagerList(params)); }, PROMPT_LIST_DEBOUNCE_MS),
        [dispatch]
    );

    useEffect(() => () => debouncedFetch.clear(), [debouncedFetch]);

    useEffect(() => {
        dispatch(fetchPromptManagerList());
    }, [dispatch]);

    const fetchData = useCallback((params = {}) => {
        debouncedFetch({ page: currentPage, ...tableHeaderFilter, ...params });
    }, [currentPage, tableHeaderFilter, debouncedFetch]);

    const sortTable = useCallback((sortKey) => {
        if (!sortKey) return;
        const newOrder = tableHeaderFilter.order === PROMPT_SORT_ORDER.ASC ? PROMPT_SORT_ORDER.DESC : PROMPT_SORT_ORDER.ASC;
        setTableHeaderFilter({ sort: sortKey, order: newOrder });
        fetchData({ sort_by: sortKey, sort_order: newOrder });
    }, [tableHeaderFilter, fetchData]);

    const handlePrevClick = useCallback(() => {
        if (currentPage > 1) fetchData({ page: currentPage - 1 });
    }, [currentPage, fetchData]);

    const handleNextClick = useCallback(() => {
        if (currentPage < slice.totalPages) fetchData({ page: currentPage + 1 });
    }, [currentPage, slice.totalPages, fetchData]);

    const handlePerPageChange = useCallback((newPerPage) => fetchData({ limit: newPerPage }), [fetchData]);

    const handleRefresh = useCallback(() => {
        dispatch(fetchPromptManagerList({ page: currentPage }));
    }, [dispatch, currentPage]);

    const handleToggleStatus = useCallback((id, isActive) => {
        dispatch(togglePromptManager({ id, is_active: isActive }));
        fetchData();
    }, [dispatch, fetchData]);

    const requestDelete = useCallback((id) => setDeletingId(id), []);
    const cancelDelete = useCallback(() => setDeletingId(null), []);
    const confirmDelete = useCallback(() => {
        dispatch(deletePromptManager(deletingId)).then((action) => {
            /* bug log #80 (fixed 2026-10-06): a rejected delete is an error, not a success */
            if (action?.error) ShowToast("error", action?.payload?.data?.data?.message || action?.payload?.data?.message || action?.error?.message);
            else ShowToast("success", action?.payload?.message);
            fetchData();
        });
        setDeletingId(null);
    }, [dispatch, deletingId, fetchData]);

    const pageInfo = useMemo(() => buildPromptPageInfo(slice, rows.length), [slice, rows.length]);

    return {
        rows,
        isLoading: slice.status === PRICE_LIST_LOADING_STATUS,
        pageInfo,
        lastUpdate: slice.lastUpdate,
        sort: tableHeaderFilter,
        deletingId,
        sortTable,
        handlePrevClick,
        handleNextClick,
        handlePerPageChange,
        handleRefresh,
        handleToggleStatus,
        requestDelete,
        cancelDelete,
        confirmDelete,
    };
};

export default usePromptManagerList;
