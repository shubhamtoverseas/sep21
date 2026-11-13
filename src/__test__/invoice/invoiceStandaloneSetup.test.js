/* eslint-env jest */
import React from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* Standalone Invoice · Setup (INV-G2; register #27, #28, #54, #80; the INV-G1 engine route "standalone"). The Contract
   Invoice setup stage in its Standalone mode: the party card replaces the Employer and worker card — one party, Employer or
   Worker, never both; an employer can be created through the existing form, a worker is searched and selected (never
   created) and its details reviewed in the Standalone worker form, as before INV-G2 (owner, 30 Oct) — the Service card
   keeps the engine's note and the rule note, and the Invoice card shows the CS Owner as the creator. The screen prices with
   the engine (route standalone) on every change and never prices itself. */

jest.mock("../../services/invoices", () => ({ priceContractInvoiceAPI: jest.fn(), validateContractAPI: jest.fn() }));
jest.mock("../../services/branches", () => ({ getActiveBranches: jest.fn(() => new Promise(() => {})) }));
jest.mock("../../Views/Pages/Invoice/add-contract-invoice/CommonPageHeaderInvoice", () => (props) => (
    <div data-testid="header" data-cs={ props.csFixed ? props.csFixed.name : "" } data-title={ props.title }>
        <button type="button" onClick={ () => props.onUpdateContractForm({ branchId: 5, invoice_date: "2026-10-23", branch_name: "Tsim Sha Tsui" }) }>fill-header</button>
    </div>
));
jest.mock("../../Views/Pages/Invoice/add-contract-invoice/SelectEmployerModal", () => (props) => (props.open ? <div>
    <button type="button" onClick={ () => props.onSelect({ employer_id: 40, name: "Chan Tai Man", reference_id: "E-1001" }) }>pick-employer-40</button>
    <button type="button" onClick={ props.onNewEmployer }>new-employer</button>
</div> : null));
jest.mock("../../Views/Pages/Invoice/add-contract-invoice/AddEmployerDetailsOfInvoice", () => (props) => (
    <button type="button" data-standalone={ String(Boolean(props.standalone)) } onClick={ () => props.onDone({ employer_id: 77, id: 77, name: "Wong Siu Ming" }) }>save-new-employer</button>
));
jest.mock("../../Views/Pages/Invoice/add-contract-invoice/SelectWorkerModal", () => (props) => (props.open
    ? <button type="button" onClick={ () => props.onSelect({ id: 56, fullname: "Ana Cruz", reference_id: "LPF000056", type: 1 }) }>pick-worker-56</button> : null));
/* the Standalone worker form (its own test: invoiceStandaloneWorkerForm) and the Contract one, which Standalone never opens */
jest.mock("../../Views/Pages/Invoice/general/AddWorkerDetailsOfInvoice", () => (props) => (
    <div data-testid="standalone-worker-form" data-worker={ props.workerId } data-back={ String(Boolean(props.onBack)) }>
        <button type="button" onClick={ () => props.onDone({ id: props.workerId, name: "Ana Cruz", reference_id: "LPF000056", passport_number: "P000999" }) }>worker-form-next</button>
    </div>
));
jest.mock("../../Views/Pages/Invoice/add-contract-invoice/AddWorkerDetailsOfInvoice", () => () => <div data-testid="contract-worker-form" />);
/* eslint-disable import/first */
import { priceContractInvoiceAPI, validateContractAPI } from "../../services/invoices";
import invoices from "../../redux/Slices/invoices/InvoicesSlice";
import employer, { setInvoiceCurrentEmployer } from "../../redux/Slices/employer/EmployerSlice";
import worker, { setInvoiceCurrentWorker } from "../../redux/Slices/worker/WorkerSlice";
import contracts from "../../redux/Slices/contract/ContractSlice";
import branches from "../../redux/Slices/settings/branches/BranchesSlice";
import cs from "../../redux/Slices/common/cs/CsSlice";
import { STANDALONE, standaloneInput } from "../../Views/Pages/Invoice/add-contract-invoice/contractSetup";
import ContractSetupService from "../../Views/Pages/Invoice/add-contract-invoice/ContractSetupService";
import AddContractInvoice from "../../Views/Pages/Invoice/add-contract-invoice/AddContractInvoice";
/* eslint-enable import/first */

const RealHeader = jest.requireActual("../../Views/Pages/Invoice/add-contract-invoice/CommonPageHeaderInvoice").default;

beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
beforeEach(() => {
    sessionStorage.setItem("user", JSON.stringify({ token: "t", data: { id: 9, role: { id: 1 }, staff: { id: 7, first_name: "Lee", last_name: "Ka Yan" } } }));
});
afterEach(() => { jest.resetAllMocks(); sessionStorage.clear(); });

const reply = (data) => Promise.resolve({ data: { status: true, data } });
const OK = { ok: true, route: "standalone", problems: [], lines: [], total: { original: 0, discount: 0, net: 0 }, record_key: "rk", reservationFee: { allowed: false, why: "Not available for Standalone" } };

describe("the Standalone input", () => {
    it("route standalone, the one party by id, the date and branch; nothing until the date and branch are set; no party until one is chosen", () => {
        const base = { invoiceDate: "2026-10-23", branchId: "5", employerId: "40", workerId: 56 };
        expect(standaloneInput({ ...base, partyType: "employer" })).toEqual({ route: STANDALONE, party: { type: "employer", id: 40 }, date: "2026-10-23", branch: 5 });
        expect(standaloneInput({ ...base, partyType: "worker" })).toEqual({ route: STANDALONE, party: { type: "worker", id: 56 }, date: "2026-10-23", branch: 5 });
        expect(standaloneInput({ ...base, partyType: "" }).party).toBeNull();
        expect(standaloneInput({ ...base, partyType: "employer", employerId: null }).party).toBeNull();
        expect(standaloneInput({ ...base, partyType: "employer", branchId: "" })).toBeNull();
        expect(standaloneInput({ ...base, partyType: "employer", invoiceDate: "" })).toBeNull();
    });
});

describe("the Service card in Standalone mode", () => {
    const card = (pricing) => render(<div className="invd"><ContractSetupService mode={ STANDALONE } pricing={ pricing } onChoose={ jest.fn() } /></div>);
    it("no route choice, no driver, no New / Replacement, no pricing code; the engine's note and the Standalone rule note", () => {
        card({ status: "ready", result: OK, error: "", retry: jest.fn() });
        expect(screen.queryAllByRole("radiogroup")).toHaveLength(0);
        expect(screen.queryByText(en.key_pricing_code)).toBeNull();
        expect(screen.getByText(en.key_invoice_type_title_standalone)).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent(en.key_inv_enough_to_price);
        expect(screen.getByRole("note")).toHaveTextContent("A Standalone Invoice bills one party and creates no contract.");
    });
    it("what stops the invoice, word for word (red note)", () => {
        card({ status: "ready", result: { ...OK, ok: false, problems: [{ scope: "party", text: "Choose the employer or the worker this invoice is for." }] }, error: "", retry: jest.fn() });
        expect(screen.getByRole("alert")).toHaveTextContent("Choose the employer or the worker this invoice is for.");
    });
});

const Probe = () => {
    const { state } = useLocation();
    return <pre data-testid="items">{ JSON.stringify(state) }</pre>;
};
const mount = (party = "employer") => {
    const store = configureStore({ reducer: { invoices, employer, worker, contracts, branches, cs }, middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }) });
    render(
        <Provider store={ store }>
            <MemoryRouter initialEntries={ [`/invoices/general/add-contract-invoice/${ party }`] }>
                <Routes>
                    <Route path="/invoices/general/add-contract-invoice/:selection_type" element={ <AddContractInvoice mode={ STANDALONE } /> } />
                    <Route path="/invoices/general/form" element={ <Probe /> } />
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
    return store;
};
/* the party card waits for its lazy cards (Suspense) on the first mount */
const ready = () => screen.findByRole("radiogroup", { name: en.key_who_generate_invoice });
const partyRadios = () => within(screen.getByRole("radiogroup", { name: en.key_who_generate_invoice })).getAllByRole("radio").map((r) => [r.value, r.checked]);
const continueButton = () => screen.getByRole("button", { name: en.key_continue_to_pricing_items });
const lastInput = () => priceContractInvoiceAPI.mock.calls.at(-1)[0];

describe("the setup screen in Standalone mode", () => {
    it("employer party: the party card (one party), no route choices, the creator as CS Owner, the engine priced with route standalone; Continue carries the input", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply(OK));
        mount("employer");
        await ready();
        expect(screen.getByTestId("header")).toHaveAttribute("data-title", en.key_add_general_invoice);
        expect(screen.getByTestId("header")).toHaveAttribute("data-cs", "Lee Ka Yan");
        expect(screen.getByText(en.key_inv_bill_to)).toBeInTheDocument();
        expect(partyRadios()).toEqual([["employer", true], ["worker", false]]);
        expect(screen.queryByText(en.key_no_worker_selected)).toBeNull();
        // the only choice on the screen is the party type: no Local Transfer, Direct Hire, Type (Internal) or driver
        expect(screen.queryAllByRole("radiogroup").map((g) => g.getAttribute("aria-label"))).toEqual([en.key_who_generate_invoice]);
        expect(continueButton()).toBeDisabled();
        fireEvent.click(screen.getByText("fill-header"));
        fireEvent.click(screen.getByRole("button", { name: en.key_select_employer }));
        fireEvent.click(await screen.findByText("pick-employer-40"));
        await waitFor(() => expect(lastInput()).toEqual({ route: "standalone", party: { type: "employer", id: 40 }, date: "2026-10-23", branch: 5 }));
        expect(await screen.findByRole("status")).toHaveTextContent(en.key_inv_enough_to_price);
        expect(validateContractAPI).not.toHaveBeenCalled();
        await waitFor(() => expect(continueButton()).toBeEnabled());
        fireEvent.click(continueButton());
        const state = JSON.parse((await screen.findByTestId("items")).textContent);
        expect(state.setupInput).toEqual({ route: "standalone", party: { type: "employer", id: 40 }, date: "2026-10-23", branch: 5 });
        expect(state.contractFormInfo).toMatchObject({ party_type: "employer", csId: 7, cs_name: "Lee Ka Yan", currentInvoiceWorkerDetail: null,
            currentInvoiceEmployerDetail: { employer_id: 40, name: "Chan Tai Man" } });
    });

    it("employer party: Create new employer through the existing form; the new employer (its id) is the party", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply(OK));
        mount("employer");
        await ready();
        fireEvent.click(screen.getByText("fill-header"));
        fireEvent.click(screen.getByRole("button", { name: en.key_select_employer }));
        fireEvent.click(await screen.findByText("new-employer"));
        const save = await screen.findByText("save-new-employer");
        expect(save).toHaveAttribute("data-standalone", "true");
        fireEvent.click(save);
        await waitFor(() => expect(lastInput().party).toEqual({ type: "employer", id: 77 }));
        expect(screen.getByText(/Wong Siu Ming/, { selector: ".added-banner *" })).toBeInTheDocument();
    });

    it("worker party: search and select, then the Standalone worker form (Back to the search; Next makes it the party); Edit reopens it; no contract check; choosing it drops the employer — one party, never both", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply(OK));
        const store = mount("employer");
        await ready();
        act(() => { store.dispatch(setInvoiceCurrentEmployer({ employer_id: 40, name: "Chan Tai Man" })); });
        fireEvent.click(screen.getByText("fill-header"));
        fireEvent.click(within(screen.getByRole("radiogroup", { name: en.key_who_generate_invoice })).getByLabelText(en.key_worker));
        await waitFor(() => expect(store.getState().employer.currentInvoiceEmployerDetail).toBeFalsy());
        expect(partyRadios()).toEqual([["employer", false], ["worker", true]]);
        fireEvent.click(screen.getByRole("button", { name: `${ en.key_select } Worker` }));
        fireEvent.click(await screen.findByText("pick-worker-56"));
        // the old screen's step: the picked worker's details, reviewed (and updated) before it is the party
        const form = await screen.findByTestId("standalone-worker-form");
        expect([form.getAttribute("data-worker"), form.getAttribute("data-back")]).toEqual(["56", "true"]);
        expect(store.getState().worker.currentInvoiceWorkerDetail).toBeFalsy();
        fireEvent.click(screen.getByText("worker-form-next"));
        await waitFor(() => expect(lastInput()).toEqual({ route: "standalone", party: { type: "worker", id: 56 }, date: "2026-10-23", branch: 5 }));
        expect(store.getState().worker.currentInvoiceWorkerDetail).toMatchObject({ id: 56, name: "Ana Cruz", passport_number: "P000999" });
        expect(screen.queryByTestId("standalone-worker-form")).toBeNull();
        expect(screen.getByText("Ana Cruz")).toBeInTheDocument();
        // Edit on the card reopens the same form, from the card (Cancel only, no Back)
        fireEvent.click(screen.getByRole("button", { name: en.key_edit }));
        expect((await screen.findByTestId("standalone-worker-form")).getAttribute("data-back")).toBe("false");
        fireEvent.click(screen.getByText("worker-form-next"));
        await waitFor(() => expect(screen.queryByTestId("standalone-worker-form")).toBeNull());
        expect(screen.queryByTestId("contract-worker-form")).toBeNull();
        expect(validateContractAPI).not.toHaveBeenCalled();
        await waitFor(() => expect(continueButton()).toBeEnabled());
        fireEvent.click(continueButton());
        const state = JSON.parse((await screen.findByTestId("items")).textContent);
        expect(state.contractFormInfo).toMatchObject({ party_type: "worker", currentInvoiceEmployerDetail: null, currentInvoiceWorkerDetail: { id: 56 } });
    });

    it("a worker party from a record page arrives selected; the engine's red note shows what stops the invoice", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply({ ...OK, ok: false, total: null, problems: [{ scope: "invoice", text: "Something the engine refused." }] }));
        const store = mount("worker");
        await ready();
        act(() => { store.dispatch(setInvoiceCurrentWorker({ id: 56, name: "Ana Cruz" })); });
        fireEvent.click(screen.getByText("fill-header"));
        expect(await screen.findByRole("alert")).toHaveTextContent("Something the engine refused.");
    });
});

describe("the Invoice card: the CS Owner is the creator, shown and not chosen (#80)", () => {
    it("a fixed CS Owner is a read-only cell; Invoice Date (±7 days) and Branch stay as they are", async () => {
        const store = configureStore({
            reducer: { branches, cs, invoices },
            preloadedState: { branches: { ...branches(undefined, { type: "@init" }), currentActiveBranches: [{ id: 5, branch_name: "Tsim Sha Tsui" }] } },
        });
        let view;
        await act(async () => {
            view = render(<Provider store={ store }><RealHeader title="t" onUpdateContractForm={ jest.fn() } csFixed={ { id: 7, name: "Lee Ka Yan" } } /></Provider>);
        });
        const cell = view.container.querySelector("[data-cs-fixed]");
        expect(cell).toHaveTextContent(`${ en.key_handling_staff_cs_owner }Lee Ka Yan`);
        expect(view.container.querySelector("select[name=cs_id]")).toBeNull();
        expect(view.container.querySelector("select[name=branch_id]")).not.toBeNull();
        expect(view.container.querySelector("input[name=invoice_date]")).not.toBeNull();
    });
});

it("a new employer created from the invoice is the one save-employer created: its id from the answer, nothing of an employer loaded before", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/Invoice/add-contract-invoice/AddEmployerDetailsOfInvoice.js"), "utf8");
    expect(src).toMatch(/const createdId = res\?\.payload\?\.data\?\.id;/);
    expect(src).toMatch(/const saved = employer_id \? \{ \.\.\.currentEmployer, \.\.\.formData \} : \{ \.\.\.formData, \.\.\.\(createdId \? \{ employer_id: createdId, id: createdId \} : \{\}\) \};/);
    expect(src).toMatch(/props\.onDone\(saved\);/);
    expect(src).not.toMatch(/props\.onDone\(\{ \.\.\.currentEmployer, \.\.\.formData \}\)/);
});

it("the /invoices/general/ setup route is the Contract Invoice setup in Standalone mode; the old Standalone setup and its full-page pickers are gone", () => {
    const routes = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/routes/invoiceRoutes.js"), "utf8");
    expect(routes).toMatch(/const AddContractInvoiceGeneral = withInvoiceCreateGate\(standalone\(\(\) => import\("\.\.\/Invoice\/add-contract-invoice\/AddContractInvoice"\)\), STANDALONE_CREATE_KEYS\);/);
    expect(routes).toMatch(/createElement\(m\.default, \{ \.\.\.props, mode: "standalone" \}\)/);
    const general = path.resolve(__dirname, "../../Views/Pages/Invoice/general");
    for (const gone of ["AddContractInvoice.js", "SelectEmployer.js", "SelectWorker.js", "AddEmployerDetailsOfInvoice.js",
        "DetailsCardEmployer.js", "DetailsCardWorker.js", "CommonPageHeaderInvoice.js", "EntityContactDetailsForm.js", "WorkerTableInvoice.js"]) {
        expect([gone, fs.existsSync(path.join(general, gone))]).toEqual([gone, false]);
    }
    // kept (owner, 30 Oct): the Standalone worker form, now a modal only — no page route reaches it
    expect(fs.existsSync(path.join(general, "AddWorkerDetailsOfInvoice.js"))).toBe(true);
    expect(routes).not.toMatch(/general\/AddWorkerDetailsOfInvoice/);
    const config = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/routes/routesConfig/invoiceRoutes.js"), "utf8");
    expect(config).not.toMatch(/general\/select-(employer|worker)/);
    expect(config).toMatch(/addContractInvoiceGeneral: "invoices\/general\/add-contract-invoice\/:selection_type",/);
});
