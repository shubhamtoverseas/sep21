import React, { useState } from 'react';
import PropTypes from 'prop-types';
import translation from '../../../../utils/translation';
import Icon from '../../../Icon/Icon';
import constData from '../../../ReusableComponents/constants';
import "../../../../Views/Pages/Invoice/new-ui-shared.css";
import "../../../../Views/Pages/Invoice/new-ui-review.css";
import "../../../../Views/Pages/Invoice/InvoiceDetail.css";
import DateInput from "../../../ui/DateInput";
import { interpolate } from "../../../../i18n/interpolate";


function VoidWorkerCancellationPopup({ onClose, invoiceCacellationReason, handleUpdateStatus, workerName = '', isDisabledWarning, exchangeId, invoice_type, invoiceNumber = '', parentInvoiceNumber = '', childInvoices, isLoading }) {
    const [voidDataForm, setVoidDataForm] = useState({
        cancel_contract: '',
        cancellation_date: '',
        cancellation_reason: '',
        other_reason: '',
        void_child_invoice: '',
        child_invoice_id: childInvoices?.id || ''
    });
    const [errors, setErrors] = useState({});

    const showCancellation = constData.VOID_CANCELLATION_INVOICE_TYPES.includes(invoice_type);
    /* register #69 (INV-X5): voiding an A2 whose Underpayment child is live is a three-way choice — Void Both, Void A2 Only
       or Cancel — through the existing Void (void_child_invoice); a Remaining Credit refund child keeps its question, and an
       A2 with no live child is asked nothing about one */
    const liveChild = invoice_type === 'exchange' && childInvoices?.id && Number(childInvoices.status) !== 6 ? childInvoices : null;
    const underpaymentChild = liveChild?.invoice_type === 'underpayment' ? liveChild : null;
    const askChild = Boolean(liveChild) && !underpaymentChild;

    const onUpdateFromData = (e) => {
        const { name, value } = e.target;
        setVoidDataForm({ ...voidDataForm, [name]: value });
        if (['cancel_contract', 'void_child_invoice', 'cancellation_reason', 'cancellation_date', 'other_reason'].includes(name)) {
            setErrors({ ...errors, [name]: '' });
        }
    }

    const onUpdateStatus = (voidChild) => {
        const form = voidChild === undefined ? voidDataForm : { ...voidDataForm, void_child_invoice: voidChild };
        if (form.other_reason.trim() === '') {
            setErrors({ ...errors, other_reason: translation('key_void_reason_is_required') });
            return;
        }
        if (showCancellation) {
            if (form.cancel_contract === '') {
                setErrors({ ...errors, cancel_contract: translation('key_please_select_option_cancel_contract_of_worker') });
                return;
            }
            if (form.cancel_contract == 1) {
                if (form.cancellation_date === '') {
                    setErrors({ ...errors, cancellation_date: translation('key_please_select_cancellation_date') });
                    return;
                }
                if (form.cancellation_reason === '') {
                    setErrors({ ...errors, cancellation_reason: translation('key_please_select_cancellation_reason') });
                    return;
                }
            }
            if (askChild && form.void_child_invoice === '') {
                setErrors({ ...errors, void_child_invoice: translation('key_please_select_option_to_void_child_invoice') });
                return;
            }
            handleUpdateStatus(form);
            return;
        }
        handleUpdateStatus({ ...form, cancel_contract: '0' });
    }

    const pick = (name, value) => onUpdateFromData({ target: { name, value } });

    if (isDisabledWarning) {
        return (
            <div className="invd modal-veil" role="dialog" aria-modal="true" onClick={ (e) => e.target === e.currentTarget && !isLoading && onClose() }>
                <div className="modal-card">
                    <div className="head">
                        <span className="ico danger"><Icon name="trash" size={ 18 } /></span>
                        <h2>{ translation('key_void_invoice') }</h2>
                        <div className="spacer" />
                        <button type="button" className="btn-icon" onClick={ onClose } aria-label="Close"><Icon name="x" size={ 16 } /></button>
                    </div>
                    <div className="body">
                        <p className="warn-line">Cannot Void — Already Exchanged to { exchangeId }.</p>
                    </div>
                    <div className="foot">
                        <button type="button" className="btn btn-ghost md" onClick={ onClose }>{ translation('key_close') }</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="invd modal-veil" role="dialog" aria-modal="true" onClick={ (e) => e.target === e.currentTarget && !isLoading && onClose() }>
            <div className="modal-card action-modal-card">
                <div className="head">
                    <span className="ico danger"><Icon name="trash" size={ 18 } /></span>
                    <div className="head-col">
                        <h2>{ translation('key_void_invoice') }</h2>
                        <div className="msub">{ translation('key_void_invoice_subtitle') }</div>
                    </div>
                    <button type="button" className="btn-icon" onClick={ onClose } aria-label="Close"><Icon name="x" size={ 16 } /></button>
                </div>
                <div className="body">
                    <p className="rf-p void-intro">
                        { translation('key_voiding') } <strong className="mono">{ invoiceNumber || translation('key_invoice') }</strong> { translation('key_void_irreversible_note') }
                    </p>

                    { showCancellation && (
                        <div className="void-warn-banner">
                            { invoice_type === 'exchange' ? translation('key_void_exchange_warning') : translation('key_void_contract_warning') }
                        </div>
                    ) }

                    { showCancellation && (
                        <>
                            <p className="rf-p">{ translation('key_cancel_contract_of_worker') } ({ workerName })?</p>
                            <div className="rf-choice-row">
                                <button type="button" className={ 'btn md ' + (voidDataForm.cancel_contract === '1' ? 'btn-primary' : 'btn-secondary') } onClick={ () => pick('cancel_contract', '1') }>{ translation('key_yes') }</button>
                                <button type="button" className={ 'btn md ' + (voidDataForm.cancel_contract === '0' ? 'btn-primary' : 'btn-secondary') } onClick={ () => pick('cancel_contract', '0') }>{ translation('key_no') }</button>
                            </div>
                            { errors && errors.cancel_contract && <div className="err">{ errors.cancel_contract }</div> }

                            { voidDataForm.cancel_contract === '1' && (
                                <div className="rf-grid2">
                                    <div className="rf-field">
                                        <label className="rf-lbl required">{ translation('key_cancellation_date') }</label>
                                        <DateInput
                                            name="cancellation_date"
                                            value={ voidDataForm.cancellation_date || '' }
                                            onChange={ (v) => onUpdateFromData({ target: { name: 'cancellation_date', value: v } }) }
                                        />
                                        { errors && errors.cancellation_date && <div className="err">{ errors.cancellation_date }</div> }
                                    </div>
                                    <div className="rf-field">
                                        <label className="rf-lbl required">{ translation('key_reason_for_cancellation') }</label>
                                        <div className="select">
                                            <select className="input" name="cancellation_reason" onChange={ onUpdateFromData }>
                                                <option value="">{ translation('key_please_select') }</option>
                                                { invoiceCacellationReason && invoiceCacellationReason.map((reason, index) => (
                                                    <option key={ index } value={ reason.id }>{ reason.name }</option>
                                                )) }
                                            </select>
                                        </div>
                                        { errors && errors.cancellation_reason && <div className="err">{ errors.cancellation_reason }</div> }
                                    </div>
                                </div>
                            ) }

                            { askChild && (
                                <>
                                    <p className="rf-p mt14">Void child invoice { childInvoices?.invoice_type === "overpaid_refund" ? " Refund " : " Underpaid " } { childInvoices?.invoice_number } ?</p>
                                    <div className="rf-choice-row">
                                        <button type="button" className={ 'btn md ' + (voidDataForm.void_child_invoice === '1' ? 'btn-primary' : 'btn-secondary') } onClick={ () => pick('void_child_invoice', '1') }>{ translation('key_yes') }</button>
                                        <button type="button" className={ 'btn md ' + (voidDataForm.void_child_invoice === '0' ? 'btn-primary' : 'btn-secondary') } onClick={ () => pick('void_child_invoice', '0') }>{ translation('key_no') }</button>
                                    </div>
                                    { errors && errors.void_child_invoice && <div className="err">{ errors.void_child_invoice }</div> }
                                </>
                            ) }
                        </>
                    ) }

                    { underpaymentChild && (
                        <p className="rf-p mt14" data-void-underpayment>{ interpolate(translation('key_void_a2_underpayment_note'), invoiceNumber, underpaymentChild.invoice_number, parentInvoiceNumber) }</p>
                    ) }

                    <div className="rf-field mt14">
                        <label className="rf-lbl">{ translation('key_reason_required') }</label>
                        <textarea className="input void-reason-textarea" rows={ 3 } name="other_reason" placeholder={ translation('key_void_reason_placeholder') } value={ voidDataForm.other_reason } onChange={ onUpdateFromData } />
                        { errors && errors.other_reason && <div className="err">{ errors.other_reason }</div> }
                    </div>

                    <div className="appr-impact void-impact mt14">
                        <div className="hd">{ translation('key_impact_preview') }</div>
                        <div className="void-impact-note">{ translation('key_void_impact_note') } { translation('key_status') } → <strong>{ translation('key_void') }</strong>.</div>
                    </div>
                </div>
                <div className="foot">
                    <button type="button" className="btn btn-ghost md" onClick={ onClose } disabled={ isLoading }>{ translation('key_cancel') }</button>
                    { underpaymentChild ? (
                        <>
                            <button type="button" className="btn btn-danger md" data-void-choice="a2-only" onClick={ () => onUpdateStatus('0') } disabled={ isLoading || voidDataForm.other_reason.trim() === '' }>
                                <Icon name="trash" size={ 13 } />{ isLoading ? translation('key_loading') : translation('key_void_a2_only') }
                            </button>
                            <button type="button" className="btn btn-danger md" data-void-choice="both" onClick={ () => onUpdateStatus('1') } disabled={ isLoading || voidDataForm.other_reason.trim() === '' }>
                                <Icon name="trash" size={ 13 } />{ isLoading ? translation('key_loading') : translation('key_void_both') }
                            </button>
                        </>
                    ) : (
                        <button type="submit" className="btn btn-danger md" onClick={ () => onUpdateStatus() } disabled={ isLoading || voidDataForm.other_reason.trim() === '' }>
                            <Icon name="trash" size={ 13 } />{ isLoading ? translation('key_loading') : translation('key_void_invoice') }
                        </button>
                    ) }
                </div>
            </div>
        </div>
    );
}

VoidWorkerCancellationPopup.propTypes = {
    onClose: PropTypes.func.isRequired,
    invoiceCacellationReason: PropTypes.array.isRequired,
    handleUpdateStatus: PropTypes.func.isRequired,
    workerName: PropTypes.string,
    isDisabledWarning: PropTypes.bool,
    exchangeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    invoice_type: PropTypes.string,
    invoiceNumber: PropTypes.string,
    /** an A2's original invoice (A1), named by the Void prompt (#69) */
    parentInvoiceNumber: PropTypes.string,
    childInvoices: PropTypes.object,
    isLoading: PropTypes.bool
};

export default VoidWorkerCancellationPopup;
