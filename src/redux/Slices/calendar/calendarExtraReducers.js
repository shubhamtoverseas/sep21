const handleFetchcalendarFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.calendarList = action.payload?.data ?? state.calendarList;
  state.message = action.payload?.message ?? state.message;
};

const createCalendarTaskFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.taskDetail = action.payload?.data ?? state.taskDetail;
};

const viewalendarTaskFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.taskDetail = action.payload?.data ?? state.taskDetail;
};

export {
  handleFetchcalendarFulfilled,
  createCalendarTaskFulfilled,
  viewalendarTaskFulfilled,
};
