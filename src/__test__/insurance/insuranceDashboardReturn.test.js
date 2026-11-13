import React from "react";
import i18n from "i18next";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* Back from a record (verification 15 Oct, group 5C, UI-D58; prototype dashboard.js open → renderTable, register #86): the
   dashboard returns to the page the record was opened from, at its scroll, with focus on its row */

jest.mock("../../services/insurance", () => ({
    getInsuranceMetaAPI: jest.fn(),
}));
/* the dashboard searches on its admin route (performance track INS-1) */
jest.mock("../../services/insuranceAdmin", () => ({
    searchInsuranceRecordsAdminAPI: jest.fn(),
}));
// eslint-disable-next-line import/first
import { getInsuranceMetaAPI } from "../../services/insurance";
// eslint-disable-next-line import/first
import { searchInsuranceRecordsAdminAPI as searchInsuranceRecordsAPI } from "../../services/insuranceAdmin";
// eslint-disable-next-line import/first
import reducer from "../../redux/Slices/insurance/InsuranceSlice";
// eslint-disable-next-line import/first
import useInsuranceDashboard from "../../Views/Pages/insurance/dashboard/useInsuranceDashboard";
// eslint-disable-next-line import/first
import InsuranceRecordsTable from "../../Views/Pages/insurance/dashboard/InsuranceRecordsTable";
// eslint-disable-next-line import/first
import { getInsuranceColumns } from "../../Views/Pages/insurance/dashboard/insuranceDashboardColumns";
// eslint-disable-next-line import/first
import { INSURANCE_RETURN_STATE_KEY } from "../../Views/Pages/insurance/dashboard/insuranceDashboardConfig";

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
beforeEach(() => { window.scrollTo = jest.fn(); });
afterEach(() => { jest.resetAllMocks(); sessionStorage.clear(); localStorage.clear(); });

const row = (n) => ({ id: n, ref: `IN-HKC00000${n}`, worker: { name: `Worker ${n}` }, coverage: { label: "active" }, work: { openRequests: [] } });
const table = (props) => render(
    <InsuranceRecordsTable
        columns={getInsuranceColumns(["workerName", "insuranceRef"])}
        records={{ rows: [row(1), row(2)], total: 2 }}
        pageInfo={{ total: 2, currentPage: 3, lastPage: 3, limit: 25 }} selectedRefs={[]}
        onSort={() => {}} onRowOpen={() => {}} onSelect={() => {}} onChangeOwner={() => {}}
        onPrev={() => {}} onNext={() => {}} onLimitChange={() => {}} onRetry={() => {}}
        {...props}
    />,
);

describe("records table on return", () => {
    it("restores the scroll and focuses the row the record was opened from, once its page has loaded", () => {
        const onReturned = jest.fn();
        const { container } = table({ isLoading: false, returnTo: { ref: "IN-HKC000002", page: 3, scrollY: 320 }, onReturned });
        expect(window.scrollTo).toHaveBeenCalledWith(0, 320);
        expect(document.activeElement).toBe(container.querySelector('tr[data-ref="IN-HKC000002"]'));
        expect(onReturned).toHaveBeenCalledTimes(1);
    });

    it("waits while the page loads, and only lets go when the row is no longer there", () => {
        const onReturned = jest.fn();
        const { rerender } = table({ isLoading: true, returnTo: { ref: "IN-HKC000009", page: 3, scrollY: 320 }, onReturned });
        expect(onReturned).not.toHaveBeenCalled();
        rerender(
            <InsuranceRecordsTable
                columns={getInsuranceColumns(["workerName", "insuranceRef"])}
                records={{ rows: [row(1), row(2)], total: 2 }}
                pageInfo={{ total: 2, currentPage: 3, lastPage: 3, limit: 25 }} selectedRefs={[]}
                isLoading={false}
                returnTo={{ ref: "IN-HKC000009", page: 3, scrollY: 320 }}
                onReturned={onReturned}
                onSort={() => {}} onRowOpen={() => {}} onSelect={() => {}} onChangeOwner={() => {}}
                onPrev={() => {}} onNext={() => {}} onLimitChange={() => {}} onRetry={() => {}}
            />,
        );
        expect(onReturned).toHaveBeenCalledTimes(1);
        expect(window.scrollTo).not.toHaveBeenCalled();
    });
});

describe("dashboard state on return", () => {
    const meta = { access: true, caps: { detailsView: true }, branches: [], owners: {}, search: { enabled: true }, datePresets: [], customDurations: [] };
    const wrapper = ({ children }) => <Provider store={configureStore({ reducer: { insurance: reducer } })}>{children}</Provider>;
    const ok = (data) => Promise.resolve({ data: { data } });

    it("opening a record remembers its page, scroll and row; the next dashboard starts on that page and refocuses it", async () => {
        getInsuranceMetaAPI.mockReturnValue(ok(meta));
        searchInsuranceRecordsAPI.mockReturnValue(ok({ rows: [], total: 80, page: 1 }));
        const first = renderHook(() => useInsuranceDashboard(), { wrapper });
        await waitFor(() => expect(searchInsuranceRecordsAPI).toHaveBeenCalled());
        act(() => first.result.current.setPage(3));
        window.scrollY = 540;
        act(() => first.result.current.markReturn("IN-HKC000002"));
        expect(JSON.parse(sessionStorage.getItem(INSURANCE_RETURN_STATE_KEY))).toEqual({ ref: "IN-HKC000002", page: 3, scrollY: 540 });
        first.unmount();

        searchInsuranceRecordsAPI.mockClear();
        const back = renderHook(() => useInsuranceDashboard(), { wrapper });
        expect(back.result.current.returnTo).toEqual({ ref: "IN-HKC000002", page: 3, scrollY: 540 });
        await waitFor(() => expect(searchInsuranceRecordsAPI).toHaveBeenCalled());
        expect(searchInsuranceRecordsAPI.mock.calls[0][0].page).toBe(3);
        expect(sessionStorage.getItem(INSURANCE_RETURN_STATE_KEY)).toBeNull();
        act(() => back.result.current.returned());
        expect(back.result.current.returnTo).toBeNull();
    });

    it("without a return, the dashboard starts on page 1", async () => {
        getInsuranceMetaAPI.mockReturnValue(ok(meta));
        searchInsuranceRecordsAPI.mockReturnValue(ok({ rows: [], total: 0, page: 1 }));
        const { result } = renderHook(() => useInsuranceDashboard(), { wrapper });
        expect(result.current.returnTo).toBeNull();
        await waitFor(() => expect(searchInsuranceRecordsAPI).toHaveBeenCalled());
        expect(searchInsuranceRecordsAPI.mock.calls[0][0].page).toBe(1);
    });
});
