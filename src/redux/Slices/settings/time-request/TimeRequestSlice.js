import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  addNewTimeRequest,
  getTimeRequestById,
  getTimeRequests,
  updateTimeRequestById,
  getReportTimeRequestHistory,
  getManagerApprovedTimeRequest,
  addNewManagerApprovedTimeRequest,
  deleteManagerApprovedTimeRequestById,
  getManagerApprovedTimeRequestById,
  withdrawTimeRequestById,
  getReporteesTimeRequests,
  updateReporteesTimeRequestActionById,
  getReportTimeEntry,
} from '../../../../services/timeRequests';
import {
  handleAddTimeRequestFulfilled,
  handleFetchTimeRequestByIdFulfilled,
  handleFetchTimeRequestsFulfilled,
  handleUpdateTimeRequestFulfilled,
  handleFetchReportTimeRequestHistoryFulfilled,
  handleFetchManagerApprovedTimeRequestFulfilled,
  handleAddManagerApprovedTimeRequestFulfilled,
  handleFetchManagerApprovedTimeRequestByIdFulfilled,
  handleWithdrawTimeRequestFulfilled,
  handleFetchReporteesTimeRequestsFulfilled,
  handleUpdateReporteesTimeRequestActionFulfilled,
  handleFetchReportTimeEntryFulfilled,
} from './timeRequestsExtraReducers';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';

export const fetchTimeRequests = createAsyncThunk('timeRequests/fetchTimeRequests', async (params, { rejectWithValue }) => {
  try {
    const response = await getTimeRequests(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const addTimeRequest = createAsyncThunk('timeRequests/addTimeRequest', async (timeRequestData, { rejectWithValue }) => {
  try {
    const response = await addNewTimeRequest(timeRequestData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchTimeRequestById = createAsyncThunk('timeRequests/fetchTimeRequestById', async (id, { rejectWithValue }) => {
  try {
    const response = await getTimeRequestById(id);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateTimeRequest = createAsyncThunk('timeRequests/updateTimeRequest', async (timeRequestData, { rejectWithValue }) => {
  try {
    const response = await updateTimeRequestById(timeRequestData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchManagerApprovedTimeRequest = createAsyncThunk('timeRequests/fetchManagerApprovedTimeRequest', async (params, { rejectWithValue }) => {
  try {
    const response = await getManagerApprovedTimeRequest(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchManagerApprovedTimeRequestById = createAsyncThunk('timeRequests/fetchManagerApprovedTimeRequestById', async (id, { rejectWithValue }) => {
  try {
    const response = await getManagerApprovedTimeRequestById(id);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const addManagerApprovedTimeRequest = createAsyncThunk('timeRequests/addManagerApprovedTimeRequest', async (timeRequestData, { rejectWithValue }) => {
  try {
    const response = await addNewManagerApprovedTimeRequest(timeRequestData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const deleteManagerApprovedTimeRequest = createAsyncThunk('timeRequests/deleteManagerApprovedTimeRequest', async (roleId, { rejectWithValue }) => {
  try {
    const response = await deleteManagerApprovedTimeRequestById(roleId);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchReportTimeRequestHistory = createAsyncThunk('timeRequests/fetchReportTimeRequestHistory', async (params, { rejectWithValue }) => {
  try {
    const response = await getReportTimeRequestHistory(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});


export const withdrawTimeRequest = createAsyncThunk('timeRequests/withdrawTimeRequest', async (params, { rejectWithValue }) => {
  try {
    const response = await withdrawTimeRequestById(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchReporteesTimeRequests = createAsyncThunk('timeRequests/fetchReporteesTimeRequests', async (params, { rejectWithValue }) => {
  try {
    const response = await getReporteesTimeRequests(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateReporteesTimeRequestAction = createAsyncThunk('timeRequests/updateReporteesTimeRequestAction', async (params, { rejectWithValue }) => {
  try {
    const response = await updateReporteesTimeRequestActionById(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchReportTimeEntry = createAsyncThunk('timeRequests/fetchReportTimeEntry', async (params, { rejectWithValue }) => {
  try {
    const response = await getReportTimeEntry(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

const timeRequestsSlice = createSlice({
  name: 'timeRequests',
  initialState: {
    timeRequests: [],
    timeRequestsOrder: [],
    status: 'idle',
    error: null,
    currentTimeRequest: null,
    currentPage: 1,
    perPage: 10,
    totalPages: 0,
    totalTimeRequests: 0,
    lastUpdated: '',
    message: null,
    managerApprovedTimeRequest: [],
    managerApprovedTimeRequestOrder: [],
    managerApprovedTimeRequestStatus: 'idle',
    managerApprovedTimeRequestError: null,
    managerApprovedTimeRequestCurrentPage: 1,
    managerApprovedTimeRequestPerPage: 10,
    managerApprovedTimeRequestTotalPage: 0,
    managerApprovedTimeRequestTotal: 0,
    managerApprovedTimeRequestLastUpdated: '',
    managerApprovedTimeRequestMessage: null,
    reportTimeRequestHistory: [],
    reportTimeRequestHistoryOrder: [],
    reportTimeRequestHistoryStatus: 'idle',
    reportTimeRequestHistoryCurrentPage: 1,
    reportTimeRequestHistoryPerPage: 10,
    reportTimeRequestHistoryTotalPage: 0,
    reportTimeRequestHistoryTotal: 0,
    reportTimeRequestHistoryLastUpdated: '',
    reportTimeEntry: [],
    reportTimeEntryStatus: 'idle',
    reportTimeEntryCurrentPage: 1,
    reportTimeEntryPerPage: 10,
    reportTimeEntryTotalPage: 0,
    reportTimeEntryTotal: 0,
    reportTimeEntryLastUpdated: '',
    reporteesTimeRequest: [],
    reporteesTimeRequestOrder: [],
    reporteesTimeRequestStatus: 'idle',
    reporteesTimeRequestError: null,
    reporteesTimeRequestCurrentPage: 1,
    reporteesTimeRequestPerPage: 10,
    reporteesTimeRequestTotalPage: 0,
    reporteesTimeRequestTotal: 0,
    reporteesTimeRequestLastUpdated: null,
    reporteesTimeRequestMessage: null,
  },
  reducers: {
    setTimeRequestLoading(state) {
      state.status = 'loading';
    },
    clearTimeRequestLoading(state) {
      state.status = 'succeeded';
    },
    clearMessage(state) {
      state.message = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTimeRequests.pending, handlePending)
      .addCase(fetchTimeRequests.fulfilled, handleFetchTimeRequestsFulfilled)
      .addCase(fetchTimeRequests.rejected, handleRejected)
      .addCase(addTimeRequest.pending, handlePending)
      .addCase(addTimeRequest.fulfilled, handleAddTimeRequestFulfilled)
      .addCase(addTimeRequest.rejected, handleRejected)
      .addCase(fetchTimeRequestById.pending, handlePending)
      .addCase(fetchTimeRequestById.fulfilled, handleFetchTimeRequestByIdFulfilled)
      .addCase(fetchTimeRequestById.rejected, handleRejected)
      .addCase(updateTimeRequest.pending, handlePending)
      .addCase(updateTimeRequest.fulfilled, handleUpdateTimeRequestFulfilled)
      .addCase(updateTimeRequest.rejected, handleRejected)
      .addCase(fetchReportTimeRequestHistory.pending, handlePending)
      .addCase(fetchReportTimeRequestHistory.fulfilled, handleFetchReportTimeRequestHistoryFulfilled)
      .addCase(fetchReportTimeRequestHistory.rejected, handleRejected)
      .addCase(fetchManagerApprovedTimeRequest.pending, handlePending)
      .addCase(fetchManagerApprovedTimeRequest.fulfilled, handleFetchManagerApprovedTimeRequestFulfilled)
      .addCase(fetchManagerApprovedTimeRequest.rejected, handleRejected)
      .addCase(addManagerApprovedTimeRequest.pending, handlePending)
      .addCase(addManagerApprovedTimeRequest.fulfilled, handleAddManagerApprovedTimeRequestFulfilled)
      .addCase(addManagerApprovedTimeRequest.rejected, handleRejected)
      .addCase(fetchManagerApprovedTimeRequestById.pending, handlePending)
      .addCase(fetchManagerApprovedTimeRequestById.fulfilled, handleFetchManagerApprovedTimeRequestByIdFulfilled)
      .addCase(fetchManagerApprovedTimeRequestById.rejected, handleRejected)
      .addCase(withdrawTimeRequest.pending, handlePending)
      .addCase(withdrawTimeRequest.fulfilled, handleWithdrawTimeRequestFulfilled)
      .addCase(withdrawTimeRequest.rejected, handleRejected)
      .addCase(fetchReporteesTimeRequests.pending, handlePending)
      .addCase(fetchReporteesTimeRequests.fulfilled, handleFetchReporteesTimeRequestsFulfilled)
      .addCase(fetchReporteesTimeRequests.rejected, handleRejected)
      .addCase(updateReporteesTimeRequestAction.pending, handlePending)
      .addCase(updateReporteesTimeRequestAction.fulfilled, handleUpdateReporteesTimeRequestActionFulfilled)
      .addCase(updateReporteesTimeRequestAction.rejected, handleRejected)
      .addCase(fetchReportTimeEntry.pending, handlePending)
      .addCase(fetchReportTimeEntry.fulfilled, handleFetchReportTimeEntryFulfilled)
      .addCase(fetchReportTimeEntry.rejected, handleRejected)
      ;
  },
});

export const { clearMessage, setTimeRequestLoading, clearTimeRequestLoading } = timeRequestsSlice.actions;

export default timeRequestsSlice.reducer;
