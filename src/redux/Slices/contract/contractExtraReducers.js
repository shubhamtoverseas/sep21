const handleFetchEmpContractsFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.empContracts = action.payload?.data ?? state.empContracts;
};
/* Priyanka 3 Nov (contract 20): a details read that fails answers 404 with the reason — an older server answered a 200
   with `status: false` and no `data`. Either way the record is cleared (the previously opened contract must not stay on
   screen) and the reason is kept in `contractDetailsError` ("" when the server gave none; null = no error). */
const detailsReadFailed = (payload) => payload?.status === false || !payload?.data;
const handleFetchContractDetailssFulfilled = (state, action) => {
  if (detailsReadFailed(action.payload)) {
    state.status = 'failed';
    state.contractDetails = {};
    state.contractDetailsError = action.payload?.message || '';
    return;
  }
  state.status = 'succeeded';
  state.contractDetails = action.payload.data;
  state.contractDetailsError = null;
};
const handleFetchContractDetailsRejected = (state, action) => {
  state.status = 'failed';
  state.error = action?.payload?.message || action?.error?.message || 'An unknown error occurred';
  state.contractDetails = {};
  state.contractDetailsError = action?.payload?.message || action?.error?.message || '';
};
const handleFetchContractsFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.contracts = action.payload?.data ?? state.contracts;
  state.currentPage = action.payload?.current_page ?? state.currentPage;
  state.perPage = action.payload?.limit ?? state.perPage;
  state.totalPages = action.payload?.total_pages ?? state.totalPages;
  state.total = action.payload?.total_count ?? state.total;
  state.lastUpdated = action.payload?.last_updated ?? state.lastUpdated;
};
export {
  handleFetchEmpContractsFulfilled,
  handleFetchContractDetailssFulfilled,
  handleFetchContractDetailsRejected,
  handleFetchContractsFulfilled
};