import { arrayToObjectCovert } from '../../../../services/commonService';

const handleFetchBranchesFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.branches = arrayToObjectCovert(action.payload?.data);
  state.branchesOrder = (action.payload?.data ?? []).map(branch => branch.id);
  state.currentPage = action.payload?.current_page ?? state.currentPage;
  state.perPage = action.payload?.limit ?? state.perPage;
  state.totalPages = action.payload?.total_pages ?? state.totalPages;
  state.totalBranches = action.payload?.total_branch_count ?? state.totalBranches;
  state.lastUpdated = action.payload?.last_updated ?? state.lastUpdated;
  state.message = action.payload?.message ?? state.message;
};

const handleBranchesByPartnerStaffIdFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.branchesByPartnerStaffId = action.payload?.data ?? state.branchesByPartnerStaffId;
}

/* the shared list is written by 10+ screens with different params (module_key, branch_country_code…): a new request empties it
   first so no screen fixes its Branch filter to another screen's (country-filtered) list while its own fetch is in flight (27 Oct) */
const handleFetchMappingBranchesPending = (state, action) => {
  state.status = 'loading';
  const { type } = action?.meta?.arg || {};
  if (type !== 'invoice' && type !== 'contract_invoice') state.mappingBranches = [];
};

const handleFetchMappingBranchesFulfilled = (state, action) => {
  state.status = 'succeeded';
  if (Array.isArray(action.payload)) {
    
    const { type } = action?.meta?.arg || {};
    if (type === 'invoice') {
      state.invoiceBranches = action.payload;
    } else if (type === 'contract_invoice') {
      state.contractInvoiceBranches = action.payload;
    } else {
      state.mappingBranches = action.payload;
    }
  } else {
     state.mappingBranches = action.payload?.data || [];
  }
};

const handleAddBranchFulfilled = (state, action) => {
  state.status = 'succeeded';
  const branchId = action.payload?.data?.id;
  if (!state.branches[branchId]) {
    state.branches[branchId] = [];
  }
  state.branches[branchId].push(action.payload?.data);
  state.message = action.payload?.message ?? state.message;
};

const handleFetchBranchByIdFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.currentBranch = action.payload?.data ?? state.currentBranch;
};

const handleUpdateBranchFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.branches[action.payload?.data?.id] = action.payload?.data;
  state.currentBranch = action.payload?.data ?? state.currentBranch;
  state.message = action.payload?.message ?? state.message;
};

const handleFetchBranchesByAgencyIdFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.currentAgencyBranches = action.payload?.data ?? state.currentAgencyBranches;
  state.message = action.payload?.message ?? state.message;
};

const handleFetchActiveBranchesFulfilled = (state, action) => {
  state.status = 'succeeded';
  const rows = Array.isArray(action.payload) ? action.payload : action.payload?.data;
  state.currentActiveBranches = Array.isArray(rows) ? rows : state.currentActiveBranches;
  state.message = action.payload?.message ?? state.message;
};


export {
  handleFetchBranchesFulfilled,
  handleFetchMappingBranchesFulfilled,
  handleFetchMappingBranchesPending,
  handleAddBranchFulfilled,
  handleFetchBranchByIdFulfilled,
  handleUpdateBranchFulfilled,
  handleFetchBranchesByAgencyIdFulfilled,
  handleFetchActiveBranchesFulfilled,
  handleBranchesByPartnerStaffIdFulfilled,
};
