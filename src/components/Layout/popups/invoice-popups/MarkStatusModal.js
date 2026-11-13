import React, { useState, useMemo } from 'react';
import { formatHK } from "../../../../utils/utils";
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Icon from '../../../Icon/Icon';
import { openDocument } from '../../../../Views/Pages/Invoice/documentLink';
import { balanceDueOf } from "../../../../Views/Pages/Invoice/invoiceBalance";
import "../../../../Views/Pages/Invoice/new-ui-shared.css";
import "../../../../Views/Pages/Invoice/new-ui-review.css";
import "../../../../Views/Pages/Invoice/InvoiceDetail.css";

/* Mark Bad Debt / Mark Unsettled / Revert — new-UI FinancialActionModal design.
   The FULL recorded amount is reclassified, so the Amount is shown locked (no amount input by design);
   the required reason rides the change-status payload as `reason`.
   On a Pending Paid invoice Mark Unsettled is the reference "Reject / Mark Unsettled" (kind 'reject'): the recorded
   payment could not be verified, so the modal shows the uploaded proof and the Status / Payment review rows first.
   Revert (kind 'revert') confirms the API's revert out of Unsettled / Bad Debt: its title is the API's action name and,
   as the Invoice API computes what the revert restores, it shows no impact preview. */

function MarkStatusModal({ kind, invoiceDetails, onClose, onConfirm, isLoading, isDisabledWarning, exchangeId, warnAmount, proof, statusLabel, title: actionTitle }) {
    const { t } = useTranslation();
    const isBadDebt = kind === 'bad_debt';
    const isReject = kind === 'reject';
    const isRevert = kind === 'revert';
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const paid = Number(invoiceDetails?.paid_amount || 0);
    const unsettled = Number(invoiceDetails?.unsettled_amount || 0);
    const badDebt = Number(invoiceDetails?.bad_debt_amount || 0);
    const balanceDue = balanceDueOf(invoiceDetails);
    const fromUnsettled = invoiceDetails?.status === 5;

    // Reference delta: Bad Debt from Unsettled reclassifies Unsettled; otherwise Paid. Revert: the classified amount.
    const amount = isRevert ? (unsettled || badDebt) : isBadDebt ? (fromUnsettled ? unsettled : paid) : paid;

    const rows = useMemo(() => {
        const list = [];
        const add = (label, before, after) => { if (before !== after) list.push({ label, before, after }); };
        if (isBadDebt && fromUnsettled) {
            add(t('key_unsettled') || 'Unsettled', unsettled, unsettled - amount);
            add(t('key_bad_debt') || 'Bad Debt', badDebt, badDebt + amount);
        } else if (isBadDebt) {
            add(t('key_paid') || 'Paid', paid, paid - amount);
            add(t('key_balance_due') || 'Balance Due', balanceDue, balanceDue + amount);
            add(t('key_bad_debt') || 'Bad Debt', badDebt, badDebt + amount);
        } else {
            add(t('key_paid') || 'Paid', paid, paid - amount);
            add(t('key_balance_due') || 'Balance Due', balanceDue, balanceDue + amount);
            add(t('key_unsettled') || 'Unsettled', unsettled, unsettled + amount);
        }
        return list;
    }, [isBadDebt, fromUnsettled, paid, unsettled, badDebt, balanceDue, amount, t]);

    const title = isRevert
        ? actionTitle
        : isBadDebt
            ? (t('key_mark_as_bad_debt') || 'Mark Bad Debt')
            : isReject ? (t('key_reject_mark_unsettled') || 'Reject / Mark Unsettled') : (t('key_mark_unsettled') || 'Mark Unsettled');
    const subtitle = isRevert
        ? t('key_revert_subtitle')
        : isBadDebt
            ? (t('key_mark_bad_debt_subtitle') || 'Classify the unresolved amount as Bad Debt. Use Revert later if recovered.')
            : isReject
                ? t('key_reject_mark_unsettled_subtitle')
                : (t('key_mark_unsettled_subtitle') || 'Move Paid amount to Unsettled. The amount is reclassified — it does not become a new charge.');
    const proofUrl = isReject ? proof?.url : null;
    const proofName = proof?.filename || proof?.fileName || proof?.name;

    const onReasonChange = (e) => {
        setReason(e.target.value);
        setError('');
    };

    const handleConfirm = () => {
        if (!reason.trim()) {
            setError(t('key_reason_is_required'));
            return;
        }
        onConfirm({ reason: reason.trim() });
    };

    return (
        <div className="invd modal-veil" role="dialog" aria-modal="true" onClick={ (e) => e.target === e.currentTarget && !isLoading && onClose() }>
            <div className="modal-card action-modal-card">
                <div className="head">
                    <span className={ 'ico ' + (isRevert ? 'success' : 'danger') }><Icon name={ isReject ? 'x' : isRevert ? 'check' : 'alert' } size={ 18 } /></span>
                    <div className="head-col">
                        <h2>{ title }</h2>
                        <div className="msub">{ subtitle }</div>
                    </div>
                    <button type="button" className="btn-icon" onClick={ onClose } aria-label="Close" disabled={ isLoading }><Icon name="x" size={ 16 } /></button>
                </div>
                <div className="body">
                    { isDisabledWarning && !isRevert && (
                        <div className="void-warn-banner">
                            { `Credit of ${ formatHK(warnAmount) } transferred to ${ exchangeId }. ${ isBadDebt ? 'Bad Debt' : 'Unsettled' } does not reverse the exchange. Proceed?` }
                        </div>
                    ) }

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

                    {/* the reclassified amount, locked (reference FinancialActionModal Amount field) */ }
                    { !isReject && (
                        <div className="rf-field">
                            <label className="rf-lbl">{ t('key_amount') }</label>
                            <div className="input mono amount-locked"><Icon name="shield" size={ 12 } />{ formatHK(amount) }</div>
                        </div>
                    ) }

                    <div className={ 'rf-field' + (isReject ? '' : ' mt14') }>
                        <label className="rf-lbl">{ t('key_reason_required') }</label>
                        <textarea className="input void-reason-textarea" rows={ isReject ? 3 : 2 } name="reason" placeholder={ isReject ? t('key_reject_reason_placeholder') : t('key_recorded_in_payment_records') } value={ reason } onChange={ onReasonChange } />
                        { error && <div className="err">{ error }</div> }
                    </div>

                    { !isRevert && (
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
                                    { isReject && (
                                        <>
                                            <tr>
                                                <td>{ t('key_status') }</td>
                                                <td className="b txt">{ statusLabel }</td>
                                                <td className="arw">→</td>
                                                <td className="a txt">{ t('key_unsettled') }</td>
                                            </tr>
                                            <tr>
                                                <td>{ t('key_payment_review') }</td>
                                                <td className="b txt">{ t('key_pending_review') }</td>
                                                <td className="arw">→</td>
                                                <td className="a txt">{ t('key_rejected') }</td>
                                            </tr>
                                        </>
                                    ) }
                                    { rows.length === 0 && !isReject ? (
                                        <tr><td colSpan={ 4 } className="none">{ t('key_no_financial_impact') }</td></tr>
                                    ) : (
                                        rows.map((row) => (
                                            <tr key={ row.label }>
                                                <td>{ row.label }</td>
                                                <td className="b">{ formatHK(row.before) }</td>
                                                <td className="arw">→</td>
                                                <td className="a">{ formatHK(row.after) }</td>
                                            </tr>
                                        ))
                                    ) }
                                </tbody>
                            </table>
                            <p className="note">{ t('key_balance_due_footnote') }</p>
                        </div>
                    ) }
                </div>
                <div className="foot">
                    <button type="button" className="btn btn-ghost md" onClick={ onClose } disabled={ isLoading }>{ t('key_cancel') }</button>
                    <button type="button" className={ 'btn md ' + (isRevert ? 'btn-primary' : 'btn-danger') } onClick={ handleConfirm } disabled={ isLoading || reason.trim() === '' }>
                        <Icon name={ isReject ? 'x' : 'check' } size={ 13 } />{ isLoading ? t('key_loading') : (isReject ? t('key_reject_and_mark_unsettled') : t('key_confirm')) }
                    </button>
                </div>
            </div>
        </div>
    );
}

MarkStatusModal.propTypes = {
    kind: PropTypes.oneOf(['bad_debt', 'unsettled', 'reject', 'revert']).isRequired,
    invoiceDetails: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
    isDisabledWarning: PropTypes.bool,
    exchangeId: PropTypes.any,
    warnAmount: PropTypes.any,
    /* the reject variant: the uploaded proof and the current status label */
    proof: PropTypes.object,
    statusLabel: PropTypes.string,
    /* the revert variant: the API's action name */
    title: PropTypes.string,
};

export default MarkStatusModal;
