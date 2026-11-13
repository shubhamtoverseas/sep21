import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import t from "../../../../utils/translation";
import Icon from "../../../../components/Icon/Icon";
import Btn from "../../../../components/ui/Btn";
import constData from "../../../../components/ReusableComponents/constants";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { uploadFile } from "../../../../services/commonService";
import { formatHK } from "../../../../utils/utils";
import PaymentFields from "./PaymentFields";
import { fieldCaps, toSelectorMethod, usePaymentMethodCatalogue, validatePaymentFields } from "./paymentMethodCatalogue";
import "./paymentMethodSelector.css";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";

/* The payment entry form (reference invoice-detail.html · RecordPaymentModal): a locked amount, one Payment Method
   dropdown in the catalogue's groups, the chosen method's fields, the result note and the "Required: ..." footer with
   Confirm Payment / Submit Payment. One look for the Pay Remaining Balance modal and the payment panel of invoice
   creation (user 14 Oct, "CONFIRM PANEL"); each caller keeps its own rules, amount and request. */

const INITIAL_FORM_DATA = constData.INVOICE_PAYMENT_INITIAL_FORM_DATA;
/* the reference modal opens on Visa (rulings 14 Oct) */
const DEFAULT_METHOD = "visa";
const NONE = () => false;

/* the label each method field carries in PaymentFields, for the footer's "Required:" list */
const FIELD_LABEL_KEYS = Object.freeze({
    card_network: "key_card_network",
    approval_code: "key_approval_code",
    transaction_reference: "key_transaction_reference",
    card_last4: "key_card_last_4",
    transfer_reference: "key_bank_in_reference",
    fps_reference: "key_fps_reference",
    payme_reference: "key_payme_reference",
    cheque_number: "key_cheque_number",
    bank: "key_bank_name",
});

/* Field rules and the proof mode come from the catalogue (the API's own rules, Payment Method Rules v4 section A):
   proof is required before recording for Bank Transfer, FPS, Cheque and PayMe (U-0233). A picked file that
   failed the 5 MB / type check keeps its message until another file is picked. */
export function validatePaymentForm(resolvedMethod, formData, fieldRules) {
    const errors = validatePaymentFields(resolvedMethod, formData, fieldRules);
    if (formData.proof_error) errors.proof_file = formData.proof_error;
    else if (resolvedMethod?.proof === "required" && !formData.proof_file) errors.proof_file = t("key_proof_of_payment_is_required");
    return errors;
}

/**
 * The form's state: the catalogue, the chosen method (Visa unless the caller disables it), the entered fields and their
 * checks, and the submit (proof uploaded first, the API's refusal kept on screen). `isDisabled(method)` is the caller's
 * method rule (a catalogue method as toSelectorMethod gives it); `onDetailsEntered(entered)` reports whether payment
 * details have been entered (a method picked or a field typed).
 */
export const usePaymentEntry = ({ isDisabled = NONE, onDetailsEntered } = {}) => {
    const dispatch = useDispatch();
    const [methodCode, setMethodCode] = useState("");
    const [picked, setPicked] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    /* per-field: shown once a field is touched (cleared as soon as it is valid); server errors until the field changes */
    const [touched, setTouched] = useState({});
    const [serverErrors, setServerErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(false);

    /* The 11 methods and their 4 groups come from the Invoice API (one catalogue, B-2) */
    const { status: catalogueStatus, catalogue, retry: retryCatalogue } = usePaymentMethodCatalogue();
    const groups = useMemo(() => (catalogue ? catalogue.groups.map((g) => ({
        ...g,
        methods: catalogue.methods.filter((m) => m.group === g.code).map((m) => toSelectorMethod(m, g.labelKey, catalogue.methodFields)),
    })) : []), [catalogue]);
    const methods = useMemo(() => groups.flatMap((g) => g.methods), [groups]);
    const method = useMemo(() => methods.find((m) => m.value === methodCode) || null, [methods, methodCode]);
    /* input caps of the method fields and of the optional ones (Cash's receipt number and Received By) */
    const caps = useMemo(() => fieldCaps({ ...catalogue?.fieldRules, ...catalogue?.optionalFieldRules }), [catalogue]);

    const resetForm = useCallback(() => {
        setFormData(INITIAL_FORM_DATA);
        setTouched({});
        setServerErrors({});
        setErrorMessage("");
    }, []);

    /* opens on Visa; a chosen method the caller now disables (e.g. the path switched to a Reservation Fee) goes back to it */
    useEffect(() => {
        const current = methods.find((m) => m.value === methodCode);
        if (current && isDisabled(current)) {
            setMethodCode("");
            resetForm();
            return;
        }
        const preferred = methods.find((m) => m.value === DEFAULT_METHOD);
        if (!methodCode && preferred && !isDisabled(preferred)) setMethodCode(DEFAULT_METHOD);
    }, [methodCode, methods, isDisabled, resetForm]);

    const pickMethod = useCallback((code) => {
        setMethodCode(code);
        setPicked(true);
        resetForm();
    }, [resetForm]);

    const updateField = useCallback((field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
        setServerErrors((prev) => {
            if (!prev[field]) return prev;
            return Object.fromEntries(Object.entries(prev).filter(([key]) => key !== field));
        });
        setErrorMessage("");
    }, []);

    const entered = picked || Object.keys(touched).length > 0;
    useEffect(() => { onDetailsEntered?.(entered); }, [entered, onDetailsEntered]);

    const formErrors = useMemo(() => validatePaymentForm(method, formData, catalogue?.fieldRules), [method, formData, catalogue]);
    const formValid = Boolean(method) && Object.keys(formErrors).length === 0;
    const fieldErrors = useMemo(() => ({
        ...Object.fromEntries(Object.entries(formErrors).filter(([field]) => touched[field])),
        ...serverErrors,
    }), [formErrors, touched, serverErrors]);
    const missing = useMemo(() => {
        if (!method) return [];
        const labels = (method.fields || [])
            .filter((field) => FIELD_LABEL_KEYS[field] && formErrors[catalogue?.fieldRules?.[field]?.request])
            .map((field) => t(FIELD_LABEL_KEYS[field]));
        if (formErrors.proof_file) labels.push(t("key_proof_of_payment"));
        return labels;
    }, [method, formErrors, catalogue]);

    /**
     * Records the payment: `buildRequest(method, formData)` gives the request (called only once the form is valid); the
     * proof reaches storage first, so the request carries payment_attachment, and a failed upload stops here.
     * `onDone(res)` runs on success; a refusal (400, 403, 404, 409 when the locked amount changed, 422) keeps everything
     * entered and shows the API's reason; field errors show next to their field.
     */
    const submit = useCallback(async ({ buildRequest, submitAction, onDone }) => {
        if (!formValid) {
            setTouched(Object.fromEntries(Object.keys(formErrors).map((field) => [field, true])));
            return;
        }
        const payload = buildRequest(method, formData);
        /* The Approval Code travels as approval_code; a blank time_code carried in from the invoice is not sent */
        delete payload.time_code;
        setLoading(true);
        if (formData.proof_file) {
            let uploadedAttachment = null;
            try {
                const up = await uploadFile([{ file: formData.proof_file, name: "invoices/payment" }]);
                if (up?.filename) uploadedAttachment = up.filename;
            } catch (e) {
                uploadedAttachment = null;
            }
            if (!uploadedAttachment) {
                setErrorMessage(t("key_failed_to_upload_file"));
                setLoading(false);
                return;
            }
            payload.payment_attachment = uploadedAttachment;
        }
        dispatch(submitAction(payload)).then((res) => {
            const status = res?.payload?.status;
            const rejected = res?.meta?.requestStatus === "rejected" || status === 400;
            if (!rejected) {
                if (status === undefined && !res?.payload?.data?.status) {
                    ShowToast("error", res?.payload?.data?.message);
                    setLoading(false);
                    return;
                }
                ShowToast("success", res?.payload?.message);
                setLoading(false);
                onDone?.(res);
                return;
            }
            const data = res?.payload?.data;
            const errMsg = [data?.error, data?.message, data?.data].find((m) => typeof m === "string" && m.trim());
            if (data?.errors && typeof data.errors === "object") setServerErrors(data.errors);
            setErrorMessage(typeof errMsg === "string" ? errMsg : "");
            ShowToast("error", errMsg);
            setLoading(false);
        });
    }, [formValid, formErrors, method, formData, dispatch]);

    return {
        catalogue, catalogueStatus, retryCatalogue, groups, method, methodCode, pickMethod, isDisabled,
        formData, updateField, fieldErrors, caps, formValid, missing, errorMessage, loading, submit,
    };
};

/**
 * The form's fields: the locked amount and the Payment Method dropdown side by side, the chosen method's fields and the
 * result note. A method the caller disables stays listed, disabled, with its reason after the name.
 */
export const PaymentEntryFields = ({ entry, amount, amountLabel, disabledReason = NONE, children = null }) => {
    const { catalogue, catalogueStatus, retryCatalogue, groups, method, methodCode, pickMethod, isDisabled, formData, updateField,
        fieldErrors, caps, loading } = entry;
    const isT1 = method?.tier === 1;
    /* the method's born status (v4 A; C-12): Cash is Pending Paid, the other review methods Pending Paid · Unapproved */
    const pendingLabel = method?.bornStatus === "pending_paid" ? t("key_pending_paid") : t("key_pending_paid_unapproved");
    return (
        <div className="pe-form">
            <div className="pe-grid">
                <div className="pe-field">
                    <label>{ amountLabel }</label>
                    <div className="input mono pe-locked"><Icon name="shield" size={ 12 } />{ formatHK(amount) }</div>
                    <div className="pe-hint">{ t("key_system_calculated_locked") }</div>
                </div>
                <div className="pe-field">
                    <label htmlFor="pe-method">{ t("key_payment_method") }</label>
                    { catalogueStatus === "loading" ? <div className="input pe-loading"><CustomSpinner variant="inline" /></div> : (
                    <div className="select">
                        <select id="pe-method" className="input" value={ methodCode } disabled={ !catalogue || loading }
                            onChange={ (e) => pickMethod(e.target.value) }>
                            { catalogue && !methodCode && <option value="" disabled>{ t("key_select_a_payment_method") }</option> }
                            { groups.map((group) => (
                                <optgroup key={ group.code } label={ t(group.labelKey) }>
                                    { group.methods.map((m) => {
                                        const reason = isDisabled(m) ? disabledReason(m) : "";
                                        return (
                                            <option key={ m.value } value={ m.value } disabled={ isDisabled(m) }>
                                                { reason ? `${ m.label } · ${ reason }` : m.label }
                                            </option>
                                        );
                                    }) }
                                </optgroup>
                            )) }
                        </select>
                    </div>
                    ) }
                </div>
            </div>

            { catalogueStatus === "failed" && (
                <div className="pm-missing pe-load-error" role="alert">
                    <Icon name="alert" size={ 13 } /><span>{ t("key_couldnt_load_this_view") }</span>
                    <Btn variant="ghost" onClick={ retryCatalogue }>{ t("key_retry") }</Btn>
                </div>
            ) }

            { method && (
                <div className="pe-fields">
                    <PaymentFields resolvedMethod={ method } formData={ formData } updateField={ updateField } fieldErrors={ fieldErrors }
                        fieldCaps={ caps } proofFile={ catalogue?.proofFile } />
                </div>
            ) }

            { method && (
                <div className={ "pm-resultnote pe-resultnote " + (isT1 ? "paid" : "pending") }>
                    { isT1
                        ? <>{ t("key_on_confirm") }: <strong>{ t("key_paid_approved") }</strong>. { t("key_paid") } <strong>{ formatHK(amount) }</strong>.</>
                        : <>{ t("key_on_record") }: <strong>{ pendingLabel }</strong>. { t("key_paid") } <strong>{ formatHK(amount) }</strong>.</> }
                </div>
            ) }

            { children }
        </div>
    );
};

PaymentEntryFields.propTypes = {
    entry: PropTypes.object.isRequired,
    amount: PropTypes.number.isRequired,
    amountLabel: PropTypes.string.isRequired,
    disabledReason: PropTypes.func,
    children: PropTypes.node,
};

/* the confirm action's wording: AlipayHK / WeChat Pay HK confirm a QR payment (Payment Method Rules v4 B-4, which titled
   their modal "Confirm QR Payment"); other card / wallet methods Confirm Payment; review methods Submit Payment */
const submitLabel = (method) => {
    if (method?.type === "qr") return t("key_confirm_qr_payment");
    return method?.tier === 1 ? t("key_confirm_payment") : t("key_submit_payment");
};

/**
 * The form's actions: on the left the API's refusal, else the caller's blocking note (e.g. Reservation Fee details), else
 * "Required: ..."; then Cancel (a modal only) and the confirm action.
 */
export const PaymentEntryActions = ({ entry, onSubmit, onCancel = null, blockingNote = "", ready = true }) => {
    const { method, formValid, missing, errorMessage, loading } = entry;
    const note = errorMessage || blockingNote || (missing.length > 0 ? `${ t("key_required") }: ${ missing.join(" · ") }` : "");
    return (
        <>
            { note && <span className="pe-foot-note" role={ errorMessage ? "alert" : undefined }>{ note }</span> }
            { onCancel && <button type="button" className="btn btn-ghost md" onClick={ onCancel } disabled={ loading }>{ t("key_cancel") }</button> }
            <button type="button" className="btn btn-primary md" onClick={ onSubmit } disabled={ loading || !formValid || !ready }>
                <Icon name="check" size={ 13 } />{ loading ? `${ t("key_processing") }…` : submitLabel(method) }
            </button>
        </>
    );
};

PaymentEntryActions.propTypes = {
    entry: PropTypes.object.isRequired,
    onSubmit: PropTypes.func.isRequired,
    onCancel: PropTypes.func,
    blockingNote: PropTypes.string,
    ready: PropTypes.bool,
};
