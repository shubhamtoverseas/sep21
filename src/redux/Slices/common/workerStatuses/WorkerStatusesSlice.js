import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handleFulfilled, handleFulfilledWorkerProfileStatus } from './workerStatusesExtraReducer';
import { getWorkerStatuses, getWorkerProfileStatus } from '../../../../services/commonApi';
import { handlePending, handleRejected } from '../extra-reducers/commonExtraReducers';

export const fetchWorkerStatuses = createAsyncThunk('workerStatuses/fetchWorkerStatuses', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getWorkerStatuses(reqPayload);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const fetchWorkerProfileStatus = createAsyncThunk('workerStatuses/fetchWorkerProfileStatus', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getWorkerProfileStatus(reqPayload);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

const workerStatusesSlice = createSlice({
    name: 'workerStatuses',
    initialState: {
        workerStatuses: [],
        allWorkerStatuses: [],
        workerProfileStatusList: [],
        status: 'idle',
        error: null
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchWorkerStatuses.pending, handlePending)
            .addCase(fetchWorkerStatuses.fulfilled, handleFulfilled)
            .addCase(fetchWorkerStatuses.rejected, handleRejected)

            .addCase(fetchWorkerProfileStatus.pending, handlePending)
            .addCase(fetchWorkerProfileStatus.fulfilled, handleFulfilledWorkerProfileStatus)
            .addCase(fetchWorkerProfileStatus.rejected, handleRejected);
    }
});

export default workerStatusesSlice.reducer;
