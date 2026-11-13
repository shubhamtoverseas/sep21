import React, { lazy, Suspense, useCallback, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { formatDateTime, formatHK, formatRelativeTime } from "../../../../utils/utils";
import configData from "../../../../components/ReusableComponents/app-configs";
import Icon from "../../../../components/Icon/Icon";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { uploadFile } from "../../../../services/commonService";
import { removeInvoicePaymentAttachment, uploadInvoicePaymentAttachment } from "../../../../redux/Slices/invoices/InvoicesSlice";
import { STORED_METHOD_ALIASES, paymentDocumentKind, paymentMethodLabel, usePaymentMethodCatalogue } from "../payment-method-selector/paymentMethodCatalogue";
import { balanceDueOf } from "../invoiceBalance";
import { getInvoiceActionPermissions, paymentDocumentActions } from "../../../../utils/permissions/invoiceActionPermissionUtils";
const ProofUploadModal = lazy(() => import("./ProofUploadModal"));
const ConfirmActionModal = lazy(() => import("./ConfirmActionModal"));
const ProofPreviewModal = lazy(() => import("./ProofPreviewModal"));

/*
 * Proof of payment / Cash deposit receipt of an invoice's payment (Payment Method Rules v4 — B-6, B-7, C-2; U-0233;
 * rulings 2026-10-12). One card for the contract, standalone and exchange-payment detail screens:
 * - the document follows the method of the latest payment (catalogue proof mode): proof for Bank Transfer, FPS, PayMe and
 *   Cheque, the deposit receipt for Cash, nothing for card and wallet methods;
 * - Upload, Replace and Delete only while the invoice is Pending Paid; Delete asks for a reason and moves the payment to
 *   Unsettled (the API decides and writes the event); View (the Proof preview) always;
 * - a document rejected with the payment (Reject / Mark Unsettled) shows as Rejected, with its reason;
 * - the deadline shown is the one the Invoice API stored when the timer started (v4 B-5): Cash deposit receipt 48 h,
 *   management approval 30 days from the first proof (the former 72-hour cheque proof timer no longer exists).
 */

const PENDING_PAID = 2;
const UNSETTLED = 5;
const DOCUMENT_URL = /^https?:\/\/.+\.(pdf|jpe?g|png|gif|webp)$/i;
/* the proof pill's icon: filetext for an image, paperclip for a PDF (reference ProofSide) */
const IMAGE_FILE = /\.(jpe?g|png|gif|webp)$/i;

/** The API's message from a rejected thunk (error replies carry it in data.data, schema errors in data.error) */
export const apiErrorMessage = (res) => {
    const body = res?.payload?.data;
    return (typeof body?.data === "string" && body.data) || body?.message || body?.error || "";
};

/** What a detail screen needs to know about, and do with, its payment document */
export const usePaymentDocument = ({ invoiceDetails, invoiceId, onChanged }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { catalogue } = usePaymentMethodCatalogue();
    const permissionList = useSelector((state) => state.users?.permissionList);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [showView, setShowView] = useState(false);
    const [replacing, setReplacing] = useState(false);

    const payments = invoiceDetails?.paymentModel || [];
    const method = payments.length ? payments[payments.length - 1]?.payment_method : invoiceDetails?.payment_method;
    const kind = paymentDocumentKind(catalogue, method);
    const attachment = invoiceDetails?.latestPaymentAttachment;
    const url = typeof attachment === "string" && DOCUMENT_URL.test(attachment) ? attachment : null;
    const fileName = url ? decodeURIComponent(url.split("/").pop()) : null;
    const paymentDocument = invoiceDetails?.latestPaymentDocument || null;
    const rejected = Boolean(url) && paymentDocument?.state === "rejected";
    const pendingPaid = Number(invoiceDetails?.status) === PENDING_PAID;
    const canManage = Boolean(kind) && pendingPaid && !rejected;
    /* PK-01 P1-19: each document action only for a holder of its keys (a proof also needs the token of invoice_payment_proof) */
    const actions = getInvoiceActionPermissions(permissionList);
    const allowed = paymentDocumentActions(actions, kind === "payment_proof");
    /* OP-PK01-03: a proof the user may not view is not shown at all — the server hands out no file, so "missing" is unknown */
    const proofHidden = kind === "payment_proof" && !actions.canViewPaymentProof;

    const upload = useCallback(async (file) => {
        setUploading(true);
        try {
            const stored = await uploadFile([{ file, name: "invoices/payment" }]);
            if (!stored?.filename) {
                ShowToast("error", t("key_file_not_uploaded"));
                return false;
            }
            const res = await dispatch(uploadInvoicePaymentAttachment({ contract_invoices_id: invoiceId, payment_attachment: stored.filename }));
            if (res?.meta?.requestStatus !== "fulfilled") {
                ShowToast("error", apiErrorMessage(res) || t("key_something_went_wrong"));
                return false;
            }
            ShowToast("success", res?.payload?.message);
            onChanged?.();
            return true;
        } finally {
            setUploading(false);
        }
    }, [dispatch, invoiceId, onChanged, t]);

    const remove = useCallback(async (reason) => {
        setDeleting(true);
        try {
            const res = await dispatch(removeInvoicePaymentAttachment({ invoice_id: Number(invoiceId), reason }));
            if (res?.meta?.requestStatus !== "fulfilled") {
                ShowToast("error", apiErrorMessage(res) || t("key_something_went_wrong"));
                return false;
            }
            ShowToast("success", res?.payload?.message || t("key_deleted_successfully"));
            onChanged?.();
            return true;
        } finally {
            setDeleting(false);
        }
    }, [dispatch, invoiceId, onChanged, t]);

    return {
        kind,
        method,
        isCash: kind === "deposit_receipt",
        /* what the approval modal and the refund gates read */
        proof: url ? { url, fileName } : {},
        view: () => { if (url) setShowView(true); },
        rejected,
        rejectReason: rejected ? paymentDocument?.reason || "" : "",
        /* { kind: deposit_receipt | approval, due_at } while Pending Paid (stored deadline) */
        deadline: invoiceDetails?.paymentDeadline || null,
        /* Upload / Replace / Delete only while Pending Paid (ruling 2026-10-12), each for a holder of its keys */
        canManage,
        canUpload: canManage && !url && allowed.canUpload,
        canReplace: canManage && Boolean(url) && allowed.canReplace,
        canDelete: canManage && Boolean(url) && allowed.canDelete,
        missing: Boolean(kind) && pendingPaid && !url && !proofHidden,
        visible: Boolean(kind) && (pendingPaid || Boolean(url)) && !proofHidden,
        uploading,
        deleting,
        showUpload,
        showDelete,
        showView,
        replacing,
        /* what the Delete impact preview reads (Financial Summary figures) */
        figures: {
            paid: Number(invoiceDetails?.paid_amount || 0),
            balanceDue: balanceDueOf(invoiceDetails),
            unsettled: Number(invoiceDetails?.unsettled_amount || 0),
        },
        openUpload: () => { setReplacing(false); setShowUpload(true); },
        openReplace: () => { setReplacing(true); setShowUpload(true); },
        closeView: () => setShowView(false),
        closeUpload: () => setShowUpload(false),
        openDelete: () => setShowDelete(true),
        closeDelete: () => setShowDelete(false),
        upload,
        remove,
    };
};

/* Only Cash (deposit receipt, 48 h) can be missing its document while Pending Paid (v4 A): Bank Transfer, FPS, Cheque
   and PayMe are recorded with their proof (U-0233). */
const MISSING_DOCUMENT_COPY = {
    cash: { hint: "key_upload_scanned_image_deposit_receipt", rule: "key_deposit_receipt_deadline_48h" },
};

/** The warning text under a missing document, per method ("" when the method has no document deadline) */
export const missingDocumentHintKey = (method) => MISSING_DOCUMENT_COPY[STORED_METHOD_ALIASES[method] || method]?.hint || "";
/** The short deadline rule under a missing document on the side card, per method ("" when none) */
export const missingDocumentRuleKey = (method) => MISSING_DOCUMENT_COPY[STORED_METHOD_ALIASES[method] || method]?.rule || "";

const DEADLINE_COPY = {
    deposit_receipt: { title: "key_deposit_receipt_deadline", hint: "key_deposit_receipt_deadline_hint" },
    approval: { title: "key_management_approval_deadline", hint: "key_mgmt_approval_deadline_hint" },
};

/** What is due on the payment and by when (the deadline the Invoice API stored), with Overdue once it has passed */
export const PaymentDeadlineCard = ({ deadline = null }) => {
    const { t } = useTranslation();
    const copy = deadline?.due_at ? DEADLINE_COPY[deadline.kind] : null;
    if (!copy) return null;
    const due = dayjs(deadline.due_at);
    const overdue = due.isBefore(dayjs());
    return (
        <div className={ 'deadline-side ' + (overdue ? 'danger' : 'warning') }>
            <div className="head-row"><Icon name="calendar" size={ 12 } /><span>{ t(copy.title) }</span></div>
            <div className="when">{ formatDateTime(due) }</div>
            <div className="relative">{ overdue ? t('key_overdue') : formatRelativeTime(due) }</div>
            <div className="hint">{ t(copy.hint) }</div>
        </div>
    );
};
PaymentDeadlineCard.propTypes = {
    deadline: PropTypes.shape({ kind: PropTypes.string, due_at: PropTypes.string }),
};

/* The delete's state impact (reference DeleteProofModal) — the warning in the danger box, then Status Pending
   Paid → Unsettled and the payment moving from Paid to Unsettled (as the warning says, Paid becomes HK$0) */
export const DeleteProofImpact = ({ warning, figures }) => {
    const { t } = useTranslation();
    const { paid, balanceDue, unsettled } = figures;
    const rows = [
        [t('key_paid'), paid, 0],
        [t('key_balance_due'), balanceDue, balanceDue + paid],
        [t('key_unsettled'), unsettled, unsettled + paid],
    ].filter(([, before, after]) => before !== after);
    return (
        <>
            <div className="proof-delete-warn">{ warning }</div>
            <div className="appr-impact">
                <div className="hd">{ t('key_impact_preview') }</div>
                <table className="impact-tbl">
                    <thead>
                        <tr>
                            <th>{ t('key_field') }</th>
                            <th>{ t('key_before') }</th>
                            <th className="arw">→</th>
                            <th>{ t('key_after') }</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{ t('key_status') }</td>
                            <td className="b txt">{ configData.invoiceStatusIdMapping[PENDING_PAID]?.label }</td>
                            <td className="arw">→</td>
                            <td className="a txt">{ configData.invoiceStatusIdMapping[UNSETTLED]?.label }</td>
                        </tr>
                        { rows.map(([label, before, after]) => (
                            <tr key={ label }>
                                <td>{ label }</td>
                                <td className="b">{ formatHK(before) }</td>
                                <td className="arw">→</td>
                                <td className="a">{ formatHK(after) }</td>
                            </tr>
                        )) }
                    </tbody>
                </table>
                <p className="note">{ t('key_balance_due_footnote') }</p>
            </div>
        </>
    );
};
DeleteProofImpact.propTypes = {
    warning: PropTypes.string,
    figures: PropTypes.shape({ paid: PropTypes.number, balanceDue: PropTypes.number, unsettled: PropTypes.number }).isRequired,
};

/** The side card (and its upload / delete dialogs) for `usePaymentDocument(...)` */
const PaymentDocumentCard = ({ doc, methodLabel = "" }) => {
    const { t } = useTranslation();
    if (!doc) return null;
    const { isCash } = doc;
    return (
        <>
            { doc.visible && (
                <div className="context-side">
                    <div className="head-row"><Icon name="paperclip" size={ 12 } /><span>{ isCash ? (t('key_deposit_receipt') || 'Deposit receipt') : (t('key_payment_proof') || 'Payment proof') }</span></div>
                    { doc.proof.url ? (
                        <>
                            <div className="proof-pill">
                                <span className="ico"><Icon name={ IMAGE_FILE.test(doc.proof.fileName || '') ? 'filetext' : 'paperclip' } size={ 14 } /></span>
                                <div className="meta"><div className="name">{ doc.proof.fileName }</div><div className="sub">{ doc.rejected ? t('key_rejected') : t('key_uploaded') }</div></div>
                                <Icon name={ doc.rejected ? 'x' : 'check' } size={ 14 } style={ { color: doc.rejected ? 'var(--st-danger)' : 'var(--st-success)' } } />
                            </div>
                            { doc.rejected && doc.rejectReason && (
                                <div style={ { fontSize: 11.5, color: 'var(--st-danger)', fontWeight: 500, margin: '8px 0 10px' } }>{ doc.rejectReason }</div>
                            ) }
                            { doc.canManage && (
                                <div style={ { fontSize: 11.5, color: 'var(--st-warning)', fontWeight: 500, margin: '8px 0 10px' } }>{ t('key_uploaded_awaiting_approval') }</div>
                            ) }
                            <div className="proof-actions mt-2">
                                <button className="btn btn-secondary sm" onClick={ doc.view }><Icon name="eye" size={ 12 } />{ t('key_view') }</button>
                                { doc.canReplace && <button className="btn btn-secondary sm" onClick={ doc.openReplace }><Icon name="upload" size={ 12 } />{ t('key_replace') }</button> }
                                { doc.canDelete && <button className="btn btn-secondary sm proof-del" onClick={ doc.openDelete } disabled={ doc.deleting }><Icon name="trash" size={ 12 } />{ t('key_delete') }</button> }
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={ { fontSize: 12.5, color: 'var(--st-danger)', fontWeight: 600, marginBottom: 4 } }>{ isCash ? t('key_deposit_receipt_missing') : t('key_payment_proof_missing') }</div>
                            { MISSING_DOCUMENT_COPY[STORED_METHOD_ALIASES[doc.method] || doc.method] && (
                                <div style={ { fontSize: 11.5, color: 'var(--text-3)', marginBottom: 10 } }>{ t(MISSING_DOCUMENT_COPY[STORED_METHOD_ALIASES[doc.method] || doc.method].rule) }</div>
                            ) }
                            { doc.canUpload && (
                                <button type="button" className="btn btn-primary sm" onClick={ doc.openUpload } disabled={ doc.uploading }>
                                    <Icon name="upload" size={ 12 } />{ isCash ? t('key_upload_deposit_receipt') : t('key_upload_payment_proof') }
                                </button>
                            ) }
                        </>
                    ) }
                </div>
            ) }

            { doc.showUpload && (
                <Suspense fallback={ null }>
                    <ProofUploadModal
                        isCash={ isCash }
                        replace={ doc.replacing }
                        methodLabel={ methodLabel || paymentMethodLabel(doc.method) }
                        loading={ doc.uploading }
                        onClose={ doc.closeUpload }
                        onUpload={ async (file) => { if (await doc.upload(file)) doc.closeUpload(); } }
                    />
                </Suspense>
            ) }

            { doc.showDelete && (
                <Suspense fallback={ null }>
                    <ConfirmActionModal
                        danger
                        icon="trash"
                        reasonRequired
                        loading={ doc.deleting }
                        title={ isCash ? t('key_delete_deposit_receipt_q') : t('key_delete_payment_proof_q') }
                        message={ <DeleteProofImpact warning={ isCash ? t('key_delete_deposit_receipt_warning') : t('key_delete_proof_warning') } figures={ doc.figures } /> }
                        subtitle={ t('key_delete_proof_subtitle') }
                        confirmLabel={ t('key_delete_proof_confirm') }
                        onClose={ doc.closeDelete }
                        onConfirm={ async (reason) => { if (await doc.remove(reason)) doc.closeDelete(); } }
                    />
                </Suspense>
            ) }

            { doc.showView && doc.proof.url && (
                <Suspense fallback={ null }>
                    <ProofPreviewModal url={ doc.proof.url } fileName={ doc.proof.fileName } isCash={ isCash } awaitingApproval={ doc.canManage } onClose={ doc.closeView } />
                </Suspense>
            ) }
        </>
    );
};

PaymentDocumentCard.propTypes = {
    doc: PropTypes.shape({
        kind: PropTypes.string,
        method: PropTypes.string,
        isCash: PropTypes.bool,
        proof: PropTypes.shape({ url: PropTypes.string, fileName: PropTypes.string }),
        view: PropTypes.func,
        rejected: PropTypes.bool,
        rejectReason: PropTypes.string,
        canManage: PropTypes.bool,
        canUpload: PropTypes.bool,
        canReplace: PropTypes.bool,
        canDelete: PropTypes.bool,
        missing: PropTypes.bool,
        visible: PropTypes.bool,
        deadline: PropTypes.shape({ kind: PropTypes.string, due_at: PropTypes.string }),
        uploading: PropTypes.bool,
        deleting: PropTypes.bool,
        showUpload: PropTypes.bool,
        showDelete: PropTypes.bool,
        showView: PropTypes.bool,
        replacing: PropTypes.bool,
        figures: PropTypes.shape({ paid: PropTypes.number, balanceDue: PropTypes.number, unsettled: PropTypes.number }),
        openUpload: PropTypes.func,
        openReplace: PropTypes.func,
        closeView: PropTypes.func,
        closeUpload: PropTypes.func,
        openDelete: PropTypes.func,
        closeDelete: PropTypes.func,
        upload: PropTypes.func,
        remove: PropTypes.func,
    }),
    methodLabel: PropTypes.string,
};

export default PaymentDocumentCard;
