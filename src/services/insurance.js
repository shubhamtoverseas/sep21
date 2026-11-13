import { apiPath, REACT_APP_INSURANCE_API_URL } from './apiPath';
import commonClient from './commonClient';

/* Insurance module API (TARGET_API R1–R9, M1–M16). Mutations move here section by section. */
const recordUrl = (ref) => `${ REACT_APP_INSURANCE_API_URL }${ apiPath.insuranceRecords }/${ encodeURIComponent(ref) }`;

export const searchInsuranceRecordsAPI = (reqPayload) => commonClient.post(REACT_APP_INSURANCE_API_URL + apiPath.insuranceRecordsSearch, reqPayload);
export const getInsuranceMetaAPI = () => commonClient.get(REACT_APP_INSURANCE_API_URL + apiPath.insuranceMeta);
export const getInsuranceRecordAPI = (ref) => commonClient.get(recordUrl(ref));
export const getInsuranceRecordHistoryAPI = ({ ref, page, limit }) => commonClient.get(`${ recordUrl(ref) }/history`, { params: { page, limit } });
export const createInsuranceRecordAPI = (reqPayload) => commonClient.post(REACT_APP_INSURANCE_API_URL + apiPath.insuranceRecords, reqPayload);
export const createInsuranceSuccessorAPI = ({ ref, ...reqPayload }) => commonClient.post(`${ recordUrl(ref) }/successor`, reqPayload);
export const renewInsuranceRecordAPI = ({ ref, ...reqPayload }) => commonClient.post(`${ recordUrl(ref) }/requests/renew`, reqPayload);
export const addInsuranceCoverageAPI = ({ ref, ...reqPayload }) => commonClient.post(`${ recordUrl(ref) }/requests/coverage`, reqPayload);
export const changeInsurancePolicyAPI = ({ ref, ...reqPayload }) => commonClient.post(`${ recordUrl(ref) }/requests/change`, reqPayload);
export const editInsuranceRequestAPI = ({ ref, requestId, ...reqPayload }) => commonClient.patch(`${ recordUrl(ref) }/requests/${ encodeURIComponent(requestId) }`, reqPayload);
export const withdrawInsuranceRequestAPI = ({ ref, requestId, ...reqPayload }) => commonClient.post(`${ recordUrl(ref) }/requests/${ encodeURIComponent(requestId) }/withdraw`, reqPayload);
export const rejectInsuranceRequestAPI = ({ ref, requestId, ...reqPayload }) => commonClient.post(`${ recordUrl(ref) }/requests/${ encodeURIComponent(requestId) }/reject`, reqPayload);
export const requestInsuranceCancellationAPI = ({ ref, ...reqPayload }) => commonClient.post(`${ recordUrl(ref) }/cancellations`, reqPayload);
export const recordInsuranceCancellationResultAPI = ({ ref, requestId, ...reqPayload }) => commonClient.post(`${ recordUrl(ref) }/requests/${ encodeURIComponent(requestId) }/cancellation-result`, reqPayload);
export const addInsuranceCancellationRefAPI = ({ ref, periodId, ...reqPayload }) => commonClient.post(`${ recordUrl(ref) }/periods/${ encodeURIComponent(periodId) }/cancellation-reference`, reqPayload);
export const closeInsuranceIssuesAPI = ({ ref, ...reqPayload }) => commonClient.post(`${ recordUrl(ref) }/issues/close`, reqPayload);
export const correctInsuranceRecordAPI = ({ ref, ...reqPayload }) => commonClient.post(`${ recordUrl(ref) }/corrections`, reqPayload);
export const changeInsuranceBranchAPI = ({ ref, ...reqPayload }) => commonClient.post(`${ recordUrl(ref) }/branch`, reqPayload);
export const getInsuranceOwnerRecipientsAPI = () => commonClient.get(REACT_APP_INSURANCE_API_URL + apiPath.insuranceOwnerRecipients);
export const getInsuranceOwnerPortfolioAPI = (ownerId) => commonClient.get(REACT_APP_INSURANCE_API_URL + apiPath.insuranceOwnerPortfolio, { params: ownerId ? { ownerId } : {} });
export const changeInsuranceOwnersAPI = (reqPayload) => commonClient.post(REACT_APP_INSURANCE_API_URL + apiPath.insuranceOwnerChange, reqPayload);
export const recordInsuranceQbeResultAPI = ({ ref, requestId, ...reqPayload }) => commonClient.post(`${ recordUrl(ref) }/requests/${ encodeURIComponent(requestId) }/result`, reqPayload);
export const checkInsuranceCarrierRefAPI = ({ ref, ...reqPayload }) => commonClient.post(`${ recordUrl(ref) }/carrier-ref/check`, reqPayload);
/* R8: the insurance records an invoice is linked to (the invoice detail's Insurance card) */
export const getInvoiceInsuranceRecordsAPI = (invoiceId) => commonClient.get(`${ REACT_APP_INSURANCE_API_URL }${ apiPath.insuranceInvoices }/${ encodeURIComponent(invoiceId) }/records`);
export const lookupInsuranceContractAPI = (number) => commonClient.get(REACT_APP_INSURANCE_API_URL + apiPath.insuranceContractLookup, { params: { number } });
export const searchInsuranceEmployersAPI = (q) => commonClient.get(REACT_APP_INSURANCE_API_URL + apiPath.insuranceIdentityEmployers, { params: { q } });
export const createInsuranceWorkerAPI = (reqPayload) => commonClient.post(REACT_APP_INSURANCE_API_URL + apiPath.insuranceWorkers, reqPayload);
/* OP-N2 (kept in I-5): notification links carry the numeric record id */
export const resolveInsuranceRefAPI = (id) => commonClient.get(`${ REACT_APP_INSURANCE_API_URL }${ apiPath.insuranceRecords }/by-id/${ encodeURIComponent(id) }`);
