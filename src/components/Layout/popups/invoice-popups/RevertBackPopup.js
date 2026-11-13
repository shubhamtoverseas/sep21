import React, { useState } from 'react';
import PropTypes from 'prop-types';
import translation from '../../../../utils/translation';
import "../../../../Views/Pages/Invoice/new-ui-shared.css";
import "../../../../Views/Pages/Invoice/new-ui-review.css";
import "../../../../Views/Pages/Invoice/InvoiceDetail.css";

function RevertBackPopup({ onClose, handleConfirmAdjustType, revertBackTitle }) {
    const [errors, setErrors] = useState({});
    const [voidDataForm, setVoidDataForm] = useState({ adjust_type: '' });
    const onUpdateFromData = (e) => {
        const { name, value } = e.target;
        setVoidDataForm({ ...voidDataForm, [name]: value });
        setErrors({ ...errors, [name]: '' });
    }
    const onConfirmAdjustType = () => {
        if (voidDataForm.adjust_type === '') {
            setErrors({ ...errors, adjust_type: 'Please select an option' });
            return;
        }
        handleConfirmAdjustType(voidDataForm);
    }
    const pick = (value) => onUpdateFromData({ target: { name: 'adjust_type', value } });
    const options = [
        { value: 'adjust_amount', label: translation('key_adjust_amount') },
        { value: 'write_off', label: translation('key_write_off') },
        { value: 'processed_without_adjustment', label: translation('key_processed_without_adjustment') },
    ];
    return (
        <div className="invd modal-veil" role="dialog" aria-modal="true" onClick={ (e) => e.target === e.currentTarget && onClose() }>
            <div className="modal-card action-modal-card">
                <div className="head">
                    <span className="ico accent"><i className="ri-arrow-go-back-line" /></span>
                    <h2>{ revertBackTitle }</h2>
                    <div className="spacer" />
                    <button type="button" className="btn-icon" onClick={ onClose } aria-label="Close"><i className="ri-close-line" /></button>
                </div>
                <div className="body">
                    <label className="field-label">Would you like to adjust or write off any part of this balance before resolving?</label>
                    <div className="rf-choice-row">
                        { options.map((o) => (
                            <button key={ o.value } type="button" className={ 'btn md ' + (voidDataForm.adjust_type === o.value ? 'btn-primary' : 'btn-secondary') } onClick={ () => pick(o.value) }>
                                { o.label }
                            </button>
                        )) }
                    </div>
                    { errors && errors.adjust_type && <small className="text-danger">{ errors.adjust_type }</small> }
                </div>
                <div className="foot">
                    <button type="button" className="btn btn-ghost md" onClick={ onClose }>{ translation('key_cancel') }</button>
                    <button type="submit" className="btn btn-primary md" onClick={ onConfirmAdjustType }>{ translation('key_next') }</button>
                </div>
            </div>
        </div>
    );
}

RevertBackPopup.propTypes = {
    onClose: PropTypes.func.isRequired,
    handleConfirmAdjustType: PropTypes.func.isRequired,
    revertBackTitle: PropTypes.string
};

export default RevertBackPopup;
