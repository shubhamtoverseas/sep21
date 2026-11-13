import React from "react";
import PropTypes from "prop-types";
import { Controller } from "react-hook-form";
import WkdReadField from "../../../../WorkerPage/worker-detail/newui/details/WkdReadField";
import { formatPhoneDisplay, handleMobileInput } from "../../../../../../services/commonService";
import translation from "../../../../../../utils/translation";
import EmdCard from "./EmdCard";
import styles from "../../NewEmployerModal.module.css";

const Field = ({ label, error, children }) => (
    <div className={ styles.field }>
        <div className={ styles.fieldLabel }><span>{ label }</span></div>
        { children }
        { error && <div className={ styles.fieldError }>{ error }</div> }
    </div>
);
Field.propTypes = { label: PropTypes.node, error: PropTypes.node, children: PropTypes.node };

const OtherContactCard = ({ employer, canEdit, editing, onEdit, onCancel, onSave, saving, error, form, errors }) => {
    const { control } = form;

    const phoneInput = (name) => (
        <Controller name={ name } control={ control } render={ ({ field }) => (
            <input
                { ...field }
                value={ formatPhoneDisplay(field.value) }
                type="text"
                inputMode="numeric"
                className={ styles.input }
                onChange={ (event) => { handleMobileInput(event); field.onChange(event.target.value); } }
            />
        ) } />
    );

    return (
        <EmdCard title={ translation('key_other_contact') } canEdit={ canEdit } editing={ editing } onEdit={ onEdit } onCancel={ onCancel } onSave={ onSave } saving={ saving }>
            { !editing ? (
                /* prototype reads one value "2887 4103 ext. 204" (audit D-12) */
                <div className="emd-grid-3 emd-grid-oc">
                    <WkdReadField
                        label={ translation('key_contact_telephone') }
                        value={ [formatPhoneDisplay(employer?.contact_telephone_number), employer?.contact_telephone_ext ? `${ translation('key_ext').toLowerCase() }. ${ employer.contact_telephone_ext }` : ''].filter(Boolean).join(' ') }
                        mono
                    />
                    <WkdReadField label={ translation('key_home_telephone') } value={ formatPhoneDisplay(employer?.home_telephone_number) } mono />
                </div>
            ) : (
                <div className="emd-grid-3 emd-grid-oc">
                    { error && <div role="alert" className={ `${ styles.fieldError } emd-card-error` } data-mc-card-error="other-contact">{ error }</div> }
                    <Field label={ translation('key_contact_telephone') } error={ errors.contact_telephone_number?.message }>
                        { phoneInput('contact_telephone_number') }
                    </Field>
                    <Field label={ `${ translation('key_ext') }.` } error={ errors.contact_telephone_ext?.message }>
                        <Controller name="contact_telephone_ext" control={ control } render={ ({ field }) => (
                            <input { ...field } value={ field.value ?? '' } type="text" maxLength={ 8 } className={ styles.input } />
                        ) } />
                    </Field>
                    <Field label={ translation('key_home_telephone') } error={ errors.home_telephone_number?.message }>
                        { phoneInput('home_telephone_number') }
                    </Field>
                </div>
            ) }
        </EmdCard>
    );
};

OtherContactCard.propTypes = {
    employer: PropTypes.object,
    canEdit: PropTypes.bool,
    editing: PropTypes.bool,
    onEdit: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    saving: PropTypes.bool,
    /* the server's refusal of this card's last Save */
    error: PropTypes.string,
    form: PropTypes.object.isRequired,
    errors: PropTypes.object.isRequired,
};

export default React.memo(OtherContactCard);
