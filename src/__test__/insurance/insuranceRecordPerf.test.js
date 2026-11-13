import React, { Suspense } from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* P3 · the Insurance record page on the optimised API (performance track A-25…A-27, A-29, A-33): a record is opened with
   one read (INS-2: the record and its remarks list); the legacy link opens it from the by-id view; an action's reply puts
   the fresh record on screen and only Activity reloads; the Follow Up sheet loads on first open; the QBE duplicate check
   and the portfolio pick keep the latest answer. The remarks list's own read rule is unchanged (A-28 not done); since
   PROMPT 6 Part B the list is shown by the Context rail (latest remark) and its Remarks drawer. */

jest.mock("../../services/insurance", () => ({
    getInsuranceRecordAPI: jest.fn(),
    getInsuranceRecordHistoryAPI: jest.fn(),
    resolveInsuranceRefAPI: jest.fn(),
    closeInsuranceIssuesAPI: jest.fn(),
    getInsuranceOwnerPortfolioAPI: jest.fn(),
    checkInsuranceCarrierRefAPI: jest.fn(),
    getInsuranceMetaAPI: jest.fn(),
}));
jest.mock("../../services/insuranceAdmin", () => ({
    getInsuranceRecordViewAdminAPI: jest.fn(),
    getInsuranceRecordViewByIdAdminAPI: jest.fn(),
}));
jest.mock("../../services/remarks", () => ({ getInsuranceRemarks: jest.fn() }));
jest.mock("../../services/calendar", () => ({ getSourceTasksAPI: jest.fn() }));
/* eslint-disable import/first */
import {
    checkInsuranceCarrierRefAPI, closeInsuranceIssuesAPI, getInsuranceMetaAPI, getInsuranceOwnerPortfolioAPI, getInsuranceRecordAPI,
    getInsuranceRecordHistoryAPI, resolveInsuranceRefAPI,
} from "../../services/insurance";
import { getInsuranceRecordViewAdminAPI, getInsuranceRecordViewByIdAdminAPI } from "../../services/insuranceAdmin";
import { getInsuranceRemarks } from "../../services/remarks";
import insurance, {
    changeInsuranceBranch, closeInsuranceIssues, createInsuranceRecord, fetchInsuranceRecord, fetchInsuranceRecordView,
    fetchInsuranceRecordViewById,
} from "../../redux/Slices/insurance/InsuranceSlice";
import remarks from "../../redux/Slices/remarks/RemarkSlice";
import InsuranceRecordPage from "../../Views/Pages/insurance/record/InsuranceRecordPage";
import InsuranceLegacyLinkResolver from "../../Views/Pages/insurance/record/InsuranceLegacyLinkResolver";
import RecordQbeResultDialog from "../../Views/Pages/insurance/record/RecordQbeResultDialog";
import PortfolioHandoverDialog from "../../Views/Pages/insurance/ownership/PortfolioHandoverDialog";
import { insuranceRemarksKey } from "../../Views/Pages/insurance/record/insuranceRecordRemarks";
/* eslint-enable import/first */

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
beforeEach(() => { sessionStorage.setItem("user", JSON.stringify({ data: { id: 1 } })); });
afterEach(() => { jest.resetAllMocks(); sessionStorage.clear(); });

const view = (ref, id, extra = {}) => ({
    id, ref, factsVersion: 1,
    header: { workerName: `Worker ${id}`, coverage: { label: "active", code: "active", fact: "fact.active", factDate: "2026-01-01" } },
    summary: { plan: "Plan A", periodKind: "current", period: null, owner: { name: "Owner" }, branch: { name: "HK" }, contract: null },
    work: { openRequests: [], attention: 0 },
    relationship: { continuesFrom: null, followedBy: [] },
    actions: [{ key: "dismissReview", group: "manage", enabled: true }],
    requests: [],
    issues: [{ id: 5, issue: `Issue on ${ref}`, scope: { kind: "record" }, openedAt: "2026-10-01T00:00:00Z", blocksRecord: false }],
    periods: [], voidedPeriods: [], coverages: [], riders: [],
    parties: { worker: { name: `Worker ${id}` }, employer: { name: "Employer" }, contract: null, previously: [], addressOnPolicy: null },
    ...extra,
});
const remark = (id, text) => ({ id, remarks: text, remarks_by: 9, remarks_by_name: "Staff", created_at: "2026-10-01T00:00:00Z" });
const ok = (data, message = "") => Promise.resolve({ data: { status: true, message, data } });

const setup = () => {
    const store = configureStore({
        reducer: { insurance, remarks, users: (state = { permissionList: { data: [] } }) => state },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: false } } });
    return { store, queryClient };
};
const renderAt = ({ store, queryClient }, url) => render(
    <QueryClientProvider client={queryClient}>
        <Provider store={store}>
            <MemoryRouter initialEntries={[url]}>
                <Suspense fallback={null}>
                    <Routes>
                        <Route path="/insurance/:ref" element={<InsuranceRecordPage />} />
                        <Route path="/insurances/:insurance_id" element={<InsuranceLegacyLinkResolver />} />
                    </Routes>
                </Suspense>
            </MemoryRouter>
        </Provider>
    </QueryClientProvider>,
);

describe("opening a record", () => {
    it("reads the record and its remarks in one call; the Context rail shows them without its own read", async () => {
        const ctx = setup();
        getInsuranceRecordViewAdminAPI.mockReturnValue(ok({ record: view("IN-HKC000001", 1), remarks: [remark(1, "Called the employer")] }));
        renderAt(ctx, "/insurance/IN-HKC000001");
        expect(await screen.findByText("Called the employer")).toBeInTheDocument();
        expect(getInsuranceRecordViewAdminAPI).toHaveBeenCalledTimes(1);
        expect(getInsuranceRecordViewAdminAPI).toHaveBeenCalledWith("IN-HKC000001");
        expect(getInsuranceRecordAPI).not.toHaveBeenCalled();
        expect(getInsuranceRemarks).not.toHaveBeenCalled();
    });

    it("a record already on screen (back on its page, Retry) is read with R2, as before", async () => {
        const ctx = setup();
        ctx.store.dispatch({ type: fetchInsuranceRecord.fulfilled.type, payload: view("IN-HKC000001", 1), meta: { arg: "IN-HKC000001" } });
        getInsuranceRecordAPI.mockReturnValue(ok(view("IN-HKC000001", 1)));
        getInsuranceRemarks.mockReturnValue(ok([]));
        renderAt(ctx, "/insurance/IN-HKC000001");
        await waitFor(() => expect(getInsuranceRecordAPI).toHaveBeenCalledTimes(1));
        expect(getInsuranceRecordViewAdminAPI).not.toHaveBeenCalled();
    });

    it("a remarks entry still fresh for that record is left as it is (the list's own rule; A-28 not done)", async () => {
        const ctx = setup();
        ctx.queryClient.setQueryData(insuranceRemarksKey(1), { data: [] });
        ctx.store.dispatch({ type: "remarks/fetchInsuranceRemarks/fulfilled", payload: { data: [remark(7, "On another record")] } });
        getInsuranceRecordViewAdminAPI.mockReturnValue(ok({ record: view("IN-HKC000001", 1), remarks: [remark(1, "Called the employer")] }));
        renderAt(ctx, "/insurance/IN-HKC000001");
        expect(await screen.findByText("On another record")).toBeInTheDocument();
        expect(screen.queryByText("Called the employer")).toBeNull();
        expect(getInsuranceRemarks).not.toHaveBeenCalled();
    });

    it("a refusal is R2's (same codes): the page shows it", async () => {
        const ctx = setup();
        getInsuranceRecordViewAdminAPI.mockImplementation(() => Promise.reject({ response: { status: 404, data: { code: "ACCESS", message: "x" } } }));
        renderAt(ctx, "/insurance/IN-HKC000009");
        expect(await screen.findByText(en.key_ins_record_not_available)).toBeInTheDocument();
    });
});

describe("the legacy link /insurances/:id", () => {
    it("opens the record from the by-id view: no second read on the record page", async () => {
        const ctx = setup();
        getInsuranceRecordViewByIdAdminAPI.mockReturnValue(ok({ record: view("IN-HKC000003", 3), remarks: [remark(2, "Left a message")] }));
        renderAt(ctx, "/insurances/3?followup=12");
        expect(await screen.findByText("Left a message")).toBeInTheDocument();
        expect(getInsuranceRecordViewByIdAdminAPI).toHaveBeenCalledWith("3");
        expect(resolveInsuranceRefAPI).not.toHaveBeenCalled();
        expect(getInsuranceRecordViewAdminAPI).not.toHaveBeenCalled();
        expect(getInsuranceRecordAPI).not.toHaveBeenCalled();
        expect(getInsuranceRemarks).not.toHaveBeenCalled();
        expect(ctx.store.getState().insurance.recordSeed).toBeNull();
    });

    it("when the view cannot be read, resolves as before (by-id, then the record page's own read and answer)", async () => {
        const ctx = setup();
        getInsuranceRecordViewByIdAdminAPI.mockImplementation(() => Promise.reject({ response: { status: 403, data: { code: "PERMISSION" } } }));
        resolveInsuranceRefAPI.mockReturnValue(ok({ ref: "IN-HKC000003" }));
        getInsuranceRecordViewAdminAPI.mockImplementation(() => Promise.reject({ response: { status: 403, data: { code: "PERMISSION" } } }));
        renderAt(ctx, "/insurances/3");
        expect(await screen.findByText(en.key_ins_record_cannot_open)).toBeInTheDocument();
        expect(resolveInsuranceRefAPI).toHaveBeenCalledWith("3");
    });

    it("an unknown id is refused, as before", async () => {
        const ctx = setup();
        getInsuranceRecordViewByIdAdminAPI.mockImplementation(() => Promise.reject({ response: { status: 404, data: { code: "ACCESS" } } }));
        resolveInsuranceRefAPI.mockImplementation(() => Promise.reject({ response: { status: 404, data: { code: "ACCESS" } } }));
        renderAt(ctx, "/insurances/999");
        expect(await screen.findByText(en.key_ins_record_not_available)).toBeInTheDocument();
    });
});

describe("after an action", () => {
    it("the reply's record view goes on screen; Activity reloads, the record is not read again", async () => {
        const ctx = setup();
        getInsuranceRecordViewAdminAPI.mockReturnValue(ok({ record: view("IN-HKC000001", 1), remarks: [] }));
        getInsuranceRecordHistoryAPI.mockReturnValue(ok({ rows: [], total: 0, page: 1 }));
        const after = view("IN-HKC000001", 1, { issues: [], header: { workerName: "Worker 1 (after)", coverage: { label: "active", code: "active", fact: "fact.active" } } });
        closeInsuranceIssuesAPI.mockReturnValue(ok(after, "Dismissed"));
        renderAt(ctx, "/insurance/IN-HKC000001");
        fireEvent.click(await screen.findByRole("button", { name: en.key_ins_action_close_issue }));
        const dialog = await screen.findByRole("dialog");
        fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Checked with QBE" } });
        fireEvent.click(within(dialog).getByRole("button", { name: en.key_ins_action_close_issue }));
        expect(await screen.findByRole("heading", { name: "Worker 1 (after)" })).toBeInTheDocument();
        await act(async () => { await Promise.resolve(); });
        expect(closeInsuranceIssuesAPI).toHaveBeenCalledTimes(1);
        expect(getInsuranceRecordAPI).not.toHaveBeenCalled();
        expect(getInsuranceRecordViewAdminAPI).toHaveBeenCalledTimes(1);
    });

    it("the slice applies only a full view of the record on screen; a stale or refused form reads the record again", () => {
        const { store } = setup();
        store.dispatch({ type: fetchInsuranceRecordView.fulfilled.type, payload: { record: view("IN-1", 1) }, meta: { arg: "IN-1" } });
        const seq = () => store.getState().insurance.recordViewSeq;
        store.dispatch({ type: changeInsuranceBranch.fulfilled.type, payload: { data: { ref: "IN-1" } } });
        expect(seq()).toBe(0);
        store.dispatch({ type: closeInsuranceIssues.fulfilled.type, payload: { data: view("IN-2", 2) } });
        expect(seq()).toBe(0);
        expect(store.getState().insurance.record.ref).toBe("IN-1");
        store.dispatch({ type: closeInsuranceIssues.fulfilled.type, payload: { data: view("IN-1", 1, { issues: [] }) } });
        expect(seq()).toBe(1);
        expect(store.getState().insurance.record.issues).toEqual([]);
        store.dispatch({ type: closeInsuranceIssues.rejected.type, payload: { code: "STALE" }, meta: {} });
        expect(seq()).toBe(1);
    });

    it("the wizard's new record and the by-id view are seeded for the record page; any read clears the seed", () => {
        const { store } = setup();
        store.dispatch({ type: createInsuranceRecord.fulfilled.type, payload: { data: view("IN-7", 7) } });
        expect(store.getState().insurance).toMatchObject({ recordSeed: "IN-7", record: { ref: "IN-7" } });
        store.dispatch({ type: fetchInsuranceRecord.pending.type, meta: { arg: "IN-7" } });
        expect(store.getState().insurance.recordSeed).toBeNull();
        store.dispatch({ type: createInsuranceRecord.fulfilled.type, payload: { data: { ref: "IN-8" } } });
        expect(store.getState().insurance.recordSeed).toBeNull();
        store.dispatch({ type: fetchInsuranceRecordViewById.fulfilled.type, payload: { record: view("IN-9", 9), remarks: [] } });
        expect(store.getState().insurance.recordSeed).toBe("IN-9");
    });
});

describe("latest answer wins", () => {
    it("the QBE duplicate check shows the answer for the value still in the field", async () => {
        jest.useFakeTimers();
        const { store } = setup();
        getInsuranceMetaAPI.mockReturnValue(ok({ caps: {} }));
        let slow;
        checkInsuranceCarrierRefAPI
            .mockReturnValueOnce(new Promise((r) => { slow = r; }))
            .mockReturnValueOnce(ok({ duplicate: false }));
        const record = { ref: "IN-1", factsVersion: 1, issues: [], summary: {} };
        render(<Provider store={store}><RecordQbeResultDialog record={record} request={{ id: 3, type: "New", version: 1 }} onClose={() => {}} onDone={() => {}} /></Provider>);
        const input = document.getElementById("ins-qbe-ref");
        fireEvent.change(input, { target: { value: "P-1" } });
        await act(async () => { jest.advanceTimersByTime(350); });
        fireEvent.change(input, { target: { value: "P-12" } });
        await act(async () => { jest.advanceTimersByTime(350); });
        await act(async () => { slow({ data: { data: { duplicate: true, label: "another policy" } } }); });
        expect(screen.queryByText(/already exists for this provider/i)).toBeNull();
        jest.useRealTimers();
    });

    it("the portfolio set is the owner still picked", async () => {
        const { store } = setup();
        let first;
        getInsuranceOwnerPortfolioAPI.mockImplementation((ownerId) => {
            if (!ownerId) return ok({ owners: [{ id: 1, name: "A", active: true, total: 2, standalone: 1 }, { id: 2, name: "B", active: true, total: 5, standalone: 5 }] });
            if (ownerId === 1) return new Promise((r) => { first = r; });
            return ok({ accessible: 5, accessibleStandalone: 5, accessibleLinked: 0, records: [] });
        });
        const onContinue = jest.fn();
        render(<Provider store={store}><PortfolioHandoverDialog onClose={() => {}} onContinue={onContinue} /></Provider>);
        /* the owner picker is the kit's searchable select since PROMPT 6 Part C (the inactive-staff cue): open it, pick the option */
        const input = await screen.findByRole("combobox");
        const pick = (name) => {
            fireEvent.keyDown(input, { key: "ArrowDown" });
            fireEvent.click(screen.getAllByText(name).find((e) => e.closest('[role="option"]')));
        };
        pick("A");
        pick("B");
        await waitFor(() => expect(screen.getByRole("button", { name: en.key_ins_continue })).not.toBeDisabled());
        await act(async () => { first({ data: { data: { accessible: 2, accessibleStandalone: 1, accessibleLinked: 1, records: [{ ref: "X" }] } } }); });
        fireEvent.click(screen.getByRole("button", { name: en.key_ins_continue }));
        expect(onContinue).toHaveBeenCalledWith({ ownerId: 2, records: [] });
    });
});

describe("chunks", () => {
    it("the Follow Up sheet (Calendar sheet and task editor) loads on first open", () => {
        const src = fs.readFileSync(path.join(__dirname, "../../Views/Pages/insurance/record/useInsuranceFollowUp.js"), "utf8");
        expect(src).toMatch(/const FollowUpSheet = lazy\(\(\) => import\("\.\.\/\.\.\/\.\.\/\.\.\/components\/follow-up\/FollowUpSheet"\)\)/);
        expect(src).not.toMatch(/^import FollowUpSheet/m);
    });
});
