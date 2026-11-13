import React, { useRef } from "react";
import PropTypes from "prop-types";
import t from "../../../../utils/translation";
import { resolvedMethodShape } from "../../../../components/ReusableComponents/constants";
import styles from "./PaymentMethodSelector.module.css";
import DateInput from "../../../../components/ui/DateInput";
import { checkProofFile, normalizeTransactionReference, TRANSACTION_REFERENCE_MAX } from "./paymentMethodCatalogue";

/** Proof-of-payment dropzone (Bank Transfer, FPS, Cheque, PayMe). PDF / JPG / PNG up to 5 MB, checked
    before upload with the API's rule (C-2); a refused file is not kept and is never altered. */
const ProofDropzone = ({ formData, updateField, proofFile = null }) => {
    const ref = useRef(null);
    const file = formData?.proof_file;
    const onPick = async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        const problem = await checkProofFile(f, proofFile);
        updateField("proof_error", problem);
        updateField("proof_file", problem ? null : f);
        updateField("proof_name", problem ? "" : f.name);
    };
    if (file) {
        return (
            <div className="pms-proof has-file">
                <span className="ic"><i className="ri-file-text-line" /></span>
                <div className="meta">
                    <div className="nm">{ formData.proof_name || file.name }</div>
                    <div className="sz">{ Math.round((file.size || 0) / 1024) } KB</div>
                </div>
                <button type="button" className="btn btn-ghost" onClick={ () => { updateField("proof_file", null); updateField("proof_name", ""); } }><i className="ri-close-line" />{ t('key_replace') || 'Replace' }</button>
            </div>
        );
    }
    return (
        <div className="pms-proof" role="button" tabIndex={ 0 } onClick={ () => ref.current?.click() }>
            <i className="ri-upload-2-line" />
            <div className="t">{ t('key_click_to_upload_proof') || 'Click to upload proof' }</div>
            <div className="h">PDF · JPG · PNG · max 5 MB</div>
            <input ref={ ref } type="file" accept=".pdf,.jpg,.jpeg,.png" style={ { display: "none" } } onChange={ onPick } />
        </div>
    );
};
ProofDropzone.propTypes = {
    formData: PropTypes.object,
    updateField: PropTypes.func.isRequired,
    proofFile: PropTypes.shape({ maxBytes: PropTypes.number, types: PropTypes.arrayOf(PropTypes.string) }),
};

/** A field's error, under the field; it goes as soon as the value is valid */
const FieldError = ({ message = "" }) => (message ? <small className={ styles.fieldError } role="alert">{ message }</small> : null);
FieldError.propTypes = { message: PropTypes.string };

/**
 * Editable payment-detail fields for the selected method.
 * Rendered inside the Confirm Payment modal (moved out of the panel).
 * fieldErrors / fieldCaps are keyed by request property and follow the API's rules (Payment Method Rules v4, section A).
 */
const PaymentFields = ({ resolvedMethod = null, formData = {}, updateField, fieldErrors = {}, fieldCaps = {}, proofFile = null }) => {
    if (!resolvedMethod) return null;

    return (
        <>
            { resolvedMethod.type === "card" && (
                <>
                    { resolvedMethod.apple && (
                        <div className={ styles.formGroup }>
                            <label className={ styles.fieldLabel }>
                                { t('key_card_network') }
                            </label>
                            <div className="select">
                                <select className="input" aria-invalid={ !!fieldErrors.card_type } value={ formData.card_type } onChange={ (e) => updateField("card_type", e.target.value) }>
                                    <option value="">{ t("key_please_select") }</option>
                                    <option value="visa">{ t("key_pm_visa") }</option>
                                    <option value="master_card">{ t("key_pm_mastercard") }</option>
                                    <option value="union_pay">{ t("key_pm_union_pay") }</option>
                                </select>
                            </div>
                            <FieldError message={ fieldErrors.card_type } />
                            <small className={ styles.fieldHint }>⚠ { t('key_required_for_refund_routing_stored_on_ledger_entry') }</small>
                        </div>
                    ) }
                    {/* Visa / Mastercard / UnionPay: the Card Network is the method itself, pre-filled and read-only; then the
                        reference order Approval Code, Transaction Reference, Card last 4 */ }
                    { !resolvedMethod.apple && (
                        <div className={ styles.formGroup }>
                            <label className={ styles.fieldLabel }>{ t('key_card_network') }</label>
                            <input className="input" value={ resolvedMethod.label } readOnly aria-readonly="true" tabIndex={ -1 } />
                        </div>
                    ) }
                    <div className={ styles.formGroup }>
                        <label className={ styles.fieldLabel }>
                            { t("key_approval_code") } (HH:MM:SS)
                        </label>
                        <input
                            className="input"
                            placeholder="HH:MM:SS"
                            maxLength={ fieldCaps.approval_code }
                            aria-invalid={ !!fieldErrors.approval_code }
                            style={ { fontFamily: "var(--mono)" } }
                            value={ formData.approval_code }
                            onChange={ (e) => {
                                let value = e.target.value.replace(/[^0-9]/g, '');
                                if (value.length > 6) value = value.slice(0, 6);
                                if (value.length >= 2) {
                                    let hh = parseInt(value.slice(0, 2), 10);
                                    if (hh > 23) value = '23' + value.slice(2);
                                }
                                if (value.length >= 4) {
                                    let mm = parseInt(value.slice(2, 4), 10);
                                    if (mm > 59) value = value.slice(0, 2) + '59' + value.slice(4);
                                }
                                if (value.length >= 6) {
                                    let ss = parseInt(value.slice(4, 6), 10);
                                    if (ss > 59) value = value.slice(0, 4) + '59';
                                }
                                if (value.length > 2) value = value.slice(0, 2) + ':' + value.slice(2);
                                if (value.length > 5) value = value.slice(0, 5) + ':' + value.slice(5);
                                updateField("approval_code", value);
                            } }
                        />
                        <FieldError message={ fieldErrors.approval_code } />
                        {/* @migration-unspecified(invoice): the v4 sheet gives no placeholder or helper for the Approval Code;
                            the existing "HH:MM:SS" placeholder and this helper are kept. Confirm with product before release. */ }
                        <small className={ styles.fieldHint }>Read from terminal receipt.</small>
                    </div>
                    <div className={ styles.formGroup }>
                        <label className={ styles.fieldLabel }>
                            { t('key_transaction_reference') }
                        </label>
                        <input
                            className="input"
                            placeholder="Alphanumeric reference from terminal receipt"
                            style={ { fontFamily: "var(--mono)" } }
                            value={ formData.transaction_reference }
                            maxLength={ Math.min(fieldCaps.transaction_reference || TRANSACTION_REFERENCE_MAX, TRANSACTION_REFERENCE_MAX) }
                            aria-invalid={ !!fieldErrors.transaction_reference }
                            onChange={ (e) => updateField("transaction_reference", normalizeTransactionReference(e.target.value)) }
                        />
                        <FieldError message={ fieldErrors.transaction_reference } />
                        <small className={ styles.fieldHint }>{ t('key_Primary_unique_identifier_for_management_audit_cross_check_against_terminal_receipts') }.</small>
                    </div>
                    <div className={ styles.formGroup }>
                        <label className={ styles.fieldLabel }>
                            { t('key_card_last_4') }
                        </label>
                        <input
                            className="input"
                            placeholder="1234"
                            maxLength={ fieldCaps.card_number }
                            inputMode="numeric"
                            aria-invalid={ !!fieldErrors.card_number }
                            style={ { fontFamily: "var(--mono)", letterSpacing: ".05em" } }
                            value={ formData.card_number }
                            onChange={ (e) => {
                                const v = e.target.value;
                                if (/^\d{0,4}$/.test(v)) updateField("card_number", v);
                            } }
                        />
                        <FieldError message={ fieldErrors.card_number } />
                    </div>
                </>
            ) }

            { resolvedMethod.type === "qr" && (
                <div className={ styles.formGroup }>
                    <label className={ styles.fieldLabel }>
                        { t('key_transaction_reference') }
                    </label>
                    <input
                        className="input"
                        placeholder="Alphanumeric reference from terminal receipt"
                        style={ { fontFamily: "var(--mono)" } }
                        value={ formData.transaction_reference }
                        maxLength={ Math.min(fieldCaps.transaction_reference || TRANSACTION_REFERENCE_MAX, TRANSACTION_REFERENCE_MAX) }
                        aria-invalid={ !!fieldErrors.transaction_reference }
                        onChange={ (e) => updateField("transaction_reference", normalizeTransactionReference(e.target.value)) }
                    />
                    <FieldError message={ fieldErrors.transaction_reference } />
                    <small className={ styles.fieldHint }>{ t('key_QR_receipts_show_a_transaction_reference_only_no_HH_MM_SS_time_code') }.</small>
                </div>
            ) }

            { resolvedMethod.type === "off" && (
                <>
                    {/* Cash: nothing is required at record time; the receipt number and Received By may be entered (v4 A;
                        INV §5.2). The deposit receipt is uploaded on the invoice within 48h (mockup cash-note). */ }
                    { resolvedMethod.value === "cash" && (
                        <>
                            <div className={ styles.formGroup }>
                                <label className={ styles.fieldLabel }>{ t("key_receipt_no") }</label>
                                <input
                                    className="input"
                                    style={ { fontFamily: "var(--mono)" } }
                                    value={ formData.receipt_number }
                                    maxLength={ fieldCaps.receipt_number }
                                    onChange={ (e) => updateField("receipt_number", e.target.value) }
                                />
                            </div>
                            <div className={ styles.formGroup }>
                                <label className={ styles.fieldLabel }>{ t("key_received_by") }</label>
                                <input
                                    className="input"
                                    value={ formData.received_by }
                                    maxLength={ fieldCaps.received_by }
                                    onChange={ (e) => updateField("received_by", e.target.value) }
                                />
                            </div>
                            <div className="cash-note">
                                <span className="ic"><i className="ri-information-line" /></span>
                                <div>
                                    <div className="t">{ t('key_no_proof_required_at_payment_time') }</div>
                                    <p>
                                        { t('key_cash_note_upload_within') }{ ' ' }
                                        <strong>{ t('key_48_hours') }</strong>{ ' ' }
                                        { t('key_cash_note_auto_unsettled') }{ ' ' }
                                        <strong>{ t('key_unsettled') }</strong>.
                                    </p>
                                    <div className="after">
                                        { t('key_after_payment') } · <strong>{ t('key_pending_paid') }</strong> · { t('key_deposit_receipt_due_in_48_hours') }
                                    </div>
                                </div>
                            </div>
                        </>
                    ) }
                    { resolvedMethod.value === "fps" && (
                        <div className={ styles.formGroup }>
                            <label className={ styles.fieldLabel }>
                                { t('key_fps_reference') }
                            </label>
                            <input
                                className="input"
                                placeholder={ t('key_fps_reference') }
                                style={ { fontFamily: "var(--mono)" } }
                                value={ formData.transaction_reference }
                                maxLength={ Math.min(fieldCaps.transaction_reference || TRANSACTION_REFERENCE_MAX, TRANSACTION_REFERENCE_MAX) }
                                aria-invalid={ !!fieldErrors.transaction_reference }
                                onChange={ (e) => updateField("transaction_reference", normalizeTransactionReference(e.target.value)) }
                            />
                            <FieldError message={ fieldErrors.transaction_reference } />
                        </div>
                    ) }
                    { resolvedMethod.value === "payme" && (
                        <div className={ styles.formGroup }>
                            <label className={ styles.fieldLabel }>
                                { t('key_payme_reference') }
                            </label>
                            <input
                                className="input"
                                placeholder={ t('key_payme_reference') }
                                style={ { fontFamily: "var(--mono)" } }
                                value={ formData.transaction_reference }
                                maxLength={ Math.min(fieldCaps.transaction_reference || TRANSACTION_REFERENCE_MAX, TRANSACTION_REFERENCE_MAX) }
                                aria-invalid={ !!fieldErrors.transaction_reference }
                                onChange={ (e) => updateField("transaction_reference", normalizeTransactionReference(e.target.value)) }
                            />
                            <FieldError message={ fieldErrors.transaction_reference } />
                        </div>
                    ) }
                    {/* Bank Transfer (C-4, conflicts sheet U-0231): Bank Name, then the Bank Transfer Reference, both required */ }
                    { resolvedMethod.value === "bank_transfer" && (
                        <>
                            <div className={ styles.formGroup }>
                                <label className={ styles.fieldLabel }>
                                    { t("key_bank_name") }
                                </label>
                                <input
                                    className="input"
                                    placeholder="HSBC, Standard Chartered, Hang Seng…"
                                    maxLength={ fieldCaps.bank_name }
                                    aria-invalid={ !!fieldErrors.bank_name }
                                    value={ formData.bank_name }
                                    onChange={ (e) => updateField("bank_name", e.target.value) }
                                />
                                <FieldError message={ fieldErrors.bank_name } />
                            </div>
                            <div className={ styles.formGroup }>
                                <label className={ styles.fieldLabel }>
                                    { t("key_bank_in_reference") }
                                </label>
                                <input
                                    className="input"
                                    placeholder={ t('key_transfer_reference_from_bank_in_slip') }
                                    style={ { fontFamily: "var(--mono)" } }
                                    value={ formData.bank_in_reference }
                                    maxLength={ fieldCaps.bank_in_reference }
                                    aria-invalid={ !!fieldErrors.bank_in_reference }
                                    onChange={ (e) => updateField("bank_in_reference", e.target.value) }
                                />
                                <FieldError message={ fieldErrors.bank_in_reference } />
                            </div>
                        </>
                    ) }
                    { resolvedMethod.value === "cheque" && (
                        <>
                            <div className={ styles.formGroup }>
                                <label className={ styles.fieldLabel }>
                                    { t("key_bank") }
                                </label>
                                <input
                                    className="input"
                                    placeholder="HSBC, Standard Chartered, Hang Seng…"
                                    value={ formData.bank_name }
                                    maxLength={ fieldCaps.bank_name }
                                    aria-invalid={ !!fieldErrors.bank_name }
                                    onChange={ (e) => updateField("bank_name", e.target.value) }
                                />
                                <FieldError message={ fieldErrors.bank_name } />
                            </div>
                            <div className={ styles.formGroup }>
                                <label className={ styles.fieldLabel }>
                                    { t("key_cheque_number") }
                                </label>
                                <input
                                    className="input"
                                    placeholder="Cheque number"
                                    maxLength={ fieldCaps.cheque_number }
                                    inputMode="numeric"
                                    aria-invalid={ !!fieldErrors.cheque_number }
                                    style={ { fontFamily: "var(--mono)" } }
                                    value={ formData.cheque_number }
                                    onChange={ (e) => updateField("cheque_number", e.target.value.replace(/\D/g, "")) }
                                />
                                <FieldError message={ fieldErrors.cheque_number } />
                            </div>
                            <div className={ styles.formGroup }>
                                <label className={ styles.fieldLabel }>{ t("key_cheque_date") }</label>
                                <DateInput value={ formData.cheque_date || '' } onChange={ (value) => updateField("cheque_date", value) } />
                            </div>
                        </>
                    ) }

                    {/* proof at record from the catalogue: required before submit (Bank Transfer, FPS, Cheque, PayMe — U-0233) */ }
                    { resolvedMethod.proof === "required" && (
                        <div className={ `${ styles.formGroup } pe-span2` }>
                            <label className={ styles.fieldLabel }>
                                { t('key_proof_of_payment') || 'Proof of payment' }
                            </label>
                            <ProofDropzone formData={ formData } updateField={ updateField } proofFile={ proofFile } />
                            <FieldError message={ fieldErrors.proof_file } />
                            { resolvedMethod.proof === "required" && <div className="pms-proof-note">
                                { t('key_proof_required_before_recording_after_saving_invoice_is') }{ ' ' }
                                <strong>{ t('key_pending_paid_dot_unapproved') }</strong>{ ' ' }
                                { t('key_with_proof') }{ ' ' }
                                <strong>{ t('key_uploaded_awaiting_approval') }</strong>.{ ' ' }
                                { t('key_management_approval_deadline_30_days_no_separate_proof_upload_deadline') }
                            </div> }
                        </div>
                    ) }
                </>
            ) }
        </>
    );
};

PaymentFields.propTypes = {
    resolvedMethod: resolvedMethodShape,
    formData: PropTypes.object,
    updateField: PropTypes.func.isRequired,
    fieldErrors: PropTypes.objectOf(PropTypes.string),
    fieldCaps: PropTypes.objectOf(PropTypes.number),
    proofFile: PropTypes.shape({ maxBytes: PropTypes.number, types: PropTypes.arrayOf(PropTypes.string) }),
};

export default React.memo(PaymentFields);
