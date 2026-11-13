import React from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* P3 · the Invoices list on the optimised API (performance track A-01…A-08): the list is read on
   POST /contract/admin/invoices/list (INV-1), one request at a time (a newer one cancels the one in flight); typing and
   filter changes read it once input pauses (300 ms), clicks at once; a batch status change reads it once after every
   call has answered; the selection's action list is read once per first selected invoice; nothing is asked for without
   invoice_global_list; the table keeps its props while only the search text changes. */

jest.mock("../../services/invoicesAdmin", () => ({ getInvoiceListAdmin: jest.fn() }));
jest.mock("../../services/invoices", () => ({ getInvoices: jest.fn(), getActionStatusList: jest.fn(), changeInvoiceStatus: jest.fn() }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
const mockSeen = { table: 0, props: {} };
jest.mock("../../Views/Pages/Invoice/InvoiceFilter", () => ({
    __esModule: true,
    default: (props) => { mockSeen.props.filter = props; return null; },
}));
jest.mock("../../Views/Pages/Invoice/InvoiceTable", () => {
    const React = require("react");
    return { __esModule: true, default: React.memo((props) => { mockSeen.table += 1; mockSeen.props.table = props; return null; }) };
});
jest.mock("../../components/Layout/popups/invoice-popups/ActionStatusPopup", () => ({
    __esModule: true,
    default: (props) => { mockSeen.props.popup = props; return null; },
}));
/* eslint-disable import/first */
import { getInvoiceListAdmin } from "../../services/invoicesAdmin";
import { changeInvoiceStatus, getActionStatusList, getInvoices } from "../../services/invoices";
import { ShowToast } from "../../components/show-toast/ShowToast";
import invoices from "../../redux/Slices/invoices/InvoicesSlice";
import Invoice from "../../Views/Pages/Invoice/Invoice";
/* eslint-enable import/first */

beforeAll(async () => {
    /* bound to react-i18next as the app binds it (src/i18n.js), so `t` is the stable one the app has */
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
const asUser = (roleId) => sessionStorage.setItem("user", JSON.stringify({ token: "t", data: { id: 9, role: { id: roleId } } }));
beforeEach(() => { localStorage.clear(); asUser(1); mockSeen.table = 0; mockSeen.props = {}; });
afterEach(() => { jest.useRealTimers(); jest.resetAllMocks(); sessionStorage.clear(); });

const page = (rows, total = rows.length) => Promise.resolve({ data: { data: { current_page: 1, limit: 25, total_count: total, total_pages: 1, last_updated: "", data: rows } } });
const row = (id, status = 2) => ({ id, status, invoice_number: `I-${id}`, final_amount: 10, paid_amount: 0 });
const mount = (permissions = []) => {
    const store = configureStore({
        reducer: { invoices, users: () => ({ permissionList: { data: permissions } }), worker: () => ({ workerDetailTabInfo: null }) },
        middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
    });
    render(<Provider store={store}><MemoryRouter><Invoice /></MemoryRouter></Provider>);
    return store;
};
const bodies = () => getInvoiceListAdmin.mock.calls.map((c) => c[0]);
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

describe("the list route", () => {
    it("the Invoices screen reads its list on the admin route; the Worker tab keeps the old route", async () => {
        getInvoiceListAdmin.mockImplementation(() => page([row(1)]));
        mount();
        await waitFor(() => expect(getInvoiceListAdmin).toHaveBeenCalledTimes(1));
        expect(getInvoices).not.toHaveBeenCalled();
        expect(bodies()[0]).toMatchObject({ page: 1, limit: 25 });
        await waitFor(() => expect(mockSeen.props.table?.data).toEqual([row(1)]));
        const workerTab = fs.readFileSync(path.join(__dirname, "../../Views/Pages/WorkerPage/worker-detail/newui/listing/WorkerInvoiceListing.js"), "utf8");
        expect(workerTab).toMatch(/dispatch\(fetchInvoices\(/);
    });

    it("without invoice_global_list nothing is asked for, not even when typing", async () => {
        asUser(5);
        getInvoiceListAdmin.mockImplementation(() => page([]));
        mount([{ module: "invoice", category: [{ id: "invoice_global_list", selected_value: "n" }] }]);
        await flush();
        expect(getInvoiceListAdmin).not.toHaveBeenCalled();
        act(() => mockSeen.props.filter.onSearch({ target: { value: "Lee" } }));
        await act(async () => { await new Promise((r) => setTimeout(r, 350)); });
        expect(getInvoiceListAdmin).not.toHaveBeenCalled();
    });

    it("a user with invoice_global_list gets the list", async () => {
        asUser(5);
        getInvoiceListAdmin.mockImplementation(() => page([]));
        mount([{ module: "invoice", category: [{ id: "invoice_global_list", selected_value: "y" }] }]);
        await waitFor(() => expect(getInvoiceListAdmin).toHaveBeenCalledTimes(1));
    });
});

describe("typing and filters", () => {
    it("typing reads once the input pauses (300 ms); the table keeps its props until then", async () => {
        jest.useFakeTimers();
        getInvoiceListAdmin.mockImplementation(() => page([row(1)]));
        mount();
        await waitFor(() => expect(getInvoiceListAdmin).toHaveBeenCalledTimes(1));
        await flush();
        const renders = mockSeen.table;
        for (const value of ["L", "Le", "Lee"]) act(() => mockSeen.props.filter.onSearch({ target: { value } }));
        expect(mockSeen.props.filter.updateFilters.search_text).toBe("Lee");
        expect(mockSeen.table).toBe(renders);
        await act(async () => { jest.advanceTimersByTime(299); });
        expect(getInvoiceListAdmin).toHaveBeenCalledTimes(1);
        await act(async () => { jest.advanceTimersByTime(1); });
        expect(getInvoiceListAdmin).toHaveBeenCalledTimes(2);
        expect(bodies()[1]).toMatchObject({ search_text: "Lee", page: 1 });
    });

    it("only the latest request lands: an earlier one still in flight is cancelled", async () => {
        let slow;
        getInvoiceListAdmin
            .mockImplementationOnce(() => page([row(1)]))
            .mockImplementationOnce(() => new Promise((r) => { slow = r; }))
            .mockImplementation(() => page([row(3)]));
        mount();
        await waitFor(() => expect(getInvoiceListAdmin).toHaveBeenCalledTimes(1));
        act(() => mockSeen.props.filter.applyAllFilters());
        act(() => mockSeen.props.filter.applyAllFilters());
        await waitFor(() => expect(mockSeen.props.table?.data).toEqual([row(3)]));
        expect(getInvoiceListAdmin.mock.calls[1][1].signal.aborted).toBe(true);
        await act(async () => { slow({ data: { data: { current_page: 1, limit: 25, total_count: 1, total_pages: 1, data: [row(2)] } } }); });
        expect(mockSeen.props.table.data).toEqual([row(3)]);
        expect(ShowToast).not.toHaveBeenCalled();
    });

    it("filter changes read once input pauses; Apply reads at once and the waiting read is dropped", async () => {
        jest.useFakeTimers();
        getInvoiceListAdmin.mockImplementation(() => page([]));
        mount();
        await waitFor(() => expect(getInvoiceListAdmin).toHaveBeenCalledTimes(1));
        act(() => mockSeen.props.filter.onHandleFilterInvoiceList({ invoice_status: [1] }));
        act(() => mockSeen.props.filter.onHandleFilterInvoiceList({ payment_method: ["cash"] }));
        expect(getInvoiceListAdmin).toHaveBeenCalledTimes(1);
        act(() => mockSeen.props.filter.applyAllFilters());
        expect(getInvoiceListAdmin).toHaveBeenCalledTimes(2);
        expect(bodies()[1]).toMatchObject({ invoice_status: [1], payment_method: ["cash"], page: 1 });
        await act(async () => { jest.advanceTimersByTime(1000); });
        expect(getInvoiceListAdmin).toHaveBeenCalledTimes(2);
    });

    it("a filter change on its own reads once after 300 ms", async () => {
        jest.useFakeTimers();
        getInvoiceListAdmin.mockImplementation(() => page([]));
        mount();
        await waitFor(() => expect(getInvoiceListAdmin).toHaveBeenCalledTimes(1));
        act(() => mockSeen.props.filter.onHandleFilterInvoiceList({ worker_type: [1] }));
        await act(async () => { jest.advanceTimersByTime(300); });
        expect(getInvoiceListAdmin).toHaveBeenCalledTimes(2);
        expect(bodies()[1]).toMatchObject({ worker_type: [1], page: 1 });
    });
});

describe("selection and batch", () => {
    it("the action list is read once per first selected invoice; Batch actions reuse it", async () => {
        getInvoiceListAdmin.mockImplementation(() => page([row(1), row(2)]));
        getActionStatusList.mockImplementation(() => Promise.resolve({ data: { data: [{ id: 4, name: "Paid", key: "approve_payment" }] } }));
        mount();
        await waitFor(() => expect(mockSeen.props.table?.data?.length).toBe(2));
        act(() => mockSeen.props.table.setCheckedItems([{ id: 1, status: 2 }]));
        act(() => mockSeen.props.table.setCheckedItems([{ id: 1, status: 2 }, { id: 2, status: 2 }]));
        await waitFor(() => expect(getActionStatusList).toHaveBeenCalledTimes(1));
        fireEvent.click(screen.getByRole("button", { name: /batch actions/i }));
        await flush();
        expect(getActionStatusList).toHaveBeenCalledTimes(1);
        act(() => mockSeen.props.table.setCheckedItems([{ id: 2, status: 2 }]));
        await waitFor(() => expect(getActionStatusList).toHaveBeenCalledTimes(2));
        expect(getActionStatusList.mock.calls[1][0]).toEqual({ status: 2, contract_invoices_id: 2 });
    });

    it("a batch change sends one call per invoice, reads the list once after all have answered, then shows the toast", async () => {
        getInvoiceListAdmin.mockImplementation(() => page([row(1), row(2), row(3)]));
        getActionStatusList.mockImplementation(() => Promise.resolve({ data: { data: [] } }));
        const answers = [];
        changeInvoiceStatus.mockImplementation(() => new Promise((r) => answers.push(r)));
        mount();
        await waitFor(() => expect(mockSeen.props.table?.data?.length).toBe(3));
        act(() => mockSeen.props.table.setCheckedItems([{ id: 1, status: 2 }, { id: 2, status: 2 }, { id: 3, status: 2 }]));
        fireEvent.click(screen.getByRole("button", { name: /batch actions/i }));
        await waitFor(() => expect(mockSeen.props.popup).toBeTruthy());
        act(() => mockSeen.props.popup.handleUpdateStatus(4));
        await waitFor(() => expect(changeInvoiceStatus).toHaveBeenCalledTimes(3));
        expect(ShowToast).not.toHaveBeenCalled();
        await act(async () => { answers[0]({ data: { status: true } }); answers[1]({ data: { status: true } }); });
        expect(getInvoiceListAdmin).toHaveBeenCalledTimes(1);
        await act(async () => { answers[2]({ data: { status: true } }); });
        await waitFor(() => expect(getInvoiceListAdmin).toHaveBeenCalledTimes(2));
        expect(ShowToast).toHaveBeenCalledWith("success", en.key_invoice_status_updated_successfully);
        expect(changeInvoiceStatus.mock.calls.map((c) => c[0].invoice_id)).toEqual([1, 2, 3]);
    });
});

describe("lookups (source)", () => {
    const FILTER = fs.readFileSync(path.join(__dirname, "../../Views/Pages/Invoice/InvoiceFilter.js"), "utf8");
    it("nationalities are read in one place; the branch mapping once per page session", () => {
        expect(FILTER.split("dispatch(fetchWorkerNationalities(").length).toBe(2);
        expect(FILTER).toMatch(/if \(invoiceBranchMapping\) \{\s+dispatch\(fetchMappingBranches\.fulfilled\(invoiceBranchMapping, 'invoice-session', arg\)\);/);
    });
});
