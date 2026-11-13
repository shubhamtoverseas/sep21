const handleFetchUserPermissionsFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.userPermissions = action?.payload;
  state.message = action?.payload?.message;
};

const handleFetchPermissionsWithoutStaff = (state) => {
  state.status = 'succeeded';
}

const handleFetchPermissionMapByUserFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.permissionsOfLoggedInUser = action.payload?.raw_data;
  state.message = action.payload?.message ?? state.message;
};

export {
  handleFetchUserPermissionsFulfilled,
  handleFetchPermissionsWithoutStaff,
  handleFetchPermissionMapByUserFulfilled,
};
