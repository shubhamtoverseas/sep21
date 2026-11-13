import { apiPath, HRMS_API_URL } from './apiPath';
import createApiInstance from './createApiInstance';

const hrmsUrl = createApiInstance(HRMS_API_URL);

export const getUserSessionHistory = (reqPayload) => hrmsUrl.post(apiPath.userSessionHistory, reqPayload);