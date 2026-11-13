/* eslint-env jest */
import { evisaChanges, evisaReasonRequired, isReasonRefusal } from "../../Views/Pages/ProcessingPage/processing-detail/visa-tab/e-visa/evisaRules";

const stored = { visa_reference_no: "GWEG1", e_visa_payment_date: "2026-10-15", ac_refunded: "1", entry_visa_expiry_date: "", visa_expiry_date: "2027-01-30", reason: "" };

describe("E-Visa · Correction Reason after Visa Released (backend 299, Mubin 29 Oct)", () => {
    test("after release any visa-detail change needs a reason; before release only a recorded date change does", () => {
        const refChanged = { ...stored, visa_reference_no: "GWEG2" };
        expect(evisaChanges(refChanged, stored).recordChanged).toBe(true);
        expect(evisaReasonRequired({ draft: refChanged, stored, released: true, needsReason: false })).toBe(true);
        expect(evisaReasonRequired({ draft: refChanged, stored, released: false, needsReason: false })).toBe(false);
        expect(evisaReasonRequired({ draft: { ...stored, ac_refunded: "0" }, stored, released: true, needsReason: false })).toBe(true);
        expect(evisaReasonRequired({ draft: stored, stored, released: true, needsReason: false })).toBe(false);
    });
    test("a recorded Visa Expiry / Entry Visa Expiry change needs a reason in any phase; a first record does not", () => {
        expect(evisaReasonRequired({ draft: { ...stored, visa_expiry_date: "2027-02-01" }, stored, released: false, needsReason: false })).toBe(true);
        expect(evisaReasonRequired({ draft: { ...stored, entry_visa_expiry_date: "2026-11-01" }, stored, released: false, needsReason: false })).toBe(false);
        const first = { ...stored, visa_expiry_date: "" };
        expect(evisaReasonRequired({ draft: { ...first, visa_expiry_date: "2027-02-01" }, stored: first, released: false, needsReason: false })).toBe(false);
        expect(evisaReasonRequired({ draft: { ...first, visa_expiry_date: "2027-02-01" }, stored: first, released: false, needsReason: true })).toBe(true);
    });
    test("the server's refusal is recognised by code or by its message", () => {
        expect(isReasonRefusal({ message: "A reason is required to change the visa details after release." })).toBe(true);
        expect(isReasonRefusal({ code: "VISA_EXPIRY_CHANGE_REASON_REQUIRED" })).toBe(true);
        expect(isReasonRefusal({ message: "Version is stale" })).toBe(false);
    });
});

describe("backend 365 refusal shape", () => {
    test("error_code VISA_CORRECTION_REASON_REQUIRED (422) is a reason refusal even with a numeric code", () => {
        expect(isReasonRefusal({ code: 422, error_code: "VISA_CORRECTION_REASON_REQUIRED", message: "x" })).toBe(true);
        expect(isReasonRefusal({ code: 422, error_code: "STALE_VERSION", message: "Version is stale" })).toBe(false);
    });
});
