import { createSlice, createAsyncThunk, isAnyOf } from '@reduxjs/toolkit';
import {
    searchInsuranceRecordsAPI, getInsuranceMetaAPI, getInsuranceRecordAPI, getInsuranceRecordHistoryAPI,
    resolveInsuranceRefAPI, createInsuranceRecordAPI, renewInsuranceRecordAPI, addInsuranceCoverageAPI, recordInsuranceQbeResultAPI,
    changeInsurancePolicyAPI, editInsuranceRequestAPI, withdrawInsuranceRequestAPI, rejectInsuranceRequestAPI,
    requestInsuranceCancellationAPI, recordInsuranceCancellationResultAPI, addInsuranceCancellationRefAPI, closeInsuranceIssuesAPI,
    createInsuranceSuccessorAPI, correctInsuranceRecordAPI, changeInsuranceBranchAPI, getInsuranceOwnerRecipientsAPI, getInsuranceOwnerPortfolioAPI, changeInsuranceOwnersAPI,
    checkInsuranceCarrierRefAPI, searchInsuranceEmployersAPI,
    createInsuranceWorkerAPI,
} from '../../../services/insurance';
import {
    getEligibleInsuranceInvoicesAdminAPI, getInsuranceRecordViewAdminAPI, getInsuranceRecordViewByIdAdminAPI, searchInsuranceRecordsAdminAPI,
    searchInsuranceWorkersAdminAPI,
} from '../../../services/insuranceAdmin';

/* A refusal keeps the server's code, summary and field errors so screens can show them in place */
const reject = (error, rejectWithValue) => rejectWithValue({
    status: error?.response?.status,
    code: error?.response?.data?.code,
    message: error?.response?.data?.message,
    data: error?.response?.data,
});

/* R5: what the Insurance screens offer this actor (granted filters, search level, capabilities) */
export const fetchInsuranceMeta = createAsyncThunk('insurance/fetchInsuranceMeta', async (_, { rejectWithValue }) => {
    try {
        const response = await getInsuranceMetaAPI();
        return response.data.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

/* The dashboard's meta read: once per page session, as the record page and dialogs read it (`if (!meta)`); a read in
   flight is not sent again, and a failed one is retried on the next visit */
export const ensureInsuranceMeta = () => (dispatch, getState) => {
    const { meta, metaStatus } = getState().insurance || {};
    if (meta || metaStatus === 'loading') return undefined;
    return dispatch(fetchInsuranceMeta());
};

/* R1 for the dashboard, on its admin route (INS-1): rows, coverage cards and work counts in one read */
export const fetchInsuranceRecords = createAsyncThunk('insurance/fetchInsuranceRecords', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await searchInsuranceRecordsAdminAPI(reqPayload);
        return response.data.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

/* R1 for the Worker / Employer Insurance tabs; the caller keeps the rows */
export const fetchPartyInsuranceRecords = createAsyncThunk('insurance/fetchPartyInsuranceRecords', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await searchInsuranceRecordsAPI(reqPayload);
        return response.data.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

/* R2: the record page */
export const fetchInsuranceRecord = createAsyncThunk('insurance/fetchInsuranceRecord', async (ref, { rejectWithValue }) => {
    try {
        const response = await getInsuranceRecordAPI(ref);
        return response.data.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

/* INS-2: the record page's first read of a record — R2's view and the Overview's remarks list in one call */
export const fetchInsuranceRecordView = createAsyncThunk('insurance/fetchInsuranceRecordView', async (ref, { rejectWithValue }) => {
    try {
        const response = await getInsuranceRecordViewAdminAPI(ref);
        return response.data.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

/* INS-2 by id: the legacy /insurances/:id link opens the record page with its view already read */
export const fetchInsuranceRecordViewById = createAsyncThunk('insurance/fetchInsuranceRecordViewById', async (id, { rejectWithValue }) => {
    try {
        const response = await getInsuranceRecordViewByIdAdminAPI(id);
        return response.data.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

/* R3: History tab (the caller keeps the pages) */
export const fetchInsuranceRecordHistory = createAsyncThunk('insurance/fetchInsuranceRecordHistory', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getInsuranceRecordHistoryAPI(reqPayload);
        return response.data.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

/* OP-N2 (kept in I-5): numeric-id notification link → record reference */
export const resolveInsuranceRef = createAsyncThunk('insurance/resolveInsuranceRef', async (id, { rejectWithValue }) => {
    try {
        const response = await resolveInsuranceRefAPI(id);
        return response.data.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

/* M1: New Insurance (standalone or Contract entry); resolves with the created record view */
export const createInsuranceRecord = createAsyncThunk('insurance/createInsuranceRecord', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await createInsuranceRecordAPI(reqPayload);
        return response.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

/* M2: Renew — a Renewal request for the next period; resolves with the record view */
export const renewInsuranceRecord = createAsyncThunk('insurance/renewInsuranceRecord', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await renewInsuranceRecordAPI(reqPayload);
        return response.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

/* M3: Add coverage — an Additional coverage request on the period in force; resolves with the record view */
export const addInsuranceCoverage = createAsyncThunk('insurance/addInsuranceCoverage', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await addInsuranceCoverageAPI(reqPayload);
        return response.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

/* M4 Change policy, M5 Edit request, M7 Withdraw request, M8 Reject request, M9 Request cancellation, M10 Record QBE
   result of a cancellation request, M11 QBE cancellation reference, M12 Close issue, M13 Correct record, M15 Change Branch; each resolves
   with the record view. R9 / M14 (Change CS Owner) resolve with their own payloads. */
const requestThunk = (type, api) => createAsyncThunk(type, async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await api(reqPayload);
        return response.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});
export const changeInsurancePolicy = requestThunk('insurance/changeInsurancePolicy', changeInsurancePolicyAPI);
export const editInsuranceRequest = requestThunk('insurance/editInsuranceRequest', editInsuranceRequestAPI);
export const withdrawInsuranceRequest = requestThunk('insurance/withdrawInsuranceRequest', withdrawInsuranceRequestAPI);
export const rejectInsuranceRequest = requestThunk('insurance/rejectInsuranceRequest', rejectInsuranceRequestAPI);
export const requestInsuranceCancellation = requestThunk('insurance/requestInsuranceCancellation', requestInsuranceCancellationAPI);
export const recordInsuranceCancellationResult = requestThunk('insurance/recordInsuranceCancellationResult', recordInsuranceCancellationResultAPI);
export const addInsuranceCancellationRef = requestThunk('insurance/addInsuranceCancellationRef', addInsuranceCancellationRefAPI);
export const closeInsuranceIssues = requestThunk('insurance/closeInsuranceIssues', closeInsuranceIssuesAPI);
export const createInsuranceSuccessor = requestThunk('insurance/createInsuranceSuccessor', createInsuranceSuccessorAPI);
export const correctInsuranceRecord = requestThunk('insurance/correctInsuranceRecord', correctInsuranceRecordAPI);
export const changeInsuranceBranch = requestThunk('insurance/changeInsuranceBranch', changeInsuranceBranchAPI);
export const fetchInsuranceOwnerRecipients = requestThunk('insurance/fetchInsuranceOwnerRecipients', getInsuranceOwnerRecipientsAPI);
export const fetchInsuranceOwnerPortfolio = requestThunk('insurance/fetchInsuranceOwnerPortfolio', getInsuranceOwnerPortfolioAPI);
export const changeInsuranceOwners = requestThunk('insurance/changeInsuranceOwners', changeInsuranceOwnersAPI);

/* M6: Record QBE result of an open request */
export const recordInsuranceQbeResult = createAsyncThunk('insurance/recordInsuranceQbeResult', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await recordInsuranceQbeResultAPI(reqPayload);
        return response.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

/* R8: live duplicate check of a QBE policy number */
export const checkInsuranceCarrierRef = createAsyncThunk('insurance/checkInsuranceCarrierRef', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await checkInsuranceCarrierRefAPI(reqPayload);
        return response.data.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

/* R6: the invoice picker's rows, on its admin route (INS-4) */
export const fetchEligibleInsuranceInvoices = createAsyncThunk('insurance/fetchEligibleInsuranceInvoices', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getEligibleInsuranceInvoicesAdminAPI(reqPayload);
        return response.data.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

/* R7: Search worker (on its admin route, INS-3: one duplicate check for every row) / Search employer */
export const searchInsuranceWorkers = createAsyncThunk('insurance/searchInsuranceWorkers', async (q, { rejectWithValue }) => {
    try {
        const response = await searchInsuranceWorkersAdminAPI(q);
        return response.data.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

export const searchInsuranceEmployers = createAsyncThunk('insurance/searchInsuranceEmployers', async (q, { rejectWithValue }) => {
    try {
        const response = await searchInsuranceEmployersAPI(q);
        return response.data.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

/* M16: Create Insurance-only worker */
export const createInsuranceWorker = createAsyncThunk('insurance/createInsuranceWorker', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await createInsuranceWorkerAPI(reqPayload);
        return response.data;
    } catch (error) {
        return reject(error, rejectWithValue);
    }
});

const EMPTY_RESULT = {
    rows: [],
    total: 0,
    page: 1,
    limit: 25,
    restricted: false,
    capped: false,
    cards: { active: 0, future: 0, none: 0 },
    work: { requests: 0, attention: 0 },
};

/* The mutations that answer with the fresh record view (insurance-api freshView: R2's own view, read after the change).
   A reply with the reference only (the actor can no longer open the record) carries no view and is not applied. */
const RECORD_VIEW_MUTATIONS = [
    renewInsuranceRecord, addInsuranceCoverage, changeInsurancePolicy, editInsuranceRequest, withdrawInsuranceRequest,
    rejectInsuranceRequest, requestInsuranceCancellation, recordInsuranceCancellationResult, addInsuranceCancellationRef,
    closeInsuranceIssues, correctInsuranceRecord, changeInsuranceBranch, recordInsuranceQbeResult,
];
const isRecordView = (view) => Boolean(view?.ref && view.header);

/* R2 and its INS-2 view land the same way */
const recordPending = (state, action) => {
    state.recordStatus = 'loading';
    state.recordSeed = null;
    if (state.record?.ref !== action.meta.arg) {
        state.record = null;
        state.recordRefusal = null;
    }
};
const recordLoaded = (state, record) => {
    state.recordStatus = 'succeeded';
    state.record = record;
    state.recordRefusal = null;
};
const recordRejected = (state, action) => {
    state.recordStatus = 'failed';
    // A reload of the record already on screen that fails without a refusal (connection, server error) keeps
    // it there; the page says the reload failed. A refusal (no access, cannot open) or a first load replaces it.
    if (state.record?.ref === action.meta.arg && !action.payload?.code) return;
    state.record = null;
    state.recordRefusal = action.payload?.code || 'ERROR';
};

const insuranceSlice = createSlice({
    name: 'insurance',
    initialState: {
        meta: null,
        metaStatus: 'idle',
        records: EMPTY_RESULT,
        recordsRequestId: null,
        record: null,
        recordStatus: 'idle',
        recordRefusal: null,
        /* a record view the legacy link or the wizard has just read: the record page opens on it instead of reading it again */
        recordSeed: null,
        /* counts the views applied from a mutation's reply: the record page then reloads Activity only */
        recordViewSeq: 0,
    },
    reducers: {
        recordSeedUsed: (state) => {
            state.recordSeed = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchInsuranceMeta.pending, (state) => {
                state.metaStatus = 'loading';
            })
            .addCase(fetchInsuranceMeta.fulfilled, (state, action) => {
                state.metaStatus = 'succeeded';
                state.meta = action.payload;
            })
            .addCase(fetchInsuranceMeta.rejected, (state) => {
                state.metaStatus = 'failed';
            })
            /* only the latest R1 read lands: an older response that arrives later is dropped, and a failed latest
               read clears the rows so the dashboard shows its error state instead of another filter's results */
            .addCase(fetchInsuranceRecords.pending, (state, action) => {
                state.recordsRequestId = action.meta.requestId;
            })
            .addCase(fetchInsuranceRecords.fulfilled, (state, action) => {
                if (action.meta.requestId !== state.recordsRequestId) return;
                state.records = { ...EMPTY_RESULT, ...action.payload };
            })
            .addCase(fetchInsuranceRecords.rejected, (state, action) => {
                if (action.meta.requestId !== state.recordsRequestId) return;
                state.records = EMPTY_RESULT;
            })
            .addCase(fetchInsuranceRecord.pending, recordPending)
            .addCase(fetchInsuranceRecord.fulfilled, (state, action) => recordLoaded(state, action.payload))
            .addCase(fetchInsuranceRecord.rejected, recordRejected)
            .addCase(fetchInsuranceRecordView.pending, recordPending)
            .addCase(fetchInsuranceRecordView.fulfilled, (state, action) => recordLoaded(state, action.payload?.record))
            .addCase(fetchInsuranceRecordView.rejected, recordRejected)
            .addCase(fetchInsuranceRecordViewById.fulfilled, (state, action) => {
                if (!isRecordView(action.payload?.record)) return;
                recordLoaded(state, action.payload.record);
                state.recordSeed = action.payload.record.ref;
            })
            /* the wizard's new record: its view is on hand when the record page opens */
            .addMatcher(isAnyOf(createInsuranceRecord.fulfilled, createInsuranceSuccessor.fulfilled), (state, action) => {
                const view = action.payload?.data;
                if (!isRecordView(view)) return;
                recordLoaded(state, view);
                state.recordSeed = view.ref;
            })
            /* a mutation on the record on screen: its reply's view replaces it (no second read) */
            .addMatcher(isAnyOf(...RECORD_VIEW_MUTATIONS.map((thunk) => thunk.fulfilled)), (state, action) => {
                const view = action.payload?.data;
                if (!isRecordView(view) || view.ref !== state.record?.ref) return;
                recordLoaded(state, view);
                state.recordViewSeq += 1;
            });
    },
});

export const { recordSeedUsed } = insuranceSlice.actions;

export default insuranceSlice.reducer;
