const handleFetchEmployerRemarksFulfilled = (state, action) => {
	state.status = 'succeeded';
	state.employerRemarks = action.payload?.data ?? state.employerRemarks;
};

const handleAddEmployerRemarkFulfilled = (state, action) => {
	state.status = 'succeeded';
	state.message = action.payload?.message ?? state.message;
	if (Array.isArray(action.payload?.data)) {
		state.employerRemarks = state.employerRemarks || [];
		state.employerRemarks.push(...(action.payload?.data ?? []));
	}
};

const handleUpdateEmployerRemarkFulfilled = (state, action) => {
	state.status = 'succeeded';
	state.message = action.payload?.message ?? state.message;
	state.employerRemarks = state.employerRemarks.map((remark) =>
		remark.id === action.payload?.data[0].id ? action.payload?.data[0] : remark
	);
};

const handleDeleteEmployerRemarkFulfilled = (state, action) => {
	state.status = 'succeeded';
	const remarkId = action.payload?.data?.id;
	state.employerRemarks = state.employerRemarks.filter((remark) => remark.id !== remarkId);
	state.message = action.payload?.message ?? state.message;
};

const handleFetchWorkerRemarksFulfilled = (state, action) => {
	state.status = 'succeeded';
	state.workerRemarks = action.payload?.data ?? state.workerRemarks;
	state.workerHostRemarksHidden = action.payload?.host_remarks_hidden === true;
};

const handleAddWorkerRemarkFulfilled = (state, action) => {
	state.status = 'succeeded';
	state.message = action.payload?.message ?? state.message;
	if (Array.isArray(action.payload?.data)) {
		state.workerRemarks = state.workerRemarks || [];
		state.workerRemarks.push(...(action.payload?.data ?? []));
	}
};

const handleUpdateWorkerRemarkFulfilled = (state, action) => {
	state.status = 'succeeded';
	state.message = action.payload?.message ?? state.message;
	state.workerRemarks = state.workerRemarks.map((remark) =>
		remark.id === action.payload?.data[0].id ? action.payload?.data[0] : remark
	);
};

const handleDeleteWorkerRemarkFulfilled = (state, action) => {
	state.status = 'succeeded';
	const remarkId = action.payload?.data?.id;
	state.workerRemarks = state.workerRemarks.filter((remark) => remark.id !== remarkId);
	state.message = action.payload?.message ?? state.message;
};

const handleFetchProcessingRemarksFulfilled = (state, action) => {
	state.status = 'succeeded';
	state.processingRemarks = action.payload?.data ?? state.processingRemarks;
};

const handleAddProcessingRemarkFulfilled = (state, action) => {
	state.status = 'succeeded';
	state.message = action.payload?.message ?? state.message;
	if (Array.isArray(action.payload?.data)) {
		state.processingRemarks = state.processingRemarks || [];
		state.processingRemarks.push(...(action.payload?.data ?? []));
	}
};

const handleUpdateProcessingRemarkFulfilled = (state, action) => {
	state.status = 'succeeded';
	state.message = action.payload?.message ?? state.message;
	state.processingRemarks = state.processingRemarks.map((remark) =>
		remark.id === action.payload?.data[0].id ? action.payload?.data[0] : remark
	);
};

const handleDeleteProcessingRemarkFulfilled = (state, action) => {
	state.status = 'succeeded';
	const remarkId = action.payload?.data?.id;
	state.processingRemarks = state.processingRemarks.filter((remark) => remark.id !== remarkId);
	state.message = action.payload?.message ?? state.message;
};

const handleFetchInvoiceRemarksFulfilled = (state, action) => {
	state.status = 'succeeded';
	state.invoiceRemarks = action.payload?.data ?? state.invoiceRemarks;
};

const handleaAdInvoiceRemarksFulfilled = (state, action) => {
	state.status = 'succeeded';
	state.message = action.payload?.message ?? state.message;
	state.invoiceRemarks = state.invoiceRemarks || [];
	if (Array.isArray(action.payload?.data)) {
		state.invoiceRemarks.push(...(action.payload?.data ?? []));
	} else if (typeof action.payload?.data === 'object' && action.payload?.data !== null) {
		state.invoiceRemarks = [action.payload?.data, ...state.invoiceRemarks];
	}
};

const handleUpdateInvoiceRemarksFulfilled = (state, action) => {
	state.status = 'succeeded';
	state.message = action.payload?.message ?? state.message;
	state.invoiceRemarks = state.invoiceRemarks.map((remark) =>
		remark.id === action.payload?.data?.id ? action.payload?.data : remark
	);
};

const handleDeleteInvoiceRemarkFulfilled = (state, action) => {
	state.status = 'succeeded';
	const remarkId = action.payload?.data?.id;
	state.invoiceRemarks = state.invoiceRemarks.filter((remark) => remark.id !== remarkId);
	state.message = action.payload?.message ?? state.message;
};

export {
	handleFetchEmployerRemarksFulfilled,
	handleAddEmployerRemarkFulfilled,
	handleUpdateEmployerRemarkFulfilled,
	handleDeleteEmployerRemarkFulfilled,
	handleFetchWorkerRemarksFulfilled,
	handleAddWorkerRemarkFulfilled,
	handleUpdateWorkerRemarkFulfilled,
	handleDeleteWorkerRemarkFulfilled,
	handleFetchProcessingRemarksFulfilled,
	handleAddProcessingRemarkFulfilled,
	handleUpdateProcessingRemarkFulfilled,
	handleDeleteProcessingRemarkFulfilled,
	handleFetchInvoiceRemarksFulfilled,
	handleaAdInvoiceRemarksFulfilled,
	handleUpdateInvoiceRemarksFulfilled,
	handleDeleteInvoiceRemarkFulfilled,
};
