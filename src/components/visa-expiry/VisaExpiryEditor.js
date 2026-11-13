import React, { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../ui/Modal";
import Btn from "../ui/Btn";
import DateInput from "../ui/DateInput";
import { Field, TextArea } from "../ui/FormControls";
import translation from "../../utils/translation";
import configData from "../ReusableComponents/app-configs";
import { ShowToast } from "../show-toast/ShowToast";
import dayjs from "../../utils/dayjsConfig";
import { correctVisaField, saveVisaExpiry, VISA_EXPIRY_SURFACE } from "./visaExpiryApi";
import { TextInput } from "../ui/FormControls";
import { CR_VISA_FIELD, CR_VISA_REFERENCE_MAX } from "../../Views/Pages/Contract/contractConstants";
import styles from "./VisaExpiryEditor.module.css";

const ISO_FORMAT = "YYYY-MM-DD";
const DATE_FIELD_ID = "visa-expiry-date";
const REASON_FIELD_ID = "visa-expiry-reason";

const toIso = (value) => {
    if (!value) return "";
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format(ISO_FORMAT) : "";
};

/**
 * Visa Expiry — a recorded fact, never derived (TERMINAL §5; prototype visaExpiryDialogHTML / B17 / B18).
 * Record (blank today): one date, primary "Record expiry", no reason. Update: the date with "Currently dd/mm/yyyy", a
 * Correction reason required only when the date changes, primary "Save changes". Unchanged / Cancel / Escape write
 * nothing; a whitespace reason is invalid. Contract Start must stay strictly earlier; on an Active contract without a
 * Contract Start the check cannot run and the save is refused with the prototype's message. History lives on Details → Visa
 * (`Contract/details/VisaHistory.js`, open point 18).
 * Active (backend answers 15 Oct B-3 / N-7 / K-16): the dialog also corrects Entry Visa Expiry (with Visa Expiry through
 * visa-expiry-update) and Visa Ref No / E-Visa Payment Date (one visa-field-correction each); one reason covers every change.
 */
const VisaExpiryEditor = ({ surface, contractId, visaExpiry, contractStart, canEdit, onSaved, showValue = true, visaFields = null }) => {
    const recorded = toIso(visaExpiry);
    const isUpdate = Boolean(recorded);
    const [isOpen, setIsOpen] = useState(false);
    const [dateValue, setDateValue] = useState(recorded);
    const isActiveSurface = surface === VISA_EXPIRY_SURFACE.ACTIVE;
    const storedFields = { entry: toIso(visaFields?.entry_visa_expiry_date), ref: visaFields?.visa_reference_no || "", pay: toIso(visaFields?.e_visa_payment_date) };
    const [fields, setFields] = useState(storedFields);
    const [fieldError, setFieldError] = useState("");
    const [reason, setReason] = useState("");
    const [dateError, setDateError] = useState("");
    const [reasonError, setReasonError] = useState("");
    const [serverError, setServerError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inFlightRef = useRef(false);

    const actionLabel = isUpdate ? translation("key_update_visa_expiry") : translation("key_record_visa_expiry");
    const start = toIso(contractStart);

    const openEditor = useCallback(() => {
        setDateValue(recorded); setFields({ entry: toIso(visaFields?.entry_visa_expiry_date), ref: visaFields?.visa_reference_no || "", pay: toIso(visaFields?.e_visa_payment_date) }); setFieldError(""); setReason(""); setDateError(""); setReasonError(""); setServerError(""); setIsOpen(true);
    }, [recorded, visaFields]);
    const setField = useCallback((key, value) => { setFields((f) => ({ ...f, [key]: value })); setFieldError(""); setServerError(""); }, []);
    const closeEditor = useCallback(() => { if (!isSubmitting) setIsOpen(false); }, [isSubmitting]);
    const handleDateChange = useCallback((value) => { setDateValue(value); setDateError(""); setServerError(""); }, []);
    const handleReasonChange = useCallback((event) => { setReason(event.target.value); setReasonError(""); setServerError(""); }, []);

    const handleSave = useCallback(async () => {
        if (inFlightRef.current) return;
        const expiryChanged = dateValue !== recorded;
        const entryChanged = isActiveSurface && fields.entry !== storedFields.entry;
        const refChanged = isActiveSurface && fields.ref.trim() !== storedFields.ref;
        const payChanged = isActiveSurface && fields.pay !== storedFields.pay;
        if (!expiryChanged && !entryChanged && !refChanged && !payChanged) { setIsOpen(false); return; }   /* unchanged: silent */
        if (expiryChanged || !isActiveSurface) {
            if (!dateValue || !dayjs(dateValue, ISO_FORMAT, true).isValid()) { setDateError(translation("key_please_enter_a_valid_date")); return; }
            if (isActiveSurface && !start) { setDateError(translation("key_cr_visa_start_missing")); return; }
            if (start && !dayjs(dateValue).isAfter(dayjs(start), "day")) { setDateError(translation("key_visa_expiry_must_be_later_than_contract_start")); return; }
        }
        if (entryChanged && fields.entry && !dayjs(fields.entry, ISO_FORMAT, true).isValid()) { setFieldError(translation("key_please_enter_a_valid_date")); return; }
        if (payChanged && fields.pay && !dayjs(fields.pay, ISO_FORMAT, true).isValid()) { setFieldError(translation("key_please_enter_a_valid_date")); return; }
        /* a reason once any recorded value changes (first record of the expiry: optional) */
        const needsReason = (expiryChanged && isUpdate) || entryChanged || refChanged || payChanged;
        if (needsReason && !reason.trim()) { setReasonError(translation("key_visa_expiry_reason_required")); return; }
        inFlightRef.current = true; setIsSubmitting(true);
        const base = { contract_id: Number(contractId), ...(needsReason ? { reason: reason.trim() } : {}) };
        let result = { ok: true, data: null, message: "" };
        if (expiryChanged || entryChanged) {
            result = await saveVisaExpiry(surface, { ...base, ...(expiryChanged ? { [CR_VISA_FIELD.EXPIRY]: dateValue } : {}), ...(entryChanged ? { [CR_VISA_FIELD.ENTRY_EXPIRY]: fields.entry || null } : {}) });
        }
        if (result.ok && refChanged) result = await correctVisaField({ ...base, field: CR_VISA_FIELD.REFERENCE_NO, value: fields.ref.trim() || null });
        if (result.ok && payChanged) result = await correctVisaField({ ...base, field: CR_VISA_FIELD.PAYMENT_DATE, value: fields.pay || null });
        inFlightRef.current = false; setIsSubmitting(false);
        if (!result.ok) { setServerError(result.message || translation("key_something_went_wrong")); if (onSaved && (expiryChanged || entryChanged)) onSaved(null); return; }
        ShowToast("success", result.message || translation("key_visa_expiry_updated"));
        setIsOpen(false);
        if (onSaved) onSaved(result.data);
    }, [dateValue, recorded, isUpdate, reason, start, surface, contractId, onSaved, isActiveSurface, fields, storedFields.entry, storedFields.ref, storedFields.pay]);


    const help = `${ isUpdate ? `${ translation("key_currently") } ${ configData.formatDateToDDMMYYYY(recorded) } · ` : "" }${ translation("key_cr_visa_after_contract_start") } ${ start ? configData.formatDateToDDMMYYYY(start) : "—" } · DD/MM/YYYY`;

    return (
        <>
            <div className={ styles.row }>
                { showValue && <span className={ recorded ? styles.value : `${ styles.value } ${ styles.empty }` }>{ recorded ? configData.formatDateToDDMMYYYY(recorded) : "—" }</span> }
                <span className={ styles.actions }>
                    { canEdit && <Btn variant="secondary" type="button" onClick={ openEditor }>{ actionLabel }</Btn> }
                </span>
            </div>

            { isOpen && (
                <Modal title={ actionLabel } width={ 440 } onClose={ closeEditor } closeLabel={ translation("key_close") } trapFocus
                    footer={ (
                        <>
                            <span className={ styles.spacer } />
                            <Btn variant="secondary" type="button" onClick={ closeEditor } disabled={ isSubmitting }>{ translation("key_cancel") }</Btn>
                            <Btn variant="primary" type="button" onClick={ handleSave } disabled={ isSubmitting }>
                                { isSubmitting ? translation("key_loading") : translation(isUpdate ? "key_save_changes" : "key_cr_record_expiry") }
                            </Btn>
                        </>
                    ) }>
                    <p className={ styles.intro }>{ translation("key_cr_visa_expiry_intro") }</p>
                    <Field label={ translation("key_visa_expiry") } htmlFor={ DATE_FIELD_ID } required error={ dateError } hint={ dateError ? undefined : help }>
                        <DateInput id={ DATE_FIELD_ID } name={ DATE_FIELD_ID } value={ dateValue } onChange={ handleDateChange } invalid={ Boolean(dateError) } disabled={ isSubmitting } />
                    </Field>
                    { isActiveSurface && (
                        <>
                            <Field label={ translation("key_entry_visa_expiry") } htmlFor="visa-entry-expiry" error={ fieldError } hint={ fieldError ? undefined : translation("key_optional") }>
                                <DateInput id="visa-entry-expiry" name="visa-entry-expiry" value={ fields.entry } onChange={ (v) => setField("entry", v) } invalid={ Boolean(fieldError) } disabled={ isSubmitting } />
                            </Field>
                            <Field label={ translation("key_visa_reference_no") } htmlFor="visa-ref-no">
                                <TextInput id="visa-ref-no" value={ fields.ref } maxLength={ CR_VISA_REFERENCE_MAX } onChange={ (e) => setField("ref", e.target.value) } disabled={ isSubmitting } />
                            </Field>
                            <Field label={ translation("key_e_visa_payment_date") } htmlFor="visa-pay-date">
                                <DateInput id="visa-pay-date" name="visa-pay-date" value={ fields.pay } onChange={ (v) => setField("pay", v) } disabled={ isSubmitting } />
                            </Field>
                        </>
                    ) }
                    { (isUpdate || isActiveSurface) && (
                        <Field label={ translation("key_cr_correction_reason") } htmlFor={ REASON_FIELD_ID } required error={ reasonError } hint={ reasonError ? undefined : translation(isActiveSurface ? "key_cr_required_when_value_changes" : "key_cr_required_when_date_changes") }>
                            <TextArea id={ REASON_FIELD_ID } name={ REASON_FIELD_ID } value={ reason } onChange={ handleReasonChange } invalid={ Boolean(reasonError) } disabled={ isSubmitting } maxLength={ 1000 } rows={ 3 } />
                        </Field>
                    ) }
                    { !isActiveSurface && <p className={ styles.intro } data-visa-unchanged="">{ translation("key_cr_visa_only_expiry_changes") }</p> }
                    { serverError && <p className={ styles.error } role="alert">{ serverError }</p> }
                </Modal>
            ) }

        </>
    );
};

VisaExpiryEditor.propTypes = {
    surface: PropTypes.oneOf(Object.values(VISA_EXPIRY_SURFACE)).isRequired,
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    visaExpiry: PropTypes.string,
    contractStart: PropTypes.string,
    canEdit: PropTypes.bool,
    onSaved: PropTypes.func,
    showValue: PropTypes.bool,
    /* Active: the current issuance values the correction dialog starts from */
    visaFields: PropTypes.shape({ entry_visa_expiry_date: PropTypes.string, visa_reference_no: PropTypes.string, e_visa_payment_date: PropTypes.string }),
};

export default React.memo(VisaExpiryEditor);
