import { useCallback, useEffect, useMemo, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { fetchLeaves, withdrawLeave } from "../../../../../../redux/Slices/settings/leaves/LeavesSlice";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { dispatchWithHandling } from "../../../../../../utils/dispatchHandler";
import translation from "../../../../../../utils/translation";
import { useLeaveManagementPermissions } from "../../../../../../utils/permissions/leaveManagementPermissionUtils";
import { useHrmsPermissions } from "../../../../../../utils/permissions/hrmsPermissionsUtils";
import { buildSlicePageInfo } from "../../settingsListConfig";
import { hrmsSortQuery, orderedRows } from "../hrmsConfig";
import { DEFAULT_HRMS_SORT, HRMS_DEFAULT_PAGE_QUERY, HRMS_LOADING_STATUS, HRMS_SORT_ORDER } from "../../settingsNewUiConstants";

const selectLeaves = (state) => ({
    leaves: state.leaves.leaves,
    leavesOrder: state.leaves.leavesOrder,
    currentPage: state.leaves.currentPage,
    totalPages: state.leaves.totalPages,
    perPage: state.leaves.perPage,
    totalLeaves: state.leaves.totalLeaves,
    lastUpdated: state.leaves.lastUpdated,
    status: state.leaves.status,
});

/** Ports Leaves.js: mount fetch, sort toggle, paging, withdraw confirm + refresh. */
const useLeaveList = () => {
    const dispatch = useDispatch();
    const slice = useSelector(selectLeaves, shallowEqual);
    const { permissionList } = useSelector((state) => state.users);
    /* `add_leave` is an HRMS key (the Leave Management resolver has no canAddLeave, so the Apply Leave button never rendered — Priyanka test run 23 Oct #13) */
    const { canAddLeave } = useHrmsPermissions(permissionList);
    const { canEditLeave } = useLeaveManagementPermissions(permissionList);

    const [tableHeaderFilter, setTableHeaderFilter] = useState(DEFAULT_HRMS_SORT);
    const [withdrawId, setWithdrawId] = useState(null);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    const currentPage = parseInt(slice.currentPage, 10);
    const rows = useMemo(() => orderedRows(slice.leaves, slice.leavesOrder), [slice.leaves, slice.leavesOrder]);

    useEffect(() => {
        dispatch(fetchLeaves(HRMS_DEFAULT_PAGE_QUERY));
    }, [dispatch]);

    /* bug log #87 (fixed 2026-10-18): refresh / paging / per-page keep the active sort; sort keeps the current page size */
    const handleRefresh = useCallback(() => {
        dispatchWithHandling(dispatch, fetchLeaves({ page: currentPage, ...hrmsSortQuery(tableHeaderFilter) }));
    }, [dispatch, currentPage, tableHeaderFilter]);

    const sortTable = useCallback((sortKey) => {
        if (!sortKey) return;
        const newOrder = tableHeaderFilter.order === HRMS_SORT_ORDER.ASC ? HRMS_SORT_ORDER.DESC : HRMS_SORT_ORDER.ASC;
        setTableHeaderFilter({ sort: sortKey, order: newOrder });
        dispatchWithHandling(dispatch, fetchLeaves({ page: slice.currentPage, limit: Number(slice.perPage) || HRMS_DEFAULT_PAGE_QUERY.limit, sort_by: sortKey, sort_order: newOrder }));
    }, [dispatch, slice.currentPage, slice.perPage, tableHeaderFilter.order]);

    const handlePrevClick = useCallback(() => {
        if (currentPage > 1) dispatchWithHandling(dispatch, fetchLeaves({ page: currentPage - 1, ...hrmsSortQuery(tableHeaderFilter) }));
    }, [dispatch, currentPage, tableHeaderFilter]);

    const handleNextClick = useCallback(() => {
        if (currentPage < slice.totalPages) dispatchWithHandling(dispatch, fetchLeaves({ page: currentPage + 1, ...hrmsSortQuery(tableHeaderFilter) }));
    }, [dispatch, currentPage, slice.totalPages, tableHeaderFilter]);

    const handlePerPageChange = useCallback((perPage) => {
        dispatchWithHandling(dispatch, fetchLeaves({ limit: perPage, page: currentPage, ...hrmsSortQuery(tableHeaderFilter) }));
    }, [dispatch, currentPage, tableHeaderFilter]);

    const requestWithdraw = useCallback((id) => setWithdrawId(id), []);
    const cancelWithdraw = useCallback(() => setWithdrawId(null), []);

    const confirmWithdraw = useCallback(async () => {
        if (!withdrawId) return;
        setIsWithdrawing(true);
        try {
            await dispatchWithHandling(dispatch, withdrawLeave(withdrawId));
            ShowToast("success", translation("key_leave_withdraw_successfully"));
            setWithdrawId(null);
            handleRefresh();
        } catch (err) {
            setWithdrawId(null);
            ShowToast("error", err);
        } finally {
            setIsWithdrawing(false);
        }
    }, [dispatch, withdrawId, handleRefresh]);

    const pageInfo = useMemo(
        () => buildSlicePageInfo({ currentPage: slice.currentPage, totalPages: slice.totalPages, total: slice.totalLeaves, limit: slice.perPage }),
        [slice.currentPage, slice.totalPages, slice.totalLeaves, slice.perPage]
    );

    return {
        lastUpdated: slice.lastUpdated,
        canAddLeave: Boolean(canAddLeave),
        canEditLeave: Boolean(canEditLeave),
        rows,
        isLoading: slice.status === HRMS_LOADING_STATUS,
        pageInfo,
        sort: tableHeaderFilter,
        withdrawId,
        isWithdrawing,
        sortTable,
        handlePrevClick,
        handleNextClick,
        handlePerPageChange,
        handleRefresh,
        requestWithdraw,
        cancelWithdraw,
        confirmWithdraw,
    };
};

export default useLeaveList;
