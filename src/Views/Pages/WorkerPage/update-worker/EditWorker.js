import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm } from "react-hook-form";
import PropTypes from "prop-types";
import { updateWorkerBasicDetailInfo, updateWorkerNameContactOverseas } from "../add-worker/addWorkerSchema";
import { workerBasicProfileUpdate } from "../../../../components/ReusableComponents/form-states";
import { fetchCountriesGeneral } from "../../../../redux/Slices/common/countries/CountriesSlice";
import { updateWorkerDetailsSlice, fetchWorkerDetailTabInfo } from "../../../../redux/Slices/worker/WorkerSlice";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import useDuplicateEmailCheck from "../../../../hooks/useDuplicateEmailCheck";
import { handleMobileInput, handleOtpInputChange } from "../../../../services/commonService";
import translation from "../../../../utils/translation";
import useContactOtp from "../../Employer/newui/useContactOtp";
import { OTP_CODE_LENGTH } from "../../Employer/newui/employerNewUiConstants";
import {
    EDIT_WORKER_FIELD_LABELS, EDIT_WORKER_CLEARABLE_FIELDS, STALE_VERSION_CODE,
    WORKER_CONTACT_OTP_FIELDS, WORKER_CONTACT_OTP_COPY, WORKER_CONTACT_REFUSAL_FIELD, WORKER_OTP_SOURCE,
} from "../workerModuleConstants";

const verifiedTick = (
    <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="#186a3b" strokeWidth="2.4" aria-hidden="true">
        <path d="M3 8.5 6.5 12 13 5" />
    </svg>
);

const bannerIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#b42318" strokeWidth="1.7" aria-hidden="true">
        <circle cx="8" cy="8" r="6.4" /><path d="M8 5v4M8 11h.01" />
    </svg>
);

/* the form's contact values as the OTP hook reads them (email = the string; phones = country code + number) */
const contactOf = (v) => ({
    email: { value: String(v?.email ?? "") },
    mobile: { cc: v?.country_code ?? "", number: v?.mobile_number ?? "" },
    whatsapp: { cc: v?.whatsapp_country_code ?? "", number: v?.whatsapp_number ?? "" },
});
const FORM_KEYS = { email: ["email"], mobile: ["country_code", "mobile_number"], whatsapp: ["whatsapp_country_code", "whatsapp_number"] };
const fieldOf = (key) => WORKER_CONTACT_OTP_FIELDS.find((f) => f.key === key);
const fieldLabel = (key) => translation(fieldOf(key)?.labelKey || key);

/*
 * Edit Worker (Worker Details → Contact and communication → Contact details → Edit). Work order 26 Oct: a CHANGED Email /
 * Mobile / WhatsApp saves only with its OTP (`POST /send-otp` type 1 → code → type 2) and the `<field>_verified: 1` +
 * `<field>_verified_at` pair for that exact value; unchanged values travel exactly as read; "" clears Email / WhatsApp
 * without a code (W-43); Mobile cannot be cleared (U-0340, the server refuses). The OTP block is the shared employer one.
 */
const EditWorker = ({ onClose, workerDetailTabInfo, onRefreshWorkerInfo, workerType }) => {
    const dispatch = useDispatch();
    const { worker_id } = useParams();
    const isOverseas = (workerType ?? workerDetailTabInfo?.type) === 2;
    const { workerContriesGeneral } = useSelector((state) => ({
        workerContriesGeneral: state.countries.workerContriesGeneral,
    }), shallowEqual);
    const [showBanner, setShowBanner] = useState(false);
    const [verifyBanner, setVerifyBanner] = useState("");      /* a changed contact without its verified code, or a server refusal */
    const [verifyErrors, setVerifyErrors] = useState({});      /* key → true: the field to highlight */
    const [saving, setSaving] = useState(false);
    const bannerRef = useRef(null);

    const {
        handleSubmit,
        setError,
        clearErrors,
        setValue,
        watch,
        reset,
        control,
        formState: { errors, isDirty },
    } = useForm({
        resolver: yupResolver(isOverseas ? updateWorkerNameContactOverseas : updateWorkerBasicDetailInfo),
        defaultValues: workerBasicProfileUpdate,
    });
    const checkEmail = useDuplicateEmailCheck(setError, clearErrors);

    const hasFetched = useRef(false);
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        if (!workerContriesGeneral?.length) dispatch(fetchCountriesGeneral({ type: "worker_only" }));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* the record is the form's baseline (so `isDirty` means "the user changed something"); a refresh of the record
     * while a draft is open never resets the draft (SR-03) */
    useEffect(() => {
        if (!workerDetailTabInfo || isDirty) return;
        const baseline = {};
        Object.keys(workerBasicProfileUpdate).forEach((key) => {
            baseline[key] = workerDetailTabInfo?.[key] || '';
        });
        reset(baseline);
    }, [workerDetailTabInfo, isDirty, reset]);

    /* OTP: saved = the record; current = the draft (watched) */
    const watched = watch(["email", "country_code", "mobile_number", "whatsapp_country_code", "whatsapp_number"]);
    const saved = useMemo(() => contactOf(workerDetailTabInfo), [workerDetailTabInfo]);
    const current = useMemo(() => contactOf({ email: watched[0], country_code: watched[1], mobile_number: watched[2], whatsapp_country_code: watched[3], whatsapp_number: watched[4] }), [watched]);
    const workerName = [workerDetailTabInfo?.name, workerDetailTabInfo?.surname].filter(Boolean).join(" ");
    const otp = useContactOtp({ fields: WORKER_CONTACT_OTP_FIELDS, saved, current, source: WORKER_OTP_SOURCE, name: workerName });
    const [codes, setCodes] = useState({});
    const restore = useCallback((key) => {
        otp.cancel(key);
        FORM_KEYS[key].forEach((name) => setValue(name, workerDetailTabInfo?.[name] || "", { shouldDirty: true }));
        setVerifyErrors((e) => { const next = { ...e }; delete next[key]; return next; });
        setVerifyBanner("");
    }, [otp, setValue, workerDetailTabInfo]);
    /* the saved value, as the note shows it (state 2 / 3): the e-mail, or country code + number */
    const savedLabel = (key) => (key === "email" ? saved.email.value : `${ saved[key].cc || "" } ${ saved[key].number || "" }`.trim());
    const showVerifyBanner = useCallback((text, keys) => {
        setVerifyBanner(text);
        setVerifyErrors(Object.fromEntries((keys || []).map((k) => [k, true])));
        setTimeout(() => bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }, []);

    const countryOptions = useMemo(() => workerContriesGeneral?.map((item, index) => (
        <option key={ index } value={ item.code }>
            { (item.country_code ? `${ item.country_code } ` : `${ item.name } `) + item.code }
        </option>
    )), [workerContriesGeneral]);

    const onSubmit = useCallback((data) => {
        setShowBanner(false);
        if (saving) return;
        /* an unchanged form writes nothing (P2 S6) */
        if (!isDirty) {
            ShowToast("error", translation('key_no_changes_to_save'));
            return;
        }
        /* a changed contact without its verified code never reaches the API */
        if (otp.unverifiedChanged.length) {
            const names = otp.unverifiedChanged.map(fieldLabel).join(" / ");
            showVerifyBanner(translation(WORKER_CONTACT_OTP_COPY.unverifiedBanner).split("{{field}}").join(names), otp.unverifiedChanged);
            return;
        }
        /* U-0408 (29 Oct, SPLIT): the worker app still logs in by mobile + OTP, so an Overseas worker's stored Mobile cannot be
           cleared until the email-OTP login is live and verified (Mike names the owner / date) */
        if (isOverseas && saved.mobile?.number && !String(data.mobile_number ?? "").trim()) {
            showVerifyBanner(translation('key_mobile_number_is_required'), ["mobile"]);
            return;
        }
        setVerifyBanner(""); setVerifyErrors({});
        /* only the panel's own fields travel (form state = the panel); hk_id and the rest of the record stay server-side */
        let payload = {
            ...data,
            worker_id: worker_id,
            user_id: workerDetailTabInfo?.user_id,
            edit_type: 'worker',
            /* batch C (W-18): the detail's version travels; a stale one is refused with 409 STALE_VERSION */
            version: workerDetailTabInfo?.version,
            /* the verified pair only for a changed field verified in this session */
            ...otp.flagsFor("email"), ...otp.flagsFor("mobile"), ...otp.flagsFor("whatsapp"),
        };
        payload.mobile_number = data.mobile_number ? Number(data.mobile_number) : "";
        payload.whatsapp_number = data.whatsapp_number ? Number(data.whatsapp_number) : "";

        /* a cleared contact field travels as "" so the server clears it (KD-01); other empties are omitted as before */
        Object.keys(payload).forEach(key => {
            if (payload[key] === null || payload[key] === undefined || (payload[key] === '' && !EDIT_WORKER_CLEARABLE_FIELDS.includes(key))) {
                delete payload[key];
            }
        });
        if (worker_id) {
            setSaving(true);
            dispatch(updateWorkerDetailsSlice(payload)).then(res => {
                setSaving(false);
                if (res?.error || res?.payload?.status === false) {
                    const code = res?.payload?.code || res?.payload?.data?.code;
                    const refused = WORKER_CONTACT_REFUSAL_FIELD[code];
                    if (refused) {
                        /* VERIFY_EMAIL / VERIFY_MOBILE_NUBER / VERIFY_WHATSAPP_NUMBER / a duplicate number: the banner names it, the field is highlighted */
                        showVerifyBanner(res?.payload?.message || translation("key_something_went_wrong"), [refused]);
                        return;
                    }
                    ShowToast("error", res?.payload?.message);
                    if (code === STALE_VERSION_CODE) {
                        /* someone else changed the record: reload it; the form is dirty so the baseline reset skips and the
                           user's edits stay for re-apply (the next Save carries the reloaded version) — never auto-retried */
                        dispatch(fetchWorkerDetailTabInfo({ worker_id, type: 'basic' }));
                    }
                } else if (Array.isArray(res?.payload?.data?.changed) && res.payload.data.changed.length === 0) {
                    /* W-18: the server wrote nothing — nothing to refresh, the drawer stays open */
                    ShowToast("error", translation('key_no_changes_to_save'));
                } else {
                    ShowToast("success", res?.payload?.message);
                    onRefreshWorkerInfo();
                    onClose();
                }
            });
        }
    }, [worker_id, workerDetailTabInfo?.user_id, workerDetailTabInfo?.version, dispatch, onRefreshWorkerInfo, onClose, saving, isDirty, otp, showVerifyBanner, isOverseas, saved]);

    const onInvalid = useCallback(() => setShowBanner(true), []);

    const missingLabels = useMemo(() => {
        const seen = [];
        Object.keys(EDIT_WORKER_FIELD_LABELS).forEach((key) => {
            if (errors[key]) {
                const label = translation(EDIT_WORKER_FIELD_LABELS[key]);
                if (!seen.includes(label)) seen.push(label);
            }
        });
        return seen;
    }, [errors]);

    const errLine = (name) => errors[name]
        ? <span className="wkd-ew-err">{ errors[name].message }</span> : null;

    const codeSelect = (name) => (
        <Controller
            name={ name }
            control={ control }
            render={ ({ field }) => (
                <select { ...field } className="wkd-ew-code" aria-label={ translation('key_select_country_code') }>
                    <option value="">--</option>
                    { countryOptions }
                </select>
            ) }
        />
    );

    /* the prototype OTP block for one contact: badge beside the label; Send code → code row (Verify · Cancel · Resend code) */
    const badge = (key) => {
        const s = otp.state[key];
        if (!s) return null;
        if (s.verified || s.savedUnchanged) return <span className="wkd-ew-chip">{ verifiedTick }{ translation('key_verified') }</span>;
        if (s.changed) return <span className="wkd-ew-chip pending">{ translation(WORKER_CONTACT_OTP_COPY.pending) }</span>;
        return null;
    };
    const sendButton = (key) => {
        const s = otp.state[key];
        if (!s?.changed || s.verified || s.codeSent) return null;
        return <button type="button" className="wkd-ew-btn" disabled={ s.busy } onClick={ () => otp.send(key) }>{ translation('key_send_code') }</button>;
    };
    /* "The saved <field> <value> is still the verified one…" while a replacement is pending or its code is out */
    const savedNote = (key) => {
        const s = otp.state[key];
        if (!s?.changed || s.verified || !savedLabel(key)) return null;
        return <span className="wkd-ew-hint">{ translation(WORKER_CONTACT_OTP_COPY.savedNote).split("{{field}}").join(fieldLabel(key)).split("{{number}}").join(savedLabel(key)) }</span>;
    };
    const otpRow = (key) => {
        const s = otp.state[key];
        if (!s?.codeSent || s.verified) return null;
        return (
            <div className="wkd-ew-otp" data-otp-field={ key }>
                <div className="wkd-ew-otp-row">
                    <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={ OTP_CODE_LENGTH }
                        className="wkd-ew-input mono"
                        aria-label={ translation('key_enter_code') }
                        value={ codes[key] || "" }
                        onChange={ (e) => handleOtpInputChange(e, OTP_CODE_LENGTH, (v) => { setCodes((c) => ({ ...c, [key]: v })); otp.setOtp(key, v); }) }
                    />
                    <button type="button" className="wkd-ew-verify" disabled={ s.busy } onClick={ () => otp.verify(key) }>{ translation('key_verify') }</button>
                    <button type="button" className="wkd-ew-btn" disabled={ s.busy } onClick={ () => restore(key) }>{ translation('key_cancel') }</button>
                </div>
                <span className="wkd-ew-hint">
                    { translation(fieldOf(key)?.sentKey) } <span className="mono">{ s.sentTo }</span>
                    { ' · ' }
                    <span
                        className={ `wkd-ew-hint-link${ s.resendSeconds > 0 || s.busy ? ' off' : '' }` }
                        role="button"
                        tabIndex={ 0 }
                        onClick={ s.resendSeconds > 0 || s.busy ? undefined : () => otp.send(key) }
                        onKeyDown={ (e) => { if ((e.key === 'Enter' || e.key === ' ') && s.resendSeconds <= 0 && !s.busy) otp.send(key); } }
                    >
                        { s.resendSeconds > 0 ? `${ translation('key_resend_code') } (${ s.resendSeconds }s)` : translation('key_resend_code') }
                    </span>
                </span>
            </div>
        );
    };
    const invalid = (key) => (verifyErrors[key] ? ' is-invalid' : '');

    return (
        <form className="w-100" onSubmit={ handleSubmit(onSubmit, onInvalid) }>
            { showBanner && missingLabels.length > 0 && (
                <div className="wkd-ew-banner" role="alert">
                    { bannerIcon }
                    <div>
                        <div className="wkd-ew-banner-title">{ translation('key_cannot_save_changes') }</div>
                        <div className="wkd-ew-banner-body">
                            { missingLabels.length } { translation(missingLabels.length > 1 ? 'key_required_fields_are_missing' : 'key_required_field_is_missing') } ({ missingLabels.join(', ') }).
                        </div>
                    </div>
                </div>
            ) }
            { verifyBanner && (
                <div className="wkd-ew-banner" role="alert" ref={ bannerRef } data-otp-banner="">
                    { bannerIcon }
                    <div>
                        <div className="wkd-ew-banner-title">{ translation('key_cannot_save_changes') }</div>
                        <div className="wkd-ew-banner-body">{ verifyBanner }</div>
                    </div>
                </div>
            ) }

            <div className="wkd-ew-sec">
                <div className="wkd-ew-seclbl">{ translation('key_name') }</div>
                <div className="wkd-ew-grid2">
                    <div className="wkd-ew-field">
                        <label className="wkd-ew-lbl req" htmlFor="wkd-ew-surname">{ translation('key_surname') }</label>
                        <Controller
                            name="surname"
                            control={ control }
                            render={ ({ field }) => (
                                <input { ...field } id="wkd-ew-surname" type="text" maxLength={ 30 } className="wkd-ew-input" />
                            ) }
                        />
                        { errLine('surname') }
                    </div>
                    <div className="wkd-ew-field">
                        <label className="wkd-ew-lbl req" htmlFor="wkd-ew-given">{ translation('key_given_names') }</label>
                        <Controller
                            name="name"
                            control={ control }
                            render={ ({ field }) => (
                                <input { ...field } id="wkd-ew-given" type="text" maxLength={ 30 } className="wkd-ew-input" />
                            ) }
                        />
                        { errLine('name') }
                    </div>
                </div>
            </div>

            <div className="wkd-ew-sec">
                <div className="wkd-ew-seclbl">{ translation('key_contact') }</div>

                <div className="wkd-ew-field" data-contact-field="mobile">
                    <div className="wkd-ew-lblrow">
                        <span className={ `wkd-ew-lbl${ isOverseas ? '' : ' req' }` }>{ translation('key_mobile') }</span>
                        { badge('mobile') }
                    </div>
                    <div className="wkd-ew-phone">
                        { codeSelect('country_code') }
                        <Controller
                            name="mobile_number"
                            control={ control }
                            render={ ({ field }) => (
                                <input { ...field } type="text" inputMode="tel" className={ `wkd-ew-input mono${ invalid('mobile') }` } aria-label={ translation('key_mobile') }
                                    onChange={ (e) => { handleMobileInput(e); field.onChange(e.target.value); } } />
                            ) }
                        />
                        { sendButton('mobile') }
                    </div>
                    { savedNote('mobile') }
                    { otpRow('mobile') }
                    { errLine('country_code') }
                    { errLine('mobile_number') }
                </div>

                <div className="wkd-ew-field" data-contact-field="whatsapp">
                    <div className="wkd-ew-lblrow">
                        <span className="wkd-ew-lbl">{ translation('key_gc_channel_meta_whatsapp_label') }</span>
                        { badge('whatsapp') }
                    </div>
                    <div className="wkd-ew-phone">
                        { codeSelect('whatsapp_country_code') }
                        <Controller
                            name="whatsapp_number"
                            control={ control }
                            render={ ({ field }) => (
                                <input { ...field } type="text" inputMode="tel" className={ `wkd-ew-input mono${ invalid('whatsapp') }` } aria-label={ translation('key_gc_channel_meta_whatsapp_label') }
                                    onChange={ (e) => { handleMobileInput(e); field.onChange(e.target.value); } } />
                            ) }
                        />
                        { sendButton('whatsapp') }
                    </div>
                    { savedNote('whatsapp') }
                    { otpRow('whatsapp') }
                    { errLine('whatsapp_number') }
                </div>

                <div className="wkd-ew-field" data-contact-field="email">
                    <div className="wkd-ew-lblrow">
                        <label className={ `wkd-ew-lbl${ isOverseas ? ' req' : '' }` } htmlFor="wkd-ew-email">{ translation('key_email') }</label>
                        { badge('email') }
                    </div>
                    <div className="wkd-ew-phone">
                        <Controller
                            name="email"
                            control={ control }
                            render={ ({ field }) => (
                                <input
                                    { ...field }
                                    id="wkd-ew-email"
                                    type="email"
                                    maxLength={ 120 }
                                    className={ `wkd-ew-input${ invalid('email') }` }
                                    onBlur={ () => checkEmail(field.value) }
                                />
                            ) }
                        />
                        { sendButton('email') }
                    </div>
                    { savedNote('email') }
                    { otpRow('email') }
                    { isOverseas ? (
                        <span className="wkd-ew-hint">{ translation('key_wkr_the_worker_s_own_address_the_registration') }</span>
                    ) : (
                        <span className="wkd-ew-hint">{ translation('key_wkr_optional_for_local_workers_the_registration_link') }</span>
                    ) }
                    { errLine('email') }
                </div>
            </div>

            <div className="wkd-ew-foot">
                <button type="button" className="wkd-ew-cancel" onClick={ () => onClose() } disabled={ saving }>{ translation('key_cancel') }</button>
                <button type="submit" className="wkd-ew-save" disabled={ saving } aria-busy={ saving }>{ saving ? translation('key_saving') : translation('key_save_changes') }</button>
            </div>
        </form>
    );
};

EditWorker.propTypes = {
    onClose: PropTypes.func.isRequired,
    workerDetailTabInfo: PropTypes.object.isRequired,
    onRefreshWorkerInfo: PropTypes.func.isRequired,
    workerType: PropTypes.number,
};

export default React.memo(EditWorker);
