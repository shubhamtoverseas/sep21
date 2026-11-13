const handleFetchMedicalList = (state, action) => {
  state.status = 'succeeded';
  const medicalData = action.payload?.data?.data || [];
  const paginationInfo = action.payload?.data;
  if (medicalData.length > 0) {
    state.medicalList = medicalData; 
    state.currentPage = paginationInfo?.current_page || 1; 
    state.perPage = paginationInfo?.limit || 1; 
    state.totalPages = paginationInfo?.total_pages || 0;
    state.lastPage = paginationInfo?.last_page || 0; 
    state.totalCount = paginationInfo?.total_clinic_count || 0; 
    state.lastUpdate = paginationInfo?.last_updated || '';
  } else {
    state.medicalList = [];
    state.currentPage = 1; 
    state.perPage = 1; 
    state.totalPages= 0;
    state.lastPage = 0; 
    state.totalCount = 0; 
    state.lastUpdate = ''; 
  }
};

const handleSaveMedicalClinicFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};

const handleViewMedicalClinicFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.medicalClinicDetails = action.payload?.data ?? state.medicalClinicDetails;
};

export {
  handleFetchMedicalList,
  handleSaveMedicalClinicFulfilled,
  handleViewMedicalClinicFulfilled,
};