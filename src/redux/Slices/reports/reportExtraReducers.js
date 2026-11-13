const fetchReportOfJobOfferListFulfilled = (state, action) => {
	state.status = 'succeeded';
	state.jobOfferList = action.payload?.data?.data ?? state.jobOfferList;
	state.currentPage = action.payload?.data?.current_page ?? state.currentPage;
	state.perPage = action.payload?.data?.limit ?? state.perPage;
	state.totalPages = action.payload?.data?.total_pages ?? state.totalPages;
	state.totalJobOfferReports = action.payload?.data?.total_count ?? state.totalJobOfferReports;
	state.lastUpdated = action.payload?.data?.last_updated ?? state.lastUpdated;
	state.message = action.payload?.message ?? state.message;
};

const fetchReportOfInsuranceListFulfilled = (state, action) => {
	state.status = 'succeeded';
	state.insuranceReportList = action.payload?.data?.data ?? state.insuranceReportList;
	state.insuranceCurrentPage = action.payload?.data?.current_page ?? state.insuranceCurrentPage;
	state.insurancePerPage = action.payload?.data?.limit ?? state.insurancePerPage;
	state.insuranceTotalPages = action.payload?.data?.total_pages ?? state.insuranceTotalPages;
	state.totalInsuranceReports = action.payload?.data?.total_count ?? state.totalInsuranceReports;
	state.insuranceLastUpdated = action.payload?.data?.last_updated ?? state.insuranceLastUpdated;
}

const fetchReportOfContractListFulfilled = (state, action) => {
	state.status = 'succeeded';
	state.contractReportList = action.payload?.data?.data ?? state.contractReportList;
	state.contractCurrentPage = action.payload?.data?.current_page ?? state.contractCurrentPage;
	state.contractPerPage = action.payload?.data?.limit ?? state.contractPerPage;
	state.contractTotalPages = action.payload?.data?.total_pages ?? state.contractTotalPages;
	state.totalContractReports = action.payload?.data?.total_count ?? state.totalContractReports;
	state.contractLastUpdated = action.payload?.data?.last_updated ?? state.contractLastUpdated;
}

const fetchJobOfferCreatedByListFulfilled = (state, action) => {
	state.status = 'succeeded';
	state.jobOfferCreatedByList = action.payload?.data ?? state.jobOfferCreatedByList;
}

export {
	fetchReportOfJobOfferListFulfilled,
	fetchReportOfInsuranceListFulfilled,
	fetchReportOfContractListFulfilled,
	fetchJobOfferCreatedByListFulfilled
};
