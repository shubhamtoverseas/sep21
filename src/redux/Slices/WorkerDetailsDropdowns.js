import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { setMessage } from "./Messages";
import { apiPath } from "../../services/apiPath";
import workerDetailsApi from "../../services/workerDetailsApi";
import authService from "../../services/authService";

export const getWorkerStatus = createAsyncThunk(
  "workerDetails/getWorkerStatus",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.getWorkerStatus
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);

export const getPt_Ts = createAsyncThunk(
  "workerDetails/getPt_Ts",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(apiPath.getpt_ts);
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
      return thunkAPI.rejectWithValue();
    }
  }
);

export const getWorkerCurrentLocation = createAsyncThunk(
  "workerDetails/getWorkerCurrentLocation",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerCurrentLocation
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);

export const getWorkerGender = createAsyncThunk(
  "workerDetails/getWorkergender",
  async (isKid, thunkAPI) => {
    try {
      const data = await workerDetailsApi.getGenders(isKid);
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
      return thunkAPI.rejectWithValue();
    }
  }
);

export const getCountryCode = createAsyncThunk(
  "workerDetails/getCountryCode",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.getCountryCodes
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);

export const getWhatsappCountryCode = createAsyncThunk(
  "workerDetails/getWhatsappCountryCode",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerWhatsappCountryCode
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);

export const getContractStatus = createAsyncThunk(
  "workerDetails/getContractStatus",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerContractStatus
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);

export const getLanguages = createAsyncThunk(
  "workerDetails/getLanguages",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerLanguages
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);

export const getHeightMeasurement = createAsyncThunk(
  "workerDetails/getHeightMeasurement",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerHeightMeasurement
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);

export const getHoroscope = createAsyncThunk(
  "workerDetails/getHoroscope",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerHoroscope
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);

export const getChineseHoroscope = createAsyncThunk(
  "workerDetails/getChineseHoroscope",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerChineseHoroscope
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);

export const getWeightMeasurement = createAsyncThunk(
  "workerDetails/getWeightMeasurement",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerWeightMeasurement
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);

export const getReligion = createAsyncThunk(
  "workerDetails/getReligion",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerReligion
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);

export const getMaritalStatus = createAsyncThunk(
  "workerDetails/getMaritalStatus",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerMaritalStatus
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);

export const getChildrenCount = createAsyncThunk(
  "workerDetails/getChildrenCount",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerChildrenCount
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);
export const getSiblingsCount = createAsyncThunk(
  "workerDetails/getSiblingsCount",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerNoOfSiblings
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);
export const getEducation = createAsyncThunk(
  "workerDetails/getEducation",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerEducation
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);
export const getSpecialCourses = createAsyncThunk(
  "workerDetails/getSpecialCourses",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerSpecialCourses
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);
export const getWorkerExperience = createAsyncThunk(
  "workerDetails/getWorkerExperience",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.WorkerExperience
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);
export const getMainSkills = createAsyncThunk(
  "workerDetails/getMainSkills",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerMainSkills
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);
export const getCooking = createAsyncThunk(
  "workerDetails/getCooking",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerCooking
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);
export const getWorkerNationality = createAsyncThunk(
  "workerDetails/getNationality",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerNationality
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);
export const getWorkerCountries = createAsyncThunk(
  "workerDetails/getWorkerCountries",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerCountry
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);
export const getWorkerDistrict = createAsyncThunk(
  "workerDetails/getWorkerDistrict",
  async (country, thunkAPI) => {
    try {
      if (country === "") {
        return { response: [] };
      } else {
        const data = await workerDetailsApi.getWorkerDistrict(
          apiPath.workerDistrict,
          country
        );
        return { response: data.data };
      }
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
      return thunkAPI.rejectWithValue();
    }
  }
);
export const getMainDuties = createAsyncThunk(
  "workerDetails/getMainDuties",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.worker_duties
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);
export const getWorkerRole = createAsyncThunk(
  "workerDetails/getWorkerRole",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(apiPath.workerRole);
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
      return thunkAPI.rejectWithValue();
    }
  }
);
export const getMonths = createAsyncThunk(
  "workerDetails/getMonths",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(
        apiPath.workerMonths
      );
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
      return thunkAPI.rejectWithValue();
    }
  }
);
export const getAgeList = createAsyncThunk(
  "workerDetails/getAgeList",
  async (thunkAPI) => {
    try {
      const data = await workerDetailsApi.getWorkerDetails(apiPath.getAgelist);
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
      return thunkAPI.rejectWithValue();
    }
  }
);

export const fetchHeightMeasurementList = createAsyncThunk(
  "workerDetails/fetchHeightMeasurementList",
  async (payload, thunkAPI) => {
    try {
      const data = await workerDetailsApi.getHeightMeasurementList(payload);
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
      return thunkAPI.rejectWithValue();
    }
  }
);


const initialState = {
  workerStatus: [],
  pt_ts: [],
  workerCurrentLocation: [],
  gender: [],
  kidsGender: [],
  countryCodes: [],
  whatsappCountryCode: [],
  heightMeasurementList: [],
  contractStatus: [],
  languages: [],
  nationality: [],
  heightMeasurement: [],
  horoscope: [],
  chineseHoroscope: [],
  weightMeasurement: [],
  religion: [],
  maritalStatus: [],
  childrenCount: [],
  siblingsCount: [],
  education: [],
  specialCourses: [],
  experienceList: [],
  mainSkills: [],
  cooking: [],
  districts: [],
  mainDuties: [],
  role: [],
  ageList: [],
  months: [],
};

const workerDetailsSlice = createSlice({
  name: "workerDetails",
  initialState,
  extraReducers: {
    [getWorkerStatus.fulfilled]: (state, action) => {
      state.workerStatus = action.payload?.response?.data ?? state.workerStatus;
    },
    [getPt_Ts.fulfilled]: (state, action) => {
      state.pt_ts = action.payload?.response?.data ?? state.pt_ts;
    },
    [getWorkerCurrentLocation.fulfilled]: (state, action) => {
      state.workerCurrentLocation = action.payload?.response?.data ?? state.workerCurrentLocation;
    },
    [getWorkerGender.fulfilled]: (state, action) => {
      state.gender = (action.payload?.response?.data ?? []).filter((item) => {
        if (!item.is_kid) {
          return item;
        }
      });
      state.kidsGender = (action.payload?.response?.data ?? []).filter((item) => {
        if (item.is_kid) {
          return item;
        }
      });
    },
    [getCountryCode.fulfilled]: (state, action) => {
      state.countryCodes = action.payload?.response?.data ?? state.countryCodes;
    },
    [getWhatsappCountryCode.fulfilled]: (state, action) => {
      state.whatsappCountryCode = action.payload?.response?.data ?? state.whatsappCountryCode;
    },
    [getContractStatus.fulfilled]: (state, action) => {
      state.contractStatus = action.payload?.response?.data ?? state.contractStatus;
    },
    [getLanguages.fulfilled]: (state, action) => {
      state.languages = action.payload?.response?.data ?? state.languages;
    },
    [getHeightMeasurement.fulfilled]: (state, action) => {
      state.heightMeasurement = action.payload?.response?.data ?? state.heightMeasurement;
    },
    [fetchHeightMeasurementList.fulfilled]: (state, action) => {
      state.heightMeasurementList = action.payload?.response?.data?.data ?? state.heightMeasurementList;
    },
    [getHoroscope.fulfilled]: (state, action) => {
      state.horoscope = action.payload?.response?.data ?? state.horoscope;
    },
    [getChineseHoroscope.fulfilled]: (state, action) => {
      state.chineseHoroscope = action.payload?.response?.data ?? state.chineseHoroscope;
    },
    [getWeightMeasurement.fulfilled]: (state, action) => {
      state.weightMeasurement = action.payload?.response?.data ?? state.weightMeasurement;
    },
    [getReligion.fulfilled]: (state, action) => {
      state.religion = action.payload?.response?.data ?? state.religion;
    },
    [getMaritalStatus.fulfilled]: (state, action) => {
      state.maritalStatus = action.payload?.response?.data ?? state.maritalStatus;
    },
    [getChildrenCount.fulfilled]: (state, action) => {
      state.childrenCount = action.payload?.response?.data ?? state.childrenCount;
    },
    [getSiblingsCount.fulfilled]: (state, action) => {
      state.siblingsCount = action.payload?.response?.data ?? state.siblingsCount;
    },
    [getEducation.fulfilled]: (state, action) => {
      state.education = action.payload?.response?.data ?? state.education;
    },
    [getSpecialCourses.fulfilled]: (state, action) => {
      state.specialCourses = action.payload?.response?.data ?? state.specialCourses;
    },
    [getWorkerExperience.fulfilled]: (state, action) => {
      state.experienceList = action.payload?.response?.data ?? state.experienceList;
    },
    [getMainSkills.fulfilled]: (state, action) => {
      state.mainSkills = action.payload?.response?.data ?? state.mainSkills;
    },
    [getCooking.fulfilled]: (state, action) => {
      state.cooking = action.payload?.response?.data ?? state.cooking;
    },
    [getWorkerNationality.fulfilled]: (state, action) => {
      state.nationality = action.payload?.response?.data ?? state.nationality;
    },
    [getWorkerCountries.fulfilled]: (state, action) => {
      state.countries = action.payload?.response?.data ?? state.countries;
    },
    [getWorkerDistrict.fulfilled]: (state, action) => {
      state.districts = action.payload?.response ?? state.districts;
    },
    [getMainDuties.fulfilled]: (state, action) => {
      state.mainDuties = action.payload?.response?.data ?? state.mainDuties;
    },
    [getWorkerRole.fulfilled]: (state, action) => {
      state.role = action.payload?.response?.data ?? state.role;
    },
    [getMonths.fulfilled]: (state, action) => {
      state.months = action.payload?.response?.data ?? state.months;
    },
    [getAgeList.fulfilled]: (state, action) => {
      state.ageList = action.payload?.response?.data ?? state.ageList;
    },
  },
});

const { reducer } = workerDetailsSlice;
export default reducer;
