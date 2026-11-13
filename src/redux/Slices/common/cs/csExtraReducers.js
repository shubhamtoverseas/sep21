const handleUpdateEmployerCSFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.message = action.payload?.message ?? state.message;
};
const handleSearchStaffFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.staffList = action.payload?.data ?? state.staffList;
};
const handleSearchCsStaffFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.employerCsStaffList = action.payload?.data ?? state.employerCsStaffList;
}
const handleChangeEmployerCsFulfilled = (state) => {
    state.status = 'succeeded';   
}
export {
    handleUpdateEmployerCSFulfilled,
    handleSearchStaffFulfilled,
    handleSearchCsStaffFulfilled,
    handleChangeEmployerCsFulfilled
};
