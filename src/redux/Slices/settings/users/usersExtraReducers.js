import { arrayToObjectCovert } from '../../../../services/commonService';

const handleFetchUsersFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.users = arrayToObjectCovert(action.payload?.data);
  state.usersOrder = (action.payload?.data ?? []).map(user => user.id);
  state.currentPage = action.payload?.current_page ?? state.currentPage;
  state.totalPages = action.payload?.last_page ?? state.totalPages;
  state.perPage = action.payload?.per_page ?? state.perPage;
  state.totalUsers = action.payload?.total ?? state.totalUsers;
  state.lastUpdated = action.payload?.last_update ?? state.lastUpdated;
  state.message = action.payload?.message ?? state.message;
};

const handleFetchPermissionListFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.permissionList = action.payload;
}

const handleFetchPermissionSpecificUserFulfilled = (state) => {
  state.status = 'succeeded';
}

const handleFetchOwnerOnboardingListListFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.ownerOnboardingList = action.payload;
}

const handleSavePermissionsFulfilled = (state) => {
  state.status = 'succeeded';
}

const handleAddUserFulfilled = (state, action) => {
  state.status = 'succeeded';
  const userId = action.payload?.data?.id;
  if (!state.users[userId]) {
    state.users[userId] = [];
  }
  state.users[userId].push(action.payload?.data);
  state.message = action.payload?.message ?? state.message;
};

const handleFetchUserByIdFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.currentUser = action.payload?.data ?? state.currentUser;
};

const handleUpdateUserFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.users[action.payload?.data?.id] = action.payload?.data;
  state.currentUser = action.payload?.data ?? state.currentUser;
  state.message = action.payload?.message ?? state.message;
};
const handleChangePasswordFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};

const handleFetchBranchUsersFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.branchUsers = action.payload;
  state.message = action.payload?.message ?? state.message;
};

const handleFetchActiveUsersFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.activeUsers = action.payload?.data ?? state.activeUsers;
  state.message = action.payload?.message ?? state.message;
};

const handleFetchActivePermissionUsersFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.activePermissionUsers = action.payload?.data ?? state.activePermissionUsers;
  state.message = action.payload?.message ?? state.message;
};

export {
  handleFetchUsersFulfilled,
  handleAddUserFulfilled,
  handleFetchUserByIdFulfilled,
  handleUpdateUserFulfilled,
  handleChangePasswordFulfilled,
  handleFetchBranchUsersFulfilled,
  handleFetchActiveUsersFulfilled,
  handleFetchActivePermissionUsersFulfilled,
  handleFetchPermissionListFulfilled,
  handleFetchPermissionSpecificUserFulfilled,
  handleSavePermissionsFulfilled,
  handleFetchOwnerOnboardingListListFulfilled
};
