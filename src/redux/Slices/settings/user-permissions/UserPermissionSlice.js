import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';
import {
  handleFetchUserPermissionsFulfilled,
  handleFetchPermissionMapByUserFulfilled,
  handleFetchPermissionsWithoutStaff,
} from './userPermissionsExtraReducers';
import {
  getUserPermissions,
  savePermissionsMapping,
  getPermissionMapByUser,
  getPermissionsWithoutStaff,
} from '../../../../services/userPermissions';

export const fetchUserPermissions = createAsyncThunk('user-permissions/fetchUserPermissions', async (params, { rejectWithValue }) => {
  try {
    const response = await getUserPermissions(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchPermissionsWithoutStaff = createAsyncThunk('user-permissions/fetchPermissionsWithoutStaff', async (params, { rejectWithValue }) => {
  try {
    const response = await getPermissionsWithoutStaff(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const saveUserPermissionsMapping = createAsyncThunk('user-permissions/saveUserPermissionsMapping', async (permissionData, { rejectWithValue }) => {
  try {
    const response = await savePermissionsMapping(permissionData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchPermissionMapByUser = createAsyncThunk('user-permissions/fetchPermissionMapByUser', async (params, { rejectWithValue }) => {
  try {
    const response = await getPermissionMapByUser(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});


const userPermissionSlice = createSlice({
  name: 'userPermissions',
  initialState: {
    userPermissions: [],
    permissionsOfLoggedInUser: [],
    status: 'idle',
    error: null,
    currentUserPermission: null,
    message: null,
  },
  reducers: {
    clearMessage(state) {
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserPermissions.pending, handlePending)
      .addCase(fetchUserPermissions.fulfilled, handleFetchUserPermissionsFulfilled)
      .addCase(fetchUserPermissions.rejected, handleRejected)
      .addCase(fetchPermissionsWithoutStaff.pending, handlePending)
      .addCase(fetchPermissionsWithoutStaff.fulfilled, handleFetchPermissionsWithoutStaff)
      .addCase(fetchPermissionsWithoutStaff.rejected, handleRejected)
      .addCase(saveUserPermissionsMapping.pending, handlePending)
      .addCase(saveUserPermissionsMapping.fulfilled, handleFetchUserPermissionsFulfilled)
      .addCase(saveUserPermissionsMapping.rejected, handleRejected)
      .addCase(fetchPermissionMapByUser.pending, handlePending)
      .addCase(fetchPermissionMapByUser.fulfilled, handleFetchPermissionMapByUserFulfilled)
      .addCase(fetchPermissionMapByUser.rejected, handleRejected)

  },
});

export const { clearMessage } = userPermissionSlice.actions;
export default userPermissionSlice.reducer;
