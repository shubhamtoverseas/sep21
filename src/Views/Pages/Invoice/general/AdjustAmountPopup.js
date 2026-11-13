import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { formatHK } from "../../../../utils/utils";
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import Icon from '../../../../components/Icon/Icon';
import constData from "../../../../components/ReusableComponents/constants";
import "../new-ui-shared.css";
import "../new-ui-review.css";
import "../InvoiceDetail.css";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { balanceDueOf } from "../invoiceBalance";

/* Adjust Amount / Write-Off / Revert adjustment — new-UI FinancialActionModal design.
   Adjust uses a single SIGNED amount input (positive bills back, negative reduces
   Amount Due). Write-Off and Revert (actionStatus 12) apply the amount as minus.
   The change-status payload shape is unchanged. */

const TYPE_WRITE_OFF = constData.INVOICE_ADJUST_TYPES.WRITE_OFF;
const TYPE_ADJUST = constData.INVOICE_ADJUST_TYPES.ADJUST;

function AdjustAmountPopup({
    onClose,
    handleUpdateInvoice,
    isAdjustAmountActionType,
    totalAmount = 0,
    isLoading,
    actionStatus = 0,
    invoiceDetails
}) {
    const { t } = useTranslation();
    const isWriteOff = isAdjustAmountActionType === TYPE_WRITE_OFF;
    // Revert (actionStatus 12) forces a minus adjustment, like Write-Off
    const signedMode = isAdjustAmountActionType === TYPE_ADJUST && actionStatus !== 12;

    const [amountInput, setAmountInput] = useState(() => (isWriteOff ? String(totalAmount ?? '') : ''));
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState({});

    // Lock body scroll while modal is open; restore on unmount
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Signed delta this entry represents: signed as typed, else always negative
    const delta = useMemo(() => {
        const num = parseFloat(amountInput);
        if (isNaN(num)) return 0;
        return signedMode ? num : -Math.abs(num);
    }, [amountInput, signedMode]);

    const adjustmentType = delta < 0 ? 'minus' : 'plus';
    const absAmount = Math.abs(delta);
    const overLimit = adjustmentType === 'minus' && absAmount > parseFloat(totalAmount);

    const finalAmount = useMemo(() => {
        if (!absAmount || overLimit) return 0;
        const base = parseFloat(totalAmount);
        return (adjustmentType === 'plus' ? base + absAmount : base - absAmount).toFixed(2);
    }, [absAmount, adjustmentType, overLimit, totalAmount]);

    // Current figures — same derivations as the Financial Summary rows
    const currentAdjustment = useMemo(() => (invoiceDetails?.adjusted_amouts || []).reduce((s, a) =>
        a.adjustment_type === 'plus' ? s + Number(a.adjusted_amount) : s - Math.abs(Number(a.adjusted_amount)), 0),
    [invoiceDetails?.adjusted_amouts]);
    const currentBalanceDue = balanceDueOf(invoiceDetails);
    const nextBalanceDue = Math.max(0, currentBalanceDue + delta);
    /* Write-Off takes the value out of Bad Debt first, then Unsettled (Invoice API write_off) */
    const unsettled = Number(invoiceDetails?.unsettled_amount || 0);
    const badDebt = Number(invoiceDetails?.bad_debt_amount || 0);
    const writtenOff = isWriteOff ? absAmount : 0;
    const fromBadDebt = Math.min(badDebt, writtenOff);
    const fromUnsettled = Math.min(unsettled, writtenOff - fromBadDebt);

    const onAmountChange = useCallback((e) => {
        setAmountInput(e.target.value);
        setErrors((prev) => ({ ...prev, adjusted_amount: '' }));
    }, []);

    const onReasonChange = useCallback((e) => setReason(e.target.value), []);

    const onUpdateStatus = useCallback(() => {
        if (overLimit) {
            setErrors({ adjusted_amount: t('key_adjustment_amount_less_than_total') });
            return;
        }
        handleUpdateInvoice({
            total_amount: totalAmount,
            adjustment_type: adjustmentType,
            type: isAdjustAmountActionType,
            adjusted_amount: absAmount,
            final_amount: finalAmount,
            reason,
        });
    }, [absAmount, overLimit, reason, totalAmount, adjustmentType, isAdjustAmountActionType, finalAmount, handleUpdateInvoice, t]);
    const canConfirm = absAmount > 0 && reason.trim() !== '';

    const modalTitle = isWriteOff ? t('key_write_off') : t('key_adjust_amount');

    return (
        <div
            className="invd modal-veil"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adjustModalTitle"
            onClick={ (e) => e.target === e.currentTarget && onClose() }
        >
            <div className="modal-card action-modal-card" onClick={ (e) => e.stopPropagation() }>
                <div className="head">
                    <span className="ico warning"><Icon name="edit" size={ 18 } /></span>
                    <div className="head-col">
                        <h2 id="adjustModalTitle">{ modalTitle }</h2>
                        <div className="msub">{ isWriteOff ? t('key_write_off_subtitle') : t('key_adjust_amount_subtitle') }</div>
                    </div>
                    <button type="button" className="btn-icon" onClick={ onClose } aria-label="Close"><Icon name="x" size={ 16 } /></button>
                </div>
                <div className="body">
                    <div className="rf-field">
                        <label className="rf-lbl">{ t('key_amount') }</label>
                        <input type="number" step="0.01" className="input mono" name="adjusted_amount" placeholder="0" value={ amountInput } onChange={ onAmountChange } />
                        { signedMode && <div className="rf-hint">{ t('key_adjust_amount_hint') }</div> }
                        { errors.adjusted_amount && <div className="err">{ errors.adjusted_amount }</div> }
                    </div>

                    <div className="rf-field mt14">
                        <label className="rf-lbl">{ t('key_reason_required') }</label>
                        <textarea className="input void-reason-textarea" rows={ 2 } name="reason" placeholder={ t('key_recorded_in_payment_records') } value={ reason } onChange={ onReasonChange } />
                    </div>

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
                                { delta === 0 ? (
                                    <tr><td colSpan={ 4 } className="none">{ t('key_no_financial_impact') }</td></tr>
                                ) : (
                                    <>
                                        { nextBalanceDue !== currentBalanceDue && (
                                            <tr>
                                                <td>{ t('key_balance_due') }</td>
                                                <td className="b">{ formatHK(currentBalanceDue) }</td>
                                                <td className="arw">→</td>
                                                <td className="a">{ formatHK(nextBalanceDue) }</td>
                                            </tr>
                                        ) }
                                        { fromUnsettled > 0 && (
                                            <tr>
                                                <td>{ t('key_unsettled') }</td>
                                                <td className="b">{ formatHK(unsettled) }</td>
                                                <td className="arw">→</td>
                                                <td className="a">{ formatHK(unsettled - fromUnsettled) }</td>
                                            </tr>
                                        ) }
                                        { fromBadDebt > 0 && (
                                            <tr>
                                                <td>{ t('key_bad_debt') }</td>
                                                <td className="b">{ formatHK(badDebt) }</td>
                                                <td className="arw">→</td>
                                                <td className="a">{ formatHK(badDebt - fromBadDebt) }</td>
                                            </tr>
                                        ) }
                                        <tr>
                                            <td>{ t('key_adjustment') }</td>
                                            <td className="b">{ formatHK(currentAdjustment) }</td>
                                            <td className="arw">→</td>
                                            <td className="a">{ formatHK(currentAdjustment + delta) }</td>
                                        </tr>
                                    </>
                                ) }
                            </tbody>
                        </table>
                        <p className="note">{ t('key_balance_due_footnote') }</p>
                    </div>
                </div>
                <div className="foot">
                    <button type="button" className="btn btn-ghost md" onClick={ onClose } disabled={ isLoading }>{ t('key_cancel') }</button>
                    <button type="button" className="btn btn-primary md" onClick={ onUpdateStatus } disabled={ isLoading || !canConfirm }>
                        <Icon name="check" size={ 13 } />{ isLoading ? <CustomSpinner variant="inline" /> : t('key_confirm') }
                    </button>
                </div>
            </div>
        </div>
    );
}

AdjustAmountPopup.propTypes = {
    onClose: PropTypes.func.isRequired,
    invoiceDetails: PropTypes.object,
    handleUpdateInvoice: PropTypes.func.isRequired,
    isAdjustAmountActionType: PropTypes.string.isRequired,
    totalAmount: PropTypes.number,
    isLoading: PropTypes.bool,
    actionStatus: PropTypes.number
};

// memo — prevents re-render when parent re-renders with same props
const MemoizedAdjustAmountPopup = memo(AdjustAmountPopup);

export default MemoizedAdjustAmountPopup;
