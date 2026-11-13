import { HRMS_API_URL, apiPath } from './apiPath';
import createApiInstance from './createApiInstance';

const api = createApiInstance(HRMS_API_URL);

export const getLeaves = (params) => api.get(apiPath.leaves, { params });
export const getLeaveById = (id) => api.get(apiPath.viewLeave + id);
export const getLeaveTypes = (params) => api.get(apiPath.leaveTypeList, params ? { params } : undefined);   /* hrms 275: `user_id` = another user's types */
export const getLeaveBalance = (id) => api.get(apiPath.leaveBalance + id);
export const addNewLeave = (leaveData) => api.post(apiPath.addLeave, leaveData);
export const getLeaveEligibilityCheck = (reqPayload) => api.post(apiPath.eligibilityCheck, reqPayload);
export const withdrawLeaveById = (id) => api.get(apiPath.withdrawLeave + id);
export const updateLeaveById = (leaveData) => api.patch(apiPath.updateLeave, leaveData);
export const getReporteesLeaves = (params) => api.get(apiPath.reporteesLeaves, { params });
export const reposteesLeaveStatusChangeByIds = (reporteesLeaveData) => api.post(apiPath.reporteesLeaveStatusChange, reporteesLeaveData);
export const reposteesIndividualLeaveStatusChangeByIds = (reporteesLeaveData) => api.post(apiPath.reporteesIndividualLeaveStatusChange, reporteesLeaveData);
export const getReportLeaveHistory = (params) => api.post(apiPath.reportLeaveHistory, params);
export const getScheduleComplianceList = (params) => api.post(apiPath.scheduleComplianceList, params);
export const addManualUpdateLeave = (manualUpdateLeaveData) => api.post(apiPath.manualUpdateLeave, manualUpdateLeaveData);