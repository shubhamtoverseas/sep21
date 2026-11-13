import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { setMessage } from "./Messages";
import sendRegLink from "../../services/sendRegLinkServices";
import authService from "../../services/authService";
export const newEmpRegLink = createAsyncThunk(
  "sendRegLink/newEmpRegLink",
  async ({ lang, code, num }, thunkAPI) => {
    try {
      const data = await sendRegLink.newEmpRegLink(lang, code, num);
      return { response: data };
    } catch (error) {
      if (error.response.data.is_logged_out) {
        authService.logout();
      }
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
export const newWorkerRegLink = createAsyncThunk(
  "sendRegLink/worker",
  async ({ lang, code, num }, thunkAPI) => {
    try {
      const data = await sendRegLink.newWorkerRegLink(lang, code, num);
      return { response: data };
    } catch (error) {
      if (error.response.data.is_logged_out) {
        authService.logout();
      }
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

export const getWhatsappCountryList = createAsyncThunk(
  "sendRegLink/getWhatsappCountryList",
  async ({ type }, thunkAPI) => {
    try {
      const data = await sendRegLink.getWhatsappCountryListApi(type);
      return { response: data };
    } catch (error) {
      if (error.response.data.is_logged_out) {
        authService.logout();
      }
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

const initialState = {
  response: null,
  whatsappCountryList: [],
};
const sendRegLinkSlice = createSlice({
  name: "sendRegLink",
  initialState,
  extraReducers: {
    [newEmpRegLink.fulfilled]: (state, action) => {
      state.response = action.payload?.response ?? state.response;
    },
    [newEmpRegLink.rejected]: (state, action) => {
      state.response = null;
      state.message = action.payload;
    },
    [newWorkerRegLink.fulfilled]: (state, action) => {
      state.response = action.payload?.response ?? state.response;
    },
    [newWorkerRegLink.rejected]: (state, action) => {
      state.response = null;
      state.message = action.payload;
    },
    [getWhatsappCountryList.fulfilled]: (state, action) => {
      state.whatsappCountryList = action.payload?.response?.data ?? state.whatsappCountryList;
    },
    [getWhatsappCountryList.rejected]: (state, action) => {
      state.whatsappCountryList = null;
      state.message = action.payload;
    },
  },
});

const { reducer } = sendRegLinkSlice;
export default reducer;
