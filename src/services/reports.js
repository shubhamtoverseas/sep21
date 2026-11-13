import { HRMS_API_URL, apiPath } from './apiPath';
import createApiInstance from './createApiInstance';

const api = createApiInstance(HRMS_API_URL);

export const getReportOfJobOfferList = (params) => api.post(apiPath.reportOfJobOfferList, params );
export const getReportOfInsuranceList = (params) => api.post(apiPath.reportOfInsuranceList, params );
export const getReportOfContractList = (params) => api.post(apiPath.reportOfContractList, params );
export const getJobOfferCreatedByList = (params) => api.get(apiPath.jobOfferCreatedByList, { params });
