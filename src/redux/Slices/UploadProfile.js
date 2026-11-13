import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import authService from "../../services/authService";
import uploadFileToS3 from "../../services/awsS3Functions";
export const uploadProfile = createAsyncThunk(
  "uploadProfile/uploadProfile",
  async (file, thunkAPI) => {
    try {
      const data = await uploadFileToS3(file, "profile");
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
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const uploadProfileCustomFolder = createAsyncThunk(
  "uploadProfile/uploadProfileCustomFolder",
  async (payload, thunkAPI) => {
    try {
      const data = await uploadFileToS3(payload.file, payload.folder);
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
      return thunkAPI.rejectWithValue(message);
    }
  }
);



const initialState = {
  url: "",
  filename: "",
  response: null,
  fileResponse: null,
};
const uploadProfileSlice = createSlice({
  name: "uploadProfile",
  initialState,
  extraReducers: {
    [uploadProfile.fulfilled]: (state, action) => {
      state.response = action.payload?.response ?? state.response;
      state.url = action.payload?.response?.url ?? state.url;
      state.filename = action.payload?.response?.filename ?? state.filename;
    },
    [uploadProfileCustomFolder.fulfilled]: (state, action) => {
      state.fileResponse = action.payload?.response ?? state.fileResponse;
      state.url = action.payload?.response?.url ?? state.url;
      state.filename = action.payload?.response?.filename ?? state.filename;
    },
    clearOriginalImage: (state) => {
      state.response = null;
      state.fileResponse = null;
      state.url = "";
    },
  },
});
const { reducer } = uploadProfileSlice;
export default reducer;
