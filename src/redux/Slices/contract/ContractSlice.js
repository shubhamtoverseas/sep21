import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { handlePending, handleRejected } from '../common/extra-reducers/commonExtraReducers';
import { handleFetchContractDetailssFulfilled, handleFetchContractDetailsRejected, handleFetchEmpContractsFulfilled, handleFetchContractsFulfilled } from './contractExtraReducers';
import { fetchContractDetailsAPI, getEmpContracts, getContracts, getContractInvoiceStatus, getContractCategory } from '../../../services/contracts';

export const fetchEmpContracts = createAsyncThunk('contracts/fetchEmpContracts', async (reqPayload) => {
  const response = await getEmpContracts(reqPayload);
  return response.data.data;
});

export const fetchContractDetailsById = createAsyncThunk('contract/fetchContractDetailsById', async (contractId, { rejectWithValue }) => {
  try {
    const response = await fetchContractDetailsAPI(contractId);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response.data);
  }
});

export const fetchContracts = createAsyncThunk('contracts/fetchContracts', async (reqPayload) => {
  const response = await getContracts(reqPayload);
  return response.data.data;
});

export const fetchContractInvoiceStatus = createAsyncThunk('contracts/fetchContractInvoiceStatus', async (reqPayload) => {
  const response = await getContractInvoiceStatus(reqPayload);
  return response.data.data;
});

export const fetchContractCategory = createAsyncThunk('contracts/fetchContractCategory', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getContractCategory(reqPayload);
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data);
  }
});

const contractsSlice = createSlice({
  name: 'contracts',
  initialState: {
    empContracts: [],
    contractDetails: {},
    contractDetailsError: null,   /* null = no error; '' or the server message after a failed details read */
    contractInvoiceStatus: [],
    contractCategoryLists: [],
    contracts: [],
    status: 'success',
    error: null,
    message: null,
    currentPage: 1,
    perPage: 10,
    totalPages: 0,
    total: 0,
    lastUpdated: '',
    filters: {
      search_text: '',
      contract_invoice_status: [],
      worker_type: [],
      nationality: [],
      worker_contract_status: [],
      worker_reference_id: [],
      worker_current_location: '',
      branch_id: '',
      staff_id: '',
      start_date: '',
      end_date: ''
    },
  },
  reducers: {
    clearMessage(state) {
      state.message = null;
    },
    setFilters(state, action) {
      state.filters = action.payload;
    },
    resetFilters(state) {
      state.filters = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmpContracts.pending, handlePending)
      .addCase(fetchEmpContracts.fulfilled, handleFetchEmpContractsFulfilled)
      .addCase(fetchEmpContracts.rejected, handleRejected)
      .addCase(fetchContractDetailsById.pending, handlePending)
      .addCase(fetchContractDetailsById.fulfilled, handleFetchContractDetailssFulfilled)
      .addCase(fetchContractDetailsById.rejected, handleFetchContractDetailsRejected)
      .addCase(fetchContracts.pending, handlePending)
      .addCase(fetchContracts.fulfilled, handleFetchContractsFulfilled)
      .addCase(fetchContracts.rejected, handleRejected)
      .addCase(fetchContractInvoiceStatus.pending, handlePending)
      .addCase(fetchContractInvoiceStatus.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.contractInvoiceStatus = action.payload;
      })
      .addCase(fetchContractInvoiceStatus.rejected, handleRejected)
      .addCase(fetchContractCategory.fulfilled, (state, action) => {
        state.contractCategoryLists = action.payload;
      })
      .addCase(fetchContractCategory.rejected, (state) => {
        state.contractCategoryLists = [];
      });
  },
});

export const { clearMessage, setFilters, resetFilters } = contractsSlice.actions;

export default contractsSlice.reducer;
