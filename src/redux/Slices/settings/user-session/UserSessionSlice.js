import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';
import {
    handleFetchUserSessionHistoryFulfilled,
} from './userSessionExtraReducers';
import {
    getUserSessionHistory
} from '../../../../services/userSession';

export const fetchUserSessionHistory = createAsyncThunk('user-permissions/fetchUserSessionHistory', async (params, { rejectWithValue }) => {
    try {
        const response = await getUserSessionHistory(params);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

const userSessionSlice = createSlice({
    name: 'userSession',
    initialState: {
        userSessionHistory: [],
        status: 'idle',
        error: null,
        currentTimeRequest: null,
        currentPage: 1,
        perPage: 10,
        totalPages: 0,
        total: 0,
        lastUpdated: '',
        message: null,
    },
    reducers: {
        clearMessage(state) {
            state.message = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUserSessionHistory.pending, handlePending)
            .addCase(fetchUserSessionHistory.fulfilled, handleFetchUserSessionHistoryFulfilled)
            .addCase(fetchUserSessionHistory.rejected, handleRejected);

    },
});

export const { clearMessage } = userSessionSlice.actions;
export default userSessionSlice.reducer;
