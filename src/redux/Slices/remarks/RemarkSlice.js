import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { handlePending, handleRejected } from '../common/extra-reducers/commonExtraReducers';
import { addNewEmpRemark, addNewProcessingRemark, addNewWorkerRemark, getEmployerRemarks, getProcessingRemarks, getWorkerRemarks, removeEmployerRemark, removeProcessingRemark, removeWorkerRemark, getInvoiceRemarks, addEditInvoiceRemarks, removeInvoiceRemarks, getInsuranceRemarks } from '../../../services/remarks';
import {
  handleAddEmployerRemarkFulfilled,
  handleAddProcessingRemarkFulfilled,
  handleAddWorkerRemarkFulfilled,
  handleDeleteEmployerRemarkFulfilled,
  handleDeleteProcessingRemarkFulfilled,
  handleDeleteWorkerRemarkFulfilled,
  handleFetchEmployerRemarksFulfilled,
  handleFetchProcessingRemarksFulfilled,
  handleFetchWorkerRemarksFulfilled,
  handleUpdateEmployerRemarkFulfilled,
  handleUpdateProcessingRemarkFulfilled,
  handleUpdateWorkerRemarkFulfilled,
  handleFetchInvoiceRemarksFulfilled,
  handleaAdInvoiceRemarksFulfilled,
  handleUpdateInvoiceRemarksFulfilled,
  handleDeleteInvoiceRemarkFulfilled,
} from './remarkExtraReducers';

export const fetchEmployerRemarks = createAsyncThunk(
  'remarks/fetchEmployerRemarks',
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getEmployerRemarks(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const fetchWorkerRemarks = createAsyncThunk(
  'remarks/fetchWorkerRemarks',
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getWorkerRemarks(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const fetchProcessingRemarks = createAsyncThunk(
  'remarks/fetchProcessingRemarks',
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getProcessingRemarks(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const addEmployerRemark = createAsyncThunk(
  'remarks/addEmployerRemark',
  async (remarksData, { rejectWithValue }) => {
    try {
      const response = await addNewEmpRemark(remarksData);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const addWorkerRemark = createAsyncThunk(
  'remarks/addWorkerRemark',
  async (remarksData, { rejectWithValue }) => {
    try {
      const response = await addNewWorkerRemark(remarksData);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const addProcessingRemark = createAsyncThunk(
  'remarks/addProcessingRemark',
  async (remarksData, { rejectWithValue }) => {
    try {
      const response = await addNewProcessingRemark(remarksData);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const updateEmployerRemark = createAsyncThunk(
  'remarks/updateEmployerRemark',
  async (remarksData, { rejectWithValue }) => {
    try {
      const response = await addNewEmpRemark(remarksData);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const updateWorkerRemark = createAsyncThunk(
  'remarks/updateWorkerRemark',
  async (remarksData, { rejectWithValue }) => {
    try {
      const response = await addNewWorkerRemark(remarksData);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const updateProcessingRemark = createAsyncThunk(
  'remarks/updateProcessingRemark',
  async (remarksData, { rejectWithValue }) => {
    try {
      const response = await addNewProcessingRemark(remarksData);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const deleteEmployerRemark = createAsyncThunk(
  'remarks/deleteEmployerRemark',
  async (remarkPayload, { rejectWithValue }) => {
    try {
      const response = await removeEmployerRemark(remarkPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const deleteWorkerRemark = createAsyncThunk(
  'remarks/deleteWorkerRemark',
  async (remarkPayload, { rejectWithValue }) => {
    try {
      const response = await removeWorkerRemark(remarkPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const deleteProcessingRemark = createAsyncThunk(
  'remarks/deleteProcessingRemark',
  async (remarkPayload, { rejectWithValue }) => {
    try {
      const response = await removeProcessingRemark(remarkPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const fetchInvoiceRemarks = createAsyncThunk(
  'remarks/fetchInvoiceRemarks',
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getInvoiceRemarks(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const addInvoiceRemarks = createAsyncThunk(
  'remarks/addInvoiceRemarks',
  async (remarksData, { rejectWithValue, dispatch }) => {
    try {
      const response = await addEditInvoiceRemarks(remarksData);
      if (remarksData?.contract_invoices_id) {
        dispatch(fetchInvoiceRemarks({ invoice_id: remarksData.contract_invoices_id }));
      }
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const updateInvoiceRemarks = createAsyncThunk(
  'remarks/updateInvoiceRemarks',
  async (remarksData, { rejectWithValue, dispatch }) => {
    try {
      const response = await addEditInvoiceRemarks(remarksData);
      if (remarksData?.contract_invoices_id) {
        dispatch(fetchInvoiceRemarks({ invoice_id: remarksData.contract_invoices_id }));
      }
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const deleteInvoiceRemark = createAsyncThunk(
  'remarks/deleteInvoiceRemark',
  async (remarkPayload, { rejectWithValue }) => {
    try {
      const response = await removeInvoiceRemarks(remarkPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const fetchInsuranceRemarks = createAsyncThunk(
  'remarks/fetchInsuranceRemarks',
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getInsuranceRemarks(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

const remarksSlice = createSlice({
  name: 'remarks',
  initialState: {
    employerRemarks: [],
    workerRemarks: [],
    workerHostRemarksHidden: false,   /* W-19: partner viewer without View Host Remarks — the list omits host remarks and says so */
    processingRemarks: [],
    invoiceRemarks: [],
    insuranceRemarks: [],
    status: 'success',
    error: null,
  },
  reducers: {

  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployerRemarks.pending, handlePending)
      .addCase(fetchEmployerRemarks.fulfilled, handleFetchEmployerRemarksFulfilled)
      .addCase(fetchEmployerRemarks.rejected, handleRejected)

      .addCase(addEmployerRemark.pending, handlePending)
      .addCase(addEmployerRemark.fulfilled, handleAddEmployerRemarkFulfilled)
      .addCase(addEmployerRemark.rejected, handleRejected)

      .addCase(addInvoiceRemarks.pending, handlePending)
      .addCase(addInvoiceRemarks.fulfilled, handleaAdInvoiceRemarksFulfilled)
      .addCase(addInvoiceRemarks.rejected, handleRejected)
      .addCase(updateEmployerRemark.pending, handlePending)
      .addCase(updateEmployerRemark.fulfilled, handleUpdateEmployerRemarkFulfilled)
      .addCase(updateEmployerRemark.rejected, handleRejected)

      .addCase(updateInvoiceRemarks.pending, handlePending)
      .addCase(updateInvoiceRemarks.fulfilled, handleUpdateInvoiceRemarksFulfilled)
      .addCase(updateInvoiceRemarks.rejected, handleRejected)

      .addCase(deleteEmployerRemark.pending, handlePending)
      .addCase(deleteEmployerRemark.fulfilled, handleDeleteEmployerRemarkFulfilled)
      .addCase(deleteEmployerRemark.rejected, handleRejected)

      .addCase(deleteInvoiceRemark.pending, handlePending)
      .addCase(deleteInvoiceRemark.fulfilled, handleDeleteInvoiceRemarkFulfilled)
      .addCase(deleteInvoiceRemark.rejected, handleRejected)
      .addCase(fetchWorkerRemarks.pending, handlePending)
      .addCase(fetchWorkerRemarks.fulfilled, handleFetchWorkerRemarksFulfilled)
      .addCase(fetchWorkerRemarks.rejected, handleRejected)
      .addCase(addWorkerRemark.pending, handlePending)
      .addCase(addWorkerRemark.fulfilled, handleAddWorkerRemarkFulfilled)
      .addCase(addWorkerRemark.rejected, handleRejected)
      .addCase(updateWorkerRemark.pending, handlePending)
      .addCase(updateWorkerRemark.fulfilled, handleUpdateWorkerRemarkFulfilled)
      .addCase(updateWorkerRemark.rejected, handleRejected)
      .addCase(deleteWorkerRemark.pending, handlePending)
      .addCase(deleteWorkerRemark.fulfilled, handleDeleteWorkerRemarkFulfilled)
      .addCase(deleteWorkerRemark.rejected, handleRejected)
      .addCase(fetchProcessingRemarks.pending, handlePending)
      .addCase(fetchProcessingRemarks.fulfilled, handleFetchProcessingRemarksFulfilled)
      .addCase(fetchProcessingRemarks.rejected, handleRejected)
      .addCase(addProcessingRemark.pending, handlePending)
      .addCase(addProcessingRemark.fulfilled, handleAddProcessingRemarkFulfilled)
      .addCase(addProcessingRemark.rejected, handleRejected)
      .addCase(updateProcessingRemark.pending, handlePending)
      .addCase(updateProcessingRemark.fulfilled, handleUpdateProcessingRemarkFulfilled)
      .addCase(updateProcessingRemark.rejected, handleRejected)
      .addCase(deleteProcessingRemark.pending, handlePending)
      .addCase(deleteProcessingRemark.fulfilled, handleDeleteProcessingRemarkFulfilled)
      .addCase(deleteProcessingRemark.rejected, handleRejected)
      .addCase(fetchInvoiceRemarks.pending, handlePending)
      .addCase(fetchInvoiceRemarks.fulfilled, handleFetchInvoiceRemarksFulfilled)
      .addCase(fetchInvoiceRemarks.rejected, handleRejected)
      .addCase(fetchInsuranceRemarks.pending, handlePending)
      .addCase(fetchInsuranceRemarks.fulfilled, (state, action) => {
        state.insuranceRemarks = action.payload?.data;
        state.status = 'success';
      })
      .addCase(fetchInsuranceRemarks.rejected, handleRejected);
  },
});

export default remarksSlice.reducer;