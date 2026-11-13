import { SETTINGS_API_URL, apiPath } from '../apiPath';
import createApiInstance from '../createApiInstance';

const api = createApiInstance(SETTINGS_API_URL);

export const getMedicalListAPI = (params) => api.get(apiPath.medicalClinicList, { params });
export const saveMedicalClinicAPI = (reqPayload) => api.post(apiPath.saveMedicalClinic, reqPayload);
export const viewMedicalClinicAPI = (clinicId) => api.get(apiPath.viewMedicalClinic + clinicId);