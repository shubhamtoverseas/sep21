import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handleAddHolidayFulfilled, handleFetchHolidayByIdFulfilled, handleFetchHolidayListByStatusFulfilled, handleFetchHolidaysFulfilled, handleFetchOfficialHolidaysFulfilled, handleUpdateHolidayFulfilled } from './holidaysExtraReducers';
import { addNewHoliday, getHolidayById, getHolidays, getHolidaysByStatusAPI, getOfficialHolidaysAPI, updateHolidayById } from '../../../../services/holidays';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';

export const fetchHolidaysByStatus = createAsyncThunk('holidays/fetchHolidaysByStatus', async (params, { rejectWithValue }) => {
  try {
    const response = await getHolidaysByStatusAPI(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchOfficialHolidays = createAsyncThunk('holidays/fetchOfficialHolidays', async (params, { rejectWithValue }) => {
  try {
    const response = await getOfficialHolidaysAPI(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchHolidays = createAsyncThunk('holidays/fetchHolidays', async (params, { rejectWithValue }) => {
  try {
    const response = await getHolidays(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const addHoliday = createAsyncThunk('holidays/addHoliday', async (params, { rejectWithValue }) => {
  try {
    const response = await addNewHoliday(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchHolidayById = createAsyncThunk('holidays/fetchHolidayById', async (id, { rejectWithValue }) => {
  try {
    const response = await getHolidayById(id);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateHoliday = createAsyncThunk('holidays/updateHoliday', async (params, { rejectWithValue }) => {
  try {
    const response = await updateHolidayById(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});


const holidaysSlice = createSlice({
  name: 'holidays',
  initialState: {
    holidays: [],
    officialHolidays: [],
    holidayListByStatus: [],
    status: 'idle',
    error: null,
    currentHoliday: null,
    message: null,
    currentPage: 1,
    perPage: 10,
    totalPages: 0,
    totalHolidays: 0,
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
      .addCase(fetchHolidays.pending, handlePending)
      .addCase(fetchHolidays.fulfilled, handleFetchHolidaysFulfilled)
      .addCase(fetchHolidays.rejected, handleRejected)
      .addCase(fetchHolidaysByStatus.pending, handlePending)
      .addCase(fetchHolidaysByStatus.fulfilled, handleFetchHolidayListByStatusFulfilled)
      .addCase(fetchHolidaysByStatus.rejected, handleRejected)
      .addCase(fetchOfficialHolidays.pending, handlePending)
      .addCase(fetchOfficialHolidays.fulfilled, handleFetchOfficialHolidaysFulfilled)
      .addCase(fetchOfficialHolidays.rejected, handleRejected)
      .addCase(addHoliday.pending, handlePending)
      .addCase(addHoliday.fulfilled, handleAddHolidayFulfilled)
      .addCase(addHoliday.rejected, handleRejected)
      .addCase(fetchHolidayById.pending, handlePending)
      .addCase(fetchHolidayById.fulfilled, handleFetchHolidayByIdFulfilled)
      .addCase(fetchHolidayById.rejected, handleRejected)
      .addCase(updateHoliday.pending, handlePending)
      .addCase(updateHoliday.fulfilled, handleUpdateHolidayFulfilled)
      .addCase(updateHoliday.rejected, handleRejected);
  },
});

export const { clearMessage } = holidaysSlice.actions;
export default holidaysSlice.reducer;
