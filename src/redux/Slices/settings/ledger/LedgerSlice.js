import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    getLedger,
} from '../../../../services/ledger';
import {
    handleFetchLedgerFulfilled,
} from './ledgerExtraReducers';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';

export const fetchLedger = createAsyncThunk('ledger/getLedger', async (params, { rejectWithValue }) => {
    try {
        const response = await getLedger(params);
        return response.data.data;
    } catch (error) {
        return rejectWithValue({
            data: error.response || 'An error occurred',
          });
    }
});

const LedgerSlice = createSlice({
    name: 'ledger',
    initialState: {
        ledger: [],
        status: 'idle',
        error: null,
        currentLedger: null,
        currentPage: 1,
        perPage: 10,
        totalPages: 0,
        totalLedger: 0,
        lastUpdated: '',
        message: null,
    },
    reducers: {
        clearLedgerState(state) {
            state.ledger = [];
        },
        clearMessage(state) {
            state.message = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchLedger.pending, handlePending)
            .addCase(fetchLedger.fulfilled, handleFetchLedgerFulfilled)
            .addCase(fetchLedger.rejected, handleRejected)
    },
});

export const { clearMessage, clearLedgerState } = LedgerSlice.actions;

export default LedgerSlice.reducer;
