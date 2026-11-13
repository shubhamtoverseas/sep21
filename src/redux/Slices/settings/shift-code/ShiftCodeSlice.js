import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getShiftCodes,
  addNewShiftCode,
  updateShiftCodeById,
  uploadShiftCode,
  shiftCodeRosterView
} from '../../../../services/shiftCodes';
import {
  handleAddShiftCodeFulfilled,
  handleFetchShiftCodesFulfilled,
  handleRosterViewFulfilled,
  handleUpdateShiftCodeFulfilled,
  handlePending,
  handleRejected,
  handleImportShiftCodeFulfilled
} from './shiftCodeExtraReducers';

/* bug log #28 (fixed 2026-10-18): list / by-id / update reject with the API body like the other thunks here */
export const fetchShiftCodes = createAsyncThunk('shiftCodes/fetchShiftCodes', async (params, { rejectWithValue }) => {
  try {
    const response = await getShiftCodes(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message,
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchRosterView = createAsyncThunk('shiftCodes/fetchRosterView', async (shiftCodeData, { rejectWithValue }) => {
  try {
    const response = await shiftCodeRosterView(shiftCodeData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const addShiftCode = createAsyncThunk('shiftCodes/addShiftCode', async (shiftCodeData, { rejectWithValue }) => {
  try {
    const response = await addNewShiftCode(shiftCodeData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateShiftCode = createAsyncThunk('shiftCodes/updateShiftCode', async (shiftCodeData, { rejectWithValue }) => {
  try {
    const response = await updateShiftCodeById(shiftCodeData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message,
      data: error.response || 'An error occurred',
    });
  }
});

export const importShiftCode = createAsyncThunk('shiftCodes/importShiftCode', async (shiftCodeFormData, { rejectWithValue }) => {
  try {
    const response = await uploadShiftCode(shiftCodeFormData);
    const usersCount = response.headers['x-users-count'];
    const daysCount = response.headers['x-days-count'];

    return {
      data: response.data,
      headers: {
        users_count: usersCount,
        days_count: daysCount
      }
    };
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

const shiftCodesSlice = createSlice({
  name: 'shiftCodes',
  initialState: {
    shiftCodes: [],
    rosterViewData: [],
    rosterViewCurrentPage: 1,
    rosterViewPerPage: 10,
    rosterViewTotalPages: 0,
    rosterViewTotalShiftCodes: 0,
    rosterViewLastUpdated: '', 
    shiftCodesOrder: [],
    shiftCodeFeedbackData: null,
    shiftCodeFeedbackHeaders: {},
    shiftCodeStatus: 'idle',
    error: null,
    currentShiftCode: null,
    currentPage: 1,
    perPage: 10,
    totalPages: 0,
    totalShiftCodes: 0,
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
      .addCase(fetchShiftCodes.pending, handlePending)
      .addCase(fetchShiftCodes.fulfilled, handleFetchShiftCodesFulfilled)
      .addCase(fetchShiftCodes.rejected, handleRejected)
      .addCase(fetchRosterView.pending, handlePending)
      .addCase(fetchRosterView.fulfilled, handleRosterViewFulfilled)
      .addCase(fetchRosterView.rejected, handleRejected)
      .addCase(addShiftCode.pending, handlePending)
      .addCase(addShiftCode.fulfilled, handleAddShiftCodeFulfilled)
      .addCase(addShiftCode.rejected, handleRejected)
      .addCase(updateShiftCode.pending, handlePending)
      .addCase(updateShiftCode.fulfilled, handleUpdateShiftCodeFulfilled)
      .addCase(updateShiftCode.rejected, handleRejected)
      .addCase(importShiftCode.pending, handlePending)
      .addCase(importShiftCode.fulfilled, handleImportShiftCodeFulfilled)
      .addCase(importShiftCode.rejected, handleRejected);
  },
});

export const { clearMessage } = shiftCodesSlice.actions;

export default shiftCodesSlice.reducer;
