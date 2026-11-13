import React, { useRef, useState } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Icon from "../../../../components/Icon/Icon";
import { PROOF_FILE_ACCEPT, checkPaymentDocumentFile } from "../payment-method-selector/paymentMethodCatalogue";
import "../InvoiceDetail.css";

/**
 * Upload Proof / Deposit Receipt modal (reference invoice-detail.html · UploadProofModal).
 * Select-then-confirm: a file is chosen in the dropzone, then `onUpload(file)`
 * runs the parent's existing upload handler. No upload logic lives here — the
 * parent owns the API call, so Redux / endpoints are untouched.
 * A picked or dropped file is checked first with the Invoice API's rule (PDF, JPG or PNG by content, max 5 MB; v4 C-2);
 * a refused file is not kept and is never altered.
 */
const ProofUploadModal = ({ isCash, methodLabel, loading, onClose, onUpload, replace = false }) => {
    const { t } = useTranslation();
    const fileRef = useRef(null);
    const [file, setFile] = useState(null);
    const [fileError, setFileError] = useState("");
    const [dragOver, setDragOver] = useState(false);

    const take = async (f) => {
        if (!f) return;
        const problem = await checkPaymentDocumentFile(f);
        setFileError(problem);
        setFile(problem ? null : f);
    };
    const onPick = (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        take(f);
    };
    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        take(e.dataTransfer?.files?.[0]);
    };
    const confirm = () => { if (file) onUpload(file); };

    /* Replace has its own title, subtitle, hint, note and action (reference ReplaceProofModal) */
    const title = replace
        ? t('key_replace_payment_proof')
        : isCash ? (t('key_upload_deposit_receipt') || 'Upload Deposit Receipt') : (t('key_upload_payment_proof') || 'Upload payment proof');
    const subtitle = replace
        ? t('key_replace_proof_subtitle')
        : isCash
            ? (t('key_cash_deposit_receipt_completes_verification') || 'Cash deposit receipt completes verification.')
            : (t('key_upload_proof_so_payment_reviewed') || 'Upload proof so the recorded payment can be reviewed.');

    return ReactDOM.createPortal(
        <div className="invd">
            <div className="modal-veil" onClick={ (e) => e.target === e.currentTarget && !loading && onClose() }>
                <div className="modal-card action-modal-card" onClick={ (e) => e.stopPropagation() } role="dialog" aria-modal="true">
                    <div className="head">
                        <span className="ico" style={ { background: 'var(--st-warning-bg)', color: 'var(--st-warning)' } }>
                            <Icon name="upload" size={ 18 } />
                        </span>
                        <div style={ { flex: 1 } }>
                            <h2>{ title }</h2>
                            <div className="msub">{ subtitle }</div>
                        </div>
                    </div>

                    <div className="body">
                        <div
                            className="upload-zone"
                            role="button"
                            tabIndex={ 0 }
                            onClick={ () => fileRef.current?.click() }
                            onDragOver={ (e) => { e.preventDefault(); setDragOver(true); } }
                            onDragLeave={ () => setDragOver(false) }
                            onDrop={ onDrop }
                            style={ file ? { borderColor: 'var(--st-success-bd)' } : dragOver ? { borderColor: 'var(--accent)', background: 'var(--accent-bg)' } : undefined }
                        >
                            <Icon name={ file ? 'check' : 'upload' } size={ 28 } className="ico" />
                            <div className="title">{ file ? `${ file.name } · ${ t('key_ready').toLowerCase() }` : (t('key_drop_file_here_or_click_to_browse') || 'Drop file here, or click to browse') }</div>
                            <div className="hint">{ replace ? t('key_proof_replace_hint') : t('key_proof_upload_hint') }</div>
                            <input ref={ fileRef } type="file" accept={ PROOF_FILE_ACCEPT } style={ { display: 'none' } } onChange={ onPick } />
                        </div>
                        { fileError && (
                            <div role="alert" style={ { marginTop: 8, fontSize: 12, color: 'var(--st-danger)' } }>{ fileError }</div>
                        ) }

                        { replace ? (
                            <div style={ { marginTop: 12, padding: 10, background: 'var(--st-info-bg)', border: '1px solid var(--st-info-bd)', borderRadius: 6, fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.55 } }>
                                { t('key_replace_proof_note_lead') } <strong>{ isCash ? t('key_pending_paid') : t('key_pending_paid_unapproved') }</strong>. { t('key_replace_proof_note_tail') }
                            </div>
                        ) : isCash ? (
                            <div style={ { marginTop: 12, padding: 10, background: 'var(--st-info-bg)', border: '1px solid var(--st-info-bd)', borderRadius: 6, fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.55 } }>
                                { t('key_cash_note_upload_within') } <strong style={ { color: 'var(--text-1)' } }>{ t('key_48_hours') }</strong> { t('key_cash_note_auto_unsettled') } <strong style={ { color: 'var(--st-danger)' } }>{ t('key_unsettled') }</strong>. { t('key_proof_uploaded_approval_note') }
                            </div>
                        ) : (
                            <div style={ { marginTop: 12, padding: 10, background: 'var(--bg-subtle)', border: '1px dashed var(--line-1)', borderRadius: 6, fontSize: 11.5, color: 'var(--text-3)' } }>
                                { methodLabel ? <>{ t('key_method_on_file') || 'Method on file' }: <strong style={ { color: 'var(--text-1)' } }>{ methodLabel }</strong>. </> : null }
                                { t('key_proof_method_on_file_note') || 'After upload the invoice is Pending Paid · Awaiting approval. Management Approval Deadline: 30 days.' }
                            </div>
                        ) }
                    </div>

                    <div className="foot">
                        <button type="button" className="btn btn-ghost md" onClick={ onClose } disabled={ loading }>{ t('key_cancel') || 'Cancel' }</button>
                        <button type="button" className="btn btn-primary md" onClick={ confirm } disabled={ !file || loading }>
                            <Icon name="upload" size={ 13 } />{ loading ? (t('key_uploading') || 'Uploading…') : replace ? t('key_replace_proof') : title }
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

ProofUploadModal.propTypes = {
    isCash: PropTypes.bool,
    methodLabel: PropTypes.string,
    loading: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onUpload: PropTypes.func.isRequired,
    /* Replace (the proof card's / action panel's Replace) instead of a first upload */
    replace: PropTypes.bool,
};

export default ProofUploadModal;
