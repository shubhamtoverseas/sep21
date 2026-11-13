import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import storage from "redux-persist/lib/storage";
import { apiPath, API_URL, APP_URL, REACT_APP_X_API_KEY, HOST_TYPE } from "./apiPath";
import { getAccessToken, getLocalTimeZone, showSuccessOrError } from "./commonService";
import { logoutApp } from "../redux/Slices/common/login/LoginSlice";

const login = (email, password) => {
  return axios
    .post(
      APP_URL + apiPath.login,
      {
        email,
        password,
      },
      {
        headers: {
          language: localStorage.getItem('i18nextLng'),
          'Accept-Language': localStorage.getItem('i18nextLng'),
          timezone: getLocalTimeZone(),
          'x-api-key': REACT_APP_X_API_KEY,
          'hosttype': HOST_TYPE,
          'device': navigator.userAgent,
          'Idempotency-Key': uuidv4()
        },
      }
    )
    .then((response) => {
      if (response.data.token) {
        const userData = response.data;

        sessionStorage.setItem("user", JSON.stringify(userData));
      }
      return response.data;
    });
};
const forgotPassword = (email) => {
  return axios
    .post(API_URL + apiPath.forgotPassword, {
      email,
    }, {
      headers: { 'Idempotency-Key': uuidv4() },
    })
    .then((response) => {
      return response.data;
    });
};
const resetPassword = (password, token) => {
  return axios
    .post(API_URL + apiPath.resetPassword, {
      password,
      token,
    }, {
      headers: { 'Idempotency-Key': uuidv4() },
    })
    .then((response) => {
      return response.data;
    });
};
const logout = () => {
  const { store } = require("../redux/store");
  const token = getAccessToken();
  store.dispatch(logoutApp({ token })).then((res) => {
    showSuccessOrError(res);
    if (!res.error) {
      localStorage.removeItem("user");
      localStorage.clear();
      sessionStorage.clear();
      storage.removeItem("persist:root");
      window.location.href = "/login";
    }
  });
};
const authService = {
  login,
  logout,
  forgotPassword,
  resetPassword,
};
export default authService;
