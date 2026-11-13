import { SETTINGS_API_URL, apiPath } from './apiPath';
import createApiInstance from './createApiInstance';

const settingApi = createApiInstance(SETTINGS_API_URL);

export const getFeedbackListAPI = (reqPayload) => settingApi.post(apiPath.getFeedbackList, reqPayload);