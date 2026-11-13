import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createCalendarTaskFulfilled, handleFetchcalendarFulfilled, viewalendarTaskFulfilled } from './calendarExtraReducers';
import { createCalendarTaskAPI, getCalendar, viewalendarTaskAPI } from '../../../services/calendar';
import { handlePending, handleRejected } from '../common/extra-reducers/commonExtraReducers';

export const fetchCalendar = createAsyncThunk('calendar/fetchCalendar', async (params, { rejectWithValue }) => {
    try {
        const response = await getCalendar(params);
        return response.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});
export const createCalendarTask = createAsyncThunk('calendar/createCalendarTask', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await createCalendarTaskAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const viewalendarTask = createAsyncThunk('calendar/viewalendarTask', async (taskId, { rejectWithValue }) => {
  try {
    const response = await viewalendarTaskAPI(taskId);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});
const calendarSlice = createSlice({
  name: 'calendar',
  initialState: {
    calendarList: [],
    status: 'idle',
    error: null,
    message: null,
    taskDetail: {},
  },
  reducers: {
    clearMessage(state) {
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCalendar.pending, handlePending)
      .addCase(fetchCalendar.fulfilled, handleFetchcalendarFulfilled)
      .addCase(fetchCalendar.rejected, handleRejected)
      .addCase(createCalendarTask.pending, handlePending)
      .addCase(createCalendarTask.fulfilled, createCalendarTaskFulfilled)
      .addCase(createCalendarTask.rejected, handleRejected)
      .addCase(viewalendarTask.pending, handlePending)
      .addCase(viewalendarTask.fulfilled, viewalendarTaskFulfilled)
      .addCase(viewalendarTask.rejected, handleRejected)
  },
});

export const { clearMessage } = calendarSlice.actions;
export default calendarSlice.reducer;
