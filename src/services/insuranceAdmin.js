import { REACT_APP_INSURANCE_API_URL } from './apiPath';
import commonClient from './commonClient';

/* Admin-only optimised Insurance reads (performance track, P1_NEW_API_DESIGN.md), under /api/admin/insurance. Each
   returns what the route it stands beside in insurance.js returns; that route stays for the Worker, Employer and
   Processing Insurance tabs. */
const ADMIN_INSURANCE = '/admin/insurance';

/* INS-1: the Insurance dashboard's search (R1's body, response and refusals) */
export const searchInsuranceRecordsAdminAPI = (reqPayload) => commonClient.post(`${ REACT_APP_INSURANCE_API_URL }${ ADMIN_INSURANCE }/records/search`, reqPayload);

/* INS-2: the record page's first read — R2's view and the record's remarks list, as { record, remarks } (R2's refusals) */
export const getInsuranceRecordViewAdminAPI = (ref) => commonClient.get(`${ REACT_APP_INSURANCE_API_URL }${ ADMIN_INSURANCE }/records/${ encodeURIComponent(ref) }/view`);
/* INS-3: Search worker (R7's rows, duplicate indicators and refusals); the search text travels in the body, not the URL */
export const searchInsuranceWorkersAdminAPI = (q) => commonClient.post(`${ REACT_APP_INSURANCE_API_URL }${ ADMIN_INSURANCE }/identity/workers`, { q });
/* INS-4: the invoice picker (R6's body, rows and refusals) */
export const getEligibleInsuranceInvoicesAdminAPI = (reqPayload) => commonClient.post(`${ REACT_APP_INSURANCE_API_URL }${ ADMIN_INSURANCE }/invoices/eligible`, reqPayload);
/* INS-2 by numeric id: the legacy /insurances/:id link (the by-id resolver's 404, then R2's refusals) */
export const getInsuranceRecordViewByIdAdminAPI = (id) => commonClient.get(`${ REACT_APP_INSURANCE_API_URL }${ ADMIN_INSURANCE }/records/by-id/${ encodeURIComponent(id) }/view`);
