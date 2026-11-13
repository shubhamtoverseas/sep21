import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handlePending, handleRejected } from '../extra-reducers/commonExtraReducers';
import { handleCancelInterviewFulfilled, handleCancelInviteFulfilled, handleCreateInstantInterviewFulfilled, handlefetchInterviewStatusFulfilled, handleInterviewDateSlotsFulfilled, handleInterviewTimeSlotsFulfilled, handleManageInterviewStatusFulfilled, handleMarkInterviewCompletedFulfilled, handleRescheduleInterviewFulfilled, handleScheduleInterviewFulfilled, handleUnArchiveJobStageFulfilled, handleUpdateInstantInterviewStatusFulfilled } from './interviewExtraReducers';
import { cancelInterviewAPI, cancelInviteAPI, confirmScheduledInterview, fetchNewInterviewDetails, generateInstantInterview, getInterviewDateSlots, getInterviewTimeSlots, getUpcomingInterviews, changeJobStageStatusAPI, manageInterviewStatusAPI, markInterviewCompleted, reformInstantInterviewStatus, reScheduleInterviewAPI, unArchiveJobStageAPI } from '../../../../services/interview';

export const scheduleInterview = createAsyncThunk('interviews/scheduleInterview', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await confirmScheduledInterview(reqPayload);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});
export const reScheduleInterview = createAsyncThunk('interviews/reScheduleInterview', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await reScheduleInterviewAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});
export const createInstantInterview = createAsyncThunk('interviews/createInstantInterview', async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await generateInstantInterview(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  });

  export const updateInstantInterviewStatus = createAsyncThunk('interviews/updateInstantInterviewStatus', async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await reformInstantInterviewStatus(reqPayload);
      return response.data.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  });

  export const fetchInterviewDetails = createAsyncThunk('interviews/fetchInterviewDetails', async (interviewId, { rejectWithValue }) => {
    try {
      const response = await fetchNewInterviewDetails(interviewId);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  });

  export const fetchUpcomingInterviews = createAsyncThunk('interviews/fetchUpcomingInterviews', async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getUpcomingInterviews(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  });

  export const fetchInterviewTimeSlots = createAsyncThunk('interviews/fetchInterviewTimeSlots', async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getInterviewTimeSlots(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  });

   export const fetchInterviewDateSlots = createAsyncThunk('interviews/fetchInterviewDateSlots', async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getInterviewDateSlots(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  });

  export const interviewCompleted = createAsyncThunk('interviews/interviewCompleted', async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await markInterviewCompleted(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  });

  export const cancelInterview = createAsyncThunk('interviews/cancelInterview', async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await cancelInterviewAPI(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  });

  export const changeJobStageStatus = createAsyncThunk('interviews/changeJobStageStatus', async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await changeJobStageStatusAPI(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  });

  export const manageInterviewStatus = createAsyncThunk('interviews/manageInterviewStatus', async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await manageInterviewStatusAPI(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  });

  export const cancelInvite = createAsyncThunk('interviews/cancelInvite', async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await cancelInviteAPI(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  });

  export const unArchiveJobStage = createAsyncThunk('interviews/unArchiveJobStage', async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await unArchiveJobStageAPI(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  });

const interviewSlice = createSlice({
    name: 'interviews',
    initialState: {
        status: 'idle',
        interviewData: {},
        interviewDetail: {},
        interviewToBeCompleted: [],
        interviewTimeSlots: [],
        interviewDateSlots: [],
        error: null
    },
    extraReducers: (builder) => {
        builder
            .addCase(scheduleInterview.pending, handlePending)
            .addCase(scheduleInterview.fulfilled, handleScheduleInterviewFulfilled)
            .addCase(scheduleInterview.rejected, handleRejected)
            .addCase(reScheduleInterview.pending, handlePending)
            .addCase(reScheduleInterview.fulfilled, handleRescheduleInterviewFulfilled)
            .addCase(reScheduleInterview.rejected, handleRejected)
            .addCase(createInstantInterview.pending, handlePending)
            .addCase(createInstantInterview.fulfilled, handleCreateInstantInterviewFulfilled)
            .addCase(createInstantInterview.rejected, handleRejected)
            .addCase(updateInstantInterviewStatus.pending, handlePending)
            .addCase(updateInstantInterviewStatus.fulfilled, handleUpdateInstantInterviewStatusFulfilled)
            .addCase(updateInstantInterviewStatus.rejected, handleRejected)
            .addCase(fetchInterviewDetails.pending, handlePending)
            .addCase(fetchInterviewDetails.fulfilled, handlefetchInterviewStatusFulfilled)
            .addCase(fetchInterviewDetails.rejected, handleRejected)
            .addCase(interviewCompleted.pending, handlePending)
            .addCase(interviewCompleted.fulfilled, handleMarkInterviewCompletedFulfilled)
            .addCase(interviewCompleted.rejected, handleRejected)
            .addCase(fetchInterviewTimeSlots.pending, handlePending)
            .addCase(fetchInterviewTimeSlots.fulfilled, handleInterviewTimeSlotsFulfilled)
            .addCase(fetchInterviewTimeSlots.rejected, handleRejected)
            .addCase(fetchInterviewDateSlots.pending, handlePending)
            .addCase(fetchInterviewDateSlots.fulfilled, handleInterviewDateSlotsFulfilled)
            .addCase(fetchInterviewDateSlots.rejected, handleRejected)
            .addCase(cancelInterview.pending, handlePending)
            .addCase(cancelInterview.fulfilled, handleCancelInterviewFulfilled)
            .addCase(cancelInterview.rejected, handleRejected)
            .addCase(manageInterviewStatus.pending, handlePending)
            .addCase(manageInterviewStatus.fulfilled, handleManageInterviewStatusFulfilled)
            .addCase(manageInterviewStatus.rejected, handleRejected)
            .addCase(cancelInvite.pending, handlePending)
            .addCase(cancelInvite.fulfilled, handleCancelInviteFulfilled)
            .addCase(cancelInvite.rejected, handleRejected)
            .addCase(unArchiveJobStage.pending, handlePending)
            .addCase(unArchiveJobStage.fulfilled, handleUnArchiveJobStageFulfilled)
            .addCase(unArchiveJobStage.rejected, handleRejected)
          }
});

export default interviewSlice.reducer;
