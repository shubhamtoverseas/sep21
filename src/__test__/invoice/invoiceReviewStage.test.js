/* eslint-env jest */
import React from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* Contract Invoice · Invoice Review (27 Oct package, INV-C4): the prepared invoice priced again by the engine (with the
   credit applied on Invoice items, package :544), the same lines and the credit read-only (:546), the financial summary, and Payment below the table:
   Full Payment, or the Reservation Fee where the engine allows it, the existing payment-method component unchanged, no
   invoice reference before creation. The submission carries the priced input and the record shown; a refused one makes
   the screen ask the engine again. Amount due now HK$0 (R-P2, OP-27-54): "No payment required", no payment option or
   method, and the invoice is created without a payment. */

jest.mock("../../services/invoices", () => ({
    priceContractInvoiceAPI: jest.fn(), setContractInvoice: jest.fn(), getReservationFee: jest.fn(() => new Promise(() => {})),
    getEmployerCreditList: jest.fn(() => new Promise(() => {})),
}));
jest.mock("../../Views/Pages/Invoice/payment-method-selector/PaymentMethodSelector", () => {
    const mockSeen = require("./invoiceReviewStage.seen");
    return (props) => { mockSeen.props = props; return <div data-testid="pms" />; };
});
/* eslint-disable import/first */
import { priceContractInvoiceAPI, setContractInvoice } from "../../services/invoices";
import invoices from "../../redux/Slices/invoices/InvoicesSlice";
import employer from "../../redux/Slices/employer/EmployerSlice";
import worker from "../../redux/Slices/worker/WorkerSlice";
import InvoiceReview from "../../Views/Pages/Invoice/add-contract-invoice/InvoiceReview";
import seen from "./invoiceReviewStage.seen";
/* eslint-enable import/first */

beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
afterEach(() => { jest.clearAllMocks(); seen.props = null; });

const SETUP = { worker_id: 501, employer_id: 40, route: "local", category: null, type: "new", driver: false, date: "2026-10-23", branch: 5 };
const FORM = {
    currentInvoiceEmployerDetail: { employer_id: 40, name: "Chan Tai Man", reference_id: "E-1001" },
    currentInvoiceWorkerDetail: { id: 501, name: "Maria Lourdes Santos", reference_id: "LPF902190" },
    contract_type_internal: "new", invoice_date: "2026-10-23", branchId: 5, csId: 9, branch_name: "Central", cs_name: "Lee",
};
const CHOICES = { removed: [205], add: [], custom: [], deductions: { base: [{ kind: "flat", value: 300, label: "Manual discount", reason: "Returning employer" }] }, experience: null, skills: [] };
const base = (over = {}) => ({
    id: "base", kind: "base", itemType: "Local", label: "Filipino · Local Finished · New", original: 10000, discount: 300, net: 9700,
    steps: [{ label: "Manual discount", kind: "flat", value: 300, amount: 300, locked: false }], refusedSteps: [], add: null, treatment: null, ...over,
});
const doc = { id: "item:1", kind: "item", itemType: "Document Fee", label: "Contract documentation", original: 500, discount: 0, net: 500, steps: [], refusedSteps: [], add: "required", item: 1, amountSource: "catalogue" };
const answer = (over = {}) => ({
    ok: true, route: "local", record_key: "rk-1", worker: { id: 501 }, problems: [], notes: [],
    lines: [base(), doc], total: { original: 10500, discount: 300, net: 10200 },
    removed: [{ item: 205, itemType: "Insurance Policy", label: "Domestic helper insurance" }],
    restorable: [{ item: 205, amount: 1000, itemType: "Insurance Policy", label: "Domestic helper insurance" }],
    credits: [], summary: { charges: 10500, discounts: 300, invoiceTotal: 10200, creditApplied: 0, amountDue: 10200 },
    reservationFee: { allowed: true, why: "" }, ...over,
});
const reply = (data) => Promise.resolve({ data: { status: true, data } });

const mount = (draft = { choices: CHOICES }) => {
    const store = configureStore({
        reducer: { invoices, employer, worker, users: () => ({ permissionList: { data: [] } }) },
        preloadedState: { invoices: { ...invoices(undefined, { type: "@init" }), invoiceContractItemsList: draft, reservationFee: { value: 300 } } },
    });
    render(
        <Provider store={ store }>
            <MemoryRouter initialEntries={ [{ pathname: "/review", state: { contractFormInfo: FORM, setupInput: SETUP } }] }>
                <Routes>
                    <Route path="/review" element={ <InvoiceReview /> } />
                    <Route path="/invoices/add-contract-invoice/payment-type-invoice/:id" element={ <div data-testid="detail" /> } />
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
    return store;
};
const ready = () => waitFor(() => expect(screen.getByTestId("pms")).toBeInTheDocument());

it("the same lines read-only (no actions, removed lines struck through), the summary boxes, no reference before creation", async () => {
    priceContractInvoiceAPI.mockImplementation(() => reply(answer()));
    mount();
    await ready();
    expect(priceContractInvoiceAPI).toHaveBeenCalledWith({ ...SETUP, removed: [205], add: [], custom: [], deductions: CHOICES.deductions, skills: [], employer_id: 40, credits: [] });
    expect(document.querySelectorAll(".inv-lines .ibtn")).toHaveLength(0);
    expect(document.querySelector("tr.rm-row").textContent).toContain("Domestic helper insuranceRemoved by staff");
    const boxes = [...document.querySelectorAll(".fin-summary .fs-box")].map((b) => b.textContent);
    expect(boxes).toEqual(["ChargesHK$10,500", "Discounts−HK$300", "Invoice totalHK$10,200", "Amount due nowHK$10,200"]);
    expect(document.querySelector("[data-reference]").textContent).toBe("not issued yet");
    // Payment comes after the table, never beside it
    const order = [...document.querySelectorAll(".review-stage > section")].map((s) => s.className);
    expect(order.indexOf("review-card items-card")).toBeLessThan(order.findIndex((c) => c.includes("pay-block")));
});

it("the payment component submits the priced input and the record shown; line rows and totals are the server's", async () => {
    priceContractInvoiceAPI.mockImplementation(() => reply(answer()));
    mount();
    await ready();
    const data = seen.props.invoiceData;
    expect(seen.props.selectionType).toBe("contract");
    expect(data).toMatchObject({
        employer_id: 40, worker_id: 501, contract_type: "new", invoices_date: "2026-10-23", branch_id: 5, staff_id: 9,
        total_amount: 10500, total_discount: 300, final_amount: 10200, payment_type: "full", paid_amount: 10200, remaining_balance: 0,
        apply_credits: [], record_key: "rk-1", pricing: { ...SETUP, removed: [205], add: [], custom: [], deductions: CHOICES.deductions, skills: [] },
    });
    expect("invoice_items" in data || "itemData" in data || "final_items" in data).toBe(false);
});

it("a refused submission asks the engine again, so staff review the record as it is now", async () => {
    priceContractInvoiceAPI.mockImplementation(() => reply(answer()));
    const store = mount();
    await ready();
    setContractInvoice.mockImplementation(() => Promise.reject({ response: { status: 400, data: { status: false, message: "Prices changed since Invoice Review. Review the invoice again before creating it." } } }));
    const calls = priceContractInvoiceAPI.mock.calls.length;
    let res;
    await act(async () => { res = await store.dispatch(seen.props.submitAction({ ...seen.props.invoiceData, payment_method: "cash" })); });
    expect(res.meta.requestStatus).toBe("rejected");
    await waitFor(() => expect(priceContractInvoiceAPI.mock.calls.length).toBe(calls + 1));
    expect(setContractInvoice).toHaveBeenCalledWith(expect.objectContaining({ record_key: "rk-1", payment_method: "cash" }));
});

it("R-P1: the Reservation Fee where the engine allows it (the fee due now, the remaining balance); disabled with the engine's reason otherwise", async () => {
    priceContractInvoiceAPI.mockImplementation(() => reply(answer()));
    mount();
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /^Reservation Fee/ }));
    expect(document.querySelector("[data-due-now]").textContent).toBe("HK$300");
    expect(seen.props.invoiceData).toMatchObject({ payment_type: "reservation_fee", paid_amount: 300, remaining_balance: 9900, due_date: "", follow_up_note: "" });
    priceContractInvoiceAPI.mockImplementation(() => reply(answer({ route: "local_transfer", reservationFee: { allowed: false, why: "Not available for Local Transfer" } })));
    seen.props = null;
    document.body.innerHTML = "";
    mount();
    await ready();
    const rf = screen.getByRole("button", { name: /^Reservation Fee/ });
    expect([rf.disabled, rf.textContent]).toEqual([true, "Reservation FeeNot available for Local Transfer"]);
    expect(seen.props.invoiceData.payment_type).toBe("full");
});

it("the credit applied on Invoice items (:544) is priced with the invoice and shown read-only (:546): a source-linked negative entry, then the amount due now", async () => {
    priceContractInvoiceAPI.mockImplementation((input) => reply(answer(input.credits.length ? {
        credits: [{ source: "I-HKH000432(E)", requested: 2000, available: 3000, applied: 2000, remainder: 1000 }],
        summary: { charges: 10500, discounts: 300, invoiceTotal: 10200, creditApplied: 2000, amountDue: 8200 }, reservationFee: { allowed: false, why: "Not available with saved credit applied" },
    } : {})));
    const credit = { id: 31, amount: 2000, available: 3000, employer_id: 40, credit_type: "exchange_surplus", remainder: "keep", _reference: "I-HKH000432(E)", _name: "Ana Cruz" };
    mount({ choices: CHOICES, appliedCredits: [credit], creditRequestKey: "req-1" });
    await ready();
    expect(priceContractInvoiceAPI).toHaveBeenLastCalledWith(expect.objectContaining({ employer_id: 40, credits: [{ id: 31, amount: 2000 }] }));
    const row = document.querySelector("tr.credit-row");
    expect(row.textContent).toBe(`${ en.key_credit } · ${ en.key_saved_exchange_credit_badge }From I-HKH000432(E)——−HK$2,000`);
    // read-only: no credit picker, no editable amount, no remove
    expect(document.querySelector("[data-credit-picker]")).toBeNull();
    expect(document.querySelector("tr.credit-line input, tr.credit-row input")).toBeNull();
    expect(document.querySelector("[data-due]").textContent).toBe("HK$8,200");
    expect([...document.querySelectorAll(".fin-summary .fs-box")].map((b) => b.textContent)).toContain("Credit appliedHK$2,000".replace("HK", "−HK"));
    expect(seen.props.invoiceData).toMatchObject({ apply_credits: [{ id: 31, amount: 2000, employer_id: 40, credit_type: "exchange_surplus", remainder: "keep" }], credit_request_key: "req-1" });
});

it("an invoice that can't be created: the engine's problems, Back to Invoice items, no payment", async () => {
    priceContractInvoiceAPI.mockImplementation(() => reply(answer({ ok: false, total: null, summary: null, record_key: null, problems: [{ scope: "item", text: "Hospital cover top-up has no amount for Renewal." }] })));
    mount();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Hospital cover top-up has no amount for Renewal."));
    expect(within(screen.getByRole("alert")).getByRole("button", { name: "Back to Invoice items" })).toBeInTheDocument();
    expect(screen.queryByTestId("pms")).toBeNull();
    expect(document.querySelector(".fin-summary")).toBeNull();
});

it("R-P2 (OP-27-54): Amount due now HK$0 — No payment required, no payment option or method; the invoice is created without a payment and opens on its detail", async () => {
    const zero = {
        credits: [{ source: "I-HKH000432(E)", requested: 10200, available: 12000, applied: 10200, remainder: 1800 }],
        summary: { charges: 10500, discounts: 300, invoiceTotal: 10200, creditApplied: 10200, amountDue: 0 }, reservationFee: { allowed: false, why: "Not available when saved credit is applied" },
    };
    priceContractInvoiceAPI.mockImplementation(() => reply(answer(zero)));
    const credit = { id: 31, amount: 10200, available: 12000, employer_id: 40, credit_type: "exchange_surplus", remainder: "keep", _reference: "I-HKH000432(E)", _name: "Ana Cruz" };
    mount({ choices: CHOICES, appliedCredits: [credit], creditRequestKey: "req-1" });
    await waitFor(() => expect(document.querySelector("[data-no-payment]")).toBeTruthy());
    const block = document.querySelector("[data-no-payment]");
    // the package's copy: the note, the credit that settles the invoice, HK$0 due now
    expect(block.querySelector(".nopay .t").textContent).toBe("No payment required");
    expect(block.querySelector(".nopay .d").textContent).toBe(`${ en.key_saved_exchange_credit } from I-HKH000432(E) settles this invoice.`);
    expect(block.querySelector("[data-due-now]").textContent).toBe("HK$0");
    // no payment option, no payment method, no Payment confirmation step
    expect(screen.queryByTestId("pms")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Reservation Fee/ })).toBeNull();
    expect(document.querySelector(".review-breadcrumb").textContent).not.toContain(en.key_payment_confirmation);
    setContractInvoice.mockImplementation(() => Promise.resolve({ data: { status: true, message: "Invoice created", data: { invoice: { id: 77, status: 1, payment_method: null } } } }));
    fireEvent.click(screen.getByRole("button", { name: "Create invoice — no payment required" }));
    await waitFor(() => expect(screen.getByTestId("detail")).toBeInTheDocument());
    const sent = setContractInvoice.mock.calls[0][0];
    expect(sent).toMatchObject({ payment_type: "full", paid_amount: 0, record_key: "rk-1", credit_request_key: "req-1",
        apply_credits: [{ id: 31, amount: 10200, employer_id: 40, credit_type: "exchange_surplus", remainder: "keep" }] });
    expect(["payment_method", "card_type", "card_number", "bank_name", "bank_in_reference", "cheque_number", "time_code"].filter((k) => k in sent)).toEqual([]);
});

it("R-P2: a zero invoice with no credit shows the note alone (the package gives no further sentence)", async () => {
    priceContractInvoiceAPI.mockImplementation(() => reply(answer({ summary: { charges: 0, discounts: 0, invoiceTotal: 0, creditApplied: 0, amountDue: 0 } })));
    mount();
    await waitFor(() => expect(document.querySelector("[data-no-payment]")).toBeTruthy());
    expect(document.querySelector("[data-no-payment] .nopay").textContent).toBe("No payment required");
    expect(screen.queryByTestId("pms")).toBeNull();
});
