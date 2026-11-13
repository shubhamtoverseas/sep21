const handleWorkerRoleFulfilled = (state, action) => {
  state.status = "succeeded";
  state.workerRoles = action.payload?.data ?? state.workerRoles;
};
const handleWorkerDetailFulfilled = (state, action) => {
  state.status = "succeeded";
  state.workerDetail = action.payload?.data ?? state.workerDetail;
};

const handleWorkerCommonStateInfoFulfilled = (state, action) => {
  state.status = "succeeded";
  state.workerProfileInfo = action.payload?.data ?? state.workerProfileInfo;
};

const handleFetchWorkerRefIdInitialsFulfilled = (state, action) => {
  state.status = "succeeded";
  state.workerRefIdInitials = action.payload?.data ?? state.workerRefIdInitials;
};

const handleWorkerDetailTabInfoFulfilled = (state, action) => {
  state.status = "succeeded";
  state.workerDetailTabInfo = action.payload?.data ?? state.workerDetailTabInfo;
};

const handleWorkerDocumentUploadInfoFulfilled = (state, action) => {
  state.status = "succeeded";
  state.workerDocumentUploadInfo = action.payload?.data ?? state.workerDocumentUploadInfo;
};

const handleWorkerPhotoInfoFulfilled = (state, action) => {
  state.status = "succeeded";
  state.workerPhotoInfo = action.payload?.data ?? state.workerPhotoInfo;
};

const handleWorkerDetailTabInfoPassportFulfilled = (state, action) => {
  state.status = "succeeded";
  state.workerDetailTabInfoPassport = action.payload?.data ?? state.workerDetailTabInfoPassport;
};

const handleWorkerDocumentUploadInfoConsulateFulfilled = (state, action) => {
  state.status = "succeeded";
  state.workerDetailTabInfoConsulate = action.payload?.data ?? state.workerDetailTabInfoConsulate;
};

const handleGetWorkersFulfilled = (state, action) => {
  state.status = "succeeded";
  if (action.payload && action.payload?.data) {
    state.workersList = action.payload?.data ?? state.workersList;
    state.currentPage = action.payload?.current_page ?? state.currentPage;
    state.perPage = action.payload?.per_page ?? state.perPage;
    state.totalPages = action.payload?.last_page ?? state.totalPages;
    state.totalWorkers = action.payload?.total ?? state.totalWorkers;
    state.lastUpdated = action.payload?.last_update ?? state.lastUpdated;
    state.allWorkersList = action.payload;
  } else {
    state.workersList = action.payload || [];
  }
};

const handleGetDuplicateWorkersFulfilled = (state, action) => {
  state.status = "succeeded";
  state.duplicateWorkersList = action.payload?.data ?? state.duplicateWorkersList;
  state.currentPage = action.payload?.current_page ?? state.currentPage;
  state.perPage = action.payload?.per_page ?? state.perPage;
  state.totalPages = action.payload?.total_pages ?? state.totalPages;
  state.totalWorkers = action.payload?.total ?? state.totalWorkers;
  state.lastUpdated = action.payload?.last_update ?? state.lastUpdated;
  state.matched_columns = action.payload?.matched_columns || [];

};

const handleQRBranchGenerateCodeFulfilled = (state, action) => {
  state.status = "succeeded";
  state.branchQRCodeData = action.payload?.data ?? state.branchQRCodeData;
}

const handleSearchInterpreterStaffFulfilled = (state) => {
  state.status = "succeeded";
}

const handleChangeInterpreterFulfilled = (state) => {
  state.status = "succeeded";
}

const handleUpdateWorkerStatusFulfilled = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
};

const handleUpdateWorkerProfileImageFulfilled = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
};

const handleSaveWorkerValidateStatusFulfilled = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
};

const handleUpdateWorkerDetailsSliceFulfilled = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
};

const handleSaveWorkerBiodataFulfilled = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
};

const handleSaveWorkerBasicProfileFulfilled = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
};

const handleSaveWorkerConsulateFulfilled = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
};

const handlesaveWorkerOverseasDetail = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
};

const workerJobOfferAcceptInterviewFulfilled = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
};

const workerJobOfferCancelnterviewFulfilled = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
};

const handlesaveAssignPTWorker = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
};

const handleWorkerValidateStatusFulfilled = (state, action) => {
  state.status = "succeeded";
  state.allStatusList = action.payload?.data ?? state.allStatusList;
};

const handleWorkerActivityLogFulfilled = (state, action) => {
  state.status = "succeeded";
  state.activityLogList = action.payload?.data ?? state.activityLogList;
};

const handleWorkerMainActivityLogFulfilled = (state, action) => {
  state.status = "succeeded";
  state.mainActivityLogList = action.payload?.data ?? state.mainActivityLogList;
}

const handleWorkerJobOfferDetailsFulfiled = (state, action) => {
  state.status = "succeeded";
  state.workerJobOfferDetails = action.payload?.data ?? state.workerJobOfferDetails;
};

const handleWorkerJobStatusListFulfilled = (state, action) => {
  state.status = "succeeded";
  state.jobStatusList = action.payload?.data ?? state.jobStatusList;
};

const handleGetWorkerJobOffersFulfilled = (state, action) => {
  state.status = "succeeded";
  if (action.payload && action.payload?.data) {
    state.workerJobOfferList = action.payload?.data ?? state.workerJobOfferList;
    state.currentPage = action.payload?.data?.current_page ?? state.currentPage;
    state.perPage = action.payload?.data?.per_page ?? state.perPage;
    state.totalPages = action.payload?.data?.last_page ?? state.totalPages;
    state.totalWorkers = action.payload?.data?.total ?? state.totalWorkers;
  } else {
    state.workerJobOfferList = action.payload || [];
  }
};

const haneleFetchWorkerJobStatusFulfilled = (state, action) => {
  state.status = "succeeded";
  state.workerJobStatus = action?.payload?.data;
}

export {
  handleWorkerRoleFulfilled,
  handleWorkerDetailFulfilled,
  handleGetWorkersFulfilled,
  handleUpdateWorkerStatusFulfilled,
  handleSaveWorkerBiodataFulfilled,
  handleSaveWorkerBasicProfileFulfilled,
  handleSaveWorkerConsulateFulfilled,
  handlesaveWorkerOverseasDetail,
  handlesaveAssignPTWorker,
  handleWorkerValidateStatusFulfilled,
  handleWorkerActivityLogFulfilled,
  handleWorkerMainActivityLogFulfilled,
  handleSaveWorkerValidateStatusFulfilled,
  handleWorkerCommonStateInfoFulfilled,
  handleFetchWorkerRefIdInitialsFulfilled,
  handleWorkerDetailTabInfoFulfilled,
  handleWorkerDocumentUploadInfoFulfilled,
  handleWorkerPhotoInfoFulfilled,
  handleUpdateWorkerProfileImageFulfilled,
  handleWorkerJobOfferDetailsFulfiled,
  handleWorkerJobStatusListFulfilled,
  handleUpdateWorkerDetailsSliceFulfilled,
  handleGetWorkerJobOffersFulfilled,
  workerJobOfferAcceptInterviewFulfilled,
  workerJobOfferCancelnterviewFulfilled,
  handleWorkerDetailTabInfoPassportFulfilled,
  handleWorkerDocumentUploadInfoConsulateFulfilled,
  handleGetDuplicateWorkersFulfilled,
  handleSearchInterpreterStaffFulfilled,
  handleChangeInterpreterFulfilled,
  haneleFetchWorkerJobStatusFulfilled,
  handleQRBranchGenerateCodeFulfilled
};
