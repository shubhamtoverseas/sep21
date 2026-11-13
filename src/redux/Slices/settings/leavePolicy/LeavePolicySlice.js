import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';
import {
    handleAddLeavePolicyFulfilled,
    handleFetchLeavePolicyMasterFulfilled,
    handleUpdateLeavePolicyFulfilled,
    handleMasterLeavePolicyFulfilled,
    handleFetchLeaveMasterIdFulfilled,
    handleUpdateMasterLeavePolicyFulfilled,
} from './leavePolicyExtraReducers';
import {
    getLeavePolicyMaster,
    addNewLeavePolicy,
    updateLeavePolicyById,
    addMasterLeavePolicyAPI,
    getLeaveMasterView,
    updateMasterLeavePolicyAPI
} from '../../../../services/leavePolicy';

export const fetchLeavePolicyMaster = createAsyncThunk('leavePolicies/fetchLeavePolicyMaster', async (params, { rejectWithValue }) => {
    try {
        const response = await getLeavePolicyMaster(params);
        return response.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const fetchLeaveMasterView = createAsyncThunk('detailLeavePolicies/fetchLeaveMasterView', async (id, { rejectWithValue }) => {
    try {
        const response = await getLeaveMasterView(id);
        return response.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const addLeavePolicy = createAsyncThunk('leavePolicies/addLeavePolicy', async (policyData, { rejectWithValue }) => {
    try {
        const response = await addNewLeavePolicy(policyData);
        return response.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const addMasterLeavePolicy = createAsyncThunk('leavePolicies/addMasterLeavePolicy', async (policyData, { rejectWithValue }) => {
    try {
        const response = await addMasterLeavePolicyAPI(policyData);
        return response.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const updateMasterLeavePolicy = createAsyncThunk('leavePolicies/updateMasterLeavePolicy', async (policyData, { rejectWithValue }) => {
    try {
        const response = await updateMasterLeavePolicyAPI(policyData);
        return response.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const updateLeavePolicy = createAsyncThunk('leavePolicies/updateLeavePolicy', async (policyData, { rejectWithValue }) => {
    try {
        const response = await updateLeavePolicyById(policyData);
        return response.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

const leavePolicySlice = createSlice({
    name: 'leavePolicy',
    initialState: {
        leavePolicyMaster: [],
        leavePolicyMasterOrder: [],
        currentLeavePolicyMaster: null,
        status: 'idle',
        error: null,
        message: null,
        currentPage: 1,
        totalPages: 0,
        totalLeavePolicy: 0,
        lastUpdated: '',
    },
    reducers: {
        clearMessage(state) {
            state.message = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchLeavePolicyMaster.pending, handlePending)
            .addCase(fetchLeavePolicyMaster.fulfilled, handleFetchLeavePolicyMasterFulfilled)
            .addCase(fetchLeavePolicyMaster.rejected, handleRejected)
            .addCase(addLeavePolicy.pending, handlePending)
            .addCase(addLeavePolicy.fulfilled, handleAddLeavePolicyFulfilled)
            .addCase(addLeavePolicy.rejected, handleRejected)
            .addCase(addMasterLeavePolicy.pending, handlePending)
            .addCase(addMasterLeavePolicy.fulfilled, handleMasterLeavePolicyFulfilled)
            .addCase(addMasterLeavePolicy.rejected, handleRejected)
            .addCase(updateLeavePolicy.pending, handlePending)
            .addCase(updateLeavePolicy.fulfilled, handleUpdateLeavePolicyFulfilled)
            .addCase(updateLeavePolicy.rejected, handleRejected)
            .addCase(updateMasterLeavePolicy.pending, handlePending)
            .addCase(updateMasterLeavePolicy.fulfilled, handleUpdateMasterLeavePolicyFulfilled)
            .addCase(updateMasterLeavePolicy.rejected, handleRejected)
            .addCase(fetchLeaveMasterView.pending, handlePending)
            .addCase(fetchLeaveMasterView.fulfilled, handleFetchLeaveMasterIdFulfilled)
            .addCase(fetchLeaveMasterView.rejected, handleRejected)
    },
});

export const { clearMessage } = leavePolicySlice.actions;
export default leavePolicySlice.reducer;