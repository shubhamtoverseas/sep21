import React, { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';
import WkdListingFoot from "./WkdListingFoot";
import WkdNewTop from "./WkdNewTop";
import WkdListing, { WkdDash, fmtListingDate } from "./WkdListing";
import WkdStatusChip from "../WkdStatusChip";
import useListingParty from "./useListingParty";
import { fetchInvoices } from "../../../../../../redux/Slices/invoices/InvoicesSlice";
import { getPermissionValue, isAdminUser } from "../../../../../../services/commonService";
import routes from "../../../../routes/routesConfig";
import configData from "../../../../../../components/ReusableComponents/app-configs";
import { getInitials } from "../../../../../../utils/utils";
import translation from "../../../../../../utils/translation";
import { WKD_LIST_LIMIT, WKD_PAGE_LIMIT, INV_TONE, INVOICE_NEW_MENU, INVOICE_CREATE_PERMISSION, INVOICE_GENERAL_SELECTION } from "../../../workerModuleConstants";
import { balanceDueOf } from "../../../../Invoice/invoiceBalance";

const GeneralConfirmSelectionPopup = lazy(() => import("../../../../Invoice/general/GeneralConfirmSelectionPopup"));

const fmtHK = (n) => {
    const num = Number(n);
    const s = 'HK$' + Math.abs(Math.round(num)).toLocaleString();
    return num < 0 ? `(${ s })` : s;
};
const isEmptyAmt = (v) => v == null || v === '' || Number(v) === 0;

const amtCell = (v, attrs) => <div className="mc-worker-listing-cell mc-listing-mono" { ...attrs }>{ v }</div>;

const WorkerInvoiceListing = ({ worker_id, employer_id, paginated = false }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    /* U-0056: "New" is an Invoice action rendered here — shown only with the Invoice module's own create grants, hidden otherwise */
    const permissionList = useSelector((state) => state.users.permissionList);
    const isAdmin = useMemo(() => isAdminUser(), []);
    const canCreateContract = isAdmin || getPermissionValue(permissionList?.data, 'invoice', INVOICE_CREATE_PERMISSION.CONTRACT) === 'y';
    const canCreateGeneral = isAdmin || getPermissionValue(permissionList?.data, 'invoice', INVOICE_CREATE_PERMISSION.GENERAL) === 'y';
    const [isSelectingType, setIsSelectingType] = useState(false);
    /* "New" from a record page opens the create screen with this record's worker / employer preselected */
    const { invoiceState } = useListingParty(worker_id, employer_id);
    const confirmGeneralType = useCallback((option) => { setIsSelectingType(false); navigate(`/${ routes.addContractInvoiceGeneral.replace(':selection_type', option) }`, { state: invoiceState }); }, [navigate, invoiceState]);
    /* from a record the party is known: an Employer record opens the Employer invoice, a Worker record the Worker invoice — the
       "Who is this invoice for?" dialog is for the global list only (Shubham, 21 Oct) */
    const startGeneral = useCallback(() => {
        if (employer_id) confirmGeneralType(INVOICE_GENERAL_SELECTION.EMPLOYER);
        else if (worker_id) confirmGeneralType(INVOICE_GENERAL_SELECTION.WORKER);
        else setIsSelectingType(true);
    }, [employer_id, worker_id, confirmGeneralType]);
    const newMenu = useMemo(() => [
        canCreateGeneral ? { id: 'standalone', label: INVOICE_NEW_MENU.standalone, onClick: startGeneral } : null,
        canCreateContract ? { id: 'contract', label: INVOICE_NEW_MENU.contract, onClick: () => navigate(`/${ routes.addContractInvoice }`, { state: invoiceState }) } : null,
    ].filter(Boolean), [canCreateGeneral, canCreateContract, navigate, invoiceState, startGeneral]);
    const [tableHeaderFilter, setTableHeaderFilter] = useState({ sort: '', order: '' });
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(WKD_PAGE_LIMIT);
    /* this listing keeps its own copy of the rows and page meta (SR-06): the invoice slice is shared with the
       Invoice dashboard, so another screen's rows must never flash here */
    const [result, setResult] = useState({ rows: [], currentPage: 1, lastPage: 1, total: 0 });
    const [listState, setListState] = useState({ loading: false, error: false });
    const requestSeq = useRef(0);

    const load = useCallback(() => {
        const seq = ++requestSeq.current;
        setListState({ loading: true, error: false });
        dispatch(fetchInvoices({
            page: paginated ? page : 1,
            ...(worker_id && { worker_id }),
            ...(employer_id && { employer_id }),
            limit: paginated ? limit : WKD_LIST_LIMIT,
            ...(tableHeaderFilter.sort && tableHeaderFilter),
        })).then((res) => {
            if (seq !== requestSeq.current) return;
            if (res?.error) {
                setListState({ loading: false, error: true });
                return;
            }
            const payload = res?.payload || {};
            setResult({
                rows: Array.isArray(payload.data) ? payload.data : [],
                currentPage: Number(payload.current_page) || 1,
                lastPage: Number(payload.total_pages) || 1,
                total: Number(payload.total_count) || 0,
            });
            setListState({ loading: false, error: false });
        });
    }, [dispatch, worker_id, employer_id, tableHeaderFilter, paginated, page, limit]);

    useEffect(() => { load(); }, [load]);

    /* one sort grammar: a new column starts ascending; the same column flips */
    const handleSort = useCallback((sortKey) => {
        setPage(1);
        setTableHeaderFilter((prev) => ({
            sort: sortKey,
            order: prev.sort === sortKey && prev.order === 'ASC' ? 'DESC' : 'ASC',
        }));
    }, []);

    const handleRowClick = useCallback((row) => {
        if (row?.employer_id > 0 && row?.worker_id > 0) {
            if (row.status === 8 || row.status === 9) {
                navigate(`/invoices/add-contract-invoice/refund-invoice/` + row.id);
            } else if (row.status === 10) {
                navigate(`/invoices/add-contract-invoice/exchange-payment-review/` + row.id);
            } else if (row.status === 11) {
                navigate(`/invoices/add-contract-invoice/exchange-payment-type-invoice/` + row.id);
            } else if (row.status === 6 && (row.invoice_type === 'contract_refund' || row.invoice_type === 'overpaid_refund')) {
                navigate(`/invoices/add-contract-invoice/refund-invoice/` + row.id);
            } else {
                navigate(`/invoices/add-contract-invoice/payment-type-invoice/` + row.id);
            }
        } else {
            if (row.status === 8 || row.status === 9) {
                navigate(`/invoices/general/refund-invoice/` + row.id);
            } else if (row.status === 10) {
                navigate(`/invoices/general/exchange-payment-review/` + row.id);
            } else if (row.status === 6 && (row.invoice_type === 'general_refund' || row.invoice_type === 'overpaid_refund')) {
                navigate(`/invoices/general/refund-invoice/` + row.id);
            } else {
                navigate(`/invoices/general/payment-type-invoice/` + row.id);
            }
        }
    }, [navigate]);

    const columns = useMemo(() => [
        { key: 'type', label: translation('key_type'), sortKey: 'invoice_type' },
        { key: 'st', label: translation('key_status'), sortKey: 'invoice_status' },
        { key: 'date', label: translation('key_date'), sortKey: 'date' },
        { key: 'total', label: translation('key_total'), sortKey: 'final_amount' },
        { key: 'paid', label: translation('key_paid'), sortKey: 'paid_amount' },
        { key: 'bal', label: translation('key_balance_due'), sortKey: 'balance_due' },
        { key: 'staff', label: translation('key_handling_staff'), sortKey: 'staff' },
    ], []);

    const renderCells = useCallback((row) => {
        /* proto invKnownZero: a known amount (zero included) prints; an absent one is an em dash, never "HK$0" */
        const amountOrDash = (v) => ((v == null || v === '') ? <WkdDash /> : fmtHK(v));
        const total = (row.status === 10 || row.status === 11 || row.status === 6)
            ? fmtHK(0)
            : amountOrDash(row?.final_amount);
        const paid = (row.status === 11 || row.status === 6)
            ? fmtHK(0)
            : amountOrDash(row?.paid_amount);
        const balance = balanceDueOf(row);
        const knownZero = !isEmptyAmt(row?.final_amount) && !isEmptyAmt(row?.paid_amount) && Number(row.final_amount) === Number(row.paid_amount);
        const showBalance = !(row.status === 6 || row.status === 10 || row.status === 11) && (!isEmptyAmt(balance) || knownZero);
        return [
            <div key="type" className="mc-listing-primary">{ configData.invoiceTypeLabel(row.invoice_type, row.payment_type) || row.invoice_type || '—' }</div>,
            <WkdStatusChip
                key="st"
                label={ configData.invoiceStatusIdMapping[row.status]?.label || '' }
                tone={ INV_TONE[row.status] || 'up' }
            />,
            <div key="date" className="mc-worker-listing-cell mc-listing-date">
                { fmtListingDate(row?.invoices_date) || <WkdDash /> }
            </div>,
            amtCell(total),
            amtCell(paid),
            showBalance ? amtCell(fmtHK(isEmptyAmt(balance) ? 0 : balance), isEmptyAmt(balance) ? { 'data-mc-known-zero': 'true' } : undefined) : <WkdDash />,
            row?.staff_name ? (
                <div className="wkd-listing-owner">
                    <span className="wkd-listing-owner-av">{ getInitials(row.staff_name) }</span>
                    <span className="mc-listing-owner-name">{ row.staff_name }</span>
                </div>
            ) : <WkdDash />,
        ];
    }, []);

    const footer = paginated ? (
        <WkdListingFoot
            total={ result.total }
            currentPage={ result.currentPage }
            lastPage={ result.lastPage }
            perPage={ limit }
            isLoading={ listState.loading }
            unitKey="key_invoices_lc"
            onPrev={ () => setPage((prev) => Math.max(1, prev - 1)) }
            onNext={ () => setPage((prev) => prev + 1) }
            onLimitChange={ (value) => { setLimit(value); setPage(1); } }
        />
    ) : null;

    return (
        <>
        { isSelectingType && (
            <Suspense fallback={ null }>
                <GeneralConfirmSelectionPopup cancelContractDialog={ () => setIsSelectingType(false) } confirmSelectOption={ confirmGeneralType } />
            </Suspense>
        ) }
        <WkdListing
            topBar={ <WkdNewTop ariaLabel={ `${ translation('key_new') } ${ translation('key_invoice') }` } menu={ newMenu } menuHeading={ INVOICE_NEW_MENU.heading } /> }
            footer={ footer }
            columns={ columns }
            gridClass="wkd-grid-inv"
            rows={ result.rows }
            loading={ listState.loading }
            error={ listState.error }
            onRetry={ load }
            sort={ tableHeaderFilter.sort }
            order={ tableHeaderFilter.order }
            onSort={ handleSort }
            emptyText={ translation('key_no_invoices_to_display') }
            rowKey={ (row) => row.id }
            onRowClick={ handleRowClick }
            rowAriaLabel={ (row) => `${ translation('key_invoice') } ${ row.invoice_number || row.id }` }
            renderCells={ renderCells }
        />
        </>
    );
};

WorkerInvoiceListing.propTypes = {
    paginated: PropTypes.bool,
    worker_id: PropTypes.any,
    employer_id: PropTypes.any,
};

export default React.memo(WorkerInvoiceListing);
