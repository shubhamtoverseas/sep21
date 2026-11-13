import { API_CHAT_URL, apiPath } from './apiPath';
import createApiInstance from './createApiInstance'
import app from './appClient';

const api = createApiInstance(API_CHAT_URL);

export const getAllSentMessages = (reqPayload) => app.post(apiPath.getAllSentMessages, reqPayload);
export const getAllReceivedMessages = (reqPayload) => app.post(apiPath.getAllReceivedMessages, reqPayload);
export const setIntConversation = (reqPayload) => api.post(apiPath.initConversation, reqPayload);
export const getAllMessageList = (reqPayload) => api.post(apiPath.getChatMessageList, reqPayload);
export const getAllConversactionList = (reqPayload) => api.post(apiPath.getAllConversactionList, reqPayload);
export const getConversactions = (reqPayload) => api.post(apiPath.getConversactions, reqPayload);
export const getChatHistoryList = (reqPayload) => api.post(apiPath.getChatHistoryList, reqPayload);
export const createGroupConversationChat = (reqPayload) => api.post(apiPath.createGroupConversationChat, reqPayload);
export const getRestrictedKey = () => app.get(apiPath.getRestrictedKey);
export const addWhatsappWelcomeMessage = (reqPayload) => api.post(apiPath.addWhatsappWelcomeMessage, reqPayload);
export const getConversactionsHistory = (reqPayload) => api.post(apiPath.getConversactionsHistory, reqPayload);
export const getConversactionListAll = (reqPayload) => api.post(apiPath.getConversactionListAll, reqPayload);
export const getTotalUnreadMessageCount = (reqPayload) => api.post(apiPath.getTotalUnreadMessageCount, reqPayload);
export const saveTranslationLanguageChat = (reqPayload) => api.post(apiPath.saveTranslationLanguageChat, reqPayload);
export const getTranslationLanguageChat = (reqPayload) => api.get(apiPath.getTranslationLanguageChat, { params: reqPayload });