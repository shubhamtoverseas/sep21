import { CR_VISA_FIELD_LABEL_KEYS, CR_VISA_LEGACY_PROVENANCE } from "../contractConstants";

/* Details → Visa History (prototype b30DetVisaCard / visaHistToggle): pure readers over the issuance-history rows.
   B-2: `confirmed_by` is a user id and the name travels as `confirmed_by_name`; values read from `effective`, then `base`,
   then the row itself. A version without actor metadata (legacy provenance) has no actor. */
export const issuanceValueOf = (version, key) => version?.effective?.[key] ?? version?.base?.[key] ?? version?.[key] ?? "";
export const issuanceBaseOf = (version, key) => version?.base?.[key] ?? version?.[key] ?? "";

export const issuanceValues = (version, layer = "effective") => {
    const pick = layer === "base" ? issuanceBaseOf : issuanceValueOf;
    const pay = pick(version, "e_visa_payment_date");
    return {
        ref: pick(version, "visa_reference_no"),
        pay,
        release: pick(version, "visa_release_date") || pay,   /* Release is derived — always the effective E-Visa Payment Date */
        expiry: pick(version, "visa_expiry_date"),
        entry: pick(version, "entry_visa_expiry_date"),
    };
};

export const issuanceActorName = (version) => {
    if (!version || version.provenance === CR_VISA_LEGACY_PROVENANCE) return "";
    return version.confirmed_by_name || version.confirmed_by?.name || version.actor?.name || (typeof version.actor === "string" ? version.actor : "") || "";
};

export const issuanceCaseRef = (version) => version?.ordinal || version?.extend_visa_case_id || version?.originating_case_id || null;

export const latestIssuance = (versions) => (versions || []).reduce((best, v) => (best === null || Number(v.version) > Number(best.version) ? v : best), null);

/* a correction row names its field by the API key (`visa_reference_no` …) or the prototype short code (`ref` / `pay` / `expiry`) */
export const correctionLabelKey = (field) => CR_VISA_FIELD_LABEL_KEYS[String(field || "").toLowerCase()] || null;
export const isDateCorrection = (field) => /date|expiry|pay/i.test(String(field || "")) && !/reference|ref$/i.test(String(field || ""));
