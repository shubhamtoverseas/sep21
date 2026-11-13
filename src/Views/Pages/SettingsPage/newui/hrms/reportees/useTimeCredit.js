import { useCallback, useEffect, useMemo, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import {
    clearMessage,
    deleteManagerApprovedTimeRequest,
    fetchManagerApprovedTimeRequest,
} from "../../../../../../redux/Slices/settings/time-request/TimeRequestSlice";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { dispatchWithHandling } from "../../../../../../utils/dispatchHandler";
import translation from "../../../../../../utils/translation";
import { buildSlicePageInfo } from "../../settingsListConfig";
import { asArray } from "../hrmsConfig";
import { DEFAULT_HRMS_SORT, HRMS_DEFAULT_PAGE_QUERY, HRMS_FAILED_STATUS, HRMS_LOADING_STATUS, HRMS_SORT_ORDER } from "../../settingsNewUiConstants";

const selectTimeCredit = (state) => ({
    rows: state.timeRequests.managerApprovedTimeRequest,
    status: state.timeRequests.managerApprovedTimeRequestStatus,
    message: state.timeRequests.managerApprovedTimeRequestMessage,
    error: state.timeRequests.managerApprovedTimeRequestError,
    currentPage: state.timeRequests.managerApprovedTimeRequestCurrentPage,
    totalPages: state.timeRequests.managerApprovedTimeRequestTotalPage,
    perPage: state.timeRequests.managerApprovedTimeRequestPerPage,
    total: state.timeRequests.managerApprovedTimeRequestTotal,
    lastUpdated: state.timeRequests.managerApprovedTimeRequestLastUpdated,
});

/** Ports ManageApproveTimeEntry.js: list, sort/paging, view + delete confirm, add sub-view toggle. */
const useTimeCredit = () => {
    const dispatch = useDispatch();
    const slice = useSelector(selectTimeCredit, shallowEqual);
    const [tableHeaderFilter, setTableHeaderFilter] = useState(DEFAULT_HRMS_SORT);
    const [deleteId, setDeleteId] = useState(null);
    const [viewEntry, setViewEntry] = useState(null);
    const [isAddOpen, setIsAddOpen] = useState(false);

    const rows = useMemo(() => asArray(slice.rows), [slice.rows]);
    const currentPage = parseInt(slice.currentPage, 10);

    useEffect(() => {
        dispatch(fetchManagerApprovedTimeRequest(HRMS_DEFAULT_PAGE_QUERY));
    }, [dispatch]);

    useEffect(() => {
        if (slice.message) {
            ShowToast("success", slice.message);
            dispatch(clearMessage());
        }
    }, [slice.message, dispatch]);

    useEffect(() => {
        if (slice.status === HRMS_FAILED_STATUS && slice.error) {
            ShowToast("error", slice.error);
            dispatch(clearMessage());
        }
    }, [slice.status, slice.error, dispatch]);

    const handleRefresh = useCallback(() => {
        dispatchWithHandling(dispatch, fetchManagerApprovedTimeRequest({ page: currentPage }));
    }, [dispatch, currentPage]);

    const sortTable = useCallback((sortKey) => {
        if (!sortKey) return;
        const newOrder = tableHeaderFilter.order === HRMS_SORT_ORDER.ASC ? HRMS_SORT_ORDER.DESC : HRMS_SORT_ORDER.ASC;
        setTableHeaderFilter({ sort: sortKey, order: newOrder });
        dispatchWithHandling(dispatch, fetchManagerApprovedTimeRequest({ page: slice.currentPage, limit: HRMS_DEFAULT_PAGE_QUERY.limit, sort_by: sortKey, sort_order: newOrder }));
    }, [dispatch, slice.currentPage, tableHeaderFilter.order]);

    const handlePrevClick = useCallback(() => {
        if (currentPage > 1) dispatchWithHandling(dispatch, fetchManagerApprovedTimeRequest({ page: currentPage - 1 }));
    }, [dispatch, currentPage]);

    const handleNextClick = useCallback(() => {
        if (currentPage < slice.totalPages) dispatchWithHandling(dispatch, fetchManagerApprovedTimeRequest({ page: currentPage + 1 }));
    }, [dispatch, currentPage, slice.totalPages]);

    const handlePerPageChange = useCallback((perPage) => {
        dispatchWithHandling(dispatch, fetchManagerApprovedTimeRequest({ limit: perPage, page: currentPage }));
    }, [dispatch, currentPage]);

    const requestDelete = useCallback((id) => setDeleteId(id), []);
    const cancelDelete = useCallback(() => setDeleteId(null), []);
    const confirmDelete = useCallback(async () => {
        if (!deleteId) {
            ShowToast("error", translation("key_time_entry_id_is_needed"));
            return;
        }
        try {
            await dispatchWithHandling(dispatch, deleteManagerApprovedTimeRequest(deleteId));
            ShowToast("success", translation("key_time_entry_deleted_successfully"));
            setDeleteId(null);
            handleRefresh();
        } catch (err) {
            ShowToast("error", err.message);
        }
    }, [dispatch, deleteId, handleRefresh]);

    const openView = useCallback((row) => setViewEntry(row), []);
    const closeView = useCallback(() => setViewEntry(null), []);
    const openAdd = useCallback(() => setIsAddOpen(true), []);
    const closeAdd = useCallback(() => {
        setIsAddOpen(false);
        handleRefresh();
    }, [handleRefresh]);

    const pageInfo = useMemo(
        () => buildSlicePageInfo({ currentPage: slice.currentPage, totalPages: slice.totalPages, total: slice.total, limit: slice.perPage }),
        [slice.currentPage, slice.totalPages, slice.total, slice.perPage]
    );

    return {
        rows,
        isLoading: slice.status === HRMS_LOADING_STATUS,
        hasError: slice.status === HRMS_FAILED_STATUS,
        pageInfo,
        sort: tableHeaderFilter,
        deleteId,
        viewEntry,
        isAddOpen,
        sortTable,
        handleRefresh,
        handlePrevClick,
        handleNextClick,
        handlePerPageChange,
        requestDelete,
        cancelDelete,
        confirmDelete,
        openView,
        closeView,
        openAdd,
        closeAdd,
    };
};

export default useTimeCredit;
