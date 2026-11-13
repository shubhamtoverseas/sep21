import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handlePending, handleRejected } from '../extra-reducers/commonExtraReducers';
import { forgotPasswordAPI, loginAppAPI, logoutAppAPI, resetPasswordAPI, verifyOtpAPI } from '../../../../services/login';
import { handleForgotPasswordFulfilled, handleLoginAppFulfilled, handleLogoutAppFulfilled, handleResetPasswordFulfilled, handleVerifyOtpFulfilled } from './loginExtraReducers';

export const loginApp = createAsyncThunk('login/loginApp', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await loginAppAPI(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data)
    }
});

export const forgotPassword = createAsyncThunk('login/forgotPassword', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await forgotPasswordAPI(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data)
    }
});

export const resetPassword = createAsyncThunk('login/resetPassword', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await resetPasswordAPI(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data)
    }
});

export const verifyOTP = createAsyncThunk('login/verifyOTP', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await verifyOtpAPI(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data)
    }
});

export const logoutApp = createAsyncThunk('login/logoutApp', async (params, { rejectWithValue }) => {
    try {
        const response = await logoutAppAPI(params);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data)
    }
});

const loginSlice = createSlice({
    name: 'login',
    initialState: {
        status: 'idle',
        error: null
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginApp.pending, handlePending)
            .addCase(loginApp.fulfilled, handleLoginAppFulfilled)
            .addCase(loginApp.rejected, handleRejected)
            .addCase(forgotPassword.pending, handlePending)
            .addCase(forgotPassword.fulfilled, handleForgotPasswordFulfilled)
            .addCase(forgotPassword.rejected, handleRejected)
            .addCase(resetPassword.pending, handlePending)
            .addCase(resetPassword.fulfilled, handleResetPasswordFulfilled)
            .addCase(resetPassword.rejected, handleRejected)
            .addCase(verifyOTP.pending, handlePending)
            .addCase(verifyOTP.fulfilled, handleVerifyOtpFulfilled)
            .addCase(verifyOTP.rejected, handleRejected)
            .addCase(logoutApp.pending, handlePending)
            .addCase(logoutApp.fulfilled, handleLogoutAppFulfilled)
            .addCase(logoutApp.rejected, handleRejected)
    }
});

export default loginSlice.reducer;
