import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import CustomSpinner from "../../../components/ReusableComponents/CustomSpinner";
import InvoiceRecordNotAvailable from "../../../components/Invoice/InvoiceRecordNotAvailable";
import { dropPrefetchedInvoiceInsuranceRecords, prefetchInvoiceInsuranceRecords } from "../../../components/Invoice/invoiceInsurancePrefetch";
import { resolveInvoiceAPI } from "../../../services/invoices";
import constData from "../../../components/ReusableComponents/constants";
import { getPermissionValue, isAdminUser } from "../../../services/commonService";
import {
    fetchInvoiceActivityLogList, fetchInvoiceDetails, fetchInvoicePaymentLogList, fetchInvoiceView,
} from "../../../redux/Slices/invoices/InvoicesSlice";
import { VIEW_LOG_LIMIT, applyInvoiceView, takeInvoiceViewSeed, viewActionsKey } from "./invoiceView";

/*
 * The creation screens (QA-27 ruling 10): only with a create key, as POST /invoices/price and /add check it. Without one the
 * user goes where any route they may not open sends them. Any of the keys opens it (U-0224: two entry points for a Contract Invoice).
 */
export const withInvoiceCreateGate = (Screen, keys) => {
    const Gated = (props) => {
        const permissions = useSelector((state) => state.users?.permissionList?.data);
        const allowed = isAdminUser() || keys.some((key) => getPermissionValue(permissions, "invoice", key) === "y");
        return allowed ? <Screen { ...props } /> : <Navigate to="/dashboard" />;
    };
    Gated.displayName = `InvoiceCreateGate(${ Screen.displayName || Screen.name || "Screen" })`;
    return Gated;
};

/*
 * Direct URLs to an invoice screen (28 Sep sheet row 8): before the screen opens, the Invoice API resolves the record
 * with its branch check (GET /contract/invoices/resolve/:ref). An unknown or out-of-scope invoice gets the neutral
 * "This record is not available." state; any other failure leaves the screen to handle its own error, as before.
 */
export const withInvoiceRecordGate = (Screen) => {
    const Gated = (props) => {
        const { invoice_id: invoiceId } = useParams();
        const [state, setState] = useState('checking');

        useEffect(() => {
            let live = true;
            setState('checking');
            resolveInvoiceAPI(invoiceId)
                .then(() => { if (live) setState('open'); })
                .catch((error) => { if (live) setState(error?.response?.status === 404 ? 'missing' : 'open'); });
            return () => { live = false; };
        }, [invoiceId]);

        if (state === 'checking') return <div className="d-flex justify-content-center p-5"><CustomSpinner /></div>;
        if (state === 'missing') return <InvoiceRecordNotAvailable />;
        return <Screen { ...props } />;
    };
    Gated.displayName = `InvoiceRecordGate(${ Screen.displayName || Screen.name || 'Screen' })`;
    return Gated;
};

/*
 * The invoice detail screens (performance track A-10, A-11): the gate reads the screen's view (INV-2: /resolve's 404,
 * then the detail, the action list, page 1 of both logs and the remarks) and puts each part where its own read put it,
 * so the screen opens on it (`invoiceViewLoaded`) without reading them again. The same neutral "not available" answers
 * an unknown or out-of-scope invoice; any other failure leaves the screen to read and handle its own error, as before.
 * `insuranceCard`: the screen shows the Insurance card, whose read starts here, in parallel.
 * The screen gets `reloadInvoice` (in place of a page reload: the view again, then the screen opens anew on it, its own
 * state reset as a reload did) and `refreshInvoice` (in place of reading the detail and both logs again: the view, in
 * place), and `viewActionsKey`, the invoice and status the action list in the store was read for.
 */
const FIRST_PAGE = constData.INVOICE_LOG_FIRST_PAGE;

export const withInvoiceViewGate = (Screen, { insuranceCard = false } = {}) => {
    const Gated = (props) => {
        const { invoice_id: invoiceId } = useParams();
        const dispatch = useDispatch();
        const queryClient = useQueryClient();
        const [view, setView] = useState({ state: 'checking', actionsKey: '' });
        const [mountKey, setMountKey] = useState(0);

        useEffect(() => {
            let live = true;
            const seededKey = takeInvoiceViewSeed(invoiceId);
            if (seededKey !== null) {
                setView({ state: 'view', actionsKey: seededKey });
                return undefined;
            }
            setView({ state: 'checking', actionsKey: '' });
            if (insuranceCard) prefetchInvoiceInsuranceRecords(invoiceId);
            dispatch(fetchInvoiceView({ ref: invoiceId, logLimit: VIEW_LOG_LIMIT })).unwrap()
                .then((data) => {
                    if (!live) return;
                    applyInvoiceView(dispatch, queryClient, invoiceId, data);
                    setView({ state: 'view', actionsKey: viewActionsKey(data) });
                })
                .catch((error) => {
                    if (!live) return;
                    if (error?.status === 404) {
                        dropPrefetchedInvoiceInsuranceRecords(invoiceId);
                        setView({ state: 'missing', actionsKey: '' });
                    } else {
                        setView({ state: 'open', actionsKey: '' });
                    }
                });
            return () => { live = false; };
        }, [dispatch, invoiceId, queryClient]);

        const readAgain = useCallback(() => dispatch(fetchInvoiceView({ ref: invoiceId, logLimit: VIEW_LOG_LIMIT })).unwrap()
            .then((data) => {
                applyInvoiceView(dispatch, queryClient, invoiceId, data);
                setView({ state: 'view', actionsKey: viewActionsKey(data) });
            }), [dispatch, invoiceId, queryClient]);

        const reloadInvoice = useCallback(() => {
            readAgain()
                .then(() => setMountKey((key) => key + 1))
                .catch(() => window.location.reload());
        }, [readAgain]);

        const refreshInvoice = useCallback(() => {
            readAgain().catch(() => {
                dispatch(fetchInvoiceDetails({ invoice_id: invoiceId }));
                dispatch(fetchInvoiceActivityLogList({ invoice_id: invoiceId, limit: VIEW_LOG_LIMIT, page: FIRST_PAGE }));
                dispatch(fetchInvoicePaymentLogList({ invoice_id: invoiceId, limit: VIEW_LOG_LIMIT, page: FIRST_PAGE }));
            });
        }, [dispatch, invoiceId, readAgain]);

        if (view.state === 'checking') return <div className="d-flex justify-content-center p-5"><CustomSpinner /></div>;
        if (view.state === 'missing') return <InvoiceRecordNotAvailable />;
        return (
            <Screen
                key={ mountKey }
                { ...props }
                invoiceViewLoaded={ view.state === 'view' }
                viewActionsKey={ view.actionsKey }
                reloadInvoice={ reloadInvoice }
                refreshInvoice={ refreshInvoice }
            />
        );
    };
    Gated.displayName = `InvoiceViewGate(${ Screen.displayName || Screen.name || 'Screen' })`;
    return Gated;
};
