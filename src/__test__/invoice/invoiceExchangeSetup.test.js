/* eslint-env jest */
import React from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* Exchange · Select contract + replacement worker (INV-X2; register #56, #70, #71, #76; OP-27-106, OP-27-112, R-B2). The
   Contract setup stage in its Exchange mode, at the existing route (invoices/exchange/select-contract-exchange): the
   original invoice (A1) card in the setup's card pattern — its reference, employer, outgoing worker, Paid, refunds and the
   available credit, all the engine's; the replacement worker picked from every worker (#76: a contract-held one shown
   disabled with its contract); the Service card without New / Replacement, Process as driver with no default; "Exchange of
   <A1 ref>" in the header. The screen prices with the engine (route exchange) on every change and never prices itself. */

jest.mock("../../services/commonApi", () => ({
    getCountries: jest.fn(), getNationalities: jest.fn(() => new Promise(() => {})), getContractStatus: jest.fn(), getspokenLanguage: jest.fn(),
    getDistrictByCountryCode: jest.fn(), getWorkerProfileStatus: jest.fn(() => new Promise(() => {})), getWorkerStatuses: jest.fn(),
}));
jest.mock("../../services/invoices", () => ({ priceContractInvoiceAPI: jest.fn(), validateContractAPI: jest.fn() }));
jest.mock("../../services/branches", () => ({ getActiveBranches: jest.fn(() => new Promise(() => {})) }));
jest.mock("../../services/employers", () => ({ getEmployerDetail: jest.fn() }));
jest.mock("../../services/contracts", () => ({ getContractCategory: jest.fn(() => new Promise(() => {})) }));
jest.mock("../../services/workers", () => ({ getWorkers: jest.fn() }));
jest.mock("../../Views/Pages/Invoice/add-contract-invoice/CommonPageHeaderInvoice", () => (props) => (
    <div data-testid="header" data-title={ props.title } data-context={ props.context || "" } />
));
jest.mock("../../Views/Pages/Invoice/add-contract-invoice/SelectWorkerModal", () => (props) => (props.open
    ? <button type="button" data-exchange={ String(Boolean(props.exchange)) } onClick={ () => props.onSelect({ id: 60, name: "Siti" }) }>pick-worker-60</button> : null));
jest.mock("../../Views/Pages/Invoice/add-contract-invoice/AddWorkerDetailsOfInvoice", () => (props) => (
    <button type="button" onClick={ () => props.onDone({ id: props.workerId, name: "Siti Aminah", reference_id: "LIF000060", type: 1 }) }>worker-form-done</button>
));
/* eslint-disable import/first */
import { priceContractInvoiceAPI, validateContractAPI } from "../../services/invoices";
import { getEmployerDetail } from "../../services/employers";
import { getWorkers } from "../../services/workers";
import invoices from "../../redux/Slices/invoices/InvoicesSlice";
import employer from "../../redux/Slices/employer/EmployerSlice";
import worker from "../../redux/Slices/worker/WorkerSlice";
import contracts from "../../redux/Slices/contract/ContractSlice";
import branches from "../../redux/Slices/settings/branches/BranchesSlice";
import cs from "../../redux/Slices/common/cs/CsSlice";
import nationalities from "../../redux/Slices/common/nationalities/NationalitiesSlice";
import workerStatuses from "../../redux/Slices/common/workerStatuses/WorkerStatusesSlice";
import { EXCHANGE, exchangeInput, exchangeServiceOf } from "../../Views/Pages/Invoice/add-contract-invoice/contractSetup";
import ContractSetupService from "../../Views/Pages/Invoice/add-contract-invoice/ContractSetupService";
import WorkerResultTable from "../../Views/Pages/Invoice/add-contract-invoice/WorkerResultTable";
import AddContractInvoice from "../../Views/Pages/Invoice/add-contract-invoice/AddContractInvoice";
/* eslint-enable import/first */

beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
afterEach(() => { jest.resetAllMocks(); });

const reply = (data) => Promise.resolve({ data: { status: true, data } });
const TODAY = new Date().toISOString().split("T")[0];
/* A1 as its detail screen opens the exchange with it (the detail answer) */
const A1 = {
    id: 100, invoice_number: "I-MO000100", employer_id: 2, employer_name: "Chan Tai Man", employer_reference_id: "E-0002",
    worker_name: "Maria Santos", worker_reference_id: "LPF000677", branch_id: 5, branch_name: "Tsim Sha Tsui", staff_id: 2, staff_name: "Lee Ka Yan",
};
const CREDIT = { id: "exchange_credit", kind: "exchange_credit", itemType: "Exchange Credit", label: "Exchange Credit", detail: "I-MO000100", original: null, net: -16820, steps: [] };
const ANSWER = { invoice_id: 100, ref: "I-MO000100", service_route: "", paid: 16820, refunds: 0 };
const NO_WORKER = {
    ok: false, route: "exchange", lines: [CREDIT], total: null, exchange: ANSWER,
    problems: [{ scope: "exchange", text: "Choose the replacement’s service: Local, Local Transfer, Overseas or Direct Hire." }],
};
const PRICED = (service) => ({
    ok: true, route: "exchange", serviceRoute: service, worker: { id: 60 }, problems: [], exchange: { ...ANSWER, service_route: service },
    lines: [{ id: "base", kind: "base", itemType: "Local", label: "Indonesian · Local Finished · Replacement", original: 9600, net: 8160, steps: [] }, CREDIT,
        { id: "balance_adjustment", kind: "balance_adjustment", itemType: "Balance Adjustment", label: "Balance Adjustment", detail: "Remaining Credit", original: null, net: 8660, steps: [] }],
    total: { original: 9600, discount: 1440, net: 0 }, settlement: { replacementValue: 8160, exchangeCredit: 16820, shortfall: 0, remainingCredit: 8660 },
    record_key: "rk",
});

describe("the Exchange input", () => {
    const local = { id: 60, type: 1 };
    const overseas = { id: 61, type: 2 };
    it("route exchange, A1 and the replacement's service; no employer, no New / Replacement; nothing until A1, date and branch", () => {
        const base = { a1Id: 100, invoiceDate: "2026-11-02", branchId: "5" };
        expect(exchangeInput({ ...base })).toEqual({ route: EXCHANGE, exchange: { invoice_id: 100, service_route: "" }, category: null, driver: null, date: "2026-11-02", branch: 5 });
        expect(exchangeInput({ ...base, worker: local, choices: { process_as_driver: "yes" } }))
            .toEqual({ route: EXCHANGE, exchange: { invoice_id: 100, service_route: "local" }, worker_id: 60, category: null, driver: true, date: "2026-11-02", branch: 5 });
        expect(exchangeInput({ ...base, worker: overseas, choices: { direct_hire: "yes", process_as_driver: "yes" } }))
            .toEqual({ route: EXCHANGE, exchange: { invoice_id: 100, service_route: "direct_hire" }, worker_id: 61, category: null, driver: null, date: "2026-11-02", branch: 5 });
        for (const missing of ["a1Id", "invoiceDate", "branchId"]) expect(exchangeInput({ ...base, worker: local, [missing]: "" })).toBeNull();
        expect(Object.keys(exchangeInput({ ...base, worker: local }))).not.toEqual(expect.arrayContaining(["type", "employer_id"]));
    });
    it("a Renewal profile is not an exchange route (OP-27-112): Local, with the Contract category chosen", () => {
        expect(exchangeServiceOf(local, "Renewal", {})).toBe("local");
        expect(exchangeServiceOf(local, "Local Transfer", {})).toBe("local_transfer");
        expect(exchangeServiceOf(local, "Local Finished", { local_transfer: "yes" })).toBe("local_transfer");
        expect(exchangeServiceOf(overseas, "", {})).toBe("overseas");
        expect(exchangeInput({ a1Id: 100, invoiceDate: "2026-11-02", branchId: 5, worker: local, categoryName: "Renewal", choices: { contract_category: "2" } }).category).toBe(2);
    });
});

describe("the Service card in Exchange mode", () => {
    const card = (props) => render(<div className="invd"><ContractSetupService mode={ EXCHANGE } onChoose={ jest.fn() } { ...props } /></div>);
    it("no New / Replacement; Local Transfer and Process as driver on a Local replacement (no driver default)", () => {
        card({ worker: { id: 60, type: 1 }, categoryName: "Local Finished", route: "local", choices: {}, pricing: { status: "ready", result: PRICED("local"), retry: jest.fn() } });
        expect(screen.getAllByRole("radiogroup").map((g) => g.getAttribute("aria-label"))).toEqual([en.key_local_transfer, en.key_process_as_driver]);
        expect(within(screen.getByRole("radiogroup", { name: en.key_process_as_driver })).getAllByRole("radio").map((r) => r.checked)).toEqual([false, false]);
    });
    it("before a replacement is picked: the engine's note (A1's refusals first)", () => {
        card({ worker: null, pricing: { status: "ready", result: { ...NO_WORKER, problems: [{ scope: "exchange", text: "A1 has no confirmed payment." }] }, retry: jest.fn() } });
        expect(screen.getByRole("alert")).toHaveTextContent("A1 has no confirmed payment.");
    });
});

const Probe = () => {
    const { state } = useLocation();
    return <pre data-testid="items">{ JSON.stringify(state) }</pre>;
};
const makeStore = () => configureStore({
    reducer: { invoices, employer, worker, contracts, branches, cs, nationalities, workerStatuses, users: () => ({ permissionList: { data: [] } }) },
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
});
const mount = (store = makeStore()) => {
    render(
        <Provider store={ store }>
            <MemoryRouter initialEntries={ [{ pathname: "/invoices/exchange/select-contract-exchange", state: { exchangeInvoiceInfo: A1 } }] }>
                <Routes>
                    <Route path="/invoices/exchange/select-contract-exchange" element={ <AddContractInvoice mode={ EXCHANGE } /> } />
                    <Route path="/invoices/exchange/add-contract-invoice-exchange" element={ <Probe /> } />
                    <Route path="/invoices" element={ <div data-testid="list" /> } />
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
    return store;
};
const lastInput = () => priceContractInvoiceAPI.mock.calls.at(-1)[0];
const continueButton = () => screen.getByRole("button", { name: en.key_continue_to_pricing_items });

describe("the setup screen in Exchange mode", () => {
    it("A1's card from the engine, Exchange of <A1 ref>; pick the replacement, choose the driver, Continue carries the exchange input", async () => {
        getEmployerDetail.mockImplementation(() => reply({ employer_id: 2, name: "Chan Tai Man", reference_id: "E-0002" }));
        priceContractInvoiceAPI.mockImplementation((input) => reply(input.worker_id ? PRICED(input.exchange.service_route) : NO_WORKER));
        const store = mount();
        const header = await screen.findByTestId("header");
        expect([header.getAttribute("data-title"), header.getAttribute("data-context")]).toEqual([en.key_exchange_contract_invoice, "Exchange of I-MO000100"]);
        // a new exchange starts clean: A1's branch and CS Owner, today's date
        expect(store.getState().employer.currentInvoiceLocalInfo).toMatchObject({ exchange_a1: 100, invoice_date: TODAY, branchId: "5", csId: "2", cs_name: "Lee Ka Yan" });
        await waitFor(() => expect(lastInput()).toEqual({ route: "exchange", exchange: { invoice_id: 100, service_route: "" }, category: null, driver: null, date: TODAY, branch: 5 }));
        const card = await screen.findByText(en.key_inv_original_invoice);
        const origin = card.closest("[data-exchange-origin]");
        await waitFor(() => expect(origin.querySelector("[data-a1-credit]")).toHaveTextContent("HK$16,820"));
        expect(origin.querySelector("[data-a1-ref]")).toHaveTextContent("I-MO000100");
        expect(origin).toHaveTextContent("Chan Tai Man E-0002");
        expect(origin).toHaveTextContent("Maria Santos LPF000677");
        expect(origin.querySelector("[data-a1-paid]")).toHaveTextContent("HK$16,820");
        expect(origin.querySelector("[data-a1-refunds]")).toHaveTextContent("HK$0");
        expect(screen.getByRole("alert")).toHaveTextContent("Choose the replacement’s service");
        expect(continueButton()).toBeDisabled();

        fireEvent.click(screen.getByRole("button", { name: `${ en.key_select } Worker` }));
        const pick = await screen.findByText("pick-worker-60");
        expect(pick).toHaveAttribute("data-exchange", "true");
        fireEvent.click(pick);
        fireEvent.click(await screen.findByText("worker-form-done"));
        await waitFor(() => expect(lastInput()).toEqual({ route: "exchange", exchange: { invoice_id: 100, service_route: "local" }, worker_id: 60, category: null, driver: null, date: TODAY, branch: 5 }));
        // no New / Replacement; the driver has no default and Continue waits for it
        expect(screen.queryByRole("radiogroup", { name: en.key_type_internal })).toBeNull();
        expect(await screen.findByText(en.key_inv_choose_process_as_driver)).toBeInTheDocument();
        fireEvent.click(within(screen.getByRole("radiogroup", { name: en.key_process_as_driver })).getByLabelText(en.key_no));
        await waitFor(() => expect(lastInput().driver).toBe(false));
        await waitFor(() => expect(continueButton()).toBeEnabled());
        fireEvent.click(continueButton());
        const state = JSON.parse((await screen.findByTestId("items")).textContent);
        expect(state.setupInput).toEqual({ route: "exchange", exchange: { invoice_id: 100, service_route: "local" }, worker_id: 60, category: null, driver: false, date: TODAY, branch: 5 });
        expect(state.contractFormInfo).toMatchObject({ csId: "2", branchId: "5", currentInvoiceExchange: { id: 100 }, currentInvoiceWorkerDetail: { id: 60 },
            currentInvoiceEmployerDetail: { employer_id: 2 } });
        // the engine and the server check the replacement (#56): no separate contract check on pick
        expect(validateContractAPI).not.toHaveBeenCalled();
    });

    it("opened without an original invoice: back to the invoice list", async () => {
        const store = makeStore();
        render(
            <Provider store={ store }>
                <MemoryRouter initialEntries={ ["/invoices/exchange/select-contract-exchange"] }>
                    <Routes>
                        <Route path="/invoices/exchange/select-contract-exchange" element={ <AddContractInvoice mode={ EXCHANGE } /> } />
                        <Route path="/invoices" element={ <div data-testid="list" /> } />
                    </Routes>
                </MemoryRouter>
            </Provider>,
        );
        expect(await screen.findByTestId("list")).toBeInTheDocument();
    });
});

describe("the replacement worker picker (#76)", () => {
    const rows = [
        { id: 60, fullname: "Siti Aminah", reference_id: "LIF000060", type: 1, worker_status: { worker_status: "Available" } },
        { id: 61, fullname: "Ana Cruz", reference_id: "LPF000061", type: 1, worker_status: { worker_status: "Hired" }, live_contract_number: "C-MO000096", live_contract_status: 1 },
        { id: 62, fullname: "Rosa Lim", reference_id: "LPF000062", type: 1, worker_status: { worker_status: "Employed" }, live_contract_number: "C-MO000040", live_contract_status: 2 },
    ];
    it("every worker listed; a contract-held one shows its contract and cannot be picked; the contract status filter", async () => {
        getWorkers.mockImplementation(() => reply({ data: rows, current_page: 1, last_page: 1, total: 3 }));
        const picked = jest.fn();
        render(<Provider store={ makeStore() }><div className="invd"><WorkerResultTable exchange searchQueryText="" handleSelectedCheckedRows={ picked } /></div></Provider>);
        await screen.findByText("Ana Cruz");
        const first = getWorkers.mock.calls[0][0];
        expect(first).toMatchObject({ live_contract: 1, status: [], search_text: "" });
        expect(first).not.toHaveProperty("contract_status_not_in");
        expect(first).not.toHaveProperty("invoice_profile_status");
        const row = (name) => screen.getByText(name).closest("tr");
        expect(row("Ana Cruz")).toHaveClass("disabled");
        expect(row("Ana Cruz")).toHaveTextContent(`C-MO000096 · ${ en.key_processing }`);
        expect(row("Rosa Lim")).toHaveTextContent(`C-MO000040 · ${ en.key_active }`);
        expect(row("Siti Aminah")).not.toHaveClass("disabled");
        expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([en.key_worker, en.key_worker_type, en.key_nationality, en.key_worker_status, en.key_contract]);
        fireEvent.click(row("Ana Cruz"));
        expect(picked).not.toHaveBeenCalled();
        fireEvent.click(row("Siti Aminah"));
        expect(picked).toHaveBeenCalledWith([rows[0]]);
        fireEvent.change(document.querySelector("[data-filter=live-contract]"), { target: { value: "none" } });
        await waitFor(() => expect(getWorkers.mock.calls.at(-1)[0]).toMatchObject({ live_contract: 1, live_contract_status: ["none"] }));
        // no eligibility labels (#76)
        expect(screen.queryByText(/On Contract|Eligib/)).toBeNull();
    });

    it("the Contract Invoice picker is unchanged: eligible workers only, no contract column", async () => {
        getWorkers.mockImplementation(() => reply({ data: [rows[0]], current_page: 1, last_page: 1, total: 1 }));
        render(<Provider store={ makeStore() }><div className="invd"><WorkerResultTable searchQueryText="" handleSelectedCheckedRows={ jest.fn() } /></div></Provider>);
        await screen.findByText("Siti Aminah");
        expect(getWorkers.mock.calls[0][0]).toMatchObject({ invoice_profile_status: [2, 3, 8], contract_status_not_in: [1, 2] });
        expect(getWorkers.mock.calls[0][0]).not.toHaveProperty("live_contract");
        expect(document.querySelector("[data-filter=live-contract]")).toBeNull();
    });
});

it("the exchange setup route is the Contract setup in Exchange mode behind the Exchange key; the old Select contract screen is gone", () => {
    const routes = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/routes/invoiceRoutes.js"), "utf8");
    expect(routes).toMatch(/const SelectContractExchange = withInvoiceCreateGate\(exchange\(\(\) => import\("\.\.\/Invoice\/add-contract-invoice\/AddContractInvoice"\)\), EXCHANGE_CREATE_KEYS\);/);
    expect(routes).toMatch(/const EXCHANGE_CREATE_KEYS = \["invoice_exchange"\];/);
    expect(routes).toMatch(/createElement\(m\.default, \{ \.\.\.props, mode: "exchange" \}\)/);
    const config = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/routes/routesConfig/invoiceRoutes.js"), "utf8");
    expect(config).toMatch(/selectContractExchange: "invoices\/exchange\/select-contract-exchange",/);
    expect(fs.existsSync(path.resolve(__dirname, "../../Views/Pages/Invoice/exchange/selectContractExchange.js"))).toBe(false);
});
