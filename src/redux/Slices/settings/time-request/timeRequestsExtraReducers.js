import { arrayToObjectCovert } from '../../../../services/commonService';

const handleFetchTimeRequestsFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.timeRequests = arrayToObjectCovert(action.payload?.data);
  state.timeRequestsOrder = (action.payload?.data ?? []).map(request => request.id);
  state.currentPage = action.payload?.current_page ?? state.currentPage;
  state.perPage = action.payload?.limit ?? state.perPage;
  state.totalPages = action.payload?.total_pages ?? state.totalPages;
  state.totalTimeRequests = action.payload?.total_count ?? state.totalTimeRequests;
  state.lastUpdated = action.payload?.last_updated ?? state.lastUpdated;
  state.message = action.payload?.message ?? state.message;
};

const handleDeleteTimeRequestFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.timeRequests = state.timeRequests.filter(timeRequest => timeRequest.id !== action.payload?.data);
  state.message = action.payload?.message ?? state.message;
};

const handleAddTimeRequestFulfilled = (state, action) => {
  state.status = 'succeeded';
  const timeRequestId = action.payload?.data?.id;
  if (!state.timeRequests[timeRequestId]) {
    state.timeRequests[timeRequestId] = [];
  }
  state.timeRequests[timeRequestId].push(action.payload?.data);
  state.message = action.payload?.message ?? state.message;
};

const handleFetchTimeRequestByIdFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.currentTimeRequest = action.payload?.data ?? state.currentTimeRequest;
};

const handleUpdateTimeRequestFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.timeRequests[action.payload?.data?.id] = action.payload?.data;
  state.currentTimeRequest = action.payload?.data ?? state.currentTimeRequest;
  state.message = action.payload?.message ?? state.message;
};

const handleFetchManagerApprovedTimeRequestFulfilled = (state, action) => {
  state.managerApprovedTimeRequestStatus = 'succeeded';
  state.managerApprovedTimeRequest = action.payload?.data ?? state.managerApprovedTimeRequest;
  state.managerApprovedTimeRequestOrder = (action.payload?.data ?? []).map(request => request.id);
  state.managerApprovedTimeRequestCurrentPage = action.payload?.current_page ?? state.managerApprovedTimeRequestCurrentPage;
  state.managerApprovedTimeRequestPerPage = action.payload?.limit ?? state.managerApprovedTimeRequestPerPage;
  state.managerApprovedTimeRequestTotalPages = action.payload?.total_pages ?? state.managerApprovedTimeRequestTotalPages;
  state.managerApprovedTimeRequestTotal = action.payload?.total_count ?? state.managerApprovedTimeRequestTotal;
  state.managerApprovedTimeRequestLastUpdated = action.payload?.last_updated ?? state.managerApprovedTimeRequestLastUpdated;
  state.managerApprovedTimeRequestMessage = action.payload?.message ?? state.managerApprovedTimeRequestMessage;
};

const handleAddManagerApprovedTimeRequestFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};

const handleFetchManagerApprovedTimeRequestByIdFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.currentManagerApprovedTimeRequest = action.payload?.data ?? state.currentManagerApprovedTimeRequest;
};

const handleFetchReportTimeRequestHistoryFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.reportTimeRequestHistory = arrayToObjectCovert(action.payload?.data);
  state.reportTimeRequestHistoryOrder = (action.payload?.data ?? []).map(request => request.id);
  state.reportTimeRequestHistoryCurrentPage = action.payload?.current_page ?? state.reportTimeRequestHistoryCurrentPage;
  state.reportTimeRequestHistoryPerPage = action.payload?.limit ?? state.reportTimeRequestHistoryPerPage;
  state.reportTimeRequestHistoryTotalPages = action.payload?.total_pages ?? state.reportTimeRequestHistoryTotalPages;
  state.reportTimeRequestHistoryTotal = action.payload?.total_count ?? state.reportTimeRequestHistoryTotal;
  state.reportTimeRequestHistoryLastUpdated = action.payload?.last_updated ?? state.reportTimeRequestHistoryLastUpdated;
  state.message = action.payload?.message ?? state.message;
};

const handleFetchReportTimeEntryFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.reportTimeEntry = action.payload?.data ?? state.reportTimeEntry;
  state.reportTimeEntryCurrentPage = action.payload?.current_page ?? state.reportTimeEntryCurrentPage;
  state.reportTimeEntryPerPage = action.payload?.limit ?? state.reportTimeEntryPerPage;
  state.reportTimeEntryTotalPages = action.payload?.total_pages ?? state.reportTimeEntryTotalPages;
  state.reportTimeEntryTotal = action.payload?.total_count ?? state.reportTimeEntryTotal;
  state.reportTimeEntryLastUpdated = action.payload?.last_updated ?? state.reportTimeEntryLastUpdated;
  state.message = action.payload?.message ?? state.message;
};


const handleWithdrawTimeRequestFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.timeRequests[action.payload?.time_request_apply_id] = action.payload?.data;
  state.message = action.payload?.message ?? state.message;
};

const handleFetchReporteesTimeRequestsFulfilled = (state, action) => {
  state.reporteesTimeRequestStatus = 'succeeded';
  state.reporteesTimeRequest = arrayToObjectCovert(action.payload?.data);
  state.reporteesTimeRequestOrder = (action.payload?.data ?? []).map(request => request.id);
  state.reporteesTimeRequestCurrentPage = action.payload?.current_page ?? state.reporteesTimeRequestCurrentPage;
  state.reporteesTimeRequestPerPage = action.payload?.limit ?? state.reporteesTimeRequestPerPage;
  state.reporteesTimeRequestTotalPage = action.payload?.total_pages ?? state.reporteesTimeRequestTotalPage;
  state.reporteesTimeRequestTotal = action.payload?.total_count ?? state.reporteesTimeRequestTotal;
  state.reporteesTimeRequestLastUpdated = action.payload?.last_updated ?? state.reporteesTimeRequestLastUpdated;
  state.reporteesTimeRequestMessage = action.payload?.message ?? state.reporteesTimeRequestMessage;
};


const handleUpdateReporteesTimeRequestActionFulfilled = (state, action) => {
  state.reporteesTimeRequestStatus = 'succeeded';
  state.reporteesTimeRequest[action.payload?.id] = action.payload;
  state.reporteesTimeRequestMessage = action.payload?.message ?? state.reporteesTimeRequestMessage;
};

export {
  handleFetchTimeRequestsFulfilled,
  handleDeleteTimeRequestFulfilled,
  handleAddTimeRequestFulfilled,
  handleFetchTimeRequestByIdFulfilled,
  handleUpdateTimeRequestFulfilled,
  handleFetchManagerApprovedTimeRequestFulfilled,
  handleFetchReportTimeRequestHistoryFulfilled,
  handleAddManagerApprovedTimeRequestFulfilled,
  handleFetchManagerApprovedTimeRequestByIdFulfilled,
  handleWithdrawTimeRequestFulfilled,
  handleFetchReporteesTimeRequestsFulfilled,
  handleUpdateReporteesTimeRequestActionFulfilled,
  handleFetchReportTimeEntryFulfilled,
};
