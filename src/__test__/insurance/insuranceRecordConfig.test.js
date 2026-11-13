import i18n from "i18next";
import en from "../../../public/locales/en/translation.json";
import {
    CANCELLATION_REASON_KEYS, CONFIRM_LABEL_KEYS, confirmLabel, periodLabel, requestDescription, whyText, who, chargeText, scopeLabel,
} from "../../Views/Pages/insurance/record/insuranceRecordConfig";

/* Record page grammar (details.js requestRow / periodRow / actionList reasons) with the shipped EN copy */

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

describe("request description", () => {
    it("names the plan, the renewal start, the coverage item and the cancelled period", () => {
        expect(requestDescription({ type: "New", plan: "One Year Full" })).toBe("One Year Full");
        expect(requestDescription({ type: "Renew", plan: "One Year Full", targetPeriodStart: "2026-10-01" })).toBe("One Year Full · from 01/10/2026");
        expect(requestDescription({ type: "Coverage", coverageItem: "Accidental" })).toBe("Accidental");
        expect(requestDescription({
            type: "Cancellation", reason: "Contract terminated",
            cancellationPeriod: { effective: "2025-10-01", expiry: "2026-09-30", carrierRef: "QBE-1" },
        })).toBe("Period 01/10/2025 – 30/09/2026 (QBE-1) · Contract terminated");
    });

    it("describes a change policy request by type and the server's description", () => {
        expect(requestDescription({ type: "Endorsement", endorsement: { type: "address", description: "address → Flat A" } }))
            .toBe("Change of Employer Address — address → Flat A");
        expect(requestDescription({ type: "Endorsement", endorsement: { type: "extension", description: "expiry 30/09/2026 → 31/03/2027" } }))
            .toBe("Extension of Coverage Period — expiry 30/09/2026 → 31/03/2027");
        expect(requestDescription({ type: "Endorsement", endorsement: { type: "address", description: "" } }))
            .toBe("Change of Employer Address");
    });
});

describe("cancellation reasons", () => {
    it("label the five 9 Nov reasons; Cancelled from inception is an outcome, not a reason (Insurance.txt INS01)", () => {
        expect(Object.keys(CANCELLATION_REASON_KEYS)).toEqual(["Cover not required", "Employment terminated", "Worker departed", "Replaced by another policy", "Other"]);
        expect(Object.keys(CANCELLATION_REASON_KEYS).map((k) => i18n.t(CANCELLATION_REASON_KEYS[k])))
            .toEqual(["Cover not required", "Employment terminated", "Worker departed", "Replaced by another policy", "Other (explain below)"]);
        expect(CANCELLATION_REASON_KEYS["Cancelled from inception"]).toBeUndefined();
    });
});

describe("result action per request type (INS02; rules.js CONFIRM_LABEL)", () => {
    it("names each open request's result action; there is no record-level Record QBE result", () => {
        expect(Object.keys(CONFIRM_LABEL_KEYS)).toEqual(["New", "Renew", "Coverage", "Endorsement", "Cancellation"]);
        expect(["New", "Renew", "Coverage", "Endorsement", "Cancellation"].map(confirmLabel))
            .toEqual(["Confirm policy", "Confirm renewal", "Confirm additional coverage", "Confirm changes", "Record cancellation outcome"]);
        expect(en.key_ins_action_record).toBeUndefined();
    });
});

describe("period label", () => {
    it("follows the period status", () => {
        expect(periodLabel({ status: "active" })).toBe("Active");
        expect(periodLabel({ status: "future", effective: "2026-10-01" })).toBe("Starts 01/10/26");
        expect(periodLabel({ status: "ending", cancellation: { effective: "2026-09-20" } })).toBe("Ends 19/09/26"); // last covered day
        expect(periodLabel({ status: "expired" })).toBe("Expired");
        expect(periodLabel({ status: "cancelled", cancellation: { fromInception: true } })).toBe("Cancelled from inception");
        expect(periodLabel({ status: "cancelled", cancellation: { fromInception: false } })).toBe("Cancelled");
    });
});

describe("reasons and attribution", () => {
    it("prints the approved reason copy", () => {
        expect(whyText("needsConfirmedPeriod")).toBe("Needs a confirmed period");
        expect(whyText("continuedBy", "IN-C000200")).toBe("Continued by IN-C000200");
        expect(whyText("followsContract")).toBe("Follows the Contract");
        expect(whyText("unknown")).toBe("");
    });

    it("names the actor, or System", () => {
        expect(who({ name: "Linda Lee", at: "2026-09-06T02:30:00Z" })).toMatch(/^Linda Lee · 06\/09\/26 \d{2}:\d{2}$/);
        expect(who({ name: null, at: null })).toBe("System");
        expect(who(null)).toBe("");
    });

    it("prints the charge and the issue scope", () => {
        expect(chargeText("yes")).toBe("Charge: yes");
        expect(chargeText("unknown")).toBe("Charge: to be confirmed");
        const record = { requests: [{ id: 9, type: "Renew" }], periods: [{ id: 1, carrierRef: "QBE-1" }], voidedPeriods: [], coverages: [], riders: [] };
        expect(scopeLabel(record, { kind: "request", id: 9 })).toBe("Renewal request");
        expect(scopeLabel(record, { kind: "period", id: 1 })).toBe("Period QBE-1");
    });
});
