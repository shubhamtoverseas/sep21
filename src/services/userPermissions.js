import { apiPath, SETTINGS_API_URL } from './apiPath';
import createApiInstance from './createApiInstance';

const api = createApiInstance(SETTINGS_API_URL);

export const getUserPermissions = (params) => api.get(apiPath.userPermissions, { params });
export const getPermissionsWithoutStaff = (params) => api.get(apiPath.permissionsWithoutStaff, { params });
export const getPermissionMapByUser = (params) => api.get(apiPath.permissionMapByUser, { params });
export const savePermissionsMapping = (permissionData) => api.post(apiPath.saveUserPermissionsMapping, permissionData);