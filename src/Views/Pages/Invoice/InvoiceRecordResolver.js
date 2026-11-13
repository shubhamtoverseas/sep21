import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import CustomSpinner from "../../../components/ReusableComponents/CustomSpinner";
import { resolveInvoiceAPI } from "../../../services/invoices";
import { getInvoiceDetailPath } from "../../../services/commonService";
import InvoiceRecordNotAvailable from "../../../components/Invoice/InvoiceRecordNotAvailable";
import { fetchInvoiceView } from "../../../redux/Slices/invoices/InvoicesSlice";
import { VIEW_LOG_LIMIT, applyInvoiceView, markInvoiceViewSeed, viewActionsKey } from "./invoiceView";

/*
 * S10 (D7) — `/invoices/<ref>`: the one deep-link entry to an invoice (CR › Invoices; IV01 step 2). The reference (or a
 * record id) is resolved by the Invoice API (GET /contract/invoices/resolve/:ref, same branch check as the detail) and
 * the record's screen opens in place of this address, keeping `?followup=&from=`. An unknown or out-of-scope reference
 * gets one neutral not-available state ("This record is not available.", sheet row 8); nothing is substituted. At S3
 * this entry becomes the single detail page.
 * Performance track A-10: the reference is resolved by reading the record's view (INV-2, the same /resolve 404), and the
 * screen opens on that view without reading it again; when the view cannot be read (other than not available), the
 * reference is resolved as before.
 */

const InvoiceRecordResolver = () => {
    const { invoice_ref: invoiceRef } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        let live = true;
        setMissing(false);
        const open = (row) => navigate(`${ getInvoiceDetailPath(row) }${ location.search }`, { replace: true });
        const resolveAsBefore = () => resolveInvoiceAPI(invoiceRef)
            .then((res) => {
                if (!live) return;
                const row = res?.data?.data;
                if (!row?.id) { setMissing(true); return; }
                open(row);
            })
            .catch(() => { if (live) setMissing(true); });
        dispatch(fetchInvoiceView({ ref: invoiceRef, logLimit: VIEW_LOG_LIMIT })).unwrap()
            .then((view) => {
                if (!live) return;
                const row = view?.invoice;
                if (!row?.id) { resolveAsBefore(); return; }
                applyInvoiceView(dispatch, queryClient, String(row.id), view);
                markInvoiceViewSeed(row.id, viewActionsKey(view));
                open(row);
            })
            .catch((error) => {
                if (!live) return;
                if (error?.status === 404) setMissing(true);
                else resolveAsBefore();
            });
        return () => { live = false; };
    }, [invoiceRef, location.search, navigate, dispatch, queryClient]);

    if (!missing) return <div className="d-flex justify-content-center p-5"><CustomSpinner /></div>;
    return <InvoiceRecordNotAvailable />;
};

export default InvoiceRecordResolver;
