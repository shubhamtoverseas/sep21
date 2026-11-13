/* eslint-env jest */
import fs from "fs";
import path from "path";
import { extendRefusalReloads, isSessionCapped, utcToLocalClock } from "../../Views/Pages/WorkerPage/dashboard/checkinUtils";
import { CHECKIN_ERROR_CODES } from "../../Views/Pages/WorkerPage/workerModuleConstants";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");

/* backend 374 (Priyanka v18 §T.1): the delivered check-in session contract */
describe("Check-in drawer · session contract", () => {
    test("can_extend decides the cap; minutes_used is the fallback", () => {
        expect(isSessionCapped({ can_extend: false, minutes_used: 60 })).toBe(true);
        expect(isSessionCapped({ can_extend: true, minutes_used: 480 })).toBe(false);
        expect(isSessionCapped({ minutes_used: 480 })).toBe(true);
        expect(isSessionCapped({ minutes_used: 120 })).toBe(false);
    });
    test("UTC stamps render as a local clock and keep the raw value on failure", () => {
        expect(utcToLocalClock("2026-11-02 03:04:05")).toMatch(/^\d{2}:\d{2}$/);
        expect(utcToLocalClock("")).toBe("");
        expect(utcToLocalClock("not a date")).toBe("not a date");
    });
    test("404 and 409 refusals reload the list; the others do not", () => {
        expect(extendRefusalReloads(CHECKIN_ERROR_CODES.SESSION_NOT_FOUND)).toBe(true);
        expect(extendRefusalReloads(CHECKIN_ERROR_CODES.DAILY_CAP_REACHED)).toBe(true);
        expect(extendRefusalReloads(CHECKIN_ERROR_CODES.EXTENSION_STEP)).toBe(false);
        expect(extendRefusalReloads(undefined)).toBe(false);
    });
    test("the drawer reads the delivered fields and the Insurance head reads the updater name", () => {
        const drawer = read("Views/Pages/WorkerPage/dashboard/CheckInDrawer.js");
        expect(drawer).toMatch(/isSessionCapped\(r\)/);
        expect(drawer).toMatch(/utcToLocalClock\(r\.checked_in_at\)/);
        expect(drawer).toMatch(/r\.day_cap_minutes/);
        expect(drawer).toMatch(/key=\{ r\.checkin_id \|\| r\.worker_id \}/);
        expect(read("Views/Pages/ProcessingPage/processing-detail/insurance-tab/ProcessingInsuranceTab.js")).toMatch(/updatedBy=\{ insuranceDocument\?\.last_updated_by_info \}/);
    });
});
