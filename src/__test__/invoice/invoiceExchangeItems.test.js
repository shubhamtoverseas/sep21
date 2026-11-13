/* eslint-env jest */
import React from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* Exchange · Items (INV-X3; register #71 – #73; OP-27-107, OP-27-108). The Contract Invoice items stage in its Exchange
   mode, at the existing route (invoices/exchange/add-contract-invoice-exchange): the same five-column table for the
   replacement's lines, then the engine's Exchange Credit (A1's reference) and balancing line, read-only; the footer is
   the A2 total HK$0 and, beneath it, the settlement figures. Every change is priced by the engine; the FE never prices. */

jest.mock("../../services/invoices", () => ({ priceContractInvoiceAPI: jest.fn() }));
/* eslint-disable import/first */
import { priceContractInvoiceAPI } from "../../services/invoices";
import invoices from "../../redux/Slices/invoices/InvoicesSlice";
import employer from "../../redux/Slices/employer/EmployerSlice";
import { EXCHANGE } from "../../Views/Pages/Invoice/add-contract-invoice/contractSetup";
import InvoiceItemsTable from "../../Views/Pages/Invoice/add-contract-invoice/InvoiceItemsTable";
import { savedResultOf } from "../../Views/Pages/Invoice/add-contract-invoice/SavedInvoiceLines";
import ContractInvoiceItems from "../../Views/Pages/Invoice/add-contract-invoice/ContractInvoiceItems";
/* eslint-enable import/first */

jest.setTimeout(60000);
beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
beforeEach(() => priceContractInvoiceAPI.mockReset());

const reply = (data) => Promise.resolve({ data: { status: true, data } });
const SETUP = { route: "exchange", exchange: { invoice_id: 100, service_route: "local" }, worker_id: 60, category: null, driver: false, date: "2026-11-02", branch: 5 };
const INFO = {
    currentInvoiceEmployerDetail: { employer_id: 2, name: "Chan Tai Man", reference_id: "E-0002" }, currentInvoiceWorkerDetail: { id: 60, name: "Siti Aminah", reference_id: "LIF000060" },
    currentInvoiceExchange: { id: 100, invoice_number: "I-MO000100" }, invoice_date: "2026-11-02", branchId: "5", branch_name: "Tsim Sha Tsui", csId: "2", cs_name: "Lee Ka Yan",
};
const BASE = { id: "base", kind: "base", itemType: "Local", label: "Filipino · Local Finished · Replacement", add: "required", original: 10000, discount: 1500, net: 8500,
    steps: [{ label: "Replacement 15%", amount: 1500, locked: true }] };
const DOC = { id: "item:204", kind: "item", itemType: "Document Fee", label: "Contract documentation", item: 204, add: "manual", amountSource: "catalogue", original: 500, discount: 0, net: 500, steps: [] };
const CREDIT = { id: "exchange_credit", kind: "exchange_credit", itemType: "Exchange Credit", label: "Exchange Credit", detail: "I-MO000100", original: null, net: -16820, steps: [] };
const BALANCE = { id: "balance_adjustment", kind: "balance_adjustment", itemType: "Balance Adjustment", label: "Balance Adjustment", detail: "Remaining Credit", original: null, net: 7820, steps: [] };
const UNDER = { id: "underpayment", kind: "underpayment", itemType: "Underpayment", label: "Underpayment", detail: "Collected by the Underpayment invoice", original: null, net: -900, steps: [] };
const CHEAPER = {
    ok: true, route: "exchange", serviceRoute: "local", problems: [], notes: [], refused: [], clash: [], restorable: [], available: [], offerSkills: [], promotions: [],
    lines: [BASE, DOC, CREDIT, BALANCE], total: { original: 10500, discount: 1500, net: 0 },
    settlement: { replacementValue: 9000, exchangeCredit: 16820, shortfall: 0, remainingCredit: 7820 }, record_key: "rk",
};
const DEARER = { ...CHEAPER, lines: [BASE, DOC, { ...CREDIT, net: -8100 }, UNDER], settlement: { replacementValue: 9000, exchangeCredit: 8100, shortfall: 900, remainingCredit: 0 } };

describe("the line table on an A2", () => {
    const table = (props) => render(<div className="invd"><InvoiceItemsTable mode="edit" onRemove={ jest.fn() } onPanel={ jest.fn() } { ...props } /></div>);
    it("the replacement's lines, then the Exchange Credit naming A1 and the Balance Adjustment, read-only; A2 total HK$0 and the settlement beneath", () => {
        const { container } = table({ result: CHEAPER });
        const credit = container.querySelector("[data-settlement=exchange_credit]");
        expect(credit).toHaveTextContent("Exchange CreditExchange CreditI-MO000100——−HK$16,820");
        expect(within(credit).queryAllByRole("button")).toHaveLength(0);
        expect(container.querySelector("[data-settlement=balance_adjustment]")).toHaveTextContent("Balance AdjustmentRemaining Credit——HK$7,820");
        expect(container.querySelector(".total-row")).toHaveTextContent(`${ en.key_inv_a2_total }HK$10,500−HK$1,500HK$0`);
        const figures = [...container.querySelectorAll("[data-settlement-figure]")].map((r) => [r.getAttribute("data-settlement-figure"), r.textContent]);
        expect(figures).toEqual([
            ["replacement", `${ en.key_inv_replacement_value }HK$9,000`], ["credit", `${ en.key_exchange_credit }−HK$16,820`], ["remaining", `${ en.key_remaining_credit }HK$7,820`],
        ]);
        // the replacement's own lines keep their actions
        expect(within(container.querySelector("[data-line='item:204']")).getAllByRole("button").length).toBeGreaterThan(0);
    });
    it("a dearer replacement: the underpayment line and the Shortfall", () => {
        const { container } = table({ result: DEARER });
        expect(container.querySelector("[data-settlement=underpayment]")).toHaveTextContent("UnderpaymentCollected by the Underpayment invoice——−HK$900");
        expect([...container.querySelectorAll("[data-settlement-figure]")].map((r) => r.getAttribute("data-settlement-figure"))).toEqual(["replacement", "credit", "shortfall"]);
    });
    it("an A2's frozen record reads the same (OP-27-118): its settlement from the record, nothing summed here", () => {
        const record = {
            route: "local", summary: { charges: 10500, discounts: 1500, invoiceTotal: 0, creditApplied: 0, amountDue: 0 },
            settlement: { replacementValue: 9000, exchangeCredit: 16820, shortfall: 0, remainingCredit: 7820 },
            lines: [
                { key: "base", role: "base", item_type: "Local", description: "Filipino · Local Finished · Replacement", detail: null, original: 10000, discount: 1500, net: 8500, removed: false, steps: [] },
                { key: "exchange_credit", role: "exchange_credit", item_type: "Exchange Credit", description: "Exchange Credit", detail: "I-MO000100", original: null, discount: 0, net: -16820, removed: false, steps: [] },
                { key: "balance_adjustment", role: "balance_adjustment", item_type: "Balance Adjustment", description: "Balance Adjustment", detail: "Remaining Credit", original: null, discount: 0, net: 7820, removed: false, steps: [] },
            ],
        };
        const { container } = render(<div className="invd"><InvoiceItemsTable mode="ro" result={ savedResultOf(record) } settlement={ record.settlement } /></div>);
        expect(container.querySelector("[data-settlement=exchange_credit]")).toHaveTextContent("−HK$16,820");
        expect(container.querySelector("[data-total]")).toHaveTextContent("HK$0");
        expect(container.querySelector("[data-settlement-figure=remaining]")).toHaveTextContent("HK$7,820");
    });
    it("a Contract Invoice is unchanged: Invoice total, no settlement figures", () => {
        const { container } = table({ result: { ...CHEAPER, lines: [BASE, DOC], settlement: undefined, total: { original: 10500, discount: 1500, net: 9000 } } });
        expect(container.querySelector(".total-row")).toHaveTextContent(en.key_invoice_total);
        expect(container.querySelector("[data-settlement-figure]")).toBeNull();
    });
});

const Probe = () => {
    const { pathname, state } = useLocation();
    return <pre data-testid="next">{ JSON.stringify({ pathname, state }) }</pre>;
};
const mount = (state = { contractFormInfo: INFO, setupInput: SETUP }) => {
    const store = configureStore({ reducer: { invoices, employer } });
    render(
        <Provider store={ store }>
            <MemoryRouter initialEntries={ [{ pathname: "/invoices/exchange/add-contract-invoice-exchange", state }] }>
                <Routes>
                    <Route path="/invoices/exchange/add-contract-invoice-exchange" element={ <ContractInvoiceItems mode={ EXCHANGE } /> } />
                    <Route path="/invoices/exchange/exchange-invoice-review" element={ <Probe /> } />
                    <Route path="/invoices" element={ <Probe /> } />
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
    return store;
};

describe("the items stage in Exchange mode", () => {
    it("prices the setup's exchange input; Exchange of <A1 ref>; two items (settlement lines are not items); Continue to the Exchange Settlement review", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply(CHEAPER));
        mount();
        await screen.findByText("Contract documentation");
        expect(priceContractInvoiceAPI.mock.calls[0][0]).toEqual({ ...SETUP, removed: [], add: [], custom: [], deductions: {}, skills: [] });
        expect(document.querySelector("[data-context]")).toHaveTextContent("Exchange of I-MO000100");
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en.key_exchange_contract_invoice);
        expect(document.querySelector("[data-exchange-of]")).toHaveTextContent("I-MO000100");
        expect(screen.getByText(/2 items|2 lines/)).toBeInTheDocument();
        expect(screen.queryByText(en.key_payment_confirmation)).toBeNull();
        expect(screen.getByText(en.key_inv_exchange_settlement_review)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: en.key_inv_continue_to_review }));
        const next = JSON.parse((await screen.findByTestId("next")).textContent);
        expect(next.pathname).toBe("/invoices/exchange/exchange-invoice-review");
        expect(next.state.setupInput).toEqual(SETUP);
        expect(next.state.contractFormInfo.currentInvoiceExchange).toEqual({ id: 100, invoice_number: "I-MO000100" });
    });

    it("A1's or the worker's refusal blocks with the engine's words and sends staff back to setup", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply({ ...CHEAPER, ok: false, total: null, settlement: null, lines: [CREDIT],
            problems: [{ scope: "worker", text: "A contract is already active or currently being processed for this worker." }] }));
        mount();
        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent("A contract is already active or currently being processed for this worker.");
        expect(within(alert).getByRole("button", { name: en.key_inv_back_to_setup })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: en.key_inv_continue_to_review })).toBeDisabled();
    });

    it("opened without the setup's input: back to the invoice list (an exchange starts from its original invoice)", async () => {
        mount({});
        expect(JSON.parse((await screen.findByTestId("next")).textContent).pathname).toBe("/invoices");
    });
});

it("the exchange items route is the Contract items stage in Exchange mode behind the Exchange key; the old items screen is gone", () => {
    const routes = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/routes/invoiceRoutes.js"), "utf8");
    expect(routes).toContain('const AddContractInvoiceExchange = withInvoiceCreateGate(exchange(() => import("../Invoice/add-contract-invoice/ContractInvoiceItems")), EXCHANGE_CREATE_KEYS);');
    expect(fs.existsSync(path.resolve(__dirname, "../../Views/Pages/Invoice/exchange/addContractInvoiceExchange.js"))).toBe(false);
});
