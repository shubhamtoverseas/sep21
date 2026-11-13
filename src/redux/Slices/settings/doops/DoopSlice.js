import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handleAddDoopFulfilled, handleFetchDoopByIdFulfilled, handleFetchDoopsFulfilled, handleUpdateDoopFulfilled } from './doopsExtraReducers';
import { addNewDoop, getDoopById, getDoops, updateDoopById } from '../../../../services/doops';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';

export const fetchDoops = createAsyncThunk('doops/fetchDoops', async (params, { rejectWithValue }) => {
  try {
    const response = await getDoops(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const addDoop = createAsyncThunk('doops/addDoop', async (doopData, { rejectWithValue }) => {
  try {
    const response = await addNewDoop(doopData);
    return response.data;
  }
  catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchDoopById = createAsyncThunk('doops/fetchDoopById', async (id, { rejectWithValue }) => {
  try {
    const response = await getDoopById(id);
    return response.data;
  }
  catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateDoop = createAsyncThunk('doops/updateDoop', async (doopData, { rejectWithValue }) => {
  try {
    const response = await updateDoopById(doopData);
    return response.data;
  }
  catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});


const doopsSlice = createSlice({
  name: 'doops',
  initialState: {
    doops: [],
    doopsOrder: [],
    status: 'idle',
    error: null,
    currentDoop: null,
    message: null,
    currentPage: 1,
    perPage: 10,
    totalPages: 0,
    totalDoops: 0,
    lastUpdated: '',
  },
  reducers: {
    clearMessage(state) {
      state.message = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoops.pending, handlePending)
      .addCase(fetchDoops.fulfilled, handleFetchDoopsFulfilled)
      .addCase(fetchDoops.rejected, handleRejected)
      .addCase(addDoop.pending, handlePending)
      .addCase(addDoop.fulfilled, handleAddDoopFulfilled)
      .addCase(addDoop.rejected, handleRejected)
      .addCase(fetchDoopById.pending, handlePending)
      .addCase(fetchDoopById.fulfilled, handleFetchDoopByIdFulfilled)
      .addCase(fetchDoopById.rejected, handleRejected)
      .addCase(updateDoop.pending, handlePending)
      .addCase(updateDoop.fulfilled, handleUpdateDoopFulfilled)
      .addCase(updateDoop.rejected, handleRejected);
  },
});

export const { clearMessage } = doopsSlice.actions;
export default doopsSlice.reducer;
