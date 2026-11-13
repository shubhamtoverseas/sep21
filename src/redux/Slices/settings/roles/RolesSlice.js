import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getRoles,
  addNewRole,
  getRoleById,
  updateRoleById
} from '../../../../services/roles';
import {
  handleAddRoleFulfilled,
  handleFetchRolesFulfilled,
  handleFetchRoleByIdFulfilled,
  handleUpdateRoleFulfilled
} from './rolesExtraReducers';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';

export const fetchRoles = createAsyncThunk('roles/fetchRoles', async (params, { rejectWithValue }) => {
  try {
    const response = await getRoles(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const addRole = createAsyncThunk('roles/addRole', async (roleData, { rejectWithValue }) => {
  try {
    const response = await addNewRole(roleData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchRoleById = createAsyncThunk('roles/fetchRoleById', async (id, { rejectWithValue }) => {
  try {
    const response = await getRoleById(id);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateRole = createAsyncThunk('roles/updateRole', async (roleData, { rejectWithValue }) => {
  try {
    const response = await updateRoleById(roleData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

const rolesSlice = createSlice({
  name: 'roles',
  initialState: {
    roles: [],
    rolesOrder: [],
    status: 'idle',
    error: null,
    currentRole: null,
    currentPage: 1,
    perPage: 10,
    totalPages: 0,
    totalRoles: 0,
    lastUpdated: '',
    message: null,
  },
  reducers: {
    clearMessage(state) {
      state.message = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoles.pending, handlePending)
      .addCase(fetchRoles.fulfilled, handleFetchRolesFulfilled)
      .addCase(fetchRoles.rejected, handleRejected)
      .addCase(addRole.pending, handlePending)
      .addCase(addRole.fulfilled, handleAddRoleFulfilled)
      .addCase(addRole.rejected, handleRejected)
      .addCase(fetchRoleById.pending, handlePending)
      .addCase(fetchRoleById.fulfilled, handleFetchRoleByIdFulfilled)
      .addCase(fetchRoleById.rejected, handleRejected)
      .addCase(updateRole.pending, handlePending)
      .addCase(updateRole.fulfilled, handleUpdateRoleFulfilled)
      .addCase(updateRole.rejected, handleRejected);
  },
});

export const { clearMessage } = rolesSlice.actions;

export default rolesSlice.reducer;
