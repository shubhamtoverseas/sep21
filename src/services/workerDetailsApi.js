import axios from "axios";
import authHeader from "./authHeader";
import { apiPath, API_URL } from "./apiPath";
import app from "./appClient";
import constData from "../components/ReusableComponents/constants";
const getWorkerDetails = (subUrl) => {
  if (subUrl === apiPath.getCountryCodes) {
    return axios
      .post(
        API_URL + subUrl,
        {
          type: "worker",
        },
        authHeader()
      )
      .then((response) => {
        return response.data;
      });
  } else {
    return axios.get(API_URL + subUrl, authHeader()).then((response) => {
      return response.data;
    });
  }
};
const getWorkerDistrict = (subUrl, country) => {
  return axios
    .post(
      API_URL + subUrl,
      {
        location_id: country,
      },
      authHeader()
    )
    .then((response) => {
      return response.data;
    });
};
const getWorkerInfo = (workerId) => {
  return axios
    .post(
      API_URL + apiPath.getWorkerInfo,
      {
        worker_id: workerId,
      },
      authHeader(constData.allPermissions.workerInfo)
    )
    .then((response) => {
      return response.data;
    });
};
const getGenders = (isKid) => {
  return axios
    .post(
      API_URL + apiPath.workerGender,
      {
        is_kid: isKid,
      },
      authHeader()
    )
    .then((response) => {
      return response.data;
    });
};

const getHeightMeasurementList = (params) => app.get(apiPath.workerHeightMeasurement, { params });

const workerDetailsApi = {
  getWorkerDetails,
  getWorkerDistrict,
  getWorkerInfo,
  getGenders,
  getHeightMeasurementList
};
export default workerDetailsApi;
