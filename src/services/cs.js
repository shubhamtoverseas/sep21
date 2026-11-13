import { apiPath, SETTINGS_API_URL } from './apiPath';
import app from './appClient';
import createApiInstance from './createApiInstance';

const settingAPI = createApiInstance(SETTINGS_API_URL);

export const updateEmployerCSById = (reqPayload) => app.post(apiPath.updateEmployerCS, reqPayload);
export const searchStaffList = (reqPayload) => app.post(apiPath.searchStaffList, reqPayload);
export const changeCsStaffAPI = (reqPayload) => settingAPI.post(apiPath.changeCsStaff, reqPayload);
export const searchCsStaffAPI = (reqPayload) => settingAPI.post(apiPath.searchCsStaff, reqPayload);
export const searchPartnerStaffAPI = (reqPayload) => settingAPI.post(apiPath.searchPartnerStaff, reqPayload);
export const getOtherCsStaff = (reqPayload) => settingAPI.post(apiPath.getOtherCsStaff, reqPayload);
export const updateInvoiceInsuranceCsStaff = (reqPayload) => settingAPI.post(apiPath.updateInvoiceInsuranceCsStaff, reqPayload);