import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import { Field, SelectBox, TextInput } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import translation from "../../../../utils/translation";
import { useReferenceQuery } from "../../../../hooks/useReferenceQuery";
import { fetchCountries } from "../../../../redux/Slices/common/countries/CountriesSlice";
import { updateUserContact } from "../../../../redux/Slices/worker/WorkerSlice";
import EmployerDuplicateWarning from "../../Employer/newui/EmployerDuplicateWarning";
import useContactOtp from "../../Employer/newui/useContactOtp";
import { ContactBadge, OtpRow, OtpSavedNote } from "../../Employer/newui/ContactOtpRow";
import otpStyles from "../../Employer/newui/NewEmployerModal.module.css";
import {
    CONTACT_OTP_COPY, CONTACT_OTP_FIELDS, CONTACT_VERIFY_CODE, EMPLOYER_CONFIRM_DUPLICATE_FIELD, EMPLOYER_DUPLICATE_COPY, EMPLOYER_SAVE_CODE, EMPLOYER_TITLE_OPTIONS,
} from "../../Employer/newui/employerNewUiConstants";
import { CR_CONTACT_FIELD_MAX, CR_CONTACT_MODULE_KEY, CR_CONTACT_TYPE, CR_DUPLICATE_WARNING_CLASSES } from "../contractConstants";

/**
 * Employer Contact Details · Edit on the Contract record rail (PERM §6.7; backend K-14): POST /update-contact-details with
 * `module_key: "contract"` + `contract_id`, so the server walks the contract ladder and re-checks at commit.
 * Work order 22 Oct (contact changes need OTP): Email is display-only here — never sent (changes go through the employer
 * app's own verification). Mobile / WhatsApp / Alternate mobile: a changed number needs its WhatsApp code verified
 * (Send OTP → code row → Verify) before Save; the payload carries `<field>_verified: 1` + `_verified_at` only for a field
 * changed and verified in this session, unchanged numbers travel as they are. Save with an unverified replacement does not
 * call the API — the prototype banner shows and the field is highlighted. The three `delete_*` flags are set when a present
 * value is cleared. E-1 / U-0032: a duplicate phone answers 200 + `DUPLICATE_MOBILE` — the dialog shows the matches and either
 * resends with `confirm_duplicate: true` (Save anyway) or returns to the form (Back).
 */
const str = (v) => (v === null || v === undefined ? "" : String(v));
const draftOf = (d) => ({
    title: str(d?.employer_title), name: str(d?.employer_only_name), surname: str(d?.employer_surname), chinese_name: str(d?.employer_chinese_name),
    country_code: str(d?.employer_country_code), mobile_number: str(d?.employer_mobile_number),
    whatsapp_country_code: str(d?.employer_whatsapp_country_code), whatsapp_number: str(d?.employer_whatsapp_number),
    email: str(d?.employer_email),
    alternate_mobile_country_code: str(d?.employer_alternate_mobile_country_code), alternate_mobile_number: str(d?.employer_alternate_mobile_number),
});
const numOrNull = (v) => (str(v).trim() ? Number(String(v).replace(/\D/g, "")) || null : null);
const orNull = (v) => (str(v).trim() ? str(v).trim() : null);
/* draft keys per OTP field */
const PHONE = { mobile: { cc: "country_code", number: "mobile_number" }, whatsapp: { cc: "whatsapp_country_code", number: "whatsapp_number" }, alternate: { cc: "alternate_mobile_country_code", number: "alternate_mobile_number" } };
const phoneOf = (draft) => Object.fromEntries(Object.entries(PHONE).map(([k, f]) => [k, { cc: draft[f.cc], number: draft[f.number] }]));
const savedLabel = (stored, key) => `${ stored[PHONE[key].cc] } ${ stored[PHONE[key].number] }`.trim();

const EmployerContactDialog = ({ contractId, contractDetails, onClose, onSaved }) => {
    const dispatch = useDispatch();
    const stored = useMemo(() => draftOf(contractDetails), [contractDetails]);
    const [draft, setDraft] = useState(stored);
    const [tried, setTried] = useState(false);
    const [busy, setBusy] = useState(false);
    const [serverError, setServerError] = useState("");
    const [verifyErrors, setVerifyErrors] = useState({});   // key → true (a changed number without a verified code)
    const [duplicate, setDuplicate] = useState(null);
    const { data: countriesData } = useReferenceQuery(["ref", "countries", "employer"], () => dispatch(fetchCountries({ type: "employer" })).unwrap());
    const countries = useMemo(() => (Array.isArray(countriesData) ? countriesData : []), [countriesData]);
    const saved = useMemo(() => phoneOf(stored), [stored]);
    const current = useMemo(() => phoneOf(draft), [draft]);
    const otp = useContactOtp({ fields: CONTACT_OTP_FIELDS, saved, current });

    const set = (key) => (e) => { const v = e?.target ? e.target.value : e; setDraft((s) => ({ ...s, [key]: v })); setServerError(""); setVerifyErrors({}); };
    const restore = (key) => { otp.cancel(key); setDraft((s) => ({ ...s, [PHONE[key].cc]: stored[PHONE[key].cc], [PHONE[key].number]: stored[PHONE[key].number] })); setVerifyErrors({}); };

    const errors = useMemo(() => {
        const e = {};
        if (tried) {
            if (!draft.title) e.title = translation("key_required");
            if (!draft.name.trim()) e.name = translation("key_required");
            if (!draft.surname.trim()) e.surname = translation("key_required");
            if (!draft.country_code || !draft.mobile_number.trim()) e.mobile = translation("key_required");
            if (draft.whatsapp_number.trim() && !draft.whatsapp_country_code) e.whatsapp = translation("key_country_code");
            if (draft.alternate_mobile_number.trim() && !draft.alternate_mobile_country_code) e.alternate = translation("key_country_code");
        }
        Object.keys(verifyErrors).forEach((k) => { e[k] = e[k] || translation(CONTACT_OTP_COPY.pending); });
        return e;
    }, [tried, draft, verifyErrors]);

    const send = useCallback(async (payload) => {
        setBusy(true); setServerError("");
        const res = await dispatch(updateUserContact(payload));
        setBusy(false);
        if (!res?.error && res?.payload?.status === false && res?.payload?.code === EMPLOYER_SAVE_CODE.DUPLICATE_MOBILE) {
            setDuplicate({ ...(res.payload.data || {}), message: res.payload.message, payload });
            return;
        }
        setDuplicate(null);
        if (res?.error || res?.payload?.status === false) {
            /* VERIFY_MOBILE / VERIFY_WHATSAPP / …: the banner names it and the field is highlighted */
            const field = CONTACT_VERIFY_CODE[res?.payload?.code];
            if (field && field !== "email") setVerifyErrors({ [field]: true });
            setServerError(res?.payload?.message || translation("key_something_went_wrong"));
            return;
        }
        ShowToast("success", res?.payload?.message || translation("key_success"));
        onSaved();
        onClose();
    }, [dispatch, onSaved, onClose]);

    const save = useCallback(() => {
        setTried(true);
        const e = {};
        if (!draft.title || !draft.name.trim() || !draft.surname.trim() || !draft.country_code || !draft.mobile_number.trim()) e.required = true;
        if (draft.whatsapp_number.trim() && !draft.whatsapp_country_code) e.whatsapp = true;
        if (draft.alternate_mobile_number.trim() && !draft.alternate_mobile_country_code) e.alternate = true;
        if (Object.keys(e).length) return;
        /* a changed number without its verified code never reaches the API */
        if (otp.unverifiedChanged.length) {
            setVerifyErrors(Object.fromEntries(otp.unverifiedChanged.map((k) => [k, true])));
            setServerError(translation(CONTACT_OTP_COPY.unverifiedBanner));
            return;
        }
        const payload = {
            module_key: CR_CONTACT_MODULE_KEY, contract_id: Number(contractId), type: CR_CONTACT_TYPE.EMPLOYER,
            id: contractDetails?.employer_id, user_id: contractDetails?.employer_user_id,
            title: draft.title, name: draft.name.trim(), surname: draft.surname.trim(), chinese_name: orNull(draft.chinese_name),
            country_code: draft.country_code, mobile_number: numOrNull(draft.mobile_number), ...otp.flagsFor("mobile"),
            whatsapp_country_code: orNull(draft.whatsapp_number) ? draft.whatsapp_country_code : null, whatsapp_number: numOrNull(draft.whatsapp_number), ...otp.flagsFor("whatsapp"),
            alternate_mobile_country_code: orNull(draft.alternate_mobile_number) ? draft.alternate_mobile_country_code : null, alternate_mobile_number: numOrNull(draft.alternate_mobile_number), ...otp.flagsFor("alternate"),
            /* a value the record held and the form cleared */
            delete_alternate_mobile: stored.alternate_mobile_number && !orNull(draft.alternate_mobile_number) ? 1 : 0,
            delete_whatsapp: stored.whatsapp_number && !orNull(draft.whatsapp_number) ? 1 : 0,
        };
        send(payload);
    }, [draft, stored, contractId, contractDetails, otp, send]);

    const confirmDuplicate = useCallback(() => {
        if (duplicate) send({ ...duplicate.payload, [EMPLOYER_CONFIRM_DUPLICATE_FIELD]: true });
    }, [duplicate, send]);
    const backFromDuplicate = useCallback(() => setDuplicate(null), []);

    const CountryCode = ({ id, value, onChange }) => (
        <SelectBox id={ id } value={ value } disabled={ busy } onChange={ onChange } aria-label={ translation("key_country_code") }>
            <option value="">{ translation("key_country_code") }</option>
            { countries.map((c) => <option key={ c.code } value={ c.code }>{ c.name } {c.code}</option>) }
        </SelectBox>
    );
    CountryCode.propTypes = { id: PropTypes.string.isRequired, value: PropTypes.string, onChange: PropTypes.func.isRequired };

    /* the OTP block under a changed phone: Send OTP link, then the code row + the saved-number note */
    const otpBlock = (key, labelKey) => {
        const s = otp.state[key];
        if (!s?.changed || s.verified) return null;
        if (!s.codeSent) return <button type="button" className={ otpStyles.linkBtn } disabled={ busy || s.busy } onClick={ () => otp.send(key) }>{ translation("key_send_otp") }</button>;
        return (
            <>
                <OtpRow onOtpChange={ (v) => otp.setOtp(key, v) } onVerify={ () => otp.verify(key) } onResend={ () => otp.send(key) } onCancel={ () => restore(key) } resendSeconds={ s.resendSeconds } sentTo={ s.sentTo } busy={ s.busy } />
                { savedLabel(stored, key) && <OtpSavedNote fieldLabel={ translation(labelKey) } savedNumber={ savedLabel(stored, key) } /> }
            </>
        );
    };
    const phoneField = (key, labelKey, id, required, error) => (
        <Field label={ translation(labelKey) } htmlFor={ id } required={ required } error={ error } trailing={ <ContactBadge state={ otp.state[key] } /> }>
            <div className="mcdt-phone">
                <CountryCode id={ `${ id }-cc` } value={ draft[PHONE[key].cc] } onChange={ set(PHONE[key].cc) } />
                <TextInput id={ id } inputMode="numeric" value={ draft[PHONE[key].number] } maxLength={ CR_CONTACT_FIELD_MAX.PHONE } disabled={ busy } invalid={ Boolean(error) } onChange={ set(PHONE[key].number) } />
            </div>
            { otpBlock(key, labelKey) }
        </Field>
    );

    return (
        <Modal title={ translation("key_employer_contact_details") } width={ 600 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="mcdt-dlg"
            footer={ duplicate ? (
                <>
                    <span className="grow" />
                    <Btn variant="secondary" type="button" disabled={ busy } onClick={ backFromDuplicate }>{ translation("key_back") }</Btn>
                    <Btn variant="primary" type="button" disabled={ busy } onClick={ confirmDuplicate }>{ busy ? `${ translation("key_loading") }…` : EMPLOYER_DUPLICATE_COPY.saveAnyway }</Btn>
                </>
            ) : (
                <>
                    <span className="grow" />
                    <Btn variant="secondary" type="button" disabled={ busy } onClick={ onClose }>{ translation("key_cancel") }</Btn>
                    <Btn variant="primary" type="button" disabled={ busy } onClick={ save }>{ busy ? `${ translation("key_loading") }…` : translation("key_save_changes") }</Btn>
                </>
            ) }>
            { duplicate ? <EmployerDuplicateWarning warning={ duplicate } classes={ CR_DUPLICATE_WARNING_CLASSES } /> : (
            <>
            { serverError && <div className="note danger" role="alert">{ serverError }</div> }
            <div className="mcdt-cform">
            <div className="mcdt-cform-name">
                <Field label={ translation("key_title") } htmlFor="cr-ec-title" required error={ errors.title }>
                    <SelectBox id="cr-ec-title" value={ draft.title } disabled={ busy } invalid={ Boolean(errors.title) } onChange={ set("title") }>
                        <option value="">{ translation("key_select") }</option>
                        { EMPLOYER_TITLE_OPTIONS.map((o) => <option key={ o.value } value={ o.value }>{ o.key ? translation(o.key) : o.label }</option>) }
                    </SelectBox>
                </Field>
                <Field label={ translation("key_name") } htmlFor="cr-ec-name" required error={ errors.name }>
                    <TextInput id="cr-ec-name" value={ draft.name } maxLength={ CR_CONTACT_FIELD_MAX.NAME } disabled={ busy } invalid={ Boolean(errors.name) } onChange={ set("name") } />
                </Field>
                <Field label={ translation("key_surname") } htmlFor="cr-ec-surname" required error={ errors.surname }>
                    <TextInput id="cr-ec-surname" value={ draft.surname } maxLength={ CR_CONTACT_FIELD_MAX.NAME } disabled={ busy } invalid={ Boolean(errors.surname) } onChange={ set("surname") } />
                </Field>
            </div>
                <Field label={ translation("key_chinese_name") } htmlFor="cr-ec-zh" className="span2">
                    <TextInput id="cr-ec-zh" lang="zh-HK" value={ draft.chinese_name } maxLength={ CR_CONTACT_FIELD_MAX.NAME } disabled={ busy } onChange={ set("chinese_name") } />
                </Field>
                { phoneField("mobile", "key_mobile_number", "cr-ec-mobile", true, errors.mobile) }
                { phoneField("whatsapp", "key_whatsapp_number", "cr-ec-wa", false, errors.whatsapp) }
                { phoneField("alternate", "key_alternate_mobile_number", "cr-ec-alt", false, errors.alternate) }
                <Field label={ translation("key_email") } hint={ translation(CONTACT_OTP_COPY.emailReadOnly) }>
                    <div className="mcdt-ro text">{ stored.email || "—" }</div>
                </Field>
            </div>
            </>
            ) }
        </Modal>
    );
};

EmployerContactDialog.propTypes = {
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    contractDetails: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onSaved: PropTypes.func.isRequired,
};

export default EmployerContactDialog;
