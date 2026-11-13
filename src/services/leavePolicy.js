import { SETTINGS_API_URL, apiPath } from './apiPath';
import createApiInstance from './createApiInstance';

const api = createApiInstance(SETTINGS_API_URL);

export const getLeavePolicyMaster = (params) => api.get(apiPath.leavePolicyMasterList, { params });
export const getLeaveMasterView = (id) => api.get(apiPath.viewLeaveMaster + id);
export const addNewLeavePolicy = (leaveData) => api.post(apiPath.addLeavePolicy, leaveData);
export const addMasterLeavePolicyAPI = (leaveData) => api.post(apiPath.addMasterLeavePolicy, leaveData);
export const updateMasterLeavePolicyAPI = (leaveData) => api.patch(apiPath.updateMasterLeavePolicy, leaveData);
export const updateLeavePolicyById = (leaveData) => api.patch(apiPath.updateLeavePolicy, leaveData);
