import { SETTINGS_API_URL, apiPath } from './apiPath';
import createApiInstance from './createApiInstance';

const api = createApiInstance(SETTINGS_API_URL);

export const getBranches = (params) => api.get(apiPath.branches, { params });
export const getBranchesByPartnerStaffIdAPI = (params) => api.get(apiPath.getBranchesByPartnerStaffId, { params });
export const getMappingBranches = (params) => api.get(apiPath.mappingBranches, { params });
export const getActiveBranches = (params) => api.post(apiPath.activeBranches, params);
export const addNewBranch = (branchData) => api.post(apiPath.addBranch, branchData);
export const getBranchById = (id) => api.get(apiPath.viewBranch + id);
export const updateBranchById = (branchData) => api.post(apiPath.updateBranch, branchData);
export const getBranchesByAgencyId = (params) => api.get(apiPath.getBranchesByAgencyId, { params });