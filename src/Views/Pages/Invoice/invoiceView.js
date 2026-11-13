import constData from "../../../components/ReusableComponents/constants";
import {
    fetchActionStatusList, fetchInvoiceActivityLogList, fetchInvoiceDetails, fetchInvoicePaymentLogList,
} from "../../../redux/Slices/invoices/InvoicesSlice";
import { fetchInvoiceRemarks } from "../../../redux/Slices/remarks/RemarkSlice";

/*
 * INV-2 on the invoice screens (performance track A-10, A-13): the view (GET /contract/admin/invoices/view/:ref) carries
 * what a screen read on open — the detail, the action list for its status, page 1 of the activity and payment logs, the
 * remarks — each exactly as its own route returns it. Each part is put where its own read would put it (the same
 * reducers), so the screens and their tabs render from the same state as before.
 */
export const VIEW_LOG_LIMIT = constData.INVOICE_LOG_LIMIT;
const FIRST_PAGE = constData.INVOICE_LOG_FIRST_PAGE;
const VIEW = "invoice-view";
const read = (data) => ({ status: true, data });

/* the action list's key in the view: the invoice and the status it was read for */
export const viewActionsKey = (view) => (view?.invoice ? `${ view.invoice.id }:${ view.invoice.status }` : "");

/* The detail objects that came with their action list (the store keeps the same object): a screen's action-list read is
   skipped for exactly those, and runs as before for any other detail (A-12). */
const detailsWithActions = new WeakSet();
export const cameWithActionList = (invoiceDetails) => Boolean(invoiceDetails) && detailsWithActions.has(invoiceDetails);

export const applyInvoiceView = (dispatch, queryClient, routeId, view) => {
    const log = { invoice_id: routeId, limit: VIEW_LOG_LIMIT, page: FIRST_PAGE };
    if (view.invoice && typeof view.invoice === "object") detailsWithActions.add(view.invoice);
    dispatch(fetchInvoiceDetails.fulfilled(read(view.invoice), VIEW, { invoice_id: routeId }));
    dispatch(fetchActionStatusList.fulfilled(read(view.actions), VIEW,
        { status: view.invoice?.status, contract_invoices_id: view.invoice?.id }));
    dispatch(fetchInvoiceActivityLogList.fulfilled({ ...read(view.activity), page: FIRST_PAGE, limit: VIEW_LOG_LIMIT }, VIEW, log));
    dispatch(fetchInvoicePaymentLogList.fulfilled({ ...read(view.payments), page: FIRST_PAGE, limit: VIEW_LOG_LIMIT }, VIEW, log));
    /* the Remarks tab (components/remarks via InvoiceRemarks) reads the remarks store behind its react-query entry: both
       get the list, so the tab does not read it a second time (A-13) */
    dispatch(fetchInvoiceRemarks.fulfilled(read(view.remarks), VIEW, { invoice_id: routeId }));
    queryClient?.setQueryData(["remarks", "invoice", routeId], read(view.remarks));
};

/* A view the deep-link resolver has just read and applied: the record's screen opens on it without reading it again.
   The taker gets the view's action-list key, or null. */
let seed = null;
export const markInvoiceViewSeed = (id, actionsKey) => { seed = { id: String(id), actionsKey }; };
export const takeInvoiceViewSeed = (id) => {
    const hit = seed && seed.id === String(id) ? seed.actionsKey : null;
    seed = null;
    return hit;
};
