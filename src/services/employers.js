import { apiPath, API_CHAT_URL } from './apiPath';
import app from './appClient';
import createApiInstance from './createApiInstance'

const chatApi = createApiInstance(API_CHAT_URL);

export const getEmpEmployers = (reqPayload) => app.post(apiPath.getEmployerList, reqPayload);
export const getEmpEmployerJobOffers = (reqPayload) => app.post(apiPath.getEmployerJobofferList, reqPayload);
export const getEmployerDetail = (reqPayload) => app.post(apiPath.viewEmployer, reqPayload);
export const addNewEmployerAddress = (addressData) => app.post(apiPath.addEmpAddress, addressData);
export const addNewEmployer = (addressData) => app.post(apiPath.addEmployer, addressData);
export const updateEmpAddress = (addressData) => app.post(apiPath.updateEmpAddress, addressData);
export const addNewEmpCurrentWorker = (addressData) => app.post(apiPath.addEmpCurrentWorker, addressData);
export const updateNewEmpCurrentWorker = (addressData) => app.post(apiPath.updateEmpCurrentWorker, addressData);
export const employerAddresses = (reqPayload) => app.post(apiPath.employerAddressList, reqPayload);
export const deleteEmpAddressById = (addressId) => app.post(apiPath.deleteEmpAddress, addressId);
export const setDefautlEmpAddress = (reqPayload) => app.post(apiPath.setEmpPrimaryAddress, reqPayload);
export const otpSend = (reqPayload) => app.post(apiPath.sendOtp, reqPayload);
export const fetchCurrentWorker = (params) => app.get(apiPath.employerWorkerList, { params });
export const deleteCurrentWorker = (addressId) => app.post(apiPath.employerWorkerDelete, addressId);
export const getSpokenLanguage = (reqPayload) => app.get(apiPath.spokenLanguage, reqPayload);
export const getPrimaryLanguage = () => app.get(apiPath.getPrimaryLanguage);
export const saveNewEmpFamilyInfo = (reqPayload) => app.post(apiPath.saveEmpFamilyInfo, reqPayload);
export const editEmployerBasic = (reqPayload) => app.post(apiPath.updateEmployerBasic, reqPayload);
export const updateEmployerBanOrRemoveStatusAPI = (reqPayload) => app.post(apiPath.updateEmployerBanStatus, reqPayload);
export const getEmployerActivityLog = (reqPayload) => app.post(apiPath.employerActivityLog, reqPayload);
export const getDuplicateEmployerCount = (params) => chatApi.get(apiPath.getDuplicateEmployerCount, { params })
export const getDuplicatesEmployer = (params) => chatApi.get(apiPath.getDuplicatesEmployer, { params })
export const getDuplicatesJobsCount = (params) => chatApi.get(apiPath.getDuplicatesJobsCount, { params })
