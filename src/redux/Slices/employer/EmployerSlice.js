import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  handleAddEmpCurrentWorkerFulfilled,
  handleAddEmployerAddressFulfilled,
  handleDefaultEmpAddressFulfilled,
  handleDeleteEmpAddressFulfilled,
  handleDFetchWorkerFulfilled,
  handleEmployerAddressListFulfilled,
  handleFetchEmployerFulfilled,
  handleFetchEmployersFulfilled,
  handleSpokenLanguageFulfilled,
  handleUpdateEmpCurrentWorkerFulfilled,
  handleSaveEmpInfoFulfilled,
  handleEmpJobOffersFulfilled,
  handleUpdateEmployerAddressFulfilled,
  handleAddEmployerFulfilled,
  handleSendOtpFulfilled,
  handleDeleteEmpCurrentWorkerFulfilled,
  handleUpdateEmpBasicFulfilled,
  handleFetchDuplicateEmployersFulfilled,
  handleUpdateEmployerBanOrRemoveStatusFulfilled
} from './employerExtraReducers';
import { handlePending, handleRejected } from '../common/extra-reducers/commonExtraReducers';
import {
  addNewEmpCurrentWorker,
  addNewEmployerAddress,
  deleteCurrentWorker,
  deleteEmpAddressById,
  employerAddresses,
  fetchCurrentWorker,
  getEmpEmployers,
  getEmployerDetail,
  getSpokenLanguage,
  setDefautlEmpAddress,
  updateEmpAddress,
  updateNewEmpCurrentWorker,
  getEmpEmployerJobOffers,
  addNewEmployer,
  otpSend,
  saveNewEmpFamilyInfo,
  editEmployerBasic,
  getEmployerActivityLog,
  getDuplicateEmployerCount,
  getDuplicatesEmployer,
  getDuplicatesJobsCount,
  updateEmployerBanOrRemoveStatusAPI
} from '../../../services/employers';

export const fetchEmployers = createAsyncThunk('employers/fetchEmployers', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getEmpEmployers(reqPayload);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchEmployerJobOffers = createAsyncThunk('employers/fetchEmployerJobOffers', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getEmpEmployerJobOffers(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchEmployerDetail = createAsyncThunk('employers/fetchEmployerDetail', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getEmployerDetail(reqPayload);
    return response.data;
  } catch (error) {
    const body = error.response?.data;
    const httpStatus = error.response?.status;
    return rejectWithValue(body && typeof body === 'object' ? { ...body, httpStatus } : { message: body, httpStatus });
  }
});

export const addEmployer = createAsyncThunk('employers/addEmployer', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await addNewEmployer(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const addEmployerAddress = createAsyncThunk('employers/addEmployerAddress', async (params, { rejectWithValue }) => {
  try {
    const response = await addNewEmployerAddress(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateEmployerAddress = createAsyncThunk('employers/updateEmployerAddress', async (params, { rejectWithValue }) => {
  try {
    const response = await updateEmpAddress(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const addEmpCurrentWorker = createAsyncThunk('employers/addEmpCurrentWorker', async (addressData, { rejectWithValue }) => {
  try {
    const response = await addNewEmpCurrentWorker(addressData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const removeCurrentWorker = createAsyncThunk('employers/removeCurrentWorker', async (addressData, { rejectWithValue }) => {
  try {
    const response = await deleteCurrentWorker(addressData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateEmpCurrentWorker = createAsyncThunk('employers/updateEmpCurrentWorker', async (addressData, { rejectWithValue }) => {
  try {
    const response = await updateNewEmpCurrentWorker(addressData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const employerAddressList = createAsyncThunk(
  'employers/employerAddressList',
  async (addressData, { rejectWithValue }) => {
    try {
      const response = await employerAddresses(addressData);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const deleteEmpAddress = createAsyncThunk('employers/deleteEmpAddress', async (addressId, { rejectWithValue }) => {
  try {
    const response = await deleteEmpAddressById(addressId);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const setEmpAddressPrimary = createAsyncThunk('employers/setEmpAddressPrimary', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await setDefautlEmpAddress(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const sendOtp = createAsyncThunk('employers/sendOtp', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await otpSend(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchCurrentWorkers = createAsyncThunk(
  'employers/fetchCurrentWorkers',
  async (params, { rejectWithValue }) => {
    try {
      const response = await fetchCurrentWorker(params);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const fetchSpokenLanguage = createAsyncThunk(
  'employers/fetchSpokenLanguage',
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getSpokenLanguage(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const saveEmployerFamilyInfo = createAsyncThunk('employers/saveEmployerFamilyInfo', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await saveNewEmpFamilyInfo(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateEmployerBasic = createAsyncThunk('employers/updateEmployerBasic', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await editEmployerBasic(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateEmployerBanOrRemoveStatus = createAsyncThunk('employers/updateEmployerBanOrRemoveStatus', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await updateEmployerBanOrRemoveStatusAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchEmployerActivityLog = createAsyncThunk("processings/fetchEmployerActivityLog", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getEmployerActivityLog(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
}
);

export const fetchDuplicateEmployerCount = createAsyncThunk("processings/fetchDuplicateEmployerCount", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getDuplicateEmployerCount(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
}
);

export const fetchDuplicatesEmployer = createAsyncThunk("processings/fetchDuplicatesEmployer", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getDuplicatesEmployer(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
}
);

export const fetchDuplicatesJobsCount = createAsyncThunk("processings/fetchDuplicatesJobsCount", async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getDuplicatesJobsCount(reqPayload);
    return response?.data;
  } catch (error) {
    return rejectWithValue({
      message: error.response?.data?.message || "An error occurred",
    });
  }
}
);

const employersSlice = createSlice({
  name: 'employers',
  initialState: {
    employers: [],
    addresses: [],
    empJobOffers: [],
    currentWorkers: [],
    spokenLanguages: [],
    status: 'success',
    error: null,
    currentEmployer: null,
    currentPage: 1,
    perPage: 10,
    totalPages: 0,
    totalEmployers: 0,
    totalAccessible: 0,
    lastUpdated: '',
    message: null,
    currentInvoiceEmployerDetail: null,
    filters: { limit: 10, page: 1 },
    currentInvoiceLocalInfo: {},
    duplicateEmployerCount: 0,
    duplicateEmployers: [],
    employerIDs: [],
    duplicateJobsCount: 0,
    invoiceCurrentJobInfo: {}
  },
  reducers: {
    clearCurrentEmployer(state) {
      state.currentEmployer = null
      state.currentInvoiceEmployerDetail = null
      /* audit D-01 (SR-06): the next record must not show this employer's Job Offers while its own list loads */
      state.empJobOffers = []
    },
    setInvoiceCurrentEmployer(state, action) {
      state.currentInvoiceEmployerDetail = action.payload;
    },
    setInvoiceCurrentJobInfo(state, action) {
      state.invoiceCurrentJobInfo = action.payload;
    },
    clearInvoiceCurrentJobInfo(state) {
      state.invoiceCurrentJobInfo = {};
    },
    clearInvoiceLocalInfo(state) {
      state.currentInvoiceLocalInfo = {};
    },
    setInvoiceLocalInfo(state, action) {
      state.currentInvoiceLocalInfo = action.payload;
    },
    setFilters(state, action) {
      state.filters = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployers.pending, handlePending)
      .addCase(fetchEmployers.fulfilled, handleFetchEmployersFulfilled)
      .addCase(fetchEmployers.rejected, handleRejected)
      .addCase(fetchDuplicatesEmployer.pending, handlePending)
      .addCase(fetchDuplicatesEmployer.fulfilled, handleFetchDuplicateEmployersFulfilled)
      .addCase(fetchDuplicatesEmployer.rejected, handleRejected)

      .addCase(fetchDuplicateEmployerCount.pending, handlePending)
      .addCase(fetchDuplicateEmployerCount.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.duplicateEmployerCount = action.payload?.data?.count;
      })
      .addCase(fetchDuplicateEmployerCount.rejected, handleRejected)
      .addCase(fetchEmployerJobOffers.pending, handlePending)
      .addCase(fetchEmployerJobOffers.fulfilled, handleEmpJobOffersFulfilled)
      .addCase(fetchEmployerJobOffers.rejected, handleRejected)
      .addCase(fetchEmployerDetail.pending, handlePending)
      .addCase(fetchEmployerDetail.fulfilled, handleFetchEmployerFulfilled)
      .addCase(fetchEmployerDetail.rejected, handleRejected)
      .addCase(addEmployerAddress.pending, handlePending)
      .addCase(addEmployerAddress.fulfilled, handleAddEmployerAddressFulfilled)
      .addCase(addEmployerAddress.rejected, handleRejected)
      .addCase(addEmployer.pending, handlePending)
      .addCase(addEmployer.fulfilled, handleAddEmployerFulfilled)
      .addCase(addEmployer.rejected, handleRejected)
      .addCase(updateEmployerAddress.pending, handlePending)
      .addCase(updateEmployerAddress.fulfilled, handleUpdateEmployerAddressFulfilled)
      .addCase(updateEmployerAddress.rejected, handleRejected)
      .addCase(addEmpCurrentWorker.pending, handlePending)
      .addCase(addEmpCurrentWorker.fulfilled, handleAddEmpCurrentWorkerFulfilled)
      .addCase(addEmpCurrentWorker.rejected, handleRejected)
      .addCase(removeCurrentWorker.pending, handlePending)
      .addCase(removeCurrentWorker.fulfilled, handleDeleteEmpCurrentWorkerFulfilled)
      .addCase(removeCurrentWorker.rejected, handleRejected)
      .addCase(updateEmpCurrentWorker.pending, handlePending)
      .addCase(updateEmpCurrentWorker.fulfilled, handleUpdateEmpCurrentWorkerFulfilled)
      .addCase(updateEmpCurrentWorker.rejected, handleRejected)
      .addCase(employerAddressList.pending, handlePending)
      .addCase(employerAddressList.fulfilled, handleEmployerAddressListFulfilled)
      .addCase(employerAddressList.rejected, handleRejected)
      .addCase(deleteEmpAddress.pending, handlePending)
      .addCase(deleteEmpAddress.fulfilled, handleDeleteEmpAddressFulfilled)
      .addCase(deleteEmpAddress.rejected, handleRejected)
      .addCase(setEmpAddressPrimary.pending, handlePending)
      .addCase(setEmpAddressPrimary.fulfilled, handleDefaultEmpAddressFulfilled)
      .addCase(setEmpAddressPrimary.rejected, handleRejected)
      .addCase(fetchCurrentWorkers.pending, handlePending)
      .addCase(fetchCurrentWorkers.fulfilled, handleDFetchWorkerFulfilled)
      .addCase(fetchCurrentWorkers.rejected, handleRejected)
      .addCase(fetchSpokenLanguage.pending, handlePending)
      .addCase(fetchSpokenLanguage.fulfilled, handleSpokenLanguageFulfilled)
      .addCase(fetchSpokenLanguage.rejected, handleRejected)
      .addCase(saveEmployerFamilyInfo.pending, handlePending)
      .addCase(saveEmployerFamilyInfo.fulfilled, handleSaveEmpInfoFulfilled)
      .addCase(saveEmployerFamilyInfo.rejected, handleRejected)
      .addCase(sendOtp.pending, handlePending)
      .addCase(sendOtp.fulfilled, handleSendOtpFulfilled)
      .addCase(sendOtp.rejected, handleRejected)
      .addCase(updateEmployerBasic.pending, handlePending)
      .addCase(updateEmployerBasic.fulfilled, handleUpdateEmpBasicFulfilled)
      .addCase(updateEmployerBasic.rejected, handleRejected)
      .addCase(updateEmployerBanOrRemoveStatus.pending, handlePending)
      .addCase(updateEmployerBanOrRemoveStatus.fulfilled, handleUpdateEmployerBanOrRemoveStatusFulfilled)
      .addCase(updateEmployerBanOrRemoveStatus.rejected, handleRejected)
      .addCase(fetchEmployerActivityLog.pending, handlePending)
      /* the activity tab reads the thunk result; nothing is kept in the slice (audit P-42) */
      .addCase(fetchEmployerActivityLog.fulfilled, (state) => { state.status = 'succeeded'; })
      .addCase(fetchEmployerActivityLog.rejected, handleRejected)
      .addCase(fetchDuplicatesJobsCount.pending, handlePending)
      .addCase(fetchDuplicatesJobsCount.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.duplicateJobsCount = action.payload?.data?.count;
      })
      .addCase(fetchDuplicatesJobsCount.rejected, handleRejected);

  },
});

export const { clearCurrentEmployer, setInvoiceCurrentEmployer,
  setFilters, setInvoiceLocalInfo, clearInvoiceLocalInfo, setInvoiceCurrentJobInfo, clearInvoiceCurrentJobInfo } = employersSlice.actions;

export default employersSlice.reducer;
