import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handleFetchLocationsFulfilled } from './locationsExtraReducers';
import { handlePending, handleRejected } from '../extra-reducers/commonExtraReducers';
import { getLocations } from '../../../../services/commonApi';

export const fetchLocations = createAsyncThunk('common/fetchLocations', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getLocations(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

const locationsSlice = createSlice({
    name: 'locations',
    initialState: {
        locations: [],
        status: 'idle',
        error: null
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchLocations.pending, handlePending)
            .addCase(fetchLocations.fulfilled, handleFetchLocationsFulfilled)
            .addCase(fetchLocations.rejected, handleRejected)
    }
});

export default locationsSlice.reducer;
