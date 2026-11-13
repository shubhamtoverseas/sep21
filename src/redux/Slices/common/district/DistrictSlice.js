import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handleDistrictByCountryCodeFulfilled, handleFetchDistrictFulfilled } from './districtExtraReducers';
import { handlePending, handleRejected } from '../extra-reducers/commonExtraReducers';
import { getDistrict, getDistrictByCountryCode } from '../../../../services/commonApi';

export const fetchDistrict = createAsyncThunk(
  'district/fetchDistrict',
  async (reqPayload, { rejectWithValue }) => {
    try {
      const response = await getDistrict(reqPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);

export const fetchDistrictByCountryCode = createAsyncThunk(
  'district/fetchDistrictByCountryCode',
  async (countryCode, { rejectWithValue }) => {
    try {
      const response = await getDistrictByCountryCode(countryCode);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        data: error.response || 'An error occurred',
      });
    }
  }
);


const districtSlice = createSlice({
  name: 'district',
  initialState: {
    district: [],
    districtsByCountryCode: [],
    status: 'idle',
    error: null
  },
  reducers: {
    clearDistrict(state) {
      state.districtsByCountryCode = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDistrict.pending, handlePending)
      .addCase(fetchDistrict.fulfilled, handleFetchDistrictFulfilled)
      .addCase(fetchDistrict.rejected, handleRejected)
      .addCase(fetchDistrictByCountryCode.pending, handlePending)
      .addCase(fetchDistrictByCountryCode.fulfilled, handleDistrictByCountryCodeFulfilled)
      .addCase(fetchDistrictByCountryCode.rejected, handleRejected)

  }
});

export const { clearDistrict } = districtSlice.actions;

export default districtSlice.reducer;
