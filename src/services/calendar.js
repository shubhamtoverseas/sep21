import { HRMS_API_URL, apiPath } from './apiPath';
import createApiInstance from './createApiInstance';

const api = createApiInstance(HRMS_API_URL);

export const getCalendar = (params) => api.get(apiPath.calendar, { params });
export const viewalendarTaskAPI = (taskId) => api.get(apiPath.viewalendarTask+taskId);
export const createCalendarTaskAPI = (reqPayload) => api.post(apiPath.createCalendarTask, reqPayload);
export const setCalendarTaskStatusAPI = (reqPayload) => api.post(apiPath.calendarTaskStatus, reqPayload);
export const getCalendarTaskTransferTargetsAPI = (params) => api.get(apiPath.calendarTaskTransferTargets, { params });
export const transferCalendarTaskAPI = (reqPayload) => api.post(apiPath.calendarTaskTransfer, reqPayload);
export const getCalendarTaskTemplatesAPI = (params) => api.get(apiPath.calendarTaskTemplates, { params });
/* S10: the tasks of one record + outstanding_count (HRMS API A5, GET /hrms/task/list?source_type&source_id) */
export const getSourceTasksAPI = (params) => api.get(apiPath.sourceTasks, { params });
export const saveCalendarTaskTemplateAPI = (reqPayload) => api.post(apiPath.calendarTaskTemplateSave, reqPayload);
export const retireCalendarTaskTemplateAPI = (reqPayload) => api.post(apiPath.calendarTaskTemplateRetire, reqPayload);
