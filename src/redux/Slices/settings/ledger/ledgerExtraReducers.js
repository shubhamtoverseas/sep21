const handleFetchLedgerFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.ledger = action.payload?.data ?? state.ledger;
    state.currentPage = action.payload?.current_page ?? state.currentPage;
    state.perPage = action.payload?.limit ?? state.perPage;
    state.totalPages = action.payload?.total_pages ?? state.totalPages;
    state.totalLedger = action.payload?.total_leave_history_count ?? state.totalLedger;
    state.lastUpdated = action.payload?.last_updated ?? state.lastUpdated;
    state.message = action.payload?.message ?? state.message;
};

export {
    handleFetchLedgerFulfilled,
};
