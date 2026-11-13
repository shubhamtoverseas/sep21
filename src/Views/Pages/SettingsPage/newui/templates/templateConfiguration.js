import { useEffect, useState } from "react";
import { getTemplateConfiguration } from "../../../../../services/templates";
import translation from "../../../../../utils/translation";

/*
 * Send Template configuration (10 Nov 2026 package; TM01, TM05, F-16), shared by Settings → Send Template Manager and the
 * Global Chat template form. A category's configuration (settings-api GET /template/configuration) says how it is sent, on
 * which channels, which languages it must carry and — per recipient variant — exactly which dynamic fields a template written
 * for that recipient may use. It is read-only here (owner ruling Q1, 12 Nov 2026) and grants nothing: sending authority is
 * checked where a send happens.
 */

export const TEMPLATE_MODE = Object.freeze({ MANUAL: "manual", AUTOMATIC: "automatic", INTERNAL: "internal" });

/**
 * The package's send sites (template_send_sites.code). Every composer names the site it is: the server checks the sender's
 * Send Template grant for that site on the record, and logs the site with the send (settings-api S5 send gate).
 */
export const SEND_SITE = Object.freeze({
    WORKER_BIODATA_AR: "ST-01",
    WORKER_PHOTO_AR: "ST-02",
    WORKER_DOCS_PH_AR: "ST-03",
    WORKER_ASSIGN_PARTNER_PH: "ST-04",
    WORKER_DOCS_ID_AR: "ST-05",
    WORKER_ASSIGN_PARTNER_ID: "ST-06",
    WORKER_BASIC: "ST-08",
    WORKER_PASSPORT: "ST-09",
    WORKER_CONSULATE: "ST-10",
    CONTRACT_STAGE: "ST-11",
    EMPLOYER_BASIC: "ST-12",
    EMPLOYER_FAMILY: "ST-13",
    GLOBAL_CHAT: "X-01",
    WORKER_JOB_OFFER: "X-03",
    JOB_OFFER_SHARE: "X-04",
    JOB_OFFER_SHARE_WORKER: "X-05",
    CONTRACT_RAIL: "X-07",
    CALENDAR_TASK: "X-08",
    EXTEND_VISA: "X-09",
});

const MODE_KEYS = { manual: "key_manual", automatic: "key_st_mode_automatic", internal: "key_st_mode_internal" };
const CHANNEL_KEYS = { in_app: "key_in_app", whatsapp: "key_whatsapp" };
const LANGUAGE_KEYS = { en: "key_english", zhh: "key_st_traditional_chinese", zh_CN: "key_simplified_chinese", id: "key_indonesian" };
const STATUS_KEYS = {
    derived: "key_st_status_derived",
    binding_unresolved: "key_st_status_binding_unresolved",
    internal_only: "key_st_status_internal_only",
    channel_held: "key_st_status_channel_held",
    producer_unresolved: "key_st_status_producer_unresolved",
};
const RECIPIENT_KEYS = {
    worker: "key_worker",
    employer: "key_employer",
    cs: "key_cs",
    partner: "key_partner",
    employer_payment: "key_st_recipient_employer_payment",
    cs_payment: "key_st_recipient_cs_payment",
    worker_arrival: "key_st_recipient_worker_arrival",
};
const FAMILY_ORDER = ["worker", "employer", "invoice_payment", "sender_partner", "interview"];
const FAMILY_KEYS = {
    worker: "key_worker",
    employer: "key_st_family_employer",
    interview: "key_st_family_interview",
    invoice_payment: "key_st_family_invoice_payment",
    sender_partner: "key_st_family_sender_partner",
};
const RENDERING_KEYS = { masked: "key_st_masked", last_four: "key_st_last_four" };

const label = (keys, value) => (keys[value] ? translation(keys[value]) : value);
export const modeLabel = (mode) => label(MODE_KEYS, mode);
export const channelLabel = (channel) => label(CHANNEL_KEYS, channel);
export const languageLabel = (code) => label(LANGUAGE_KEYS, code);
export const statusLabel = (status) => label(STATUS_KEYS, status);
export const recipientLabel = (key) => label(RECIPIENT_KEYS, key);
export const familyLabel = (family) => label(FAMILY_KEYS, family);

/** The body token a field inserts — the package's target token (E21), in the editor's existing `{{ … }}` spacing. */
export const fieldToken = (field) => `{{ ${ field.token } }}`;

/** "Worker HKID (masked)" — the rendering travels with the field (TM02). */
export const fieldOptionLabel = (field) => (RENDERING_KEYS[field.rendering] ? `${ field.name } (${ label(RENDERING_KEYS, field.rendering) })` : field.name);

export const recipientsOf = (configuration) => (Array.isArray(configuration?.recipients) ? configuration.recipients : []);

export const recipientOptions = (configuration) => recipientsOf(configuration).map((r) => ({ value: r.key, label: recipientLabel(r.key) }));

/** The only recipient a category offers, when it offers exactly one (the form selects it and the server defaults to it). */
export const singleRecipient = (configuration) => {
    const recipients = recipientsOf(configuration);
    return recipients.length === 1 ? recipients[0].key : "";
};

export const isInternal = (configuration) => configuration?.configuration?.mode === TEMPLATE_MODE.INTERNAL;

/** The fields a template written for `recipientKey` may use, grouped by family in a fixed order. */
export const recipientFieldGroups = (configuration, recipientKey) => {
    const recipient = recipientsOf(configuration).find((r) => r.key === recipientKey);
    const fields = Array.isArray(recipient?.fields) ? recipient.fields.filter((f) => f.insertable !== false) : [];
    return FAMILY_ORDER
        .map((family) => ({ family, label: familyLabel(family), fields: fields.filter((f) => f.family === family) }))
        .filter((group) => group.fields.length > 0);
};

/** One line for a refused save (settings-api 422: code + details), the fields named so the author can fix the body. */
export const saveRefusalText = (body) => {
    const details = body?.details || {};
    if (body?.code === "TEMPLATE_FIELD_NOT_ALLOWED" && Array.isArray(details.fields)) {
        return `${ translation("key_st_not_for_recipient") } ${ details.fields.map((f) => `{{${ f.token }}} (${ f.name })`).join(", ") }`;
    }
    if (body?.code === "TEMPLATE_FIELD_UNKNOWN" && Array.isArray(details.tokens)) {
        return `${ translation("key_st_unknown_fields") } ${ details.tokens.map((t) => `{{${ t }}}`).join(", ") }`;
    }
    return body?.message || "";
};

/** The current category's configuration; null while loading, without a category, or when the category has none. */
export const useTemplateConfiguration = (categoryId) => {
    const [state, setState] = useState({ configuration: null, isLoading: false, error: "" });
    useEffect(() => {
        if (!categoryId) {
            setState({ configuration: null, isLoading: false, error: "" });
            return undefined;
        }
        let active = true;
        setState({ configuration: null, isLoading: true, error: "" });
        getTemplateConfiguration({ category_id: categoryId })
            .then((res) => { if (active) setState({ configuration: res?.data?.data?.data || null, isLoading: false, error: "" }); })
            .catch((err) => {
                if (!active) return;
                const message = err?.response?.data?.message || translation("key_st_configuration_unavailable");
                setState({ configuration: null, isLoading: false, error: message });
            });
        return () => { active = false; };
    }, [categoryId]);
    return state;
};
