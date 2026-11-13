import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';
import { handleFeedbackListFulfilled } from './feedbackReportExtraReducers';
import { getFeedbackListAPI } from '../../../../services/feedbackReport';

export const fetchFeedbackList = createAsyncThunk('feedbackReports/fetchFeedbackList', async (params, { rejectWithValue }) => {
  try {
    const response = await getFeedbackListAPI(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

const initialState = {
  feedbackList: [],
  currentPage: 1,
  totalPages: 1,
  totalFeedbackReports: 0,
  perPage: 10,
  lastUpdated: null,
  status: 'idle',
  error: null,
  feedbackFiltersData: {
    feedback_type: [],
    created_by_type: [],
    rating: [],
    start_date: null,
    end_date: null,
    selected_date_range_type: 'auto'
  }
}

const feedbackReportsSlice = createSlice({
  name: 'feedbackReports',
  initialState,
  reducers: {
    setFeedbackFilters: (state, action) => {
      state.feedbackFiltersData = { ...state.feedbackFiltersData, ...action.payload };
    },
    clearFeedbackFilters: (state) => {
      state.feedbackFiltersData = initialState.feedbackFiltersData;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setPerPage: (state, action) => {
      state.perPage = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeedbackList.pending, handlePending)
      .addCase(fetchFeedbackList.fulfilled, handleFeedbackListFulfilled)
      .addCase(fetchFeedbackList.rejected, handleRejected)
  },
});

export const {
  setFeedbackFilters,
  clearFeedbackFilters,
  setCurrentPage,
  setPerPage
} = feedbackReportsSlice.actions;

export default feedbackReportsSlice.reducer;
