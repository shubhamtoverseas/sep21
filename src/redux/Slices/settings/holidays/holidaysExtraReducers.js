
const handleFetchHolidaysFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.holidays = action.payload?.data ?? state.holidays;
  state.currentPage = action.payload?.current_page ?? state.currentPage;
  state.totalPages = action.payload?.total_pages ?? state.totalPages;
  state.perPage = action.payload?.limit ?? state.perPage;
  state.totalHolidays = action.payload?.total_holiday_list_count ?? state.totalHolidays;
  state.lastUpdated = action.payload?.last_updated ?? state.lastUpdated;
  state.message = action.payload?.message ?? state.message;
};

const handleFetchHolidayListByStatusFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.holidayListByStatus = action.payload?.data ?? state.holidayListByStatus;
};

const handleFetchOfficialHolidaysFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.officialHolidays = action.payload;
}

const handleAddHolidayFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.holidays.push(action.payload?.data);
  state.message = action.payload?.message ?? state.message;
};

const handleFetchHolidayByIdFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.currentHoliday = action.payload?.data ?? state.currentHoliday;
};

const handleUpdateHolidayFulfilled = (state, action) => {
  state.status = 'succeeded';
  const updatedHolidayIndex = state.holidays.findIndex(holiday => holiday.id === action.payload?.data?.id);
  if (updatedHolidayIndex !== -1) {
    state.holidays[updatedHolidayIndex] = action.payload?.data;
  }
  state.currentHoliday = action.payload?.data ?? state.currentHoliday;
  state.message = action.payload?.message ?? state.message;
};


export {
  handleFetchHolidaysFulfilled,
  handleFetchHolidayListByStatusFulfilled,
  handleFetchOfficialHolidaysFulfilled,
  handleAddHolidayFulfilled,
  handleFetchHolidayByIdFulfilled,
  handleUpdateHolidayFulfilled
};
