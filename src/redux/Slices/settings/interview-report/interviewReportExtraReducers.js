const handleInterviewListFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.interviewList = action.payload?.data?.data ?? state.interviewList;
  state.interviewReportsOrder = (action.payload?.data?.data ?? []).map(interviewReport => interviewReport.id);
  state.currentPage = action.payload?.data?.current_page ?? state.currentPage;
  state.perPage = action.payload?.data?.limit ?? state.perPage;
  state.totalPages = action.payload?.data?.last_page ?? state.totalPages;
  state.totalInterviewReports = action.payload?.data?.total ?? state.totalInterviewReports;
  state.lastUpdated = action.payload?.data?.last_updated ?? state.lastUpdated;
  state.message = action.payload?.message ?? state.message;
};

export {
  handleInterviewListFulfilled
};
