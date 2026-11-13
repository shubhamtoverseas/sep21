import React from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* P3 · the Insurance dashboard on the optimised API (performance track A-20…A-24): one search per visit, sent after the
   remembered filters are checked; meta read once per page session (as the record page and dialogs already do); one
   search per typing pause and none while the request itself is unchanged; the search goes to
   POST /api/admin/insurance/records/search; the table and cards do not re-render while typing. */

jest.mock("../../services/insurance", () => ({ getInsuranceMetaAPI: jest.fn(), searchInsuranceRecordsAPI: jest.fn() }));
jest.mock("../../services/insuranceAdmin", () => ({ searchInsuranceRecordsAdminAPI: jest.fn() }));
/* render counts of the page's memoised children (the real ones are React.memo too) */
const mockRenders = { table: 0, summary: 0, filterBar: 0, props: {} };
jest.mock("../../Views/Pages/insurance/dashboard/InsuranceRecordsTable", () => {
    const React = require("react");
    return { __esModule: true, default: React.memo((props) => { mockRenders.table += 1; mockRenders.props.table = props; return null; }) };
});
jest.mock("../../Views/Pages/insurance/dashboard/InsuranceSummary", () => {
    const React = require("react");
    return { __esModule: true, default: React.memo((props) => { mockRenders.summary += 1; mockRenders.props.summary = props; return null; }) };
});
jest.mock("../../Views/Pages/insurance/dashboard/InsuranceFilterBar", () => {
    const React = require("react");
    return { __esModule: true, default: React.memo((props) => { mockRenders.filterBar += 1; mockRenders.props.filterBar = props; return null; }) };
});
// eslint-disable-next-line import/first
import { getInsuranceMetaAPI, searchInsuranceRecordsAPI } from "../../services/insurance";
// eslint-disable-next-line import/first
import { searchInsuranceRecordsAdminAPI } from "../../services/insuranceAdmin";
// eslint-disable-next-line import/first
import reducer from "../../redux/Slices/insurance/InsuranceSlice";
// eslint-disable-next-line import/first
import useInsuranceDashboard from "../../Views/Pages/insurance/dashboard/useInsuranceDashboard";
// eslint-disable-next-line import/first
import InsuranceDashboardPage from "../../Views/Pages/insurance/dashboard/InsuranceDashboardPage";
// eslint-disable-next-line import/first
import { INSURANCE_VIEW_STATE_KEY, SEARCH_DEBOUNCE_MS } from "../../Views/Pages/insurance/dashboard/insuranceDashboardConfig";

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
    localStorage.clear();
    sessionStorage.clear();
});

const META = {
    access: true, caps: { detailsView: true }, branches: [{ id: 2, name: "B2" }], owners: { offered: false },
    search: { enabled: true }, datePresets: [], customDurations: [],
};
const ok = (data) => Promise.resolve({ data: { data } });
const newStore = () => configureStore({ reducer: { insurance: reducer } });
const withStore = (store) => ({ children }) => <Provider store={store}>{children}</Provider>;
const searches = () => searchInsuranceRecordsAdminAPI.mock.calls.map((c) => c[0]);
const flush = () => act(async () => { await Promise.resolve(); });

describe("one search per visit", () => {
    it("a first visit searches once, after a remembered filter the actor may no longer use is dropped", async () => {
        localStorage.setItem(INSURANCE_VIEW_STATE_KEY, JSON.stringify({ filters: { branch: ["2", "9"] } }));
        getInsuranceMetaAPI.mockReturnValue(ok(META));
        searchInsuranceRecordsAdminAPI.mockReturnValue(ok({ rows: [], total: 0, page: 1 }));
        renderHook(() => useInsuranceDashboard(), { wrapper: withStore(newStore()) });
        await waitFor(() => expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalled());
        await flush();
        expect(searches()).toEqual([{ page: 1, limit: 25, sort: { key: "lastActivity", dir: "desc" }, branch: [2] }]);
        expect(getInsuranceMetaAPI).toHaveBeenCalledTimes(1);
        expect(searchInsuranceRecordsAPI).not.toHaveBeenCalled();
    });

    it("a return visit in the same session reuses meta and searches once", async () => {
        const store = newStore();
        getInsuranceMetaAPI.mockReturnValue(ok(META));
        searchInsuranceRecordsAdminAPI.mockReturnValue(ok({ rows: [], total: 0, page: 1 }));
        const first = renderHook(() => useInsuranceDashboard(), { wrapper: withStore(store) });
        await waitFor(() => expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalledTimes(1));
        first.unmount();
        renderHook(() => useInsuranceDashboard(), { wrapper: withStore(store) });
        await waitFor(() => expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalledTimes(2));
        await flush();
        expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalledTimes(2);
        expect(getInsuranceMetaAPI).toHaveBeenCalledTimes(1);
    });

    it("a meta read in flight is not sent again; a failed one is retried on the next visit", async () => {
        const store = newStore();
        let resolve;
        getInsuranceMetaAPI.mockReturnValue(new Promise((r) => { resolve = r; }));
        searchInsuranceRecordsAdminAPI.mockReturnValue(ok({ rows: [], total: 0, page: 1 }));
        render(<React.StrictMode><Provider store={store}><MemoryRouter><InsuranceDashboardPage /></MemoryRouter></Provider></React.StrictMode>);
        expect(getInsuranceMetaAPI).toHaveBeenCalledTimes(1);
        await act(async () => { resolve({ data: { data: META } }); });
        await waitFor(() => expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalled());

        const failing = newStore();
        getInsuranceMetaAPI.mockReset();
        getInsuranceMetaAPI.mockReturnValue(Promise.reject({ response: { status: 500, data: {} } }));
        const one = renderHook(() => useInsuranceDashboard(), { wrapper: withStore(failing) });
        await waitFor(() => expect(failing.getState().insurance.metaStatus).toBe("failed"));
        await flush();
        expect(getInsuranceMetaAPI).toHaveBeenCalledTimes(1);
        one.unmount();
        renderHook(() => useInsuranceDashboard(), { wrapper: withStore(failing) });
        await waitFor(() => expect(getInsuranceMetaAPI).toHaveBeenCalledTimes(2));
    });
});

describe("typing", () => {
    const typed = async (result, value, ms) => {
        act(() => result.current.onSearchChange(value));
        await act(async () => { jest.advanceTimersByTime(ms); });
    };

    it("debounces at 300 ms and sends nothing while the request is unchanged (1–2 characters on page 1)", async () => {
        expect(SEARCH_DEBOUNCE_MS).toBe(300);
        jest.useFakeTimers();
        getInsuranceMetaAPI.mockReturnValue(ok(META));
        searchInsuranceRecordsAdminAPI.mockReturnValue(ok({ rows: [], total: 0, page: 1 }));
        const { result } = renderHook(() => useInsuranceDashboard(), { wrapper: withStore(newStore()) });
        await waitFor(() => expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalledTimes(1));

        await typed(result, "C", 300);
        await typed(result, "CB", 300);
        expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalledTimes(1);
        expect(result.current.isFiltered).toBe(true);
        expect(result.current.filters.q).toBe("CB");

        await typed(result, "CBO", 299);
        expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalledTimes(1);
        await act(async () => { jest.advanceTimersByTime(1); });
        expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalledTimes(2);
        expect(searches()[1].q).toBe("CBO");

        await typed(result, "CBO0", 100);
        await typed(result, "CBO00", 100);
        await typed(result, "CBO000", 300);
        expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalledTimes(3);
        expect(searches()[2].q).toBe("CBO000");
        await typed(result, "CBO000 ", 300);
        expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalledTimes(3);
    });

    it("1–2 characters typed on another page still return to page 1, as before", async () => {
        jest.useFakeTimers();
        getInsuranceMetaAPI.mockReturnValue(ok(META));
        searchInsuranceRecordsAdminAPI.mockReturnValue(ok({ rows: [], total: 90, page: 1 }));
        const { result } = renderHook(() => useInsuranceDashboard(), { wrapper: withStore(newStore()) });
        await waitFor(() => expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalledTimes(1));
        act(() => result.current.setPage(3));
        await waitFor(() => expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalledTimes(2));
        await typed(result, "C", 300);
        expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalledTimes(3);
        expect(searches()[2]).toEqual({ page: 1, limit: 25, sort: { key: "lastActivity", dir: "desc" } });
    });

    it("Refresh and Retry send the same request again", async () => {
        getInsuranceMetaAPI.mockReturnValue(ok(META));
        searchInsuranceRecordsAdminAPI.mockReturnValue(ok({ rows: [], total: 0, page: 1 }));
        const { result } = renderHook(() => useInsuranceDashboard(), { wrapper: withStore(newStore()) });
        await waitFor(() => expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalledTimes(1));
        act(() => result.current.refresh());
        await waitFor(() => expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalledTimes(2));
        expect(searches()[1]).toEqual(searches()[0]);
    });
});

describe("rendering", () => {
    it("typing re-renders the filter bar only; the table and cards keep their props until the results change", async () => {
        jest.useFakeTimers();
        Object.assign(mockRenders, { table: 0, summary: 0, filterBar: 0 });
        getInsuranceMetaAPI.mockReturnValue(ok({ ...META, caps: { detailsView: true, bulkChangeOwner: true, changeOwner: true } }));
        searchInsuranceRecordsAdminAPI.mockReturnValue(ok({ rows: [{ id: 1, ref: "IN-HKC000001" }], total: 1, page: 1 }));
        render(<Provider store={newStore()}><MemoryRouter><InsuranceDashboardPage /></MemoryRouter></Provider>);
        await waitFor(() => expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(mockRenders.props.table?.isLoading).toBe(false));
        const before = { table: mockRenders.table, summary: mockRenders.summary, filterBar: mockRenders.filterBar };

        for (const value of ["C", "CB"]) {
            act(() => mockRenders.props.filterBar.onSearchChange(value));
        }
        await act(async () => { jest.advanceTimersByTime(300); });
        expect(mockRenders.filterBar).toBeGreaterThan(before.filterBar);
        expect(mockRenders.table).toBe(before.table);
        expect(mockRenders.summary).toBe(before.summary);
        expect(searchInsuranceRecordsAdminAPI).toHaveBeenCalledTimes(1);
    });

    it("the custom-range dialog (and its date picker) loads only when it is opened", () => {
        const src = fs.readFileSync(path.join(__dirname, "../../Views/Pages/insurance/dashboard/InsuranceFilterBar.js"), "utf8");
        expect(src).toMatch(/lazy\(\(\) => import\("\.\/InsuranceCustomRangeDialog"\)\)/);
        expect(src).not.toMatch(/^import InsuranceCustomRangeDialog/m);
    });
});
