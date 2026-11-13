import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  handlePending,
  handleRejected,
} from "../common/extra-reducers/commonExtraReducers";
import {
  handleWorkerDetailFulfilled,
  handleWorkerRoleFulfilled,
  handleGetWorkersFulfilled,
  handleUpdateWorkerStatusFulfilled,
  handleSaveWorkerBiodataFulfilled,
  handleSaveWorkerBasicProfileFulfilled,
  handleSaveWorkerConsulateFulfilled,
  handlesaveWorkerOverseasDetail,
  handlesaveAssignPTWorker,
  handleWorkerValidateStatusFulfilled,
  handleWorkerActivityLogFulfilled,
  handleSaveWorkerValidateStatusFulfilled,
  // handleWorkerCommonStateInfoFulfilled,
  handleWorkerDetailTabInfoFulfilled,
  handleWorkerDocumentUploadInfoFulfilled,
  handleWorkerPhotoInfoFulfilled,
  handleUpdateWorkerProfileImageFulfilled,
  handleWorkerJobOfferDetailsFulfiled,
  handleWorkerJobStatusListFulfilled,
  handleUpdateWorkerDetailsSliceFulfilled,
  handleFetchWorkerRefIdInitialsFulfilled,
  handleGetWorkerJobOffersFulfilled,
  workerJobOfferAcceptInterviewFulfilled,
  workerJobOfferCancelnterviewFulfilled,
  handleWorkerDetailTabInfoPassportFulfilled,
  handleWorkerDocumentUploadInfoConsulateFulfilled,
  handleGetDuplicateWorkersFulfilled,
  handleSearchInterpreterStaffFulfilled,
  handleChangeInterpreterFulfilled,
  handleWorkerMainActivityLogFulfilled,
  haneleFetchWorkerJobStatusFulfilled,
  handleQRBranchGenerateCodeFulfilled
} from "./workerExtraReducers";
import {
  getWorkerDetail,
  getWorkerRoles,
  getWorkers,
  getWorkerOnboarding,
  updateWorkerOnboardingStaff,
  changeWorkerStatus,
  workerCheckoutAtBranchApi,
  saveWorkerBiodata,
  saveWorkerBasicProfile,
  saveWorkerConsulate,
  saveWorkerPassportDetails,
  saveWorkerOverseasDetail,
  assignPTWorker,
  getWorkerValidateStatus,
  getWorkerActivityLog,
  updateWorkerValidateStatus,
  getWorkerAllStateInfo,
  updateSaveWorkerProfileImage,
  uploadIndoDocumentAfterPTAssign,
  deleteWorkerIndonesianDocumentApi,
  updateUserContactInfo,
  setPrimaryContactInfo,
  getWorkerJobOfferDetails,
  getWorkerJobStatusList,
  updateWorkerDetails,
  getWorkerReferenceIdInitialsAPI,
  getWorkerRefrenceIdInitals,
  getWorkerJobOfferList,
  getWorkerCanStartDate,
  saveWorkerJobOfferAcceptInterview,
  saveWorkerJobOfferCancelInterview,
  updateContractWorker,
  saveWorkerManageSuggestedJob,
  saveWorkerManageJob,
  getDuplicateWorkerCount,
  getDuplicateWorkers,
  searchInterpreterStaffAPI,
  changeInterpreterAPI,
  chatvalidateChangeUserGroupCsInterpreter,
  getWorkerMainActivityLog,
  getInterviewCounts,
  getWorkerJobStatus,
  qrBranchGenerateCodeAPI
} from "../../../services/workers";

export const fetchWorkerRole = createAsyncThunk(
  "workers/fetchWorkerRole",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerRoles(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWokerDetail = createAsyncThunk(
  "workers/fetchWokerDetail",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerDetail(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWorkers = createAsyncThunk(
  "workers/fetchWorkers",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkers(reqPayload);
      return response.data.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWorkerOnboarding = createAsyncThunk(
  "workers/fetchWorkerOnboarding",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerOnboarding(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const updateWorkerOnboarding = createAsyncThunk(
  "workers/updateWorkerOnboarding",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await updateWorkerOnboardingStaff(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const updateWorkerStatus = createAsyncThunk(
  "workers/updateWorkerStatus",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await changeWorkerStatus(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const workerCheckoutAtBranch = createAsyncThunk(
  "workers/workerCheckoutAtBranch",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await workerCheckoutAtBranchApi(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const saveWorkerBiodataSlice = createAsyncThunk(
  "workers/saveWorkerBiodata",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await saveWorkerBiodata(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
        /* batch C (W-18 / W-23): a stale `version` answers HTTP 409 STALE_VERSION with the current version in `data` */
        code: error.response?.data?.code,
        data: error.response?.data?.data,
      });
    }
  }
);

export const saveWorkerBasicProfileSlice = createAsyncThunk(
  "workers/saveWorkerBasicProfile",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await saveWorkerBasicProfile(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const updateWorkerDetailsSlice = createAsyncThunk(
  "workers/updateWorkerDetailsSlice",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await updateWorkerDetails(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
        /* batch C (W-18 / W-23): a stale `version` answers HTTP 409 STALE_VERSION with the current version in `data` */
        code: error.response?.data?.code,
        data: error.response?.data?.data,
        /* Contract Status rules (22 Oct 2026): the refused rules by field, { field: message } (invoice worker step) */
        errors: error.response?.data?.errors,
      });
    }
  }
);

export const saveWorkerConsulateSlice = createAsyncThunk(
  "workers/saveWorkerConsulate",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await saveWorkerConsulate(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const saveWorkerOverseasDetailSlice = createAsyncThunk(
  "workers/saveWorkerOverseasDetail",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await saveWorkerOverseasDetail(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occured",
      });
    }
  }
);

export const uploadIndoDocumentAfterPTAssignSlice = createAsyncThunk(
  "workers/uploadIndoDocumentAfterPTAssignSlice",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await uploadIndoDocumentAfterPTAssign(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occured",
      });
    }
  }
);

export const saveWorkerPassportDetail = createAsyncThunk(
  "workers/saveWorkerPassportDetail",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await saveWorkerPassportDetails(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const saveAssignPTWorker = createAsyncThunk(
  "workers/saveAssignPTWorker",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await assignPTWorker(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWorkerValidateStatus = createAsyncThunk(
  "workers/fetchWorkerValidateStatus",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerValidateStatus(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWorkerActivityLog = createAsyncThunk(
  "workers/fetchWorkerActivityLog",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerActivityLog(reqPayload);
      return response?.data?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWorkerMainActivityLog = createAsyncThunk(
  "workers/fetchWorkerMainActivityLog",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerMainActivityLog(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const saveWorkerValidateStatus = createAsyncThunk(
  "workers/saveWorkerValidateStatus",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await updateWorkerValidateStatus(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWorkerCommonDetailInfo = createAsyncThunk(
  "workers/fetchWorkerCommonStateInfo",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerAllStateInfo(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
        /* the record page separates an access denial (names nothing) from an unknown id */
        httpStatus: error.response?.status,
      });
    }
  }
);

export const fetchWorkerReferenceIdInitials = createAsyncThunk(
  "workers/fetchWorkerReferenceIdInitials",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerReferenceIdInitialsAPI(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWorkerPhotoInfo = createAsyncThunk(
  "workers/fetchWorkerPhotoInfo",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerAllStateInfo(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWorkerDetailTabInfo = createAsyncThunk(
  "workers/fetchWorkerDetailTabInfo",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerAllStateInfo(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWorkerDetailTabInfoPassport = createAsyncThunk(
  "workers/fetchWorkerDetailTabInfoPassport",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerAllStateInfo(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWorkerDetailTabInfoConsulate = createAsyncThunk(
  "workers/fetchWorkerDetailTabInfoConsulate",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerAllStateInfo(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWorkerDocumentUploadInfoInfo = createAsyncThunk(
  "workers/fetchWorkerDocumentUploadInfoInfo",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerAllStateInfo(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const updateWorkerProfileImage = createAsyncThunk(
  "workers/updateWorkerProfileImage",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await updateSaveWorkerProfileImage(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const deleteWorkerIndonesianDocument = createAsyncThunk(
  "workers/deleteWorkerIndonesianDocument",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await deleteWorkerIndonesianDocumentApi(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occured",
      });
    }
  }
);

export const updateUserContact = createAsyncThunk(
  "workers/updateUserContact",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await updateUserContactInfo(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const setPrimaryContact = createAsyncThunk(
  "workers/setPrimaryContact",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await setPrimaryContactInfo(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWorkerJobOfferDetails = createAsyncThunk(
  "workers/fetchWorkerJobOfferDetails",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerJobOfferDetails(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWorkerJobStatusList = createAsyncThunk(
  "workers/fetchWorkerJobStatusList",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerJobStatusList(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWorkerRefrenceIdInitals = createAsyncThunk(
  "workers/fetchWorkerRefrenceIdInitals",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerRefrenceIdInitals(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWorkerJobOfferList = createAsyncThunk(
  "workers/fetchWorkerJobOfferList",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerJobOfferList(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);


export const fetchWorkerCanStartDate = createAsyncThunk(
  "workers/fetchWorkerCanStartDate",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerCanStartDate(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const updateContractWorkerSlice = createAsyncThunk(
  "workers/updateContractWorkerSlice",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await updateContractWorker(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const workerJobOfferAcceptInterview = createAsyncThunk(
  "workers/workerJobOfferAcceptInterview",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await saveWorkerJobOfferAcceptInterview(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const workerManageSuggestedJob = createAsyncThunk(
  "workers/workerManageSuggestedJob",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await saveWorkerManageSuggestedJob(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

// On-behalf job actions (POST /manage-job): { worker_id, job_id, action: "apply" | "cancel_application" }
export const workerManageJob = createAsyncThunk(
  "workers/workerManageJob",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await saveWorkerManageJob(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const workerJobOfferCancelnterview = createAsyncThunk(
  "workers/workerJobOfferCancelnterview",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await saveWorkerJobOfferCancelInterview(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchDuplicateWorkerCount = createAsyncThunk(
  "workers/fetchDuplicateWorkerCount",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getDuplicateWorkerCount(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchDuplicateWorkers = createAsyncThunk(
  "workers/fetchDuplicateWorkers",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getDuplicateWorkers(reqPayload);
      return response.data.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const searchInterpreterStaff = createAsyncThunk(
  "workers/searchInterpreterStaff",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await searchInterpreterStaffAPI(reqPayload);
      return response.data.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const changeInterpreter = createAsyncThunk(
  "workers/changeInterpreter",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await changeInterpreterAPI(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const validateChangeUserGroupCsInterpreter = createAsyncThunk(
  "workers/validateChangeUserGroupCsInterpreter",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await chatvalidateChangeUserGroupCsInterpreter(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchInterviewCounts = createAsyncThunk(
  "workers/fetchInterviewCounts",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getInterviewCounts(reqPayload);
      return response?.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

export const fetchWorkerJobStatus = createAsyncThunk('workers/fetchWorkerJobStatus', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getWorkerJobStatus(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const qrBranchGenerateCode = createAsyncThunk(
  "workers/qrBranchGenerateCode",
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await qrBranchGenerateCodeAPI(reqPayload);
      //const responses = await qrBranchReGenerateCodeAPI(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "An error occurred",
      });
    }
  }
);

const workersSlice = createSlice({
  name: "workers",
  initialState: {
    workerRoles: [],
    allStatusList: [],
    activityLogList: [],
    mainActivityLogList: [],
    workerRefrenceIdInitals: [],
    workerStartDate: {},
    workersList: [],
    workerRefIdInitials: [],
    allWorkersList: null,
    workerJobOfferList: [],
    workerJobStatus: [],
    status: "success",
    error: null,
    currentPage: 1,
    perPage: 10,
    totalPages: 0,
    totalWorkers: 0,
    lastUpdated: "",
    message: null,
    workerDetail: null,
    workerProfileInfo: null,
    workerDetailTabInfo: null,
    workerDocumentUploadInfo: null,
    workerPhotoInfo: null,
    workerJobOfferDetails: null,
    jobStatusList: [],
    filtersData: {},
    workerDetailTabInfoPassport: null,
    workerDetailTabInfoConsulate: null,
    workerStatus: "success",
    duplicateWorkerCount: 0,
    duplicateWorkersList: [],
    matched_columns: [],
    totalInterviewCounts: null,
    branchQRCodeData: null,
  },
  reducers: {
    clearStateDetails(state) {
      state.workerDetail = null;
      state.workerProfileInfo = null;
      state.workerDetailTabInfo = null;
      state.workerDocumentUploadInfo = null;
      state.workerPhotoInfo = null;
      /* per-worker sub-tab payloads (SR-02): never carried over to the next record */
      state.workerDetailTabInfoPassport = null;
      state.workerDetailTabInfoConsulate = null;
      state.workerJobOfferDetails = null;
    },
    setFilters(state, action) {
      state.filtersData = action.payload;
    },
    clearFilters(state) {
      state.filtersData = {};
    },
    clearMessage(state) {
      state.message = null;
    },
    setWorkerLoading(state) {
      state.status = "loading";
    },
    clearWorkerLoading(state) {
      state.status = false;
    },
    clearWorkerDetail(state) {
      state.currentInvoiceWorkerDetail = null;
    },
    setInvoiceCurrentWorker(state, action) {
      state.currentInvoiceWorkerDetail = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkerRole.pending, handlePending)
      .addCase(fetchWorkerRole.fulfilled, handleWorkerRoleFulfilled)
      .addCase(fetchWorkerRole.rejected, handleRejected)
      .addCase(fetchWokerDetail.pending, handlePending)
      .addCase(fetchWokerDetail.fulfilled, handleWorkerDetailFulfilled)
      .addCase(fetchWokerDetail.rejected, handleRejected)

      .addCase(fetchWorkerCommonDetailInfo.pending, (state) => {
        state.status = 'loading';
        state.workerStatus = 'loading';
      })
      .addCase(fetchWorkerCommonDetailInfo.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.workerStatus = 'succeeded';
        state.workerProfileInfo = action.payload?.data ?? state.workerProfileInfo;
      })
      .addCase(fetchWorkerCommonDetailInfo.rejected, handleRejected)

      .addCase(fetchWorkerReferenceIdInitials.pending, handlePending)
      .addCase(fetchWorkerReferenceIdInitials.fulfilled, handleFetchWorkerRefIdInitialsFulfilled)
      .addCase(fetchWorkerReferenceIdInitials.rejected, handleRejected)
      .addCase(fetchWorkerDetailTabInfo.pending, handlePending)
      .addCase(fetchWorkerDetailTabInfo.fulfilled, handleWorkerDetailTabInfoFulfilled)
      .addCase(fetchWorkerDetailTabInfo.rejected, handleRejected)

      .addCase(fetchWorkerDetailTabInfoPassport.pending, handlePending)
      .addCase(fetchWorkerDetailTabInfoPassport.fulfilled, handleWorkerDetailTabInfoPassportFulfilled)
      .addCase(fetchWorkerDetailTabInfoPassport.rejected, handleRejected)

      .addCase(fetchWorkerDetailTabInfoConsulate.pending, handlePending)
      .addCase(fetchWorkerDetailTabInfoConsulate.fulfilled, handleWorkerDocumentUploadInfoConsulateFulfilled)
      .addCase(fetchWorkerDetailTabInfoConsulate.rejected, handleRejected)

      .addCase(fetchWorkerDocumentUploadInfoInfo.pending, handlePending)
      .addCase(fetchWorkerDocumentUploadInfoInfo.fulfilled, handleWorkerDocumentUploadInfoFulfilled)
      .addCase(fetchWorkerDocumentUploadInfoInfo.rejected, handleRejected)
      .addCase(fetchWorkerPhotoInfo.pending, handlePending)
      .addCase(fetchWorkerPhotoInfo.fulfilled, handleWorkerPhotoInfoFulfilled)
      .addCase(fetchWorkerPhotoInfo.rejected, handleRejected)
      .addCase(fetchWorkers.pending, handlePending)
      .addCase(fetchWorkers.fulfilled, handleGetWorkersFulfilled)
      .addCase(fetchWorkers.rejected, handleRejected)
      .addCase(updateWorkerStatus.pending, handlePending)
      .addCase(updateWorkerStatus.fulfilled, handleUpdateWorkerStatusFulfilled)
      .addCase(updateWorkerStatus.rejected, handleRejected)
      .addCase(updateWorkerProfileImage.pending, handlePending)
      .addCase(updateWorkerProfileImage.fulfilled, handleUpdateWorkerProfileImageFulfilled)
      .addCase(updateWorkerProfileImage.rejected, handleRejected)
      .addCase(saveWorkerBiodataSlice.pending, handlePending)
      .addCase(
        saveWorkerBiodataSlice.fulfilled,
        handleSaveWorkerBiodataFulfilled
      )
      .addCase(saveWorkerBiodataSlice.rejected, handleRejected)
      .addCase(saveWorkerBasicProfileSlice.pending, handlePending)
      .addCase(
        saveWorkerBasicProfileSlice.fulfilled,
        handleSaveWorkerBasicProfileFulfilled
      )
      .addCase(saveWorkerBasicProfileSlice.rejected, handleRejected)
      .addCase(saveWorkerConsulateSlice.pending, handlePending)
      .addCase(
        saveWorkerConsulateSlice.fulfilled,
        handleSaveWorkerConsulateFulfilled
      )
      .addCase(saveWorkerConsulateSlice.rejected, handleRejected)
      .addCase(saveWorkerPassportDetail.pending, handlePending)
      .addCase(
        saveWorkerPassportDetail.fulfilled,
        handleSaveWorkerConsulateFulfilled
      )
      .addCase(saveWorkerPassportDetail.rejected, handleRejected)
      .addCase(saveWorkerOverseasDetailSlice.pending, handlePending)
      .addCase(
        saveWorkerOverseasDetailSlice.fulfilled,
        handlesaveWorkerOverseasDetail
      )
      .addCase(saveWorkerOverseasDetailSlice.rejected, handleRejected)
      .addCase(saveAssignPTWorker.pending, handlePending)
      .addCase(
        saveAssignPTWorker.fulfilled,
        handlesaveAssignPTWorker
      )
      .addCase(saveAssignPTWorker.rejected, handleRejected)
      .addCase(fetchWorkerValidateStatus.pending, handlePending)
      .addCase(fetchWorkerValidateStatus.fulfilled, handleWorkerValidateStatusFulfilled)
      .addCase(fetchWorkerValidateStatus.rejected, handleRejected)
      .addCase(fetchWorkerActivityLog.pending, handlePending)
      .addCase(fetchWorkerActivityLog.fulfilled, handleWorkerActivityLogFulfilled)
      .addCase(fetchWorkerActivityLog.rejected, handleRejected)
      .addCase(fetchWorkerMainActivityLog.pending, handlePending)
      .addCase(fetchWorkerMainActivityLog.fulfilled, handleWorkerMainActivityLogFulfilled)
      .addCase(fetchWorkerMainActivityLog.rejected, handleRejected)
      .addCase(saveWorkerValidateStatus.pending, handlePending)
      .addCase(saveWorkerValidateStatus.fulfilled, handleSaveWorkerValidateStatusFulfilled)
      .addCase(saveWorkerValidateStatus.rejected, handleRejected)
      .addCase(deleteWorkerIndonesianDocument.pending, handlePending)
      .addCase(deleteWorkerIndonesianDocument.fulfilled, handleSaveWorkerValidateStatusFulfilled)
      .addCase(deleteWorkerIndonesianDocument.rejected, handleRejected)
      .addCase(updateUserContact.pending, handlePending)
      .addCase(updateUserContact.fulfilled, handleUpdateWorkerStatusFulfilled)
      .addCase(updateUserContact.rejected, handleRejected)
      .addCase(setPrimaryContact.pending, handlePending)
      .addCase(setPrimaryContact.fulfilled, handleUpdateWorkerStatusFulfilled)
      .addCase(setPrimaryContact.rejected, handleRejected)
      .addCase(fetchWorkerJobOfferDetails.pending, handlePending)
      .addCase(fetchWorkerJobOfferDetails.fulfilled, handleWorkerJobOfferDetailsFulfiled)
      .addCase(fetchWorkerJobOfferDetails.rejected, handleRejected)
      .addCase(fetchWorkerJobStatusList.pending, handlePending)
      .addCase(fetchWorkerJobStatusList.fulfilled, handleWorkerJobStatusListFulfilled)
      .addCase(fetchWorkerJobStatusList.rejected, handleRejected)
      .addCase(updateWorkerDetailsSlice.pending, handlePending)
      .addCase(
        updateWorkerDetailsSlice.fulfilled,
        handleUpdateWorkerDetailsSliceFulfilled
      )
      .addCase(updateWorkerDetailsSlice.rejected, handleRejected)
      .addCase(fetchWorkerRefrenceIdInitals.pending, handlePending)
      .addCase(fetchWorkerRefrenceIdInitals.fulfilled, (state, action) => {
        state.workerRefrenceIdInitals = action.payload;
      })
      .addCase(fetchWorkerRefrenceIdInitals.rejected, handleRejected)
      .addCase(fetchWorkerCanStartDate.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.workerStartDate = action.payload?.data ?? state.workerStartDate;
      })
      .addCase(fetchWorkerCanStartDate.rejected, handleRejected)
      .addCase(updateContractWorkerSlice.pending, handlePending)
      .addCase(updateContractWorkerSlice.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.message = action.payload?.message ?? state.message;
      })
      .addCase(updateContractWorkerSlice.rejected, handleRejected)
      .addCase(fetchWorkerJobOfferList.pending, handlePending)
      .addCase(fetchWorkerJobOfferList.fulfilled, handleGetWorkerJobOffersFulfilled)
      .addCase(fetchWorkerJobOfferList.rejected, handleRejected)
      .addCase(workerJobOfferAcceptInterview.pending, handlePending)
      .addCase(workerJobOfferAcceptInterview.fulfilled, workerJobOfferAcceptInterviewFulfilled)
      .addCase(workerJobOfferAcceptInterview.rejected, handleRejected)
      .addCase(workerJobOfferCancelnterview.pending, handlePending)
      .addCase(workerJobOfferCancelnterview.fulfilled, workerJobOfferCancelnterviewFulfilled)
      .addCase(workerJobOfferCancelnterview.rejected, handleRejected)
      .addCase(fetchWorkerOnboarding.pending, handlePending)
      .addCase(fetchWorkerOnboarding.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.workerOnboardingStaffs = action.payload?.data ?? state.workerOnboardingStaffs;
      })
      .addCase(fetchWorkerOnboarding.rejected, handleRejected)
      .addCase(updateWorkerOnboarding.pending, handlePending)
      .addCase(updateWorkerOnboarding.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.message = action.payload?.message ?? state.message;
      })
      .addCase(updateWorkerOnboarding.rejected, handleRejected)
      .addCase(workerManageSuggestedJob.pending, handlePending)
      .addCase(workerManageSuggestedJob.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.message = action.payload?.message ?? state.message;
      })
      .addCase(workerManageSuggestedJob.rejected, handleRejected)
      .addCase(workerManageJob.pending, handlePending)
      .addCase(workerManageJob.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.message = action.payload?.message ?? state.message;
      })
      .addCase(workerManageJob.rejected, handleRejected)
      .addCase(fetchDuplicateWorkerCount.pending, handlePending)
      .addCase(fetchDuplicateWorkerCount.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.duplicateWorkerCount = action.payload?.data?.count;
      }
      )
      .addCase(fetchDuplicateWorkerCount.rejected, handleRejected)
      .addCase(fetchDuplicateWorkers.pending, handlePending)
      .addCase(fetchDuplicateWorkers.fulfilled, handleGetDuplicateWorkersFulfilled)
      .addCase(fetchDuplicateWorkers.rejected, handleRejected)
      .addCase(searchInterpreterStaff.pending, handlePending)
      .addCase(searchInterpreterStaff.fulfilled, handleSearchInterpreterStaffFulfilled)
      .addCase(searchInterpreterStaff.rejected, handleRejected)
      .addCase(changeInterpreter.pending, handlePending)
      .addCase(changeInterpreter.fulfilled, handleChangeInterpreterFulfilled)
      .addCase(changeInterpreter.rejected, handleRejected)
      .addCase(validateChangeUserGroupCsInterpreter.pending, handlePending)
      .addCase(validateChangeUserGroupCsInterpreter.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(validateChangeUserGroupCsInterpreter.rejected, handleRejected)
      .addCase(fetchInterviewCounts.pending, handlePending)
      .addCase(fetchInterviewCounts.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.totalInterviewCounts = action.payload?.data ?? state.totalInterviewCounts;
      })
      .addCase(fetchInterviewCounts.rejected, handleRejected)
      .addCase(fetchWorkerJobStatus.pending, handlePending)
      .addCase(fetchWorkerJobStatus.fulfilled, haneleFetchWorkerJobStatusFulfilled)
      .addCase(fetchWorkerJobStatus.rejected, handleRejected)
      .addCase(qrBranchGenerateCode.pending, handlePending)
      .addCase(qrBranchGenerateCode.fulfilled, handleQRBranchGenerateCodeFulfilled)
      .addCase(qrBranchGenerateCode.rejected, handleRejected);
  },
});

export const { clearMessage, setWorkerLoading, clearWorkerLoading, clearStateDetails, setInvoiceCurrentWorker, clearWorkerDetail, setFilters, clearFilters } =
  workersSlice.actions;

export default workersSlice.reducer;
