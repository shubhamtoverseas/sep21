import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { sendOtp } from "../../../../redux/Slices/employer/EmployerSlice";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { formatDateTime } from "../../../../services/commonService";
import translation from "../../../../utils/translation";
import { OTP_RESEND_SECONDS, OTP_SOURCE, OTP_TYPE } from "./employerNewUiConstants";

/*
 * WhatsApp OTP for contact phone fields (work order 22 Oct: contact changes need OTP verification; backend rule unchanged —
 * a CHANGED number saves only with `<field>_verified: 1` + `<field>_verified_at` and an OTP log for that exact value).
 * One hook for any number of fields: `fields` = [{ key, verificationType, payloadKey, kind? }], `saved` / `current` = { [key]: { cc, number } }
 * — or, for `kind: "email"` (worker contact edit, 26 Oct), { [key]: { value } } compared as an exact string and sent as `send_to` alone.
 * `source` names the caller for the OTP log (default: the employer form).
 * send → POST /send-otp type 1 { send_to, send_to_country_code, verification_type }; verify → type 2 + otp.
 * A field counts as verified while its current value equals the value whose code was verified in this session.
 */
const norm = (v) => String(v ?? "").replace(/\D/g, "");
const isEmail = (field) => field?.kind === "email";
/* the identity of a value: the exact address, or country code + digits */
const identOf = (field, v) => (isEmail(field) ? String(v?.value ?? "").trim().toLowerCase() : `${ String(v?.cc || "") }|${ norm(v?.number) }`);
const hasValueOf = (field, v) => (isEmail(field) ? Boolean(String(v?.value ?? "").trim()) : Boolean(norm(v?.number)));
const labelOf = (field, v) => (isEmail(field) ? String(v?.value ?? "").trim() : `${ v?.cc || "" } ${ norm(v?.number) }`.trim());

/* `name` = the person's name for the e-mail template (worker contact edit, v2 26 Oct) */
const useContactOtp = ({ fields, saved, current, source = OTP_SOURCE, name = "" }) => {
    const dispatch = useDispatch();
    const [sent, setSent] = useState({});          // key → { ident, label }
    const [verifiedFor, setVerifiedFor] = useState({}); // key → { ident, at }
    const [seconds, setSeconds] = useState({});    // key → resend countdown
    const [busyKey, setBusyKey] = useState(null);
    const otps = useRef({});

    useEffect(() => {
        if (!Object.values(seconds).some((s) => s > 0)) return undefined;
        const timer = setTimeout(() => setSeconds((prev) => Object.fromEntries(Object.entries(prev).map(([k, s]) => [k, Math.max(0, s - 1)]))), 1000);
        return () => clearTimeout(timer);
    }, [seconds]);

    const payloadFor = useCallback((field, type, otp) => ({
        type,
        source,
        ...(isEmail(field)
            ? { send_to: String(current[field.key]?.value ?? "").trim(), ...(name ? { name } : {}) }
            : { send_to: norm(current[field.key]?.number), send_to_country_code: String(current[field.key]?.cc || "") }),
        verification_type: field.verificationType,
        ...(otp ? { otp } : {}),
    }), [current, source, name]);

    const handle = useCallback((res, onOk) => {
        if (res?.payload?.status) { if (res.payload.message) ShowToast("success", res.payload.message); onOk(res.payload); return true; }
        ShowToast("error", res?.payload?.message || translation("key_something_went_wrong"));
        return false;
    }, []);

    const send = useCallback(async (key) => {
        const field = fields.find((f) => f.key === key);
        if (!field || (seconds[key] || 0) > 0 || !hasValueOf(field, current[key]) || (!isEmail(field) && !current[key]?.cc)) return;
        setBusyKey(key);
        const res = await dispatch(sendOtp(payloadFor(field, OTP_TYPE.SEND)));
        setBusyKey(null);
        handle(res, () => {
            setSent((prev) => ({ ...prev, [key]: { ident: identOf(field, current[key]), label: labelOf(field, current[key]) } }));
            setSeconds((prev) => ({ ...prev, [key]: OTP_RESEND_SECONDS }));
        });
    }, [fields, seconds, current, dispatch, payloadFor, handle]);

    const verify = useCallback(async (key) => {
        const field = fields.find((f) => f.key === key);
        const otp = otps.current[key];
        if (!field || !otp) { ShowToast("error", translation("key_enter_code")); return; }
        setBusyKey(key);
        const res = await dispatch(sendOtp(payloadFor(field, OTP_TYPE.VERIFY, otp)));
        setBusyKey(null);
        handle(res, (payload) => {
            setVerifiedFor((prev) => ({ ...prev, [key]: { ident: identOf(field, current[key]), at: payload?.data?.verified_at || formatDateTime(new Date()) } }));
            setSent((prev) => { const next = { ...prev }; delete next[key]; return next; });
            otps.current[key] = "";
        });
    }, [fields, current, dispatch, payloadFor, handle]);

    /** Cancel the replacement: forget the code row; the caller restores the saved number */
    const cancel = useCallback((key) => {
        setSent((prev) => { const next = { ...prev }; delete next[key]; return next; });
        setSeconds((prev) => ({ ...prev, [key]: 0 }));
        otps.current[key] = "";
    }, []);
    const setOtp = useCallback((key, value) => { otps.current[key] = value; }, []);

    const state = useMemo(() => Object.fromEntries(fields.map((f) => {
        const cur = current[f.key] || {};
        const ident = identOf(f, cur);
        const hasValue = hasValueOf(f, cur);
        const changed = hasValue && ident !== identOf(f, saved[f.key] || {});
        const verified = changed && Boolean(verifiedFor[f.key]) && ident === verifiedFor[f.key].ident;
        const codeSent = Boolean(sent[f.key]) && ident === sent[f.key].ident;
        return [f.key, {
            changed, verified, verifiedAt: verified ? verifiedFor[f.key].at : null, codeSent, sentTo: codeSent ? sent[f.key].label : "",
            resendSeconds: seconds[f.key] || 0, busy: busyKey === f.key, savedUnchanged: hasValue && !changed,
        }];
    })), [fields, current, saved, verifiedFor, sent, seconds, busyKey]);

    const unverifiedChanged = useMemo(() => fields.filter((f) => state[f.key].changed && !state[f.key].verified).map((f) => f.key), [fields, state]);
    /** `<payloadKey>_verified: 1` + `_verified_at` for a changed field verified in this session; nothing otherwise */
    const flagsFor = useCallback((key) => {
        const field = fields.find((f) => f.key === key);
        const s = state[key];
        if (!field || !s?.verified) return {};
        return { [`${ field.payloadKey }_verified`]: 1, [`${ field.payloadKey }_verified_at`]: s.verifiedAt };
    }, [fields, state]);

    return { state, unverifiedChanged, send, verify, cancel, setOtp, flagsFor };
};

export default useContactOtp;
