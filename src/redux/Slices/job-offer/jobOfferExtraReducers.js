const handleFetchJobOffersFulfilled = (state, action) => {
  state.status = 'succeeded';

  // Extract payload data safely
  const payloadData = action?.payload?.data;
  const jobData = payloadData?.data?.data || [];
  const paginationInfo = payloadData?.data || {};

  // status card counts for the current filters, status filter ignored (backend D-01)
  state.statusCounts = payloadData?.status_counts ?? paginationInfo?.status_counts ?? null;

  if (jobData.length > 0) {
    state.jobOffers = jobData;
    state.currentPage = paginationInfo.current_page || 1;
    state.perPage = paginationInfo.per_page || 10;
    state.totalPages = paginationInfo.last_page || 0;
    state.totalJobOffers = paginationInfo.total || 0;
    state.lastUpdated = payloadData.last_update || null;
    state.message = paginationInfo.message || '';
  } else {
    state.jobOffers = [];
    state.currentPage = 1;
    state.perPage = 10;
    state.totalPages = 0;
    state.totalJobOffers = 0;
    state.lastUpdated = payloadData?.last_update || state.lastUpdated;
    state.message = 'No job offers found';
  }
};

const handleFetchDuplicateJobOffersFulfilled = (state, action) => {
  state.status = 'succeeded';

  // Extract payload data safely
  // const payloadData = action?.payload?.data;
  const jobData = action?.payload?.data?.data || [];
  // const paginationInfo = payloadData?.data || {};
  if (jobData.length > 0) {
    state.duplicateJobs = jobData;
    state.currentPage = action?.payload?.data.current_page || 1;
    state.perPage = action?.payload?.data.per_page || 10;
    state.totalPages = action?.payload?.data.last_page || 0;
    state.totalJobOffers = action?.payload?.data.total || 0;
    state.lastUpdated = action?.payload?.data.last_update || null;
    state.message = action?.payload?.data.message || '';
  } else {
    state.duplicateJobs = [];
    state.currentPage = 1;
    state.perPage = 10;
    state.totalPages = 0;
    state.totalJobOffers = 0;
    state.lastUpdated = action?.payload?.data?.last_update || state.lastUpdated;
    state.message = 'No job offers found';
  }
};


const handleFetchJobOWorkerListFulfilled = (state, action) => {
  state.status = 'succeeded';
  const payloadData = action?.payload?.data;
  const jobWorkerData = payloadData?.data?.data || [];
  const paginationInfo = payloadData?.data || {};
  if (jobWorkerData.length > 0) {
    state.jobofferWorkerList = jobWorkerData;
    state.jobWorkerCurrentPage = paginationInfo.current_page || 1;
    state.jobWorkerPerPage = paginationInfo.per_page || 10;
    state.jobWorkerTotalPages = paginationInfo.last_page || 0;
    state.totalJobWorkers = paginationInfo.total || 0;
    state.jobWorkerLastUpdated = payloadData.last_updated || null;
  } else {
    state.jobofferWorkerList = [];
    state.jobWorkerCurrentPage = 1;
    state.jobWorkerPerPage = 10;
    state.jobWorkerTotalPages = 0;
    state.totalJobWorkers = 0;
    state.jobWorkerLastUpdated = null;
  }
}

const handleWorkerJobEncriptedIDFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};

const handleJobStatusFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.jobStatus = action.payload?.data ?? state.jobStatus;
};
const handleChangedJobStatusFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.changedJOStatus = action.payload?.data ?? state.changedJOStatus;
};
const handleUpdateJobStatusFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.jobOffers = state.jobOffers.map((jo) =>
    jo.id === action.payload?.data?.id
      ? { ...jo, status: action.payload?.data?.status }
      : jo
  );
  state.message = action.payload?.message ?? state.message;
}
const handleAddJobOfferFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
}
const handleFetchJobDetailFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.jobDetailView = action.payload?.data ?? state.jobDetailView;
  state.message = action.payload?.message ?? state.message;
}
const handleCancelSuggestionFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
}
const handleExtendOfferFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
}
const handleAddSuggestWorkerFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
}
/* the Suggest modal reads the `/find-worker` page from the thunk result (useJobOfferSuggest); the slice keeps only status */
const handleFindWorkerFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message;
}
const handleFetchJobActivityFulfilled = (state, action) => {
  state.status = "succeeded";
  state.activityLogList = action.payload?.data ?? state.activityLogList;
};

export {
  handleFetchJobOffersFulfilled,
  handleFetchJobOWorkerListFulfilled,
  handleJobStatusFulfilled,
  handleChangedJobStatusFulfilled,
  handleUpdateJobStatusFulfilled,
  handleAddJobOfferFulfilled,
  handleFetchJobDetailFulfilled,
  handleCancelSuggestionFulfilled,
  handleExtendOfferFulfilled,
  handleAddSuggestWorkerFulfilled,
  handleFindWorkerFulfilled,
  handleFetchJobActivityFulfilled,
  handleFetchDuplicateJobOffersFulfilled,
  handleWorkerJobEncriptedIDFulfilled
};