import { useCallback, useEffect, useState } from "react";
import t from "../../../../utils/translation";
import { getPaymentMethodCatalogueAPI } from "../../../../services/invoices";

/* Payment method catalogue (Payment Method Rules v4, 9 Oct 2026). The Invoice API is the one definition of the 11
   methods, their selector groups, tiers, fields, proof modes, born statuses, timers and allowed scenarios
   (maidmatch-contract src/domain/invoice/paymentMethods.ts + paymentFields.ts, GET /invoices/payment-method-list). This
   file only loads it and turns an entry into what the selector renders; it keeps no copy of the rules. */

let cached = null;
let pending = null;

export const loadPaymentMethodCatalogue = () => {
    if (cached) return Promise.resolve(cached);
    if (!pending) {
        pending = getPaymentMethodCatalogueAPI()
            .then((res) => {
                const data = res?.data?.data;
                if (!Array.isArray(data?.methods) || !data.methods.length || !Array.isArray(data?.groups) || !data?.fieldRules || !data?.methodFields
                    || !data?.proofFile) {
                    throw new Error("catalogue");
                }
                cached = data;
                return data;
            })
            .finally(() => { pending = null; });
    }
    return pending;
};

/** { status: "loading" | "ready" | "failed", catalogue, retry } */
export const usePaymentMethodCatalogue = () => {
    const [state, setState] = useState(() => (cached ? { status: "ready", catalogue: cached } : { status: "loading", catalogue: null }));
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (cached) { setState({ status: "ready", catalogue: cached }); return undefined; }
        let alive = true;
        setState({ status: "loading", catalogue: null });
        loadPaymentMethodCatalogue()
            .then((catalogue) => { if (alive) setState({ status: "ready", catalogue }); })
            .catch(() => { if (alive) setState({ status: "failed", catalogue: null }); });
        return () => { alive = false; };
    }, [attempt]);
    const retry = useCallback(() => setAttempt((n) => n + 1), []);
    return { ...state, retry };
};

/* The payment-field layout of each catalogue form (PaymentFields: card, qr, off) */
const FIELDS_OF_FORM = { card: "card", wallet: "qr", proof: "off", cash: "off" };

/** A catalogue entry as the selector, the confirm modal and the payment fields use it */
export const toSelectorMethod = (entry, groupLabelKey, methodFields = {}) => ({
    value: entry.code,
    label: t(entry.labelKey),
    tier: entry.tier,
    type: FIELDS_OF_FORM[entry.form],
    apple: entry.cardNetwork === "choose",
    group: entry.group,
    groupLabel: groupLabelKey ? t(groupLabelKey) : "",
    bornStatus: entry.bornStatus,
    /* the fields the API checks for this method (Payment Method Rules v4, section A "Field validation") */
    fields: methodFields[entry.code] || [],
    /* proof at record: required (Bank Transfer, FPS, Cheque, PayMe — U-0233), none, or deposit_receipt (Cash, later) */
    proof: entry.proof,
    /* allowed for a Reservation Fee's first payment (Visa, Mastercard, UnionPay — v4 C-7, C-9) */
    reservationFee: Boolean(entry.scenarios?.reservationFee),
});

/* A chosen Card Network (Apple Pay): Visa / Mastercard, or UnionPay (sent as the UnionPay method) */
const CHOSEN_CARD_TYPES = ["visa", "master_card", "union_pay"];

/**
 * The method's fields checked with the API's own rules (catalogue fieldRules; same patterns, same messages):
 * { request property: message } for each missing or invalid field. Visa / Mastercard / UnionPay carry a fixed
 * Card Network, so only Apple Pay's choice is checked.
 */
export const validatePaymentFields = (method, formData, fieldRules) => {
    const errors = {};
    if (!method || !fieldRules) return errors;
    (method.fields || []).forEach((field) => {
        const rule = fieldRules[field];
        if (!rule) return;
        if (field === "card_network") {
            if (method.apple && !CHOSEN_CARD_TYPES.includes(formData?.card_type)) errors[rule.request] = t(rule.required.fe);
            return;
        }
        const value = String(formData?.[rule.request] ?? "").trim();
        if (!value) errors[rule.request] = t(rule.required.fe);
        else if (rule.pattern && rule.invalid && !new RegExp(rule.pattern).test(value)) errors[rule.request] = t(rule.invalid.fe);
    });
    return errors;
};

/* PDF, JPG, PNG recognised by their first bytes, as the API checks them (v4 rules C-2) */
const FILE_SIGNATURES = [
    ["application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d]],
    ["image/jpeg", [0xff, 0xd8, 0xff]],
    ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
];
const TYPE_EXTENSIONS = { "application/pdf": [".pdf"], "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] };

/** The file picker's accept list for proof, deposit receipt and refund documents */
export const PROOF_FILE_ACCEPT = FILE_SIGNATURES.flatMap(([type]) => TYPE_EXTENSIONS[type]).join(",");

const readHead = (file) => new Promise((resolve) => {
    const blob = file.slice(0, 8);
    if (typeof blob.arrayBuffer === "function") {
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)), () => resolve(new Uint8Array(0)));
        return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => resolve(new Uint8Array(0));
    reader.readAsArrayBuffer(blob);
});

/**
 * A proof / deposit receipt file checked before upload with the API's rule (catalogue proofFile: 5 MB, PDF / JPG / PNG
 * by content). Resolves to the error message, or "" when the file can be uploaded. The file is never altered.
 */
export const checkProofFile = async (file, proofFile) => {
    if (!file) return "";
    const maxBytes = proofFile?.maxBytes;
    if (maxBytes && file.size > maxBytes) return t("key_please_upload_smaller_file");
    const head = await readHead(file);
    const type = FILE_SIGNATURES.find(([, sig]) => sig.every((b, i) => head[i] === b))?.[0];
    if (!type || (proofFile?.types && !proofFile.types.includes(type))) return t("key_invalid_proof_file_type");
    return "";
};

/** The same check for screens without the catalogue at hand: the rule is loaded from the Invoice API */
export const checkPaymentDocumentFile = async (file) => {
    const catalogue = await loadPaymentMethodCatalogue().catch(() => null);
    return checkProofFile(file, catalogue?.proofFile);
};

/**
 * The document a stored payment method takes after recording (B-7): "payment_proof" (Bank Transfer, FPS, PayMe, Cheque),
 * "deposit_receipt" (Cash), or null (card and wallet methods, which have none). From the catalogue's proof mode.
 */
export const paymentDocumentKind = (catalogue, stored) => {
    if (!catalogue || !stored) return null;
    const code = STORED_METHOD_ALIASES[stored] || stored;
    const entry = (catalogue.methods || []).find((m) => m.code === code);
    if (!entry) return null;
    if (entry.proof === "deposit_receipt") return "deposit_receipt";
    return entry.proof === "required" ? "payment_proof" : null;
};

/* Transaction Reference (QA Mubin, 21–22 Oct 2026): 50 characters, alphanumeric, upper case — the receipt value is typed as-is,
   so the input normalises what is typed (the API cap, when smaller, still wins through fieldCaps) */
export const TRANSACTION_REFERENCE_MAX = 50;
export const normalizeTransactionReference = (value) => String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, TRANSACTION_REFERENCE_MAX);

/** Input length caps per request property, from the same rules */
export const fieldCaps = (fieldRules) => Object.values(fieldRules || {}).reduce((caps, rule) => (
    rule.maxLength ? { ...caps, [rule.request]: rule.maxLength } : caps
), {});

/* Stored historical values show under today's method (B-12: payment rows are never rewritten; FPS Terminal QR and
   FPS Direct read "FPS", Bank In reads "Bank Transfer"). Same map as maidmatch-contract LEGACY_PAYMENT_METHOD
   (checked by src/__test__/invoice/invoicePaymentMethodCatalogue.test.js). Display and document kind only. */
export const STORED_METHOD_ALIASES = Object.freeze({
    bank_in: "bank_transfer",
    fps_direct: "fps",
    fps_terminal: "fps",
    wechat_pay: "wechat_pay_hk",
    alipay: "alipay_hk",
});

const CARD_NETWORK_METHOD = Object.freeze({ visa: "visa", master_card: "mastercard", mastercard: "mastercard" });

/** The translated name of a stored payment method (detail screens, printouts, list). Unknown values print as stored. */
export const paymentMethodLabel = (stored, cardType) => {
    if (!stored) return "";
    let code = STORED_METHOD_ALIASES[stored] || stored;
    if (code === "credit_card") {
        const network = CARD_NETWORK_METHOD[String(cardType || "").toLowerCase()];
        if (!network) return t("key_credit_card");
        code = network;
    }
    if (code === "american_express") return t("key_amex");
    const key = `key_pm_${code}`;
    const label = t(key);
    return label && label !== key ? label : stored;
};

/**
 * The original payment of a refund as the refund screens name it (v4 B-10; the Invoice API's refundOrigin): each method it
 * was paid with, Apple Pay with the Card Network that routes its refund ("Apple Pay · Mastercard").
 */
export const refundOriginLabel = (origin) => (origin?.methods || [])
    .map(({ method, cardNetwork }) => (cardNetwork ? `${paymentMethodLabel(method)} · ${paymentMethodLabel(cardNetwork)}` : paymentMethodLabel(method)))
    .filter(Boolean)
    .join(", ");
