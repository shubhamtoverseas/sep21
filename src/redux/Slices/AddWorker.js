import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import authService from "../../services/authService";
import { setGlobalWorkerStatus } from "../../services/workers";

export const changeWorkerStatusGlobal = createAsyncThunk(
  "changeWorkerStatus/changeWorkerStatusGlobal",
  async (params, thunkAPI) => {
    try {
      const data = await setGlobalWorkerStatus(params);
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
      /* batch C (W-12): the refusal code travels so the record can tell a stale version (409 STALE_VERSION) from a rule refusal */
      return thunkAPI.rejectWithValue({ message, code: error.response?.data?.code, data: error.response?.data?.data });
    }
  }
);

const addWorkerSlice = createSlice({
  name: "addWorker",
  initialState: {},
  reducers: {},
});
const { reducer } = addWorkerSlice;
export default reducer;
