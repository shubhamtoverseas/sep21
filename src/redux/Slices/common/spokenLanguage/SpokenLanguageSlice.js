import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handleFetchSpokenLanguageFulfilled } from './spokenLanguageExtraReducers';
import { handlePending, handleRejected } from '../extra-reducers/commonExtraReducers';
import { getspokenLanguage } from '../../../../services/commonApi';

export const fetchSpokenLanguage = createAsyncThunk(
    'spokenLanguage/fetchSpokenLanguage',
    async (reqPayload, { rejectWithValue }) => {
      try {
        const response = await getspokenLanguage(reqPayload);
        return response.data;
      } catch (error) {
        return rejectWithValue({
          data: error.response || 'An error occurred',
        });
      }
    }
  );
  

const spokenLanguageSlice = createSlice({
    name: 'spokenLanguage',
    initialState: {
        spokenLanguage: [],
        status: 'idle',
        error: null
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchSpokenLanguage.pending, handlePending)
            .addCase(fetchSpokenLanguage.fulfilled, handleFetchSpokenLanguageFulfilled)
            .addCase(fetchSpokenLanguage.rejected, handleRejected)
    }
});

export default spokenLanguageSlice.reducer;
