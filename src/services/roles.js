import { SETTINGS_API_URL, apiPath } from './apiPath';
import createApiInstance from './createApiInstance';

const api = createApiInstance(SETTINGS_API_URL);

export const getRoles = (params) => api.get(apiPath.roles, { params });
export const addNewRole = (roleData) => api.post(apiPath.addRole, roleData);
export const getRoleById = (id) => api.get(apiPath.viewRole + id);
export const updateRoleById = (roleData) => api.patch(apiPath.updateRole, roleData);
