import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    getLeaves,
    getLeaveById,
    getLeaveTypes,
    getLeaveBalance,
    updateLeaveById,
    addNewLeave,
    withdrawLeaveById,
    getReporteesLeaves,
    reposteesLeaveStatusChangeByIds,
    reposteesIndividualLeaveStatusChangeByIds,
    getReportLeaveHistory,
    addManualUpdateLeave,
    getScheduleComplianceList,
    getLeaveEligibilityCheck,
} from '../../../../services/leaves';
import {
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
    handleFetchLeaveEligibilityCheckFulfilled,
} from './leavesExtraReducers';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';

export const fetchLeaves = createAsyncThunk('leaves/fetchLeaves', async (params, { rejectWithValue }) => {
    try {
        const response = await getLeaves(params);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const fetchLeaveById = createAsyncThunk('leaves/fetchLeaveById', async (id, { rejectWithValue }) => {
    try {
        const response = await getLeaveById(id);
        return response.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const fetchLeaveTypes = createAsyncThunk('leaves/fetchLeaveTypes', async (params, { rejectWithValue }) => {
    try {
        const response = await getLeaveTypes(params || undefined);
        return response.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const fetchLeaveBalance = createAsyncThunk('leaves/fetchLeaveBalance', async (id, { rejectWithValue }) => {
    try {
        const response = await getLeaveBalance(id);
        return response.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const fetchLeaveEligibilityCheck = createAsyncThunk('leaves/fetchLeaveEligibilityCheck', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getLeaveEligibilityCheck(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const addLeave = createAsyncThunk('leaves/addLeave', async (leaveData, { rejectWithValue }) => {
    try {
        const response = await addNewLeave(leaveData);
        return response.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const withdrawLeave = createAsyncThunk('leaves/withdrawLeave', async (id, { rejectWithValue }) => {
    try {
        const response = await withdrawLeaveById(id);
        return response.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const updateLeave = createAsyncThunk('leaves/updateLeave', async (leaveData, { rejectWithValue }) => {
    try {
        const response = await updateLeaveById(leaveData);
        return response.data;
    } catch (error) {
        console.log("slice error", error.response?.data?.message);
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const fetchReporteesLeaves = createAsyncThunk('leaves/fetchReporteesLeaves', async (params, { rejectWithValue }) => {
    try {
        const response = await getReporteesLeaves(params);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const reposteesLeaveStatusChange = createAsyncThunk('leaves/reposteesLeaveStatusChange', async (id, { rejectWithValue }) => {
    try {
        const response = await reposteesLeaveStatusChangeByIds(id);
        return response.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const reposteesIndividualLeaveStatusChange = createAsyncThunk('leaves/reposteesIndividualLeaveStatusChange', async (id, { rejectWithValue }) => {
    try {
        const response = await reposteesIndividualLeaveStatusChangeByIds(id);
        return response.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const fetchReportLeaveHistory = createAsyncThunk('leaves/fetchReportLeaveHistory', async (params, { rejectWithValue }) => {
    try {
        const response = await getReportLeaveHistory(params);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const fetchScheduleComplianceList = createAsyncThunk('leaves/fetchScheduleComplianceList', async (params, { rejectWithValue }) => {
    try {
        const response = await getScheduleComplianceList(params);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const manualUpdateLeave = createAsyncThunk('manualUpdateLeaves/manualUpdateLeave', async (manualUpdateLeaveData, { rejectWithValue }) => {
    try {
        const response = await addManualUpdateLeave(manualUpdateLeaveData);
        return response.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

const LeavesSlice = createSlice({
    name: 'leaves',
    initialState: {
        leaves: [],
        leavesOrder: [],
        status: 'idle',
        error: null,
        currentLevaes: null,
        currentPage: 1,
        perPage: 10,
        totalPages: 0,
        totalLeaves: 0,
        lastUpdated: '',
        message: null,
        repoteesLeaves: [],
        repoteesLeavesOrder: [],
        repoteesLeavesStatus: 'idle',
        repoteesLeavesMessage: null,
        repoteesLeavesError: null,
        repoteesLeavesLastUpdated: '',
        repoteesLeavesCurrentPage: 1,
        repoteesLeavesTotalPages: 0,
        repoteesLeavesPerPage: 10,
        repoteesLeavesTotalLeaves: 0,
        reportLeaveHistory: [],
        reportLeaveHistoryOrder: [],
        reportLeaveHistoryStatus: 'idle',
        reportLeaveHistoryMessage: null,
        reportLeaveHistoryError: null,
        reportLeaveHistoryLastUpdated: '',
        reportLeaveHistoryCurrentPage: 1,
        reportLeaveHistoryTotalPages: 0,
        reportLeaveHistoryPerPage: 10,
        reportLeaveHistoryTotalLeaves: 0,
        scheduleComplianceList: [],
        scheduleComplianceListCurrentPage: 1,
        scheduleComplianceListPerPage: 10,
        scheduleComplianceListTotalPages: 0,
        scheduleComplianceListTotalLeaves: 0,
        scheduleComplianceListLastUpdated: '',
        scheduleComplianceListMessage: null,
    },
    reducers: {
        clearMessage(state) {
            state.message = null;
            state.error = null;
        },
        clearLeaveBalance(state) {
            state.leaveBalance = {};
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchLeaves.pending, handlePending)
            .addCase(fetchLeaves.fulfilled, handleFetchLeavesFulfilled)
            .addCase(fetchLeaves.rejected, handleRejected)
            .addCase(fetchLeaveById.pending, handlePending)
            .addCase(fetchLeaveById.fulfilled, handleFetchLeaveByIdFulfilled)
            .addCase(fetchLeaveById.rejected, handleRejected)
            .addCase(addLeave.pending, handlePending)
            .addCase(addLeave.fulfilled, handleAddLeaveFulfilled)
            .addCase(addLeave.rejected, handleRejected)
            .addCase(updateLeave.pending, handlePending)
            .addCase(updateLeave.fulfilled, handleUpdateLeaveFulfilled)
            .addCase(updateLeave.rejected, handleRejected)
            .addCase(fetchLeaveTypes.pending, handlePending)
            .addCase(fetchLeaveTypes.fulfilled, handleFetchLeaveTypesFulfilled)
            .addCase(fetchLeaveTypes.rejected, handleRejected)
            .addCase(fetchLeaveBalance.pending, handlePending)
            .addCase(fetchLeaveBalance.fulfilled, handleFetchLeaveBalanceFulfilled)
            .addCase(fetchLeaveBalance.rejected, handleRejected)
            .addCase(fetchLeaveEligibilityCheck.pending, handlePending)
            .addCase(fetchLeaveEligibilityCheck.fulfilled, handleFetchLeaveEligibilityCheckFulfilled)
            .addCase(fetchLeaveEligibilityCheck.rejected, handleRejected)
            .addCase(withdrawLeave.pending, handlePending)
            .addCase(withdrawLeave.fulfilled, handleWithdrawLeaveFulfilled)
            .addCase(withdrawLeave.rejected, handleRejected)
            .addCase(fetchReporteesLeaves.pending, handlePending)
            .addCase(fetchReporteesLeaves.fulfilled, handleFetchReporteesLeavesFulfilled)
            .addCase(fetchReporteesLeaves.rejected, handleRejected)
            .addCase(reposteesLeaveStatusChange.pending, handlePending)
            .addCase(reposteesLeaveStatusChange.fulfilled, handleReposteesLeaveStatusChangeFulfilled)
            .addCase(reposteesLeaveStatusChange.rejected, handleRejected)
            .addCase(reposteesIndividualLeaveStatusChange.pending, handlePending)
            .addCase(reposteesIndividualLeaveStatusChange.fulfilled, handleReposteesIndividualLeaveStatusChangeFulfilled)
            .addCase(reposteesIndividualLeaveStatusChange.rejected, handleRejected)
            .addCase(fetchReportLeaveHistory.pending, handlePending)
            .addCase(fetchReportLeaveHistory.fulfilled, handleFetchReportLeaveHistoryFulfilled)
            .addCase(fetchReportLeaveHistory.rejected, handleRejected)
            .addCase(fetchScheduleComplianceList.pending, handlePending)
            .addCase(fetchScheduleComplianceList.fulfilled, handleFetchScheduleComplianceListFulfilled)
            .addCase(fetchScheduleComplianceList.rejected, handleRejected)
            .addCase(manualUpdateLeave.pending, handlePending)
            .addCase(manualUpdateLeave.fulfilled, handleManualUpdateLeaveFulfilled)
            .addCase(manualUpdateLeave.rejected, handleRejected);
    },
});

export const { clearMessage, clearLeaveBalance } = LeavesSlice.actions;

export default LeavesSlice.reducer;
