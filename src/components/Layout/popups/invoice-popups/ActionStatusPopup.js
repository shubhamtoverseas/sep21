import React, { useState } from 'react';
import PropTypes from 'prop-types';

import translation from '../../../../utils/translation';
import { batchActions, needsReason } from '../../../../Views/Pages/Invoice/invoiceActionList';
import "../../../../Views/Pages/Invoice/new-ui-shared.css";
import "../../../../Views/Pages/Invoice/new-ui-review.css";
import "../../../../Views/Pages/Invoice/InvoiceDetail.css";

function ActionStatusPopup({ onClose, actionStatusList, handleUpdateStatus, initialStatus = '', selectedInvoices = [] }) {
    const [selectedStatus] = useState(batchActions(actionStatusList, selectedInvoices));
    const [voidDataForm, setVoidDataForm] = useState({
        status: initialStatus === '' ? '' : String(initialStatus),
        reason: '',
    });
    const [errors, setErrors] = useState({});

    const onUpdateFromData = (e) => {
        const { name, value } = e.target;
        setVoidDataForm({ ...voidDataForm, [name]: value });
        if (name === 'status') {
            setErrors({ ...errors, status: '' });
        }
        if (name === 'reason') {
            setErrors({ ...errors, reason: '' });
        }
    }

    const onUpdateStatus = () => {
        if (voidDataForm.status === '') {
            setErrors({ ...errors, status: translation('key_status_is_required') });
            return;
        }
        /* Void, Mark Unsettled, Mark Bad Debt and Revert need a reason, which the Invoice API requires (spec v5 §2.4) */
        const reasonNeeded = needsReason(voidDataForm.status);
        if (reasonNeeded && !voidDataForm.reason.trim()) {
            setErrors({ ...errors, reason: translation('key_reason_is_required') });
            return;
        }
        handleUpdateStatus(voidDataForm?.status, reasonNeeded ? voidDataForm.reason.trim() : undefined);
    }

    return (
        <div className="invd modal-veil" role="dialog" aria-modal="true" onClick={ (e) => e.target === e.currentTarget && onClose() }>
            <div className="modal-card action-modal-card">
                <div className="head">
                    <span className="ico accent"><i className="ri-checkbox-multiple-line" /></span>
                    <div className="head-col">
                        <h2>{translation('key_invoice')}</h2>
                        <div className="msub">{translation('key_apply_status_selected_invoices')}</div>
                    </div>
                    <div className="spacer" />
                    <button type="button" className="btn-icon" onClick={onClose} aria-label="Close"><i className="ri-close-line" /></button>
                </div>
                <div className="modal-card-body body">
                    <div className="rf-field">
                        <label className="rf-lbl required">{translation('key_status')}</label>
                        <div className="select">
                            <select className="input" name="status" value={voidDataForm.status} onChange={onUpdateFromData}>
                                <option value={''}>{translation('key_please_select')}</option>
                                {selectedStatus && selectedStatus.map((item, index) => (
                                    <option key={index} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </div>
                        {errors && errors.status && <div className="err">{errors.status}</div>}
                    </div>
                    {needsReason(voidDataForm.status) && (
                        <div className="rf-field">
                            <label className="rf-lbl required">{translation('key_reason_required')}</label>
                            <textarea className="input void-reason-textarea" rows={2} name="reason" placeholder={translation('key_type_reason_here')} value={voidDataForm.reason} onChange={onUpdateFromData} />
                            {errors && errors.reason && <div className="err">{errors.reason}</div>}
                        </div>
                    )}
                </div>
                <div className="foot">
                    <button type="button" className="btn btn-ghost md" onClick={onClose}>{translation('key_cancel')}</button>
                    <button type="button" className="btn btn-primary md" onClick={onUpdateStatus}>{translation('key_confirm')}</button>
                </div>
            </div>
        </div>
    );
}

ActionStatusPopup.propTypes = {
    onClose: PropTypes.func.isRequired,
    actionStatusList: PropTypes.array.isRequired,
    handleUpdateStatus: PropTypes.func.isRequired,
    initialStatus: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    selectedInvoices: PropTypes.arrayOf(PropTypes.object),
};

export default ActionStatusPopup;
