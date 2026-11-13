const handleFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.countries = action.payload;
};

const handleGetAllCountriesFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.countriesAll = action.payload;
}

export {
  handleFulfilled,
  handleGetAllCountriesFulfilled
};
