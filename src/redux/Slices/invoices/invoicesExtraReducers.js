// import { arrayToObjectCovert } from '../../../services/commonService';
import { handlePending, handleRejected } from '../common/extra-reducers/commonExtraReducers';

export const handleFetchInvoicesFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.invoices = action?.payload?.data;
    state.invoicesOrder = action.payload.data.map(invoice => invoice.id);
    state.currentPage = action.payload.current_page;
    state.perPage = action.payload.limit;
    state.totalPages = action.payload.total_pages;
    state.total = action.payload.total_count;
    state.lastUpdated = action.payload.last_updated;
};

export const handleCalculatePriceFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.calculatePrice = action.payload;
}

export const handleAddContractInvoiceFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.currentInvoices = action.payload;
    state.error = null;
}

export const handleFetchInvoiceStatusFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.invoiceStatus = action.payload?.data ?? state.invoiceStatus;
}

export const handleFetchInvoiceFlagListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.invoiceFlagList = Array.isArray(action?.payload?.data) ? action.payload.data : [];
}

export const handleFetchInvoiceDetailsFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.invoiceDetails = action.payload?.data ?? state.invoiceDetails;
}

export const handleFetchContractGlobalStatusListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.contractGLobalList = action.payload?.data ?? state.contractGLobalList;
};

/* Activity Timeline / Payment Records first-page state ('idle' | 'loading' | 'ready' | 'error'; 28 Sep sheet row 1).
   "Load more" (page > 1) keeps its own button state in the tab and does not touch it. */
const isFirstLogPage = (action) => !(Number(action?.meta?.arg?.page) > 1);

export const handleFetchInvoiceActivityLogListPending = (state, action) => {
    handlePending(state);
    if (isFirstLogPage(action)) state.invoiceActivityLogStatus = 'loading';
}

export const handleFetchInvoiceActivityLogListRejected = (state, action) => {
    handleRejected(state, action);
    if (isFirstLogPage(action)) state.invoiceActivityLogStatus = 'error';
}

export const handleFetchInvoicePaymentLogListPending = (state, action) => {
    handlePending(state);
    if (isFirstLogPage(action)) state.invoicePaymentLogStatus = 'loading';
}

export const handleFetchInvoicePaymentLogListRejected = (state, action) => {
    handleRejected(state, action);
    if (isFirstLogPage(action)) state.invoicePaymentLogStatus = 'error';
}

export const handleFetchInvoiceActivityLogListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.invoiceActivityLogStatus = 'ready';
    const { data, page, limit } = action.payload;
    if (page && page > 1) {
        state.invoiceActivityLogList = [...state.invoiceActivityLogList, ...data];
    } else {
        state.invoiceActivityLogList = data;
    }
    state.invoiceActivityLogHasMore = Array.isArray(data) && data.length >= (limit || 5);
}

export const handleFetchInvoicePaymentLogListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.invoicePaymentLogStatus = 'ready';
    const { data, page, limit } = action.payload || {};
    const rows = Array.isArray(data) ? data : [];
    const prev = Array.isArray(state.invoicePaymentLogList) ? state.invoicePaymentLogList : [];
    if (page && page > 1) {
        state.invoicePaymentLogList = [...prev, ...rows];
    } else {
        state.invoicePaymentLogList = rows;
    }
    state.invoicePaymentLogHasMore = rows.length >= (limit || 5);
}

export const handlePayRemainingBalanceFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.currentInvoices = action.payload;
    state.error = null;
}

export const handleFetchReservationFeeFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.reservationFee = action.payload?.data ?? state.reservationFee;
}

export const handleUploadInvoicePaymentAttachmentFulfilled = (state) => {
    state.status = 'succeeded';
    state.error = null;
}

export const handleFetchEmployerCreditListFulfilled = (state, action) => {
    state.status = 'succeeded';
    const { creditType, data } = action.payload || {};
    if (creditType) {
        state.employerCreditList = {
            ...state.employerCreditList,
            [creditType]: Array.isArray(data) ? data : [],
        };
    }
}