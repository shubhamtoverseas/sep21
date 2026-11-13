import { arrayToObjectCovert } from '../../../../services/commonService';

const handleFetchDoopsFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.doops = arrayToObjectCovert(action.payload?.data);
  state.doopsOrder = (action.payload?.data ?? []).map(doop => doop.id);
  state.currentPage = action.payload?.current_page ?? state.currentPage;
  state.perPage = action.payload?.limit ?? state.perPage;
  state.totalPages = action.payload?.total_pages ?? state.totalPages;
  state.totalDoops = action.payload?.total_count ?? state.totalDoops;
  state.lastUpdated = action.payload?.last_updated ?? state.lastUpdated;
  state.message = action.payload?.message ?? state.message;
};
const handleAddDoopFulfilled = (state, action) => {
  state.status = 'succeeded';
  const doopId = action.payload?.data?.id;
  if (!state.doops[doopId]) {
    state.doops[doopId] = [];
  }
  state.doops[doopId].push(action.payload?.data);
  state.message = action.payload?.message ?? state.message;
};

const handleFetchDoopByIdFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.currentDoop = action.payload?.data ?? state.currentDoop;
};

const handleUpdateDoopFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.doops[action.payload?.data?.id] = action.payload?.data;
  state.currentDoop = action.payload?.data ?? state.currentDoop;
  state.message = action.payload?.message ?? state.message;
};

export {
  handleFetchDoopsFulfilled,
  handleAddDoopFulfilled,
  handleFetchDoopByIdFulfilled,
  handleUpdateDoopFulfilled
};
