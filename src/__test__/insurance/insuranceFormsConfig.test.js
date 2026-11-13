import i18n from "i18next";
import en from "../../../public/locales/en/translation.json";
import {
    graceNotice, invoiceNoteText, invoiceReasonText, invoiceStatusTone, isBlank, needsCarrierAcceptance, newSubmissionKey, reasonsText, refusalOf,
    requiredErrors,
} from "../../Views/Pages/insurance/shared/insuranceFormsConfig";

/* Invoice picker wording, late-renewal grace (ENUMS §Q) and refusal handling (ENUMS §N, TARGET_API §1)
   with the shipped EN copy */

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

describe("invoice ineligibility reasons", () => {
    it("prints the ENUMS §N reasons", () => {
        // INV §3.1 / sheet row 4: refund invoices are "Refund Child"
        expect(invoiceReasonText({ code: "type", value: "general_refund" })).toBe("Refund Child invoice");
        expect(invoiceReasonText({ code: "void" })).toBe("Void");
        expect(invoiceReasonText({ code: "refunded" })).toBe("Refunded");
        expect(invoiceReasonText({ code: "status", value: "Unsettled" })).toBe("Unsettled");
        expect(invoiceReasonText({ code: "noInsuranceLine" })).toBe("no insurance line item");
        expect(invoiceReasonText({ code: "linked", value: "IN-C000101" })).toBe("already linked to IN-C000101");
    });

    it("never names a record the actor cannot see", () => {
        expect(invoiceReasonText({ code: "linked", value: "" })).toBe("already linked to another policy");
        expect(invoiceNoteText({ code: "reuseOverride", value: "" })).toBe("reuse override (linked to another policy)");
    });

    it("joins reasons and prints notes", () => {
        expect(reasonsText([{ code: "void" }, { code: "noInsuranceLine" }])).toBe("Void, no insurance line item");
        expect(invoiceNoteText({ code: "pendingPaid" })).toBe("Pending Paid");
        expect(invoiceNoteText({ code: "differentParties" })).toBe("different parties");
    });
});

describe("invoice status tones", () => {
    it("Paid and Exchanged green, Pending Paid orange, Void gray, others red", () => {
        expect(invoiceStatusTone(1)).toBe("green");
        expect(invoiceStatusTone(11)).toBe("green");
        expect(invoiceStatusTone(2)).toBe("orange");
        expect(invoiceStatusTone(6)).toBe("neutral");
        expect(invoiceStatusTone(5)).toBe("red");
    });
});

describe("refusals and submission keys", () => {
    it("reads the domain refusal envelope", () => {
        const r = refusalOf({ payload: { data: { code: "VALIDATION", message: "Complete the required fields", errors: { planId: "Select the policy plan" } } } });
        expect(r).toEqual({ code: "VALIDATION", message: "Complete the required fields", errors: { planId: "Select the policy plan" }, duplicates: [] });
    });

    it("issues a fresh key per form, within the 64-character column", () => {
        const a = newSubmissionKey(), b = newSubmissionKey();
        expect(a).not.toBe(b);
        expect(a.length).toBeLessThanOrEqual(64);
    });
});

describe("late renewal grace", () => {
    it("shows nothing and asks nothing when the policy is not expired", () => {
        expect(graceNotice({ applies: false })).toBeNull();
        expect(graceNotice(undefined)).toBeNull();
        expect(needsCarrierAcceptance({ applies: false })).toBe(false);
    });

    it("QBE has no grace rule: a warning, and carrier acceptance is required", () => {
        const g = { applies: true, known: false, daysSince: 33, provider: "QBE" };
        expect(graceNotice(g)).toEqual({ tone: "warn", text: "Expired 33 day(s) ago. No grace rule is configured for QBE; the person recording the QBE result must establish carrier acceptance, otherwise start a new policy record." });
        expect(needsCarrierAcceptance(g)).toBe(true);
    });

    it("a known rule: within is informational, outside asks for acceptance", () => {
        const within = { applies: true, known: true, within: true, daysSince: 3, graceDays: 30, provider: "X" };
        expect(graceNotice(within)).toEqual({ tone: undefined, text: "Expired 3 day(s) ago — within the 30-day grace rule for X." });
        expect(needsCarrierAcceptance(within)).toBe(false);
        expect(graceNotice({ ...within, within: false }).tone).toBe("warn");
        expect(needsCarrierAcceptance({ ...within, within: false })).toBe(true);
        expect(graceNotice({ applies: true, known: false, daysSince: 1, provider: null }).text).toContain("configured for this provider;");
    });
});

describe("client-side required checks", () => {
    it("treats whitespace as blank", () => {
        expect(isBlank("  ")).toBe(true);
        expect(isBlank(null)).toBe(true);
        expect(isBlank(" x ")).toBe(false);
    });
    it("returns the server guard copy for missing fields, first miss per field", () => {
        expect(requiredErrors([
            ["reason", true, "key_ins_err_enter_reason"],
            ["reason", true, "key_ins_err_select_the_reason"],
            ["remarks", false, "key_ins_err_enter_remarks"],
            ["carrierRef", true, "key_ins_err_qbe_policy_number_required"],
        ])).toEqual({ reason: "Enter the reason", carrierRef: "QBE policy number is required" });
    });
    it("uses the server wording word for word", () => {
        const fs = require("fs");
        const path = require("path");
        const serverEn = path.resolve(__dirname, "../../../../maidmatch-insurance-api/src/locales/en.json");
        if (!fs.existsSync(serverEn)) return;
        const server = JSON.parse(fs.readFileSync(serverEn, "utf8"));
        Object.keys(en).filter((k) => k.startsWith("key_ins_err_")).forEach((k) => {
            const serverKey = `INSURANCE_${k.slice("key_ins_err_".length).toUpperCase()}`;
            if (server[serverKey] !== undefined) expect(en[k]).toBe(server[serverKey]);
        });
    });
});
