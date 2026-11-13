import { REACT_APP_CONTRACT_API_URL } from './apiPath';
import commonClient from './commonClient';

/* Admin-only optimised Invoice reads (performance track, P1_NEW_API_DESIGN.md), under /contract/admin/invoices. Each
   returns what the route it stands beside in invoices.js returns; that route stays for the Worker, Employer and
   Contract invoice tabs. */
const ADMIN_INVOICES = '/contract/admin/invoices';

/* INV-1: the Invoices screen's list (the list route's body and refusals; rows carry the fields the screen reads).
   `config` passes an abort signal, so a newer request can cancel this one. */
export const getInvoiceListAdmin = (reqPayload, config) => commonClient.post(`${ REACT_APP_CONTRACT_API_URL }${ ADMIN_INVOICES }/list`, reqPayload, config);

/* INV-2: an invoice screen's first read — /resolve's 404, then the detail, the action list, page 1 of the activity and
   payment logs (`log_limit` rows each) and the remarks, each as its own route returns it: { invoice, actions, activity,
   payments, remarks } */
export const getInvoiceViewAdmin = (ref, logLimit) => commonClient.get(`${ REACT_APP_CONTRACT_API_URL }${ ADMIN_INVOICES }/view/${ encodeURIComponent(ref) }`, { params: { log_limit: logLimit } });
