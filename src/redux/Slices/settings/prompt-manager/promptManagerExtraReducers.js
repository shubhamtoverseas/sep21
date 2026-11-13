const handleFetchPromptManagerList = (state, action) => {
  state.status = 'succeeded';
  // const promptManagerData = action.payload?.data?.data || [];
  const promptManagerData = action.payload || [];
  const paginationInfo = action.payload;
  if (promptManagerData.length > 0) {
    state.promptManagerList = promptManagerData;
    state.currentPage = paginationInfo?.current_page || 1;
    state.perPage = paginationInfo?.limit || 1;
    state.totalPages = paginationInfo?.total_pages || 0;
    state.lastPage = paginationInfo?.last_page || 0;
    state.totalCount = paginationInfo?.total_clinic_count || 0;
    state.lastUpdate = paginationInfo?.last_updated || '';
  } else {
    state.promptManagerList = [];
    state.currentPage = 1;
    state.perPage = 1;
    state.totalPages = 0;
    state.lastPage = 0;
    state.totalCount = 0;
    state.lastUpdate = '';
  }
};

export {
  handleFetchPromptManagerList
};