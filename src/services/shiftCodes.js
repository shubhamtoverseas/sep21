import { SETTINGS_API_URL, apiPath } from './apiPath';
import createApiInstance from './createApiInstance';

const api = createApiInstance(SETTINGS_API_URL);

export const getShiftCodes = (params) => api.get(apiPath.shiftCodes, { params });
export const addNewShiftCode = (shiftCodeData) => api.post(apiPath.addShiftCode, shiftCodeData);
export const shiftCodeRosterView = (shiftCodeData) => api.post(apiPath.rosterView, shiftCodeData);
export const updateShiftCodeById = (shiftCodeData) => api.patch(apiPath.updateShiftCode, shiftCodeData);
export const uploadShiftCode = (shiftCodeFormData) => {
  return api.post(apiPath.uploadShiftCode, shiftCodeFormData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    responseType: 'arraybuffer'
  });
};
