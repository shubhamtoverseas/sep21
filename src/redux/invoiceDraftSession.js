import { setInvoiceCurrentEmployer, setInvoiceLocalInfo, setInvoiceCurrentJobInfo } from "./Slices/employer/EmployerSlice";
import { setInvoiceCurrentWorker } from "./Slices/worker/WorkerSlice";
import { setInvoiceHeaderForm, setInvoiceContractItemsList } from "./Slices/invoices/InvoicesSlice";

/**
 * Invoice draft — survives a browser refresh within the same tab (product ruling, Shubham 2026-10-19).
 *
 * The Add Invoice flows (contract and general) keep the in-progress draft — selected employer and worker,
 * the header (branch, CS owner, invoice date, Type (Internal)), the Job Offer context and the step-2 items —
 * in redux only, so a refresh on step 2 or 3 used to wipe it. This mirrors exactly those fields to
 * sessionStorage and puts them back when the store boots.
 *
 * Scope on purpose:
 * - sessionStorage, not redux-persist: the tab is the lifetime (closing it drops the draft), nothing crosses
 *   sessions or tabs, and the store's rule that server-data slices are never persisted stays intact.
 * - cleared wherever the flow already clears redux (Cancel, create success, arriving on the invoice list),
 *   because the mirror simply writes the emptied state; also on logout (session storage is cleared there too).
 * - a language change resets the store and the draft is put back right after, so switching language
 *   mid-invoice does not lose the selection either.
 */
export const INVOICE_DRAFT_STORAGE_KEY = "mm.invoiceDraft.v1";
const LANGUAGE_RESET_ACTION = "RESET_REDUX_AFTER_LANGUAGE_CHANGE";
const LOGOUT_DONE_ACTION = "auth/logout/fulfilled";

const FIELDS = [
    { key: "employer", read: (s) => s.employer?.currentInvoiceEmployerDetail, write: setInvoiceCurrentEmployer },
    { key: "worker", read: (s) => s.worker?.currentInvoiceWorkerDetail, write: setInvoiceCurrentWorker },
    { key: "localInfo", read: (s) => s.employer?.currentInvoiceLocalInfo, write: setInvoiceLocalInfo },
    { key: "jobInfo", read: (s) => s.employer?.invoiceCurrentJobInfo, write: setInvoiceCurrentJobInfo },
    { key: "headerForm", read: (s) => s.invoices?.invoiceHeaderForm, write: setInvoiceHeaderForm },
    /* the items of both Contract and Standalone Invoice creation (one items stage since INV-G3) */
    { key: "contractItems", read: (s) => s.invoices?.invoiceContractItemsList, write: setInvoiceContractItemsList },
];

const isEmpty = (value) => value == null || value === ""
    || (Array.isArray(value) ? value.length === 0 : (typeof value === "object" && Object.keys(value).length === 0));

const snapshot = (state) => FIELDS.reduce((out, field) => {
    const value = field.read(state);
    if (!isEmpty(value)) out[field.key] = value;
    return out;
}, {});

const readStored = () => {
    try {
        const raw = sessionStorage.getItem(INVOICE_DRAFT_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
};

const writeStored = (draft) => {
    try {
        if (Object.keys(draft).length) sessionStorage.setItem(INVOICE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
        else sessionStorage.removeItem(INVOICE_DRAFT_STORAGE_KEY);
    } catch {
        /* storage unavailable or full: the draft simply does not survive a refresh */
    }
};

const clearStored = () => {
    try { sessionStorage.removeItem(INVOICE_DRAFT_STORAGE_KEY); } catch { /* nothing to clear */ }
};

/** Put a stored draft back into the store (boot, and again after the language reset). */
export const hydrateInvoiceDraft = (store) => {
    const stored = readStored();
    if (!stored) return;
    FIELDS.forEach((field) => {
        if (field.key in stored && !isEmpty(stored[field.key])) store.dispatch(field.write(stored[field.key]));
    });
};

/* last seen slice values by reference: a write happens only when one of the mirrored fields changed */
let lastSeen = {};

export const invoiceDraftMiddleware = (store) => (next) => (action) => {
    if (action?.type === LANGUAGE_RESET_ACTION) {
        const result = next(action);
        hydrateInvoiceDraft(store);
        return result;
    }
    const result = next(action);
    if (action?.type === LOGOUT_DONE_ACTION) {
        lastSeen = {};
        clearStored();
        return result;
    }
    const state = store.getState();
    const current = {};
    let changed = false;
    FIELDS.forEach((field) => {
        current[field.key] = field.read(state);
        if (current[field.key] !== lastSeen[field.key]) changed = true;
    });
    if (changed) {
        lastSeen = current;
        writeStored(snapshot(state));
    }
    return result;
};
