import { apiPath, HRMS_API_URL, SETTINGS_API_URL } from './apiPath';
import app from './appClient';
import createApiInstance from './createApiInstance';

const hrmsUrl = createApiInstance(HRMS_API_URL);
const settingsUrl = createApiInstance(SETTINGS_API_URL);

export const getUsers = (params) => app.get(apiPath.users, { params });

export const addNewUser = (userData) => app.post(apiPath.addUser, userData);

export const getUserById = (params) => app.get(apiPath.viewUser, { params });

export const changePassword = (payload) => settingsUrl.post(apiPath.changePassword, payload);

export const updateUserById = (userData) => app.post(apiPath.updateUser, userData);

export const getBranchUsers = (params) => hrmsUrl.get(apiPath.branchUsers, { params });

export const getActiveUsers = (params) => settingsUrl.get(apiPath.activeUsers, { params });

export const getActivePermissionUsers = (params) => settingsUrl.get(apiPath.activePermissionUsers, { params });

export const getPermissionList = (params) => settingsUrl.get(apiPath.permissionsList, { params });

export const savePermissionsAPI = (reqPayload) => settingsUrl.post(apiPath.savePermissions, reqPayload);

export const getPermissionHistory = (params) => settingsUrl.get(apiPath.permissionHistory, { params });

export const getOwnerOnboardingList = (params) => settingsUrl.get(apiPath.ownerOnboardingList, { params });