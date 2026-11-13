import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getProfile, updateProfile, uploadProfileImageAPI } from '../../../services/profile';
import { handleFetchProfileFulfilled, handleUpdateProfileFulfilled, uploadProfileImageFulfilled } from './profileExtraReducers';
import { handlePending, handleRejected } from '../common/extra-reducers/commonExtraReducers';

export const fetchProfileData = createAsyncThunk('profile/fetchProfile', async () => {
  const response = await getProfile();
  return response.data;
});

export const updateProfileData = createAsyncThunk('profile/updateProfile', async (profileData, { rejectWithValue }) => {
  try {
    const response = await updateProfile(profileData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const uploadProfileImage = createAsyncThunk('profile/uploadProfileImage', async (profileData, { rejectWithValue }) => {
  try {
    const response = await uploadProfileImageAPI(profileData);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});


const profileSlice = createSlice({
  name: 'profile',
  initialState: {
    profileData: {},
    status: 'idle',
    error: '',
    currentPage: 1,
    perPage: 10,
    totalPages: 0,
    totalRoles: 0,
    lastUpdated: '',
    message: '',
  },
  reducers: {
    setProfileLoading(state) {
      state.status = 'loading';
    },
    clearProfileLoading(state) {
      state.status = 'succeeded';
    },
    clearMessage(state) {
      state.message = '';
      state.error = ''
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfileData.pending, handlePending)
      .addCase(fetchProfileData.fulfilled, handleFetchProfileFulfilled)
      .addCase(fetchProfileData.rejected, handleRejected)
      .addCase(updateProfileData.pending, handleRejected)
      .addCase(updateProfileData.fulfilled, handleUpdateProfileFulfilled)
      .addCase(updateProfileData.rejected, handleRejected)
      .addCase(uploadProfileImage.pending, handleRejected)
      .addCase(uploadProfileImage.fulfilled, uploadProfileImageFulfilled)
      .addCase(uploadProfileImage.rejected, handleRejected);
  },
});

export const { clearMessage, setProfileLoading, clearProfileLoading } = profileSlice.actions;

export default profileSlice.reducer;
