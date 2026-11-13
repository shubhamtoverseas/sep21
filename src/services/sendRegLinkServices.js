import axios from "axios";
import authHeader from "./authHeader";
import { apiPath, API_URL } from "./apiPath";
import constData from "../components/ReusableComponents/constants";
const newEmpRegLink = (language, country_code, mobile_number) => {
  return axios
    .post(
      API_URL + apiPath.shareLinkEmployer,
      {
        language,
        country_code,
        mobile_number,
      },
      authHeader(constData.allPermissions.empRegisterLink)
    )
    .then((response) => {
      return response.data;
    });
};
const newWorkerRegLink = (language, country_code, mobile_number) => {
  return axios
    .post(
      API_URL + apiPath.shareLinkWorker,
      {
        language,
        mobile_number,
        country_code,
      },
      authHeader(constData.allPermissions.workerRegisterLink)
    )
    .then((response) => {
      return response.data;
    });
};
const getWhatsappCountryListApi = (type) => {
  return axios
    .post(
      API_URL + apiPath.shareLinkWhatsappList,
      {
        type,
      },
      authHeader()
    )
    .then((response) => {
      return response.data;
    });
};

const sendRegLink = {
  newEmpRegLink,
  newWorkerRegLink,
  getWhatsappCountryListApi,
};
export default sendRegLink;
