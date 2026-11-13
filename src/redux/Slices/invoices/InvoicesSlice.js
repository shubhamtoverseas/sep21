import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    handleFetchInvoicesFulfilled,
    handleCalculatePriceFulfilled,
    handleAddContractInvoiceFulfilled,
    handleFetchInvoiceStatusFulfilled,
    handleFetchInvoiceFlagListFulfilled,
    handleFetchInvoiceDetailsFulfilled,
    handleFetchContractGlobalStatusListFulfilled,
    handleFetchInvoiceActivityLogListPending,
    handleFetchInvoiceActivityLogListFulfilled,
    handleFetchInvoiceActivityLogListRejected,
    handleFetchInvoicePaymentLogListPending,
    handleFetchInvoicePaymentLogListFulfilled,
    handleFetchInvoicePaymentLogListRejected,
    handlePayRemainingBalanceFulfilled,
    handleFetchReservationFeeFulfilled,
    handleUploadInvoicePaymentAttachmentFulfilled,
    handleFetchEmployerCreditListFulfilled
} from './invoicesExtraReducers';
import { handlePending, handleRejected } from '../common/extra-reducers/commonExtraReducers';
import { INVOICE_FILTERS_STORAGE_KEY } from '../../../components/ReusableComponents/constants';
import { getInvoiceListAdmin, getInvoiceViewAdmin } from '../../../services/invoicesAdmin';
import { getInvoices, getCalculatePrice, setContractInvoice, getInvoiceStatus, getInvoiceFlagList, getInvoiceDetails, getContractGlobalStatusList, getInvoiceActivityLogList, getInvoicePaymentLogList, setPayRemainingBalance, getReservationFee, getEmployerCreditList, saveUploadInvoicePaymentAttachment, deleteInvoicePaymentAttachment, getActionStatusList, changeInvoiceStatus, invoiceGLobalCancellationReason, refundInvoice, addInvoiceExchange, updateAdjustPaymentInvoice, getPolicies, validateContractAPI, checkParentInvoiceExchangedAPI } from '../../../services/invoices';

export const fetchInvoices = createAsyncThunk('invoices/fetchInvoices', async (reqPayload) => {
    const response = await getInvoices(reqPayload);
    return response.data.data;
});

/* INV-2: an invoice screen's first read (the view's parts are put in this slice and the remarks slice by
   Views/Pages/Invoice/invoiceView.js, as each part's own read puts it) */
export const fetchInvoiceView = createAsyncThunk('invoices/fetchInvoiceView', async ({ ref, logLimit }, { rejectWithValue }) => {
    try {
        const response = await getInvoiceViewAdmin(ref, logLimit);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({ status: error?.response?.status });
    }
});

/* INV-1: the Invoices screen's list, on its admin route; the screen aborts a request a newer one replaces */
export const fetchInvoiceListAdmin = createAsyncThunk('invoices/fetchInvoiceListAdmin', async (reqPayload, { signal }) => {
    const response = await getInvoiceListAdmin(reqPayload, { signal });
    return response.data.data;
});

export const fetchCalculatePrice = createAsyncThunk('invoices/fetchCalculatePrice', async (reqPayload) => {
    const response = await getCalculatePrice(reqPayload);
    return response.data.data;
});

export const addContractInvoice = createAsyncThunk('invoices/addContractInvoice', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await setContractInvoice(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response);
    }
});

export const fetchInvoiceFlagList = createAsyncThunk('invoices/fetchInvoiceFlagList', async (_, { rejectWithValue }) => {
    try {
        const response = await getInvoiceFlagList();
        return response?.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
        });
    }
});

export const fetchInvoiceStatus = createAsyncThunk('invoices/fetchInvoiceStatus', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getInvoiceStatus(reqPayload);
        return response;
    } catch (error) {
        return rejectWithValue(error.response);
    }
});

export const fetchInvoiceDetails = createAsyncThunk('invoices/fetchInvoiceDetails', async (reqPayload) => {
    const response = await getInvoiceDetails(reqPayload);
    return response.data;
});

export const fetchContractGlobalStatusList = createAsyncThunk('invoices/fetchContractGlobalStatusList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getContractGlobalStatusList(reqPayload);
        return response;
    } catch (error) {
        return rejectWithValue(error.response);
    }
});

export const fetchInvoiceActivityLogList = createAsyncThunk('invoices/fetchInvoiceActivityLogList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getInvoiceActivityLogList(reqPayload);
        return { ...response.data, page: reqPayload.page, limit: reqPayload.limit };
    } catch (error) {
        return rejectWithValue(error.response);
    }
});

export const fetchInvoicePaymentLogList = createAsyncThunk('invoices/fetchInvoicePaymentLogList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getInvoicePaymentLogList(reqPayload);
        return { ...response.data, page: reqPayload.page, limit: reqPayload.limit };
    } catch (error) {
        return rejectWithValue(error.response);
    }
});

/* Pay Remaining Balance — the one collection action (v4 B-8); the API answers 403 / 404 / 409 / 422 with its message */
export const payRemainingBalance = createAsyncThunk('invoices/payRemainingBalance', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await setPayRemainingBalance(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response);
    }
});

export const fetchReservationFee = createAsyncThunk('invoices/fetchReservationFee', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getReservationFee(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response);
    }
});

export const fetchEmployerCreditList = createAsyncThunk('invoices/fetchEmployerCreditList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getEmployerCreditList(reqPayload);
        return { creditType: reqPayload.credit_type, data: response?.data?.data };
    } catch (error) {
        return rejectWithValue({
            message: error.response?.data?.message || "An error occurred",
        });
    }
});

export const uploadInvoicePaymentAttachment = createAsyncThunk('invoices/uploadInvoicePaymentAttachment', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await saveUploadInvoicePaymentAttachment(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response);
    }
});

export const removeInvoicePaymentAttachment = createAsyncThunk('invoices/removeInvoicePaymentAttachment', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await deleteInvoicePaymentAttachment(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response);
    }
});


export const fetchActionStatusList = createAsyncThunk('invoices/fetchActionStatusList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getActionStatusList(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response);
    }
});

export const saveChangeInvoiceStatus = createAsyncThunk('invoices/changeInvoiceStatus', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await changeInvoiceStatus(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response);
    }
});

export const fetchInvoiceGLobalCancellationReason = createAsyncThunk('invoices/fetchInvoiceGLobalCancellationReason', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await invoiceGLobalCancellationReason(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response);
    }
});

/* the global cancellation reasons, read once: only while the store has none (performance track A-14) */
export const loadInvoiceCancellationReasons = () => (dispatch, getState) => {
    if ((getState().invoices.invoiceCacellationReason || []).length > 0) return undefined;
    return dispatch(fetchInvoiceGLobalCancellationReason({}));
};


export const addRefundInvoice = createAsyncThunk('invoices/addRefundInvoice', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await refundInvoice(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response);
    }
});

export const saveInvoiceExchange = createAsyncThunk('invoices/saveInvoiceExchange', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await addInvoiceExchange(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response);
    }
});

export const saveUpdateAdjustPaymentInvoice = createAsyncThunk('invoices/saveUpdateAdjustPaymentInvoice', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await updateAdjustPaymentInvoice(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response);
    }
});

export const fetchPolicies = createAsyncThunk('invoices/fetchPolicies', async (reqPayload) => {
    const response = await getPolicies(reqPayload);
    return response.data.data;
});

export const validateContract = createAsyncThunk('invoices/validateContract', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await validateContractAPI(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response);
    }
});

export const checkParentInvoiceExchanged = createAsyncThunk('invoices/checkParentInvoiceExchanged', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await checkParentInvoiceExchangedAPI(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response);
    }
});

const storedInvoicePageLimit = (() => {
    try {
        const raw = localStorage.getItem(INVOICE_FILTERS_STORAGE_KEY);
        const limit = parseInt(raw ? JSON.parse(raw)?.limit : null);
        return limit > 0 ? limit : 25;
    } catch { return 25; }
})();

const invoicesSlice = createSlice({
    name: 'invoices',
    initialState: {
        invoices: [],
        invoicesOrder: [],
        invoiceActivityLogList: [],
        invoiceActivityLogHasMore: true,
        invoiceActivityLogStatus: 'idle',
        invoicePaymentLogList: [],
        invoicePaymentLogHasMore: true,
        invoicePaymentLogStatus: 'idle',
        actionStatusList: [],
        invoiceCacellationReason: [],
        policiesList: [],
        contractGLobalList: "",
        reservationFee: {},
        employerCreditList: {},
        calculatePrice: {},
        invoiceDetails: {},
        invoiceStatus: [],
        status: 'success',
        error: null,
        currentInvoices: null,
        currentPage: 1,
        perPage: 25,
        totalPages: 0,
        total: 0,
        lastUpdated: '',
        message: null,
        currentInvoiceExchange: null,
        filtersData: {},
        invoiceHeaderForm: {},
        invoiceContractItemsList: [],
        invoiceFlagList: [],
        invoicePageLimit: storedInvoicePageLimit,
    },
    reducers: {
        clearMessage(state) {
            state.message = null;
        },
        setFilters(state, action) {
            state.filtersData = action.payload;
        },
        setInvoicePageLimit(state, action) {
            state.invoicePageLimit = action.payload;
        },
        clearFilters(state) {
            state.filtersData = {};
        },
        setCurrentInvoiceExchange(state, action) {
            state.currentInvoiceExchange = action.payload;
        },
        clearCurrentInvoiceExchange(state) {
            state.currentInvoiceExchange = null;
        },
        clearInvoiceDetails(state) {
            state.invoiceDetails = {};
        },
        setInvoiceHeaderForm(state, action) {
            state.invoiceHeaderForm = action.payload;
        },
        clearInvoiceHeaderForm(state) {
            state.invoiceHeaderForm = {};
        },
        setInvoiceContractItemsList(state, action) {
            state.invoiceContractItemsList = action.payload;
        },
        clearInvoiceContractItemsList(state) {
            state.invoiceContractItemsList = [];
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchInvoices.pending, handlePending)
            .addCase(fetchInvoices.fulfilled, handleFetchInvoicesFulfilled)
            .addCase(fetchInvoices.rejected, handleRejected)
            .addCase(fetchInvoiceListAdmin.pending, handlePending)
            .addCase(fetchInvoiceListAdmin.fulfilled, handleFetchInvoicesFulfilled)
            /* a request a newer one replaced is not a failure */
            .addCase(fetchInvoiceListAdmin.rejected, (state, action) => {
                if (!action.meta?.aborted) handleRejected(state, action);
            })
            .addCase(fetchCalculatePrice.pending, handlePending)
            .addCase(fetchCalculatePrice.fulfilled, handleCalculatePriceFulfilled)
            .addCase(fetchCalculatePrice.rejected, handleRejected)
            .addCase(addContractInvoice.pending, handlePending)
            .addCase(addContractInvoice.fulfilled, handleAddContractInvoiceFulfilled)
            .addCase(addContractInvoice.rejected, handleRejected)
            .addCase(fetchInvoiceStatus.pending, handlePending)
            .addCase(fetchInvoiceStatus.fulfilled, handleFetchInvoiceStatusFulfilled)
            .addCase(fetchInvoiceStatus.rejected, handleRejected)
            .addCase(fetchInvoiceFlagList.pending, handlePending)
            .addCase(fetchInvoiceFlagList.fulfilled, handleFetchInvoiceFlagListFulfilled)
            .addCase(fetchInvoiceFlagList.rejected, handleRejected)
            .addCase(fetchInvoiceDetails.pending, handlePending)

            .addCase(fetchInvoiceDetails.fulfilled, handleFetchInvoiceDetailsFulfilled)
            .addCase(fetchInvoiceDetails.rejected, handleRejected)
            .addCase(fetchContractGlobalStatusList.pending, handlePending)
            .addCase(fetchContractGlobalStatusList.fulfilled, handleFetchContractGlobalStatusListFulfilled)
            .addCase(fetchContractGlobalStatusList.rejected, handleRejected)
            .addCase(fetchInvoiceActivityLogList.pending, handleFetchInvoiceActivityLogListPending)
            .addCase(fetchInvoiceActivityLogList.fulfilled, handleFetchInvoiceActivityLogListFulfilled)
            .addCase(fetchInvoiceActivityLogList.rejected, handleFetchInvoiceActivityLogListRejected)

            .addCase(fetchInvoicePaymentLogList.pending, handleFetchInvoicePaymentLogListPending)
            .addCase(fetchInvoicePaymentLogList.fulfilled, handleFetchInvoicePaymentLogListFulfilled)
            .addCase(fetchInvoicePaymentLogList.rejected, handleFetchInvoicePaymentLogListRejected)
            .addCase(payRemainingBalance.pending, handlePending)
            .addCase(payRemainingBalance.fulfilled, handlePayRemainingBalanceFulfilled)
            .addCase(payRemainingBalance.rejected, handleRejected)
            .addCase(fetchReservationFee.pending, handlePending)
            .addCase(fetchReservationFee.fulfilled, handleFetchReservationFeeFulfilled)
            .addCase(fetchReservationFee.rejected, handleRejected)
            .addCase(fetchEmployerCreditList.pending, handlePending)
            .addCase(fetchEmployerCreditList.fulfilled, handleFetchEmployerCreditListFulfilled)
            .addCase(fetchEmployerCreditList.rejected, handleRejected)
            .addCase(uploadInvoicePaymentAttachment.pending, handlePending)
            .addCase(uploadInvoicePaymentAttachment.fulfilled, handleUploadInvoicePaymentAttachmentFulfilled)
            .addCase(uploadInvoicePaymentAttachment.rejected, handleRejected)
            .addCase(fetchActionStatusList.pending, handlePending)
            .addCase(fetchActionStatusList.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.actionStatusList = action.payload?.data ?? state.actionStatusList;
            })
            .addCase(fetchActionStatusList.rejected, handleRejected)
            .addCase(saveChangeInvoiceStatus.pending, handlePending)
            .addCase(saveChangeInvoiceStatus.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.message = action.payload?.message ?? state.message;
            })
            .addCase(saveChangeInvoiceStatus.rejected, handleRejected)
            .addCase(fetchInvoiceGLobalCancellationReason.pending, handlePending)
            .addCase(fetchInvoiceGLobalCancellationReason.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.invoiceCacellationReason = action.payload?.data ?? state.invoiceCacellationReason;
            })
            .addCase(fetchInvoiceGLobalCancellationReason.rejected, (state) => {
                state.invoiceCacellationReason = [];
            })
            .addCase(addRefundInvoice.pending, handlePending)
            .addCase(addRefundInvoice.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.message = action.payload?.message ?? state.message;
            })
            .addCase(addRefundInvoice.rejected, handleRejected)
            .addCase(saveInvoiceExchange.pending, handlePending)
            .addCase(saveInvoiceExchange.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.message = action.payload;
            })
            .addCase(saveInvoiceExchange.rejected, handleRejected)
            .addCase(saveUpdateAdjustPaymentInvoice.pending, handlePending)
            .addCase(saveUpdateAdjustPaymentInvoice.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.message = action.payload;
            })
            .addCase(saveUpdateAdjustPaymentInvoice.rejected, handleRejected)
            .addCase(fetchPolicies.pending, handlePending)
            .addCase(fetchPolicies.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.policiesList = action.payload;
            })
            .addCase(fetchPolicies.rejected, handleRejected);
    },
});

export const { clearMessage, setCurrentInvoiceExchange, clearCurrentInvoiceExchange, clearInvoiceDetails, setFilters, clearFilters, setInvoicePageLimit, setInvoiceHeaderForm, clearInvoiceHeaderForm, setInvoiceContractItemsList, clearInvoiceContractItemsList } = invoicesSlice.actions;

export default invoicesSlice.reducer;