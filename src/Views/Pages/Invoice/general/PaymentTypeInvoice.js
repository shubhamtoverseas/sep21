import React, { useEffect, useState, useRef, lazy, Suspense, useCallback } from "react";
import PropTypes from "prop-types";
import { formatHK, formatHKMinus, formatDateTime, hasPendingRefundChild, hasRefundableBalance, formatRelativeTime } from "../../../../utils/utils";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from 'dayjs';
import { useTranslation } from "react-i18next";
import '../invoice.css';
import '../InvoiceDetail.css';
import '../new-ui-shared.css';
import Icon from "../../../../components/Icon/Icon";
import ChangeCsInvoiceInsurancePopup from "../../../../components/Layout/popups/change-owner/ChangeCsInvoiceInsurancePopup";
import MarkStatusModal from "../../../../components/Layout/popups/invoice-popups/MarkStatusModal";
import { PrintInvoiceTemplate } from "../../../../components/Invoice/PrintInvoiceTemplate";
import { getInvoiceDetailPath, getPermissionValue, isAdminUser } from "../../../../services/commonService";
import {
    fetchInvoiceDetails,
    fetchInvoiceActivityLogList,
    fetchInvoicePaymentLogList,
    fetchActionStatusList,
    saveChangeInvoiceStatus,
    saveUpdateAdjustPaymentInvoice
} from "../../../../redux/Slices/invoices/InvoicesSlice";
import { addInvoiceRemarks, fetchInvoiceRemarks } from "../../../../redux/Slices/remarks/RemarkSlice";
import configData from '../../../../components/ReusableComponents/app-configs';
import constData from "../../../../components/ReusableComponents/constants";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { payRemainingBalance } from "../../../../redux/Slices/invoices/InvoicesSlice";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import InvoiceActivityTimeline from "../../../../components/Invoice/InvoiceActivityTimeline";
import InvoicePaymentRecords from "../../../../components/Invoice/InvoicePaymentRecords";
import InvoiceRemarks from "../../../../components/Invoice/InvoiceRemarks";
import InvoiceFollowUp from "../InvoiceFollowUp";
import { clearCurrentEmployer } from "../../../../redux/Slices/employer/EmployerSlice";
import { clearWorkerDetail } from "../../../../redux/Slices/worker/WorkerSlice";
import InvoiceRelatedRef from "../../../../components/Invoice/InvoiceRelatedRef";
import InvoiceStatusTag from "../../../../components/Invoice/InvoiceStatusTag";
import InvoiceHeaderContext from "../../../../components/Invoice/InvoiceHeaderContext";
import InvoiceInsuranceCard from "../../../../components/Invoice/InvoiceInsuranceCard";
import InvoiceRecordNotAvailable from "../../../../components/Invoice/InvoiceRecordNotAvailable";
import SavedInvoiceLines, { SavedFinancialRows } from "../add-contract-invoice/SavedInvoiceLines";
import { paymentMethodLabel } from "../payment-method-selector/paymentMethodCatalogue";
import PaymentDocumentCard, { PaymentDeadlineCard, missingDocumentHintKey, usePaymentDocument } from "./PaymentDocumentCard";
import { APPROVAL_STATUS_IDS, APPROVE_PAYMENT_KEYS, MARK_STATUS_IDS, findAction, isBlocked, needsReason } from "../invoiceActionList";
import useCanChangeInvoiceCs from "../useCanChangeInvoiceCs";
import { cameWithActionList } from "../invoiceView";
import { balanceDueOf, classifiedOf } from "../invoiceBalance";
import { getInvoiceActionPermissions } from "../../../../utils/permissions/invoiceActionPermissionUtils";
/* the Void popup (and the date picker it brings) loads when it opens (performance track A-33) */
const VoidWorkerCancellationPopup = lazy(() => import("../../../../components/Layout/popups/invoice-popups/VoidWorkerCancellationPopup"));
const RelatedInvoiceBriefModal = lazy(() => import("../../../../components/Layout/popups/invoice-popups/RelatedInvoiceBriefModal"));
const RevertBackPopup = lazy(() => import("../../../../components/Layout/popups/invoice-popups/RevertBackPopup"));
const RefundModal = lazy(() => import("../../../../components/Layout/popups/invoice-popups/RefundModal"));
const CommonStatusPopup = lazy(() => import("../../../../components/Layout/popups/invoice-popups/CommonStatusPopup"));
const ApprovePaymentModal = lazy(() => import("../../../../components/Layout/popups/invoice-popups/ApprovePaymentModal"));
const AdjustAmountPopup = lazy(() => import("./AdjustAmountPopup"));
const InvoiceContractPdfPrint = lazy(() => import("../InvoiceContractPdfPrint"));
const InvoiceGeneralPdfGenerator = lazy(() => import("../InvoiceGeneralPdfGenerator"));
const PayRemainingBalanceAction = lazy(() => import("../payment-method-selector/PayRemainingBalanceModal").then((m) => ({ default: m.PayRemainingBalanceAction })));
const PrintoutPreviewModal = lazy(() => import("./PrintoutPreviewModal"));

const fmtDT = formatDateTime;

const limit = constData.INVOICE_LOG_LIMIT;
const page = constData.INVOICE_LOG_FIRST_PAGE;
/* opened through withInvoiceViewGate (performance track A-10 … A-12): see InvoiceRecordGate.js for the props */
const PaymentTypeInvoice = ({ invoiceViewLoaded = false, reloadInvoice, refreshInvoice }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const contentRef = useRef();
    const [isVoidPopup, setIsVoidPopup] = useState(false);
    const [isChangeCsPopup, setIsChangeCsPopup] = useState(false);
    const canChangeInvoiceCs = useCanChangeInvoiceCs();
    const { invoice_id } = useParams();
    const [actionStatus, setActionStatus] = useState("");
    const [actionModelData, setActionModelData] = useState("");
    const [isRevertBackPopup, setIsRevertBackPopup] = useState(false);
    const [revertBackTitle, setRevertBackTitle] = useState("");
    const [onRefundPopup, setOnRefundPopup] = useState(false);
    const [isCommonStatusModel, setIsCommonStatusModel] = useState(false);
    const [briefInvoice, setBriefInvoice] = useState(null);
    const [isAdjustAmount, setIsAdjustAmount] = useState(false);
    const [isAdjustAmountActionType, setIsAdjustAmountActionType] = useState("");
    const [totalAmount, setTotalAmount] = useState(0);
    const [adjustTotalAmount, setAdjustTotalAmount] = useState(0);
    const [errorMessageResponse, setErrorMessageResponse] = useState("");
    const [isGenerateInvoice, setIsGenerateInvoice] = useState(false);
    const [isPdf, setIsPdf] = useState(false);
    const [isPrint, setIsPrint] = useState(false);
    const [isDisableRefund, setIsDisableRefund] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('summary');
    const [showPrintoutModal, setShowPrintoutModal] = useState(false);
    const [showAddRemark, setShowAddRemark] = useState(false);
    const [remarkText, setRemarkText] = useState("");
    const [remarkSaving, setRemarkSaving] = useState(false);
    const { invoiceDetails, invoiceActivityLogList, invoicePaymentLogList, actionStatusList, invoiceCacellationReason } = useSelector((state) => ({
        invoiceDetails: state.invoices.invoiceDetails,
        invoiceActivityLogList: state.invoices.invoiceActivityLogList,
        invoicePaymentLogList: state.invoices.invoicePaymentLogList,
        actionStatusList: state.invoices.actionStatusList,
        invoiceCacellationReason: state.invoices.invoiceCacellationReason,
    }), shallowEqual);
    const invoiceRemarks = useSelector((state) => state.remarks.invoiceRemarks);
    const [actionStatusCustomList, setActionStatusCustomList] = useState([]);
    const isAdmin = isAdminUser();
    const { permissionList } = useSelector((state) => state.users);
    const IsInvoiceRefundPermission = getPermissionValue(permissionList?.data, 'invoice', 'invoice_refund');
    /* PK-01 P1-19: Customer Printout and Remark only for a holder of their keys (the contract API checks them) */
    const invoiceActions = getInvoiceActionPermissions(permissionList);
    /* Proof / deposit receipt of the latest payment (v4 rules B-6, B-7, C-2): one card for every payment detail screen */
    /* the detail and both logs again: the invoice's view, in place (A-10) */
    const refreshAfterDocument = useCallback(() => refreshInvoice(), [refreshInvoice]);
    const doc = usePaymentDocument({ invoiceDetails, invoiceId: invoice_id, onChanged: refreshAfterDocument });
    const historyGuardRef = useRef(false);
    useEffect(() => {
        const permissionMap = constData.INVOICE_ACTION_PERMISSION_MAP;
        if (actionStatusList && Array.isArray(actionStatusList)) {
            const allowedIds = permissionMap
                .filter(({ key }) => getPermissionValue(permissionList?.data, 'invoice', key) === 'y' || isAdmin)
                .map(({ id }) => id);
            const filteredActions = actionStatusList
                .filter(action => allowedIds.includes(action.id))
                .sort((a, b) => a.id - b.id);
            if (!isAdmin) setActionStatusCustomList(filteredActions);
            else setActionStatusCustomList(actionStatusList);
        }
    }, [actionStatusList, permissionList, isAdmin]);

    useEffect(() => {
        setIsDisableRefund(invoiceDetails?.status === 3);
    }, [invoiceDetails]);

    useEffect(() => {
        if (historyGuardRef.current) return;
        historyGuardRef.current = true;
        window.history.pushState(null, "", window.location.href);
        const handlePopState = () => window.history.go(1);
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    /* A-10: opened on the view its gate read, the detail, both logs and the remarks are in the store. Without the view,
       everything is read as before. */
    const openedOnView = useRef(invoiceViewLoaded && Number(invoiceDetails?.id) === Number(invoice_id));
    useEffect(() => {
        if (openedOnView.current) return;
        if (invoice_id) {
            dispatch(fetchInvoiceDetails({ invoice_id })).then((response) => {
                if (response?.error?.code === "ERR_BAD_REQUEST") setErrorMessageResponse(response?.error?.message);
                else setErrorMessageResponse("");
            });
        }
        if (invoice_id) dispatch(fetchInvoiceActivityLogList({ invoice_id, limit, page }));
        if (invoice_id) dispatch(fetchInvoicePaymentLogList({ invoice_id, limit, page }));
        if (invoice_id) dispatch(fetchInvoiceRemarks({ invoice_id }));
    }, [dispatch, invoice_id]);


    useEffect(() => {
        // only for THIS page's invoice once it has loaded: never without a status (the API answers "Status is required.")
        // and never for the previous invoice still in the store
        if (!invoiceDetails?.status || Number(invoiceDetails.id) !== Number(invoice_id)) return;
        // A-12: the view carried the list read for this very detail
        if (cameWithActionList(invoiceDetails)) return;
        dispatch(fetchActionStatusList({ status: invoiceDetails.status, contract_invoices_id: invoiceDetails.id, previous_status: invoiceDetails.previous_status }));
    }, [dispatch, invoiceDetails, invoice_id]);

    const handlePrint = React.useCallback(() => {
        setIsPrint(true);
        setTimeout(() => {
            const printContents = contentRef.current.innerHTML;
            const newWindow = window.open("", "_blank");
            newWindow.document.write(PrintInvoiceTemplate(printContents));
            newWindow.document.close();
            newWindow.print();
            setIsPrint(false);
        }, 1000);
    }, [contentRef]);

    useEffect(() => {
        if (Object.keys(invoiceDetails).length !== 0 && invoiceDetails && invoiceDetails?.paymentModel && invoiceDetails.paymentModel.length > 0) {
            if (invoiceDetails?.adjusted_amouts.length > 0) {
                const totalAdjustedAmount = invoiceDetails.adjusted_amouts.reduce((sum, item) => Number(sum) + Number(item.adjusted_amount), 0);
                setAdjustTotalAmount(totalAdjustedAmount);
            }
        }
    }, [dispatch, invoiceDetails]);

    useEffect(() => {
        if (Object.keys(invoiceDetails).length !== 0 && invoiceDetails) {
            let amount = (Object.keys(invoiceDetails).length === 0) ? 0 : invoiceDetails?.final_amount;
            if (invoiceDetails?.adjusted_amouts.length > 0) {
                amount = invoiceDetails?.paid_amount;
            }
            if (Object.keys(invoiceDetails).length !== 0 && invoiceDetails?.adjusted_amouts.length > 0) {
                let amountPre = invoiceDetails.total_amount - invoiceDetails.total_discount;
                let amount = invoiceDetails.adjusted_amouts.reduce((total, adjustment) => {
                    if (adjustment.adjustment_type === 'plus') return total + Number(adjustment.adjusted_amount);
                    else return total - Math.abs(Number(adjustment.adjusted_amount));
                }, amountPre || 0);
                setTotalAmount(amount);
            } else {
                setTotalAmount(amount);
            }
        }
    }, [dispatch, invoiceDetails]);

    const handleGotoDashboard = React.useCallback(() => { navigate(`/invoices`); }, [navigate]);

    const handleActionStatusModel = React.useCallback((action) => {
        const { id, name, key } = action;
        setActionStatus(id);
        setActionModelData({ ...action });
        if (id === 0) {
            setIsAdjustAmountActionType(key === 'write_off' ? "write_off" : "adjust_amount");
            setIsAdjustAmount(true);
        } else if (id === 6) {
            setIsVoidPopup(true);
        } else if (id === 12) {
            setRevertBackTitle(name);
            setIsRevertBackPopup(true);
        } else {
            setIsCommonStatusModel(true);
        }
    }, [setActionStatus, setActionModelData, setIsAdjustAmountActionType, setIsAdjustAmount, setIsCommonStatusModel]);

    const handleConfirmAdjustType = React.useCallback((payload) => {
        setIsRevertBackPopup(false);
        if (payload.adjust_type === "adjust_amount") { setIsAdjustAmountActionType("adjust_amount"); setIsAdjustAmount(true); }
        else if (payload.adjust_type === "write_off") { setIsAdjustAmountActionType("write_off"); setIsAdjustAmount(true); }
        else setIsCommonStatusModel(true);
    }, []);

    const cancelStatusModel = React.useCallback(() => {
        setActionStatus(""); setIsCommonStatusModel(false); setActionModelData("");
    }, [setActionStatus, setIsCommonStatusModel, setActionModelData]);

    const handleActionStatus = React.useCallback((extraPayload) => {
        setIsLoading(true);
        if ((actionStatus === 6 || actionStatus === 1 || actionStatus === 2 || actionStatus === 7 || actionStatus === 5 || actionStatus === 12 || actionStatus === 11 || actionStatus === 9) && invoice_id) {
            dispatch(saveChangeInvoiceStatus({ invoice_id, from_status: invoiceDetails?.status, to_status: actionStatus, ...(extraPayload?.reason ? { reason: extraPayload.reason } : {}) })).then(res => {
                setIsLoading(false);
                if (res?.payload?.status != 400) {
                    if (res?.payload?.status == undefined && !res?.payload?.data?.status) {
                        ShowToast("error", res?.payload?.data?.message);
                        return false;
                    }
                    ShowToast("success", res?.payload?.data?.message);
                    if (invoice_id) { refreshInvoice(); setActionStatus(""); setIsCommonStatusModel(false); setActionModelData(""); }
                } else {
                    if (res?.payload?.data?.error) { ShowToast("error", res?.payload?.data?.error); setActionStatus(""); setIsCommonStatusModel(false); setActionModelData(""); }
                    else { ShowToast("error", res?.payload?.data?.message); setActionStatus(""); setIsCommonStatusModel(false); setActionModelData(""); }
                }
            });
        } else {
            ShowToast("error", t('key_invalid_status'));
            setActionStatus(""); setIsCommonStatusModel(false); setActionModelData(""); setIsLoading(false);
        }
    }, [actionStatus, invoice_id, dispatch, saveChangeInvoiceStatus, invoiceDetails, ShowToast, fetchInvoiceDetails, setActionStatus, setIsCommonStatusModel, setActionModelData, t, refreshInvoice]);

    const handleUpdateStatus = React.useCallback((payload) => {
        dispatch(saveChangeInvoiceStatus({ invoice_id, from_status: invoiceDetails?.status, to_status: actionStatus, ...payload })).then(res => {
            /* A-11: the view again and the screen anew, in place of a page reload */
            if (res?.payload?.status) { ShowToast("success", res?.payload?.message); reloadInvoice(); }
            else ShowToast("error", res?.payload?.data?.message || t('key_failed_to_update_status'));
        });
    }, [dispatch, saveChangeInvoiceStatus, invoice_id, invoiceDetails, actionStatus, ShowToast, t, reloadInvoice]);

    const handleRefundSuccess = (invoiceId) => {
        setOnRefundPopup(false);
        if (invoiceId) navigate(`/invoices/general/refund-invoice/` + invoiceId);
    }

    /* an in-screen invoice link opens that record on its own type screen, as the list does (getInvoiceDetailPath) */
    const handleRedirect = (invoice) => navigate(getInvoiceDetailPath(invoice));

    const handleUpdateInvoice = useCallback((payload) => {
        setIsLoading(true);
        dispatch(saveUpdateAdjustPaymentInvoice({ invoice_id, ...payload })).then(res => {
            if (res?.payload?.status !== 400) {
                ShowToast("success", res?.payload?.message);
                setTotalAmount(totalAmount);
                setIsLoading(false);
                if (actionStatus === 12) { handleActionStatus({ reason: payload?.reason }); setTimeout(reloadInvoice, 1000); } // the revert carries the adjustment's reason
                else setTimeout(reloadInvoice, 300);
            } else {
                ShowToast("error", res?.payload?.data?.data || t('key_failed_to_update_status'));
                setIsLoading(false);
            }
        });
    }, [dispatch, invoice_id, totalAmount, t, actionStatus, reloadInvoice]);

    const handleDownloadPDF = useCallback(() => { setIsPdf(true); }, []);

    useEffect(() => {
        if (isPdf && contentRef.current) {
            setIsGenerateInvoice(true);
            Promise.all([import("html2canvas"), import("jspdf")]).then(([html2canvasModule, jsPDFModule]) => {
                const html2canvas = html2canvasModule.default;
                const jsPDF = jsPDFModule.default;
                html2canvas(contentRef.current, { scale: 2 }).then((canvas) => {
                    const imgData = canvas.toDataURL("image/png", 0.7);
                    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
                    pdf.save(`general-invoice-${ invoiceDetails?.invoice_number }.pdf`);
                    setIsPdf(false); setIsGenerateInvoice(false);
                }).catch(error => { console.error("PDF generation failed:", error); setIsPdf(false); setIsGenerateInvoice(false); });
            }).catch(error => { console.error("Failed to load PDF libraries:", error); setIsPdf(false); setIsGenerateInvoice(false); });
        } else if (isPdf && !contentRef.current) {
            console.error("Content element not found");
            setIsPdf(false); setIsGenerateInvoice(false);
        }
    }, [isPdf, invoiceDetails?.invoice_number]);

    const handleInvoiceSuccess = useCallback((invoiceId) => {
        dispatch(clearCurrentEmployer());
        dispatch(clearWorkerDetail());
        if (invoiceId) {
            dispatch(fetchInvoiceDetails({ invoice_id: invoiceId })).then((response) => {
                if (response?.error?.code === "ERR_BAD_REQUEST") setErrorMessageResponse(response?.error?.message);
                else setErrorMessageResponse("");
            });
        }
        if (invoiceId) dispatch(fetchInvoiceActivityLogList({ invoice_id: invoiceId, limit, page }));
    }, [dispatch, navigate]);

    const handleSaveRemark = useCallback(() => {
        if (!remarkText.trim()) { ShowToast("error", t('key_please_enter_remark') || 'Please enter a remark.'); return; }
        setRemarkSaving(true);
        dispatch(addInvoiceRemarks({ remarks: remarkText, contract_invoices_id: invoice_id })).then(res => {
            setRemarkSaving(false);
            if (res?.payload?.status || res?.payload?.data?.status || res?.meta?.requestStatus === 'fulfilled') {
                ShowToast("success", res?.payload?.message || t('key_remark_added') || 'Remark added');
                setRemarkText(""); setShowAddRemark(false); setActiveTab('remarks');
            } else {
                ShowToast("error", res?.payload?.data?.message || t('key_something_went_wrong') || 'Something went wrong');
            }
        }).catch(() => { setRemarkSaving(false); ShowToast("error", t('key_something_went_wrong') || 'Something went wrong'); });
    }, [dispatch, invoice_id, remarkText, t]);

    /* ---- Derived view data ---- */
    /* Pay Remaining Balance as the Invoice API offers it (v4 B-8): the amount it locked, or null — the server decides
       (Balance Due > HK$0; never on an expired Reservation Fee or a refund child) */
    const payRemaining = invoiceDetails?.payRemainingBalance || null;
    const proofMissing = doc.missing;
    /* A child Refund Invoice awaiting approval reserves the refundable amount (reference §7) */
    const hasPendingRefund = hasPendingRefundChild(invoiceDetails);
    /* Status display — the status tag takes its tone from the status id (InvoiceStatusTag): Pending Paid and the unapproved
       Exchange / Refunded statuses read orange. Display-level only. */
    let statusLabel = configData.invoiceStatusIdMapping[invoiceDetails?.status]?.label || '';
    const typeLabel = configData.invoiceTypeLabel(invoiceDetails?.invoice_type, invoiceDetails?.payment_type) || invoiceDetails?.invoice_type || '';
    const methodLabel = paymentMethodLabel(invoiceDetails?.payment_method) || invoiceDetails?.payment_method || '';
    /* INV-G5 (R-F1): the invoice's frozen record, or null for one created before it, which keeps the rows below. A void
       invoice owes nothing: its summary stays at zero, its lines stay as saved. */
    const savedRecord = invoiceDetails?.pricing_record || null;
    const savedSummary = invoiceDetails?.status === 6 ? null : savedRecord?.summary;

    const fsTotal = Number(invoiceDetails?.status === 6 ? 0 : (invoiceDetails?.total_amount || 0));
    const fsDiscount = Number(invoiceDetails?.total_discount || 0);
    const fsCredit = Number(invoiceDetails?.total_credit || 0);
    const fsAdjust = (invoiceDetails?.adjusted_amouts || []).reduce((s, a) => a.adjustment_type === 'plus' ? s + Number(a.adjusted_amount) : s - Math.abs(Number(a.adjusted_amount)), 0);
    const fsPaid = Number(invoiceDetails?.paid_amount || 0);
    const fsRefunded = Number(invoiceDetails?.refund_amount || 0);
    /* Balance Due and its classified parts from the read model (QA-27-040; #61 / #62) */
    const fsBalance = balanceDueOf(invoiceDetails);
    const fsClassified = classifiedOf(invoiceDetails);
    const balanceIntent = fsBalance <= 0 ? 'success' : (invoiceDetails?.status === 5 || invoiceDetails?.status === 7) ? 'danger' : 'warning';


    const relatedCount = (invoiceDetails?.parentInvoice ? 1 : 0) + (invoiceDetails?.childInvoices?.length || 0);
    const helpIco = (tip) => (<span className="help-ico tt"><Icon name="info" size={11} /><span className="tt-bubble" role="tooltip">{ tip }</span></span>);
    const baseLineItems = (invoiceDetails?.contractInvoiceItemSelectModel || []).map(it => ({ type: it.item_name, desc: it.item_model_name, amount: it.amount }));

    // Applied credits live only in contractInvoiceItemModel (amount_type 'credit') —
    // shown as item-level rows with a negative line total, per the reference
    const creditLineItems = (invoiceDetails?.contractInvoiceItemModel || [])
        .filter(it => it.amount_type === 'credit')
        .map(it => ({
            type: it.price_item_type || (t('key_applied_credits') || 'Applied Credit'),
            desc: it.price_item_description,
            amount: Number(it.amount || 0),
            isCredit: true,
        }));

    const lineItems = [...baseLineItems, ...creditLineItems];

    
    return (
        <>
            <div className="invd">
                { errorMessageResponse === "" && Object.keys(invoiceDetails).length !== 0 && invoiceDetails && (
                    <>
                        {/* ===== HEADER ===== */}
                        <div className="detail-header">
                            <div className="crumb-row">
                                <a href="/invoices" onClick={ (e) => { e.preventDefault(); handleGotoDashboard(); } }>{ t('key_invoices') || 'Invoices' }</a>
                                <span className="sep">/</span>
                                <span className="here">{ invoiceDetails?.invoice_number }</span>
                            </div>

                            <div className="detail-title-row">
                                <h1>{ invoiceDetails?.invoice_number }</h1>
                                <button className="copy" title="Copy reference" aria-label="Copy reference" onClick={ () => navigator.clipboard?.writeText(invoiceDetails?.invoice_number || '') }><Icon name="copy" size={12} /></button>

                                { invoiceDetails?.parentInvoice && (
                                    <span className="badge info" style={{ cursor: 'pointer' }} onClick={ () => handleRedirect(invoiceDetails?.parentInvoice) }>
                                        { invoiceDetails?.parentInvoice?.status === 10 ? t('key_exchange') : t('key_original') } · { invoiceDetails?.parentInvoice?.invoice_number }
                                    </span>
                                )}

                                <div className="actions">
                                    <InvoiceFollowUp invoice={ invoiceDetails } />
                                    { invoiceActions.canPrintCustomerPrintout && <button className="btn btn-secondary md" onClick={ () => setShowPrintoutModal(true) }><Icon name="download" size={13} />{ t('key_customer_printout') || 'Customer Printout' }</button> }
                                    { invoiceActions.canRemark && <button className="btn btn-secondary md" onClick={ () => setShowAddRemark(true) }><Icon name="msg" size={13} />{ t('key_remark') || 'Remark' }</button> }
                                </div>
                            </div>

                            <div className="state-strip">
                                <div className="seg">
                                    <span className="k">{ t('key_status') || 'Status' }</span>
                                    <InvoiceStatusTag status={ invoiceDetails?.status } label={ statusLabel } />
                                </div>
                                <div className="sep" />
                                <div className="seg">
                                    <span className="k">{ t('key_type') || 'Type' }</span>
                                    <span className="v plain">{ typeLabel }</span>
                                </div>
                                { methodLabel && <>
                                    <div className="sep" />
                                    <div className="seg">
                                        <span className="k">{ t('key_payment') || 'Payment' }</span>
                                        <span className="v plain" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            { methodLabel }
                                            { invoiceDetails?.status === 1 && <span style={{ color: 'var(--st-success)', fontWeight: 600 }} aria-label="Payment confirmed">✓</span> }
                                        </span>
                                    </div>
                                </> }
                            </div>

                            { proofMissing && (
                                <div className="admin-warning danger">
                                    <span className="ico"><Icon name="alert" size={18} /></span>
                                    <div className="body">
                                        <div className="title">{ doc.isCash ? (t('key_deposit_receipt_missing') || 'Deposit receipt missing') : (t('key_payment_proof_missing') || 'Payment proof missing') }</div>
                                        <div className="desc">{ missingDocumentHintKey(doc.method) && t(missingDocumentHintKey(doc.method)) }</div>
                                    </div>
                                </div>
                            )}

                            { hasPendingRefund && (
                                <div className="admin-warning warning">
                                    <span className="ico"><Icon name="info" size={18} /></span>
                                    <div className="body">
                                        <div className="title">{ t('key_refund_pending_approval') || 'Refund pending approval' }</div>
                                        <div className="desc">{ t('key_refund_pending_approval_desc') || 'A child Refund Invoice is awaiting approval. Its value reserves the available-to-refund amount and blocks Exchange until the refund is approved or voided.' }</div>
                                    </div>
                                </div>
                            )}

                            <InvoiceHeaderContext invoice={ invoiceDetails } showEmployer={ invoiceDetails?.employer_id > 0 && Boolean(invoiceDetails?.employer_name) }
                                showWorker={ invoiceDetails?.worker_id > 0 && Boolean(invoiceDetails?.worker_name) } />
                        </div>

                        {/* ===== TABS ===== */}
                        <div className="detail-tabs">
                            { [
                                { id: 'summary', label: t('key_financial_summary') || 'Financial Summary' },
                                { id: 'records', label: t('key_payment_records') || 'Payment Records', count: invoicePaymentLogList?.length || 0 },
                                { id: 'activity', label: t('key_activity_timeline') || 'Activity Timeline', count: invoiceActivityLogList?.length || 0 },
                                { id: 'related', label: t('key_related_invoices') || 'Related Invoices', count: relatedCount },
                                { id: 'remarks', label: t('key_remarks') || 'Remarks', count: invoiceRemarks?.length || 0 },
                            ].map(tab => (
                                <div key={ tab.id } className={ 'tab ' + (activeTab === tab.id ? 'active' : '') } onClick={ () => setActiveTab(tab.id) }>
                                    { tab.label }
                                    { tab.count != null && <span className="count">{ tab.count }</span> }
                                </div>
                            )) }
                        </div>

                        {/* ===== BODY ===== */}
                        <div className="detail-body">
                            <div>
                                { activeTab === 'summary' && (
                                    <>
                                        <div className="detail-section">
                                            <div className="head"><h2>{ t('key_financial_summary') || 'Financial Summary' }</h2></div>
                                            <div className="body">
                                                <div className="fs-grid">
                                                    { savedSummary ? <SavedFinancialRows summary={ savedSummary } /> : (
                                                        <>
                                                            <div className="fs-row">
                                                                <div className="label">{ t('key_total') || 'Total' }{ helpIco('The invoice amount.') }</div>
                                                                <div className="v">{ formatHK(fsTotal) }</div>
                                                            </div>
                                                            { fsDiscount > 0 && (
                                                                <div className="fs-row adj-neg">
                                                                    <div className="label">{ t('key_discount') || 'Discount' }</div>
                                                                    <div className="v">-{ formatHK(fsDiscount) }</div>
                                                                </div>
                                                            )}
                                                            { fsCredit > 0 && (
                                                                <div className="fs-row adj-neg">
                                                                    <div className="label">{ t('key_applied_credits') || 'Applied Credit' }{ helpIco('Employer credit applied to this invoice as a discount.') }</div>
                                                                    <div className="v">-{ formatHK(fsCredit) }</div>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) }
                                                    <div className={ 'fs-row ' + (fsPaid === 0 ? 'zero' : '') }>
                                                        <div className="label">{ t('key_paid') || 'Paid' }{ helpIco('Payment amount currently recorded. Pending Paid invoices show their recorded amount here.') }</div>
                                                        <div className="v">{ formatHK(fsPaid) }</div>
                                                    </div>
                                                    <div className={ 'fs-row prominent ' + balanceIntent }>
                                                        <div className="label">{ t('key_balance_due') || 'Balance Due' }{ helpIco('Remaining amount after Paid is applied.') }</div>
                                                        <div className="v">{ formatHK(fsBalance) }</div>
                                                    </div>
                                                    { fsClassified.unsettled > 0 && (
                                                        <div className="fs-row unset">
                                                            <div className="label">{ t('key_unsettled') || 'Unsettled' }{ helpIco('Unresolved amount requiring verification. Not an additional charge on top of Balance Due.') }</div>
                                                            <div className="v">{ formatHK(fsClassified.unsettled) }</div>
                                                        </div>
                                                    )}
                                                    { fsClassified.badDebt > 0 && (
                                                        <div className="fs-row bd">
                                                            <div className="label">{ t('key_bad_debt') || 'Bad Debt' }{ helpIco('Unresolved amount unlikely to be collected. Kept separate from Unsettled; not an additional charge.') }</div>
                                                            <div className="v">{ formatHK(fsClassified.badDebt) }</div>
                                                        </div>
                                                    )}
                                                    { fsRefunded > 0 && (
                                                        <div className="fs-row refunded">
                                                            <div className="label">{ t('key_refunded') || 'Refunded' }{ helpIco('Approved refund value across non-voided refund children.') }</div>
                                                            <div className="v">{ formatHK(fsRefunded) }</div>
                                                        </div>
                                                    )}
                                                    { fsAdjust !== 0 && (
                                                        <div className={ 'fs-row ' + (fsAdjust > 0 ? 'adj-pos' : 'adj-neg') }>
                                                            <div className="label">{ t('key_adjustment') || 'Adjustment' }{ helpIco('Signed correction. Write-offs are represented as negative adjustment impact.') }</div>
                                                            <div className="v">{ fsAdjust > 0 ? '+' : '' }{ formatHKMinus(fsAdjust) }</div>
                                                        </div>
                                                    )}
                                                </div>
                                                { (invoiceDetails?.status === 5 || invoiceDetails?.status === 7) && (
                                                    <div className="fs-caption">
                                                        The <span className="em">{ formatHK(fsBalance) } Balance Due</span> is currently classified as <span className="em">{ invoiceDetails?.status === 7 ? 'Bad Debt' : 'Unsettled' }</span>. Unsettled and Bad Debt are classifications of unresolved amounts — not additional charges on top of the same Balance Due.
                                                    </div>
                                                )}
                                                { payRemaining && invoiceDetails?.due_date && (
                                                    <div className="fs-caption">
                                                        { t('key_payment_deadline_before_automatic_cancellation') } <span className="em">{ fmtDT(invoiceDetails?.due_date) }</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        { savedRecord ? <SavedInvoiceLines record={ savedRecord } /> : (
                                        <div className="detail-section">
                                            <div className="head">
                                                <h2>{ t('key_line_items') || 'Line items' }</h2>
                                                <span className="helper">{ lineItems.length } { (lineItems.length === 1 ? (t('key_item') || 'item') : (t('key_items') || 'items')).toLowerCase() }</span>
                                            </div>
                                            <div className="body">
                                                <table className="items-mini">
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: '32%' }}>{ t('key_item_type') || 'Item type' }</th>
                                                            <th>{ t('key_description') || 'Description' }</th>
                                                            <th className="right" style={{ width: 120 }}>{ t('key_amount') || 'Amount' }</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        { lineItems.map((it, i) => (
                                                            <tr key={ i }>
                                                                <td className="primary">{ it.type }</td>
                                                                <td>{ it.desc || <span style={{ color: 'var(--text-4)' }}>—</span> }</td>
                                                                <td className={ 'right' + (it.isCredit ? ' credit-amt' : '') }>{ it.isCredit ? `-${ formatHK(it.amount) }` : formatHK(it.amount) }</td>
                                                            </tr>
                                                        )) }
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        ) }
                                    </>
                                )}

                                { activeTab === 'records' && (
                                    <InvoicePaymentRecords invoiceId={ invoice_id } />
                                )}

                                { activeTab === 'activity' && (
                                    <InvoiceActivityTimeline invoiceId={ invoice_id } />
                                )}

                                { activeTab === 'related' && (
                                    <div className="detail-section">
                                        <div className="head"><h2>{ t('key_related_invoices') || 'Related Invoices' }</h2><span className="helper">Parents · children · exchange chain</span></div>
                                        <div className="body">
                                            { relatedCount === 0
                                                ? <div className="remark-empty">{ t('key_no_related_invoices') || 'No related invoices.' }</div>
                                                : <div className="related-list">
                                                    { invoiceDetails?.parentInvoice && (() => {
                                                        const p = invoiceDetails.parentInvoice;
                                                        const amt = p.final_amount ?? p.paid_amount;
                                                        return (
                                                            <div className="related-row">
                                                                <div className="info">
                                                                    <InvoiceRelatedRef invoice={ p } onOpen={ setBriefInvoice } />
                                                                    <div className="label">{ p.status === 10 ? t('key_exchange') : t('key_original') } { t('key_invoice') || 'Invoice' }</div>
                                                                </div>
                                                                <InvoiceStatusTag status={ p.status } />
                                                                { amt != null && <span className="amt">{ formatHK(amt) }</span> }
                                                            </div>
                                                        );
                                                    })() }
                                                    { invoiceDetails?.childInvoices?.map((child, i) => {
                                                        const isRefund = (child.invoice_type || '').includes('refund') || child.status === 8 || child.status === 9;
                                                        const label = isRefund
                                                            ? (child.status === 8 ? `${ t('key_refund') || 'Refund' } · ${ t('key_unapproved') || 'Unapproved' }` : `${ t('key_refund') || 'Refund' } ${ t('key_invoice') || 'Invoice' }`)
                                                            : `${ t('key_exchanged') } ${ t('key_invoice') || 'Invoice' }`;
                                                        const amt = child.final_amount ?? child.refund_amount;
                                                        return (
                                                            <div key={ i } className="related-row">
                                                                <div className="info">
                                                                    <InvoiceRelatedRef invoice={ child } onOpen={ setBriefInvoice } />
                                                                    <div className="label">{ label }</div>
                                                                </div>
                                                                <InvoiceStatusTag status={ child.status } />
                                                                { amt != null && (
                                                                    <span className={ 'amt' + (isRefund ? ' neg' : '') }>{ isRefund ? `(${ formatHK(Math.abs(Number(amt))) })` : formatHK(amt) }</span>
                                                                )}
                                                            </div>
                                                        );
                                                    }) }
                                                </div>
                                            }
                                        </div>
                                    </div>
                                )}

                                { activeTab === 'remarks' && (
                                    <InvoiceRemarks invoiceId={ invoice_id } />
                                )}
                            </div>

                            {/* ===== SIDE STACK ===== */}
                            <aside className="side-stack">
                                <div className="action-card">
                                    {/* Payment actions */}
                                    { (() => {
                                        /* the Invoice API lists a blocked action with its reason (decision AA-06) */
                                        const approveAction = findAction(actionStatusCustomList, APPROVE_PAYMENT_KEYS);
                                        /* Reject / Mark Unsettled is the canonical Pending Paid action (reference);
                                           on other statuses Mark Unsettled lives under Financial corrections. */
                                        const rejectAction = invoiceDetails?.status === 2 ? findAction(actionStatusCustomList, 'mark_unsettled') : null;
                                        const otherPayment = actionStatusCustomList.filter(a => ['approve_refund', 'approve_exchange'].includes(a.key));
                                        const has = payRemaining || doc.canUpload || doc.proof.url || approveAction || rejectAction || otherPayment.length > 0;
                                        if (!has) return null;
                                        return (
                                            <div className="group">
                                                <div className="lbl">{ t('key_payment_actions') || 'Payment actions' }</div>
                                                <div className="actions">
                                                    {/* Pay Remaining Balance — the one collection action, offered by the Invoice API (v4 B-8); its modal
                                                       opens when it is pressed (reference ActionMenu) */}
                                                    { payRemaining && (
                                                        <Suspense fallback={ null }>
                                                            <PayRemainingBalanceAction invoiceData={ invoiceDetails } statusLabel={ statusLabel } submitAction={ payRemainingBalance } onSuccess={ handleInvoiceSuccess } />
                                                        </Suspense>
                                                    )}
                                                    {/* PK-01 P1-19: Upload / Replace / Delete each for a holder of its keys (usePaymentDocument) */}
                                                    { doc.canUpload && (
                                                        <button type="button" className="action-btn primary" onClick={ doc.openUpload }>
                                                            <Icon name="upload" size={14} className="ico" /><span className="label">{ doc.isCash ? (t('key_upload_deposit_receipt') || 'Upload Deposit Receipt') : (t('key_upload_payment_proof') || 'Upload Proof') }</span>
                                                        </button>
                                                    )}
                                                    { doc.proof.url && (
                                                        <button type="button" className="action-btn" onClick={ doc.view }>
                                                            <Icon name="eye" size={14} className="ico" /><span className="label">{ t('key_view_proof') }</span>
                                                        </button>
                                                    )}
                                                    { doc.canReplace && (
                                                        <button type="button" className="action-btn" onClick={ doc.openReplace }>
                                                            <Icon name="upload" size={14} className="ico" /><span className="label">{ t('key_replace_proof') }</span>
                                                        </button>
                                                    )}
                                                    { doc.canDelete && (
                                                        <button type="button" className={ 'action-btn destructive' + (doc.deleting ? ' disabled' : '') } disabled={ doc.deleting } onClick={ doc.openDelete }>
                                                            <Icon name="trash" size={14} className="ico" /><span className="label">{ t('key_delete_proof') }</span>
                                                        </button>
                                                    )}
                                                    {/* disabled with the API's reason while the proof / deposit receipt is missing (ruling 13 Oct) or an
                                                       Underpayment child's A2 awaits approval (register #75) */}
                                                    { approveAction && (
                                                        <button type="button" className={ 'action-btn' + (isBlocked(approveAction) ? ' disabled with-reason' : ' primary') } disabled={ isBlocked(approveAction) } onClick={ () => !isBlocked(approveAction) && handleActionStatusModel(approveAction) }>
                                                            <Icon name="check" size={14} className="ico" /><span className="label">{ t('key_approve_payment') }</span>
                                                            { isBlocked(approveAction) && <span className="blocked">{ approveAction.reason }</span> }
                                                        </button>
                                                    )}
                                                    { otherPayment.map((action, i) => (
                                                        <button key={ i } type="button" className={ 'action-btn' + (isBlocked(action) ? ' disabled with-reason' : ' primary') } disabled={ isBlocked(action) } onClick={ () => !isBlocked(action) && handleActionStatusModel(action) }>
                                                            <Icon name="check" size={14} className="ico" /><span className="label">{ action.name }</span>
                                                            { isBlocked(action) && <span className="blocked">{ action.reason }</span> }
                                                        </button>
                                                    ))}
                                                    { rejectAction && (
                                                        <button type="button" className="action-btn destructive" onClick={ () => handleActionStatusModel(rejectAction) }>
                                                            <Icon name="x" size={14} className="ico" /><span className="label">{ t('key_reject_mark_unsettled') || 'Reject / Mark Unsettled' }</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })() }

                                    {/* Financial corrections */}
                                    { invoiceDetails?.status !== 6 && (() => {
                                        const adjustAction = findAction(actionStatusCustomList, 'adjust');
                                        const writeOffAction = findAction(actionStatusCustomList, 'write_off');
                                        const badDebtAction = findAction(actionStatusCustomList, 'mark_bad_debt');
                                        const revertAction = findAction(actionStatusCustomList, 'revert');
                                        const unsettledAction = invoiceDetails?.status !== 2 ? findAction(actionStatusCustomList, 'mark_unsettled') : null;
                                        if (!adjustAction && !writeOffAction && !badDebtAction && !revertAction && !unsettledAction) return null;
                                        return (
                                            <div className="group">
                                                <div className="lbl">{ t('key_financial_corrections') || 'Financial corrections' }</div>
                                                <div className="actions">
                                                    { adjustAction && (
                                                        <button type="button" className={ 'action-btn' + (isBlocked(adjustAction) ? ' disabled with-reason' : '') } disabled={ isBlocked(adjustAction) } onClick={ () => !isBlocked(adjustAction) && handleActionStatusModel(adjustAction) }>
                                                            <Icon name="edit" size={14} className="ico" /><span className="label">{ adjustAction.name }</span>
                                                            { isBlocked(adjustAction) && <span className="blocked">{ adjustAction.reason }</span> }
                                                        </button>
                                                    )}
                                                    { writeOffAction && (
                                                        <button type="button" className={ 'action-btn' + (isBlocked(writeOffAction) ? ' disabled with-reason' : '') } disabled={ isBlocked(writeOffAction) } onClick={ () => !isBlocked(writeOffAction) && handleActionStatusModel(writeOffAction) }>
                                                            <Icon name="edit" size={14} className="ico" /><span className="label">{ t('key_write_off') || 'Write-Off' }</span>
                                                            { isBlocked(writeOffAction) && <span className="blocked">{ writeOffAction.reason }</span> }
                                                        </button>
                                                    )}
                                                    { revertAction && (
                                                        <button type="button" className="action-btn" onClick={ () => handleActionStatusModel(revertAction) }>
                                                            <Icon name="check" size={14} className="ico" /><span className="label">{ revertAction.name }</span>
                                                        </button>
                                                    )}
                                                    { badDebtAction && (
                                                        <button type="button" className="action-btn destructive" onClick={ () => handleActionStatusModel(badDebtAction) }>
                                                            <Icon name="alert" size={14} className="ico" /><span className="label">{ badDebtAction.name }</span>
                                                        </button>
                                                    )}
                                                    { unsettledAction && (
                                                        <button type="button" className="action-btn destructive" onClick={ () => handleActionStatusModel(unsettledAction) }>
                                                            <Icon name="alert" size={14} className="ico" /><span className="label">{ t('key_mark_unsettled') || 'Mark Unsettled' }</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })() }

                                    {/* Lifecycle */}
                                    { invoiceDetails?.status !== 6 && (() => {
                                        const canRefund = (invoiceDetails?.status !== 5 && invoiceDetails?.status !== 7 && invoiceDetails?.status !== 6 && invoiceDetails?.status !== 4 && invoiceDetails?.status !== 3 && invoiceDetails?.status !== 8 && invoiceDetails?.status !== 9 && invoiceDetails?.status !== 10 && invoiceDetails?.status !== 11 && !invoiceDetails?.parent_contract_invoice_id && (IsInvoiceRefundPermission === 'y' || isAdmin))
                                            || (invoiceDetails?.status === 3 && (IsInvoiceRefundPermission === 'y' || isAdmin));
                                        /* no Exchange on a Standalone invoice: only a Contract invoice is exchanged (user 13 Oct) */
                                        const voidAction = findAction(actionStatusCustomList, 'void');
                                        if (!canRefund && !voidAction) return null;
                                        return (
                                            <div className="group danger">
                                                <div className="lbl">{ t('key_lifecycle') || 'Lifecycle' }</div>
                                                <div className="actions">
                                                    { canRefund && (() => {
                                                        /* refunds repeat while the Invoice API reports a refundable balance above HK$0 (10 Oct register
                                                           #19, #20); blocked reasons in the prototype's order (transition T8) */
                                                        const nothingRefundable = isDisableRefund || !hasRefundableBalance(invoiceDetails);
                                                        const refundBlocked = nothingRefundable || hasPendingRefund;
                                                        const reason = nothingRefundable
                                                            ? (t('key_blocked_no_refundable_value') || 'Blocked — no refundable value remains')
                                                            : (t('key_blocked_refund_pending') || 'Blocked — refund pending approval on this invoice');
                                                        return (
                                                            <button type="button" className={ 'action-btn' + (refundBlocked ? ' disabled with-reason' : '') } disabled={ refundBlocked } onClick={ () => !refundBlocked && setOnRefundPopup(true) }>
                                                                <Icon name="refresh" size={14} className="ico" /><span className="label">{ t('key_refund') }</span>
                                                                { refundBlocked && <span className="blocked">{ reason }</span> }
                                                            </button>
                                                        );
                                                    })() }
                                                    { voidAction && (
                                                        <button type="button" className={ 'action-btn destructive' + (isBlocked(voidAction) ? ' disabled with-reason' : '') } disabled={ isBlocked(voidAction) } onClick={ () => !isBlocked(voidAction) && handleActionStatusModel(voidAction) }>
                                                            <Icon name="trash" size={14} className="ico" /><span className="label">{ voidAction.name }</span>
                                                            { isBlocked(voidAction) && <span className="blocked">{ voidAction.reason }</span> }
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })() }

                                    {/* Output */}
                                    { invoiceActions.canPrintCustomerPrintout && (
                                    <div className="group">
                                        <div className="lbl">{ t('key_output') || 'Output' }</div>
                                        <div className="actions">
                                            <button type="button" className={ 'action-btn' + (isGenerateInvoice ? ' disabled' : '') } disabled={ isGenerateInvoice } onClick={ () => setShowPrintoutModal(true) }>
                                                <Icon name="download" size={14} className="ico" /><span className="label">{ isGenerateInvoice ? (t('key_generating_pdf') || 'Generating PDF…') : (t('key_print_download_customer_printout') || 'Print / Download Customer Printout') }</span>
                                            </button>
                                        </div>
                                    </div>
                                    ) }

                                    {/* Admin / context */}
                                    <div className="group">
                                        <div className="lbl">{ t('key_admin_context') || 'Admin / context' }</div>
                                        <div className="actions">
                                            {/* Conflicts sheet U-0223: the documented name is Change Invoice CS, offered with invoice_change_cs (ruling C4).
                                               @migration-unspecified(invoice): a contract-linked invoice's CS follows its Contract (U-0160, awaiting
                                               product), so the action is not offered on one. */}
                                            { canChangeInvoiceCs && !invoiceDetails?.contract_number && (
                                            <button type="button" className={ 'action-btn' + (invoiceDetails?.status === 6 ? ' disabled with-reason' : '') } onClick={ () => setIsChangeCsPopup(true) } disabled={ invoiceDetails?.status === 6 }>
                                                <Icon name="user" size={14} className="ico" /><span className="label">{ t('key_change_invoice_cs') || 'Change Invoice CS' }</span>
                                                { invoiceDetails?.status === 6 && <span className="blocked">{ t('key_blocked_invoice_is_void') }</span> }
                                            </button>
                                            ) }
                                            { isChangeCsPopup && (
                                                <ChangeCsInvoiceInsurancePopup
                                                    title={ t('key_change_invoice_cs') || 'Change Invoice CS' }
                                                    onClose={ () => setIsChangeCsPopup(false) }
                                                    entity={ { id: invoiceDetails?.id, branch_name: invoiceDetails?.branch_name, staff_name: invoiceDetails?.staff_name } }
                                                    actionType="invoice"
                                                    onCloseSubmit={ () => { setIsChangeCsPopup(false); dispatch(fetchInvoiceDetails({ invoice_id })); } }
                                                />
                                            ) }
                                            <button type="button" className="action-btn" onClick={ () => setActiveTab('activity') }>
                                                <Icon name="info" size={14} className="ico" /><span className="label">{ t('key_view_activity_timeline') || 'View Activity Timeline' }</span>
                                            </button>                                        </div>
                                    </div>
                                </div>

                                { payRemaining && invoiceDetails?.due_date && (
                                    <div className={ 'deadline-side ' + (dayjs(invoiceDetails.due_date).isBefore(dayjs()) ? 'danger' : 'warning') }>
                                        <div className="head-row"><Icon name="calendar" size={12} /><span>{ t('key_payment_deadline') || 'Payment Deadline' }</span></div>
                                        <div className="when">{ fmtDT(invoiceDetails?.due_date) }</div>
                                        <div className="relative">{ dayjs(invoiceDetails.due_date).isBefore(dayjs()) ? (t('key_overdue') || 'Overdue') : formatRelativeTime(dayjs(invoiceDetails.due_date)) }</div>
                                        <div className="hint">{ t('key_payment_deadline_before_automatic_cancellation') }</div>
                                    </div>
                                )}
                                {/* what is due on the payment and by when — the deadline stored when its timer started (v4 B-5) */}
                                <PaymentDeadlineCard deadline={ doc.deadline } />

                                {/* Insurance — the insurance records this invoice is linked to (reference InsuranceSide) */}
                                <InvoiceInsuranceCard invoiceId={ invoiceDetails?.id } invoiceRef={ invoiceDetails?.invoice_number } />

                                {/* Proof upload / view */}
                                <PaymentDocumentCard doc={ doc } methodLabel={ methodLabel } />
                            </aside>
                        </div>
                    </>
                )}

                { errorMessageResponse?.trim() && <InvoiceRecordNotAvailable message={ errorMessageResponse } /> }

                {/* Add Remark modal */}
                { showAddRemark && (
                    <div className="modal-veil" onClick={ () => !remarkSaving && setShowAddRemark(false) }>
                        <div className="modal-card action-modal-card" onClick={ e => e.stopPropagation() } role="dialog" aria-modal="true">
                            <div className="head">
                                <span className="ico" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}><Icon name="msg" size={18} /></span>
                                <div style={{ flex: 1 }}>
                                    <h2>{ t('key_add_remark') || 'Add Remark' }</h2>
                                    <div className="msub">{ t('key_remarks_context_note') || 'Remarks are separate from action reasons. They live with the invoice as context.' }</div>
                                </div>
                            </div>
                            <div className="body">
                                <div className="field">
                                    <label>{ t('key_remark') || 'Remark' }</label>
                                    <textarea className="input" rows={ 4 } style={{ height: 'auto', padding: 10, resize: 'vertical' }} maxLength={ 500 } placeholder={ t('key_remark_placeholder') || 'Context, follow-up, employer notes…' } value={ remarkText } onChange={ e => setRemarkText(e.target.value) } />
                                </div>
                            </div>
                            <div className="foot">
                                <button className="btn btn-ghost md" onClick={ () => setShowAddRemark(false) } disabled={ remarkSaving }>{ t('key_cancel') || 'Cancel' }</button>
                                <button className="btn btn-primary md" onClick={ handleSaveRemark } disabled={ remarkSaving }><Icon name="check" size={13} />{ remarkSaving ? (t('key_saving') || 'Saving…') : (t('key_save_remark') || 'Save remark') }</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            { isRevertBackPopup && <Suspense fallback={ <CustomSpinner /> }><RevertBackPopup onClose={ () => setIsRevertBackPopup(false) } handleConfirmAdjustType={ (payload) => { handleConfirmAdjustType(payload) } } revertBackTitle={ revertBackTitle } /></Suspense> }

            { isVoidPopup && <Suspense fallback={ null }><VoidWorkerCancellationPopup workerName={ invoiceDetails?.worker_name } invoiceNumber={ invoiceDetails?.invoice_number } onClose={ () => setIsVoidPopup(false) } invoiceCacellationReason={ invoiceCacellationReason } handleUpdateStatus={ (payload) => { handleUpdateStatus(payload) } } /></Suspense> }

            { onRefundPopup && <Suspense fallback={ null }><RefundModal onClose={ () => setOnRefundPopup(false) } invoiceData={ invoiceDetails } isContract={ false } onSuccess={ handleRefundSuccess } /></Suspense> }

            { isCommonStatusModel && APPROVAL_STATUS_IDS.includes(actionStatus) && <Suspense fallback={ null }><ApprovePaymentModal title={ actionStatus === 1 ? undefined : actionModelData?.name } afterStatusLabel={ actionStatus === 1 ? undefined : configData.invoiceStatusIdMapping[actionStatus]?.label } onClose={ () => cancelStatusModel() } onConfirm={ () => handleActionStatus() } loading={ isLoading } invoiceRef={ invoiceDetails?.invoice_number || invoiceDetails?.reference_id } statusLabel={ statusLabel } proof={ doc.proof } /></Suspense> }
            { isCommonStatusModel && !APPROVAL_STATUS_IDS.includes(actionStatus) && !MARK_STATUS_IDS.includes(actionStatus) && <CommonStatusPopup cancelStatusDialog={ () => cancelStatusModel() } confirmStatusContract={ (payload) => handleActionStatus(payload) } requireReason={ needsReason(actionStatus) } showConfirmDialog={ isCommonStatusModel } title={ actionModelData?.name } message={ t('key_are_you_sure_want_to_update_status') } isLoading={ isLoading } /> }

            { isCommonStatusModel && MARK_STATUS_IDS.includes(actionStatus) && <MarkStatusModal kind={ actionStatus === 12 ? 'revert' : actionStatus === 7 ? 'bad_debt' : (invoiceDetails?.status === 2 ? 'reject' : 'unsettled') } title={ actionModelData?.name } proof={ doc.proof } statusLabel={ statusLabel } invoiceDetails={ invoiceDetails } onClose={ () => cancelStatusModel() } onConfirm={ (payload) => handleActionStatus(payload) } isLoading={ isLoading } /> }

            { briefInvoice && <Suspense fallback={ null }><RelatedInvoiceBriefModal invoiceId={ briefInvoice.id } seed={ briefInvoice } onClose={ () => setBriefInvoice(null) } /></Suspense> }

            { isAdjustAmount && <AdjustAmountPopup onClose={ () => setIsAdjustAmount(false) } invoiceDetails={ invoiceDetails } handleUpdateInvoice={ (payload) => { handleUpdateInvoice(payload) } } isAdjustAmountActionType={ isAdjustAmountActionType } totalAmount={ totalAmount } isLoading={ isLoading } actionStatus={ actionStatus } /> }

            { showPrintoutModal && (
                <Suspense fallback={ null }>
                    <PrintoutPreviewModal invoiceDetails={ invoiceDetails } totalAmount={ totalAmount } onClose={ () => setShowPrintoutModal(false) } onDownloadPDF={ handleDownloadPDF } onPrint={ handlePrint } />
                </Suspense>
            ) }

            <div ref={ contentRef }>
                { isPdf && <Suspense fallback={ null }><InvoiceGeneralPdfGenerator invoiceDetails={ invoiceDetails } totalAmount={ totalAmount } /></Suspense> }
                { isPrint && <Suspense fallback={ null }><InvoiceContractPdfPrint invoiceDetails={ invoiceDetails } totalAmount={ totalAmount } /></Suspense> }
            </div>

            { adjustTotalAmount === null && null }
        </>
    );
};

/* the props withInvoiceViewGate hands the screen (InvoiceRecordGate.js) */
PaymentTypeInvoice.propTypes = {
    invoiceViewLoaded: PropTypes.bool,
    reloadInvoice: PropTypes.func,
    refreshInvoice: PropTypes.func,
};

export default PaymentTypeInvoice;
