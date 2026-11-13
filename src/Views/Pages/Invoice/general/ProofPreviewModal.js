import React from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Icon from "../../../../components/Icon/Icon";
import { openDocument } from "../documentLink";
import "../InvoiceDetail.css";

/* an image file previews inline; a PDF shows its icon and name (reference ViewProofModal) */
const IMAGE_FILE = /\.(jpe?g|png|gif|webp)$/i;

/**
 * Proof preview (reference invoice-detail.html · ViewProofModal): the payment proof or Cash deposit receipt on file, with
 * its file name and, while it awaits approval, where it is approved or rejected. The detail sends no file size, uploader
 * or upload time (OP-UI4-02), so the file strip carries the name and an Open link to the file itself.
 */
const ProofPreviewModal = ({ url, fileName = "", isCash = false, awaitingApproval = false, onClose }) => {
    const { t } = useTranslation();
    const open = () => openDocument(url); // SEC-28: only a web address (http / https) is opened
    return ReactDOM.createPortal(
        <div className="invd">
            <div className="modal-veil" onClick={ (e) => e.target === e.currentTarget && onClose() }>
                <div className="modal-card action-modal-card" onClick={ (e) => e.stopPropagation() } role="dialog" aria-modal="true">
                    <div className="head">
                        <span className="ico" style={ { background: "var(--accent-bg)", color: "var(--accent)" } }><Icon name="eye" size={ 18 } /></span>
                        <div style={ { flex: 1 } }>
                            <h2>{ t("key_proof_preview") }</h2>
                            <div className="msub">{ isCash ? t("key_cash_deposit_receipt_on_file") : t("key_payment_proof_on_file") }</div>
                        </div>
                    </div>
                    <div className="body">
                        <div className="proof-preview">
                            <div className="area">
                                { IMAGE_FILE.test(fileName)
                                    ? <img src={ url } alt={ fileName } />
                                    : <><Icon name="filetext" size={ 32 } /><span className="nm">{ fileName }</span></> }
                            </div>
                            <div className="strip">
                                <span className="nm">{ fileName }</span>
                                <button type="button" className="link" onClick={ open }><Icon name="external" size={ 12 } />{ t("key_open") }</button>
                            </div>
                        </div>
                        { awaitingApproval && (
                            <div className="proof-preview-note">
                                { t("key_status") }: <strong>{ t("key_uploaded_awaiting_approval") }</strong>. { t("key_approve_or_reject_proof_from") } <strong>{ t("key_approve_payment") }</strong>.
                            </div>
                        ) }
                    </div>
                    <div className="foot">
                        <button type="button" className="btn btn-ghost md" onClick={ onClose }>{ t("key_close") }</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

ProofPreviewModal.propTypes = {
    url: PropTypes.string.isRequired,
    fileName: PropTypes.string,
    isCash: PropTypes.bool,
    awaitingApproval: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
};

export default ProofPreviewModal;
