import { arrayToObjectCovert } from '../../../../services/commonService';

const handleFetchShiftCodesFulfilled = (state, action) => {
  state.shiftCodeStatus = 'succeeded';
  state.shiftCodes = arrayToObjectCovert(action.payload?.data);
  state.shiftCodesOrder = (action.payload?.data ?? []).map(code => code.id);
  state.currentPage = action.payload?.current_page ?? state.currentPage;
  state.perPage = action.payload?.limit ?? state.perPage;
  state.totalPages = action.payload?.total_pages ?? state.totalPages;
  state.totalShiftCodes = action.payload?.total_shift_code_list_count ?? state.totalShiftCodes;
  state.lastUpdated = action.payload?.last_updated ?? state.lastUpdated;
  state.message = action.payload?.message ?? state.message;
};

const handleRosterViewFulfilled = (state, action) => {
  state.shiftCodeStatus = 'succeeded';
  state.rosterViewData = action.payload?.data?.data;
  state.rosterViewCurrentPage = action.payload?.data?.current_page;
  state.rosterViewPerPage = action.payload?.data?.limit;
  state.rosterViewTotalPages = action.payload?.data?.total_pages;
  state.rosterViewTotalShiftCodes = action.payload?.data?.total_shift_count;
  state.rosterViewLastUpdated = action.payload?.data?.last_updated;
  state.rosterViewMessage = action.payload?.data?.message;
}

const handleAddShiftCodeFulfilled = (state, action) => {
  state.shiftCodeStatus = 'succeeded';
  const shiftCodeId = action.payload?.data?.id;
  if (!state.shiftCodes[shiftCodeId]) {
    state.shiftCodes[shiftCodeId] = [];
  }
  state.shiftCodes[shiftCodeId].push(action.payload?.data);
  state.message = action.payload?.message ?? state.message;
};

const handleUpdateShiftCodeFulfilled = (state, action) => {
  state.shiftCodeStatus = 'succeeded';
  state.shiftCodes[action.payload?.data?.id] = action.payload?.data;
  state.currentShiftCode = action.payload?.data ?? state.currentShiftCode;
  state.message = action.payload?.message ?? state.message;
};

const handlePending = (state) => {
  state.shiftCodeStatus = 'loading';
};

const handleRejected = (state, action) => {
  state.shiftCodeStatus = 'failed';
  state.error = action.payload?.message || action.error?.message || 'An unknown error occurred';
};

const handleImportShiftCodeFulfilled = (state, action) => {
  state.shiftCodeStatus = 'succeeded';
  state.message = action.payload?.message ?? state.message;
  state.shiftCodeFeedbackData = action.payload?.data ?? state.shiftCodeFeedbackData;
  state.shiftCodeFeedbackHeaders = action.payload?.headers ?? state.shiftCodeFeedbackHeaders;
};

export {
  handleFetchShiftCodesFulfilled,
  handleRosterViewFulfilled,
  handleAddShiftCodeFulfilled,
  handleUpdateShiftCodeFulfilled,
  handleImportShiftCodeFulfilled,
  handlePending,
  handleRejected
};
