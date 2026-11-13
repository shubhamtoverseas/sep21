const handleFetchUserSessionHistoryFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.userSessionHistory = action.payload?.data ?? state.userSessionHistory;
    state.currentPage = action.payload?.current_page ?? state.currentPage;
    state.perPage = action.payload?.limit ?? state.perPage;
    state.totalPages = action.payload?.total_pages ?? state.totalPages;
    state.total = action.payload?.total_count ?? state.total;
    state.lastUpdated = action.payload?.last_updated ?? state.lastUpdated;
    state.message = action.payload?.message ?? state.message;
};

export {
    handleFetchUserSessionHistoryFulfilled
};
