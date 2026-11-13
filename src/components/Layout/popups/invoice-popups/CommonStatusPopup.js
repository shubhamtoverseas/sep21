import React, { useState } from "react";
import PropTypes from 'prop-types';
import translation from "../../../../utils/translation";
import "../../../../Views/Pages/Invoice/new-ui-shared.css";
import "../../../../Views/Pages/Invoice/new-ui-review.css";
import "../../../../Views/Pages/Invoice/InvoiceDetail.css";

function CommonStatusPopup(props) {
    /* Void, Mark Unsettled, Mark Bad Debt and Revert ask for the reason the Invoice API requires (spec v5 §2.4, §7.7) */
    const [reason, setReason] = useState('');
    const [reasonError, setReasonError] = useState('');
    const onConfirm = () => {
        if (!props.requireReason) return props.confirmStatusContract();
        if (!reason.trim()) {
            setReasonError(translation('key_reason_is_required'));
            return;
        }
        props.confirmStatusContract({ reason: reason.trim() });
    };
    return <div className="invd modal-veil" role="dialog" aria-modal="true" onClick={ (e) => e.target === e.currentTarget && !props.isLoading && props.cancelStatusDialog() }>
        <div className="modal-card action-modal-card">
            <div className="head">
                <span className="ico accent"><i className="ri-information-line" /></span>
                <h2>{ props?.title }</h2>
                <div className="spacer" />
                <button type="button" className="btn-icon" onClick={ props.cancelStatusDialog } aria-label="Close" disabled={ props.isLoading }><i className="ri-close-line" /></button>
            </div>
            <div className="modal-card-body body">
                <p>{ props?.message }</p>
                { props.requireReason && (
                    <div className="rf-field">
                        <label className="rf-lbl">{ translation('key_reason_required') }</label>
                        <textarea className="input void-reason-textarea" rows={ 2 } name="reason" placeholder={ translation('key_type_reason_here') } value={ reason } onChange={ (e) => { setReason(e.target.value); setReasonError(''); } } />
                        { reasonError && <div className="err">{ reasonError }</div> }
                    </div>
                ) }
            </div>
            <div className="foot">
                <button type='button' className="btn btn-ghost md" onClick={ props.cancelStatusDialog } disabled={ props.isLoading }>{ translation('key_cancel') }</button>
                <button type='button' className="btn btn-primary md" onClick={ onConfirm } disabled={ props.isLoading || (props.requireReason && reason.trim() === '') }>
                    { props.isLoading ? translation('key_loading') : translation('key_confirm') }</button>
            </div>
        </div>
    </div>
}
CommonStatusPopup.propTypes = {
    cancelStatusDialog: PropTypes.func,
    confirmStatusContract: PropTypes.func,
    message: PropTypes.string,
    title: PropTypes.string,
    isLoading: PropTypes.bool,
    requireReason: PropTypes.bool
};
export default CommonStatusPopup;
