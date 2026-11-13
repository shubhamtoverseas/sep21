import React from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* P3 · the Invoice detail screens on the optimised API (performance track A-10…A-15): a screen opens on its view
   (GET /contract/admin/invoices/view/:ref, INV-2) — the detail, the action list for its status, page 1 of both logs and
   the remarks, each put where its own read puts it — and does not read them again; the deep link reads the view once and
   the screen opens on it; the Insurance card's read starts with the view; a page reload after an action becomes the view
   again and the screen anew, the reads after an action the view in place; the cancellation reasons are read once; the
   Change Invoice CS search waits for typing to pause and shows only its latest answer. */

jest.mock("../../services/invoicesAdmin", () => ({ getInvoiceListAdmin: jest.fn(), getInvoiceViewAdmin: jest.fn() }));
jest.mock("../../services/invoices", () => ({
    resolveInvoiceAPI: jest.fn(), getInvoiceDetails: jest.fn(), getActionStatusList: jest.fn(), getInvoiceActivityLogList: jest.fn(),
    getInvoicePaymentLogList: jest.fn(), invoiceGLobalCancellationReason: jest.fn(), getPaymentMethodCatalogueAPI: jest.fn(),
}));
jest.mock("../../services/remarks", () => ({ getInvoiceRemarks: jest.fn() }));
jest.mock("../../services/insurance", () => ({ getInvoiceInsuranceRecordsAPI: jest.fn() }));
jest.mock("../../services/cs", () => ({ getOtherCsStaff: jest.fn(), updateInvoiceInsuranceCsStaff: jest.fn() }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../Views/Pages/Invoice/InvoiceFollowUp", () => () => null);
/* eslint-disable import/first */
import { getInvoiceViewAdmin } from "../../services/invoicesAdmin";
import {
    getActionStatusList, getInvoiceActivityLogList, getInvoiceDetails, getInvoicePaymentLogList, getPaymentMethodCatalogueAPI,
    invoiceGLobalCancellationReason, resolveInvoiceAPI,
} from "../../services/invoices";
import { getInvoiceRemarks } from "../../services/remarks";
import { getInvoiceInsuranceRecordsAPI } from "../../services/insurance";
import { getOtherCsStaff } from "../../services/cs";
import invoices, { loadInvoiceCancellationReasons } from "../../redux/Slices/invoices/InvoicesSlice";
import remarks from "../../redux/Slices/remarks/RemarkSlice";
import cs from "../../redux/Slices/common/cs/CsSlice";
import { withInvoiceViewGate } from "../../Views/Pages/Invoice/InvoiceRecordGate";
import InvoiceRecordResolver from "../../Views/Pages/Invoice/InvoiceRecordResolver";
import { applyInvoiceView, cameWithActionList } from "../../Views/Pages/Invoice/invoiceView";
import InvoiceInsuranceCard from "../../components/Invoice/InvoiceInsuranceCard";
import { prefetchInvoiceInsuranceRecords } from "../../components/Invoice/invoiceInsurancePrefetch";
import ChangeCsInvoiceInsurancePopup from "../../components/Layout/popups/change-owner/ChangeCsInvoiceInsurancePopup";
import GeneralPaymentInvoice from "../../Views/Pages/Invoice/general/PaymentTypeInvoice";
import ContractRefundInvoice from "../../Views/Pages/Invoice/add-contract-invoice/RefundInvoice";
/* eslint-enable import/first */

const SRC = (rel) => fs.readFileSync(path.join(__dirname, "../..", rel), "utf8").replace(/\r\n/g, "\n");

beforeAll(async () => {
    /* bound to react-i18next as the app binds it (src/i18n.js), so `t` is the stable one the app has */
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
beforeEach(() => {
    sessionStorage.setItem("user", JSON.stringify({ token: "t", data: { id: 9, role: { id: 1 } } }));
    getPaymentMethodCatalogueAPI.mockImplementation(() => new Promise(() => {}));
    getInvoiceInsuranceRecordsAPI.mockImplementation(() => Promise.resolve({ data: { data: { records: [] } } }));
});
afterEach(() => { jest.useRealTimers(); jest.resetAllMocks(); sessionStorage.clear(); });

const ok = (data) => Promise.resolve({ data: { status: true, data } });
const fail = (status) => Promise.reject(Object.assign(new Error("request failed"), { response: { status } }));
const ACTIONS = [{ id: 6, name: "Void", key: "void", allowed: true, reason: null }];
const detail = (over = {}) => ({
    id: 349, status: 3, invoice_number: "I-TWO000349", invoice_type: "general", payment_type: "general", final_amount: 500,
    total_amount: 500, total_discount: 0, paid_amount: 500, remaining_balance: 0, adjusted_amouts: [], paymentModel: [],
    contractInvoiceItemSelectModel: [], contractInvoiceItemModel: [], childInvoices: [], ...over,
});
const view = (over = {}) => ({
    invoice: detail(over), actions: ACTIONS,
    activity: [{ id: 1, action: "created" }], payments: [{ id: 2, amount: 500 }], remarks: [{ id: 3, remarks: "called" }],
});
const viewOk = (v) => Promise.resolve({ data: { data: v } });

const makeStore = () => configureStore({
    reducer: {
        invoices, remarks, cs,
        users: () => ({ permissionList: { data: [] } }), worker: () => ({ totalInterviewCounts: {} }), employer: () => ({}),
    },
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
});
const makeClient = () => new QueryClient({ defaultOptions: { queries: { staleTime: 1000 * 60 * 5, cacheTime: 1000 * 60 * 10, retry: 1 } } });
const mount = (element, { at, routePath, store = makeStore(), client = makeClient(), extra = null } = {}) => {
    render(
        <Provider store={ store }>
            <QueryClientProvider client={ client }>
                <MemoryRouter initialEntries={ [at] }>
                    <Routes>
                        <Route path={ routePath } element={ element } />
                        { extra }
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>
        </Provider>
    );
    return { store, client };
};
const oldReads = () => [getInvoiceDetails, getActionStatusList, getInvoiceActivityLogList, getInvoicePaymentLogList, getInvoiceRemarks]
    .map((fn) => fn.mock.calls.length);

/* a stand-in screen that shows what the gate hands it */
const seen = { mounts: 0, props: null };
const Probe = (props) => {
    React.useEffect(() => { seen.mounts += 1; }, []);
    seen.props = props;
    return <div data-testid="screen">{ String(props.invoiceViewLoaded) }</div>;
};
const GatedProbe = withInvoiceViewGate(Probe);
const GatedProbeWithCard = withInvoiceViewGate(Probe, { insuranceCard: true });
const PROBE_PATH = "/invoices/general/payment-type-invoice/:invoice_id";

describe("the view is put where each read puts it (A-10, A-13)", () => {
    it("detail, action list, both logs and the remarks land in their slices and the remarks query", () => {
        const store = makeStore();
        const client = makeClient();
        const v = view();
        applyInvoiceView(store.dispatch, client, "349", v);
        const state = store.getState();
        expect(state.invoices.invoiceDetails).toBe(v.invoice);
        expect(state.invoices.actionStatusList).toBe(ACTIONS);
        expect(state.invoices.invoiceActivityLogList).toEqual(v.activity);
        expect(state.invoices.invoicePaymentLogList).toEqual(v.payments);
        expect(state.remarks.invoiceRemarks).toEqual(v.remarks);
        expect(client.getQueryData(["remarks", "invoice", "349"])).toEqual({ status: true, data: v.remarks });
        expect(cameWithActionList(state.invoices.invoiceDetails)).toBe(true);
        expect(cameWithActionList({ ...state.invoices.invoiceDetails })).toBe(false);
    });
});

describe("the gate (A-10, A-11)", () => {
    beforeEach(() => { seen.mounts = 0; seen.props = null; });

    it("reads the view once (log page size 10) and opens the screen on it; nothing is resolved separately", async () => {
        getInvoiceViewAdmin.mockImplementation(() => viewOk(view()));
        mount(<GatedProbe />, { at: "/invoices/general/payment-type-invoice/349", routePath: PROBE_PATH });
        await waitFor(() => expect(screen.getByTestId("screen").textContent).toBe("true"));
        expect(getInvoiceViewAdmin).toHaveBeenCalledTimes(1);
        expect(getInvoiceViewAdmin).toHaveBeenCalledWith("349", 10);
        expect(resolveInvoiceAPI).not.toHaveBeenCalled();
        expect(seen.props.viewActionsKey).toBe("349:3");
        expect(getInvoiceInsuranceRecordsAPI).not.toHaveBeenCalled();
    });

    it("an unknown or out-of-scope invoice gets the neutral not-available state", async () => {
        getInvoiceViewAdmin.mockImplementation(() => fail(404));
        mount(<GatedProbeWithCard />, { at: "/invoices/general/payment-type-invoice/999", routePath: PROBE_PATH });
        expect(await screen.findByText(en.key_record_not_available)).toBeTruthy();
        expect(screen.queryByTestId("screen")).toBeNull();
    });

    it("any other failure opens the screen to read and handle its own error, as before", async () => {
        getInvoiceViewAdmin.mockImplementation(() => fail(500));
        mount(<GatedProbe />, { at: "/invoices/general/payment-type-invoice/349", routePath: PROBE_PATH });
        await waitFor(() => expect(screen.getByTestId("screen").textContent).toBe("false"));
    });

    it("a screen with the Insurance card starts its read with the view, not after it", async () => {
        let answer;
        getInvoiceViewAdmin.mockImplementation(() => new Promise((r) => { answer = r; }));
        mount(<GatedProbeWithCard />, { at: "/invoices/general/payment-type-invoice/349", routePath: PROBE_PATH });
        await waitFor(() => expect(getInvoiceViewAdmin).toHaveBeenCalledTimes(1));
        expect(getInvoiceInsuranceRecordsAPI).toHaveBeenCalledWith("349");
        await act(async () => { answer({ data: { data: view() } }); });
        await waitFor(() => expect(screen.getByTestId("screen").textContent).toBe("true"));
    });

    it("reloadInvoice reads the view again and opens the screen anew (in place of a page reload)", async () => {
        getInvoiceViewAdmin.mockImplementationOnce(() => viewOk(view())).mockImplementationOnce(() => viewOk(view({ status: 6 })));
        const { store } = mount(<GatedProbe />, { at: "/invoices/general/payment-type-invoice/349", routePath: PROBE_PATH });
        await waitFor(() => expect(seen.mounts).toBe(1));
        await act(async () => { seen.props.reloadInvoice(); });
        await waitFor(() => expect(seen.mounts).toBe(2));
        expect(getInvoiceViewAdmin).toHaveBeenCalledTimes(2);
        expect(store.getState().invoices.invoiceDetails.status).toBe(6);
        expect(seen.props.viewActionsKey).toBe("349:6");
    });

    it("reloadInvoice falls back to the page reload when the view cannot be read", async () => {
        const reload = jest.fn();
        const location = window.location;
        delete window.location;
        window.location = { ...location, reload };
        try {
            getInvoiceViewAdmin.mockImplementationOnce(() => viewOk(view())).mockImplementationOnce(() => fail(500));
            mount(<GatedProbe />, { at: "/invoices/general/payment-type-invoice/349", routePath: PROBE_PATH });
            await waitFor(() => expect(seen.mounts).toBe(1));
            await act(async () => { seen.props.reloadInvoice(); });
            await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
            expect(seen.mounts).toBe(1);
        } finally {
            window.location = location;
        }
    });

    it("refreshInvoice reads the view in place; when it cannot, the detail and both logs are read as before", async () => {
        getInvoiceViewAdmin.mockImplementationOnce(() => viewOk(view())).mockImplementationOnce(() => viewOk(view({ status: 7 })))
            .mockImplementationOnce(() => fail(500));
        getInvoiceDetails.mockImplementation(() => ok(detail()));
        getInvoiceActivityLogList.mockImplementation(() => ok([]));
        getInvoicePaymentLogList.mockImplementation(() => ok([]));
        const { store } = mount(<GatedProbe />, { at: "/invoices/general/payment-type-invoice/349", routePath: PROBE_PATH });
        await waitFor(() => expect(seen.mounts).toBe(1));
        await act(async () => { seen.props.refreshInvoice(); });
        await waitFor(() => expect(store.getState().invoices.invoiceDetails.status).toBe(7));
        expect(seen.mounts).toBe(1);
        expect(oldReads()).toEqual([0, 0, 0, 0, 0]);
        await act(async () => { seen.props.refreshInvoice(); });
        await waitFor(() => expect(getInvoicePaymentLogList).toHaveBeenCalledTimes(1));
        expect(getInvoiceDetails).toHaveBeenCalledWith({ invoice_id: "349" });
        expect(getInvoiceActivityLogList).toHaveBeenCalledWith({ invoice_id: "349", limit: 10, page: 1 });
        expect(seen.mounts).toBe(1);
    });
});

describe("the deep link (A-10)", () => {
    beforeEach(() => { seen.mounts = 0; seen.props = null; });
    const target = <Route path={ PROBE_PATH } element={ <GatedProbe /> } />;

    it("/invoices/<ref> reads the view once and the record's screen opens on it, keeping ?followup=&from=", async () => {
        getInvoiceViewAdmin.mockImplementation(() => viewOk(view()));
        mount(<InvoiceRecordResolver />, { at: "/invoices/I-TWO000349?followup=5&from=calendar", routePath: "/invoices/:invoice_ref", extra: target });
        await waitFor(() => expect(screen.getByTestId("screen").textContent).toBe("true"));
        expect(getInvoiceViewAdmin).toHaveBeenCalledTimes(1);
        expect(getInvoiceViewAdmin).toHaveBeenCalledWith("I-TWO000349", 10);
        expect(resolveInvoiceAPI).not.toHaveBeenCalled();
        expect(seen.props.viewActionsKey).toBe("349:3");
    });

    it("an unknown reference gets the not-available state; another failure resolves the reference as before", async () => {
        getInvoiceViewAdmin.mockImplementation(() => fail(404));
        mount(<InvoiceRecordResolver />, { at: "/invoices/I-NOPE", routePath: "/invoices/:invoice_ref", extra: target });
        expect(await screen.findByText(en.key_record_not_available)).toBeTruthy();
        expect(resolveInvoiceAPI).not.toHaveBeenCalled();
    });

    it("when the view cannot be read (not a 404), the old resolve opens the screen, which then reads its view", async () => {
        getInvoiceViewAdmin.mockImplementationOnce(() => fail(500)).mockImplementation(() => viewOk(view()));
        resolveInvoiceAPI.mockImplementation(() => ok({ id: 349, invoice_type: "general", payment_type: "general", status: 3 }));
        mount(<InvoiceRecordResolver />, { at: "/invoices/I-TWO000349", routePath: "/invoices/:invoice_ref", extra: target });
        await waitFor(() => expect(screen.getByTestId("screen").textContent).toBe("true"));
        expect(resolveInvoiceAPI).toHaveBeenCalledTimes(1);
        expect(getInvoiceViewAdmin).toHaveBeenCalledTimes(2);
    });
});

describe("the screens open on the view (A-10, A-12, A-13)", () => {
    it("standalone payment: only the view is read — no detail, action list, logs or remarks — and the Remarks tab reads nothing", async () => {
        getInvoiceViewAdmin.mockImplementation(() => viewOk(view()));
        const Screen = withInvoiceViewGate(GeneralPaymentInvoice, { insuranceCard: true });
        mount(<Screen />, { at: "/invoices/general/payment-type-invoice/349", routePath: PROBE_PATH });
        expect((await screen.findAllByText("I-TWO000349")).length).toBeGreaterThan(0);
        await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
        expect(getInvoiceViewAdmin).toHaveBeenCalledTimes(1);
        expect(oldReads()).toEqual([0, 0, 0, 0, 0]);
        /* the card took the read the gate started */
        expect(getInvoiceInsuranceRecordsAPI).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByText(en.key_remarks, { selector: ".tab" }));
        expect(await screen.findByText("called")).toBeTruthy();
        expect(getInvoiceRemarks).not.toHaveBeenCalled();
    });

    it("standalone payment without the view reads everything as before", async () => {
        getInvoiceViewAdmin.mockImplementation(() => fail(500));
        getInvoiceDetails.mockImplementation(() => ok(detail()));
        getActionStatusList.mockImplementation(() => ok(ACTIONS));
        getInvoiceActivityLogList.mockImplementation(() => ok([]));
        getInvoicePaymentLogList.mockImplementation(() => ok([]));
        getInvoiceRemarks.mockImplementation(() => ok([]));
        const Screen = withInvoiceViewGate(GeneralPaymentInvoice, { insuranceCard: true });
        mount(<Screen />, { at: "/invoices/general/payment-type-invoice/349", routePath: PROBE_PATH });
        expect((await screen.findAllByText("I-TWO000349")).length).toBeGreaterThan(0);
        await waitFor(() => expect(oldReads()).toEqual([1, 1, 1, 1, 1]));
        expect(getActionStatusList).toHaveBeenCalledWith({ status: 3, contract_invoices_id: 349, previous_status: undefined });
    });

    it("contract refund (action list keyed on id and status): only the view is read", async () => {
        getInvoiceViewAdmin.mockImplementation(() => viewOk(view({ id: 401, invoice_number: "I-HKH000401", invoice_type: "contract_refund", status: 8 })));
        const Screen = withInvoiceViewGate(ContractRefundInvoice);
        mount(<Screen />, { at: "/invoices/add-contract-invoice/refund-invoice/401", routePath: "/invoices/add-contract-invoice/refund-invoice/:invoice_id" });
        expect((await screen.findAllByText("I-HKH000401")).length).toBeGreaterThan(0);
        await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
        expect(getInvoiceViewAdmin).toHaveBeenCalledTimes(1);
        expect(oldReads()).toEqual([0, 0, 0, 0, 0]);
        expect(getInvoiceInsuranceRecordsAPI).not.toHaveBeenCalled();
    });
});

describe("every detail screen on the gate", () => {
    const SCREENS = [
        "Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js", "Views/Pages/Invoice/general/PaymentTypeInvoice.js",
        "Views/Pages/Invoice/add-contract-invoice/ExchangePaymentInvoice.js",
        "Views/Pages/Invoice/add-contract-invoice/exchangePaymentReview.js", "Views/Pages/Invoice/general/exchangePaymentReview.js",
        "Views/Pages/Invoice/add-contract-invoice/RefundInvoice.js", "Views/Pages/Invoice/general/RefundInvoice.js",
    ];

    test.each(SCREENS)("%s: opens on the view, skips the action list the view carried, never reloads the page", (rel) => {
        const src = SRC(rel);
        expect(src).toMatch(/\{ invoiceViewLoaded = false,[^}]*\}\) => \{|function \w+\(\{ invoiceViewLoaded = false,[^}]*\}\)/);
        expect(src).toMatch(/const openedOnView = useRef\(invoiceViewLoaded && Number\(invoiceDetails\?\.id\) === Number\(invoice_id\)/);
        expect(src).toMatch(/useEffect\(\(\) => \{\n\s+if \(openedOnView\.current\)/);
        expect(src).toMatch(/if \(cameWithActionList\((invoiceDetails|detailsRef\.current)\)\) return;/);
        expect(src.replace(/\/\/location\.reload\(\);/g, "")).not.toMatch(/location\.reload\(/);
        // the detail and both logs are no longer read one by one after an action (refreshInvoice)
        expect(src).not.toMatch(/dispatch\(fetchInvoiceDetails\(\{ invoice_id \}\)\);\s*dispatch\(fetchInvoiceActivityLogList\(/);
    });

    it("the routes: the seven screens on the view gate, the three with the Insurance card read in parallel, the PDF routes as before", () => {
        const routes = SRC("Views/Pages/routes/invoiceRoutes.js");
        expect(routes.match(/withInvoiceViewGate\(lazy\(/g)).toHaveLength(7);
        expect(routes.match(/\{ insuranceCard: true \}/g)).toHaveLength(3);
        expect(routes).toMatch(/const InvoiceGeneralPdfGenerator = withInvoiceRecordGate\(/);
        expect(routes).toMatch(/const InvoiceContractPdfGenerator = withInvoiceRecordGate\(/);
        for (const name of ["PaymentTypeInvoice", "ExchangePaymentTypeInvoice", "PaymentTypeInvoiceGeneral"]) {
            expect(routes).toMatch(new RegExp(`const ${ name } = withInvoiceViewGate\\([^\\n]*\\{ insuranceCard: true \\}\\);`));
        }
    });

    it("A-33: the standalone payment screen loads the Void popup (and its date picker) when it opens", () => {
        const src = SRC("Views/Pages/Invoice/general/PaymentTypeInvoice.js");
        expect(src).not.toMatch(/^import VoidWorkerCancellationPopup/m);
        expect(src).toMatch(/const VoidWorkerCancellationPopup = lazy\(\(\) => import\(/);
        expect(src).toMatch(/\{ isVoidPopup && <Suspense fallback=\{ null \}><VoidWorkerCancellationPopup /);
    });
});

describe("the cancellation reasons are read once (A-14)", () => {
    it("read while the store has none; not again once it has them", async () => {
        invoiceGLobalCancellationReason.mockImplementation(() => ok([{ id: 1, name: "Worker left" }]));
        const store = makeStore();
        await act(async () => { await store.dispatch(loadInvoiceCancellationReasons()); });
        expect(store.getState().invoices.invoiceCacellationReason).toEqual([{ id: 1, name: "Worker left" }]);
        await act(async () => { await store.dispatch(loadInvoiceCancellationReasons()); });
        expect(invoiceGLobalCancellationReason).toHaveBeenCalledTimes(1);
    });

    it("an empty answer is asked again next time, as before", async () => {
        invoiceGLobalCancellationReason.mockImplementation(() => ok([]));
        const store = makeStore();
        await act(async () => { await store.dispatch(loadInvoiceCancellationReasons()); });
        await act(async () => { await store.dispatch(loadInvoiceCancellationReasons()); });
        expect(invoiceGLobalCancellationReason).toHaveBeenCalledTimes(2);
    });

    it("the refund dialog and the contract refund screen use it", () => {
        expect(SRC("components/Layout/popups/invoice-popups/RefundModal.js")).toMatch(/if \(asksContract\) dispatch\(loadInvoiceCancellationReasons\(\)\);/);
        const refund = SRC("Views/Pages/Invoice/add-contract-invoice/RefundInvoice.js");
        expect(refund.match(/dispatch\(loadInvoiceCancellationReasons\(\)\)/g)).toHaveLength(2);
        expect(refund).not.toMatch(/fetchInvoiceGLobalCancellationReason/);
    });
});

describe("Change Invoice CS staff search (A-15)", () => {
    const open = (store = makeStore()) => render(
        <Provider store={ store }>
            <ChangeCsInvoiceInsurancePopup title="Change Invoice CS" entity={ { id: 349, branch_name: "TW", staff_name: "Ann" } } actionType="invoice"
                onClose={ jest.fn() } onCloseSubmit={ jest.fn() } />
        </Provider>
    );
    const type = (value) => fireEvent.change(screen.getByPlaceholderText(en.key_search_new_invoice_cs), { target: { value } });

    it("reads once typing pauses (300 ms), with the last text", async () => {
        jest.useFakeTimers();
        getOtherCsStaff.mockImplementation(() => ok([{ id: 1, name: "Bea", count: 2 }]));
        open();
        type("B"); type("Be"); type("Bea");
        expect(screen.getByPlaceholderText(en.key_search_new_invoice_cs).value).toBe("Bea");
        await act(async () => { jest.advanceTimersByTime(299); });
        expect(getOtherCsStaff).not.toHaveBeenCalled();
        await act(async () => { jest.advanceTimersByTime(1); });
        expect(getOtherCsStaff).toHaveBeenCalledTimes(1);
        expect(getOtherCsStaff.mock.calls[0][0]).toMatchObject({ type: "invoice", search_text: "Bea", rel_id: 349 });
        jest.useRealTimers();
        expect(await screen.findByText("Bea")).toBeTruthy();
    });

    it("only the latest answer is shown: an earlier, slower one is dropped", async () => {
        let slow;
        getOtherCsStaff
            .mockImplementationOnce(() => new Promise((r) => { slow = r; }))
            .mockImplementationOnce(() => ok([{ id: 2, name: "Cara", count: 1 }]));
        open();
        type("A");
        await act(async () => { await new Promise((r) => setTimeout(r, 320)); });
        type("C");
        await act(async () => { await new Promise((r) => setTimeout(r, 320)); });
        expect(await screen.findByText("Cara")).toBeTruthy();
        await act(async () => { slow({ data: { status: true, data: [{ id: 1, name: "Abel", count: 1 }] } }); });
        expect(screen.queryByText("Abel")).toBeNull();
        expect(screen.getByText("Cara")).toBeTruthy();
    });
});

describe("the Insurance card takes the read the gate started (A-10)", () => {
    const card = () => render(<MemoryRouter><InvoiceInsuranceCard invoiceId={ 512 } invoiceRef="I-HKH000512" /></MemoryRouter>);
    const records = { data: { data: { records: [{ ref: "INS-1", policyNumber: "P-9", coverage: { label: "active" }, openable: false }] } } };

    it("a started read is taken, not repeated", async () => {
        getInvoiceInsuranceRecordsAPI.mockImplementation(() => Promise.resolve(records));
        prefetchInvoiceInsuranceRecords("512");
        card();
        expect(await screen.findByText("P-9")).toBeTruthy();
        expect(getInvoiceInsuranceRecordsAPI).toHaveBeenCalledTimes(1);
    });

    it("a read started more than 10 s before is dropped and the card reads afresh", async () => {
        const now = jest.spyOn(Date, "now");
        now.mockReturnValue(1000);
        getInvoiceInsuranceRecordsAPI.mockImplementation(() => Promise.resolve(records));
        prefetchInvoiceInsuranceRecords("512");
        now.mockReturnValue(11001);
        card();
        expect(await screen.findByText("P-9")).toBeTruthy();
        expect(getInvoiceInsuranceRecordsAPI).toHaveBeenCalledTimes(2);
        now.mockRestore();
    });
});
