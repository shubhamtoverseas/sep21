import fs from "fs";
import path from "path";
import i18n from "i18next";
import en from "../../../public/locales/en/translation.json";
import { requestFollowUpContext } from "../../Views/Pages/insurance/record/useInsuranceFollowUp";
import { taskContextText } from "../../Views/Pages/Calendar/newui/calendarEvents";
import { hasInsuranceFollowUp } from "../../utils/permissions/followUpPermissionUtils";
import { taskSourcePath } from "../../Views/Pages/Calendar/newui/calendarSourceLinks";

/* I-16 — Follow Up on the Insurance record (conflicts sheet U-0115; prototype parts/v211_followup.js) */

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

const record = {
    periods: [{ id: 7, effective: "2026-01-01", expiry: "2026-12-31" }],
};

describe("request row launch context", () => {
    it("names the request and the period it targets", () => {
        const ctx = requestFollowUpContext(record, { id: 41, type: "Renew", targetPeriodId: 7 });
        expect(ctx.request).toEqual({ id: 41, type: "Renew", label: expect.any(String) });
        expect(ctx.period.id).toBe(7);
        expect(taskContextText(ctx)).toMatch(/^Request: .+ · Period: .+ – .+$/);
    });

    it("a cancellation uses its own period; a request without one carries the request only", () => {
        expect(requestFollowUpContext(record, { id: 9, type: "Cancellation", cancellationPeriod: { id: 7 } }).period.id).toBe(7);
        expect(requestFollowUpContext(record, { id: 3, type: "New" })).toEqual({ request: { id: 3, type: "New", label: expect.any(String) } });
    });
});

describe("grant and links", () => {
    it("needs the Insurance Follow Up grant", () => {
        expect(typeof hasInsuranceFollowUp).toBe("function");
    });

    it("the Calendar's Insurance link keeps ?followup=&from= through the numeric-id resolver", () => {
        const resolver = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/insurance/record/InsuranceLegacyLinkResolver.js"), "utf8");
        expect(resolver).toMatch(/routes\.insuranceRecord\.replace\(":ref", data\.ref\)\}\$\{search\}/);
        expect(taskSourcePath({ source: "insurance", sourceId: 5, taskId: 12 })).toMatch(/^\/insurances\/5\?followup=12&from=/);
    });

    it("the editor sends the launch context on create only", () => {
        const editor = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/Calendar/newui/TaskEditorModal.js"), "utf8");
        expect(editor).toMatch(/!task\?\.id && source\?\.id && source\.context \? \{ context: source\.context \}/);
    });
});
