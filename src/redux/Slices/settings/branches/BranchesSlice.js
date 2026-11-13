import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  handleFetchBranchesFulfilled,
  handleFetchMappingBranchesFulfilled,
  handleFetchMappingBranchesPending,
  handleAddBranchFulfilled,
  handleFetchBranchByIdFulfilled,
  handleUpdateBranchFulfilled,
  handleFetchBranchesByAgencyIdFulfilled,
  handleFetchActiveBranchesFulfilled,
  handleBranchesByPartnerStaffIdFulfilled,
} from './branchesExtraReducers';
import {
  addNewBranch,
  getActiveBranches,
  getBranchById,
  getBranches,
  getMappingBranches,
  updateBranchById,
  getBranchesByAgencyId,
  getBranchesByPartnerStaffIdAPI,
} from '../../../../services/branches';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';

export const fetchBranches = createAsyncThunk('branches/fetchBranches', async (params, { rejectWithValue }) => {
  try {
    const response = await getBranches(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response.data);
  }
});

export const fetchBranchesByPartnerStaffId = createAsyncThunk('branches/fetchBranchesByPartnerStaffId', async (params, { rejectWithValue }) => {
  try {
    const response = await getBranchesByPartnerStaffIdAPI(params);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response.data);
  }
});

export const fetchMappingBranches = createAsyncThunk('agencies/fetchMappingBranches', async (params, { rejectWithValue }) => {
  try {
    const response = await getMappingBranches(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response.data);
  }
});

export const fetchActiveBranches = createAsyncThunk('branches/fetchActiveBranches', async (params, { rejectWithValue }) => {
  try {
    const response = await getActiveBranches(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const addBranch = createAsyncThunk('branches/addBranch', async (branchData, { rejectWithValue }) => {
  try {
    const response = await addNewBranch(branchData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchBranchById = createAsyncThunk('branches/fetchBranchById', async (id, { rejectWithValue }) => {
  try {
    const response = await getBranchById(id);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateBranch = createAsyncThunk('branches/updateBranch', async (branchData, { rejectWithValue }) => {
  try {
    const response = await updateBranchById(branchData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchBranchesByAgencyId = createAsyncThunk('branches/fetchBranchesByAgencyId', async (params, { rejectWithValue }) => {
  try {
    const response = await getBranchesByAgencyId(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

const branchesSlice = createSlice({
  name: 'branches',
  initialState: {
    branches: [],
    branchesOrder: [],
    mappingBranches: [],
    invoiceBranches: [],
    contractInvoiceBranches: [],
    currentAgencyBranches: [],
    currentActiveBranches: [],
    status: 'idle',
    error: null,
    currentBranch: null,
    message: null,
    currentPage: 1,
    perPage: 10,
    totalPages: 0,
    totalBranches: 0,
    lastUpdated: '',
    branchesByPartnerStaffId: [],
  },
  reducers: {
    clearMessage(state) {
      state.message = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBranches.pending, handlePending)
      .addCase(fetchBranches.fulfilled, handleFetchBranchesFulfilled)
      .addCase(fetchBranches.rejected, handleRejected)
      .addCase(fetchBranchesByPartnerStaffId.pending, handlePending)
      .addCase(fetchBranchesByPartnerStaffId.fulfilled, handleBranchesByPartnerStaffIdFulfilled)
      .addCase(fetchBranchesByPartnerStaffId.rejected, handleRejected)
      .addCase(fetchMappingBranches.pending, handleFetchMappingBranchesPending)
      .addCase(fetchMappingBranches.fulfilled, handleFetchMappingBranchesFulfilled)
      .addCase(fetchMappingBranches.rejected, handleRejected)
      .addCase(fetchActiveBranches.pending, handlePending)
      .addCase(fetchActiveBranches.fulfilled, handleFetchActiveBranchesFulfilled)
      .addCase(fetchActiveBranches.rejected, handleRejected)
      .addCase(addBranch.pending, handlePending)
      .addCase(addBranch.fulfilled, handleAddBranchFulfilled)
      .addCase(addBranch.rejected, handleRejected)
      .addCase(fetchBranchById.pending, handlePending)
      .addCase(fetchBranchById.fulfilled, handleFetchBranchByIdFulfilled)
      .addCase(fetchBranchById.rejected, handleRejected)
      .addCase(updateBranch.pending, handlePending)
      .addCase(updateBranch.fulfilled, handleUpdateBranchFulfilled)
      .addCase(updateBranch.rejected, handleRejected)
      .addCase(fetchBranchesByAgencyId.pending, handlePending)
      .addCase(fetchBranchesByAgencyId.fulfilled, handleFetchBranchesByAgencyIdFulfilled)
      .addCase(fetchBranchesByAgencyId.rejected, handleRejected);
  },
});

export const { clearMessage } = branchesSlice.actions;
export default branchesSlice.reducer;
