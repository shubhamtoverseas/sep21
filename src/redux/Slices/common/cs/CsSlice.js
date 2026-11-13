import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handlePending, handleRejected } from '../extra-reducers/commonExtraReducers';
import { changeCsStaffAPI, updateInvoiceInsuranceCsStaff, searchCsStaffAPI, searchStaffList, updateEmployerCSById, searchPartnerStaffAPI, getOtherCsStaff } from '../../../../services/cs';
import { handleChangeEmployerCsFulfilled, handleSearchCsStaffFulfilled, handleSearchStaffFulfilled, handleUpdateEmployerCSFulfilled } from './csExtraReducers';

export const updateEmployerCS = createAsyncThunk('agencies/updateEmployerCS', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await updateEmployerCSById(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const changeCsStaff = createAsyncThunk('agencies/changeCsStaff', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await changeCsStaffAPI(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const changeInvoiceInsuranceCsStaff = createAsyncThunk('agencies/changeInvoiceInsuranceCsStaff', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await updateInvoiceInsuranceCsStaff(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const searchStaff = createAsyncThunk('agencies/searchStaff', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await searchStaffList(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const searchPartnerStaff = createAsyncThunk('agencies/searchPartnerStaff', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await searchPartnerStaffAPI(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const searchCsStaff = createAsyncThunk('agencies/searchCsStaff', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await searchCsStaffAPI(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const searchOtherCsStaff = createAsyncThunk('agencies/searchOtherCsStaff', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getOtherCsStaff(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

const CsSlice = createSlice({
    name: 'cs',
    initialState: {
        staffList: [],
        partnerStaffList: [],
        employerCsStaffList: [],
        otherCsStaffList: [],
        message: '',
        status: 'idle',
        error: null
    },
    reducers: {
        clearMessage(state) {
            state.message = null;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(updateEmployerCS.pending, handlePending)
            .addCase(updateEmployerCS.fulfilled, handleUpdateEmployerCSFulfilled)
            .addCase(updateEmployerCS.rejected, handleRejected)
            .addCase(searchStaff.pending, handlePending)
            .addCase(searchStaff.fulfilled, handleSearchStaffFulfilled)
            .addCase(searchStaff.rejected, handleRejected)
            .addCase(searchCsStaff.pending, handlePending)
            .addCase(searchCsStaff.fulfilled, handleSearchCsStaffFulfilled)
            .addCase(searchCsStaff.rejected, handleRejected)
            .addCase(changeCsStaff.pending, handlePending)
            .addCase(changeCsStaff.fulfilled, handleChangeEmployerCsFulfilled)
            .addCase(changeCsStaff.rejected, handleRejected)
            .addCase(searchPartnerStaff.pending, handlePending)
            .addCase(searchPartnerStaff.fulfilled, (state, action) => {
                state.partnerStaffList = action.payload?.data ?? state.partnerStaffList;
                state.status = 'succeeded';
            })
            .addCase(searchPartnerStaff.rejected, handleRejected)
            .addCase(searchOtherCsStaff.pending, handlePending)
            .addCase(searchOtherCsStaff.fulfilled, (state, action) => {
                state.otherCsStaffList = action.payload?.data ?? state.otherCsStaffList;
                state.status = 'succeeded';
            })
            .addCase(searchOtherCsStaff.rejected, handleRejected)
            .addCase(changeInvoiceInsuranceCsStaff.pending, handlePending)
            .addCase(changeInvoiceInsuranceCsStaff.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.message = action.payload?.message ?? state.message;
            })
            .addCase(changeInvoiceInsuranceCsStaff.rejected, handleRejected);
    }
});
export const { clearMessage } = CsSlice.actions;

export default CsSlice.reducer;
