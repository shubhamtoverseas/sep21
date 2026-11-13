import { arrayToObjectCovert } from '../../../../services/commonService';

const handleFetchRolesFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.roles = arrayToObjectCovert(action.payload?.data);
  state.rolesOrder = (action.payload?.data ?? []).map(role => role.id);
  state.currentPage = action.payload?.current_page ?? state.currentPage;
  state.perPage = action.payload?.limit ?? state.perPage;
  state.totalPages = action.payload?.total_pages ?? state.totalPages;
  state.totalRoles = action.payload?.total_count ?? state.totalRoles;
  state.lastUpdated = action.payload?.last_updated ?? state.lastUpdated;
  state.message = action.payload?.message ?? state.message;
};

const handleAddRoleFulfilled = (state, action) => {
  state.status = 'succeeded';
  const roleId = action.payload?.data?.id;
  if (!state.roles[roleId]) {
    state.roles[roleId] = [];
  }
  state.roles[roleId].push(action.payload?.data);
  state.message = action.payload?.message ?? state.message;
};

const handleFetchRoleByIdFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.currentRole = action.payload?.data ?? state.currentRole;
};

const handleUpdateRoleFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.roles[action.payload?.data?.id] = action.payload?.data;
  state.currentRole = action.payload?.data ?? state.currentRole;
  state.message = action.payload?.message ?? state.message;
};

export {
  handleFetchRolesFulfilled,
  handleAddRoleFulfilled,
  handleFetchRoleByIdFulfilled,
  handleUpdateRoleFulfilled,
};
