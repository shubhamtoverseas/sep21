import React, { useState } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Icon from "../../../../components/Icon/Icon";
import "../InvoiceDetail.css";

/**
 * Reusable confirm dialog styled to the new-UI action modals (.invd scope).
 * `danger` switches the icon + confirm button to the destructive (red) variant.
 * Body can be a string or a node. Purely presentational — the caller owns the
 * action that runs on confirm. With `reasonRequired` the dialog asks for a reason
 * ("Reason (required)") and passes it to `onConfirm(reason)`; confirm stays disabled
 * until one is entered.
 */
const ConfirmActionModal = ({ title, subtitle, message, confirmLabel, cancelLabel, icon, danger, loading, reasonRequired, onClose, onConfirm }) => {
    const { t } = useTranslation();
    const [reason, setReason] = useState("");
    const iconStyle = danger
        ? { background: 'var(--st-danger-bg)', color: 'var(--st-danger)' }
        : { background: 'var(--accent-bg)', color: 'var(--accent)' };
    const glyph = icon || (danger ? 'trash' : 'info');
    const reasonMissing = reasonRequired && !reason.trim();

    return ReactDOM.createPortal(
        <div className="invd">
            <div className="modal-veil" onClick={ (e) => e.target === e.currentTarget && !loading && onClose() }>
                <div className="modal-card action-modal-card" onClick={ (e) => e.stopPropagation() } role="dialog" aria-modal="true">
                    <div className="head">
                        <span className="ico" style={ iconStyle }><Icon name={ glyph } size={ 18 } /></span>
                        <div style={ { flex: 1 } }>
                            <h2>{ title }</h2>
                            { subtitle && <div className="msub">{ subtitle }</div> }
                        </div>
                    </div>
                    <div className="body">
                        { typeof message === 'string'
                            ? <p style={ { margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 } }>{ message }</p>
                            : message }
                        { reasonRequired && (
                            <div className="field" style={ { marginTop: 14 } }>
                                <label htmlFor="confirm-action-reason">{ t('key_reason_required') || 'Reason (required)' }</label>
                                <textarea
                                    id="confirm-action-reason"
                                    className="input"
                                    style={ { height: 90, padding: '8px 10px', resize: 'vertical' } }
                                    maxLength={ 255 }
                                    value={ reason }
                                    disabled={ loading }
                                    onChange={ (e) => setReason(e.target.value) }
                                />
                            </div>
                        ) }
                    </div>
                    <div className="foot">
                        <button type="button" className="btn btn-ghost md" onClick={ onClose } disabled={ loading }>
                            { cancelLabel || t('key_cancel') || 'Cancel' }
                        </button>
                        <button
                            type="button"
                            className={ 'btn md' + (danger ? '' : ' btn-primary') }
                            style={ danger ? { background: 'var(--st-danger)', color: '#fff' } : undefined }
                            onClick={ () => onConfirm(reasonRequired ? reason.trim() : undefined) }
                            disabled={ loading || reasonMissing }
                        >
                            <Icon name={ glyph } size={ 13 } />{ loading ? `${ t('key_processing') || 'Processing' }…` : (confirmLabel || t('key_confirm') || 'Confirm') }
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

ConfirmActionModal.propTypes = {
    title: PropTypes.node.isRequired,
    subtitle: PropTypes.node,
    message: PropTypes.node,
    confirmLabel: PropTypes.string,
    cancelLabel: PropTypes.string,
    icon: PropTypes.string,
    danger: PropTypes.bool,
    loading: PropTypes.bool,
    reasonRequired: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
};

export default ConfirmActionModal;
