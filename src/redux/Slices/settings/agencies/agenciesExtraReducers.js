import { arrayToObjectCovert } from '../../../../services/commonService';

const handleFetchAgenciesFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.agencies = arrayToObjectCovert(action.payload?.data);
  state.agenciesOrder = (action.payload?.data ?? []).map(agency => agency.id);
  state.currentPage = action.payload?.current_page ?? state.currentPage;
  state.perPage = action.payload?.limit ?? state.perPage;
  state.totalPages = action.payload?.total_pages ?? state.totalPages;
  state.totalAgencies = action.payload?.total_agency_count ?? state.totalAgencies;
  state.lastUpdated = action.payload?.last_updated ?? state.lastUpdated;
  state.message = action.payload?.message ?? state.message;
};

const handleFetchMappingAgenciesFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.mappingAgencies = action.payload?.data ?? state.mappingAgencies;
  state.message = action.payload?.message ?? state.message;
};

const handleFetchActiveAgenciesFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.activeAgencies = action.payload?.data ?? state.activeAgencies;
  state.message = action.payload?.message ?? state.message;
};

const handleDeleteAgencyFulfilled = (state, action) => {
  state.status = 'succeeded';
  const agencyId = action.payload?.data?.id;
  if (state.agencies && state.agencies[agencyId]) {
    delete state.agencies[agencyId];
    state.agenciesOrder = state.agenciesOrder.filter(agency => agency !== agencyId);
  }
  state.message = action.payload?.message ?? state.message;
};

const handleAddAgencyFulfilled = (state, action) => {
  state.status = 'succeeded';
  const agencyId = action.payload?.data?.id;
  if (!state.agencies[agencyId]) {
    state.agencies[agencyId] = [];
  }
  state.agencies[agencyId].push(action.payload?.data);
  state.message = action.payload?.message ?? state.message;
};

const handleFetchAgencyByIdFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.currentAgency = action.payload?.data ?? state.currentAgency;
  state.currentAgencyBranches = action.payload?.data?.branch_data ?? state.currentAgencyBranches;
};

const handleUpdateAgencyFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.agencies[action.payload?.data?.id] = action.payload?.data;
  state.currentAgencyBranches = action.payload?.data?.branch_data ?? state.currentAgencyBranches;
  state.currentAgency = action.payload?.data ?? state.currentAgency;
  state.currentAgency = action.payload?.data ?? state.currentAgency;
  state.message = action.payload?.message ?? state.message;
};

export {
  handleFetchAgenciesFulfilled,
  handleFetchMappingAgenciesFulfilled,
  handleFetchActiveAgenciesFulfilled,
  handleDeleteAgencyFulfilled,
  handleAddAgencyFulfilled,
  handleFetchAgencyByIdFulfilled,
  handleUpdateAgencyFulfilled,
};
