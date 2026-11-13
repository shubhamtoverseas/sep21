import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';
import { getMedicalListAPI, saveMedicalClinicAPI, viewMedicalClinicAPI } from '../../../../services/settings/medical';
import { handleFetchMedicalList, handleSaveMedicalClinicFulfilled, handleViewMedicalClinicFulfilled } from './medicalExtraReducers';

export const fetchMedicalList = createAsyncThunk('medical/fetchMedicalList', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getMedicalListAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const saveMedicalClinic = createAsyncThunk('medical/saveMedicalClinic', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await saveMedicalClinicAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const viewMedicalClinic = createAsyncThunk('medical/viewMedicalClinic', async (clicnicId, { rejectWithValue }) => {
  try {
    const response = await viewMedicalClinicAPI(clicnicId);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});




const medicalSlice = createSlice({
  name: 'medical',
  initialState: {
    medicalList: {},
    currentPage : 1,
    perPage : 1,
    totalPages: 0,
    lastPage : 0,
    totalCount : 0,
    lastUpdate : '',
    status: 'success',
    error: null,
    medicalClinicDetails: [],
    message: null,
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchMedicalList.pending, handlePending)
      .addCase(fetchMedicalList.fulfilled, handleFetchMedicalList)
      .addCase(fetchMedicalList.rejected, handleRejected)
      .addCase(saveMedicalClinic.pending, handlePending)
      .addCase(saveMedicalClinic.fulfilled, handleSaveMedicalClinicFulfilled)
      .addCase(saveMedicalClinic.rejected, handleRejected)
      .addCase(viewMedicalClinic.pending, handlePending)
      .addCase(viewMedicalClinic.fulfilled, handleViewMedicalClinicFulfilled)
      .addCase(viewMedicalClinic.rejected, handleRejected)
  },
});


export default medicalSlice.reducer;
