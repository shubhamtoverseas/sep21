import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { handleAddJobOfferFulfilled, handleAddSuggestWorkerFulfilled, handleCancelSuggestionFulfilled, handleChangedJobStatusFulfilled, handleExtendOfferFulfilled, handleFetchJobActivityFulfilled, handleFetchJobDetailFulfilled, handleFetchJobOffersFulfilled, handleFetchJobOWorkerListFulfilled, handleFindWorkerFulfilled, handleJobStatusFulfilled, handleUpdateJobStatusFulfilled, handleFetchDuplicateJobOffersFulfilled, handleWorkerJobEncriptedIDFulfilled } from './jobOfferExtraReducers';
import { handlePending, handleRejected } from '../common/extra-reducers/commonExtraReducers';
import { addNewJobOffer, addNewSuggestWorker, cancelSuggestedInterview, getJobActivityLogList, getJobDetail, getJobOffers, getJobStatus, getJobWorkerList, searchWorker, sendExtendOffer, updateJobOfferStatus, getDuplicateJobs, getWorkerJobEncriptedIDAPI } from '../../../services/jobOffers';


export const fetchJobOffers = createAsyncThunk('jobOffers/fetchJobOffers', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getJobOffers(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchJobWorkerList = createAsyncThunk('jobOffers/fetchJobWorkerList', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getJobWorkerList(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});


export const fetchJobStatus = createAsyncThunk('jobOffers/fetchJobStatus', async (jobId, { rejectWithValue }) => {
  try {
    const response = await getJobStatus(jobId);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchChangedJobStatus = createAsyncThunk('jobOffers/fetchChangedJobStatus', async (jobId, { rejectWithValue }) => {
  try {
    const response = await getJobStatus(jobId);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const changeJobOfferStatus = createAsyncThunk('jobOffers/changeJobOfferStatus', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await updateJobOfferStatus(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const addJobOffer = createAsyncThunk('jobOffers/addJobOffer', async (joData, { rejectWithValue }) => {
  try {
    const response = await addNewJobOffer(joData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchJobDetail = createAsyncThunk('jobOffers/fetchJobDetail', async (jobId, { rejectWithValue }) => {
  try {
    const response = await getJobDetail(jobId);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const cancelSuggestion = createAsyncThunk('jobOffers/cancelSuggestion', async (payload, { rejectWithValue }) => {
  try {
    const response = await cancelSuggestedInterview(payload);
    return response.data;   /* the envelope { status, message, data: [] } — callers toast on status / message (work order 27 Oct) */
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const extendOffer = createAsyncThunk('jobOffers/extendOffer', async (jobId, { rejectWithValue }) => {
  try {
    const response = await sendExtendOffer(jobId);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const findWorker = createAsyncThunk('jobOffers/findWorker', async (jobId, { rejectWithValue }) => {
  try {
    const response = await searchWorker(jobId);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const addSuggestWorker = createAsyncThunk('jobOffers/addSuggestWorker', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await addNewSuggestWorker(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchJobActivityLog = createAsyncThunk("jobOffers/fetchJobActivityLog", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getJobActivityLogList(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
}
);

export const fetchDuplicateJobs = createAsyncThunk('jobOffers/fetchDuplicateJobs', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getDuplicateJobs(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchWorkerJobEncriptedID = createAsyncThunk('jobOffers/fetchWorkerJobEncriptedID', async (payload, { rejectWithValue }) => {
  try {
    const response = await getWorkerJobEncriptedIDAPI(payload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

const jobOffersSlice = createSlice({
  name: 'jobOffers',
  initialState: {
    activityLogList: [],
    jobOffers: [],
    jobofferWorkerList: [],
    jobStatus: [],
    changedJOStatus: [],
    status: 'success',
    error: null,
    jobDetailView: null,
    currentPage: 1,
    perPage: 10,
    totalPages: 0,
    totalJobOffers: 0,
    statusCounts: null,
    lastUpdated: '',
    jobWorkerCurrentPage: 1,
    jobWorkerPerPage: 10,
    jobWorkerTotalPages: 0,
    totalJobWorkers: 0,
    jobWorkerLastUpdated: null,
    filters: {},
    duplicateJobs: [],
  },
  reducers: {
    clearMessage(state) {
      state.message = null;
    },
    setFilters(state, action) {
      state.filters = action.payload;
    },
    resetFilters(state) {
      state.filters = { limit: 10, page: 1 };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobOffers.pending, handlePending)
      .addCase(fetchJobOffers.fulfilled, handleFetchJobOffersFulfilled)
      .addCase(fetchJobOffers.rejected, handleRejected)

      .addCase(fetchDuplicateJobs.pending, handlePending)
      .addCase(fetchDuplicateJobs.fulfilled, handleFetchDuplicateJobOffersFulfilled)
      .addCase(fetchDuplicateJobs.rejected, handleRejected)

      .addCase(fetchWorkerJobEncriptedID.pending, handlePending)
      .addCase(fetchWorkerJobEncriptedID.fulfilled, handleWorkerJobEncriptedIDFulfilled)
      .addCase(fetchWorkerJobEncriptedID.rejected, handleRejected)

      .addCase(fetchJobWorkerList.pending, handlePending)
      .addCase(fetchJobWorkerList.fulfilled, handleFetchJobOWorkerListFulfilled)
      .addCase(fetchJobWorkerList.rejected, handleRejected)
      .addCase(fetchJobStatus.fulfilled, handleJobStatusFulfilled)
      .addCase(fetchChangedJobStatus.fulfilled, handleChangedJobStatusFulfilled)
      .addCase(changeJobOfferStatus.pending, handlePending)
      .addCase(changeJobOfferStatus.fulfilled, handleUpdateJobStatusFulfilled)
      .addCase(changeJobOfferStatus.rejected, handleRejected)
      .addCase(addJobOffer.pending, handlePending)
      .addCase(addJobOffer.fulfilled, handleAddJobOfferFulfilled)
      .addCase(addJobOffer.rejected, handleRejected)
      .addCase(fetchJobDetail.pending, handlePending)
      .addCase(fetchJobDetail.fulfilled, handleFetchJobDetailFulfilled)
      .addCase(fetchJobDetail.rejected, handleRejected)
      .addCase(cancelSuggestion.pending, handlePending)
      .addCase(cancelSuggestion.fulfilled, handleCancelSuggestionFulfilled)
      .addCase(cancelSuggestion.rejected, handleRejected)
      .addCase(extendOffer.pending, handlePending)
      .addCase(extendOffer.fulfilled, handleExtendOfferFulfilled)
      .addCase(extendOffer.rejected, handleRejected)
      .addCase(addSuggestWorker.pending, handlePending)
      .addCase(addSuggestWorker.fulfilled, handleAddSuggestWorkerFulfilled)
      .addCase(addSuggestWorker.rejected, handleRejected)
      .addCase(findWorker.pending, handlePending)
      .addCase(findWorker.fulfilled, handleFindWorkerFulfilled)
      .addCase(findWorker.rejected, handleRejected)
      .addCase(fetchJobActivityLog.pending, handlePending)
      .addCase(fetchJobActivityLog.fulfilled, handleFetchJobActivityFulfilled)
      .addCase(fetchJobActivityLog.rejected, handleRejected)
  },
});

export const { clearMessage, setFilters, resetFilters } = jobOffersSlice.actions;
export default jobOffersSlice.reducer;
