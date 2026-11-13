/*
 * The Invoice API's action list (GET get-action-list): each entry is { id, name, key, allowed, reason }. The API decides
 * what a status offers and why an offered action is blocked right now (decision AA-06, 13 Oct): a blocked entry is shown
 * disabled with its reason; an action the status never allows is not in the list at all. Entries are found by `key` —
 * `name` is translated by the API (zh-HK) and `id` 0 is shared by Adjust Amount and Write-Off.
 */
import constData from "../../../components/ReusableComponents/constants";

/** Approve Payment is listed under either key (a Cash payment is approved by verifying its deposit receipt) */
export const APPROVE_PAYMENT_KEYS = Object.freeze(['approve_payment', 'verify_deposit_receipt']);

/** The entry for an action key (or the first of several keys), or null */
export const findAction = (list, keys) => {
    const wanted = Array.isArray(keys) ? keys : [keys];
    return (Array.isArray(list) ? list : []).find((action) => wanted.includes(action?.key)) || null;
};

/** Approve Payment, Approve Refund and Approve Exchange confirm in the Approve modal (reference ApproveModal) */
export const APPROVAL_STATUS_IDS = Object.freeze([1, 9, 11]);

/** Mark Unsettled, Mark Bad Debt and Revert confirm in the financial action modal (reference FinancialActionModal) */
export const MARK_STATUS_IDS = Object.freeze([5, 7, 12]);

/** Listed but refused right now: shown disabled, with `reason` under the label */
export const isBlocked = (action) => Boolean(action) && action.allowed === false;

/** Status changes that need a reason, required by the Invoice API (spec v5 §2.4, §7.7): Unsettled, Void, Bad Debt, Revert */
export const REASON_REQUIRED_STATUS_IDS = Object.freeze([5, 6, 7, 12]);
export const needsReason = (statusId) => REASON_REQUIRED_STATUS_IDS.includes(Number(statusId));

/* A Contract or Exchange invoice is voided from its detail screen only: there Void asks whether to cancel the contract (and,
   on an exchange invoice, its child invoice); a batch has no such question, so the contract would stay active (P1b #229) */
const VOID_STATUS_ID = 6;
const asksContractOnVoid = (invoices) => (Array.isArray(invoices) ? invoices : [])
    .some((invoice) => constData.VOID_CANCELLATION_INVOICE_TYPES.includes(invoice?.invoice_type));

/** What a batch may apply to the selected invoices (their rows): status changes that are allowed; no Void when one of them
    is a Contract or Exchange invoice */
export const batchActions = (list, selectedInvoices = []) => (Array.isArray(list) ? list : []).filter((action) => action?.id !== 0
    && action?.allowed !== false && !(Number(action?.id) === VOID_STATUS_ID && asksContractOnVoid(selectedInvoices)));
