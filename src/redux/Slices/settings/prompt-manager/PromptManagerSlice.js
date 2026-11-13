import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';
import { getPromptManagerListAPI, createPromptManagerAPI, updatePromptManagerAPI, deletePromptManagerAPI, togglePromptManagerAPI } from '../../../../services/settings/promptManager';
import { handleFetchPromptManagerList } from './promptManagerExtraReducers';

export const fetchPromptManagerList = createAsyncThunk('promptManager/fetchPromptManagerList', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getPromptManagerListAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const createPromptManager = createAsyncThunk('promptManager/createPromptManager', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await createPromptManagerAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updatePromptManager = createAsyncThunk('promptManager/updatePromptManager', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await updatePromptManagerAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const deletePromptManager = createAsyncThunk('promptManager/deletePromptManager', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await deletePromptManagerAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const togglePromptManager = createAsyncThunk('promptManager/togglePromptManager', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await togglePromptManagerAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

const promptManagerSlice = createSlice({
  name: 'promptManager',
  initialState: {
    promptManagerList: {},
    currentPage: 1,
    perPage: 1,
    totalPages: 0,
    lastPage: 0,
    totalCount: 0,
    lastUpdate: '',
    status: 'success',
    error: null,
    promptManagerClinicDetails: [],
    message: null,
  },
  reducers: {
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPromptManagerList.pending, handlePending)
      .addCase(fetchPromptManagerList.fulfilled, handleFetchPromptManagerList)
      .addCase(fetchPromptManagerList.rejected, handleRejected)
      .addCase(createPromptManager.pending, handlePending)
      .addCase(createPromptManager.fulfilled, (state, action) => {
        state.status = 'success';
        state.message = action.payload?.message || 'Prompt Manager created successfully';
      })
      .addCase(createPromptManager.rejected, handleRejected)
      .addCase(updatePromptManager.pending, handlePending)
      .addCase(updatePromptManager.fulfilled, (state, action) => {
        state.status = 'success';
        state.message = action.payload?.message || 'Prompt Manager updated successfully';
      })
      .addCase(updatePromptManager.rejected, handleRejected)
      .addCase(deletePromptManager.pending, handlePending)
      .addCase(deletePromptManager.fulfilled, (state, action) => {
        state.status = 'success';
        state.message = action.payload?.message || 'Prompt Manager deleted successfully';
      })
      .addCase(deletePromptManager.rejected, handleRejected)
      .addCase(togglePromptManager.pending, handlePending)
      .addCase(togglePromptManager.fulfilled, (state, action) => {
        state.status = 'success';
        state.message = action.payload?.message || 'Prompt Manager status updated successfully';
      })
      .addCase(togglePromptManager.rejected, handleRejected);
  },
});


export default promptManagerSlice.reducer;
