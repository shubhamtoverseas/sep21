import { arrayToObjectCovert } from '../../../../services/commonService';

const handleFetchLeavePolicyMasterFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.leavePolicyMaster = arrayToObjectCovert(action.payload?.data);
    state.leavePolicyMasterOrder = (action.payload?.data ?? []).map(policy => policy.id);
    state.currentPage = action.payload?.current_page ?? state.currentPage;
    state.totalPages = action.payload?.total_pages ?? state.totalPages;
    state.totalLeavePolicy = action.payload?.total_count ?? state.totalLeavePolicy;
    state.lastUpdated = action.payload?.last_updated ?? state.lastUpdated;
    state.message = action.payload?.message ?? state.message;
};

const handleAddLeavePolicyFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.message = action.payload?.message ?? state.message;
};

const handleMasterLeavePolicyFulfilled = (state) => {
    state.status = 'succeeded';
}

const handleFetchLeaveMasterIdFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.currentLeavePolicyMaster = action.payload?.data ?? state.currentLeavePolicyMaster;
}

const handleUpdateLeavePolicyFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.message = action.payload?.message ?? state.message;
};

const handleUpdateMasterLeavePolicyFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.message = action.payload?.message ?? state.message;
}

export {
    handleFetchLeavePolicyMasterFulfilled,
    handleAddLeavePolicyFulfilled,
    handleMasterLeavePolicyFulfilled,
    handleUpdateLeavePolicyFulfilled,
    handleFetchLeaveMasterIdFulfilled,
    handleUpdateMasterLeavePolicyFulfilled
};
