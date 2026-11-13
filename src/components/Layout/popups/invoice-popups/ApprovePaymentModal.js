import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Icon from '../../../Icon/Icon';
import { openDocument } from '../../../../Views/Pages/Invoice/documentLink';
import '../../../../Views/Pages/Invoice/new-ui-shared.css';
import '../../../../Views/Pages/Invoice/InvoiceDetail.css';

/* Approve Payment — new-UI confirmation modal (renamed from "Mark as Paid").
   Pending Paid → Paid. Calls the same status-change action via onConfirm. */
const ApprovePaymentModal = ({ onClose, onConfirm, loading, invoiceRef, statusLabel, proof, title, afterStatusLabel }) => {
    const { t } = useTranslation();
    const proofUrl = proof?.url;
    const proofName = proof?.filename || proof?.fileName || proof?.name;
    const heading = title || t('key_approve_payment');
    return (
        <div className="invd modal-veil" role="dialog" aria-modal="true" onClick={ (e) => e.target === e.currentTarget && !loading && onClose() }>
            <div className="modal-card action-modal-card">
                <div className="head">
                    <span className="ico" style={ { background: 'var(--st-success-bg)', color: 'var(--st-success)' } }><Icon name="check" size={ 18 } /></span>
                    <div style={ { flex: 1 } }>
                        <h2>{ heading }</h2>
                        <div className="msub">{ t('key_approve_payment_subtitle') }</div>
                    </div>
                    <button type="button" className="btn-icon" onClick={ onClose } aria-label="Close" disabled={ loading }><Icon name="x" size={ 16 } /></button>
                </div>

                <div className="body">
                    <p className="rf-p" style={ { marginBottom: proofUrl ? 14 : 0 } }>
                        { t('key_reviewing') } <strong className="mono">{ invoiceRef }</strong> — { statusLabel } · { t('key_payment_pending_review') }
                    </p>

                    { proofUrl && (
                        <div style={ { marginBottom: 14 } }>
                            <div className="rf-lbl" style={ { marginBottom: 6 } }>{ t('key_uploaded_payment_proof') }</div>
                            <div className="proof-pill">
                                <span className="ico"><Icon name="filetext" size={ 14 } /></span>
                                <div className="meta"><div className="name">{ proofName || t('key_payment_proof') }</div><div className="sub">{ t('key_uploaded') }</div></div>
                                <button type="button" className="btn btn-ghost" style={ { height: 26 } } onClick={ () => openDocument(proofUrl) }><Icon name="external" size={ 12 } />{ t('key_view') }</button>
                            </div>
                        </div>
                    ) }

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
                                    <td className="b txt">{ statusLabel }</td>
                                    <td className="arw">→</td>
                                    <td className="a txt">{ afterStatusLabel || t('key_paid') }</td>
                                </tr>
                                <tr>
                                    <td>{ t('key_payment_review') }</td>
                                    <td className="b txt">{ t('key_pending_review') }</td>
                                    <td className="arw">→</td>
                                    <td className="a txt">{ t('key_confirmed') }</td>
                                </tr>
                            </tbody>
                        </table>
                        <p className="note">{ t('key_balance_due_footnote') }</p>
                    </div>
                </div>

                <div className="foot">
                    <button type="button" className="btn btn-ghost md" onClick={ onClose } disabled={ loading }>{ t('key_cancel') }</button>
                    <button type="button" className="btn btn-primary md" onClick={ onConfirm } disabled={ loading }>
                        <Icon name="check" size={ 13 } />{ loading ? `${ t('key_processing') }…` : heading }
                    </button>
                </div>
            </div>
        </div>
    );
};

ApprovePaymentModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    loading: PropTypes.bool,
    invoiceRef: PropTypes.string,
    statusLabel: PropTypes.string,
    proof: PropTypes.object,
    title: PropTypes.string,
    /* the status after approval: Paid (default), Refunded or Exchanged */
    afterStatusLabel: PropTypes.string,
};

export default ApprovePaymentModal;
