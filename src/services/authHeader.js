import { getStoredUser } from "../utils/storage";
import { REACT_APP_X_API_KEY, HOST_TYPE } from "./apiPath";
import { getLocalTimeZone } from "./commonService";

// import storage from "redux-persist/lib/storage";
export default function authHeader(action) {
  const currentUser = getStoredUser();

  return {
    headers: {
      token: currentUser?.token,
      action: action ? action : "",
      language: localStorage.getItem('i18nextLng'),
      'Accept-Language': localStorage.getItem('i18nextLng'),
      timezone: getLocalTimeZone(),
      'x-api-key': REACT_APP_X_API_KEY,
      'hosttype': HOST_TYPE,
      'device': navigator.userAgent
    },
  };
}
