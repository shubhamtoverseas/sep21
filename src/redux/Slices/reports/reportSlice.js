import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { handlePending, handleRejected } from '../common/extra-reducers/commonExtraReducers';

import { getJobOfferCreatedByList, getReportOfContractList, getReportOfInsuranceList, getReportOfJobOfferList } from '../../../services/reports';
import { fetchJobOfferCreatedByListFulfilled, fetchReportOfContractListFulfilled, fetchReportOfInsuranceListFulfilled, fetchReportOfJobOfferListFulfilled } from './reportExtraReducers';

export const fetchReportOfJobOfferList = createAsyncThunk(
  'reports/fetchReportOfJobOfferList',
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getReportOfJobOfferList(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const fetchReportOfInsuranceList = createAsyncThunk(
  'reports/fetchReportOfInsuranceList',
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getReportOfInsuranceList(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const fetchReportOfContractList = createAsyncThunk(
  'reports/fetchReportOfContractList',
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getReportOfContractList(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const fetchJobOfferCreatedByList = createAsyncThunk(
  'reports/fetchJobOfferCreatedByList',
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getJobOfferCreatedByList(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

const initialState = {
  jobOfferCreatedByList: [],
  jobOfferList: [],
  currentPage: 1,
  totalPages: 1,
  totalJobOfferReports: 0,
  perPage: 10,
  lastUpdated: null,
  status: 'idle',
  error: null,
  insuranceReportList: [],
  insuranceCurrentPage: 1,
  insurancePerPage: 10,
  insuranceTotalPages: 1,
  totalInsuranceReports: 0,
  insuranceLastUpdated: null,
  contractReportList: [],
  contractLastUpdated: null,
  contractTotalPages: 1,
  contractCurrentPage: 1,
  contractPerPage: 10,
  totalContractReports: 0,
  jobOfferFiltersData: {
    page: 1,
    limit: 10,
    branch_id: [],
    cs_owner_id: [],
    created_by: [],
    search_from_date: '',
    search_to_date: '',
    selected_date_range_type: 'auto',
  },
  insuranceReportFiltersData: {
    page: 1,
    limit: 10,
    expiry_from_date: '',
    expiry_to_date: '',
    effective_from_date: '',
    effective_to_date: '',
    branch_id: [],
    staff_id: [],
    type: [],
  },
  contractReportFiltersData: {
    page: 1,
    limit: 10,
    contract_from_date: '',
    contract_to_date: '',
    visa_expiry_from_date: '',
    visa_expiry_to_date: '',
    group: [],
    status: [],
    contract_type: [],
    nationality: [],
    contract_status: [],
    worker_reference_id: [],
    worker_current_location: [],
    branch_id: [],
    staff_id: [],
  },
  consolidatedLedgerReportFiltersData: {
    page: 1,
    limit: 10,
  }
}

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setJobOfferFilters: (state, action) => {
      state.jobOfferFiltersData = { ...state.jobOfferFiltersData, ...action.payload };
    },
    clearJobOfferFilters: (state) => {
      state.jobOfferFiltersData = initialState.jobOfferFiltersData;
    },
    setInsuranceReportFilters: (state, action) => {
      state.insuranceReportFiltersData = { ...state.insuranceReportFiltersData, ...action.payload };
    },
    clearInsuranceReportFilters: (state) => {
      state.insuranceReportFiltersData = initialState.insuranceReportFiltersData;
    },
    setContractReportFilters: (state, action) => {
      state.contractReportFiltersData = { ...state.contractReportFiltersData, ...action.payload };
    },
    clearContractReportFilters: (state) => {
      state.contractReportFiltersData = initialState.contractReportFiltersData;
    },
    setConsolidatedLedgerFilters: (state, action) => {
      state.consolidatedLedgerReportFiltersData = { ...state.consolidatedLedgerReportFiltersData, ...action.payload };
    },
    clearConsolidatedLedgerFilters: (state) => {
      state.consolidatedLedgerReportFiltersData = initialState.consolidatedLedgerReportFiltersData;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setPerPage: (state, action) => {
      state.perPage = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportOfJobOfferList.pending, handlePending)
      .addCase(fetchReportOfJobOfferList.fulfilled, fetchReportOfJobOfferListFulfilled)
      .addCase(fetchReportOfJobOfferList.rejected, handleRejected)
      .addCase(fetchReportOfInsuranceList.pending, handlePending)
      .addCase(fetchReportOfInsuranceList.fulfilled, fetchReportOfInsuranceListFulfilled)
      .addCase(fetchReportOfInsuranceList.rejected, handleRejected)
       .addCase(fetchReportOfContractList.pending, handlePending)
      .addCase(fetchReportOfContractList.fulfilled, fetchReportOfContractListFulfilled)
      .addCase(fetchReportOfContractList.rejected, handleRejected)
      .addCase(fetchJobOfferCreatedByList.pending, handlePending)
      .addCase(fetchJobOfferCreatedByList.fulfilled, fetchJobOfferCreatedByListFulfilled)
      .addCase(fetchJobOfferCreatedByList.rejected, handleRejected)
  },
});

export const {
  setJobOfferFilters,
  clearJobOfferFilters,
  setInsuranceReportFilters,
  clearInsuranceReportFilters,
  setContractReportFilters,
  clearContractReportFilters,
  setConsolidatedLedgerFilters,
  clearConsolidatedLedgerFilters,
  setCurrentPage,
  setPerPage
} = reportsSlice.actions;

export default reportsSlice.reducer;
