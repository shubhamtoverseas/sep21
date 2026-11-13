import { SETTINGS_API_URL, apiPath } from './apiPath';
import createApiInstance from './createApiInstance';

const api = createApiInstance(SETTINGS_API_URL);

export const getDoops = (params) => api.get(apiPath.doops, { params });
export const addNewDoop = (doopData) => api.post(apiPath.addDoop, doopData);
export const getDoopById = (id) => api.get(apiPath.viewDoop + id);
export const updateDoopById = (doopData) => api.patch(apiPath.updateDoop, doopData);