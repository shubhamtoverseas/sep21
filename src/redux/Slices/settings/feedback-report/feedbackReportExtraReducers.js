const handleFeedbackListFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.feedbackList = action.payload?.data?.data ?? state.feedbackList;
  state.feedbackReportsOrder = (action.payload?.data?.data ?? []).map(feedbackReport => feedbackReport.id);
  state.currentPage = action.payload?.data?.current_page ?? state.currentPage;
  state.perPage = action.payload?.data?.limit ?? state.perPage;
  state.totalPages = action.payload?.data?.total_pages ?? state.totalPages;
  state.totalFeedbackReports = action.payload?.data?.total_feedback_list_count ?? state.totalFeedbackReports;
  state.lastUpdated = action.payload?.data?.last_updated ?? state.lastUpdated;
  state.message = action.payload?.message ?? state.message;
};

export {
  handleFeedbackListFulfilled
};
