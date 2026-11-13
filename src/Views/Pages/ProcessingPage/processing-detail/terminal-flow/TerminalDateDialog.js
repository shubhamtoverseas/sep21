import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../../../../../components/ui/Modal";
import Btn from "../../../../../components/ui/Btn";
import DateInput from "../../../../../components/ui/DateInput";
import { Field, TextArea } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import configData from "../../../../../components/ReusableComponents/app-configs";
import { E_VISA_PAYMENT_DATE_REASON_MAX, TERMINAL_FLOW_COPY } from "./terminalFlowConfig";
import { isValidIsoDate, isVisaExpiryCompatible } from "./terminalFlowRules";
import styles from "./TerminalDateDialog.module.css";

const FIELD_ID = "terminal-flow-date";

const getDateError = (value) => {
    if (!value) return translation("key_this_field_is_required");
    if (!isValidIsoDate(value)) return translation("key_please_enter_a_valid_date");
    return "";
};

/**
 * End of Deployment / End of Processing confirmation. The entered date is preserved on every
 * validation or server failure; nothing is written until the parent's confirm succeeds. `reasonOnChange` (U-0171 /
 * backend 301): the date is a recorded fact — entering a different one is a correction and needs a Reason, sent with the
 * confirm; the server's refusal (`reasonError`) sits under the box.
 */
const TerminalDateDialog = ({ variant, initialDate, visaExpiry, isSubmitting, onConfirm, onClose, note, reasonOnChange = false, reasonError = "" }) => {
    const copy = TERMINAL_FLOW_COPY[variant];
    const [dateValue, setDateValue] = useState(initialDate || "");
    const [dateError, setDateError] = useState("");
    const [isVisaBlocked, setIsVisaBlocked] = useState(false);
    const [reason, setReason] = useState("");
    const [reasonMissing, setReasonMissing] = useState("");
    const dateChanged = reasonOnChange && Boolean(initialDate) && dateValue !== initialDate;
    useEffect(() => { if (reasonError) setReasonMissing(reasonError); }, [reasonError]);

    const handleDateChange = useCallback((value) => {
        setDateValue(value);
        setDateError("");
        setIsVisaBlocked(false);
        setReasonMissing("");
    }, []);

    const handleConfirm = useCallback(() => {
        const error = getDateError(dateValue);
        if (error) {
            setDateError(error);
            return;
        }
        if (!isVisaExpiryCompatible(dateValue, visaExpiry)) {
            setIsVisaBlocked(true);
            return;
        }
        if (dateChanged && !reason.trim()) {
            setReasonMissing(translation("key_cr_required_when_date_changes"));
            return;
        }
        onConfirm(dateValue, dateChanged ? reason.trim() : "");
    }, [dateValue, visaExpiry, onConfirm, dateChanged, reason]);

    const handleClose = useCallback(() => {
        if (!isSubmitting) onClose();
    }, [isSubmitting, onClose]);

    return (
        <Modal
            title={ translation(copy.titleKey) }
            width={ 440 }
            onClose={ handleClose }
            closeLabel={ translation("key_close") }
            trapFocus
            footer={ (
                <>
                    <span className={ styles.spacer } />
                    <Btn variant="secondary" type="button" onClick={ handleClose } disabled={ isSubmitting }>
                        { translation("key_cancel") }
                    </Btn>
                    <Btn variant="primary" type="button" onClick={ handleConfirm } disabled={ isSubmitting }>
                        { isSubmitting ? translation("key_loading") : translation("key_confirm") }
                    </Btn>
                </>
            ) }
        >
            <p className={ styles.intro }>{ translation(copy.introKey) }</p>
            <Field
                label={ translation(copy.dateLabelKey) }
                htmlFor={ FIELD_ID }
                required
                error={ dateError }
                hint={ translation(copy.hintKey) }
            >
                <DateInput
                    id={ FIELD_ID }
                    name={ FIELD_ID }
                    value={ dateValue }
                    onChange={ handleDateChange }
                    invalid={ Boolean(dateError) }
                    disabled={ isSubmitting }
                />
            </Field>
            { dateChanged && (
                <Field label={ translation("key_cr_correction_reason") } htmlFor={ `${ FIELD_ID }-reason` } required error={ reasonMissing } hint={ translation("key_cr_required_when_date_changes") }>
                    <TextArea id={ `${ FIELD_ID }-reason` } rows={ 2 } maxLength={ E_VISA_PAYMENT_DATE_REASON_MAX } value={ reason } disabled={ isSubmitting } invalid={ Boolean(reasonMissing) } onChange={ (event) => { setReason(event.target.value); setReasonMissing(""); } } />
                </Field>
            ) }
            { isVisaBlocked && (
                <div className={ styles.visaBlock }>
                    <p className={ styles.visaBlockMessage } role="alert">
                        { translation("key_visa_expiry_must_be_later_than_contract_start") }
                    </p>
                    <dl className={ styles.factList }>
                        <dt>{ translation("key_visa_expiry") }</dt>
                        <dd>{ configData.formatDateToDDMMYYYY(visaExpiry) }</dd>
                        <dt>{ translation("key_proposed_contract_start") }</dt>
                        <dd>{ configData.formatDateToDDMMYYYY(dateValue) }</dd>
                    </dl>
                </div>
            ) }
            { note && <p className={ styles.note }>{ note }</p> }
        </Modal>
    );
};

TerminalDateDialog.propTypes = {
    variant: PropTypes.oneOf(Object.keys(TERMINAL_FLOW_COPY)).isRequired,
    initialDate: PropTypes.string,
    visaExpiry: PropTypes.string,
    isSubmitting: PropTypes.bool,
    onConfirm: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    note: PropTypes.node,
    /* End of Processing: a date different from the recorded one needs a Reason (sent as `reason`) */
    reasonOnChange: PropTypes.bool,
    /* the server's refusal for a missing reason, placed under the box */
    reasonError: PropTypes.string,
};

export default React.memo(TerminalDateDialog);
