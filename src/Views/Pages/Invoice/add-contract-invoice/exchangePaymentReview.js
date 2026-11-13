import React, { useEffect, useState, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import PropTypes from "prop-types";
import { formatHK, formatHKMinus, formatDateTime, formatRelativeTime, hasPendingRefundChild, hasRefundableBalance } from "../../../../utils/utils";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from 'dayjs';
import { useTranslation } from "react-i18next";
import '../invoice.css';
import '../InvoiceDetail.css';
import '../new-ui-shared.css';
import Icon from "../../../../components/Icon/Icon";
import { fetchInvoiceDetails, fetchInvoiceActivityLogList, fetchInvoicePaymentLogList, uploadInvoicePaymentAttachment, fetchActionStatusList, saveChangeInvoiceStatus, fetchInvoiceGLobalCancellationReason, saveUpdateAdjustPaymentInvoice } from "../../../../redux/Slices/invoices/InvoicesSlice";
import { addInvoiceRemarks, fetchInvoiceRemarks } from "../../../../redux/Slices/remarks/RemarkSlice";
import configData from '../../../../components/ReusableComponents/app-configs';
import constData from "../../../../components/ReusableComponents/constants";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { payRemainingBalance } from "../../../../redux/Slices/invoices/InvoicesSlice";
import { uploadFile } from "../../../../services/commonService";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import InvoiceActivityTimeline from "../../../../components/Invoice/InvoiceActivityTimeline";
import InvoicePaymentRecords from "../../../../components/Invoice/InvoicePaymentRecords";
import InvoiceRemarks from "../../../../components/Invoice/InvoiceRemarks";
import InvoiceFollowUp from "../InvoiceFollowUp";
import { clearCurrentEmployer } from "../../../../redux/Slices/employer/EmployerSlice";
import { clearWorkerDetail } from "../../../../redux/Slices/worker/WorkerSlice";
import { getInvoiceDetailPath, getPermissionValue, isAdminUser } from "../../../../services/commonService";
import { balanceDueOf, classifiedOf } from "../invoiceBalance";

// Lazy-loaded popup components (only rendered conditionally)
const VoidWorkerCancellationPopup = lazy(() => import("../../../../components/Layout/popups/invoice-popups/VoidWorkerCancellationPopup"));
import InvoiceRelatedRef from "../../../../components/Invoice/InvoiceRelatedRef";
import SavedInvoiceLines from "./SavedInvoiceLines";
import { interpolate } from "../../../../i18n/interpolate";
import InvoiceStatusTag from "../../../../components/Invoice/InvoiceStatusTag";
import InvoiceHeaderContext from "../../../../components/Invoice/InvoiceHeaderContext";
import InvoiceRecordNotAvailable from "../../../../components/Invoice/InvoiceRecordNotAvailable";
import { PROOF_FILE_ACCEPT, checkPaymentDocumentFile, paymentMethodLabel } from "../payment-method-selector/paymentMethodCatalogue";
import { PaymentDeadlineCard, apiErrorMessage, missingDocumentRuleKey } from "../general/PaymentDocumentCard";
import { downloadDocument } from "../documentLink";
import { APPROVAL_STATUS_IDS, APPROVE_PAYMENT_KEYS, MARK_STATUS_IDS, findAction, isBlocked, needsReason } from "../invoiceActionList";
import useCanChangeInvoiceCs from "../useCanChangeInvoiceCs";
import { cameWithActionList } from "../invoiceView";
import { getInvoiceActionPermissions, paymentDocumentActions } from "../../../../utils/permissions/invoiceActionPermissionUtils";
const RelatedInvoiceBriefModal = lazy(() => import("../../../../components/Layout/popups/invoice-popups/RelatedInvoiceBriefModal"));
const ChangeCsInvoiceInsurancePopup = lazy(() => import("../../../../components/Layout/popups/change-owner/ChangeCsInvoiceInsurancePopup"));
const MarkStatusModal = lazy(() => import("../../../../components/Layout/popups/invoice-popups/MarkStatusModal"));
const ApprovePaymentModal = lazy(() => import("../../../../components/Layout/popups/invoice-popups/ApprovePaymentModal"));
const ConfirmActionModal = lazy(() => import("../general/ConfirmActionModal"));
const InitiateExchangePopup = lazy(() => import("../../../../components/Layout/popups/invoice-popups/InitiateExchangePopup"));
const PayRemainingBalanceAction = lazy(() => import("../payment-method-selector/PayRemainingBalanceModal").then((m) => ({ default: m.PayRemainingBalanceAction })));
const RefundModal = lazy(() => import("../../../../components/Layout/popups/invoice-popups/RefundModal"));
const CommonStatusPopup = lazy(() => import("../../../../components/Layout/popups/invoice-popups/CommonStatusPopup"));
const AdjustAmountPopup = lazy(() => import("./AdjustAmountPopup"));
const InvoiceContractPdfGenerator = lazy(() => import("../InvoiceContractPdfGenerator"));
const PrintoutPreviewModal = lazy(() => import("../general/PrintoutPreviewModal"));

/* Payment Records / Financial Audit History — visual intent + glyph per event type
   (mirrors the new-UI bundle's recordVisuals map) */
const PERMISSION_MAP = constData.INVOICE_ACTION_PERMISSION_MAP;

/* HK$ / date formatters — match the new-UI design bundle. */
const fmtDT = formatDateTime;

const activityLimit = constData.INVOICE_LOG_LIMIT;
const activityFirstPage = constData.INVOICE_LOG_FIRST_PAGE;
/* opened through withInvoiceViewGate (performance track A-10 … A-12): see InvoiceRecordGate.js for the props */
const ExchangePaymentReview = ({ invoiceViewLoaded = false, reloadInvoice, refreshInvoice }) => {
    const { t } = useTranslation(); // Access translations
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const contentRef = useRef();
    const [isVoidPopup, setIsVoidPopup] = useState(false);
    const [isChangeCsPopup, setIsChangeCsPopup] = useState(false);
    const canChangeInvoiceCs = useCanChangeInvoiceCs();
    const [isInitiatePopup, setIsInitiateExchangePopup] = useState(false);
    const { invoice_id } = useParams();
    const [uploadedPhoto, setUploadedPhoto] = useState({});
    const [actionStatus, setActionStatus] = useState("");
    const [actionModelData, setActionModelData] = useState("");
    const [uploadedPhotoLoading, setUploadPhotoLoading] = useState(false);
    const proofInputRef = useRef(null);
    const [isMedicalPhotoUploaded, setIsMedicalPhotoUploaded] = useState(false);
    const [onRefundPopup, setOnRefundPopup] = useState(false);
    const [isCommonStatusModel, setIsCommonStatusModel] = useState(false);
    const [briefInvoice, setBriefInvoice] = useState(null);
    const [isAdjustAmount, setIsAdjustAmount] = useState(false);
    const [isAdjustAmountActionType, setIsAdjustAmountActionType] = useState("");
    const [totalAmount, setTotalAmount] = useState(0);
    const [currentInvoiceInfo, setCurrentInvoiceInfo] = useState("");
    const [errorMessageResponse, setErrorMessageResponse] = useState("");
    const [isGenerateInvoice, setIsGenerateInvoice] = useState(false);
    const [isPdf, setIsPdf] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('summary');
    const [showPrintoutModal, setShowPrintoutModal] = useState(false);
    const [showAddRemark, setShowAddRemark] = useState(false);
    const [remarkText, setRemarkText] = useState("");
    const [remarkSaving, setRemarkSaving] = useState(false);
    const invoiceDetails = useSelector((state) => state.invoices.invoiceDetails);
    const invoiceActivityLogList = useSelector((state) => state.invoices.invoiceActivityLogList);
    const invoicePaymentLogList = useSelector((state) => state.invoices.invoicePaymentLogList);
    const actionStatusList = useSelector((state) => state.invoices.actionStatusList);
    const invoiceCacellationReason = useSelector((state) => state.invoices.invoiceCacellationReason);
    const invoiceRemarks = useSelector((state) => state.remarks.invoiceRemarks);

    const isAdmin = isAdminUser();
    const { permissionList } = useSelector((state) => state.users);
    const IsInvoiceRefundPermission = getPermissionValue(permissionList?.data, 'invoice', 'invoice_refund');
    /* PK-01 P1-19: Customer Printout, Remark and the document upload only for a holder of their keys (the contract API checks them) */
    const invoiceActions = getInvoiceActionPermissions(permissionList);

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

    /* A-10: opened on the view its gate read, the detail, both logs and the remarks are in the store. Without the view,
       everything is read as before. */
    const openedOnView = useRef(invoiceViewLoaded && Number(invoiceDetails?.id) === Number(invoice_id));
    useEffect(() => {
        if (openedOnView.current) return;
        if (invoice_id) {
            dispatch(fetchInvoiceDetails({ invoice_id })).then((response) => {
                if (response?.error?.code === "ERR_BAD_REQUEST") {
                    setErrorMessageResponse(response?.error?.message);
                } else {
                    setErrorMessageResponse("");
                }
            });
        }
        if (invoice_id) dispatch(fetchInvoiceActivityLogList({ invoice_id, limit: activityLimit, page: activityFirstPage }));
        if (invoice_id) dispatch(fetchInvoicePaymentLogList({ invoice_id, limit: activityLimit, page: activityFirstPage }));
        if (invoice_id) dispatch(fetchInvoiceRemarks({ invoice_id }));
    }, [dispatch, invoice_id]);


    const detailsRef = useRef(invoiceDetails);
    detailsRef.current = invoiceDetails;
    useEffect(() => {
        // A-12: the view carried the list read for this very detail
        if (cameWithActionList(detailsRef.current)) return;
        if (invoiceDetails?.status !== undefined && invoiceDetails?.id) {
            dispatch(fetchActionStatusList({ status: invoiceDetails.status, contract_invoices_id: invoiceDetails.id }));
        }
    }, [dispatch, invoiceDetails?.status, invoiceDetails?.id]);

    useEffect(() => {
        if (Object.keys(invoiceDetails).length !== 0 && invoiceDetails?.paymentModel && invoiceDetails.paymentModel.length > 0) {
                        let paymentMethod = paymentMethodLabel(invoiceDetails?.paymentModel[0]?.payment_method);
            let paymentDate = dayjs(invoiceDetails?.paymentModel[0]?.created_at).format('DD/MM/YYYY');
            if (invoiceDetails?.paymentModel[0]?.payment_attachment) {
                const fileName = invoiceDetails?.paymentModel[0]?.payment_attachment.split('/').pop();
                setUploadedPhoto({ ...uploadedPhoto, url: invoiceDetails?.paymentModel[0]?.payment_attachment, fileName, paymentDate, paymentMethod });
                setIsMedicalPhotoUploaded(true);
            } else {
                setUploadedPhoto({ ...uploadedPhoto, paymentMethod, paymentDate });
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
                amount = invoiceDetails.adjusted_amouts.reduce((total, adjustment) => {
                    if (adjustment.adjustment_type === 'plus') {
                        return total + adjustment.adjusted_amount;
                    } else {
                        return total - Math.abs(adjustment.adjusted_amount);
                    }
                }, amount || 0);
            }
            setCurrentInvoiceInfo({ ...invoiceDetails, final_amount: amount });
            setTotalAmount(amount);
        }

    }, [dispatch, invoiceDetails]);


    // Function to initiate PDF download
    const handleDownloadPDF = useCallback(() => {
        setIsPdf(true);
    }, []);

    // Effect to handle PDF generation after UI rendering (lazy-load heavy libs)
    useEffect(() => {
        if (isPdf && contentRef.current) {
            setIsGenerateInvoice(true);
            Promise.all([import("html2canvas"), import("jspdf")]).then(([html2canvasMod, jsPDFMod]) => {
                const html2canvas = html2canvasMod.default;
                const jsPDF = jsPDFMod.default;
                html2canvas(contentRef.current, { scale: 2 }).then((canvas) => {
                    const imgData = canvas.toDataURL("image/png");
                    const pdf = new jsPDF("p", "mm", "a4");
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                    pdf.save(`exchange-contract-invoice-${ invoiceDetails?.invoice_number }.pdf`);
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


    /* SEC-28: only a web address (http / https) is followed */
    const handleDownloadFile = useCallback(() => downloadDocument(uploadedPhoto?.url, uploadedPhoto?.fileName),
        [uploadedPhoto?.url, uploadedPhoto?.fileName]);

    const handleGotoDashboard = useCallback(() => {
        navigate(`/invoices`);
    }, [navigate]);

    /* Payment documents: PDF / JPG / PNG up to 5 MB, checked by content before upload (v4 rules C-2). Delete is only
       offered on a Pending Paid invoice (rules B-6; ruling 2026-10-12), which this screen never shows. */
    const onSubmitFile = useCallback((uploadedFileResponse) => {
        if (!uploadedFileResponse?.filename) {
            ShowToast("error", t('key_file_not_uploaded'));
            return;
        }
        dispatch(uploadInvoicePaymentAttachment({ contract_invoices_id: invoice_id, payment_attachment: uploadedFileResponse.filename })).then(res => {
            if (res?.meta?.requestStatus !== "fulfilled") {
                ShowToast("error", apiErrorMessage(res) || t('key_something_went_wrong'));
                return;
            }
            ShowToast("success", res?.payload?.message);
            dispatch(fetchInvoiceDetails({ invoice_id }));
        });
    }, [dispatch, invoice_id, t]);

    const handleFileUpload = useCallback(async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const problem = await checkPaymentDocumentFile(file);
        if (problem) {
            ShowToast("error", problem);
            return false;
        }
        try {
            setUploadPhotoLoading(true);
            const uploadedFileResponse = await uploadFile([{ file: file, name: "invoices/payment" }]);
            setUploadPhotoLoading(false);
            onSubmitFile(uploadedFileResponse);
        } catch (error) {
            setUploadPhotoLoading(false);
            ShowToast("error", error);
        }
    }, [onSubmitFile]);

    const handlePaymentSuccess = useCallback(() => {
        dispatch(clearCurrentEmployer());
        dispatch(clearWorkerDetail());
        reloadInvoice(); // A-11: the view again and the screen anew, in place of a page reload
    }, [dispatch, reloadInvoice]);

    const handleActionStatusModel = useCallback((action) => {
        const { id, key } = action;
        setActionStatus(id);
        setActionModelData({ ...action });
        if (id === 0) {
            setIsAdjustAmountActionType(key === 'write_off' ? "write_off" : "adjust_amount");
            setIsAdjustAmount(true);
        } else if (id === 6) {
            setIsVoidPopup(true);
            if (invoiceCacellationReason.length === 0)
                dispatch(fetchInvoiceGLobalCancellationReason({}));
        } else {
            setIsCommonStatusModel(true);
        }
    }, [invoiceCacellationReason, dispatch]);

    const cancelStatusModel = useCallback(() => {
        setActionStatus("");
        setIsCommonStatusModel(false);
        setActionModelData("");
    }, []);

    const handleActionStatus = useCallback((extraPayload) => {
        if (actionStatus === 6) {
            setIsVoidPopup(true);
            if (!invoiceCacellationReason)
                dispatch(fetchInvoiceGLobalCancellationReason({}));
        } else if ((actionStatus === 1 || actionStatus === 2 || actionStatus === 7 || actionStatus === 5 || actionStatus === 12 || actionStatus === 11) && invoice_id) {
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
                    //location.reload();
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
    }, [actionStatus, invoiceCacellationReason, invoice_id, invoiceDetails?.status, dispatch, t, refreshInvoice]);

    const handleUpdateStatus = useCallback((payload) => {
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

    const handleRefundSuccess = useCallback((invoiceId) => {
        setOnRefundPopup(false);
        if (invoiceId) navigate(`/invoices/add-contract-invoice/refund-invoice/` + invoiceId);
    }, [navigate]);

    /* an in-screen invoice link opens that record on its own type screen, as the list does (getInvoiceDetailPath) */
    const handleRedirect = useCallback((invoice) => navigate(getInvoiceDetailPath(invoice)), [navigate]);

    const handleSelectWorker = useCallback(() => {
        dispatch(clearWorkerDetail());
        navigate(`/invoices/exchange/select-contract-exchange`, { state: { exchangeInvoiceInfo: currentInvoiceInfo } });
    }, [dispatch, navigate, currentInvoiceInfo]);

    const handleUpdateInvoice = useCallback((payload) => {
        dispatch(saveUpdateAdjustPaymentInvoice({ invoice_id, ...payload })).then(res => {
            if (res?.payload?.status !== 400) {
                ShowToast("success", res?.payload?.message);
                reloadInvoice();
                setTotalAmount(totalAmount);
            } else {
                ShowToast("error", res?.payload?.data?.message || t('key_failed_to_update_status'));
            }
        });
    }, [dispatch, invoice_id, totalAmount, t, reloadInvoice]);

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

    const hasInvoiceDetails = useMemo(() => errorMessageResponse === "" && Object.keys(invoiceDetails).length !== 0 && invoiceDetails !== undefined, [errorMessageResponse, invoiceDetails]);

    /* ---- Derived view data (maps real invoice to the new-UI design) ---- */
    /* Pay Remaining Balance as the Invoice API offers it (v4 B-8): the amount it locked, or null — the server decides
       (Balance Due > HK$0; never on an expired Reservation Fee or a refund child) */
    const payRemaining = invoiceDetails?.payRemainingBalance || null;
    const isPaymentByCheque = invoiceDetails?.payment_method === 'cheque';
    const isPaymentByBank = invoiceDetails?.payment_method === 'bank_in' || invoiceDetails?.payment_method === 'bank_transfer';
    const isPaymentByCash = invoiceDetails?.payment_method === 'cash';
    const needsProof = (isPaymentByCheque || isPaymentByBank || isPaymentByCash) && invoiceDetails?.status !== 11;
    const documentActions = paymentDocumentActions(invoiceActions, !isPaymentByCash);

    /* Status display — the status tag takes its tone from the status id (InvoiceStatusTag): Pending Paid and the unapproved
       Exchange / Refunded statuses read orange. Display-level only. */
    let statusLabel = configData.invoiceStatusIdMapping[invoiceDetails?.status]?.label || '';
    const typeLabel = configData.invoiceTypeLabel(invoiceDetails?.invoice_type, invoiceDetails?.payment_type) || invoiceDetails?.invoice_type || (t('key_exchange') || 'Exchange');
    const methodLabel = paymentMethodLabel(invoiceDetails?.payment_method) || invoiceDetails?.payment_method || '';

    /* ---- Exchange Settlement (zero-net model, reference §16.3 / §12.1) ----
       A2 net total is always HK$0. The replacement value shows as
       "Replacement Service Value"; the A1 credit funds it. Derived entirely
       from existing invoice data — no API change. */
    const isExchangeInvoice = (invoiceDetails?.status === 10 || invoiceDetails?.status === 11) && !!invoiceDetails?.parentInvoice;
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
    /* OP-27-130 (owner 3 Nov 2026): Approve Exchange says what approving does — the A2 becomes Exchanged, its Underpayment
       invoice can then be collected, its saved credit becomes available — with no payment or proof wording */
    const liveUnderpayment = (invoiceDetails?.childInvoices || []).find((c) => c.invoice_type === 'underpayment' && Number(c.status) !== 6);
    const approveExchangeMessage = [
        interpolate(t('key_inv_approve_exchange_question'), invoiceDetails?.invoice_number),
        liveUnderpayment ? interpolate(t('key_inv_approve_exchange_child'), liveUnderpayment.invoice_number) : null,
        invoiceDetails?.exchange_type === 'overpayment_save_to_credit_balance' && xRemaining > 0 ? interpolate(t('key_inv_approve_exchange_saved_credit'), formatHK(xRemaining)) : null,
    ].filter(Boolean).join(' ');
    let xOutcome = t('key_outcome_credit_fully_applied') || 'Same-cost exchange · fully settled by credit';
    if (isShortfall) xOutcome = t('key_outcome_additional_payment_collected') || 'Additional Payment Collected';
    else if (xRemaining > 0 && refundChild) xOutcome = `${ t('key_outcome_refunded_via') || 'Refunded via' } ${ refundChild.invoice_number }`;
    else if (xRemaining > 0 && hasWriteOff) xOutcome = t('key_outcome_written_off') || 'Written Off';
    else if (xRemaining > 0) xOutcome = t('key_outcome_saved_as_credit') || 'Saved as Credit';

    /* §9: any unapproved A2 Exchange shows a 30-day Management Approval Deadline. */
    const mgmtApprovalDue = invoiceDetails?.status === 10 && invoiceDetails?.created_at ? dayjs(invoiceDetails.created_at).add(30, 'day') : null;

    /* Financial summary figures (fallback when not an exchange settlement) */
    const fsTotal = Number(invoiceDetails?.status === 6 ? 0 : (invoiceDetails?.total_amount || 0));
    const fsDiscount = Number(invoiceDetails?.total_discount || 0);
    const fsCredit = Number(invoiceDetails?.total_credit || 0);
    const fsPaid = Number(invoiceDetails?.paid_amount || 0);
    const fsRefunded = Number(invoiceDetails?.refund_amount || 0);
    const fsAdjust = (invoiceDetails?.adjusted_amouts || []).reduce((s, a) => a.adjustment_type === 'plus' ? s + Number(a.adjusted_amount) : s - Math.abs(Number(a.adjusted_amount)), 0);
    /* Balance Due and its classified parts from the read model (QA-27-040; #61 / #62) */
    const fsBalance = balanceDueOf(invoiceDetails);
    const fsClassified = classifiedOf(invoiceDetails);
    const balanceIntent = fsBalance <= 0 ? 'success' : (invoiceDetails?.status === 5 || invoiceDetails?.status === 7) ? 'danger' : 'warning';

    const relTime = formatRelativeTime;

    const relatedCount = (invoiceDetails?.parentInvoice ? 1 : 0) + (invoiceDetails?.childInvoices?.length || 0);
    const helpIco = (tip) => (<span className="help-ico tt"><Icon name="info" size={ 11 } /><span className="tt-bubble" role="tooltip">{ tip }</span></span>);
    const lineItems = (invoiceDetails?.contractInvoiceItemSelectModel || []).map(it => ({ type: it.item_name, desc: it.item_model_name, amount: it.amount }));


    return (
        <>
            <div className="invd">
                { hasInvoiceDetails && (
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
                                <button className="copy" title="Copy reference" aria-label="Copy reference" onClick={ () => navigator.clipboard?.writeText(invoiceDetails?.invoice_number || '') }><Icon name="copy" size={ 12 } /></button>

                                <div className="actions">
                                    <InvoiceFollowUp invoice={ invoiceDetails } />
                                    { invoiceActions.canPrintCustomerPrintout && <button className="btn btn-secondary md" disabled={ isGenerateInvoice } onClick={ () => setShowPrintoutModal(true) }><Icon name="download" size={ 13 } />{ t('key_customer_printout') || 'Customer Printout' }</button> }
                                    { invoiceActions.canRemark && <button className="btn btn-secondary md" onClick={ () => setShowAddRemark(true) }><Icon name="msg" size={ 13 } />{ t('key_remark') || 'Remark' }</button> }
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
                                        <span className="v plain" style={ { display: 'inline-flex', alignItems: 'center', gap: 4 } }>
                                            { methodLabel }
                                            { invoiceDetails?.status === 1 && <span style={ { color: 'var(--st-success)', fontWeight: 600 } } aria-label="Payment confirmed">✓</span> }
                                        </span>
                                    </div>
                                </> }
                            </div>

                            {/* Banner — Remaining Credit (surplus) / Additional payment (shortfall) */}
                            { isExchangeInvoice && isShortfall && (
                                <div className="admin-warning attention">
                                    <span className="ico"><Icon name="info" size={ 18 } /></span>
                                    <div className="body">
                                        <div className="title">{ t('key_additional_payment_via_underpayment') || 'Additional payment via Underpayment Invoice' }</div>
                                        <div className="desc">{ t('key_additional_payment_via_underpayment_desc') || 'A2 Total exceeds the A1 credit. The additional amount is collected through a child Underpayment Invoice. A2 itself stays Exchanged.' }</div>
                                    </div>
                                </div>
                            ) }
                            { isExchangeInvoice && !xRecord && !isShortfall && xRemaining > 0 && (
                                <div className="admin-warning attention">
                                    <span className="ico"><Icon name="info" size={ 18 } /></span>
                                    <div className="body">
                                        <div className="title">{ t('key_remaining_credit') || 'Remaining Credit' }</div>
                                        <div className="desc">{ t('key_remaining_credit_desc') || 'A1 credit is higher than the A2 Total. Choose how to handle the remaining credit: Refund Remaining Credit, Write Off Remaining Credit, or Save as Credit.' }</div>
                                    </div>
                                </div>
                            ) }

                            {/* Header context cards */}
                            <InvoiceHeaderContext invoice={ invoiceDetails } />
                        </div>

                        { isInitiatePopup && <Suspense fallback={ null }><InitiateExchangePopup onClose={ () => setIsInitiateExchangePopup(false) } onSelectWorker={ handleSelectWorker } invoiceData={ invoiceDetails } /></Suspense> }

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
                                            <div className="head"><h2>{ isExchangeInvoice ? (t('key_exchange_settlement_summary') || 'Exchange Settlement Summary') : (t('key_financial_summary') || 'Financial Summary') }</h2></div>
                                            <div className="body">
                                                { isExchangeInvoice ? (
                                                    /* Exchange Settlement — dedicated A2 block (zero-net model, reference §16.3) */
                                                    <div className="exchange-summary">
                                                        <div className="fs-grid">
                                                            <div className="fs-row">
                                                                <div className="label">{ t('key_original_invoice') || 'Original Invoice' }</div>
                                                                <div className="v"><span style={ { fontFamily: 'var(--mono)', cursor: 'pointer' } } onClick={ () => handleRedirect(xParent) }>{ xParent?.invoice_number }</span></div>
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
                                                                            <div className="v"><span style={ { fontFamily: 'var(--mono)', cursor: 'pointer' } } onClick={ () => handleRedirect(underpaymentChild) }>{ underpaymentChild.invoice_number }</span></div>
                                                                        </div>
                                                                    ) }
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
                                                            ) }
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
                                                            <span className="ico"><Icon name="info" size={ 12 } /></span>
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
                                                        ) }
                                                        { fsCredit > 0 && (
                                                            <div className="fs-row adj-neg">
                                                                <div className="label">{ t('key_applied_credits') || 'Applied Credit' }{ helpIco('Employer credit applied to this invoice as a discount.') }</div>
                                                                <div className="v">-{ formatHK(fsCredit) }</div>
                                                            </div>
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
                                                ) }
                                                { (invoiceDetails?.status === 5 || invoiceDetails?.status === 7) && (
                                                    <div className="fs-caption">
                                                        The <span className="em">{ formatHK(fsBalance) } Balance Due</span> is currently classified as <span className="em">{ invoiceDetails?.status === 7 ? 'Bad Debt' : 'Unsettled' }</span>. Unsettled and Bad Debt are classifications of unresolved amounts — not additional charges on top of the same Balance Due.
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
                                                                <th style={ { width: '32%' } }>{ t('key_item_type') || 'Item type' }</th>
                                                                <th>{ t('key_description') || 'Description' }</th>
                                                                <th className="right" style={ { width: 120 } }>{ t('key_amount') || 'Amount' }</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            { lineItems.map((it, i) => (
                                                                <tr key={ i }>
                                                                    <td className="primary">{ it.type }</td>
                                                                    <td>{ it.desc || <span style={ { color: 'var(--text-4)' } }>—</span> }</td>
                                                                    <td className="right">{ formatHK(it.amount) }</td>
                                                                </tr>
                                                            )) }
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) }
                                    </>
                                ) }

                                { activeTab === 'records' && (
                                    <InvoicePaymentRecords invoiceId={ invoice_id } />
                                ) }

                                { activeTab === 'activity' && (
                                    <InvoiceActivityTimeline invoiceId={ invoice_id } />
                                ) }

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
                                                                    <div className="label">{ t('key_a1_source_invoice') || 'A1 · source invoice' }</div>
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
                                                                ) }
                                                            </div>
                                                        );
                                                    }) }
                                                </div>
                                            }
                                        </div>
                                    </div>
                                ) }

                                { activeTab === 'remarks' && (
                                    <InvoiceRemarks invoiceId={ invoice_id } />
                                ) }
                            </div>

                            {/* ===== SIDE STACK ===== */}
                            <aside className="side-stack">
                                <div className="action-card">
                                    {/* Payment actions — Approve Exchange is the page primary on unapproved A2 */}
                                    { (() => {
                                        /* the Invoice API lists a blocked action with its reason (decision AA-06) */
                                        const approveExchangeAction = findAction(actionStatusCustomList, 'approve_exchange');
                                        const approvePaymentAction = findAction(actionStatusCustomList, APPROVE_PAYMENT_KEYS);
                                        if (!payRemaining && !approveExchangeAction && !approvePaymentAction) return null;
                                        return (
                                            <div className="group">
                                                <div className="lbl">{ t('key_payment_actions') || 'Payment actions' }</div>
                                                <div className="actions">
                                                    {/* Pay Remaining Balance — the one collection action, offered by the Invoice API (v4 B-8); its modal
                                                       opens when it is pressed (reference ActionMenu) */}
                                                    { payRemaining && (
                                                        <Suspense fallback={ null }>
                                                            <PayRemainingBalanceAction invoiceData={ invoiceDetails } statusLabel={ statusLabel } submitAction={ payRemainingBalance } onSuccess={ handlePaymentSuccess } />
                                                        </Suspense>
                                                    ) }
                                                    { approveExchangeAction && (
                                                        <button type="button" className="action-btn primary" onClick={ () => handleActionStatusModel(approveExchangeAction) }>
                                                            <Icon name="check" size={ 14 } className="ico" /><span className="label">{ approveExchangeAction.name }</span>
                                                        </button>
                                                    ) }
                                                    { approvePaymentAction && (
                                                        <button type="button" className={ 'action-btn' + (isBlocked(approvePaymentAction) ? ' disabled with-reason' : ' primary') } disabled={ isBlocked(approvePaymentAction) } onClick={ () => !isBlocked(approvePaymentAction) && handleActionStatusModel(approvePaymentAction) }>
                                                            <Icon name="check" size={ 14 } className="ico" /><span className="label">{ t('key_approve_payment') }</span>
                                                            { isBlocked(approvePaymentAction) && <span className="blocked">{ approvePaymentAction.reason }</span> }
                                                        </button>
                                                    ) }
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
                                        const unsettledAction = findAction(actionStatusCustomList, 'mark_unsettled');
                                        if (!adjustAction && !writeOffAction && !badDebtAction && !revertAction && !unsettledAction) return null;
                                        return (
                                            <div className="group">
                                                <div className="lbl">{ t('key_financial_corrections') || 'Financial corrections' }</div>
                                                <div className="actions">
                                                    { adjustAction && (
                                                        <button type="button" className={ 'action-btn' + (isBlocked(adjustAction) ? ' disabled with-reason' : '') } disabled={ isBlocked(adjustAction) } onClick={ () => !isBlocked(adjustAction) && handleActionStatusModel(adjustAction) }>
                                                            <Icon name="edit" size={ 14 } className="ico" /><span className="label">{ adjustAction.name }</span>
                                                            { isBlocked(adjustAction) && <span className="blocked">{ adjustAction.reason }</span> }
                                                        </button>
                                                    ) }
                                                    { writeOffAction && (
                                                        <button type="button" className={ 'action-btn' + (isBlocked(writeOffAction) ? ' disabled with-reason' : '') } disabled={ isBlocked(writeOffAction) } onClick={ () => !isBlocked(writeOffAction) && handleActionStatusModel(writeOffAction) }>
                                                            <Icon name="edit" size={ 14 } className="ico" /><span className="label">{ t('key_write_off') || 'Write-Off' }</span>
                                                            { isBlocked(writeOffAction) && <span className="blocked">{ writeOffAction.reason }</span> }
                                                        </button>
                                                    ) }
                                                    { revertAction && (
                                                        <button type="button" className="action-btn" onClick={ () => handleActionStatusModel(revertAction) }>
                                                            <Icon name="check" size={ 14 } className="ico" /><span className="label">{ revertAction.name }</span>
                                                        </button>
                                                    ) }
                                                    { badDebtAction && (
                                                        <button type="button" className="action-btn destructive" onClick={ () => handleActionStatusModel(badDebtAction) }>
                                                            <Icon name="alert" size={ 14 } className="ico" /><span className="label">{ badDebtAction.name }</span>
                                                        </button>
                                                    ) }
                                                    { unsettledAction && (
                                                        <button type="button" className="action-btn destructive" onClick={ () => handleActionStatusModel(unsettledAction) }>
                                                            <Icon name="alert" size={ 14 } className="ico" /><span className="label">{ t('key_mark_unsettled') || 'Mark Unsettled' }</span>
                                                        </button>
                                                    ) }
                                                </div>
                                            </div>
                                        );
                                    })() }

                                    {/* Lifecycle — A2 settles via A1 credit, refunds occur on A1 (reference §7.1) */}
                                    { invoiceDetails?.status !== 6 && (() => {
                                        const voidAction = findAction(actionStatusCustomList, 'void');
                                        /* Refund needs a refundable balance above HK$0 (the Invoice API's figure; 10 Oct register #20) and no
                                           refund awaiting approval */
                                        const mayRefund = invoiceDetails?.status === 3 && (IsInvoiceRefundPermission === 'y' || isAdmin);
                                        const canRefund = mayRefund && hasRefundableBalance(invoiceDetails) && !hasPendingRefundChild(invoiceDetails);
                                        /* no Refund on an exchange invoice: a status that never allows an action hides it (decision AA-06) */
                                        const showBlockedRefund = mayRefund && (IsInvoiceRefundPermission === 'y' || isAdmin);
                                        const blockedRefundReason = mayRefund && hasRefundableBalance(invoiceDetails)
                                            ? (t('key_blocked_refund_pending') || 'Blocked — refund pending approval on this invoice')
                                            : (t('key_blocked_no_refundable_value') || 'Blocked — no refundable value remains');
                                        if (!voidAction && !canRefund && !showBlockedRefund) return null;
                                        return (
                                            <div className="group danger">
                                                <div className="lbl">{ t('key_lifecycle') || 'Lifecycle' }</div>
                                                <div className="actions">
                                                    { canRefund && (
                                                        <button type="button" className="action-btn" onClick={ () => setOnRefundPopup(true) }>
                                                            <Icon name="refresh" size={ 14 } className="ico" /><span className="label">{ t('key_refund') }</span>
                                                        </button>
                                                    ) }
                                                    { !canRefund && showBlockedRefund && (
                                                        <button type="button" className="action-btn disabled with-reason" disabled>
                                                            <Icon name="refresh" size={ 14 } className="ico" /><span className="label">{ t('key_refund') }</span>
                                                            <span className="blocked">{ blockedRefundReason }</span>
                                                        </button>
                                                    ) }
                                                    { voidAction && (
                                                        <button type="button" className={ 'action-btn destructive' + (isBlocked(voidAction) ? ' disabled with-reason' : '') } disabled={ isBlocked(voidAction) } onClick={ () => !isBlocked(voidAction) && handleActionStatusModel(voidAction) }>
                                                            <Icon name="trash" size={ 14 } className="ico" /><span className="label">{ voidAction.name }</span>
                                                            { isBlocked(voidAction) && <span className="blocked">{ voidAction.reason }</span> }
                                                        </button>
                                                    ) }
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
                                                <Icon name="download" size={ 14 } className="ico" /><span className="label">{ isGenerateInvoice ? (t('key_generating_pdf') || 'Generating PDF…') : (t('key_print_download_customer_printout') || 'Print / Download Customer Printout') }</span>
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
                                                <Icon name="user" size={ 14 } className="ico" /><span className="label">{ t('key_change_invoice_cs') || 'Change Invoice CS' }</span>
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
                                                <Icon name="info" size={ 14 } className="ico" /><span className="label">{ t('key_view_activity_timeline') || 'View Activity Timeline' }</span>
                                            </button>                                        </div>
                                    </div>
                                </div>

                                {/* Management Approval Deadline — any unapproved A2 Exchange (reference §9) */}
                                { mgmtApprovalDue && (
                                    <div className={ 'deadline-side ' + (mgmtApprovalDue.isBefore(dayjs()) ? 'danger' : 'warning') }>
                                        <div className="head-row"><Icon name="calendar" size={ 12 } /><span>{ t('key_management_approval_deadline') || 'Management Approval Deadline' }</span></div>
                                        <div className="when">{ fmtDT(mgmtApprovalDue) }</div>
                                        <div className="relative">{ mgmtApprovalDue.isBefore(dayjs()) ? (t('key_overdue') || 'Overdue') : relTime(mgmtApprovalDue) }</div>
                                        <div className="hint">{ t('key_mgmt_approval_deadline_hint') || '30 days after proof upload' }</div>
                                    </div>
                                ) }

                                {/* what is due on the payment and by when — the deadline stored when its timer started (v4 B-5) */}
                                <PaymentDeadlineCard deadline={ invoiceDetails?.paymentDeadline || null } />

                                {/* Proof upload / view */}
                                { needsProof && (
                                    <div className="context-side">
                                        <div className="head-row"><Icon name="paperclip" size={ 12 } /><span>{ isPaymentByCash ? (t('key_deposit_receipt') || 'Deposit receipt') : (t('key_payment_proof') || 'Payment proof') }</span></div>
                                        { isMedicalPhotoUploaded && uploadedPhoto?.url ? (
                                            <>
                                                <div className="proof-pill">
                                                    <span className="ico"><Icon name="filetext" size={ 14 } /></span>
                                                    <div className="meta"><div className="name">{ uploadedPhoto.filename || uploadedPhoto.fileName || 'receipt' }</div><div className="sub">{ t('key_uploaded') }</div></div>
                                                    <Icon name="check" size={ 14 } style={ { color: 'var(--st-success)' } } />
                                                </div>
                                                <div className="proof-actions mt-2">
                                                    <button className="btn btn-secondary sm" onClick={ handleDownloadFile }><Icon name="eye" size={ 12 } />{ t('key_view') }</button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* missing: the red title, the deadline rule (v4 B-5: Cash 48 h; Bank Transfer, FPS, Cheque and PayMe are
                                                    recorded with their proof, U-0233) and the upload button — reference ProofSide */}
                                                <div style={ { fontSize: 12.5, color: 'var(--st-danger)', fontWeight: 600, marginBottom: 4 } }>{ isPaymentByCash ? t('key_deposit_receipt_missing') : t('key_payment_proof_missing') }</div>
                                                { missingDocumentRuleKey(invoiceDetails?.payment_method) && (
                                                    <div style={ { fontSize: 11.5, color: 'var(--text-3)', marginBottom: 10 } }>{ t(missingDocumentRuleKey(invoiceDetails?.payment_method)) }</div>
                                                ) }
                                                { uploadedPhotoLoading && <CustomSpinner /> }
                                                <input ref={ proofInputRef } type="file" accept={ PROOF_FILE_ACCEPT } onChange={ handleFileUpload } hidden />
                                                {/* PK-01 P1-19: a deposit receipt under Pay Remaining Balance; a proof also needs the upload token */}
                                                { documentActions.canUpload && (
                                                <button type="button" className="btn btn-primary sm" onClick={ () => proofInputRef.current?.click() } disabled={ uploadedPhotoLoading }>
                                                    <Icon name="upload" size={ 12 } />{ isPaymentByCash ? t('key_upload_deposit_receipt') : t('key_upload_payment_proof') }
                                                </button>
                                                ) }
                                            </>
                                        ) }
                                    </div>
                                ) }
                            </aside>
                        </div>
                    </>
                ) }

                { errorMessageResponse?.trim() && <InvoiceRecordNotAvailable message={ errorMessageResponse } /> }

                {/* Add Remark modal */}
                { showAddRemark && (
                    <div className="modal-veil" onClick={ () => !remarkSaving && setShowAddRemark(false) }>
                        <div className="modal-card action-modal-card" onClick={ e => e.stopPropagation() } role="dialog" aria-modal="true">
                            <div className="head">
                                <span className="ico" style={ { background: 'var(--accent-bg)', color: 'var(--accent)' } }><Icon name="msg" size={ 18 } /></span>
                                <div style={ { flex: 1 } }>
                                    <h2>{ t('key_add_remark') || 'Add Remark' }</h2>
                                    <div className="msub">{ t('key_remarks_context_note') || 'Remarks are separate from action reasons. They live with the invoice as context.' }</div>
                                </div>
                            </div>
                            <div className="body">
                                <div className="field">
                                    <label>{ t('key_remark') || 'Remark' }</label>
                                    <textarea className="input" rows={ 4 } style={ { height: 'auto', padding: 10, resize: 'vertical' } } maxLength={ 500 } placeholder={ t('key_remark_placeholder') || 'Context, follow-up, employer notes…' } value={ remarkText } onChange={ e => setRemarkText(e.target.value) } />
                                </div>
                            </div>
                            <div className="foot">
                                <button className="btn btn-ghost md" onClick={ () => setShowAddRemark(false) } disabled={ remarkSaving }>{ t('key_cancel') || 'Cancel' }</button>
                                <button className="btn btn-primary md" onClick={ handleSaveRemark } disabled={ remarkSaving }><Icon name="check" size={ 13 } />{ remarkSaving ? (t('key_saving') || 'Saving…') : (t('key_save_remark') || 'Save remark') }</button>
                            </div>
                        </div>
                    </div>
                ) }
            </div>

            <Suspense fallback={ null }>
                { isVoidPopup && <VoidWorkerCancellationPopup workerName={ invoiceDetails?.worker_name } invoiceNumber={ invoiceDetails?.invoice_number } onClose={ () => setIsVoidPopup(false) } invoiceCacellationReason={ invoiceCacellationReason } handleUpdateStatus={ handleUpdateStatus } invoice_type={ invoiceDetails?.invoice_type } childInvoices={ (invoiceDetails?.childInvoices || []).find((c) => c.invoice_type === 'underpayment' && Number(c.status) !== 6) || invoiceDetails?.childInvoices?.[0] || {} } parentInvoiceNumber={ invoiceDetails?.parentInvoice?.invoice_number } isLoading={ isLoading } /> }

                { onRefundPopup && <Suspense fallback={ null }><RefundModal onClose={ () => setOnRefundPopup(false) } invoiceData={ invoiceDetails } isContract={ true } onSuccess={ handleRefundSuccess } /></Suspense> }

                { isCommonStatusModel && !APPROVAL_STATUS_IDS.includes(actionStatus) && !MARK_STATUS_IDS.includes(actionStatus) && <CommonStatusPopup cancelStatusDialog={ cancelStatusModel } confirmStatusContract={ (payload) => handleActionStatus(payload) } requireReason={ needsReason(actionStatus) } showConfirmDialog={ isCommonStatusModel } title={ actionModelData?.name } message={ t('key_are_you_sure_want_to_update_status') } /> }

                { isCommonStatusModel && actionStatus === 11 && <Suspense fallback={ null }><ConfirmActionModal icon="check" title={ actionModelData?.name } confirmLabel={ actionModelData?.name } message={ approveExchangeMessage } loading={ isLoading } onClose={ () => cancelStatusModel() } onConfirm={ () => handleActionStatus() } /></Suspense> }
                { isCommonStatusModel && APPROVAL_STATUS_IDS.includes(actionStatus) && actionStatus !== 11 && <Suspense fallback={ null }><ApprovePaymentModal title={ actionStatus === 1 ? undefined : actionModelData?.name } afterStatusLabel={ actionStatus === 1 ? undefined : configData.invoiceStatusIdMapping[actionStatus]?.label } onClose={ () => cancelStatusModel() } onConfirm={ () => handleActionStatus() } loading={ isLoading } invoiceRef={ invoiceDetails?.invoice_number || invoiceDetails?.reference_id } statusLabel={ statusLabel } proof={ uploadedPhoto } /></Suspense> }

                { isCommonStatusModel && MARK_STATUS_IDS.includes(actionStatus) && <Suspense fallback={ null }><MarkStatusModal kind={ actionStatus === 12 ? 'revert' : actionStatus === 7 ? 'bad_debt' : 'unsettled' } title={ actionModelData?.name } invoiceDetails={ invoiceDetails } onClose={ () => cancelStatusModel() } onConfirm={ (payload) => handleActionStatus(payload) } isLoading={ isLoading } /></Suspense> }

                { briefInvoice && <Suspense fallback={ null }><RelatedInvoiceBriefModal invoiceId={ briefInvoice.id } seed={ briefInvoice } onClose={ () => setBriefInvoice(null) } /></Suspense> }

                { isAdjustAmount && <AdjustAmountPopup onClose={ () => setIsAdjustAmount(false) } invoiceDetails={ invoiceDetails } handleUpdateInvoice={ handleUpdateInvoice } isAdjustAmountActionType={ isAdjustAmountActionType } /> }

                { showPrintoutModal && (
                    <PrintoutPreviewModal invoiceDetails={ invoiceDetails } totalAmount={ totalAmount } onClose={ () => setShowPrintoutModal(false) } onDownloadPDF={ handleDownloadPDF } onPrint={ handleDownloadPDF } />
                ) }

            </Suspense>

            <div ref={ contentRef }>
                <Suspense fallback={ null }>
                    { isPdf && <InvoiceContractPdfGenerator invoiceDetails={ invoiceDetails } totalAmount={ totalAmount } /> }
                </Suspense>
            </div>
        </ >
    );
};

/* the props withInvoiceViewGate hands the screen (InvoiceRecordGate.js) */
ExchangePaymentReview.propTypes = {
    invoiceViewLoaded: PropTypes.bool,
    reloadInvoice: PropTypes.func,
    refreshInvoice: PropTypes.func,
};

export default React.memo(ExchangePaymentReview);
