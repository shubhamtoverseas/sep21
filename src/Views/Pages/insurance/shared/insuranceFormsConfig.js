import configData from "../../../../components/ReusableComponents/app-configs";
import routes from "../../routes/routesConfig";
import { translation } from "../dashboard/insuranceDashboardConfig";

/* Shared by the Insurance forms (New Insurance, dialogs, invoice picker). The server decides eligibility,
   refusals and copy (TARGET_API §1); this file only formats what it returns. */

/* One key per opened form: the server refuses a second submission with the same key (DUPLICATE) */
export const newSubmissionKey = () => {
    const random = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `sub_${random}`.slice(0, 64);
};

/* Client-side required checks, run before any call. Each check is [field, isMissing, copyKey, params?]; the copy is
   the server guard's own (rules.js wording), so the browser and the server say the same thing. First miss per field wins. */
export const isBlank = (value) => value == null || String(value).trim() === "";
export const requiredErrors = (checks) => checks.reduce((acc, [field, missing, key, params]) => {
    if (missing && !acc[field]) acc[field] = translation(key, params);
    return acc;
}, {});

/* A rejected Insurance thunk → { code, message, errors: { field: copy }, duplicates } */
export const refusalOf = (res) => {
    const data = res?.payload?.data || {};
    return {
        code: data.code || res?.payload?.code || null,
        message: data.message || res?.payload?.message || translation("key_something_went_wrong"),
        errors: data.errors || {},
        duplicates: data.duplicates || [],
    };
};

/* What the form submits already exists (DUPLICATE: the submission was recorded, or a request / record is already open): it
   cannot be fixed in place, so the dialog closes and the record reloads. */
export const mustReload = (res) => refusalOf(res).code === "DUPLICATE";

/* The record moved on (STALE), no answer came back (timeout, network) or the server failed (5xx): the dialog keeps what was
   typed and shows the message above it (useKeptDraft; PROMPT 9 F-1 / F-2). Until 12 Nov 2026 these closed the dialog. */
export const keepsDraft = (res) => {
    const status = res?.payload?.status;
    return refusalOf(res).code === "STALE" || !status || status >= 500;
};

/* The summary plus every field error the form has no field for (dom.js refusalToast "• message") */
export const refusalText = (r, renderedFields) => {
    const extra = Object.entries(r.errors || {}).filter(([field, message]) => message && !renderedFields.includes(field));
    return extra.length ? `${r.message} ${extra.map(([, message]) => `• ${message}`).join(" ")}` : r.message;
};

/* The first field with an error takes focus (Insurance.html newflow.js focusFirstInvalid, dom.js showErrors): each field's
   host carries `data-field`; `order` is the screen order. The host's first control gets focus, else the host itself. */
const FIELD_CONTROL = 'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]';
export const focusFirstInvalid = (root, order, errors) => {
    if (!root) return false;
    const field = order.find((f) => errors?.[f] && root.querySelector(`[data-field="${f}"]`));
    if (!field) return false;
    const host = root.querySelector(`[data-field="${field}"]`);
    const control = host.querySelector(FIELD_CONTROL);
    if (!control) host.setAttribute("tabindex", "-1");
    (control || host).focus();
    return true;
};

/* Invoice vocabulary from the Invoice module (app-configs) */
export const invoiceTypeLabel = (type) => configData.invoiceTypeIdMapping?.[type]?.label || type || "";
export const invoiceStatusText = (status, fallback) => configData.invoiceStatusIdMapping?.[status]?.label || fallback || "";

/* Picker status pill tones (ENUMS §N): Paid, Exchanged green · Pending Paid orange · Void gray · others red */
export const invoiceStatusTone = (status) => {
    if (status === 1 || status === 11) return "green";
    if (status === 2) return "orange";
    if (status === 6) return "neutral";
    return "red";
};

/* The printed ineligibility reasons (ENUMS §N) */
export const invoiceReasonText = (reason) => {
    switch (reason.code) {
        case "type": return translation("key_ins_invoice_reason_type", { type: invoiceTypeLabel(reason.value) });
        case "void": return translation("key_ins_invoice_reason_void");
        case "refunded": return translation("key_ins_invoice_reason_refunded");
        case "status": return reason.value;
        case "noInsuranceLine": return translation("key_ins_invoice_reason_no_line");
        case "linked": return translation("key_ins_invoice_reason_linked", { label: reason.value || translation("key_ins_another_policy") });
        default: return translation("key_ins_invoice_reason_not_accessible");
    }
};

export const invoiceNoteText = (note) => {
    switch (note.code) {
        case "pendingPaid": return translation("key_ins_invoice_note_pending_paid");
        case "reuseOverride": return translation("key_ins_invoice_note_reuse_override", { label: note.value || translation("key_ins_another_policy") });
        case "differentParties": return translation("key_ins_invoice_note_different_parties");
        default: return "";
    }
};

export const reasonsText = (reasons) => (reasons || []).map(invoiceReasonText).join(", ");

/* Contract entry is blocked only by a record IN USE on the Contract (a pending request or a period not voided) — the one
   insurance-api M1 refuses; a record whose first request was withdrawn or rejected does not block (UI verification W17). */
export const contractEntryBlockingRef = (insurance) => (insurance?.inUse ? insurance.ref : null);

/* Contract entry (INS register #29; the server's rules.contractEntryStepRefusal): only from a Contract Insurance step at
   Not Ready (or no step yet); Not Required never; a new policy after terminal cover is not held to Not Ready. */
export const contractEntryStepNoticeKey = (stage, successor) => {
    if (stage === "not_required") return "key_ins_contract_step_not_required";
    if (successor || !stage || stage === "not_ready") return null;
    return "key_ins_contract_step_must_be_not_ready";
};

/* New policy after terminal cover (C1, M1b): New Insurance opened from the prior record by its reference and, when the prior
   is Contract-linked, with its Contract, so the form keeps the Contract context — crumb and E-Visa date option (details.js /
   companions.js open /new with prior + contract; UI verification W15) */
export const successorUrl = (priorRef, contractNumber) => `${routes.insuranceNew}?prior=${encodeURIComponent(priorRef)}${
    contractNumber ? `&contract=${encodeURIComponent(contractNumber)}&entry=contract` : ""}`;

/* Late renewal (rules.graceEvaluation, R2 `renewal.grace`): the notice, its tone, and whether the person recording
   the QBE result must establish carrier acceptance */
export const graceNotice = (grace) => {
    if (!grace?.applies) return null;
    const provider = grace.provider || translation("key_ins_this_provider");
    if (!grace.known) return { tone: "warn", text: translation("key_ins_grace_no_rule", { n: grace.daysSince, provider }) };
    return grace.within
        ? { tone: undefined, text: translation("key_ins_grace_within", { n: grace.daysSince, g: grace.graceDays, provider }) }
        : { tone: "warn", text: translation("key_ins_grace_outside", { n: grace.daysSince, g: grace.graceDays, provider }) };
};
export const needsCarrierAcceptance = (grace) => Boolean(grace?.applies && (!grace.known || !grace.within));
