import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handlePending, handleRejected } from '../common/extra-reducers/commonExtraReducers';
import { handleActivateProcessingFulfilled, handleActivateProcessingGroup1And2Fulfilled, handleChagneProcessingCsFulfilled, handleDeleteProcessingFileFulfilled, handleDeploymentDocumentViewFulfilled, handleDeploymentShareUpdateFulfilled, handleDeploymentStatusList, handleDeploymentUpdateDHLContract, handleDeploymentUpdateFlightDetails, handleDeploymentUpdateHKIDDetails, handleDeploymentUpdatePickupDetails, handleDownloadEditablePdfFulfilled, handleDownloadNonEditablePdfFulfilled, handleEvisaDocumentStatusChange, handleEvisaDocumentStatusList, handleFetchProcessingActivityFulfilled, handleFetchProcessingDetails, handleFetchProcessingFiles, handleFetchProcessingLicence, handleInsuranceDocumentStatusChangeFulfilled, handleInsuranceDocumentStatusListFulfilled, handleInsuranceDocumentViewFulfilled, handleMedicalDocumentDeleteFulfilled, handleMedicalDocumentSaveFulfilled, handleMedicalDocumentStatusChangeFulfilled, handleMedicalDocumentStatusListFulfilled, handleMedicalDocumentViewFulfilled, handleMedicalShareUpdateFulfilled, handlePreDepartureDocumentViewFulfilled, handlePreDepartureMedicalDocChangeStatus, handlePreDepartureMedicalDocStatusList, handlePreDepartureOtherDocChangeStatus, handlePreDepartureOtherDocStatusListFulfilled, handlePreDepartureUploadMedFileFulfilled, handleProcessingGlobalSatusListFulfilled, handleProcessingStatusList, handleUpdateProcessinEVisaFulfilled, handleUpdateProcessingDetails, handleUpdateProcessingDocuments, handleUpdateProcessingFullDetails, handleUpdateProcessingStatus, handleUpdateProcessingVisaAuth, handleUploadingProcessingFiles, handleVisaDocumentDetailsFulfilled, handleDeleteProcessingVisaFileFulfilled, handleVisaShareUpdateFulfilled, updateProcessingGlobalSatusListFulfilled } from './processingExtraReducers';
import { fetchProcessingLicenceAPI, getProcessingDetails, getProcessingFiles, getProcessingSatusList, removeProcessingFile, updateProcessingDocumentsAPI, updateProcessingFullDetailsAPI, updateProcessingStatusAPI, updateProcessingVisaEVisaAPI, uploadProcessingFiles, getProcessingActivityLogList, medicalDocumentSaveAPI, medicalDocumentDeleteAPI, medicalDocumentViewAPI, insuranceDocumentViewAPI, medicalDocumentStatusListAPI, medicalDocumentStatusChangeAPI, insuranceDocumentStatusChangeAPI, insuranceDocumentStatusListAPI, getProcessingGlobalSatusListAPI, updateProcessingGlobalSatusListAPI, updateProcessingDetailsAPI, visaDocumentDetailsAPI, deleteProcessingVisaFileAPI, preDepartureUploadMedFileAPI, preDepartureMedicalDocStatusListAPI, preDepartureMedicalDocChangeStatusAPI, preDepartureMedicalDocFileDeleteAPI, preDepartureOtherDocStatusAPI, preDepartureOtherDocChangeStatusAPI, preDepartureDocumentViewAPI, visaShareUpdateAPI, medicalShareUpdateAPI, getEvisaDocumentStatusListAPI, eVisaDocumentStatusChangeAPI, deploymentDocumentViewAPI, deploymentUpdateDHLContractAPI, deploymentUpdateFlightDetailsAPI, deploymentUpdateHKIDDetailsAPI, deploymentUpdatePickupDetailsAPI, deploymentStatusListAPI, deploymentChangeStatusAPI, updateProcessingVisaAuthAPI, deploymentShareUpdateAPI, activateProcessingAPI, chagneProcessingCsAPI, downloadEditablePdfAPI, downloadNonEditablePdfAPI, activateProcessingGroup1And2API } from '../../../services/processings';

export const uploadingProcessingFiles = createAsyncThunk('processings/uploadingProcessingFiles', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await uploadProcessingFiles(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchProcessingFiles = createAsyncThunk('processings/fetchProcessingFiles', async (params, { rejectWithValue }) => {
  try {
    const response = await getProcessingFiles(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const deleteProcessingFile = createAsyncThunk(
  'remarks/deleteProcessingFile',
  async (remarkPayload, { rejectWithValue }) => {
    try {
      const response = await removeProcessingFile(remarkPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const fetchProcessingStatusList = createAsyncThunk('processings/fetchProcessingStatusList', async (params, { rejectWithValue }) => {
  try {
    const response = await getProcessingSatusList(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchProcessingGlobalSatusList = createAsyncThunk('processings/fetchProcessingGlobalSatusList', async (params, { rejectWithValue }) => {
  try {
    const response = await getProcessingGlobalSatusListAPI(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateProcessingGlobalSatusList = createAsyncThunk('processings/updateProcessingGlobalSatusList', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await updateProcessingGlobalSatusListAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateProcessingStatus = createAsyncThunk('processings/updateProcessingStatus', async (params, { rejectWithValue }) => {
  try {
    const response = await updateProcessingStatusAPI(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateProcessingDetails = createAsyncThunk('processings/updateProcessingDetails', async (params, { rejectWithValue }) => {
  try {
    const response = await updateProcessingDetailsAPI(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchProcessingLicence = createAsyncThunk('processings/fetchProcessingLicence', async (params, { rejectWithValue }) => {
  try {
    const response = await fetchProcessingLicenceAPI(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchProcessingDetails = createAsyncThunk('processings/fetchProcessingDetails', async (params, { rejectWithValue }) => {
  try {
    const response = await getProcessingDetails(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateProcessingDocuments = createAsyncThunk('processings/updateProcessingDocuments', async (params, { rejectWithValue }) => {
  try {
    const response = await updateProcessingDocumentsAPI(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateProcessingFullDetails = createAsyncThunk('processings/updateProcessingFullDetails', async (params, { rejectWithValue }) => {
  try {
    const response = await updateProcessingFullDetailsAPI(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});
export const updateProcessingVisaEVisa = createAsyncThunk('processings/updateProcessingVisaEVisa', async (params, { rejectWithValue }) => {
  try {
    const response = await updateProcessingVisaEVisaAPI(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchProcessingActivityLog = createAsyncThunk("processings/fetchProcessingActivityLog", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getProcessingActivityLogList(reqPayload);
    return response?.data?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
}
);

export const medicalDocumentSave = createAsyncThunk("processings/medicalDocumentSave", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await medicalDocumentSaveAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
      code: error.response?.data?.code || null,   /* backend 281: SUB_STAGE_NOT_REQUIRED */
      sub_stage: error.response?.data?.sub_stage || null,
    });
  }
});

export const medicalDocumentDelete = createAsyncThunk("processings/medicalDocumentDelete", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await medicalDocumentDeleteAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const medicalDocumentView = createAsyncThunk("processings/medicalDocumentView", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await medicalDocumentViewAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const visaDocumentDetails = createAsyncThunk("processings/visaDocumentDetails", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await visaDocumentDetailsAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const deleteProcessingVisaFile = createAsyncThunk("processings/deleteProcessingVisaFile", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await deleteProcessingVisaFileAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const fetchMedicalDocumentStatusList = createAsyncThunk("processings/fetchMedicalDocumentStatusList", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await medicalDocumentStatusListAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const medicalDocumentStatusChange = createAsyncThunk("processings/medicalDocumentStatusChange", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await medicalDocumentStatusChangeAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const fetchInsuranceDocumentStatusList = createAsyncThunk("processings/fetchInsuranceDocumentStatusList", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await insuranceDocumentStatusListAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const insuranceDocumentStatusChange = createAsyncThunk("processings/insuranceDocumentStatusChange", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await insuranceDocumentStatusChangeAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const insuranceDocumentView = createAsyncThunk("processings/insuranceDocumentView", async (id, { rejectWithValue }) => {
  try {
    const response = await insuranceDocumentViewAPI(id);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const preDepartureUploadMedFile = createAsyncThunk("processings/preDepartureUploadMedFile", async (id, { rejectWithValue }) => {
  try {
    const response = await preDepartureUploadMedFileAPI(id);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const preDepartureMedicalDocStatusList = createAsyncThunk("processings/preDepartureMedicalDocStatusList", async (id, { rejectWithValue }) => {
  try {
    const response = await preDepartureMedicalDocStatusListAPI(id);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const preDepartureMedicalDocChangeStatus = createAsyncThunk("processings/preDepartureMedicalDocChangeStatus", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await preDepartureMedicalDocChangeStatusAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});
export const preDepartureMedicalDocFileDelete = createAsyncThunk("processings/preDepartureMedicalDocFileDelete", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await preDepartureMedicalDocFileDeleteAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const preDepartureOtherDocStatusList = createAsyncThunk("processings/preDepartureOtherDocStatusList", async (payload, { rejectWithValue }) => {
  try {
    const response = await preDepartureOtherDocStatusAPI(payload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const preDepartureOtherDocChangeStatus = createAsyncThunk("processings/preDepartureOtherDocChangeStatus", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await preDepartureOtherDocChangeStatusAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const preDepartureDocumentView = createAsyncThunk("processings/preDepartureDocumentView", async (id, { rejectWithValue }) => {
  try {
    const response = await preDepartureDocumentViewAPI(id);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const visaShareUpdate = createAsyncThunk("processings/visaShareUpdate", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await visaShareUpdateAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const medicalShareUpdate = createAsyncThunk("processings/medicalShareUpdate", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await medicalShareUpdateAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const deploymentShareUpdate = createAsyncThunk("processings/deploymentShareUpdate", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await deploymentShareUpdateAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const fetchEvisaDocumentStatusList = createAsyncThunk("processings/fetchEvisaDocumentStatusList", async (payload, { rejectWithValue }) => {
  try {
    const response = await getEvisaDocumentStatusListAPI(payload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const eVisaDocumentStatusChange = createAsyncThunk("processings/eVisaDocumentStatusChange", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await eVisaDocumentStatusChangeAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const deploymentDocumentView = createAsyncThunk("processings/deploymentDocumentView", async (id, { rejectWithValue }) => {
  try {
    const response = await deploymentDocumentViewAPI(id);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const deploymentUpdateDHLContract = createAsyncThunk("processings/deploymentUpdateDHLContract", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await deploymentUpdateDHLContractAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
      code: error.response?.data?.code || null,   /* backend 281: SUB_STAGE_NOT_REQUIRED */
      sub_stage: error.response?.data?.sub_stage || null,
    });
  }
});

export const deploymentUpdateFlightDetails = createAsyncThunk("processings/deploymentUpdateFlightDetails", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await deploymentUpdateFlightDetailsAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
      code: error.response?.data?.code || null,   /* backend 281: SUB_STAGE_NOT_REQUIRED */
      sub_stage: error.response?.data?.sub_stage || null,
    });
  }
});

export const deploymentUpdateHKIDDetails = createAsyncThunk("processings/deploymentUpdateHKIDDetails", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await deploymentUpdateHKIDDetailsAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
      code: error.response?.data?.code || null,   /* backend 281: SUB_STAGE_NOT_REQUIRED */
      sub_stage: error.response?.data?.sub_stage || null,
    });
  }
});

export const deploymentUpdatePickupDetails = createAsyncThunk("processings/deploymentUpdatePickupDetails", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await deploymentUpdatePickupDetailsAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
      code: error.response?.data?.code || null,   /* backend 281: SUB_STAGE_NOT_REQUIRED */
      sub_stage: error.response?.data?.sub_stage || null,
    });
  }
});

export const deploymentStatusList = createAsyncThunk("processings/deploymentStatusList", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await deploymentStatusListAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const deploymentChangeStatus = createAsyncThunk("processings/deploymentChangeStatus", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await deploymentChangeStatusAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const updateProcessingVisaAuth = createAsyncThunk("processings/updateProcessingVisaAuth", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await updateProcessingVisaAuthAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const activateProcessing = createAsyncThunk("processings/activateProcessing", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await activateProcessingAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
      /* backend 301: E_VISA_PAYMENT_DATE_CHANGE_REASON_REQUIRED (400 envelope) is shown under the field */
      code: error.response?.data?.code,
    });
  }
});

export const activateProcessingGroup1And2 = createAsyncThunk("processings/activateProcessingGroup1And2", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await activateProcessingGroup1And2API(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const chagneProcessingCs = createAsyncThunk("processings/chagneProcessingCs", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await chagneProcessingCsAPI(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const downloadEditablePdf = createAsyncThunk("processings/downloadEditablePdf", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await downloadEditablePdfAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});

export const downloadNonEditablePdf = createAsyncThunk("processings/downloadNonEditablePdf", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await downloadNonEditablePdfAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
});


const processingSlice = createSlice({
  name: 'processings',
  initialState: {
    processingList: [],
    currentPage: 1,
    perPage: 10,
    totalPages: 0,
    totalProcessings: 0,
    lastUpdated: null,
    message: '',
    activityLogList: [],
    processings: [],
    entityProcessingStatuses: [],
    processingLicences: [],
    processingDetails: {},
    visaDocument: {},
    status: 'success',
    error: null,
    currentProcessing: null,
    processingFiles: [],
    processingFilesCurrentPage: 1,
    processingFilesPerPage: 1,
    processingFilesTotalPages: 0,
    processingFilesTotal: 0,
    processingFilesLastUpdated: '',
    processingFilesMessage: null,
    medicalDocument: {},
    medicalDocumentStatusList: [],
    eVisaDocumentStatusList: [],
    insuranceDocument: {},
    insuranceDocumentStatusList: [],
    filters: {},
    processingGlobalStatusList: [],
    preDepartureMedicalDocStatuses: [],
    preDepartureOtherDocStatus : [],
    preDepartureDocument : {},
    deploymentDocument : {},
    deploymentStatuses : [],
  },
  reducers: {
    setFilters(state, action) {
      state.filters = action.payload; 
    },
    resetFilters(state) {
      state.filters = {}; 
    },
    /* the stage panels keep the previous contract's documents until their own fetch returns — and a "view" that
       returns no document keeps the old one (`?? state.x`). The record page clears them when the contract changes
       (Mubin 30 Oct: contract 36 showed contract 46's Medical data until a reload). */
    clearContractDocuments(state) {
      state.processingDetails = {};
      state.visaDocument = {};
      state.medicalDocument = {};
      state.medicalDocumentStatusList = [];
      state.eVisaDocumentStatusList = [];
      state.insuranceDocument = {};
      state.insuranceDocumentStatusList = [];
      state.preDepartureMedicalDocStatuses = [];
      state.preDepartureOtherDocStatus = [];
      state.preDepartureDocument = {};
      state.deploymentDocument = {};
      state.deploymentStatuses = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadingProcessingFiles.pending, handlePending)
      .addCase(uploadingProcessingFiles.fulfilled, handleUploadingProcessingFiles)
      .addCase(uploadingProcessingFiles.rejected, handleRejected)
      .addCase(fetchProcessingFiles.pending, handlePending)
      .addCase(fetchProcessingFiles.fulfilled, handleFetchProcessingFiles)
      .addCase(fetchProcessingFiles.rejected, handleRejected)
      .addCase(deleteProcessingFile.pending, handlePending)
      .addCase(deleteProcessingFile.fulfilled, handleDeleteProcessingFileFulfilled)
      .addCase(deleteProcessingFile.rejected, handleRejected)
      .addCase(fetchProcessingStatusList.pending, handlePending)
      .addCase(fetchProcessingStatusList.fulfilled, handleProcessingStatusList)
      .addCase(fetchProcessingStatusList.rejected, handleRejected)
      .addCase(fetchProcessingGlobalSatusList.pending, handlePending)
      .addCase(fetchProcessingGlobalSatusList.fulfilled, handleProcessingGlobalSatusListFulfilled)
      .addCase(fetchProcessingGlobalSatusList.rejected, handleRejected)
      .addCase(updateProcessingGlobalSatusList.pending, handlePending)
      .addCase(updateProcessingGlobalSatusList.fulfilled, updateProcessingGlobalSatusListFulfilled)
      .addCase(updateProcessingGlobalSatusList.rejected, handleRejected)
      .addCase(updateProcessingStatus.pending, handlePending)
      .addCase(updateProcessingStatus.fulfilled, handleUpdateProcessingStatus)
      .addCase(updateProcessingStatus.rejected, handleRejected)
      .addCase(updateProcessingDetails.pending, handlePending)
      .addCase(updateProcessingDetails.fulfilled, handleUpdateProcessingDetails)
      .addCase(updateProcessingDetails.rejected, handleRejected)
      .addCase(fetchProcessingLicence.pending, handlePending)
      .addCase(fetchProcessingLicence.fulfilled, handleFetchProcessingLicence)
      .addCase(fetchProcessingLicence.rejected, handleRejected)
      .addCase(fetchProcessingDetails.pending, handlePending)
      .addCase(fetchProcessingDetails.fulfilled, handleFetchProcessingDetails)
      .addCase(fetchProcessingDetails.rejected, handleRejected)
      .addCase(updateProcessingDocuments.pending, handlePending)
      .addCase(updateProcessingDocuments.fulfilled, handleUpdateProcessingDocuments)
      .addCase(updateProcessingDocuments.rejected, handleRejected)
      .addCase(updateProcessingFullDetails.pending, handlePending)
      .addCase(updateProcessingFullDetails.fulfilled, handleUpdateProcessingFullDetails)
      .addCase(updateProcessingFullDetails.rejected, handleRejected)
      .addCase(updateProcessingVisaEVisa.pending, handlePending)
      .addCase(updateProcessingVisaEVisa.fulfilled, handleUpdateProcessinEVisaFulfilled)
      .addCase(updateProcessingVisaEVisa.rejected, handleRejected)
      .addCase(fetchProcessingActivityLog.pending, handlePending)
      .addCase(fetchProcessingActivityLog.fulfilled, handleFetchProcessingActivityFulfilled)
      .addCase(fetchProcessingActivityLog.rejected, handleRejected)
      .addCase(medicalDocumentSave.pending, handlePending)
      .addCase(medicalDocumentSave.fulfilled, handleMedicalDocumentSaveFulfilled)
      .addCase(medicalDocumentSave.rejected, handleRejected)
      .addCase(medicalDocumentView.pending, handlePending)
      .addCase(medicalDocumentView.fulfilled, handleMedicalDocumentViewFulfilled)
      .addCase(medicalDocumentView.rejected, handleRejected)
      .addCase(visaDocumentDetails.pending, handlePending)
      .addCase(visaDocumentDetails.fulfilled, handleVisaDocumentDetailsFulfilled)
      .addCase(visaDocumentDetails.rejected, (state) => {
        state.visaDocument = {};
      })
      .addCase(deleteProcessingVisaFile.pending, handlePending)
      .addCase(deleteProcessingVisaFile.fulfilled, handleDeleteProcessingVisaFileFulfilled)
      .addCase(deleteProcessingVisaFile.rejected, handleRejected)
      .addCase(fetchMedicalDocumentStatusList.pending, handlePending)
      .addCase(fetchMedicalDocumentStatusList.fulfilled, handleMedicalDocumentStatusListFulfilled)
      .addCase(fetchMedicalDocumentStatusList.rejected, handleRejected)
      .addCase(medicalDocumentStatusChange.pending, handlePending)
      .addCase(medicalDocumentStatusChange.fulfilled, handleMedicalDocumentStatusChangeFulfilled)
      .addCase(medicalDocumentStatusChange.rejected, handleRejected)
      .addCase(fetchInsuranceDocumentStatusList.pending, handlePending)
      .addCase(fetchInsuranceDocumentStatusList.fulfilled, handleInsuranceDocumentStatusListFulfilled)
      .addCase(fetchInsuranceDocumentStatusList.rejected, handleRejected)
      .addCase(insuranceDocumentStatusChange.pending, handlePending)
      .addCase(insuranceDocumentStatusChange.fulfilled, handleInsuranceDocumentStatusChangeFulfilled)
      .addCase(insuranceDocumentStatusChange.rejected, handleRejected)
      .addCase(medicalDocumentDelete.pending, handlePending)
      .addCase(medicalDocumentDelete.fulfilled, handleMedicalDocumentDeleteFulfilled)
      .addCase(medicalDocumentDelete.rejected, handleRejected)
      .addCase(insuranceDocumentView.pending, handlePending)
      .addCase(insuranceDocumentView.fulfilled, handleInsuranceDocumentViewFulfilled)
      .addCase(insuranceDocumentView.rejected, handleRejected)

      .addCase(preDepartureUploadMedFile.pending, handlePending)
      .addCase(preDepartureUploadMedFile.fulfilled, handlePreDepartureUploadMedFileFulfilled)
      .addCase(preDepartureUploadMedFile.rejected, handleRejected)

      .addCase(preDepartureMedicalDocStatusList.pending, handlePending)
      .addCase(preDepartureMedicalDocStatusList.fulfilled, handlePreDepartureMedicalDocStatusList)
      .addCase(preDepartureMedicalDocStatusList.rejected, handleRejected)

      .addCase(preDepartureMedicalDocChangeStatus.pending, handlePending)
      .addCase(preDepartureMedicalDocChangeStatus.fulfilled, handlePreDepartureMedicalDocChangeStatus)
      .addCase(preDepartureMedicalDocChangeStatus.rejected, handleRejected)

      .addCase(preDepartureOtherDocStatusList.pending, handlePending)
      .addCase(preDepartureOtherDocStatusList.fulfilled, handlePreDepartureOtherDocStatusListFulfilled)
      .addCase(preDepartureOtherDocStatusList.rejected, handleRejected)
      
      .addCase(preDepartureOtherDocChangeStatus.pending, handlePending)
      .addCase(preDepartureOtherDocChangeStatus.fulfilled, handlePreDepartureOtherDocChangeStatus)
      .addCase(preDepartureOtherDocChangeStatus.rejected, handleRejected)

      .addCase(visaShareUpdate.pending, handlePending)
      .addCase(visaShareUpdate.fulfilled, handleVisaShareUpdateFulfilled)
      .addCase(visaShareUpdate.rejected, handleRejected)

      .addCase(medicalShareUpdate.pending, handlePending)
      .addCase(medicalShareUpdate.fulfilled, handleMedicalShareUpdateFulfilled)
      .addCase(medicalShareUpdate.rejected, handleRejected)

      .addCase(deploymentShareUpdate.pending, handlePending)
      .addCase(deploymentShareUpdate.fulfilled, handleDeploymentShareUpdateFulfilled)
      .addCase(deploymentShareUpdate.rejected, handleRejected)

      .addCase(preDepartureDocumentView.pending, handlePending)
      .addCase(preDepartureDocumentView.fulfilled, handlePreDepartureDocumentViewFulfilled)
      .addCase(preDepartureDocumentView.rejected, handleRejected)

      .addCase(fetchEvisaDocumentStatusList.pending, handlePending)
      .addCase(fetchEvisaDocumentStatusList.fulfilled, handleEvisaDocumentStatusList)
      .addCase(fetchEvisaDocumentStatusList.rejected, handleRejected)

      .addCase(eVisaDocumentStatusChange.pending, handlePending)
      .addCase(eVisaDocumentStatusChange.fulfilled, handleEvisaDocumentStatusChange)
      .addCase(eVisaDocumentStatusChange.rejected, handleRejected)

      .addCase(deploymentDocumentView.pending, handlePending)
      .addCase(deploymentDocumentView.fulfilled, handleDeploymentDocumentViewFulfilled)
      .addCase(deploymentDocumentView.rejected, handleRejected)

      .addCase(deploymentUpdateDHLContract.pending, handlePending)
      .addCase(deploymentUpdateDHLContract.fulfilled, handleDeploymentUpdateDHLContract)
      .addCase(deploymentUpdateDHLContract.rejected, handleRejected)

      .addCase(deploymentUpdateFlightDetails.pending, handlePending)
      .addCase(deploymentUpdateFlightDetails.fulfilled, handleDeploymentUpdateFlightDetails)
      .addCase(deploymentUpdateFlightDetails.rejected, handleRejected)

      .addCase(deploymentUpdateHKIDDetails.pending, handlePending)
      .addCase(deploymentUpdateHKIDDetails.fulfilled, handleDeploymentUpdateHKIDDetails)
      .addCase(deploymentUpdateHKIDDetails.rejected, handleRejected)

      .addCase(deploymentUpdatePickupDetails.pending, handlePending)
      .addCase(deploymentUpdatePickupDetails.fulfilled, handleDeploymentUpdatePickupDetails)
      .addCase(deploymentUpdatePickupDetails.rejected, handleRejected)

      .addCase(deploymentStatusList.pending, handlePending)
      .addCase(deploymentStatusList.fulfilled, handleDeploymentStatusList)
      .addCase(deploymentStatusList.rejected, handleRejected)

      .addCase(updateProcessingVisaAuth.pending, handlePending)
      .addCase(updateProcessingVisaAuth.fulfilled, handleUpdateProcessingVisaAuth)
      .addCase(updateProcessingVisaAuth.rejected, handleRejected)

      .addCase(activateProcessing.pending, handlePending)
      .addCase(activateProcessing.fulfilled, handleActivateProcessingFulfilled)
      .addCase(activateProcessing.rejected, handleRejected)

      .addCase(activateProcessingGroup1And2.pending, handlePending)
      .addCase(activateProcessingGroup1And2.fulfilled, handleActivateProcessingGroup1And2Fulfilled)
      .addCase(activateProcessingGroup1And2.rejected, handleRejected)

      .addCase(chagneProcessingCs.pending, handlePending)
      .addCase(chagneProcessingCs.fulfilled, handleChagneProcessingCsFulfilled)
      .addCase(chagneProcessingCs.rejected, handleRejected)
      .addCase(downloadEditablePdf.pending, handlePending)
      .addCase(downloadEditablePdf.fulfilled, handleDownloadEditablePdfFulfilled)
      .addCase(downloadEditablePdf.rejected, handleRejected)
      .addCase(downloadNonEditablePdf.pending, handlePending)
      .addCase(downloadNonEditablePdf.fulfilled, handleDownloadNonEditablePdfFulfilled)
      .addCase(downloadNonEditablePdf.rejected, handleRejected);
  },
});

export const { setFilters, resetFilters, clearContractDocuments } = processingSlice.actions;

export default processingSlice.reducer;
