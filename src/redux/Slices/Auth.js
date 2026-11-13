import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { setMessage } from "./Messages";
import AuthService from "../../services/authService";
import { getStoredUser } from "../../utils/storage";
let user = {};
try {
  user = getStoredUser();
} catch (error) {
  user = false;
}
export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }, thunkAPI) => {
    try {
      const data = await AuthService.login(email, password);
      return { user: data };
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      thunkAPI.dispatch(setMessage(message));
      return thunkAPI.rejectWithValue(message);
    }
  }
);
export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async (email, thunkAPI) => {
    try {
      const data = await AuthService.forgotPassword(email);
      return { response: data };
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      thunkAPI.dispatch(setMessage(message));
      return thunkAPI.rejectWithValue();
    }
  }
);
export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ password, token }, thunkAPI) => {
    try {
      const data = await AuthService.resetPassword(password, token);
      return { response: data };
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      thunkAPI.dispatch(setMessage(message));
      return thunkAPI.rejectWithValue();
    }
  }
);
export const logout = createAsyncThunk("auth/logout", async () => {
  await AuthService.logout();
});
const initialState = user
  ? { isLoggedIn: true, user, response: null }
  : { isLoggedIn: false, user: null, response: null };
const authSlice = createSlice({
  name: "auth",
  initialState,
  extraReducers: {
    [login.fulfilled]: (state, action) => {
      state.isLoggedIn = true;
      state.user = action.payload?.user ?? state.user;
      localStorage.setItem("userLoginTime", new Date().getTime());
    },
    [login.rejected]: (state, action) => {
      state.isLoggedIn = false;
      state.user = null;
      state.message = action.payload;
    },
    [forgotPassword.fulfilled]: (state, action) => {
      state.isLoggedIn = false;
      state.user = null;
      state.response = action.payload?.response ?? state.response;
    },
    [logout.fulfilled]: (state) => {
      state.isLoggedIn = false;
      state.user = null;
    },
  },
});
const { reducer } = authSlice;
export default reducer;
