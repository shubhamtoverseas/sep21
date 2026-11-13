import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { addEmployerSchema } from "../add-employer/addEmployerSchema";
import { addEmployerFormState } from "../../../../components/ReusableComponents/form-states";
import { addEmployer, sendOtp } from "../../../../redux/Slices/employer/EmployerSlice";
import { fetchCountries, fetchCountriesGeneral } from "../../../../redux/Slices/common/countries/CountriesSlice";
import { getEmployerNationalityList } from "../../../../redux/Slices/common/nationalities/NationalitiesSlice";
import { getActiveBranches } from "../../../../services/branches";
import { getWhatsappCountryList } from "../../../../redux/Slices/SendRegLinks";
import { MACAU_LOCATION_ID } from "../../../../components/ReusableComponents/constants";
import { fetchDistrictByCountryCode } from "../../../../redux/Slices/common/district/DistrictSlice";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { formatDateTime, getDeviceType, getPermissionValue, isAdminUser, showSuccessOrError } from "../../../../services/commonService";
import { useReferenceQuery } from "../../../../hooks/useReferenceQuery";
import useDuplicateEmailCheck from "../../../../hooks/useDuplicateEmailCheck";
import translation from "../../../../utils/translation";
import usePrimaryLanguages, { legacyLanguageOption, loadedPrimaryLanguage } from "./usePrimaryLanguages";
import {
    OTP_RESEND_SECONDS, OTP_SOURCE, OTP_TYPE, OTP_VERIFICATION_TYPE, CONTACT_OTP_COPY, ACTIVE_BRANCH_PARAMS, EMPTY_VERIFY, EMPTY_SNAPSHOT, FIELD_LABEL_KEYS,
    EMPLOYER_SAVE_CODE, EMPLOYER_CONFIRM_DUPLICATE_FIELD, WHATSAPP_LIST_TYPE,
} from "./employerNewUiConstants";

export { FIELD_LABEL_KEYS } from "./employerNewUiConstants";

/* E-6 / U-0039: the shared legacy schema validates `spoken_language`; the new UI validates `primary_language` instead —
   required on create, optional on edit (a legacy row may be saved without choosing; the key is then omitted) */
const newEmployerSchema = (isEdit) => addEmployerSchema.omit(["spoken_language"]).shape({
    primary_language: isEdit ? yup.string().nullable() : yup.string().required(translation("key_language_is_required")),
});

const createFormValues = () => {
    const values = { ...addEmployerFormState, location: "", primary_language: "" };
    delete values.spoken_language;
    return values;
};

const useResendTimer = () => {
    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
        if (seconds <= 0) return undefined;
        const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [seconds]);
    const start = useCallback(() => setSeconds(OTP_RESEND_SECONDS), []);
    return useMemo(() => ({ seconds, canResend: seconds <= 0, start }), [seconds, start]);
};

const buildVerifyState = (employer) => ({
    mobile_verified: employer?.mobile_verified || 0,
    mobile_verified_at: employer?.mobile_verified_at || null,
    whatsapp_verified: employer?.whatsapp_verified || 0,
    whatsapp_verified_at: employer?.whatsapp_verified_at || null,
    email_verified: employer?.email_verified || 0,
    email_verified_at: employer?.email_verified_at || null,
});

const buildSnapshot = (employer) => ({
    mobile_number: employer?.mobile_number || null,
    country_code: employer?.country_code || null,
    whatsapp_number: employer?.whatsapp_number || null,
    whatsapp_country_code: employer?.whatsapp_country_code || null,
    email: employer?.email || null,
});
const phoneLabel = (cc, number) => [cc, number].filter(Boolean).join(" ");

const employerToFormValues = (employer) => Object.keys(addEmployerFormState).reduce((values, key) => {
    if (key === 'spoken_language') return values;
    if (key === 'branch_id') values.branch_id = employer.office_location || '';
    else if (key === 'whatsapp_confirmed') values.whatsapp_confirmed = employer.whatsapp_confirmed === 1;
    else if (key === 'district') values.district = employer.district || null;
    else values[key] = employer[key] ?? addEmployerFormState[key];
    return values;
}, { location: employer.location_info?.id ?? employer.location ?? '', primary_language: loadedPrimaryLanguage(employer) });

const useNewEmployerForm = ({ onAdded, onSaved, employer = null }) => {
    const dispatch = useDispatch();
    const isEdit = Boolean(employer);
    const permissionList = useSelector((state) => state.users.permissionList);
    const languages = usePrimaryLanguages();
    const nationalities = useSelector((state) => state.nationalities.employerNationalities);
    /* audit L3: the dialog keeps its own full host-branch list — the dashboard's `currentActiveBranches` slice is filtered by
       its Location filter and would offer only Macau (or only Hong Kong) branches here */
    const { data: branchesData } = useReferenceQuery(
        ["ref", "branches", "host-active"],
        /* Priyanka 28 Oct: active-branch-list answers { data: { data: [...] } } — unwrap one level more (as handleFetchActiveBranchesFulfilled) */
        () => getActiveBranches(ACTIVE_BRANCH_PARAMS).then((response) => { const d = response?.data?.data; return Array.isArray(d) ? d : d?.data; })
    );
    const branches = useMemo(() => (Array.isArray(branchesData) ? branchesData : []), [branchesData]);
    /* audit L1 (S6): Mobile / WhatsApp country codes come from the dial-code list the registration-link dialog already uses —
       E-3 cut the employer-country list to Hong Kong + Macau, which is the Location vocabulary, not a phone rule
       (product row U-0347 may narrow this again) */
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [duplicateWarning, setDuplicateWarning] = useState(null);

    const { data: countriesData } = useReferenceQuery(
        ["ref", "countries", "employer"],
        () => dispatch(fetchCountries({ type: "employer" })).unwrap()
    );
    const countries = useMemo(() => countriesData ?? [], [countriesData]);
    /* E-13 (backend 375): dial codes come from `POST /get-countries` without `type` (every country with its code);
       `type: employer` stays Hong Kong + Macau for Location */
    const { data: dialData } = useReferenceQuery(
        ["ref", "countries", "dial"],
        () => dispatch(fetchCountriesGeneral({})).unwrap()
    );
    const dialCodes = useMemo(() => (Array.isArray(dialData) && dialData.length ? dialData : countries), [dialData, countries]);

    const schema = useMemo(() => newEmployerSchema(isEdit), [isEdit]);
    const form = useForm({
        resolver: yupResolver(schema),
        defaultValues: isEdit ? employerToFormValues(employer) : createFormValues(),
    });
    const { control, setValue, getValues, setError, clearErrors, handleSubmit, formState: { errors } } = form;

    const watchedBranchId = useWatch({ control, name: "branch_id" });
    const watchedCountryCode = useWatch({ control, name: "country_code" });
    const watchedMobile = useWatch({ control, name: "mobile_number" });
    const watchedWhatsapp = useWatch({ control, name: "whatsapp_number" });
    const watchedWhatsappCc = useWatch({ control, name: "whatsapp_country_code" });
    const watchedEmail = useWatch({ control, name: "email" });
    const watchedLocation = useWatch({ control, name: "location" });

    const [districts, setDistricts] = useState([]);
    const [districtsLoadedFor, setDistrictsLoadedFor] = useState(null);
    const [isEmailYes, setIsEmailYes] = useState(() => Boolean(employer?.email));
    const [isWhatsappSameAsMobile, setIsWhatsappSameAsMobile] = useState(() => Boolean(
        isEdit
        && employer?.whatsapp_number
        && employer.whatsapp_number === employer.mobile_number
        && employer.whatsapp_country_code === employer.country_code
    ));
    const [verifyState, setVerifyState] = useState(() => (isEdit ? buildVerifyState(employer) : EMPTY_VERIFY));
    const [snapshot, setSnapshot] = useState(() => (isEdit ? buildSnapshot(employer) : EMPTY_SNAPSHOT));
    const [sessionVerified, setSessionVerified] = useState({ mobile: false, whatsapp: false, email: false });
    const [showMobileOtp, setShowMobileOtp] = useState(false);
    const [showWhatsappOtp, setShowWhatsappOtp] = useState(false);
    const [showEmailOtp, setShowEmailOtp] = useState(false);
    const [otpSentTo, setOtpSentTo] = useState({ mobile: "", whatsapp: "", email: "" });
    const [banner, setBanner] = useState(null);
    const mobileOtp = useRef("");
    const whatsappOtp = useRef("");
    const emailOtp = useRef("");
    const mobileTimer = useResendTimer();
    const whatsappTimer = useResendTimer();
    const emailTimer = useResendTimer();

    useEffect(() => {
        dispatch(getEmployerNationalityList({ type: "employer" }));
        dispatch(getWhatsappCountryList(WHATSAPP_LIST_TYPE));
    }, [dispatch]);

    /* EMP §2.4 / prototype #loc-menu: Location (Hong Kong · Macau) is chosen, not derived; it drives the District list.
       The mobile country code only pre-fills it while nothing is chosen. */
    /* a legacy Primary Language (`primary_language_legacy`) stays selected exactly as stored, disabled, never a choice */
    const legacyLanguage = useMemo(() => (isEdit ? legacyLanguageOption(employer) : null), [isEdit, employer]);

    const selectedCountry = useMemo(
        () => countries.find((country) => country.code === watchedCountryCode) || null,
        [countries, watchedCountryCode]
    );
    const selectedLocation = useMemo(
        () => countries.find((country) => String(country.id) === String(watchedLocation)) || null,
        [countries, watchedLocation]
    );
    useEffect(() => {
        if (!watchedLocation && selectedCountry) setValue("location", String(selectedCountry.id));
    }, [watchedLocation, selectedCountry, setValue]);
    /* EMP §2.4: District is a Hong Kong field — Macau never has one, whatever the district endpoint returns (audit L17) */
    const isMacauLocation = Number(watchedLocation) === MACAU_LOCATION_ID;
    const districtNotApplicable = isMacauLocation || (Boolean(selectedLocation)
        && districtsLoadedFor === selectedLocation.country_code
        && districts.length === 0);

    useEffect(() => {
        if (!selectedLocation) { setDistricts([]); setDistrictsLoadedFor(null); return undefined; }
        let cancelled = false;
        dispatch(fetchDistrictByCountryCode(selectedLocation.country_code)).then((res) => {
            if (cancelled) return;
            const list = Array.isArray(res?.payload?.data) ? res.payload.data : [];
            setDistricts(list);
            setDistrictsLoadedFor(selectedLocation.country_code);
            if (!list.length || Number(selectedLocation.id) === MACAU_LOCATION_ID) setValue("district", null);
        });
        return () => { cancelled = true; };
    }, [selectedLocation, dispatch, setValue]);

    useEffect(() => {
        if (isWhatsappSameAsMobile) {
            setValue("whatsapp_number", watchedMobile);
            setValue("whatsapp_country_code", watchedCountryCode);
        }
    }, [isWhatsappSameAsMobile, watchedMobile, watchedCountryCode, setValue]);

    useEffect(() => {
        if (snapshot.mobile_number === null) return;
        const matches = watchedMobile === snapshot.mobile_number && watchedCountryCode === snapshot.country_code;
        setVerifyState((prev) => {
            if (matches && !prev.mobile_verified) return { ...prev, mobile_verified: 1, mobile_verified_at: formatDateTime(new Date()) };
            if (!matches && prev.mobile_verified) return { ...prev, mobile_verified: 0, mobile_verified_at: null };
            return prev;
        });
    }, [watchedMobile, watchedCountryCode, snapshot.mobile_number, snapshot.country_code]);

    /* work order 22 Oct: WhatsApp follows the same rule as Mobile — a changed number is unverified until its code is verified */
    useEffect(() => {
        if (snapshot.whatsapp_number === null) return;
        const matches = watchedWhatsapp === snapshot.whatsapp_number && watchedWhatsappCc === snapshot.whatsapp_country_code;
        setVerifyState((prev) => {
            if (matches && !prev.whatsapp_verified) return { ...prev, whatsapp_verified: 1, whatsapp_verified_at: formatDateTime(new Date()) };
            if (!matches && prev.whatsapp_verified) return { ...prev, whatsapp_verified: 0, whatsapp_verified_at: null };
            return prev;
        });
    }, [watchedWhatsapp, watchedWhatsappCc, snapshot.whatsapp_number, snapshot.whatsapp_country_code]);

    useEffect(() => {
        if (snapshot.email === null) return;
        const matches = watchedEmail === snapshot.email;
        setVerifyState((prev) => {
            if (matches && !prev.email_verified) return { ...prev, email_verified: 1, email_verified_at: formatDateTime(new Date()) };
            if (!matches && prev.email_verified) return { ...prev, email_verified: 0, email_verified_at: null };
            return prev;
        });
    }, [watchedEmail, snapshot.email]);

    useEffect(() => { if (!verifyState.mobile_verified) setShowMobileOtp(false); }, [verifyState.mobile_verified]);
    useEffect(() => { if (!verifyState.whatsapp_verified) setShowWhatsappOtp(false); }, [verifyState.whatsapp_verified]);
    useEffect(() => { if (!verifyState.email_verified) setShowEmailOtp(false); }, [verifyState.email_verified]);

    const requireField = useCallback((field) => {
        if (getValues(field)) return true;
        setError(field, { type: "manual", message: translation("key_this_field_is_required") });
        return false;
    }, [getValues, setError]);

    const handleOtpResponse = useCallback((res, onOk) => {
        if (res?.payload?.status && res?.payload?.message) {
            ShowToast("success", res.payload.message);
            onOk();
        } else if (!res?.payload?.status) {
            ShowToast("error", res?.payload?.message || translation("key_something_went_wrong"));
        }
    }, []);

    const mobileOtpPayload = useCallback((type, otp) => ({
        type,
        source: OTP_SOURCE,
        send_to: `${getValues("country_code")}${getValues("mobile_number")}`,
        verification_type: "mobile_verified",
        ...(otp && { otp }),
    }), [getValues]);

    const emailOtpPayload = useCallback((type, otp) => ({
        type,
        source: OTP_SOURCE,
        send_to: getValues("email"),
        verification_type: "email_verified",
        ...(otp && { otp }),
    }), [getValues]);

    const sendMobileOtp = useCallback(() => {
        if (showMobileOtp && !mobileTimer.canResend) return;
        const ok = [requireField("country_code"), requireField("mobile_number")].every(Boolean);
        if (!ok) return;
        clearErrors(["country_code", "mobile_number"]);
        dispatch(sendOtp(mobileOtpPayload(OTP_TYPE.SEND))).then((res) => handleOtpResponse(res, () => {
            setOtpSentTo((prev) => ({ ...prev, mobile: `${getValues("country_code")} ${getValues("mobile_number")}` }));
            setShowMobileOtp(true);
            mobileTimer.start();
        }));
    }, [showMobileOtp, mobileTimer, requireField, clearErrors, dispatch, mobileOtpPayload, handleOtpResponse, getValues]);

    const verifyMobileOtp = useCallback(() => {
        dispatch(sendOtp(mobileOtpPayload(OTP_TYPE.VERIFY, mobileOtp.current))).then((res) => handleOtpResponse(res, () => {
            setShowMobileOtp(false);
            setSnapshot((prev) => ({ ...prev, mobile_number: getValues("mobile_number"), country_code: getValues("country_code") }));
            setVerifyState((prev) => ({ ...prev, mobile_verified: 1, mobile_verified_at: formatDateTime(new Date()) }));
            setSessionVerified((prev) => ({ ...prev, mobile: true }));
        }));
    }, [dispatch, mobileOtpPayload, handleOtpResponse, getValues]);

    const whatsappOtpPayload = useCallback((type, otp) => ({
        type,
        source: OTP_SOURCE,
        send_to: getValues("whatsapp_number"),
        send_to_country_code: getValues("whatsapp_country_code"),
        verification_type: OTP_VERIFICATION_TYPE.WHATSAPP,
        ...(otp && { otp }),
    }), [getValues]);

    const sendWhatsappOtp = useCallback(() => {
        if (showWhatsappOtp && !whatsappTimer.canResend) return;
        const ok = [requireField("whatsapp_country_code"), requireField("whatsapp_number")].every(Boolean);
        if (!ok) return;
        clearErrors(["whatsapp_country_code", "whatsapp_number"]);
        dispatch(sendOtp(whatsappOtpPayload(OTP_TYPE.SEND))).then((res) => handleOtpResponse(res, () => {
            setOtpSentTo((prev) => ({ ...prev, whatsapp: phoneLabel(getValues("whatsapp_country_code"), getValues("whatsapp_number")) }));
            setShowWhatsappOtp(true);
            whatsappTimer.start();
        }));
    }, [showWhatsappOtp, whatsappTimer, requireField, clearErrors, dispatch, whatsappOtpPayload, handleOtpResponse, getValues]);

    const verifyWhatsappOtp = useCallback(() => {
        dispatch(sendOtp(whatsappOtpPayload(OTP_TYPE.VERIFY, whatsappOtp.current))).then((res) => handleOtpResponse(res, () => {
            setShowWhatsappOtp(false);
            setSnapshot((prev) => ({ ...prev, whatsapp_number: getValues("whatsapp_number"), whatsapp_country_code: getValues("whatsapp_country_code") }));
            setVerifyState((prev) => ({ ...prev, whatsapp_verified: 1, whatsapp_verified_at: formatDateTime(new Date()) }));
            setSessionVerified((prev) => ({ ...prev, whatsapp: true }));
        }));
    }, [dispatch, whatsappOtpPayload, handleOtpResponse, getValues]);

    /* Cancel the replacement: the saved number comes back (the snapshot is the last verified value) */
    const cancelMobileOtp = useCallback(() => {
        setShowMobileOtp(false);
        if (snapshot.mobile_number !== null) { setValue("mobile_number", snapshot.mobile_number); setValue("country_code", snapshot.country_code); }
    }, [snapshot.mobile_number, snapshot.country_code, setValue]);
    const cancelWhatsappOtp = useCallback(() => {
        setShowWhatsappOtp(false);
        if (snapshot.whatsapp_number !== null) { setValue("whatsapp_number", snapshot.whatsapp_number); setValue("whatsapp_country_code", snapshot.whatsapp_country_code); }
    }, [snapshot.whatsapp_number, snapshot.whatsapp_country_code, setValue]);

    const sendEmailOtp = useCallback(() => {
        if (showEmailOtp && !emailTimer.canResend) return;
        if (!requireField("email")) return;
        clearErrors(["email"]);
        dispatch(sendOtp(emailOtpPayload(OTP_TYPE.SEND))).then((res) => handleOtpResponse(res, () => {
            setOtpSentTo((prev) => ({ ...prev, email: getValues("email") }));
            setShowEmailOtp(true);
            emailTimer.start();
        }));
    }, [showEmailOtp, emailTimer, requireField, clearErrors, dispatch, emailOtpPayload, handleOtpResponse, getValues]);

    const verifyEmailOtp = useCallback(() => {
        dispatch(sendOtp(emailOtpPayload(OTP_TYPE.VERIFY, emailOtp.current))).then((res) => handleOtpResponse(res, () => {
            setShowEmailOtp(false);
            setSnapshot((prev) => ({ ...prev, email: getValues("email") }));
            setVerifyState((prev) => ({ ...prev, email_verified: 1, email_verified_at: formatDateTime(new Date()) }));
            setSessionVerified((prev) => ({ ...prev, email: true }));
        }));
    }, [dispatch, emailOtpPayload, handleOtpResponse, getValues]);

    const setEmailYes = useCallback((yes) => {
        setIsEmailYes(yes);
        if (!yes) setValue("email", "");
    }, [setValue]);

    const toggleWhatsappSameAsMobile = useCallback((checked) => {
        setIsWhatsappSameAsMobile(checked);
        if (!checked) {
            setValue("whatsapp_number", "");
            setValue("whatsapp_country_code", "");
        }
    }, [setValue]);

    const checkDuplicateEmail = useDuplicateEmailCheck(setError, clearErrors);

    const buildPayload = useCallback((data) => {
        const payload = {
            ...data,
            device_type: getDeviceType()?.id,
            whatsapp_confirmed: data.whatsapp_confirmed ? 1 : 0,
            /* audit P-33: the create dialog has no HKID field — the key travels only when the form carries it */
            ...('hk_id' in data ? { hk_id: data.hk_id ? String(data.hk_id).replace(/[()]/g, "") : "" } : {}),
            type: "employer",
        };
        /* E-6: `primary_language` not sent = unchanged — an untouched legacy placeholder or the loaded id is omitted */
        if (!data.primary_language || data.primary_language === loadedPrimaryLanguage(employer)) delete payload.primary_language;
        if (isEdit) {
            payload.employer_id = employer.employer_id ?? employer.id;
            payload.user_id = employer.employer_user_id;
        }
        if (sessionVerified.mobile) {
            payload.mobile_verified = verifyState.mobile_verified;
            payload.mobile_verified_at = verifyState.mobile_verified_at;
        } else {
            delete payload.mobile_verified;
        }
        /* WhatsApp: its own verified code — or the Mobile's when it is the same number (the OTP log holds that exact value) */
        if (sessionVerified.whatsapp) {
            payload.whatsapp_verified = verifyState.whatsapp_verified;
            payload.whatsapp_verified_at = verifyState.whatsapp_verified_at;
        } else if (isWhatsappSameAsMobile && sessionVerified.mobile) {
            payload.whatsapp_verified = verifyState.mobile_verified;
            payload.whatsapp_verified_at = verifyState.mobile_verified_at;
        } else {
            delete payload.whatsapp_verified;
        }
        if (sessionVerified.email) {
            payload.email_verified = verifyState.email_verified;
            payload.email_verified_at = verifyState.email_verified_at;
        } else {
            delete payload.email_verified;
        }
        /* work order 22 Oct: Email is display-only on Edit — never sent (changes go through the employer app's verification) */
        if (isEdit) { delete payload.email; delete payload.email_verified; delete payload.email_verified_at; }
        return payload;
    }, [sessionVerified, verifyState, isEdit, employer, isWhatsappSameAsMobile]);

    /* a changed phone whose WhatsApp code is not verified never reaches the API (prototype banner) */
    const mobileChanged = snapshot.mobile_number !== null && !(watchedMobile === snapshot.mobile_number && watchedCountryCode === snapshot.country_code);
    const whatsappChanged = !isWhatsappSameAsMobile && snapshot.whatsapp_number !== null && Boolean(watchedWhatsapp)
        && !(watchedWhatsapp === snapshot.whatsapp_number && watchedWhatsappCc === snapshot.whatsapp_country_code);
    const unverifiedChange = isEdit && ((mobileChanged && !sessionVerified.mobile) || (whatsappChanged && !sessionVerified.whatsapp));

    /* E-1 / U-0032: a duplicate phone number answers 200 + DUPLICATE_MOBILE with nothing saved; the admin reviews the matches
       and either resends the identical payload with the confirm flag or returns to the form */
    const submitPayload = useCallback((payload) => {
        setIsSubmitting(true);
        dispatch(addEmployer(payload)).then((res) => {
            setIsSubmitting(false);
            if (!res.error && res.payload?.status === false && res.payload?.code === EMPLOYER_SAVE_CODE.DUPLICATE_MOBILE) {
                setDuplicateWarning({ ...(res.payload.data || {}), message: res.payload.message, payload });
                return;
            }
            setDuplicateWarning(null);
            showSuccessOrError(res);
            if (res.error || res.payload?.status === false) {
                const message = res.payload?.data?.data?.message || res.payload?.message;
                setBanner({ missing: [], apiMessage: message || translation("key_something_went_wrong") });
                return;
            }
            if (isEdit) onSaved?.();
            else onAdded?.(res.payload?.data);
        });
    }, [dispatch, onAdded, onSaved, isEdit]);

    const confirmDuplicate = useCallback(() => {
        if (!duplicateWarning) return;
        submitPayload({ ...duplicateWarning.payload, [EMPLOYER_CONFIRM_DUPLICATE_FIELD]: true });
    }, [duplicateWarning, submitPayload]);

    const backFromDuplicate = useCallback(() => setDuplicateWarning(null), []);

    const onValid = useCallback((data) => {
        setBanner(null);
        /* SR-02: the grant is rechecked at commit, not only at the opening control */
        if (!isEdit && !(isAdminUser() || getPermissionValue(permissionList?.data, "employer", "employer_add") === "y")) {
            setBanner({ missing: [], apiMessage: translation("key_you_are_not_authorized_to_access_this_page") });
            return;
        }
        /* Location is not in the shared schema (legacy forms have no such field): required here */
        if (!data.location) {
            setError("location", { type: "manual", message: translation("key_this_field_is_required") });
            setBanner({ missing: [translation(FIELD_LABEL_KEYS.location)], apiMessage: null });
            return;
        }
        if (unverifiedChange) {
            setBanner({ missing: [], apiMessage: translation(CONTACT_OTP_COPY.unverifiedBanner) });
            return;
        }
        submitPayload(buildPayload(data));
    }, [submitPayload, buildPayload, isEdit, permissionList?.data, setError, unverifiedChange]);

    const onInvalid = useCallback((fieldErrors) => {
        const fields = Object.keys(fieldErrors);
        /* location sits outside the shared schema — the banner counted it but the field showed no inline error:
           mark it exactly as the onValid path does, so the control and the banner always agree */
        if (!getValues("location")) {
            fields.push("location");
            setError("location", { type: "manual", message: translation("key_this_field_is_required") });
        }
        const missing = fields
            .map((field) => FIELD_LABEL_KEYS[field])
            .filter(Boolean)
            .map((key) => translation(key));
        setBanner({ missing: [...new Set(missing)], apiMessage: null });
    }, [getValues, setError]);

    return {
        form,
        errors,
        lookups: { countries: dialCodes, locations: countries, languages, nationalities, branches, districts },
        derived: {
            isEdit,
            watchedBranchId,
            districtNotApplicable,
            otpSentTo,
            legacyLanguage,
            isEmailYes,
            isWhatsappSameAsMobile,
            mobileVerified: Boolean(verifyState.mobile_verified),
            whatsappVerified: Boolean(verifyState.whatsapp_verified),
            emailVerified: Boolean(verifyState.email_verified),
            mobileChanged,
            whatsappChanged,
            savedMobile: phoneLabel(snapshot.country_code, snapshot.mobile_number),
            savedWhatsapp: phoneLabel(snapshot.whatsapp_country_code, snapshot.whatsapp_number),
            savedEmail: snapshot.email || "",
            showMobileOtp,
            showWhatsappOtp,
            showEmailOtp,
            mobileResendSeconds: mobileTimer.seconds,
            whatsappResendSeconds: whatsappTimer.seconds,
            emailResendSeconds: emailTimer.seconds,
            isSubmitting,
            banner,
            duplicateWarning,
        },
        actions: {
            confirmDuplicate,
            backFromDuplicate,
            setEmailYes,
            toggleWhatsappSameAsMobile,
            checkDuplicateEmail,
            sendMobileOtp,
            verifyMobileOtp,
            sendEmailOtp,
            verifyEmailOtp,
            sendWhatsappOtp,
            verifyWhatsappOtp,
            cancelMobileOtp,
            cancelWhatsappOtp,
            setMobileOtp: (value) => { mobileOtp.current = value; },
            setWhatsappOtp: (value) => { whatsappOtp.current = value; },
            setEmailOtp: (value) => { emailOtp.current = value; },
            dismissBanner: () => setBanner(null),
            submit: handleSubmit(onValid, onInvalid),
        },
    };
};

export default useNewEmployerForm;
