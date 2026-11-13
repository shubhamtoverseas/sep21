import { SETTINGS_API_URL, apiPath, API_CHAT_URL } from './apiPath';
import createApiInstance from './createApiInstance';

const api = createApiInstance(SETTINGS_API_URL);
const chatAPI = createApiInstance(API_CHAT_URL);

export const getTemplates = (payload) => api.post(apiPath.getTemplates, payload);
export const getModuleList = (params) => api.get(apiPath.getModuleList, { params });
export const getCategoryList = (params) => api.get(apiPath.getCategoryList, { params });
export const getLanguageList = (params) => api.get(apiPath.getLanguageList, { params });
export const getTemplateConfiguration = (params) => api.get(apiPath.getTemplateConfiguration, { params });
export const getTemplateConfigurationList = (params) => api.get(apiPath.getTemplateConfigurationList, { params });
export const getSendSiteCategories = (params) => api.get(apiPath.getSendSiteCategories, { params });
export const addNewTemplate = (templateData) => api.post(apiPath.addTemplate, templateData);
export const getTemplateById = (id) => api.get(apiPath.getTemplateDetails + id);
export const updateTemplateById = (templateData) => api.patch(apiPath.updateTemplate, templateData);
export const deleteTemplateById = (payloadData) => api.delete(apiPath.deleteTemplate, { data: { ...payloadData } });
export const getTemplateNameByFilter = (templateData) => api.post(apiPath.getTemplateNameByFilter, templateData);
export const previewTemplate = (templateData) => api.post(apiPath.previewTemplate, templateData);
export const reportSendOutcome = (outcomeData) => api.post(apiPath.reportSendOutcome, outcomeData);
export const getTemplateVersions = (params) => api.get(apiPath.getTemplateVersions, { params });
export const sendTemplate = (templateData) => api.post(apiPath.sendTemplate, templateData);
export const sendChatMessageAPI = (templateData) => chatAPI.post(apiPath.sendChatMessageAPI, templateData);
export const sendActionRequiredLogs = (templateData) => chatAPI.post(apiPath.sendActionRequiredLogs, templateData);
export const getActionRequiredLogsList = (params) => chatAPI.get(apiPath.getActionRequiredLogsList, { params });
export const getTemplateWhatsApp = (params) => chatAPI.get(apiPath.getTemplateWhatsApp, { params });
export const sendTemplateMessagePartnerAssign = (templateData) => chatAPI.post(apiPath.sendTemplateMessagePTAssign, templateData);
export const sentWhatsAppTemplateMessageAPI = (templateData) => chatAPI.post(apiPath.sentWhatsAppTemplateMessage, templateData);