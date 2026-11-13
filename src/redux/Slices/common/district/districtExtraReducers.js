const handleFetchDistrictFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.district = action.payload?.data ?? state.district;
    state.message = action.payload?.message ?? state.message;
}
const handleDistrictByCountryCodeFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.districtsByCountryCode = action.payload?.data ?? state.districtsByCountryCode;
    state.message = action.payload?.message ?? state.message;
};

export {
    handleFetchDistrictFulfilled,
    handleDistrictByCountryCodeFulfilled
};
