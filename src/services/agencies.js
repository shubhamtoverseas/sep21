import { SETTINGS_API_URL, apiPath } from './apiPath';
import createApiInstance from './createApiInstance';

const api = createApiInstance(SETTINGS_API_URL);

export const getAgencies = (params) => api.get(apiPath.agencies, { params });
export const getMappingAgencies = (params) => api.get(apiPath.mappingAgencies, { params });
export const getActiveAgencies = (params) => api.get(apiPath.activeAgencies, { params });
export const deleteAgencyById = (agencyId) => {
  return api.delete(apiPath.deleteAgency, { data: { agency_id: agencyId } });
};
export const addNewAgency = (agencyData) => api.post(apiPath.addAgency, agencyData);
export const getAgencyById = (id) => api.get(apiPath.viewAgency + id);
export const updateAgencyById = (agencyData) => api.patch(apiPath.updateAgency, agencyData);
