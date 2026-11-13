import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handleFulfilled, handleGetAllCountriesFulfilled } from './countriesExtraReducers';
import { getCountries } from '../../../../services/commonApi';
import { handlePending, handleRejected } from '../extra-reducers/commonExtraReducers';


export const fetchCountriesGeneral = createAsyncThunk('countries/fetchCountriesGeneral', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getCountries(reqPayload);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const fetchCountries = createAsyncThunk('countries/fetchCountries', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getCountries(reqPayload);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const fetchEmployerCountries = createAsyncThunk('countries/fetchEmployerCountries', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getCountries(reqPayload);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const fetchCountriesAll = createAsyncThunk('countries/fetchCountriesAll', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getCountries(reqPayload);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const fetchCountriesWorker = createAsyncThunk('countries/fetchCountriesWorker', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getCountries(reqPayload);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const fetchCountriesWorkerNonHone = createAsyncThunk('countries/fetchCountriesWorkerNonHone', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getCountries(reqPayload);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const fetchCountriesWorkerBiodata = createAsyncThunk('countries/fetchCountriesWorkerBiodata', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getCountries(reqPayload);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

const countriesSlice = createSlice({
    name: 'countries',
    initialState: {
        countries: [],
        countriesBiodata: [],
        countriesAll: [],
        workerContries: [],
        workerContriesNonHome: [],
        workerContriesGeneral: [],
        employerCountries: [],
        status: 'idle',
        error: null
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCountries.pending, handlePending)
            .addCase(fetchCountries.fulfilled, handleFulfilled)
            .addCase(fetchCountries.rejected, handleRejected)
            .addCase(fetchCountriesGeneral.pending, handlePending)
            .addCase(fetchCountriesGeneral.fulfilled, (state, action) => {
                state.workerContriesGeneral = action.payload;
                state.status = 'idle';
            })
            .addCase(fetchCountriesGeneral.rejected, handleRejected)
            .addCase(fetchCountriesAll.pending, handlePending)
            .addCase(fetchCountriesAll.fulfilled, handleGetAllCountriesFulfilled)
            .addCase(fetchCountriesAll.rejected, handleRejected)
            .addCase(fetchCountriesWorker.pending, handlePending)
            .addCase(fetchCountriesWorker.fulfilled, (state, action) => {
                state.workerContries = action.payload;
                state.status = 'idle';
            })
            .addCase(fetchCountriesWorker.rejected, handleRejected)
            .addCase(fetchCountriesWorkerNonHone.pending, handlePending)
            .addCase(fetchCountriesWorkerNonHone.fulfilled, (state, action) => {
                state.workerContriesNonHome = action.payload;
                state.status = 'idle';
            })
            .addCase(fetchCountriesWorkerNonHone.rejected, handleRejected)
            .addCase(fetchCountriesWorkerBiodata.pending, handlePending)
            .addCase(fetchCountriesWorkerBiodata.fulfilled, (state, action) => {
                state.countriesBiodata = action.payload;
                state.status = 'idle';
            })
            .addCase(fetchCountriesWorkerBiodata.rejected, handleRejected)
            .addCase(fetchEmployerCountries.pending, handlePending)
            .addCase(fetchEmployerCountries.fulfilled, (state, action) => {
                state.employerCountries = action.payload;
                state.status = 'idle';
            })
            .addCase(fetchEmployerCountries.rejected, handleRejected);

    }
});

export default countriesSlice.reducer;
