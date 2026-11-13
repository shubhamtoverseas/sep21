import { HRMS_API_URL, apiPath } from './apiPath';
import createApiInstance from './createApiInstance';

const api = createApiInstance(HRMS_API_URL);

export const getLedger = (params) => api.get(apiPath.ledger, { params });