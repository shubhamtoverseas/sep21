const handleFetchLocationsFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.locations = action.payload?.data ?? state.locations;
  state.message = action.payload?.message ?? state.message;
};

export {
  handleFetchLocationsFulfilled
};
