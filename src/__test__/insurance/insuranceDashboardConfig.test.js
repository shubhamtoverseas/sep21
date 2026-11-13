import i18n from "i18next";
import en from "../../../public/locales/en/translation.json";
import {
    buildSearchPayload, coverageDetail, DEFAULT_FILTERS, isFilterActive, validateCustomRange,
} from "../../Views/Pages/insurance/dashboard/insuranceDashboardConfig";

/* Insurance dashboard coverage detail (rules.coverage detail, the tag's title) and the
   custom-range rules (permissions.validateCustomRange), with the shipped EN copy. */

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

const cv = (extra) => ({
    label: "none", code: "none", fact: "fact.noPeriod", factDate: null, gapDays: 0, overlapDays: 0,
    nextStart: null, pastFact: null, nextCancellation: null, legacy: null, ...extra,
});

describe("coverage detail (pill title)", () => {
    it("describes an accepted cancellation and the next period", () => {
        expect(coverageDetail(cv({ label: "active", code: "ending", fact: "fact.ends", factDate: "2026-10-15", nextStart: "2026-11-01", gapDays: 16 })))
            .toBe("Cancellation accepted · ends 14/10/26 · Next period starts 01/11/26 · 16-day gap"); // last covered day (owner ruling 10 Nov)
        expect(coverageDetail(cv({ label: "active", code: "active", fact: "fact.active", nextStart: "2026-09-20", overlapDays: 3 })))
            .toBe("Next period starts 20/09/26 · 3-day overlap");
    });

    it("describes a later start with its last period", () => {
        expect(coverageDetail(cv({
            label: "future", code: "future", fact: "fact.starts", factDate: "2026-10-01", gapDays: 30,
            pastFact: { fact: "fact.cancelled", date: "2026-08-01" },
        }))).toBe("Confirmed; not yet in force · last period cancelled effective 01/08/26 (30-day gap)");
    });

    it("describes ended, not-issued and legacy records", () => {
        expect(coverageDetail(cv({ code: "expired", fact: "fact.expired", pastFact: { fact: "fact.expired", date: "2026-08-21" } })))
            .toBe("Expired 21/08/26");
        expect(coverageDetail(cv({ code: "awaiting", fact: "fact.notIssued" }))).toBe("No confirmed period yet");
        expect(coverageDetail(cv({ code: "cancelled", fact: "fact.cancelled", legacy: "cancelled" }))).toBe("Legacy record (cancelled)");
    });
});

describe("custom range", () => {
    it("requires the grant, a granted duration and valid dates", () => {
        expect(validateCustomRange({ duration: "90_days", from: "2026-01-01", to: "2026-01-10" }, []).errors)
            .toEqual({ duration: "Custom Date Range is not granted" });
        expect(validateCustomRange({ duration: "1_year", from: "", to: "2026-13-01" }, ["90_days"]).errors).toEqual({
            duration: "Select a granted duration", from: "Enter a valid From date", to: "Enter a valid To date",
        });
        expect(validateCustomRange({ duration: "90_days", from: "2026-02-01", to: "2026-01-01" }, ["90_days"]).errors)
            .toEqual({ to: "To must be on or after From" });
    });

    it("limits 90 Days by days and months by calendar interval", () => {
        expect(validateCustomRange({ duration: "90_days", from: "2026-01-01", to: "2026-03-31" }, ["90_days"]).ok).toBe(true);
        expect(validateCustomRange({ duration: "90_days", from: "2026-01-01", to: "2026-04-01" }, ["90_days"]).errors)
            .toEqual({ to: "The range may span at most 90 Days (90 days)" });
        expect(validateCustomRange({ duration: "6_months", from: "2026-03-01", to: "2026-09-01" }, ["6_months"]).ok).toBe(true);
        expect(validateCustomRange({ duration: "6_months", from: "2026-08-31", to: "2027-03-01" }, ["6_months"]).errors)
            .toEqual({ to: "The range may span at most 6 Months — from 31/08/2026 that is up to 28/02/2027" });
    });
});

describe("search payload", () => {
    it("sends only active filters and never a search shorter than 3 characters", () => {
        expect(buildSearchPayload({ ...DEFAULT_FILTERS, q: "ab" })).toEqual({ page: 1, limit: 25, sort: { key: "lastActivity", dir: "desc" } });
        expect(buildSearchPayload({
            ...DEFAULT_FILTERS, q: " IN-C ", coverage: ["active"], request: ["Renew"], review: "open", branch: ["2"], owner: "5",
            activity: { preset: "last_year" },
        })).toEqual({
            page: 1, limit: 25, sort: { key: "lastActivity", dir: "desc" }, q: "IN-C", coverage: ["active"], request: ["Renew"],
            review: "open", branch: [2], owner: 5, activity: { preset: "last_year" },
        });
        expect(buildSearchPayload({ ...DEFAULT_FILTERS, owner: "mine" }).owner).toBe("mine");
    });

    it("treats the default owner as no filter", () => {
        expect(isFilterActive(DEFAULT_FILTERS)).toBe(false);
        expect(isFilterActive({ ...DEFAULT_FILTERS, owner: "mine" })).toBe(true);
    });
});
