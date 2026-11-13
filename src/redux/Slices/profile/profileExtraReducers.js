const handleFetchProfileFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.profileData = action.payload?.data || {};
  state.currentPage = action.payload?.current_page || 1;
  state.perPage = action.payload?.limit || 10;
  state.totalPages = action.payload?.total_pages || 0;
  state.totalProfile = action.payload?.total_count || 0;
  state.lastUpdated = action.payload?.last_updated || '';
};

const handleUpdateProfileFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
  state.profileData = {
    ...state.profileData,
    ...action.payload?.data
  }
}

const uploadProfileImageFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
}

export {
  handleFetchProfileFulfilled,
  handleUpdateProfileFulfilled,
  uploadProfileImageFulfilled,
};
