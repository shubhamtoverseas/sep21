import routes from "../routes/routesConfig";

/*
 * S10 (D7) — the one deep-link entry to an invoice record, `/invoices/<ref>` (CR › Invoices; IV01 step 2). Every deep-link
 * builder (Calendar, Notifications) points here; InvoiceRecordResolver opens the record's screen and keeps the query
 * (`?followup=<task id>&from=calendar|notifications`). A numeric value is a record id (notifications without a ref).
 */
export const invoiceRecordPath = (refOrId, params) => {
    const path = `/${ routes.invoiceRecord.replace(':invoice_ref', encodeURIComponent(String(refOrId))) }`;
    const query = params ? new URLSearchParams(params).toString() : '';
    return query ? `${ path }?${ query }` : path;
};
