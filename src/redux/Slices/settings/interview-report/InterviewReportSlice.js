import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';
import { handleInterviewListFulfilled } from './interviewReportExtraReducers';
import { getInterviewListAPI } from '../../../../services/interviewReport';

export const fetchInterviewList = createAsyncThunk('interviewReports/fetchInterviewList', async (payload, { rejectWithValue }) => {
  try {
    const response = await getInterviewListAPI(payload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

const initialState = {
  interviewList: [],
  currentPage: 1,
  totalPages: 1,
  totalInterviewReports: 0,
  perPage: 10,
  lastUpdated: null,
  status: 'idle',
  error: null,
  interviewFiltersData: {
    page: 1,
    limit: 10,
    search_text: '',
    branch_id: [],
    cs_id: [],
    interpreter_id: [],
    from_date: '',
    to_date: '',
    selected_date_range_type: 'auto',
  }
}

const interviewReportsSlice = createSlice({
  name: 'interviewReports',
  initialState,
  reducers: {
    setInterviewFilters: (state, action) => {
      state.interviewFiltersData = { ...state.interviewFiltersData, ...action.payload };
    },
    clearInterviewFilters: (state) => {
      state.interviewFiltersData = initialState.interviewFiltersData;
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
      .addCase(fetchInterviewList.pending, handlePending)
      .addCase(fetchInterviewList.fulfilled, handleInterviewListFulfilled)
      .addCase(fetchInterviewList.rejected, handleRejected)
  },
});

export const {
  setInterviewFilters,
  clearInterviewFilters,
  setCurrentPage,
  setPerPage
} = interviewReportsSlice.actions;

export default interviewReportsSlice.reducer;
