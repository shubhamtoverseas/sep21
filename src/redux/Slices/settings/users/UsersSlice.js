import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  handleFetchUsersFulfilled,
  handleAddUserFulfilled,
  handleFetchUserByIdFulfilled,
  handleChangePasswordFulfilled,
  handleFetchBranchUsersFulfilled,
  handleFetchActiveUsersFulfilled,
  handleFetchActivePermissionUsersFulfilled,
  handleUpdateUserFulfilled,
  handleFetchPermissionListFulfilled,
  handleSavePermissionsFulfilled,
  handleFetchOwnerOnboardingListListFulfilled,
  handleFetchPermissionSpecificUserFulfilled
} from './usersExtraReducers';
import {
  changePassword,
  getUserById,
  getUsers,
  getBranchUsers,
  getActiveUsers,
  addNewUser,
  updateUserById,
  getActivePermissionUsers,
  getPermissionList,
  savePermissionsAPI,
  getPermissionHistory,
  getOwnerOnboardingList
} from '../../../../services/users';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';

export const fetchUsers = createAsyncThunk('users/fetchUsers', async (params, { rejectWithValue }) => {
  try {
    const response = await getUsers(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const addUser = createAsyncThunk('users/addUser', async (userData, { rejectWithValue }) => {
  try {
    const response = await addNewUser(userData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateUser = createAsyncThunk('roles/updateUser', async (userData, { rejectWithValue }) => {
  try {
    const response = await updateUserById(userData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchUserById = createAsyncThunk('users/fetchUserById', async (params, { rejectWithValue }) => {
  try {
    const response = await getUserById(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const changeUserPassword = createAsyncThunk('users/changeUserPassword', async (payload, { rejectWithValue }) => {
  try {
    const response = await changePassword(payload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchBranchUsers = createAsyncThunk('users/fetchBranchUsers', async (params, { rejectWithValue }) => {
  try {
    const response = await getBranchUsers(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchActiveUsers = createAsyncThunk('users/fetchActiveUsers', async (payload, { rejectWithValue }) => {
  try {
    const response = await getActiveUsers(payload);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchActivePermissionUsers = createAsyncThunk('users/fetchActivePermissionUsers', async (payload, { rejectWithValue }) => {
  try {
    const response = await getActivePermissionUsers(payload);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchPermissionList = createAsyncThunk('users/fetchPermissionList', async (payload, { rejectWithValue }) => {
  try {
    const response = await getPermissionList(payload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchPermissionSpecificUser = createAsyncThunk('users/fetchPermissionSpecificUser', async (payload, { rejectWithValue }) => {
  try {
    const response = await getPermissionList(payload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchOwnerOnboardingList = createAsyncThunk('users/fetchOwnerOnboardingList', async (payload, { rejectWithValue }) => {
  try {
    const response = await getOwnerOnboardingList(payload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

/* backend 263: GET /permission/history?staff_id&page&per_page → { data: [events newest first], total, page, per_page, version } */
export const fetchPermissionHistory = createAsyncThunk('users/fetchPermissionHistory', async (params, { rejectWithValue }) => {
  try {
    const response = await getPermissionHistory(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const savePermissions = createAsyncThunk('users/savePermissions', async (permissionData, { rejectWithValue }) => {
  try {
    const response = await savePermissionsAPI(permissionData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    users: [],
    usersOrder: [],
    currentUserProfile: '',
    status: 'idle',
    error: null,
    currentUser: null,
    message: null,
    currentPage: 1,
    perPage: 10,
    totalPages: 0,
    totalUsers: 0,
    lastUpdated: '',
    branchUsers: [],
    activeUsers: [],
    permissionList: [],
    ownerOnboardingList: [],
  },
  reducers: {
    setUsersLoading(state) {
      state.status = 'loading';
    },
    clearUsersLoading(state) {
      state.status = false;
    },
    clearMessage(state) {
      state.message = null;
      state.error = null;
    },
    setUserProfile(state, action) {
      state.currentUserProfile = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPermissionList.pending, handlePending)
      .addCase(fetchPermissionList.fulfilled, handleFetchPermissionListFulfilled)
      .addCase(fetchPermissionList.rejected, handleRejected)
      .addCase(fetchPermissionSpecificUser.pending, handlePending)
      .addCase(fetchPermissionSpecificUser.fulfilled, handleFetchPermissionSpecificUserFulfilled)
      .addCase(fetchPermissionSpecificUser.rejected, handleRejected)
      .addCase(fetchOwnerOnboardingList.pending, handlePending)
      .addCase(fetchOwnerOnboardingList.fulfilled, handleFetchOwnerOnboardingListListFulfilled)
      .addCase(fetchOwnerOnboardingList.rejected, handleRejected)
      .addCase(savePermissions.pending, handlePending)
      .addCase(savePermissions.fulfilled, handleSavePermissionsFulfilled)
      .addCase(savePermissions.rejected, handleRejected)
      .addCase(fetchPermissionHistory.pending, handlePending)
      .addCase(fetchPermissionHistory.fulfilled, handleSavePermissionsFulfilled)   /* status only; the drawer keeps its own pages */
      .addCase(fetchPermissionHistory.rejected, handleRejected)
      .addCase(fetchUsers.pending, handlePending)
      .addCase(fetchUsers.fulfilled, handleFetchUsersFulfilled)
      .addCase(fetchUsers.rejected, handleRejected)
      .addCase(addUser.pending, handlePending)
      .addCase(addUser.fulfilled, handleAddUserFulfilled)
      .addCase(addUser.rejected, handleRejected)
      .addCase(updateUser.pending, handlePending)
      .addCase(updateUser.fulfilled, handleUpdateUserFulfilled)
      .addCase(updateUser.rejected, handleRejected)
      .addCase(fetchUserById.pending, handlePending)
      .addCase(fetchUserById.fulfilled, handleFetchUserByIdFulfilled)
      .addCase(fetchUserById.rejected, handleRejected)
      .addCase(changeUserPassword.pending, handlePending)
      .addCase(changeUserPassword.fulfilled, handleChangePasswordFulfilled)
      .addCase(changeUserPassword.rejected, handleRejected)
      .addCase(fetchBranchUsers.pending, handlePending)
      .addCase(fetchBranchUsers.fulfilled, handleFetchBranchUsersFulfilled)
      .addCase(fetchBranchUsers.rejected, handleRejected)
      .addCase(fetchActiveUsers.pending, handlePending)
      .addCase(fetchActiveUsers.fulfilled, handleFetchActiveUsersFulfilled)
      .addCase(fetchActiveUsers.rejected, handleRejected)
      .addCase(fetchActivePermissionUsers.pending, handlePending)
      .addCase(fetchActivePermissionUsers.fulfilled, handleFetchActivePermissionUsersFulfilled)
      .addCase(fetchActivePermissionUsers.rejected, handleRejected)
      ;
  },
});

export const { clearMessage, setUsersLoading, clearUsersLoading, setUserProfile } = usersSlice.actions;
export default usersSlice.reducer;
