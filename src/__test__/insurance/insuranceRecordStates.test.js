import React from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* Record page states (verification 15 Oct, group 5A): legacy treatment (UI-R22 / R37), error states with Retry
   (UI-R04 / R38), one "Recorded by" (UI-R32), the right-hand column at narrow widths (UI-R28). The Ownership tab (UI-R41)
   was removed in PROMPT 6 Part B: its events are in Activity. */

jest.mock("../../services/insurance", () => ({
    getInsuranceRecordHistoryAPI: jest.fn(),
}));
// eslint-disable-next-line import/first
import { getInsuranceRecordHistoryAPI } from "../../services/insurance";
// eslint-disable-next-line import/first
import reducer, { fetchInsuranceRecord } from "../../redux/Slices/insurance/InsuranceSlice";
// eslint-disable-next-line import/first
import RecordActivityTab, { ActivityEvent } from "../../Views/Pages/insurance/record/RecordActivityTab";
// eslint-disable-next-line import/first
import RecordRequestRow from "../../Views/Pages/insurance/record/RecordRequestRow";

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

const store = () => configureStore({ reducer: { insurance: reducer } });
const COULDNT = "Couldn't load this view. Check your connection and try again.";

describe("record reload (UI-R04)", () => {
    const loaded = () => reducer(undefined, { type: fetchInsuranceRecord.fulfilled.type, payload: { ref: "IN-1" }, meta: { arg: "IN-1" } });

    it("keeps the record on screen when a reload fails without a refusal", () => {
        const s = reducer(loaded(), { type: fetchInsuranceRecord.rejected.type, payload: { status: undefined }, meta: { arg: "IN-1" } });
        expect(s.record).toEqual({ ref: "IN-1" });
        expect(s.recordRefusal).toBeNull();
        expect(s.recordStatus).toBe("failed");
    });

    it("replaces it on a refusal, and a first load failure shows the error page", () => {
        expect(reducer(loaded(), { type: fetchInsuranceRecord.rejected.type, payload: { code: "ACCESS" }, meta: { arg: "IN-1" } }).recordRefusal).toBe("ACCESS");
        const first = reducer(undefined, { type: fetchInsuranceRecord.rejected.type, payload: {}, meta: { arg: "IN-2" } });
        expect([first.record, first.recordRefusal]).toEqual([null, "ERROR"]);
    });
});

describe("Activity tab (UI-R37, UI-R38)", () => {
    it("marks a legacy entry", () => {
        const { container } = render(<ActivityEvent event={{ id: 1, at: "2026-10-01T02:00:00Z", action: "Legacy log", legacy: true }} />);
        expect(container.firstChild.className).toContain("legacy");
    });

    it("shows the error and Retry instead of an empty panel, then loads", async () => {
        getInsuranceRecordHistoryAPI.mockRejectedValueOnce(new Error("offline"))
            .mockResolvedValueOnce({ data: { data: { events: [{ id: 7, at: "2026-10-01T02:00:00Z", action: "Created", summary: "Record created" }], total: 1 } } });
        render(<Provider store={store()}><RecordActivityTab recordRef="IN-1" /></Provider>);
        expect(await screen.findByText(COULDNT)).toBeTruthy();
        fireEvent.click(screen.getByText("Retry"));
        expect(await screen.findByText("Record created")).toBeTruthy();
    });
});

describe("request row (UI-R32)", () => {
    it("attributes a cancellation result once", () => {
        const ann = { name: "Ann Lee", at: "2026-10-01T02:00:00Z" };
        const { container } = render(<RecordRequestRow onAction={() => {}} request={{
            id: 3, type: "Cancellation", state: "accepted", submittedBy: { name: "Bo Chan", at: "2026-09-30T02:00:00Z" },
            recordedBy: ann, outcome: { result: "Accepted", effective: "2026-10-15", reason: "Worker departed", recordedBy: ann },
        }} />);
        expect(container.textContent.match(/Recorded by/g)).toHaveLength(1);
    });
});

describe("styles (UI-R22, UI-R28)", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/insurance/record/InsuranceRecord.module.css"), "utf8");
    it("stacks the right-hand column at 1100px and keeps identifiers on one line", () => {
        expect(css).toMatch(/@media \(max-width: 1100px\) \{\s*\.grid2 \{ grid-template-columns: 1fr; \}/);
        expect(css).toMatch(/\.v \.mono,\s*\.v \.code,\s*\.v \.codeLink \{ white-space: nowrap; \}/);
    });
    it("draws the legacy hatched edge", () => {
        expect(css).toMatch(/\.legacy \{[^}]*border-image: repeating-linear-gradient/);
    });
});
