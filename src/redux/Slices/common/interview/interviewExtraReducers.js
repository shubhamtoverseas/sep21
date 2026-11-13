const handleScheduleInterviewFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};
const handleRescheduleInterviewFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};
const handleCreateInstantInterviewFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
  state.interviewData= action.payload?.data;
};
const handleUpdateInstantInterviewStatusFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};
const handlefetchInterviewStatusFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
  state.interviewDetail = action.payload?.data ?? state.interviewDetail;
};
const handleMarkInterviewCompletedFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};

const handleInterviewTimeSlotsFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
  state.interviewTimeSlots = action.payload?.data ?? state.interviewTimeSlots;
};

const handleInterviewDateSlotsFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
  state.interviewDateSlots = action.payload?.data ?? state.interviewDateSlots;
}

const handleCancelInterviewFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};

const handleManageInterviewStatusFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};

const handleCancelInviteFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};

const handleUnArchiveJobStageFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};

export {
  handleScheduleInterviewFulfilled,
  handleCreateInstantInterviewFulfilled,
  handleUpdateInstantInterviewStatusFulfilled,
  handlefetchInterviewStatusFulfilled,
  handleMarkInterviewCompletedFulfilled,
  handleInterviewTimeSlotsFulfilled,
  handleInterviewDateSlotsFulfilled,
  handleCancelInterviewFulfilled,
  handleManageInterviewStatusFulfilled,
  handleCancelInviteFulfilled,
  handleRescheduleInterviewFulfilled,
  handleUnArchiveJobStageFulfilled
};
