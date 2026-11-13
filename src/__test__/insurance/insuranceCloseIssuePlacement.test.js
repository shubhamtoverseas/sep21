import React, { Suspense } from "react";
import i18n from "i18next";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* PROMPT 5, gap matrix INS05-9 (Insurance.txt INS05: "Close issue stays beside the selected issue … leaves unrelated issues
   open"; Insurance_UI_Correction_20261106): Close issue sits on each issue's row and opens with THAT issue selected; it is not
   in the record Actions menu. Fails on f5cfc957e (one panel button; Close issue listed in the menu's Manage group). */

jest.mock("../../services/insurance", () => ({
    getInsuranceRecordAPI: jest.fn(), getInsuranceRecordHistoryAPI: jest.fn(),
    resolveInsuranceRefAPI: jest.fn(), closeInsuranceIssuesAPI: jest.fn(), getInsuranceMetaAPI: jest.fn(),
}));
jest.mock("../../services/insuranceAdmin", () => ({ getInsuranceRecordViewAdminAPI: jest.fn(), getInsuranceRecordViewByIdAdminAPI: jest.fn() }));
jest.mock("../../services/remarks", () => ({ getInsuranceRemarks: jest.fn() }));
jest.mock("../../services/calendar", () => ({ getSourceTasksAPI: jest.fn() }));
/* eslint-disable import/first */
import { getInsuranceMetaAPI } from "../../services/insurance";
import { getInsuranceRecordViewAdminAPI } from "../../services/insuranceAdmin";
import insurance from "../../redux/Slices/insurance/InsuranceSlice";
import remarks from "../../redux/Slices/remarks/RemarkSlice";
import InsuranceRecordPage from "../../Views/Pages/insurance/record/InsuranceRecordPage";
import { menuActionGroups } from "../../Views/Pages/insurance/record/insuranceRecordConfig";
/* eslint-enable import/first */

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
beforeEach(() => { sessionStorage.setItem("user", JSON.stringify({ data: { id: 1 } })); });
afterEach(() => { jest.resetAllMocks(); sessionStorage.clear(); });

const record = {
    id: 1, ref: "IN-HKC000001", factsVersion: 1,
    header: { workerName: "Worker 1", coverage: { label: "active", code: "active", fact: "fact.active", factDate: "2026-01-01" } },
    summary: { plan: "Plan A", periodKind: "current", period: null, owner: { name: "Owner" }, branch: { name: "HK" }, contract: null },
    work: { openRequests: [], attention: 2 },
    relationship: { continuesFrom: null, followedBy: [] },
    actions: [{ key: "dismissReview", group: "manage", enabled: true }, { key: "correctStatus", group: "admin", enabled: true }],
    requests: [],
    issues: [
        { id: 5, issue: "Refund on invoice I-1", scope: { kind: "record" }, openedAt: "2026-10-01T00:00:00Z", blocksRecord: false },
        { id: 6, issue: "Void on invoice I-2", scope: { kind: "record" }, openedAt: "2026-10-02T00:00:00Z", blocksRecord: false },
    ],
    periods: [], voidedPeriods: [], coverages: [], riders: [],
    parties: { worker: { name: "Worker 1" }, employer: { name: "Employer" }, contract: null, previously: [], addressOnPolicy: null },
};
const ok = (data) => Promise.resolve({ data: { status: true, message: "", data } });
const open = () => {
    getInsuranceRecordViewAdminAPI.mockReturnValue(ok({ record, remarks: [] }));
    getInsuranceMetaAPI.mockReturnValue(ok({ access: true, caps: {} }));
    const store = configureStore({ reducer: { insurance, remarks, users: (state = { permissionList: { data: [] } }) => state } });
    return render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <Provider store={store}>
                <MemoryRouter initialEntries={["/insurance/IN-HKC000001"]}>
                    <Suspense fallback={null}>
                        <Routes><Route path="/insurance/:ref" element={<InsuranceRecordPage />} /></Routes>
                    </Suspense>
                </MemoryRouter>
            </Provider>
        </QueryClientProvider>,
    );
};

describe("Close issue placement (INS05-9)", () => {
    it("the Actions menu leaves Close issue out; other actions stay", () => {
        expect(menuActionGroups(record.actions).flat().map((a) => a.key)).toEqual(["correctStatus"]);
    });

    it("each issue row has its own Close issue, which opens with that issue selected", async () => {
        const { container } = open();
        await screen.findByText("Void on invoice I-2");
        const rowButtons = [5, 6].map((id) => within(container.querySelector(`[data-issue="${id}"]`)).getByRole("button", { name: en.key_ins_action_close_issue }));
        expect(rowButtons).toHaveLength(2);
        fireEvent.click(rowButtons[1]);
        const dialog = await screen.findByRole("dialog");
        const radios = within(dialog).getAllByRole("radio");
        expect(radios.map((r) => r.checked)).toEqual([false, true]);
    });

    it("the opened Actions menu does not list Close issue", async () => {
        open();
        await screen.findByText("Void on invoice I-2");
        fireEvent.click(screen.getByText(en.key_ins_actions));
        const menuLabels = Array.from(document.querySelectorAll("[role='menuitem']")).map((n) => n.textContent);
        expect(menuLabels.some((t) => t.includes(en.key_ins_action_close_issue))).toBe(false);
        expect(menuLabels.some((t) => t.includes(en.key_ins_action_correct_record || "Correct record"))).toBe(true);
    });
});
