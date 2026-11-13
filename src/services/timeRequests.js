import { HRMS_API_URL, apiPath } from './apiPath';
import createApiInstance from './createApiInstance';

const api = createApiInstance(HRMS_API_URL);

export const getTimeRequests = (params) => api.get(apiPath.timeRequests, { params });
export const addNewTimeRequest = (timeRequestData) => api.post(apiPath.addTimeRequests, timeRequestData);
export const getTimeRequestById = (id) => api.get(apiPath.viewTimeRequests + id);
export const updateTimeRequestById = (timeRequestData) => api.patch(apiPath.updateTimeRequests, timeRequestData);
export const getReportTimeRequestHistory = (params) => api.post(apiPath.reportTimeRequest, params);
export const getManagerApprovedTimeRequest = (params) => api.get(apiPath.managerApprovedTimeRequest, {params});
export const addNewManagerApprovedTimeRequest = (timeRequestData) => api.post(apiPath.addManagerApprovedTimeRequest, timeRequestData);
export const deleteManagerApprovedTimeRequestById = (id) => {
    return api.delete(apiPath.deleteManagerApprovedRequestById, { data: { id: id } });
};
export const getManagerApprovedTimeRequestById = (id) => api.get(apiPath.viewManagerApprovedTimeRequests + id);
export const withdrawTimeRequestById = (timeRequestData) => api.patch(apiPath.withdrawTimeRequests, timeRequestData);
export const getReporteesTimeRequests = (params) => api.get(apiPath.reporteesTimeRequestList, { params });
export const updateReporteesTimeRequestActionById = (timeRequestData) => api.patch(apiPath.reporteesTimeRequestAction, timeRequestData);
export const getReportTimeEntry = (params) => api.post(apiPath.reportTimeEntry, params);
