import { getInvoiceInsuranceRecordsAPI } from "../../services/insurance";

/* The Insurance card's read started early (performance track A-10): an invoice screen's gate starts it from the URL id, in
   parallel with the screen's own first read, and the card (InvoiceInsuranceCard) takes it on mount instead of reading
   again. A read not taken within a few seconds is dropped, so a later visit reads afresh. Kept apart from the card so the
   gate, which every invoice route loads, does not bring the card with it. */
const PREFETCH_TTL_MS = 10000;
const prefetched = new Map();

export const prefetchInvoiceInsuranceRecords = (invoiceId) => {
    if (!invoiceId) return;
    const request = getInvoiceInsuranceRecordsAPI(invoiceId);
    request.catch(() => { /* the card handles it */ });
    prefetched.set(String(invoiceId), { request, at: Date.now() });
};

export const dropPrefetchedInvoiceInsuranceRecords = (invoiceId) => { prefetched.delete(String(invoiceId)); };

export const takePrefetchedInvoiceInsuranceRecords = (invoiceId) => {
    const entry = prefetched.get(String(invoiceId));
    prefetched.delete(String(invoiceId));
    return entry && Date.now() - entry.at < PREFETCH_TTL_MS ? entry.request : null;
};
