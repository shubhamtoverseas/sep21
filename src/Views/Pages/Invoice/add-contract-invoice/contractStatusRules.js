/**
 * Contract Status rules for a Local worker's contract section — the rules sheet
 * "MaidMatch_Local_Contract_Status_Date_Rules 22 Oct 2026.xlsx" (invoice-doc-new-functional/CONTRACT_STATUS_RULES_CHECK.md
 * §1–2). The same table the admin API checks when the worker is saved (maidmatch-admin-api-nodejs
 * src/worker/contract-status-rules.ts), with the same messages. The two existence checks (the Contract Status / the
 * reason is an active option) are answered by the server; the lists offered here only hold active options.
 */

export const CONTRACT_STATUS_FINISHED = 1;
export const CONTRACT_STATUS_TERMINATED_OTHER_REASON = 5;
const TERMINATED_STATUSES = [2, 3, 4, 5];

/** "Range: current date −14 days to +1095 days" (Field rules D5, D6) */
export const CONTRACT_DATE_PAST_DAYS = 14;
export const CONTRACT_DATE_FUTURE_DAYS = 1095;

/** The fields the Contract Status decides on (the server clears the ones a status does not ask for) */
export const CONTRACT_SECTION_FIELDS = Object.freeze(["contract_end_date", "visa_expiry_date", "expect_released_early", "early_release_date", "terminated_reason"]);

const isBlank = (v) => v === undefined || v === null || v === "";

/** A real calendar date in YYYY-MM-DD (2026-02-30 fails) */
export const isYmd = (v) => {
    if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(`${ v }T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

const addDaysYmd = (ymd, days) => {
    const d = new Date(`${ ymd }T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};

/** DD/MM/YYYY — the admin's date display */
const displayDate = (ymd) => `${ ymd.slice(8, 10) }/${ ymd.slice(5, 7) }/${ ymd.slice(0, 4) }`;

/**
 * The inclusive window for Contract End Date and Visa Expiry Date. @migration-unspecified(invoice): the sheet does not
 * say whether the ends are included or which time zone "current date" is in (Q7) — both ends are included and today is
 * the browser's date; the server uses the same date from the request's `timezone` header.
 */
export const contractDateWindow = (today) => ({
    min: addDaysYmd(today, -CONTRACT_DATE_PAST_DAYS),
    max: addDaysYmd(today, CONTRACT_DATE_FUTURE_DAYS),
});

/** The fields a Contract Status asks for (Date rules rows 1–5); none for a status outside 1–5 */
export const fieldsAskedFor = (contractStatus, expectReleasedEarly) => {
    const cs = Number(contractStatus);
    if (cs === CONTRACT_STATUS_FINISHED) {
        return String(expectReleasedEarly) === "1"
            ? ["visa_expiry_date", "expect_released_early", "early_release_date"]
            : ["visa_expiry_date", "expect_released_early"];
    }
    if (cs === CONTRACT_STATUS_TERMINATED_OTHER_REASON) return ["contract_end_date", "terminated_reason"];
    if (TERMINATED_STATUSES.includes(cs)) return ["contract_end_date"];
    return [];
};

/** The message keys (en: public/locales/en/translation.json). Only the Early Release one is sheet text (Field rules E8). */
export const CONTRACT_STATUS_MESSAGE_KEYS = Object.freeze({
    contract_status: "key_contract_status_is_required",
    visa_expiry_date: "key_visa_expiry_date_is_required",
    visa_expiry_date_invalid: "key_visa_expiry_date_is_invalid",
    visa_expiry_date_range: "key_visa_expiry_date_must_be_between",
    contract_end_date: "key_contract_end_date_is_required",
    contract_end_date_invalid: "key_contract_end_date_is_invalid",
    contract_end_date_range: "key_contract_end_date_must_be_between",
    expect_released_early: "key_early_release_applicable_is_required",
    early_release_date: "key_early_release_date_is_required",
    early_release_date_invalid: "key_early_release_date_is_invalid",
    early_release_date_before_visa: "key_early_release_date_must_be_earlier_than_visa_expiry_date",
    terminated_reason: "key_reason_is_required",
});

const datedError = (field, value, window, t) => {
    if (isBlank(value)) return t(CONTRACT_STATUS_MESSAGE_KEYS[field]);
    if (!isYmd(value)) return t(CONTRACT_STATUS_MESSAGE_KEYS[`${ field }_invalid`]);
    if (value < window.min || value > window.max) {
        return t(CONTRACT_STATUS_MESSAGE_KEYS[`${ field }_range`], { min: displayDate(window.min), max: displayDate(window.max) });
    }
    return null;
};

/**
 * { field: message } for every rule the section breaks — empty when it passes. `today` is YYYY-MM-DD; `t` is i18next's
 * t (with interpolation). Rules: Contract Status always required for a Local worker; Finished / About to Finish — Visa
 * Expiry Date required + window, Early Release Applicable ? an explicit Yes/No, Early Release Date required when Yes and
 * strictly earlier than the Visa Expiry Date (equal dates fail); the four Terminated statuses — Contract End Date
 * required + window; Terminated for Other Reason — Please select reason required.
 */
export const contractStatusErrors = (values, today, t) => {
    const errors = {};
    if (isBlank(values?.contract_status)) {
        errors.contract_status = t(CONTRACT_STATUS_MESSAGE_KEYS.contract_status);
        return errors;
    }
    const window = contractDateWindow(today);
    const asked = fieldsAskedFor(values.contract_status, values.expect_released_early);
    for (const field of ["contract_end_date", "visa_expiry_date"]) {
        if (!asked.includes(field)) continue;
        const error = datedError(field, values[field], window, t);
        if (error) errors[field] = error;
    }
    if (asked.includes("expect_released_early") && !["0", "1"].includes(String(values.expect_released_early ?? ""))) {
        errors.expect_released_early = t(CONTRACT_STATUS_MESSAGE_KEYS.expect_released_early);
    }
    if (asked.includes("early_release_date")) {
        const erd = values.early_release_date;
        if (isBlank(erd)) errors.early_release_date = t(CONTRACT_STATUS_MESSAGE_KEYS.early_release_date);
        else if (!isYmd(erd)) errors.early_release_date = t(CONTRACT_STATUS_MESSAGE_KEYS.early_release_date_invalid);
        else if (isYmd(values.visa_expiry_date) && erd >= values.visa_expiry_date) {
            errors.early_release_date = t(CONTRACT_STATUS_MESSAGE_KEYS.early_release_date_before_visa);
        }
    }
    if (asked.includes("terminated_reason") && isBlank(values.terminated_reason)) {
        errors.terminated_reason = t(CONTRACT_STATUS_MESSAGE_KEYS.terminated_reason);
    }
    return errors;
};

/** The payload without the section fields its Contract Status does not ask for */
export const withoutFieldsNotAsked = (payload) => {
    const asked = fieldsAskedFor(payload.contract_status, payload.expect_released_early);
    const out = { ...payload };
    CONTRACT_SECTION_FIELDS.forEach((field) => { if (!asked.includes(field)) delete out[field]; });
    return out;
};

/** The section field a server refusal belongs to: the API's `errors` map, keyed by field */
export const serverFieldErrors = (rejection) => {
    const errors = rejection?.errors;
    if (!errors || typeof errors !== "object") return {};
    return Object.fromEntries(Object.entries(errors).filter(([field, message]) => typeof message === "string"
        && (field === "contract_status" || CONTRACT_SECTION_FIELDS.includes(field))));
};
