const handleUploadingProcessingFiles = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};

const handleDeleteProcessingFileFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};

const handleProcessingStatusList = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
  state.entityProcessingStatuses = action.payload?.data || [];
};

const handleProcessingGlobalSatusListFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
  state.processingGlobalStatusList = action.payload?.data || [];
};

const updateProcessingGlobalSatusListFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};

const handleUpdateProcessingStatus = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
};

const handleUpdateProcessingDetails = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
}

const handleFetchProcessingLicence = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
  state.processingLicences = action.payload?.data || [];
};

const handleFetchProcessingDetails = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
  state.processingDetails = action.payload?.data || [];
};

const handleUpdateProcessingDocuments = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
};

const handleUpdateProcessingFullDetails = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
};

const handleUpdateProcessinEVisaFulfilled = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
};

const handleFetchProcessingFiles = (state, action) => {
  state.status = 'succeeded';
  state.processingFilesMessage = action.payload?.message ?? state.processingFilesMessage;
  const processingFileData = action?.payload?.data?.data || [];
  const paginationInfo = action?.payload?.data;
  
  if (processingFileData.length > 0) {
    state.processingFiles = processingFileData;
    state.processingFilesCurrentPage = paginationInfo.current_page || 1; 
    state.processingFilesPerPage = paginationInfo.per_page || 10; 
    state.processingFilesTotalPages = paginationInfo.last_page || 0; 
    state.processingFilesTotal = paginationInfo.total || 0; 
    state.processingFilesLastUpdated = paginationInfo.last_update || null;
  } else {
    state.processingFiles = []; 
    state.processingFilesCurrentPage = 1; 
    state.processingFilesPerPage = 10; 
    state.processingFilesTotalPages = 0; 
    state.processingFilesTotal = 0; 
    state.processingFilesLastUpdated = ''; 
  }
};

const handleFetchProcessingActivityFulfilled = (state, action) => {
  state.status = "succeeded";
  state.activityLogList = action.payload;
};

const handleMedicalDocumentViewFulfilled = (state, action) => {
  state.status = "succeeded";
  state.medicalDocument = action.payload?.data ?? state.medicalDocument;
}

const handleVisaDocumentDetailsFulfilled = (state, action) => {
  state.status = "succeeded";
  state.visaDocument = action.payload?.data ?? state.visaDocument;
}

const handleDeleteProcessingVisaFileFulfilled = (state) => {
  state.status = "succeeded";
}

const handleMedicalDocumentStatusListFulfilled = (state, action) => {
  state.status = "succeeded";
  state.medicalDocumentStatusList = action.payload?.data ?? state.medicalDocumentStatusList;
}

const handleMedicalDocumentStatusChangeFulfilled = (state) => {
  state.status = "succeeded";
}

const handleInsuranceDocumentStatusListFulfilled = (state, action) => {
  state.status = "succeeded";
  state.insuranceDocumentStatusList = action.payload?.data ?? state.insuranceDocumentStatusList;
}

const handleInsuranceDocumentStatusChangeFulfilled = (state) => {
  state.status = "succeeded";
}

const handleMedicalDocumentSaveFulfilled = (state) => {
  state.status = "succeeded";
}

const handleMedicalDocumentDeleteFulfilled = (state) => {
  state.status = "succeeded";
}

const handleInsuranceDocumentViewFulfilled = (state, action) => {
  state.status = "succeeded";
  state.insuranceDocument = action.payload?.data ?? state.insuranceDocument;
}

const handlePreDepartureUploadMedFileFulfilled = (state) => {
  state.status = "succeeded";
}

const handlePreDepartureMedicalDocStatusList = (state, action) => {
  state.status = "succeeded";
  state.preDepartureMedicalDocStatuses = action.payload?.data ?? state.preDepartureMedicalDocStatuses;
}

const handlePreDepartureMedicalDocChangeStatus = (state) => {
  state.status = "succeeded";
}

const handlePreDepartureMedicalDocFileDelete = (state) => {
  state.status = "succeeded";
}

const handlePreDepartureOtherDocStatusListFulfilled = (state, action) => {
  state.status = "succeeded";
  state.preDepartureOtherDocStatus = action.payload?.data ?? state.preDepartureOtherDocStatus;
}

const handlePreDepartureOtherDocChangeStatus = (state) => {
  state.status = "succeeded";
}

const handleVisaShareUpdateFulfilled = (state) => {
  state.status = "succeeded";
}

const handleMedicalShareUpdateFulfilled = (state) => {
  state.status = "succeeded";
}

const handleDeploymentShareUpdateFulfilled = (state) => {
  state.status = "succeeded";
}

const handlePreDepartureDocumentViewFulfilled = (state, action) => {
  state.status = "succeeded";
  state.preDepartureDocument = action.payload?.data ?? state.preDepartureDocument;
}

const handleEvisaDocumentStatusList = (state, action) => {
  state.status = "succeeded";
  state.eVisaDocumentStatusList = action.payload?.data ?? state.eVisaDocumentStatusList;
}

const handleEvisaDocumentStatusChange = (state) => {
  state.status = "succeeded";
}

const handleDeploymentDocumentViewFulfilled = (state, action) => {
  state.status = "succeeded";
  state.deploymentDocument = action.payload?.data ?? state.deploymentDocument;
}

const handleDeploymentUpdateDHLContract = (state) => {
  state.status = "succeeded";
}

const handleDeploymentUpdateFlightDetails = (state) => {
  state.status = "succeeded";
}

const handleDeploymentUpdateHKIDDetails = (state) => {
  state.status = "succeeded";
}

const handleDeploymentUpdatePickupDetails = (state) => {
  state.status = "succeeded";
}

const handleDeploymentStatusList = (state, action) => {
  state.status = "succeeded";
  state.deploymentStatuses = action.payload?.data ?? state.deploymentStatuses;
}

const handleUpdateProcessingVisaAuth = (state) => {
  state.status = "succeeded";
}

const handleActivateProcessingFulfilled = (state) => {
  state.status = "succeeded";
}

const handleActivateProcessingGroup1And2Fulfilled = (state) => {
  state.status = "succeeded";
}

const handleChagneProcessingCsFulfilled = (state) => {
  state.status = "succeeded"; 
}

const handleDownloadEditablePdfFulfilled = (state) => {
  state.status = "succeeded";
}

const handleDownloadNonEditablePdfFulfilled = (state) => {
  state.status = "succeeded";
}

export {
  handleUploadingProcessingFiles,
  handleFetchProcessingFiles,
  handleDeleteProcessingFileFulfilled,
  handleProcessingStatusList,
  handleUpdateProcessingStatus,
  handleUpdateProcessingDetails,
  handleFetchProcessingLicence,
  handleFetchProcessingDetails,
  handleUpdateProcessingDocuments,
  handleUpdateProcessingFullDetails,
  handleUpdateProcessinEVisaFulfilled,
  handleFetchProcessingActivityFulfilled,
  handleMedicalDocumentViewFulfilled,
  handleMedicalDocumentStatusChangeFulfilled,
  handleMedicalDocumentSaveFulfilled,
  handleMedicalDocumentDeleteFulfilled,
  handleInsuranceDocumentViewFulfilled,
  handleMedicalDocumentStatusListFulfilled,
  handleInsuranceDocumentStatusListFulfilled,
  handleInsuranceDocumentStatusChangeFulfilled,
  handleProcessingGlobalSatusListFulfilled,
  updateProcessingGlobalSatusListFulfilled,
  handleVisaDocumentDetailsFulfilled,
  handleDeleteProcessingVisaFileFulfilled,
  handlePreDepartureUploadMedFileFulfilled,
  handlePreDepartureMedicalDocStatusList,
  handlePreDepartureMedicalDocChangeStatus,
  handlePreDepartureMedicalDocFileDelete,
  handlePreDepartureOtherDocStatusListFulfilled,
  handlePreDepartureOtherDocChangeStatus,
  handlePreDepartureDocumentViewFulfilled,
  handleVisaShareUpdateFulfilled,
  handleMedicalShareUpdateFulfilled,
  handleEvisaDocumentStatusList,
  handleEvisaDocumentStatusChange,
  handleDeploymentDocumentViewFulfilled,
  handleDeploymentUpdateDHLContract,
  handleDeploymentUpdateFlightDetails,
  handleDeploymentUpdateHKIDDetails,
  handleDeploymentUpdatePickupDetails,
  handleDeploymentStatusList,
  handleUpdateProcessingVisaAuth,
  handleDeploymentShareUpdateFulfilled,
  handleActivateProcessingFulfilled,
  handleActivateProcessingGroup1And2Fulfilled,
  handleChagneProcessingCsFulfilled,
  handleDownloadEditablePdfFulfilled,
  handleDownloadNonEditablePdfFulfilled
};