import { apiPath, REACT_APP_CONTRACT_API_URL } from './apiPath';
import app from './appClient';
import commonClient from './commonClient';
import createApiInstance from './createApiInstance';

const contractAPI = createApiInstance(REACT_APP_CONTRACT_API_URL);

export const getEmpContracts = (reqPayload) => app.post(apiPath.employerContracts, reqPayload);
export const fetchContractDetailsAPI = (contractId) => contractAPI.get(apiPath.contractDetails + contractId);
export const getContracts = (reqPayload) => commonClient.post(REACT_APP_CONTRACT_API_URL + apiPath.getContracts, reqPayload);
export const getContractInvoiceStatus = (reqPayload) => commonClient.get(REACT_APP_CONTRACT_API_URL + apiPath.getContractInvoiceStatus, reqPayload);
export const getContractCategory = (reqPayload) => commonClient.get(REACT_APP_CONTRACT_API_URL + apiPath.getcontractCategory, { params: reqPayload });
export const contractVisaExpiryUpdateAPI = (reqPayload) => contractAPI.post(apiPath.contractVisaExpiryUpdate, reqPayload);
export const contractVisaExpiryHistoryAPI = (contractId) => contractAPI.get(apiPath.contractVisaExpiryHistory + contractId);
// B-3 / N-7: { contract_id, field: visa_reference_no | e_visa_payment_date | entry_visa_expiry_date, value, reason, version? }
export const contractVisaFieldCorrectionAPI = (reqPayload) => contractAPI.post(apiPath.contractVisaFieldCorrection, reqPayload);

// P-8: Contracts status cards — counts per status for the current list filters (same body as the list).
export const getContractStatusCountsAPI = (reqPayload) => contractAPI.post(apiPath.contractStatusCounts, reqPayload);
// S1: visa issuance history (versions, corrections, current values) for an Active contract.
export const contractVisaIssuanceHistoryAPI = (contractId) => contractAPI.get(apiPath.contractVisaIssuanceHistory + contractId);
// Contracts dashboard (prototype Contracts_Dashboard.html): rows with processing stage tokens.
export const getContractDashboardListAPI = (reqPayload) => contractAPI.post(apiPath.contractDashboardList, reqPayload);
