import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handleFulfilled, handleFulfilledEmployerNationality } from './nationalitiesExtraReducer';
import { getNationalities } from '../../../../services/commonApi';
import { handlePending, handleRejected } from '../extra-reducers/commonExtraReducers';

export const fetchWorkerNationalities = createAsyncThunk('nationalities/fetchWorkerNationalities', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getNationalities(reqPayload);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const getEmployerNationalityList = createAsyncThunk('nationalities/fetchEmployerNationalities', async (reqPayload, { rejectWithValue }) => {
    try {
        console.log('reqPayloadreqPayload', reqPayload)
        const response = await getNationalities(reqPayload);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

const nationalitiesSlice = createSlice({
    name: 'nationalities',
    initialState: {
        workerNationalities: [],
        workerNationalitiesOnboarding2: [],
        workerNationalitiesGroupWise: [],
        employerNationalities: [],
        status: 'idle',
        error: null
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchWorkerNationalities.pending, handlePending)
            .addCase(fetchWorkerNationalities.fulfilled, handleFulfilled)
            .addCase(fetchWorkerNationalities.rejected, handleRejected)
            .addCase(getEmployerNationalityList.pending, handlePending)
            .addCase(getEmployerNationalityList.fulfilled, handleFulfilledEmployerNationality)
            .addCase(getEmployerNationalityList.rejected, handleRejected)
    }
});

export default nationalitiesSlice.reducer;
