import React, { useEffect, useState, useRef, lazy, Suspense, useMemo, useCallback } from "react";
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
import { balanceDueOf, classifiedOf } from "../invoiceBalance";
const VoidWorkerCancellationPopup = lazy(() => import("../../../../components/Layout/popups/invoice-popups/VoidWorkerCancellationPopup"));
import InvoiceRelatedRef from "../../../../components/Invoice/InvoiceRelatedRef";
import SavedInvoiceLines from "./SavedInvoiceLines";
import InvoiceStatusTag from "../../../../components/Invoice/InvoiceStatusTag";
import InvoiceHeaderContext from "../../../../components/Invoice/InvoiceHeaderContext";
import InvoiceInsuranceCard from "../../../../components/Invoice/InvoiceInsuranceCard";
import InvoiceRecordNotAvailable from "../../../../components/Invoice/InvoiceRecordNotAvailable";
const RelatedInvoiceBriefModal = lazy(() => import("../../../../components/Layout/popups/invoice-popups/RelatedInvoiceBriefModal"));
const ChangeCsInvoiceInsurancePopup = lazy(() => import("../../../../components/Layout/popups/change-owner/ChangeCsInvoiceInsurancePopup"));
const MarkStatusModal = lazy(() => import("../../../../components/Layout/popups/invoice-popups/MarkStatusModal"));
const InitiateExchangePopup = lazy(() => import("../../../../components/Layout/popups/invoice-popups/InitiateExchangePopup"));
import { fetchInvoiceDetails, fetchInvoiceActivityLogList, fetchInvoicePaymentLogList, fetchActionStatusList, saveChangeInvoiceStatus, fetchInvoiceGLobalCancellationReason, saveUpdateAdjustPaymentInvoice } from "../../../../redux/Slices/invoices/InvoicesSlice";
import configData from '../../../../components/ReusableComponents/app-configs';
import constData from "../../../../components/ReusableComponents/constants";
const PayRemainingBalanceAction = lazy(() => import("../payment-method-selector/PayRemainingBalanceModal").then((m) => ({ default: m.PayRemainingBalanceAction })));
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { payRemainingBalance } from "../../../../redux/Slices/invoices/InvoicesSlice";
import { addInvoiceRemarks, fetchInvoiceRemarks } from "../../../../redux/Slices/remarks/RemarkSlice";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import InvoiceActivityTimeline from "../../../../components/Invoice/InvoiceActivityTimeline";
import InvoicePaymentRecords from "../../../../components/Invoice/InvoicePaymentRecords";
import InvoiceRemarks from "../../../../components/Invoice/InvoiceRemarks";
import InvoiceFollowUp from "../InvoiceFollowUp";
const RefundModal = lazy(() => import("../../../../components/Layout/popups/invoice-popups/RefundModal"));
const RevertBackPopup = lazy(() => import("../../../../components/Layout/popups/invoice-popups/RevertBackPopup"));
const CommonStatusPopup = lazy(() => import("../../../../components/Layout/popups/invoice-popups/CommonStatusPopup"));
const ApprovePaymentModal = lazy(() => import("../../../../components/Layout/popups/invoice-popups/ApprovePaymentModal"));
const AdjustAmountPopup = lazy(() => import("./AdjustAmountPopup"));
import { clearCurrentEmployer } from "../../../../redux/Slices/employer/EmployerSlice";
import { clearWorkerDetail, fetchInterviewCounts } from "../../../../redux/Slices/worker/WorkerSlice";
const InvoiceExchangePdfGenerator = lazy(() => import("../InvoiceExchangePdfGenerator"));
const PrintoutPreviewModal = lazy(() => import("../general/PrintoutPreviewModal"));
// const InvoiceExchangePdfPrint = lazy(() => import("../InvoiceExchangePdfPrint"));
import { getInvoiceDetailPath, getPermissionValue, isAdminUser } from "../../../../services/commonService";
import { PrintInvoiceTemplate } from "../../../../components/Invoice/PrintInvoiceTemplate";
import { paymentMethodLabel } from "../payment-method-selector/paymentMethodCatalogue";
import PaymentDocumentCard, { PaymentDeadlineCard, missingDocumentHintKey, usePaymentDocument } from "../general/PaymentDocumentCard";
import { APPROVAL_STATUS_IDS, APPROVE_PAYMENT_KEYS, MARK_STATUS_IDS, findAction, isBlocked, needsReason } from "../invoiceActionList";
import useCanChangeInvoiceCs from "../useCanChangeInvoiceCs";
import { cameWithActionList } from "../invoiceView";
import { getInvoiceActionPermissions } from "../../../../utils/permissions/invoiceActionPermissionUtils";
const limit = constData.INVOICE_LOG_LIMIT;
const page = constData.INVOICE_LOG_FIRST_PAGE;

/* HK$ / date formatters — match the new-UI design bundle. */
const fmtDT = formatDateTime;

const PERMISSION_MAP = constData.INVOICE_ACTION_PERMISSION_MAP;
/* the actions the side panel places in Payment actions (reject on Pending Paid), Financial corrections and Lifecycle */
const GROUPED_ACTION_KEYS = ['mark_unsettled', 'adjust', 'write_off', 'revert', 'mark_bad_debt', 'void'];

/* opened through withInvoiceViewGate (performance track A-10 … A-12): see InvoiceRecordGate.js for the props */
const ExchangePaymentTypeInvoice = React.memo(function ExchangePaymentTypeInvoice({ invoiceViewLoaded = false, reloadInvoice, refreshInvoice }) {
    const { t } = useTranslation(); // Access translations
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const contentRef = useRef();
    const [activeTab, setActiveTab] = useState('summary');
    const [isVoidPopup, setIsVoidPopup] = useState(false);
    const [isChangeCsPopup, setIsChangeCsPopup] = useState(false);
    const canChangeInvoiceCs = useCanChangeInvoiceCs();
    const [isRevertBackPopup, setIsRevertBackPopup] = useState(false);
    const [revertBackTitle, setRevertBackTitle] = useState("");
    const [isInitiatePopup, setIsInitiateExchangePopup] = useState(false);
    const { invoice_id } = useParams();
    const [actionStatus, setActionStatus] = useState("");
    const [actionModelData, setActionModelData] = useState("");
    const [onRefundPopup, setOnRefundPopup] = useState(false);
    const [isCommonStatusModel, setIsCommonStatusModel] = useState(false);
    const [briefInvoice, setBriefInvoice] = useState(null);
    const [isAdjustAmount, setIsAdjustAmount] = useState(false);
    const [isAdjustAmountActionType, setIsAdjustAmountActionType] = useState("");
    const [errorMessageResponse, setErrorMessageResponse] = useState("");
    const [isGenerateInvoice, setIsGenerateInvoice] = useState(false);
    const [isPdf, setIsPdf] = useState(false);
    const [isPrint, setIsPrint] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPrintoutModal, setShowPrintoutModal] = useState(false);
    const [showAddRemark, setShowAddRemark] = useState(false);
    const [remarkText, setRemarkText] = useState("");
    const [remarkSaving, setRemarkSaving] = useState(false);
    const { invoiceDetails, invoiceActivityLogList, invoicePaymentLogList, actionStatusList, invoiceCacellationReason, totalInterviewCounts } = useSelector((state) => ({
        invoiceDetails: state.invoices.invoiceDetails,
        invoiceActivityLogList: state.invoices.invoiceActivityLogList,
        invoicePaymentLogList: state.invoices.invoicePaymentLogList,
        actionStatusList: state.invoices.actionStatusList,
        invoiceCacellationReason: state.invoices.invoiceCacellationReason,
        totalInterviewCounts: state.worker.totalInterviewCounts,
    }), shallowEqual);
    const isAdmin = isAdminUser();
    const { permissionList } = useSelector((state) => state.users);
    const IsInvoiceExchangePermission = getPermissionValue(permissionList?.data, 'invoice', 'invoice_exchange');
    const IsInvoiceRefundPermission = getPermissionValue(permissionList?.data, 'invoice', 'invoice_refund');
    /* PK-01 P1-19: Customer Printout and Remark only for a holder of their keys (the contract API checks them) */
    const invoiceActions = getInvoiceActionPermissions(permissionList);
    /* Proof / deposit receipt of the latest payment (v4 rules B-6, B-7, C-2): one card for every payment detail screen */
    /* the detail and both logs again: the invoice's view, in place (A-10) */
    const refreshAfterDocument = useCallback(() => refreshInvoice(), [refreshInvoice]);
    const doc = usePaymentDocument({ invoiceDetails, invoiceId: invoice_id, onChanged: refreshAfterDocument });

    const actionStatusCustomList = useMemo(() => {
        if (!actionStatusList || !Array.isArray(actionStatusList)) return [];
        if (isAdmin) return actionStatusList;
        const allowedIds = PERMISSION_MAP
            .filter(({ key }) => getPermissionValue(permissionList?.data, 'invoice', key) === 'y')
            .map(({ id }) => id);
        return actionStatusList
            .filter(action => allowedIds.includes(action.id))
            .sort((a, b) => a.id - b.id);
    }, [actionStatusList, permissionList, isAdmin]);

    const historyGuardRef = useRef(false);
    // ── Block browser back-navigation ────────────────────────────────────────
    useEffect(() => {
        if (historyGuardRef.current) return;
        historyGuardRef.current = true;

        window.history.pushState(null, "", window.location.href);
        const handlePopState = () => window.history.go(1);
        window.addEventListener("popstate", handlePopState);

        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    /* A-10: opened on the view its gate read, the detail, both logs and the remarks are in the store; only what the view
       does not carry is read here (the job's interview counts). Without the view, everything is read as before. */
    const openedOnView = useRef(invoiceViewLoaded && Number(invoiceDetails?.id) === Number(invoice_id) ? invoiceDetails : null);
    useEffect(() => {
        if (openedOnView.current) {
            if (openedOnView.current.job_id) dispatch(fetchInterviewCounts({ job_id: openedOnView.current.job_id }));
            return;
        }
        if (invoice_id) {
            dispatch(fetchInvoiceDetails({ invoice_id })).then((response) => {
                if (response?.error?.code === "ERR_BAD_REQUEST") {
                    setErrorMessageResponse(response?.error?.message);
                } else {
                    if (response?.payload?.data?.job_id) {
                        dispatch(fetchInterviewCounts({ job_id: response?.payload?.data?.job_id }));
                    }
                    setErrorMessageResponse("");
                }
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

    const { totalAmount, currentInvoiceInfo } = useMemo(() => {
        if (!invoiceDetails || Object.keys(invoiceDetails).length === 0) {
            return { totalAmount: 0, currentInvoiceInfo: "" };
        }
        let amount = invoiceDetails?.final_amount || 0;
        if (invoiceDetails?.adjusted_amouts?.length > 0) {
            amount = invoiceDetails?.paid_amount;
        }
        if (invoiceDetails?.adjusted_amouts?.length > 0) {
            const amountPre = invoiceDetails.total_amount - invoiceDetails.total_discount;
            amount = invoiceDetails.adjusted_amouts.reduce((total, adjustment) => {
                if (adjustment.adjustment_type === 'plus') {
                    return total + adjustment.adjusted_amount;
                } else {
                    return total - Math.abs(adjustment.adjusted_amount);
                }
            }, amountPre || 0);
        }
        return {
            totalAmount: amount,
            currentInvoiceInfo: { ...invoiceDetails, final_amount: amount },
        };
    }, [invoiceDetails]);

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

    // Function to initiate PDF download
    const handleDownloadPDF = React.useCallback(() => {
        setIsPdf(true);
    }, []);

    // Effect to handle PDF generation after UI rendering
    useEffect(() => {
        if (isPdf && contentRef.current) {
            setIsGenerateInvoice(true);
            // Lazy-load html2canvas and jsPDF
            Promise.all([
                import("html2canvas"),
                import("jspdf")
            ]).then(([html2canvasModule, jsPDFModule]) => {
                const html2canvas = html2canvasModule.default;
                const jsPDF = jsPDFModule.default;
                html2canvas(contentRef.current, { scale: 2, backgroundColor: '#ffffff' }).then((canvas) => {
                    const imgData = canvas.toDataURL("image/png", 0.7);
                    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
                    // Calculate width/height ratio to fit A4
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
                    pdf.save(`Exchange-contract-invoice-${ invoiceDetails?.invoice_number }.pdf`);
                    // Reset states immediately after PDF generation
                    setIsPdf(false);
                    setIsGenerateInvoice(false);
                }).catch(error => {
                    console.error("PDF generation failed:", error);
                    setIsPdf(false);
                    setIsGenerateInvoice(false);
                });
            }).catch(error => {
                console.error("Failed to load PDF libraries:", error);
                setIsPdf(false);
                setIsGenerateInvoice(false);
            });
        } else if (isPdf && !contentRef.current) {
            console.error("Content element not found");
            setIsPdf(false);
            setIsGenerateInvoice(false);
        }
    }, [isPdf, invoiceDetails?.invoice_number]);

    const handleGotoDashboard = React.useCallback(() => {
        navigate(`/invoices`);
    }, [navigate]);

    const handlePaymentSuccess = useCallback(() => {
        dispatch(clearCurrentEmployer());
        dispatch(clearWorkerDetail());
        reloadInvoice(); // A-11: the view again and the screen anew, in place of a page reload
    }, [dispatch, reloadInvoice]);

    const handleActionStatusModel = React.useCallback((action) => {
        const { id, name, key } = action;
        setActionStatus(id);
        setActionModelData({ ...action });
        if (id === 0) {
            setIsAdjustAmountActionType(key === 'write_off' ? "write_off" : "adjust_amount");
            setIsAdjustAmount(true);
        } else if (id === 6) {
            setIsVoidPopup(true);
            if (invoiceCacellationReason.length === 0)
                dispatch(fetchInvoiceGLobalCancellationReason({}));
        } else if (id === 12) {
            setRevertBackTitle(name);
            setIsRevertBackPopup(true);
        } else {
            setIsCommonStatusModel(true);
        }
    }, [dispatch, invoiceCacellationReason]);

    const cancelStatusModel = React.useCallback(() => {
        setActionStatus("");
        setIsCommonStatusModel(false);
        setActionModelData("");
    }, []);

    const handleActionStatus = React.useCallback((extraPayload) => {
        console.log("Action Status:", actionStatus);
        if (actionStatus === 6) {
            setIsVoidPopup(true);
            if (!invoiceCacellationReason)
                dispatch(fetchInvoiceGLobalCancellationReason({}));
        } else if ((actionStatus === 1 || actionStatus === 2 || actionStatus === 7 || actionStatus === 5 || actionStatus === 12 || actionStatus === 11 || actionStatus === 9) && invoice_id) {
            dispatch(saveChangeInvoiceStatus({ invoice_id, from_status: invoiceDetails?.status, to_status: actionStatus, ...(extraPayload?.reason ? { reason: extraPayload.reason } : {}) })).then(res => {
                if (res?.payload?.status != 400) {
                    if (res?.payload?.status == undefined && !res?.payload?.data?.status) {
                        ShowToast("error", res?.payload?.data?.message);
                        return false;
                    }
                    ShowToast("success", res?.payload?.data?.message);
                    if (invoice_id) {
                        refreshInvoice();
                        setActionStatus("");
                        setIsCommonStatusModel(false);
                        setActionModelData("");
                    }
                } else {
                    if (res?.payload?.data?.error) {
                        ShowToast("error", res?.payload?.data?.error);
                        setActionStatus("");
                        setIsCommonStatusModel(false);
                        setActionModelData("");
                    } else {
                        ShowToast("error", res?.payload?.data?.message);
                        setActionStatus("");
                        setIsCommonStatusModel(false);
                        setActionModelData("");
                    }
                }
            });
        } else {
            ShowToast("error", t('key_invalid_status'));
            setActionStatus("");
            setIsCommonStatusModel(false);
            setActionModelData("");
        }
    }, [actionStatus, dispatch, invoice_id, invoiceDetails?.status, invoiceCacellationReason, t, refreshInvoice]);

    const handleUpdateStatus = React.useCallback((payload) => {
        setIsLoading(true);
        dispatch(saveChangeInvoiceStatus({ invoice_id, from_status: invoiceDetails?.status, to_status: actionStatus, ...payload })).then(res => {
            if (res?.payload?.status) {
                ShowToast("success", res?.payload?.message);
                setIsLoading(false);
                setIsVoidPopup(false);
                setTimeout(reloadInvoice, 500);
            } else {
                ShowToast("error", res?.payload?.data?.message || t('key_failed_to_update_status'));
                setIsLoading(false);
                setIsVoidPopup(false);
            }
        });
    }, [dispatch, invoice_id, invoiceDetails?.status, actionStatus, t, reloadInvoice]);

    const handleRefundSuccess = React.useCallback((invoiceId) => {
        setOnRefundPopup(false);
        if (invoiceId) navigate(`/invoices/add-contract-invoice/refund-invoice/` + invoiceId);
    }, [navigate]);

    const handleConfirmAdjustType = React.useCallback((payload) => {
        setIsRevertBackPopup(false);
        if (payload.adjust_type === "adjust_amount") {
            setIsAdjustAmountActionType("adjust_amount");
            setIsAdjustAmount(true);
        } else if (payload.adjust_type === "write_off") {
            setIsAdjustAmountActionType("write_off");
            setIsAdjustAmount(true);
        } else {
            setIsCommonStatusModel(true);
        }
    }, []);

    /* an in-screen invoice link opens that record on its own type screen, as the list does (getInvoiceDetailPath) */
    const handleRedirect = React.useCallback((invoice) => navigate(getInvoiceDetailPath(invoice)), [navigate]);

    const handleSelectWorker = React.useCallback(() => {
        dispatch(clearWorkerDetail());
        navigate(`/invoices/exchange/select-contract-exchange`, { state: { exchangeInvoiceInfo: currentInvoiceInfo } });
    }, [dispatch, navigate, currentInvoiceInfo]);

    const handleUpdateInvoice = React.useCallback((payload) => {
        setIsLoading(true);
        dispatch(saveUpdateAdjustPaymentInvoice({ invoice_id, ...payload })).then(res => {
            if (res?.payload?.status !== 400) {
                ShowToast("success", res?.payload?.message);
                if (actionStatus === 12) {
                    // the revert carries the adjustment's reason (the Invoice API requires one)
                    handleActionStatus({ reason: payload?.reason });
                    setTimeout(reloadInvoice, 1000);
                } else {
                    setTimeout(reloadInvoice, 300);
                }
            } else {
                ShowToast("error", res?.payload?.data?.data || t('key_failed_to_update_status'));
            }
            setIsLoading(false);
        });
    }, [dispatch, invoice_id, t, actionStatus, reloadInvoice]);

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

    /* ---- Derived view data (maps real invoice to the new-UI design) ---- */
    const proofMissing = doc.missing;
    /* Status display — the status tag takes its tone from the status id (InvoiceStatusTag): Pending Paid and the unapproved
       Exchange / Refunded statuses read orange. Display-level only. */
    let statusLabel = configData.invoiceStatusIdMapping[invoiceDetails?.status]?.label || '';
    const typeLabel = configData.invoiceTypeLabel(invoiceDetails?.invoice_type, invoiceDetails?.payment_type) || invoiceDetails?.invoice_type || '';
    const methodLabel = paymentMethodLabel(invoiceDetails?.payment_method) || invoiceDetails?.payment_method || '';

    /* Financial summary figures */
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


    /* Pay Remaining Balance as the Invoice API offers it (v4 B-8): the amount it locked, or null — the server decides
       (Balance Due > HK$0; never on an expired Reservation Fee or a refund child) */
    const payRemaining = invoiceDetails?.payRemainingBalance || null;
    const relatedCount = (invoiceDetails?.parentInvoice ? 1 : 0) + (invoiceDetails?.childInvoices?.length || 0);
    const invoiceRemarks = useSelector((state) => state.remarks.invoiceRemarks);
    const helpIco = (tip) => (<span className="help-ico tt"><Icon name="info" size={11} /><span className="tt-bubble" role="tooltip">{ tip }</span></span>);
    const lineItems = (invoiceDetails?.contractInvoiceItemSelectModel || []).map(it => ({ type: it.item_name, desc: it.item_model_name, amount: it.amount }));

    /* ---- Exchange Settlement (zero-net model, reference §16.3 / §12.1) ----
       A2 net total is always HK$0. Derived entirely from existing invoice
       data — no API change. */
    const isExchangeInvoice = (invoiceDetails?.status === 10 || invoiceDetails?.status === 11) && !!invoiceDetails?.parentInvoice && invoiceDetails?.invoice_type !== 'underpayment';
    const xParent = invoiceDetails?.parentInvoice;
    /* OP-27-118 (decided 2 Nov 2026): an A2 the pricing engine created (INV-X1) reads its frozen record — its settlement and
       the lines it was created with, never the old-style item rows; an older A2 (no record) keeps the figures read below */
    const xRecord = isExchangeInvoice && invoiceDetails?.pricing_record?.settlement ? invoiceDetails.pricing_record : null;
    const xSettlement = xRecord ? xRecord.settlement : null;
    const xReplacementTotal = xSettlement ? Number(xSettlement.replacementValue) : Number(invoiceDetails?.total_amount || 0) - Number(invoiceDetails?.total_discount || 0);
    const xCreditAvailable = xSettlement ? Number(xSettlement.exchangeCredit) : Number(xParent?.final_amount || 0) - Number(xParent?.refund_amount || 0);
    const isShortfall = xSettlement ? Number(xSettlement.shortfall) > 0 : invoiceDetails?.exchange_type === 'additional_payment';
    const xCreditApplied = isShortfall ? xCreditAvailable : Math.min(xCreditAvailable, xReplacementTotal);
    const underpaymentChild = (invoiceDetails?.childInvoices || []).find(c => c.invoice_type === 'underpayment');
    const refundChild = (invoiceDetails?.childInvoices || []).find(c => (c.invoice_type || '').includes('refund'));
    /* Write-Off and Save as Credit both leave a write-off record on A2 (the Invoice API's remainingCreditAdjustment); Save as
       Credit's carries the reason "Credit balance saved" */
    const hasWriteOff = (invoiceDetails?.adjusted_amouts || []).some(a => a.type === 'write_off' && a.reason !== 'Credit balance saved');
    const xAdditional = xSettlement ? Number(xSettlement.shortfall) : isShortfall
        ? Math.abs(Number(underpaymentChild?.final_amount ?? (xReplacementTotal - xCreditAvailable)))
        : 0;
    const xRemaining = xSettlement ? Number(xSettlement.remainingCredit) : !isShortfall ? Math.max(0, xCreditAvailable - xCreditApplied) : 0;
    let xOutcome = t('key_outcome_credit_fully_applied');
    if (isShortfall) xOutcome = t('key_outcome_additional_payment_collected') || 'Additional Payment Collected';
    else if (xRemaining > 0 && refundChild) xOutcome = `${ t('key_outcome_refunded_via') || 'Refunded via' } ${ refundChild.invoice_number }`;
    else if (xRemaining > 0 && hasWriteOff) xOutcome = t('key_outcome_written_off') || 'Written Off';
    else if (xRemaining > 0) xOutcome = t('key_outcome_saved_as_credit') || 'Saved as Credit';
    /* A1 viewed after its exchange was approved — value moved to the A2 chain */
    const isA1PostExchange = invoiceDetails?.status === 11 && !invoiceDetails?.parentInvoice && (invoiceDetails?.childInvoices || []).some(c => c.invoice_type === 'exchange' || c.status === 10 || c.status === 11);
    /* Refund needs a refundable balance above HK$0 (the Invoice API's figure; 10 Oct register #20) and no refund awaiting
       approval — blocked reasons in the prototype's order (transition T8) */
    const refundBlockedReason = !hasRefundableBalance(invoiceDetails)
        ? (t('key_blocked_no_refundable_value') || 'Blocked — no refundable value remains')
        : (hasPendingRefundChild(invoiceDetails) ? (t('key_blocked_refund_pending') || 'Blocked — refund pending approval on this invoice') : null);

    /* the actions the Invoice API lists (none on a Void invoice), grouped as the reference side panel */
    const listedActions = invoiceDetails?.status !== 6 ? (actionStatusCustomList || []) : [];
    /* one side-panel row per listed action: its icon and emphasis, disabled with the API's reason when blocked (decision
       AA-06); a blocked row drops its primary emphasis (reference) */
    const actionRow = (action, { icon, label, tone = '' }) => {
        if (!action) return null;
        const blocked = isBlocked(action);
        const emphasis = tone && !(blocked && tone === 'primary') ? ' ' + tone : '';
        return (
            <button key={ action.key || action.id } type="button" className={ 'action-btn' + emphasis + (blocked ? ' disabled with-reason' : '') } disabled={ blocked } onClick={ () => !blocked && handleActionStatusModel(action) }>
                <Icon name={ icon } size={14} className="ico" /><span className="label">{ label || action.name }</span>
                { blocked && <span className="blocked">{ action.reason }</span> }
            </button>
        );
    };

    return (
        <>
            <div className="invd">
            { errorMessageResponse === "" && Object.keys(invoiceDetails).length !== 0 && invoiceDetails !== undefined && invoiceDetails && (
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
                            { invoiceDetails?.childInvoices && invoiceDetails?.childInvoices.length > 0 && invoiceDetails?.childInvoices.map((action, index) => (
                                <span key={ action.status } className="badge info" style={{ cursor: 'pointer' }} onClick={ () => { handleRedirect(action) } }>
                                    { ((action.status === 9 || action.status === 8)) ? ((!index) ? t('key_refunded') : "") : action?.invoice_type === "underpayment" ? "Underpaid" : t('key_exchanged') } · { action.invoice_number }
                                </span>
                            )) }

                            <div className="actions">
                                <InvoiceFollowUp invoice={ invoiceDetails } />
                                {/* the same header actions as every detail screen (reference title row): the printout preview keeps the
                                   exchange PDF and print output */}
                                { invoiceActions.canPrintCustomerPrintout && <button className="btn btn-secondary md" disabled={ isGenerateInvoice } onClick={ () => setShowPrintoutModal(true) }><Icon name="download" size={13} />{ t('key_customer_printout') || 'Customer Printout' }</button> }
                                { invoiceActions.canRemark && <button className="btn btn-secondary md" onClick={ () => setShowAddRemark(true) }><Icon name="msg" size={13} />{ t('key_remark') || 'Remark' }</button> }
                            </div>
                        </div>

                        {/* State strip — Status · Type · Payment */}
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

                        {/* Admin warning — proof missing */}
                        { proofMissing && (
                            <div className="admin-warning danger">
                                <span className="ico"><Icon name="alert" size={18} /></span>
                                <div className="body">
                                    <div className="title">{ doc.isCash ? (t('key_deposit_receipt_missing') || 'Deposit receipt missing') : (t('key_payment_proof_missing') || 'Payment proof missing') }</div>
                                    <div className="desc">{ missingDocumentHintKey(doc.method) && t(missingDocumentHintKey(doc.method)) }</div>
                                </div>
                            </div>
                        )}

                        {/* Banner — Remaining Credit (surplus) / Additional payment (shortfall) on A2 */}
                        { isExchangeInvoice && isShortfall && (
                            <div className="admin-warning attention">
                                <span className="ico"><Icon name="info" size={18} /></span>
                                <div className="body">
                                    <div className="title">{ t('key_additional_payment_via_underpayment') || 'Additional payment via Underpayment Invoice' }</div>
                                    <div className="desc">{ t('key_additional_payment_via_underpayment_desc') || 'A2 Total exceeds the A1 credit. The additional amount is collected through a child Underpayment Invoice. A2 itself stays Exchanged.' }</div>
                                </div>
                            </div>
                        )}
                        { isExchangeInvoice && !xRecord && !isShortfall && xRemaining > 0 && (
                            <div className="admin-warning attention">
                                <span className="ico"><Icon name="info" size={18} /></span>
                                <div className="body">
                                    <div className="title">{ t('key_remaining_credit') || 'Remaining Credit' }</div>
                                    <div className="desc">{ t('key_remaining_credit_desc') || 'A1 credit is higher than the A2 Total. Choose how to handle the remaining credit: Refund Remaining Credit, Write Off Remaining Credit, or Save as Credit.' }</div>
                                </div>
                            </div>
                        )}
                        {/* Banner — A1 already exchanged (reference a1_post_exchange) */}
                        { isA1PostExchange && (
                            <div className="admin-warning attention">
                                <span className="ico"><Icon name="info" size={18} /></span>
                                <div className="body">
                                    <div className="title">{ t('key_a1_already_exchanged') || 'A1 — already exchanged' }</div>
                                    <div className="desc">{ t('key_a1_already_exchanged_desc') || 'This invoice has been exchanged. Refund, Exchange, and Void are unavailable. Mark Unsettled, Mark Bad Debt and Adjust are still allowed (with warnings). Each blocked action shows its reason.' }</div>
                                </div>
                            </div>
                        )}

                        {/* Header context cards */}
                        <InvoiceHeaderContext invoice={ invoiceDetails } />
                    </div>

                    { isInitiatePopup && <Suspense fallback={ null }><InitiateExchangePopup onClose={ () => setIsInitiateExchangePopup(false) } onSelectWorker={ () => handleSelectWorker() } invoiceData={ invoiceDetails } /></Suspense> }

                    {/* ===== TABS ===== */}
                    <div className="detail-tabs">
                        { [
                            { id: 'summary', label: isExchangeInvoice ? t('key_exchange_settlement_summary') : (t('key_financial_summary') || 'Financial Summary') },
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
                            <div className="head">
                                <h2>{ isExchangeInvoice ? (t('key_exchange_settlement_summary') || 'Exchange Settlement Summary') : (t('key_financial_summary') || 'Financial Summary') }</h2>
                            </div>
                            <div className="body">
                                { isExchangeInvoice ? (
                                    /* Exchange Settlement — dedicated A2 block (zero-net model, reference §16.3) */
                                    <div className="exchange-summary">
                                        <div className="fs-grid">
                                            <div className="fs-row">
                                                <div className="label">{ t('key_original_invoice') || 'Original Invoice' }</div>
                                                <div className="v"><span style={{ fontFamily: 'var(--mono)', cursor: 'pointer' }} onClick={ () => handleRedirect(xParent) }>{ xParent?.invoice_number }</span></div>
                                            </div>
                                            <div className="fs-row">
                                                <div className="label">{ t('key_replacement_service_value') || 'Replacement Service Value' }</div>
                                                <div className="v">{ formatHK(xReplacementTotal) }</div>
                                            </div>
                                            { isShortfall ? (
                                                <>
                                                    <div className="fs-row adj-neg">
                                                        <div className="label">{ t('key_credit_applied_from') || 'Credit Applied from' } { xParent?.invoice_number }</div>
                                                        <div className="v">−{ formatHK(xCreditApplied) }</div>
                                                    </div>
                                                    <div className="fs-row xs-strong">
                                                        <div className="label">{ t('key_additional_payment') || 'Additional Payment' }</div>
                                                        <div className="v">{ formatHK(xAdditional) }</div>
                                                    </div>
                                                    { underpaymentChild && (
                                                        <div className="fs-row">
                                                            <div className="label">{ t('key_collected_via') || 'Collected via' }</div>
                                                            <div className="v"><span style={{ fontFamily: 'var(--mono)', cursor: 'pointer' }} onClick={ () => handleRedirect(underpaymentChild) }>{ underpaymentChild.invoice_number }</span></div>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div className="fs-row">
                                                        <div className="label">{ t('key_credit_available_from') || 'Credit Available from' } { xParent?.invoice_number }</div>
                                                        <div className="v">{ formatHK(xCreditAvailable) }</div>
                                                    </div>
                                                    <div className="fs-row adj-neg">
                                                        <div className="label">{ t('key_credit_applied_to_replacement') || 'Credit Applied to Replacement' }</div>
                                                        <div className="v">−{ formatHK(xCreditApplied) }</div>
                                                    </div>
                                                    <div className="fs-row xs-strong">
                                                        <div className="label">{ t('key_remaining_credit') || 'Remaining Credit' }</div>
                                                        <div className="v">{ formatHK(xRemaining) }</div>
                                                    </div>
                                                </>
                                            )}
                                            <div className="fs-row xs-outcome-row">
                                                <div className="label">{ t('key_outcome') || 'Outcome' }</div>
                                                <div className="v">{ xOutcome }</div>
                                            </div>
                                            <div className="fs-row prominent success xs-net">
                                                <div className="label">{ t('key_net_exchange_invoice_total') || 'Net Exchange Invoice Total' }</div>
                                                <div className="v">{ formatHK(0) }</div>
                                            </div>
                                            <div className="fs-row xs-balance">
                                                <div className="label">{ t('key_balance_due') || 'Balance Due' }</div>
                                                <div className="v">{ formatHK(0) }</div>
                                            </div>
                                        </div>
                                        <div className="xs-note">
                                            <span className="ico"><Icon name="info" size={12} /></span>
                                            <span>
                                                { isShortfall
                                                    ? <>{ t('key_xs_note_lead') || 'A2 is an Exchange Settlement invoice with a net total of HK$0.' } { t('key_xs_note_shortfall') || 'The additional payment is owned by the child Underpayment Invoice' } <strong>{ underpaymentChild?.invoice_number }</strong>.</>
                                                    : <>{ t('key_xs_note_lead') || 'A2 is an Exchange Settlement invoice with a net total of HK$0.' } { t('key_xs_note_surplus') || 'The remaining credit was resolved by' } <strong>{ xOutcome }</strong>.</> }
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="fs-grid">
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
                                )}
                                { (invoiceDetails?.status === 5 || invoiceDetails?.status === 7) && (
                                    <div className="fs-caption">
                                        The <span className="em">{ formatHK(fsBalance) } Balance Due</span> is currently classified as <span className="em">{ invoiceDetails?.status === 7 ? 'Bad Debt' : 'Unsettled' }</span>. Unsettled and Bad Debt are classifications of unresolved amounts — not additional charges on top of the same Balance Due.
                                    </div>
                                )}
                                { invoiceDetails?.job_id && (
                                    <div className="fs-caption">
                                        { t('key_cancel_all_upcoming_pending_interviews') } { invoiceDetails?.reference_id || '' } — <span className="em">{ t('key_pending') || 'Pending' }: { totalInterviewCounts?.pending_count } · { t('key_upcoming') || 'Upcoming' }: { totalInterviewCounts?.upcoming_count }</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        { xRecord ? <SavedInvoiceLines record={ xRecord } /> : (
                            <div className="detail-section">
                                <div className="head">
                                    <h2>{ t('key_line_items') || 'Line items' }</h2>
                                    <span className="helper">{ lineItems.length } { (lineItems.length === 1 ? (t('key_item') || 'item') : (t('key_items') || 'items')).toLowerCase() }</span>
                                </div>
                                <div className="body">
                            <table className="items-mini">
                                <thead>
                                    <tr>
                                        <th style={{ width: '32%' }}>{ t('key_item_type') }</th>
                                        <th>{ t('key_description') }</th>
                                        <th className="right" style={{ width: 120 }}>{ t('key_amount') }</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { lineItems.map((it, i) => (
                                        <tr key={ i }>
                                            <td className="primary">{ it.type }</td>
                                            <td>{ it.desc || <span style={{ color: 'var(--text-4)' }}>—</span> }</td>
                                            <td className="right">{ formatHK(it.amount) }</td>
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
                                                            <div className="label">{ isExchangeInvoice ? (t('key_a1_source_invoice') || 'A1 · source invoice') : `${ p.status === 10 ? t('key_exchange') : t('key_original') } ${ t('key_invoice') || 'Invoice' }` }</div>
                                                        </div>
                                                        <InvoiceStatusTag status={ p.status } />
                                                        { amt != null && <span className="amt">{ formatHK(amt) }</span> }
                                                    </div>
                                                );
                                            })() }
                                            { invoiceDetails?.childInvoices?.map((child, i) => {
                                                const isRefund = (child.invoice_type || '').includes('refund') || child.status === 8 || child.status === 9;
                                                const isUnderpayment = child.invoice_type === 'underpayment';
                                                const label = isUnderpayment
                                                    ? `${ t('key_underpayment_invoice') || 'Underpayment Invoice' } · ${ configData.invoiceStatusIdMapping[child.status]?.label || '' }`
                                                    : isRefund
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
                                                            <span className={ 'amt' + (isRefund ? ' neg' : '') }>{ isRefund ? `(${ formatHK(Math.abs(Number(amt))) })` : formatHK(Math.abs(Number(amt))) }</span>
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
                                {/* Payment actions — the reference groups; every action the Invoice API lists keeps its handler and blocked reason, and
                                   one the groups do not name stays here */}
                                { (() => {
                                    const approveAction = findAction(listedActions, APPROVE_PAYMENT_KEYS);
                                    const rejectAction = invoiceDetails?.status === 2 ? findAction(listedActions, 'mark_unsettled') : null;
                                    const otherPayment = listedActions.filter((a) => ![...APPROVE_PAYMENT_KEYS, ...GROUPED_ACTION_KEYS].includes(a.key));
                                    const has = payRemaining || doc.canUpload || doc.proof.url || approveAction || rejectAction || otherPayment.length > 0;
                                    if (!has) return null;
                                    return (
                                        <div className="group">
                                            <div className="lbl">{ t('key_payment_actions') || 'Payment actions' }</div>
                                            <div className="actions">
                                                {/* Pay Remaining Balance — the one collection action, offered by the Invoice API (v4 B-8); its modal opens
                                                   when it is pressed (reference ActionMenu) */}
                                                { payRemaining && (
                                                    <Suspense fallback={ null }>
                                                        <PayRemainingBalanceAction invoiceData={ invoiceDetails } statusLabel={ statusLabel } submitAction={ payRemainingBalance } onSuccess={ handlePaymentSuccess } />
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
                                                { actionRow(approveAction, { icon: 'check', label: t('key_approve_payment'), tone: 'primary' }) }
                                                { otherPayment.map((action) => actionRow(action, { icon: 'check' })) }
                                                { actionRow(rejectAction, { icon: 'x', label: t('key_reject_mark_unsettled') || 'Reject / Mark Unsettled', tone: 'destructive' }) }
                                            </div>
                                        </div>
                                    );
                                })() }

                                {/* Financial corrections */}
                                { (() => {
                                    const rows = [
                                        actionRow(findAction(listedActions, 'adjust'), { icon: 'edit' }),
                                        actionRow(findAction(listedActions, 'write_off'), { icon: 'edit', label: t('key_write_off') || 'Write-Off' }),
                                        actionRow(findAction(listedActions, 'revert'), { icon: 'check' }),
                                        actionRow(findAction(listedActions, 'mark_bad_debt'), { icon: 'alert', tone: 'destructive' }),
                                        invoiceDetails?.status !== 2 ? actionRow(findAction(listedActions, 'mark_unsettled'), { icon: 'alert', label: t('key_mark_unsettled') || 'Mark Unsettled', tone: 'destructive' }) : null,
                                    ].filter(Boolean);
                                    if (rows.length === 0) return null;
                                    return (
                                        <div className="group">
                                            <div className="lbl">{ t('key_financial_corrections') || 'Financial corrections' }</div>
                                            <div className="actions">{ rows }</div>
                                        </div>
                                    );
                                })() }

                                {/* Lifecycle — Refund, Exchange, Void (reference order) */}
                                { (() => {
                                    const lifecycleOpen = ![3, 4, 5, 6, 7, 8, 9, 10, 11].includes(invoiceDetails?.status) && !invoiceDetails?.parent_contract_invoice_id;
                                    /* an exchanged A1 keeps Refund and Exchange listed, blocked with the reason (reference a1_post_exchange) */
                                    const a1Ref = isA1PostExchange ? (invoiceDetails?.childInvoices || []).find((c) => c.invoice_type === 'exchange')?.invoice_number : '';
                                    const a1Blocked = isA1PostExchange ? `Blocked — this A1 has already been exchanged${ a1Ref ? ` to ${ a1Ref }` : '' }` : null;
                                    const refundReason = a1Blocked || refundBlockedReason;
                                    const showRefund = (lifecycleOpen || invoiceDetails?.status === 3 || isA1PostExchange) && (IsInvoiceRefundPermission === 'y' || isAdmin);
                                    const showExchange = (lifecycleOpen || isA1PostExchange) && invoiceDetails?.contract_number && (IsInvoiceExchangePermission === 'y' || isAdmin);
                                    const voidRow = actionRow(findAction(listedActions, 'void'), { icon: 'trash', tone: 'destructive' });
                                    if (!showRefund && !showExchange && !voidRow) return null;
                                    return (
                                        <div className="group danger">
                                            <div className="lbl">{ t('key_lifecycle') || 'Lifecycle' }</div>
                                            <div className="actions">
                                                { showRefund && <button type="button" className={ 'action-btn' + (refundReason ? ' disabled with-reason' : '') } disabled={ !!refundReason } onClick={ () => !refundReason && setOnRefundPopup(true) }><Icon name="refresh" size={14} className="ico" /><span className="label">{ t('key_refund') }</span>{ refundReason && <span className="blocked">{ refundReason }</span> }</button> }
                                                { showExchange && <button type="button" className={ 'action-btn' + (a1Blocked ? ' disabled with-reason' : '') } disabled={ !!a1Blocked } onClick={ () => !a1Blocked && setIsInitiateExchangePopup(true) }><Icon name="refresh" size={14} className="ico" /><span className="label">{ t('key_exchange') }</span>{ a1Blocked && <span className="blocked">{ a1Blocked }</span> }</button> }
                                                { voidRow }
                                            </div>
                                        </div>
                                    );
                                })() }

                                {/* Output — the customer printout preview (it downloads and prints the exchange PDF) */}
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
                                            <Suspense fallback={ null }>
                                                <ChangeCsInvoiceInsurancePopup
                                                    title={ t('key_change_invoice_cs') || 'Change Invoice CS' }
                                                    onClose={ () => setIsChangeCsPopup(false) }
                                                    entity={ { id: invoiceDetails?.id, branch_name: invoiceDetails?.branch_name, staff_name: invoiceDetails?.staff_name } }
                                                    actionType="invoice"
                                                    onCloseSubmit={ () => { setIsChangeCsPopup(false); dispatch(fetchInvoiceDetails({ invoice_id })); } }
                                                />
                                            </Suspense>
                                        ) }
                                        <button type="button" className="action-btn" onClick={ () => setActiveTab('activity') }>
                                            <Icon name="info" size={14} className="ico" /><span className="label">{ t('key_view_activity_timeline') || 'View Activity Timeline' }</span>
                                        </button>                                    </div>
                                </div>
                            </div>

                            {/* Deadline */}
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

            { isVoidPopup && <Suspense fallback={ null }><VoidWorkerCancellationPopup workerName={ invoiceDetails?.worker_name } invoiceNumber={ invoiceDetails?.invoice_number } onClose={ () => setIsVoidPopup(false) } invoiceCacellationReason={ invoiceCacellationReason } handleUpdateStatus={ (payload) => { handleUpdateStatus(payload) } } invoice_type={ invoiceDetails?.invoice_type } childInvoices={ (invoiceDetails?.childInvoices || []).find((c) => c.invoice_type === 'underpayment' && Number(c.status) !== 6) || invoiceDetails?.childInvoices?.[0] || {} } parentInvoiceNumber={ invoiceDetails?.parentInvoice?.invoice_number } isLoading={ isLoading } /></Suspense> }

            { onRefundPopup && <Suspense fallback={ null }><RefundModal onClose={ () => setOnRefundPopup(false) } invoiceData={ invoiceDetails } isContract={ true } onSuccess={ handleRefundSuccess } /></Suspense> }

            { isCommonStatusModel && APPROVAL_STATUS_IDS.includes(actionStatus) && <Suspense fallback={ null }><ApprovePaymentModal title={ actionStatus === 1 ? undefined : actionModelData?.name } afterStatusLabel={ actionStatus === 1 ? undefined : configData.invoiceStatusIdMapping[actionStatus]?.label } onClose={ () => cancelStatusModel() } onConfirm={ () => handleActionStatus() } invoiceRef={ invoiceDetails?.invoice_number || invoiceDetails?.reference_id } statusLabel={ statusLabel } proof={ doc.proof } /></Suspense> }
            { isCommonStatusModel && !APPROVAL_STATUS_IDS.includes(actionStatus) && !MARK_STATUS_IDS.includes(actionStatus) && <Suspense fallback={ null }><CommonStatusPopup cancelStatusDialog={ () => cancelStatusModel() } confirmStatusContract={ (payload) => handleActionStatus(payload) } requireReason={ needsReason(actionStatus) } showConfirmDialog={ isCommonStatusModel } title={ actionModelData?.name } message={ t('key_are_you_sure_want_to_update_status') } /></Suspense> }

            { isCommonStatusModel && MARK_STATUS_IDS.includes(actionStatus) && <Suspense fallback={ null }><MarkStatusModal kind={ actionStatus === 12 ? 'revert' : actionStatus === 7 ? 'bad_debt' : (invoiceDetails?.status === 2 ? 'reject' : 'unsettled') } title={ actionModelData?.name } proof={ doc.proof } statusLabel={ statusLabel } invoiceDetails={ invoiceDetails } onClose={ () => cancelStatusModel() } onConfirm={ (payload) => handleActionStatus(payload) } isLoading={ isLoading } /></Suspense> }

            { briefInvoice && <Suspense fallback={ null }><RelatedInvoiceBriefModal invoiceId={ briefInvoice.id } seed={ briefInvoice } onClose={ () => setBriefInvoice(null) } /></Suspense> }

            { isAdjustAmount && <Suspense fallback={ null }><AdjustAmountPopup onClose={ () => setIsAdjustAmount(false) } invoiceDetails={ invoiceDetails } handleUpdateInvoice={ (payload) => { handleUpdateInvoice(payload) } } isAdjustAmountActionType={ isAdjustAmountActionType } totalAmount={ totalAmount } isLoading={ isLoading } /></Suspense> }

            { showPrintoutModal && (
                <Suspense fallback={ null }>
                    <PrintoutPreviewModal invoiceDetails={ invoiceDetails } totalAmount={ totalAmount } onClose={ () => setShowPrintoutModal(false) } onDownloadPDF={ handleDownloadPDF } onPrint={ handlePrint } />
                </Suspense>
            ) }

            <div ref={ contentRef }>
                { isPdf && <Suspense fallback={ null }><InvoiceExchangePdfGenerator invoiceDetails={ invoiceDetails } totalAmount={ totalAmount } /></Suspense> }
                { isPrint && <Suspense fallback={ null }><InvoiceExchangePdfGenerator invoiceDetails={ invoiceDetails } totalAmount={ totalAmount } /></Suspense> }
            </div>
        </>
    );
});

/* the props withInvoiceViewGate hands the screen (InvoiceRecordGate.js) */
ExchangePaymentTypeInvoice.propTypes = {
    invoiceViewLoaded: PropTypes.bool,
    reloadInvoice: PropTypes.func,
    refreshInvoice: PropTypes.func,
};

export default ExchangePaymentTypeInvoice;