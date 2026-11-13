import { formatHK, formatHKMinus } from "../../../../utils/utils";
import React, {
    useEffect,
    useState,
    useRef,
    lazy,
    Suspense,
    useCallback,
    useMemo,
} from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from 'dayjs';
import { useTranslation } from "react-i18next";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { uploadFile } from "../../../../services/commonService";
import configData from '../../../../components/ReusableComponents/app-configs';
import constData from "../../../../components/ReusableComponents/constants";
import Icon from "../../../../components/Icon/Icon";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { PrintInvoiceTemplate } from "../../../../components/Invoice/PrintInvoiceTemplate";
import InvoiceActivityTimeline from "../../../../components/Invoice/InvoiceActivityTimeline";
import InvoicePaymentRecords from "../../../../components/Invoice/InvoicePaymentRecords";
import InvoiceRemarks from "../../../../components/Invoice/InvoiceRemarks";
import InvoiceFollowUp from "../InvoiceFollowUp";
import '../invoice.css';
import "../InvoiceDetail.css";
import "../new-ui-shared.css";
import {
    fetchInvoiceDetails,
    fetchInvoiceActivityLogList,
    fetchInvoicePaymentLogList,
    uploadInvoicePaymentAttachment,
    fetchActionStatusList,
    saveChangeInvoiceStatus,
    saveUpdateAdjustPaymentInvoice,
    fetchInvoiceGLobalCancellationReason
} from "../../../../redux/Slices/invoices/InvoicesSlice";
import { addInvoiceRemarks, fetchInvoiceRemarks } from "../../../../redux/Slices/remarks/RemarkSlice";

// ─── Lazy-loaded components ──────────────────────────────────────────────────
const VoidWorkerCancellationPopup = lazy(() => import("../../../../components/Layout/popups/invoice-popups/VoidWorkerCancellationPopup"));
import InvoiceRelatedRef from "../../../../components/Invoice/InvoiceRelatedRef";
import InvoiceStatusTag from "../../../../components/Invoice/InvoiceStatusTag";
import InvoiceHeaderContext from "../../../../components/Invoice/InvoiceHeaderContext";
import InvoiceRecordNotAvailable from "../../../../components/Invoice/InvoiceRecordNotAvailable";
import { PROOF_FILE_ACCEPT, checkPaymentDocumentFile, paymentMethodLabel } from "../payment-method-selector/paymentMethodCatalogue";
import { apiErrorMessage } from "./PaymentDocumentCard";
import { downloadDocument } from "../documentLink";
import { MARK_STATUS_IDS, findAction, isBlocked, needsReason } from "../invoiceActionList";
import useCanChangeInvoiceCs from "../useCanChangeInvoiceCs";
import { cameWithActionList } from "../invoiceView";
import { getInvoiceActionPermissions } from "../../../../utils/permissions/invoiceActionPermissionUtils";
const RelatedInvoiceBriefModal = lazy(() => import("../../../../components/Layout/popups/invoice-popups/RelatedInvoiceBriefModal"));
const ChangeCsInvoiceInsurancePopup = lazy(() => import("../../../../components/Layout/popups/change-owner/ChangeCsInvoiceInsurancePopup"));
const MarkStatusModal = lazy(() => import("../../../../components/Layout/popups/invoice-popups/MarkStatusModal"));
const CommonStatusPopup = lazy(() => import("../../../../components/Layout/popups/invoice-popups/CommonStatusPopup"));
const ApprovePaymentModal = lazy(() => import("../../../../components/Layout/popups/invoice-popups/ApprovePaymentModal"));
const AdjustAmountPopup = lazy(() => import("./AdjustAmountPopup"));
const InvoiceRefundPdfGenerator = lazy(() =>
    import("../InvoiceRefundPdfGenerator")
);
const InvoiceRefundPdfPrint = lazy(() =>
    import("../InvoiceRefundPdfPrint")
);
const PrintoutPreviewModal = lazy(() => import("./PrintoutPreviewModal"));

/* HK$ / date formatters — match the new-UI design bundle. */

const limit = constData.INVOICE_LOG_LIMIT;
const page = constData.INVOICE_LOG_FIRST_PAGE;
/* the refund child's correction actions, in the reference order (Financial corrections) */
const REFUND_CORRECTION_KEYS = ['revert', 'mark_bad_debt', 'mark_unsettled'];
/* opened through withInvoiceViewGate (performance track A-10 … A-12): see InvoiceRecordGate.js for the props */
const RefundInvoice = ({ invoiceViewLoaded = false, reloadInvoice, refreshInvoice }) => {
    const { t } = useTranslation(); // Access translations
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const contentRef = useRef();
    const refundDocInputRef = useRef(null);
    const [isVoidPopup, setIsVoidPopup] = useState(false);
    const [isChangeCsPopup, setIsChangeCsPopup] = useState(false);
    const canChangeInvoiceCs = useCanChangeInvoiceCs();
    const { invoice_id } = useParams();
    const [uploadedPhoto, setUploadedPhoto] = useState({});
    const [actionStatus, setActionStatus] = useState("");
    const [actionModelData, setActionModelData] = useState("");
    const [uploadedPhotoLoading, setUploadPhotoLoading] = useState(false);
    const [isMedicalPhotoUploaded, setIsMedicalPhotoUploaded] = useState(false);
    const [isCommonStatusModel, setIsCommonStatusModel] = useState(false);
    const [isAdjustAmountActionType, setIsAdjustAmountActionType] = useState("");
    const [isAdjustAmount, setIsAdjustAmount] = useState(false);
    const [briefInvoice, setBriefInvoice] = useState(null);
    const [isGenerateInvoice, setIsGenerateInvoice] = useState(false);
    const [isPdf, setIsPdf] = useState(false);
    const [isPrint, setIsPrint] = useState(false);
    const [activeTab, setActiveTab] = useState('summary');
    const [showPrintoutModal, setShowPrintoutModal] = useState(false);
    const [showAddRemark, setShowAddRemark] = useState(false);
    const [remarkText, setRemarkText] = useState("");
    const [remarkSaving, setRemarkSaving] = useState(false);
    const [errorMessageResponse, setErrorMessageResponse] = useState("");
    const { invoiceDetails, invoiceActivityLogList, invoicePaymentLogList, actionStatusList, invoiceCacellationReason } = useSelector((state) => ({
        invoiceDetails: state.invoices.invoiceDetails,
        invoiceActivityLogList: state.invoices.invoiceActivityLogList,
        invoicePaymentLogList: state.invoices.invoicePaymentLogList,
        actionStatusList: state.invoices.actionStatusList,
        invoiceCacellationReason: state.invoices.invoiceCacellationReason,
    }), shallowEqual);
    const invoiceRemarks = useSelector((state) => state.remarks.invoiceRemarks);
    const permissionList = useSelector((state) => state.users?.permissionList);
    /* PK-01 P1-19: Customer Printout, Remark and the refund documentation upload (Pay Remaining Balance) only for a holder of their keys */
    const invoiceActions = getInvoiceActionPermissions(permissionList);
    // A company-cheque refund needs its cheque documentation before "Approve Refund" (v4 B-10; the Invoice API's refundRoute —
    // the route the refund takes, not the method the original payment used)
    const uploadRequired = invoiceDetails?.refundRoute === "cheque";

    /* A-10: opened on the view its gate read, the detail, both logs and the remarks are in the store. Without the view,
       everything is read as before. */
    const openedOnView = useRef(invoiceViewLoaded && Number(invoiceDetails?.id) === Number(invoice_id));
    useEffect(() => {
        if (openedOnView.current) return;
        if (invoice_id) dispatch(fetchInvoiceDetails({ invoice_id })).then((response) => {
            if (response?.error?.code === "ERR_BAD_REQUEST") setErrorMessageResponse(response?.error?.message);
            else setErrorMessageResponse("");
        });
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
        dispatch(fetchActionStatusList({ status: invoiceDetails.status, contract_invoices_id: invoiceDetails.id }));
    }, [dispatch, invoiceDetails, invoice_id]);

    useEffect(() => {
        if (invoiceDetails && invoiceDetails?.paymentModel && invoiceDetails.paymentModel.length > 0) {
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

    const parentTotalAmount = useMemo(() => {
        return Math.abs(invoiceDetails?.parentInvoice?.final_amount ?? 0);
    }, [invoiceDetails?.parentInvoice?.final_amount]);

    const totalAmount = useMemo(
        () => Math.abs(invoiceDetails?.total ?? 0),
        [invoiceDetails?.total]
    );

    // Function to initiate PDF download
    const handleDownloadPDF = () => {
        setIsPdf(true);
    };
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
                html2canvas(contentRef.current, { scale: 2 }).then((canvas) => {
                    const imgData = canvas.toDataURL("image/png", 0.7);
                    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
                    // Calculate width/height ratio to fit A4
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
                    pdf.save(`refund-general-invoice-${ invoiceDetails?.invoice_number }.pdf`);
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

    /* SEC-28: only a web address (http / https) is followed */
    const handleDownloadFile = () => downloadDocument(uploadedPhoto?.url, uploadedPhoto?.fileName);

    const handleGotoDashboard = () => {
        navigate(`/invoices`);
    }

    /* Refund documentation: PDF / JPG / PNG up to 5 MB, checked by content before upload (v4 rules C-2) */
    const onSubmitFile = (uploadedFileResponse) => {
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
    }

    const handleFileUpload = async (event) => {
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
    };

    const handleActionStatusModel = (action) => {
        const { id, key } = action;

        setActionStatus(id);
        setActionModelData({ ...action });
        // Adjust Amount / Write-Off (id 0) open the adjustment popup, as on the Contract refund screen.
        // Void (id 6) goes straight to the worker-cancellation popup — skip the
        // generic confirm so the two dialogs don't stack on top of each other.
        if (id === 0) {
            setIsAdjustAmountActionType(key === "write_off" ? "write_off" : "adjust_amount");
            setIsAdjustAmount(true);
        } else if (id === 6) {
            setIsVoidPopup(true);
            if (!invoiceCacellationReason) dispatch(fetchInvoiceGLobalCancellationReason({}));
        } else {
            setIsCommonStatusModel(true);
        }
    }

    const cancelStatusModel = () => {
        setActionStatus("");
        setIsCommonStatusModel(false);
        setActionModelData("");
    }

    /* the adjustment request of Adjust Amount / Write-Off (the Contract refund screen's handler) */
    const handleUpdateInvoice = (payload) => {
        dispatch(saveUpdateAdjustPaymentInvoice({ invoice_id, ...payload })).then((res) => {
            if (res?.payload?.status !== 400) {
                ShowToast("success", res?.payload?.message);
                dispatch(fetchInvoiceDetails({ invoice_id }));
                setIsAdjustAmount(false);
            } else {
                ShowToast("error", res?.payload?.data?.data || t("key_failed_to_update_status"));
            }
        });
    };

    const handleActionStatus = (extraPayload) => {
        if (actionStatus === 6) {
            setIsVoidPopup(true);
            if (!invoiceCacellationReason)
                dispatch(fetchInvoiceGLobalCancellationReason({}));
        } else if ((actionStatus === 7 || actionStatus === 5 || actionStatus === 12 || actionStatus === 9 || actionStatus === 8) && invoice_id) {
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
    }

    const handleUpdateStatus = (payload) => {
        dispatch(saveChangeInvoiceStatus({ invoice_id, from_status: invoiceDetails?.status, to_status: actionStatus, ...payload })).then(res => {
            if (res?.payload?.status) {
                ShowToast("success", res?.payload?.message);
                reloadInvoice(); // A-11: the view again and the screen anew, in place of a page reload
            } else {
                ShowToast("error", res?.payload?.data?.data || t('key_failed_to_update_status'));
            }
        });
    }

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

    // ── Derived view data ─────────────────────────────────────────────────────
    const invoiceLoaded = errorMessageResponse === "" && invoiceDetails && Object.keys(invoiceDetails).length !== 0;
    const invoiceStatus = invoiceDetails?.status;

    const statusLabel = configData.invoiceStatusIdMapping[invoiceStatus]?.label || '';
    const typeLabel = configData.invoiceTypeLabel(invoiceDetails?.invoice_type, invoiceDetails?.payment_type) || (t('key_refund') || 'Refund');
    const methodLabel = paymentMethodLabel((invoiceDetails?.paymentModel?.[0]?.payment_method || invoiceDetails?.payment_method))
        || invoiceDetails?.paymentModel?.[0]?.payment_method || invoiceDetails?.payment_method || '';

    const relatedCount = (invoiceDetails?.parentInvoice ? 1 : 0) + (invoiceDetails?.childInvoices?.length || 0);
    const helpIco = (tip) => (<span className="help-ico tt"><Icon name="info" size={ 11 } /><span className="tt-bubble" role="tooltip">{ tip }</span></span>);

    /* Line items — same source branches as the legacy table, normalized for display */
    const lineItems = useMemo(() => {
        if (!invoiceLoaded) return [];
        const rows = [];
        if (invoiceDetails.refund_type !== "full") {
            (invoiceDetails.contractInvoiceRefundItemModel || []).forEach((item) => {
                rows.push({ type: item?.type, desc: item?.refund_item_description, amount: -Math.abs(Number(item?.refund_amount)) });
            });
        }
        if (invoiceDetails.refund_type === "full") {
            (invoiceDetails.subtotal_items || []).forEach((item) => {
                rows.push({
                    type: item?.item_type_key === "custom" ? "Custom" : item?.item_type,
                    desc: item?.item_type_key === "custom" ? item?.item_type : item?.item_description_during_subtotal_show,
                    amount: -Math.abs(Number(item?.item_effective_amount)),
                });
            });
        }
        if (invoiceDetails.refund_origin === "exchange_invoice" && invoiceStatus === 9 && invoiceDetails.parentInvoice) {
            rows.push({
                type: t('key_refund') || 'Refund',
                desc: `${ t('key_exchange_overpaid_refund') || 'Exchange overpaid refund' } (${ invoiceDetails.parentInvoice?.invoice_number })`,
                amount: -Math.abs(Number(invoiceDetails.parentInvoice?.final_amount)),
            });
        }
        return rows;
    }, [invoiceLoaded, invoiceDetails, invoiceStatus, t]);

    return (
        <Suspense fallback={ <CustomSpinner /> }>
            <>
                <div className="invd">
                    { invoiceLoaded && (
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
                                        <InvoiceStatusTag status={ invoiceStatus } label={ statusLabel } />
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
                                            <span className="v plain">{ methodLabel }</span>
                                        </div>
                                    </> }
                                </div>

                                {/* Banner — refund pending approval (unapproved child refund) */}
                                { invoiceStatus === 8 && (
                                    <div className="admin-warning warning">
                                        <span className="ico"><Icon name="info" size={ 18 } /></span>
                                        <div className="body">
                                            <div className="title">{ t('key_refund_pending_approval') || 'Refund pending approval' }</div>
                                            <div className="desc">{ t('key_refund_pending_approval_desc') || 'A child Refund Invoice is awaiting approval. Its value reserves the available-to-refund amount and blocks Exchange until the refund is approved or voided.' }</div>
                                        </div>
                                    </div>
                                ) }

                                {/* Header context cards */}
                                <InvoiceHeaderContext invoice={ invoiceDetails } showWorker={ invoiceDetails?.worker_id > 0 && Boolean(invoiceDetails?.worker_name) } />
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
                                                        <div className="fs-row">
                                                            <div className="label">{ t('key_total') || 'Total' }{ helpIco('The invoice amount.') }</div>
                                                            <div className="v">-{ formatHK(totalAmount) }</div>
                                                        </div>
                                                        <div className="fs-row zero">
                                                            <div className="label">{ t('key_paid') || 'Paid' }{ helpIco('Payment amount currently recorded. Pending Paid invoices show their recorded amount here.') }</div>
                                                            <div className="v">{ formatHK(0) }</div>
                                                        </div>
                                                        <div className="fs-row prominent success">
                                                            <div className="label">{ t('key_balance_due') || 'Balance Due' }{ helpIco('Remaining amount after Paid is applied.') }</div>
                                                            <div className="v">{ formatHK(0) }</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

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
                                                                    <td className="right">{ formatHKMinus(it.amount) }</td>
                                                                </tr>
                                                            )) }
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
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
                                                                        <div className="label">{ p.invoice_type === 'underpayment' ? t('key_parent_underpayment_invoice') : (t('key_parent_invoice') || 'Parent invoice') }</div>
                                                                    </div>
                                                                    <InvoiceStatusTag status={ p.status } />
                                                                    { amt != null && <span className="amt">{ formatHK(Math.abs(Number(amt))) }</span> }
                                                                </div>
                                                            );
                                                        })() }
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
                                        {/* Payment actions — Approve Refund is the page primary on unapproved refunds */}
                                        { (() => {
                                            /* the Invoice API lists Approve Refund disabled with its reason until the cheque copy is in (decision AA-06) */
                                            const approveAction = findAction(actionStatusList, 'approve_refund');
                                            const otherActions = (actionStatusList || []).filter(a =>
                                                a !== approveAction && a.id > 0 && a.id !== 6 && !REFUND_CORRECTION_KEYS.includes(a.key)
                                            );
                                            if (!approveAction && otherActions.length === 0) return null;
                                            const approveBlocked = isBlocked(approveAction);
                                            return (
                                                <div className="group">
                                                    <div className="lbl">{ t('key_payment_actions') || 'Payment actions' }</div>
                                                    <div className="actions">
                                                        { approveAction && (
                                                            <button type="button" className={ 'action-btn' + (approveBlocked ? ' disabled with-reason' : ' primary') } disabled={ approveBlocked } onClick={ () => !approveBlocked && handleActionStatusModel(approveAction) }>
                                                                <Icon name="check" size={ 14 } className="ico" /><span className="label">{ approveAction.name }</span>
                                                                { approveBlocked && <span className="blocked">{ approveAction.reason }</span> }
                                                            </button>
                                                        ) }
                                                        { otherActions.map((action, i) => (
                                                            <button key={ i } type="button" className={ 'action-btn' + (isBlocked(action) ? ' disabled with-reason' : '') } disabled={ isBlocked(action) } onClick={ () => !isBlocked(action) && handleActionStatusModel(action) }>
                                                                <Icon name="check" size={ 14 } className="ico" /><span className="label">{ action.name }</span>
                                                                { isBlocked(action) && <span className="blocked">{ action.reason }</span> }
                                                            </button>
                                                        )) }
                                                    </div>
                                                </div>
                                            );
                                        })() }

                                        {/* Financial corrections */}
                                        { invoiceStatus !== 6 && (() => {
                                            const adjustAction = findAction(actionStatusList, 'adjust');
                                            const writeOffAction = findAction(actionStatusList, 'write_off');
                                            const corrections = REFUND_CORRECTION_KEYS.map((key) => findAction(actionStatusList, key)).filter(Boolean);
                                            if (!adjustAction && !writeOffAction && corrections.length === 0) return null;
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
                                                        { corrections.map((action) => {
                                                            const blocked = isBlocked(action);
                                                            const look = action.key === 'revert' ? { icon: 'check', tone: '' } : { icon: 'alert', tone: ' destructive' };
                                                            return (
                                                                <button key={ action.key } type="button" className={ 'action-btn' + look.tone + (blocked ? ' disabled with-reason' : '') } disabled={ blocked } onClick={ () => !blocked && handleActionStatusModel(action) }>
                                                                    <Icon name={ look.icon } size={ 14 } className="ico" /><span className="label">{ action.key === 'mark_unsettled' ? (t('key_mark_unsettled') || 'Mark Unsettled') : action.name }</span>
                                                                    { blocked && <span className="blocked">{ action.reason }</span> }
                                                                </button>
                                                            );
                                                        }) }
                                                    </div>
                                                </div>
                                            );
                                        })() }

                                        {/* Lifecycle */}
                                        { invoiceStatus !== 6 && (() => {
                                            const voidAction = findAction(actionStatusList, 'void');
                                            if (!voidAction) return null;
                                            return (
                                                <div className="group danger">
                                                    <div className="lbl">{ t('key_lifecycle') || 'Lifecycle' }</div>
                                                    <div className="actions">
                                                        <button type="button" className={ 'action-btn destructive' + (isBlocked(voidAction) ? ' disabled with-reason' : '') } disabled={ isBlocked(voidAction) } onClick={ () => !isBlocked(voidAction) && handleActionStatusModel(voidAction) }>
                                                            <Icon name="trash" size={ 14 } className="ico" /><span className="label">{ voidAction.name }</span>
                                                            { isBlocked(voidAction) && <span className="blocked">{ voidAction.reason }</span> }
                                                        </button>
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
                                                { briefInvoice && <Suspense fallback={ null }><RelatedInvoiceBriefModal invoiceId={ briefInvoice.id } seed={ briefInvoice } onClose={ () => setBriefInvoice(null) } /></Suspense> }

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
                                                </button>                                            </div>
                                        </div>
                                    </div>

                                    {/* Refund documentation (company-cheque refunds) */}
                                    { uploadRequired && (
                                        <div className="context-side">
                                            <div className="head-row"><Icon name="paperclip" size={ 12 } /><span>{ t('key_refund_proof') || 'Refund documentation' }</span></div>
                                            { isMedicalPhotoUploaded && uploadedPhoto?.url ? (
                                                <>
                                                    <div className="proof-pill">
                                                        <span className="ico"><Icon name="filetext" size={ 14 } /></span>
                                                        <div className="meta"><div className="name">{ uploadedPhoto.filename || uploadedPhoto.fileName || 'proof' }</div><div className="sub">{ t('key_uploaded') }</div></div>
                                                        <Icon name="check" size={ 14 } style={ { color: 'var(--st-success)' } } />
                                                    </div>
                                                    <div className="proof-actions mt-2">
                                                        {/* @migration-unspecified(invoice): refund documentation has no Delete (the API allows it only on a
                                                            Pending Paid invoice) and no Replace yet; Step 7 settles refund documents. Confirm with product. */ }
                                                        <button className="btn btn-secondary sm" onClick={ handleDownloadFile }><Icon name="eye" size={ 12 } />{ t('key_view') }</button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    {/* the company cheque's copy, needed before Approve Refund (prototype refund documentation; register #22) */}
                                                    <div style={ { fontSize: 12.5, color: 'var(--st-danger)', fontWeight: 600, marginBottom: 4 } }>{ t('key_cheque_copy_missing') }</div>
                                                    <div style={ { fontSize: 11.5, color: 'var(--text-3)', marginBottom: 10 } }>{ t('key_required_before_approval') }</div>
                                                    { uploadedPhotoLoading && <CustomSpinner /> }
                                                    <input ref={ refundDocInputRef } type="file" accept={ PROOF_FILE_ACCEPT } onChange={ handleFileUpload } hidden />
                                                    { invoiceActions.canPayRemainingBalance && (
                                                    <button type="button" className="btn btn-primary sm" onClick={ () => refundDocInputRef.current?.click() } disabled={ uploadedPhotoLoading }>
                                                        <Icon name="upload" size={ 12 } />{ t('key_upload_document') }
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

                {/* ── Popups ── */ }
                { isVoidPopup && (
                    <Suspense fallback={ null }>
                        <VoidWorkerCancellationPopup
                            workerName={ invoiceDetails?.worker_name }
                            invoiceNumber={ invoiceDetails?.invoice_number }
                            onClose={ () => setIsVoidPopup(false) }
                            invoiceCacellationReason={ invoiceCacellationReason }
                            handleUpdateStatus={ (payload) => { handleUpdateStatus(payload) } }
                        />
                    </Suspense>
                ) }

                { isCommonStatusModel && !MARK_STATUS_IDS.includes(actionStatus) && actionStatus !== 9 && (
                    <Suspense fallback={ null }>
                        <CommonStatusPopup
                            cancelStatusDialog={ () => cancelStatusModel() }
                            confirmStatusContract={ (payload) => handleActionStatus(payload) }
                            requireReason={ needsReason(actionStatus) }
                            showConfirmDialog={ isCommonStatusModel }
                            title={ actionModelData?.name }
                            message={ t('key_are_you_sure_want_to_update_status') }
                        />
                    </Suspense>
                ) }

                { isCommonStatusModel && actionStatus === 9 && (
                    <Suspense fallback={ null }>
                        <ApprovePaymentModal
                            title={ actionModelData?.name || 'Approve Refund' }
                            afterStatusLabel={ configData.invoiceStatusIdMapping[9]?.label }
                            onClose={ () => cancelStatusModel() }
                            onConfirm={ () => handleActionStatus() }
                            invoiceRef={ invoiceDetails?.invoice_number || invoiceDetails?.reference_id }
                            statusLabel={ statusLabel }
                            proof={ uploadedPhoto }
                        />
                    </Suspense>
                ) }

                { isCommonStatusModel && MARK_STATUS_IDS.includes(actionStatus) && (
                    <Suspense fallback={ null }>
                        <MarkStatusModal
                            kind={ actionStatus === 12 ? 'revert' : actionStatus === 7 ? 'bad_debt' : 'unsettled' }
                            title={ actionModelData?.name }
                            invoiceDetails={ invoiceDetails }
                            onClose={ () => cancelStatusModel() }
                            onConfirm={ (payload) => handleActionStatus(payload) }
                        />
                    </Suspense>
                ) }

                { isAdjustAmount && (
                    <Suspense fallback={ null }>
                        <AdjustAmountPopup
                            onClose={ () => setIsAdjustAmount(false) }
                            invoiceDetails={ invoiceDetails }
                            handleUpdateInvoice={ handleUpdateInvoice }
                            isAdjustAmountActionType={ isAdjustAmountActionType }
                            totalAmount={ totalAmount }
                        />
                    </Suspense>
                ) }

                { showPrintoutModal && (
                    <Suspense fallback={ null }>
                        <PrintoutPreviewModal invoiceDetails={ invoiceDetails } totalAmount={ totalAmount } onClose={ () => setShowPrintoutModal(false) } onDownloadPDF={ handleDownloadPDF } onPrint={ handlePrint } />
                    </Suspense>
                ) }

                {/* PDF target (rendered off-screen only when needed) */ }
                <div ref={ contentRef }>
                    { (isPdf) && (
                        <Suspense fallback={ null }>
                            <InvoiceRefundPdfGenerator
                                invoiceDetails={ invoiceDetails }
                                totalAmount={ totalAmount }
                                parentTotalAmount={ parentTotalAmount }
                            />
                        </Suspense>
                    ) }

                    { (isPrint) && (
                        <Suspense fallback={ null }>
                            <InvoiceRefundPdfPrint
                                invoiceDetails={ invoiceDetails }
                                totalAmount={ totalAmount }
                                parentTotalAmount={ parentTotalAmount }
                            />
                        </Suspense>
                    ) }
                </div>
            </>
        </Suspense>
    );
};

/* the props withInvoiceViewGate hands the screen (InvoiceRecordGate.js) */
RefundInvoice.propTypes = {
    invoiceViewLoaded: PropTypes.bool,
    reloadInvoice: PropTypes.func,
    refreshInvoice: PropTypes.func,
};

export default RefundInvoice;
