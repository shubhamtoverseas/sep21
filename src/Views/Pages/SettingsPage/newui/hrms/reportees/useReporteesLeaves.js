import { useCallback, useEffect, useMemo, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import {
    clearMessage,
    fetchReporteesLeaves,
    reposteesIndividualLeaveStatusChange,
    reposteesLeaveStatusChange,
} from "../../../../../../redux/Slices/settings/leaves/LeavesSlice";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { dispatchWithHandling } from "../../../../../../utils/dispatchHandler";
import translation from "../../../../../../utils/translation";
import { buildSlicePageInfo } from "../../settingsListConfig";
import { dateRangeQuery, nonReporteesFlag, orderedRows } from "../hrmsConfig";
import {
    DEFAULT_HRMS_SORT,
    HRMS_DEFAULT_PAGE_QUERY,
    HRMS_FAILED_STATUS,
    HRMS_LOADING_STATUS,
    HRMS_SORT_ORDER,
    LEAVE_ACTION,
    REPORTEE_LEAVE_TAB,
} from "../../settingsNewUiConstants";

const selectReporteesLeaves = (state) => ({
    byId: state.leaves.repoteesLeaves,
    order: state.leaves.repoteesLeavesOrder,
    status: state.leaves.repoteesLeavesStatus,
    message: state.leaves.repoteesLeavesMessage,
    error: state.leaves.repoteesLeavesError,
    currentPage: state.leaves.repoteesLeavesCurrentPage,
    totalPages: state.leaves.repoteesLeavesTotalPages,
    perPage: state.leaves.repoteesLeavesPerPage,
    total: state.leaves.repoteesLeavesTotalLeaves,
    lastUpdated: state.leaves.repoteesLeavesLastUpdated,
});

/** Ports ReporteesLeaves.js: filter-driven fetch, sort/paging, bulk + per-row status change with confirm. */
const useReporteesLeaves = ({ status, dateRange, showNonReportees }) => {
    const dispatch = useDispatch();
    const slice = useSelector(selectReporteesLeaves, shallowEqual);
    const [selectedLeaveIds, setSelectedLeaveIds] = useState([]);
    const [selectedIndividualLeaveId, setSelectedIndividualLeaveId] = useState("");
    const [selectedLeaveStatus, setSelectedLeaveStatus] = useState("");
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    /* bug log #91 (fixed 2026-10-06): the row whose pencil was clicked, not a flag for every row */
    const [statusChangeRowId, setStatusChangeRowId] = useState(null);
    const [tableHeaderFilter, setTableHeaderFilter] = useState(DEFAULT_HRMS_SORT);

    const rows = useMemo(() => orderedRows(slice.byId, slice.order), [slice.byId, slice.order]);
    const currentPage = parseInt(slice.currentPage, 10);
    const isPending = status === REPORTEE_LEAVE_TAB.PENDING;

    const baseQuery = useCallback(() => ({
        status,
        ...dateRangeQuery(dateRange),
        non_reportees: nonReporteesFlag(showNonReportees),
    }), [status, dateRange, showNonReportees]);

    useEffect(() => {
        dispatch(fetchReporteesLeaves({ ...HRMS_DEFAULT_PAGE_QUERY, ...baseQuery() }));
    }, [dispatch, baseQuery]);

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

    const sortTable = useCallback((sortKey) => {
        if (!sortKey) return;
        const newOrder = tableHeaderFilter.order === HRMS_SORT_ORDER.ASC ? HRMS_SORT_ORDER.DESC : HRMS_SORT_ORDER.ASC;
        setTableHeaderFilter({ sort: sortKey, order: newOrder });
        dispatchWithHandling(dispatch, fetchReporteesLeaves({ ...HRMS_DEFAULT_PAGE_QUERY, ...baseQuery(), sort_by: sortKey, sort_order: newOrder }));
    }, [dispatch, tableHeaderFilter.order, baseQuery]);

    const handleRefresh = useCallback(() => {
        dispatchWithHandling(dispatch, fetchReporteesLeaves({ page: currentPage, ...baseQuery() }));
    }, [dispatch, currentPage, baseQuery]);

    const handlePrevClick = useCallback(() => {
        if (currentPage > 1) dispatchWithHandling(dispatch, fetchReporteesLeaves({ page: currentPage - 1, ...baseQuery() }));
    }, [dispatch, currentPage, baseQuery]);

    const handleNextClick = useCallback(() => {
        if (currentPage < slice.totalPages) dispatchWithHandling(dispatch, fetchReporteesLeaves({ page: currentPage + 1, ...baseQuery() }));
    }, [dispatch, currentPage, slice.totalPages, baseQuery]);

    const handlePerPageChange = useCallback((perPage) => {
        dispatchWithHandling(dispatch, fetchReporteesLeaves({ limit: perPage, page: currentPage, ...baseQuery() }));
    }, [dispatch, currentPage, baseQuery]);

    const toggleSelect = useCallback((leaveId, checked) => {
        setSelectedLeaveIds((prev) => (checked ? [...prev, leaveId] : prev.filter((id) => id !== leaveId)));
    }, []);

    const closeConfirm = useCallback(() => setIsConfirmOpen(false), []);
    const openBulkReject = useCallback(() => { setIsConfirmOpen(true); setSelectedLeaveStatus(LEAVE_ACTION.REJECT); }, []);
    const openBulkApprove = useCallback(() => { setIsConfirmOpen(true); setSelectedLeaveStatus(LEAVE_ACTION.APPROVE); }, []);
    const openRowAction = useCallback((leaveId, action) => {
        setSelectedIndividualLeaveId(leaveId);
        setSelectedLeaveStatus(action);
        setIsConfirmOpen(true);
    }, []);
    const showStatusChangeButtons = useCallback((rowId) => setStatusChangeRowId(rowId), []);

    const handlePendingConfirmation = useCallback(async () => {
        if (selectedLeaveIds.length) {
            try {
                await dispatchWithHandling(dispatch, reposteesLeaveStatusChange({ leave_apply_ids: selectedLeaveIds, status: selectedLeaveStatus }));
                setIsConfirmOpen(false);
                handleRefresh();
            } catch (err) {
                /* backend 352: 400 (balance no longer covers a re-approval) / 409 (withdrawn) carry `message`; the row stays as it was and the list is re-read */
                setIsConfirmOpen(false);
                ShowToast("error", err?.data?.data?.message || err?.message || err);
                handleRefresh();
            }
        } else {
            setIsConfirmOpen(false);
            ShowToast("error", translation("key_leave_id_needed"));
        }
    }, [dispatch, selectedLeaveIds, selectedLeaveStatus, handleRefresh]);

    const handleActionedConfirmation = useCallback(async () => {
        if (selectedIndividualLeaveId) {
            try {
                await dispatchWithHandling(dispatch, reposteesIndividualLeaveStatusChange({ leave_apply_id: selectedIndividualLeaveId, status: selectedLeaveStatus }));
                setIsConfirmOpen(false);
                setSelectedLeaveStatus("");
                setSelectedIndividualLeaveId("");
                handleRefresh();
                setStatusChangeRowId(null);
            } catch (err) {
                setIsConfirmOpen(false);
                ShowToast("error", err?.data?.data?.message || err?.message || err);
                setStatusChangeRowId(null);
                handleRefresh();
            }
        } else {
            setIsConfirmOpen(false);
            ShowToast("error", translation("key_leave_id_needed"));
        }
    }, [dispatch, selectedIndividualLeaveId, selectedLeaveStatus, handleRefresh]);

    const pageInfo = useMemo(
        () => buildSlicePageInfo({ currentPage: slice.currentPage, totalPages: slice.totalPages, total: slice.total, limit: slice.perPage }),
        [slice.currentPage, slice.totalPages, slice.total, slice.perPage]
    );

    return {
        rows,
        isPending,
        isLoading: slice.status === HRMS_LOADING_STATUS,
        hasError: slice.status === HRMS_FAILED_STATUS,
        pageInfo,
        sort: tableHeaderFilter,
        selectedLeaveIds,
        isConfirmOpen,
        statusChangeRowId,
        sortTable,
        handleRefresh,
        handlePrevClick,
        handleNextClick,
        handlePerPageChange,
        toggleSelect,
        openBulkReject,
        openBulkApprove,
        openRowAction,
        showStatusChangeButtons,
        closeConfirm,
        confirm: isPending ? handlePendingConfirmation : handleActionedConfirmation,
    };
};

export default useReporteesLeaves;
