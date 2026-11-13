import { apiPath, REACT_APP_CONTRACT_API_URL, REACT_APP_INSURANCE_API_URL } from './apiPath';
import app from './appClient';
import commonClient from './commonClient';

export const getEmployerRemarks = (params) => app.get(apiPath.employerRemarks, { params });
export const addNewEmpRemark = (remarkData) => app.post(apiPath.addEmployerRemarks, remarkData);
export const removeEmployerRemark = (remarkPayload) => app.post(apiPath.deleteEmployerRemarks, remarkPayload);

export const getWorkerRemarks = (reqPayload) => app.post(apiPath.workeremarks, reqPayload);
export const addNewWorkerRemark = (remarkData) => app.post(apiPath.addWorkerRemarks, remarkData);
export const removeWorkerRemark = (remarkPayload) => app.post(apiPath.deleteWorkerRemarks, remarkPayload);

export const getProcessingRemarks = (reqPayload) => app.post(apiPath.processingRemarks, reqPayload);
export const addNewProcessingRemark = (remarkData) => app.post(apiPath.addProcessingRemarks, remarkData);
export const removeProcessingRemark = (remarkPayload) => app.post(apiPath.deleteProcessingRemarks, remarkPayload);

export const getInvoiceRemarks = (params) => commonClient.get(REACT_APP_CONTRACT_API_URL + apiPath.invoiceRemarks + "/" + params?.invoice_id);
export const addEditInvoiceRemarks = (reqPayload) => commonClient.post(REACT_APP_CONTRACT_API_URL + apiPath.addEditInvoiceRemarks, reqPayload);
export const removeInvoiceRemarks = (reqPayload) => commonClient.post(REACT_APP_CONTRACT_API_URL + apiPath.deleteInvoiceRemarks, reqPayload);

export const getInsuranceRemarks = (params) => commonClient.get(REACT_APP_INSURANCE_API_URL + apiPath.getInsuranceRemarks + "/" + params?.insurance_id);
export const addEditInsuranceRemarks = (reqPayload) => commonClient.post(REACT_APP_INSURANCE_API_URL + apiPath.addEditInsuranceRemarks, reqPayload);
export const removeInsuranceRemarks = (reqPayload) => commonClient.post(REACT_APP_INSURANCE_API_URL + apiPath.removeInsuranceRemarks, reqPayload);