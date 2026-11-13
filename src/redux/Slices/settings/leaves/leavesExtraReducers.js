
import { arrayToObjectCovert } from '../../../../services/commonService';

const handleFetchLeavesFulfilled = (state, action) => {
    state.status = 'succeeded';
    if (action?.payload?.data) {
         state.leaves = arrayToObjectCovert(action.payload?.data);
        state.leavesOrder = (action.payload?.data ?? []).map(leave => leave.id);
        state.currentPage = action.payload?.current_page ?? state.currentPage;
        state.perPage = action.payload?.limit ?? state.perPage;
        state.totalPages = action.payload?.total_pages ?? state.totalPages;
        state.totalLeaves = action.payload?.total_leave_apply_count ?? state.totalLeaves;
        state.lastUpdated = action.payload?.last_updated ?? state.lastUpdated;
        state.message = action.payload?.message ?? state.message;
    } else {
        state.leaves = {};
        state.leavesOrder = [];
        state.currentPage = 1;
        state.perPage = 10;
        state.totalPages = 0;
        state.totalLeaves = 0;
        state.lastUpdated = null;
        state.message = '';
    }
};

const handleFetchLeaveByIdFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.currentLeave = action.payload?.data ?? state.currentLeave;
};

const handleAddLeaveFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.message = action.payload?.message ?? state.message;
};

const handleUpdateLeaveFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.leaves[action.payload?.data?.id] = action.payload?.data;
    state.currentLeave = action.payload?.data ?? state.currentLeave;
    state.message = action.payload?.message ?? state.message;
};

/* /hrms/leave-apply/type-list: the list may arrive as `data: [...]`, as `data: { <key>: [...] }` or as a keyed object of types.
   Object.values() on a wrapper object used to yield one nameless option (ClickUp "Leave type not opening in Manual Update
   leaves"), so the first array inside the payload is taken, and every entry gets `leave_policy_type` whatever the API calls it. */
const leaveTypeList = (data) => {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    const nested = Object.values(data).find((v) => Array.isArray(v));
    if (nested) return nested;
    const values = Object.values(data);
    return values.every((v) => v && typeof v === 'object') ? values : [];
};
const handleFetchLeaveTypesFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.leaveTypes = leaveTypeList(action.payload?.data ?? action.payload)
        .filter((t) => t && (t.id ?? t.leave_policy_details_id) != null)
        .map((t) => ({
            ...t,
            id: t.id ?? t.leave_policy_details_id,
            leave_policy_type: t.leave_policy_type ?? t.leave_type ?? t.leave_type_name ?? t.name ?? '',
        }));
};

const handleWithdrawLeaveFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.leaves[action.payload?.data?.id] = action.payload?.data;
    state.message = action.payload?.message ?? state.message;
};

const handleFetchLeaveBalanceFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.leaveBalance = action.payload?.data ?? state.leaveBalance;
};

const handleFetchLeaveEligibilityCheckFulfilled = (state) => {
    state.status = 'succeeded';
}

const handleFetchReporteesLeavesFulfilled = (state, action) => {
    state.repoteesLeavesStatus = 'succeeded';
    state.repoteesLeaves = arrayToObjectCovert(action.payload?.data);
    state.repoteesLeavesOrder = (action.payload?.data ?? []).map(leave => leave.id);
    state.repoteesLeavesCurrentPage = action.payload?.current_page ?? state.repoteesLeavesCurrentPage;
    state.repoteesLeavesPerPage = action.payload?.limit ?? state.repoteesLeavesPerPage;
    state.repoteesLeavesTotalPages = action.payload?.total_pages ?? state.repoteesLeavesTotalPages;
    state.repoteesLeavesTotalLeaves = action.payload?.total_leave_apply_count ?? state.repoteesLeavesTotalLeaves;
    state.repoteesLeavesLastUpdated = action.payload?.last_updated ?? state.repoteesLeavesLastUpdated;
    state.repoteesLeavesMessage = action.payload?.message ?? state.repoteesLeavesMessage;
};

/* backend 352 (29 Oct): the bulk hook refreshes the reportees list after success — never touch `state.leaves`
   (the employee's own leave list; the old write put bare ids into that array) */
const handleReposteesLeaveStatusChangeFulfilled = (state, action) => {
    state.repoteesLeavesStatus = 'succeeded';
    state.repoteesLeavesMessage = action.payload?.message ?? state.repoteesLeavesMessage;
};

/* backend 352: the response is `{ data: { id, status, … } }`; `repoteesLeaves` is an object keyed by leave id. The old
   write `state.leaves[data.leave_apply_id]` hit the employee's own leave ARRAY at index "undefined" and Immer threw,
   which rejected the dispatch, toasted an error and skipped the refresh although the leave was updated. */
const handleReposteesIndividualLeaveStatusChangeFulfilled = (state, action) => {
    state.repoteesLeavesStatus = 'succeeded';
    const row = action.payload?.data;
    if (row?.id != null && state.repoteesLeaves?.[row.id]) {
        state.repoteesLeaves[row.id] = { ...state.repoteesLeaves[row.id], status: row.status };
    }
    state.repoteesLeavesMessage = action.payload?.message ?? state.repoteesLeavesMessage;
};

const handleFetchReportLeaveHistoryFulfilled = (state, action) => {
    state.reportLeaveHistoryStatus = 'succeeded';
    state.reportLeaveHistory = action.payload?.data ?? state.reportLeaveHistory;
    state.reportLeaveHistoryCurrentPage = action.payload?.current_page ?? state.reportLeaveHistoryCurrentPage;
    state.reportLeaveHistoryPerPage = action.payload?.limit ?? state.reportLeaveHistoryPerPage;
    state.reportLeaveHistoryTotalPages = action.payload?.total_pages ?? state.reportLeaveHistoryTotalPages;
    state.reportLeaveHistoryTotalLeaves = action.payload?.total_leaves_count ?? state.reportLeaveHistoryTotalLeaves;
    state.reportLeaveHistoryLastUpdated = action.payload?.last_updated ?? state.reportLeaveHistoryLastUpdated;
    state.reportLeaveHistoryMessage = action.payload?.message ?? state.reportLeaveHistoryMessage;
};

const handleFetchScheduleComplianceListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.scheduleComplianceList = action.payload?.data ?? state.scheduleComplianceList;
    state.scheduleComplianceListCurrentPage = action.payload?.current_page ?? state.scheduleComplianceListCurrentPage;
    state.scheduleComplianceListPerPage = action.payload?.limit ?? state.scheduleComplianceListPerPage;
    state.scheduleComplianceListTotalPages = action.payload?.total_pages ?? state.scheduleComplianceListTotalPages;
    state.scheduleComplianceListTotalLeaves = action.payload?.total_count ?? state.scheduleComplianceListTotalLeaves;
    state.scheduleComplianceListLastUpdated = action.payload?.last_updated ?? state.scheduleComplianceListLastUpdated;
    state.message = action.payload?.message ?? state.message;
}

const handleManualUpdateLeaveFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.message = action.payload?.message ?? state.message;
};

export {
    handleFetchLeavesFulfilled,
    handleFetchLeaveByIdFulfilled,
    handleAddLeaveFulfilled,
    handleUpdateLeaveFulfilled,
    handleFetchLeaveTypesFulfilled,
    handleFetchLeaveBalanceFulfilled,
    handleWithdrawLeaveFulfilled,
    handleFetchReporteesLeavesFulfilled,
    handleReposteesLeaveStatusChangeFulfilled,
    handleReposteesIndividualLeaveStatusChangeFulfilled,
    handleFetchReportLeaveHistoryFulfilled,
    handleManualUpdateLeaveFulfilled,
    handleFetchScheduleComplianceListFulfilled,
    handleFetchLeaveEligibilityCheckFulfilled
};
