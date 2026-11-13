import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    getAgencies,
    getMappingAgencies,
    getActiveAgencies,
    deleteAgencyById,
    addNewAgency,
    getAgencyById,
    updateAgencyById
} from '../../../../services/agencies';
import {
    handleAddAgencyFulfilled,
    handleFetchMappingAgenciesFulfilled,
    handleFetchActiveAgenciesFulfilled,
    handleDeleteAgencyFulfilled,
    handleFetchAgenciesFulfilled,
    handleFetchAgencyByIdFulfilled,
    handleUpdateAgencyFulfilled
} from './agenciesExtraReducers';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';

export const fetchAgencies = createAsyncThunk('agencies/fetchAgencies', async (params, { rejectWithValue }) => {
    try {
        const response = await getAgencies(params);
        return response.data.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchMappingAgencies = createAsyncThunk('agencies/fetchMappingAgencies', async (params, { rejectWithValue }) => {
    try {
        const response = await getMappingAgencies(params);
        return response.data.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchActiveAgencies = createAsyncThunk('branches/fetchActiveAgencies', async (params, { rejectWithValue }) => {
    try {
        const response = await getActiveAgencies(params);
        return response.data.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const deleteAgency = createAsyncThunk('agencies/deleteAgency', async (agencyId, { rejectWithValue }) => {
    try {
        const response = await deleteAgencyById(agencyId);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const addAgency = createAsyncThunk('agencies/addAgency', async (agencyData, { rejectWithValue }) => {
    try {
        const response = await addNewAgency(agencyData);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchAgencyById = createAsyncThunk('agencies/fetchAgencyById', async (id, { rejectWithValue }) => {
    try {
        const response = await getAgencyById(id);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const updateAgency = createAsyncThunk('agencies/updateAgency', async (agencyData, { rejectWithValue }) => {
    try {
        const response = await updateAgencyById(agencyData);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

const agenciesSlice = createSlice({
    name: 'agencies',
    initialState: {
        agencies: [],
        mappingAgencies: [],
        activeAgencies: [],
        status: 'idle',
        error: null,
        currentAgency: null,
        currentPage: 1,
        perPage: 10,
        totalPages: 0,
        totalAgencies: 0,
        lastUpdated: '',
        message: null,
    },
    reducers: {
        clearMessage(state) {
            state.message = null;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAgencies.pending, handlePending)
            .addCase(fetchAgencies.fulfilled, handleFetchAgenciesFulfilled)
            .addCase(fetchAgencies.rejected, handleRejected)
            .addCase(fetchMappingAgencies.pending, handlePending)
            .addCase(fetchMappingAgencies.fulfilled, handleFetchMappingAgenciesFulfilled)
            .addCase(fetchMappingAgencies.rejected, handleRejected)
            .addCase(fetchActiveAgencies.pending, handlePending)
            .addCase(fetchActiveAgencies.fulfilled, handleFetchActiveAgenciesFulfilled)
            .addCase(fetchActiveAgencies.rejected, handleRejected)
            .addCase(deleteAgency.pending, handlePending)
            .addCase(deleteAgency.fulfilled, handleDeleteAgencyFulfilled)
            .addCase(deleteAgency.rejected, handleRejected)
            .addCase(addAgency.pending, handlePending)
            .addCase(addAgency.fulfilled, handleAddAgencyFulfilled)
            .addCase(addAgency.rejected, handleRejected)
            .addCase(fetchAgencyById.pending, handlePending)
            .addCase(fetchAgencyById.fulfilled, handleFetchAgencyByIdFulfilled)
            .addCase(fetchAgencyById.rejected, handleRejected)
            .addCase(updateAgency.pending, handlePending)
            .addCase(updateAgency.fulfilled, handleUpdateAgencyFulfilled)
            .addCase(updateAgency.rejected, handleRejected);
    },
});

export const { clearMessage } = agenciesSlice.actions;

export default agenciesSlice.reducer;
