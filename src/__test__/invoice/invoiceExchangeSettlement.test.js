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

/* Exchange · Settlement review and submission (INV-X4; register #61, #72 – #75). Invoice Review in its Exchange mode, at the
   existing route (invoices/exchange/exchange-invoice-review): the replacement's lines and the engine's settlement lines, the
   Exchange Settlement Summary in place of the financial summary, no payment block; a shortfall announces the Underpayment
   invoice, a Remaining Credit is resolved before submission (Refund / Write-Off / Save as Credit). Submission sends the
   priced input and the record shown to POST /invoices/add-exchange (INV-X1) and opens the A2 detail. The FE never prices. */

jest.mock("../../services/invoices", () => ({ priceContractInvoiceAPI: jest.fn(), addInvoiceExchange: jest.fn(), invoiceGLobalCancellationReason: jest.fn() }));
jest.mock("../../services/commonApi", () => ({ getWorkerStatuses: jest.fn(), getWorkerProfileStatus: jest.fn() }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../components/ui/DateInput", () => {
    const { createElement: h } = require("react");
    return ({ name, value, onChange }) => h("input", { "aria-label": name, value: value || "", onChange: (e) => onChange(e.target.value) });
});
/* eslint-disable import/first */
import { addInvoiceExchange, invoiceGLobalCancellationReason, priceContractInvoiceAPI } from "../../services/invoices";
import { getWorkerStatuses } from "../../services/commonApi";
import { ShowToast } from "../../components/show-toast/ShowToast";
import invoices from "../../redux/Slices/invoices/InvoicesSlice";
import employer from "../../redux/Slices/employer/EmployerSlice";
import workerStatuses from "../../redux/Slices/common/workerStatuses/WorkerStatusesSlice";
import { EXCHANGE } from "../../Views/Pages/Invoice/add-contract-invoice/contractSetup";
import { interpolate } from "../../i18n/interpolate";
import InvoiceReview from "../../Views/Pages/Invoice/add-contract-invoice/InvoiceReview";
/* eslint-enable import/first */

jest.setTimeout(60000);
beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
const SRC = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
const reply = (data) => Promise.resolve({ data: { status: true, data } });

/* A1: paid by Visa; its refund origin unknown here, so the refund goes by company cheque (the safe route) */
const A1 = { id: 100, invoice_number: "I-MO000100", worker_name: "Maria Santos", invoices_date: "2026-09-01",
    paymentModel: [{ payment_method: "credit_card", card_type: "visa", card_number: "4242", time_code: "101010" }] };
const SETUP = { route: "exchange", exchange: { invoice_id: 100, service_route: "local" }, worker_id: 60, category: null, driver: false, date: "2026-11-02", branch: 5 };
const INFO = {
    currentInvoiceEmployerDetail: { employer_id: 2, name: "Chan Tai Man", reference_id: "E-0002" }, currentInvoiceWorkerDetail: { id: 60, name: "Siti Aminah", reference_id: "LIF000060" },
    currentInvoiceExchange: A1, invoice_date: "2026-11-02", branchId: "5", branch_name: "Tsim Sha Tsui", csId: "2", cs_name: "Lee Ka Yan",
};
const BASE = { id: "base", kind: "base", itemType: "Local", label: "Filipino · Local Finished · Replacement", add: "required", original: 10000, discount: 1500, net: 8500,
    steps: [{ label: "Replacement 15%", amount: 1500, locked: true }] };
const DOC = { id: "item:204", kind: "item", itemType: "Document Fee", label: "Contract documentation", item: 204, add: "manual", amountSource: "catalogue", original: 500, discount: 0, net: 500, steps: [] };
const CREDIT = (net) => ({ id: "exchange_credit", kind: "exchange_credit", itemType: "Exchange Credit", label: "Exchange Credit", detail: "I-MO000100", original: null, net, steps: [] });
const priced = (lines, settlement) => ({
    ok: true, route: "exchange", serviceRoute: "local", problems: [], notes: [], refused: [], clash: [], restorable: [], available: [], offerSkills: [], promotions: [], credits: [],
    lines: [BASE, DOC, ...lines], total: { original: 10500, discount: 1500, net: 0 }, summary: { charges: 10500, discounts: 1500, invoiceTotal: 0, creditApplied: 0, amountDue: 0 },
    settlement, reservationFee: { allowed: false, why: "No Reservation Fee on an exchange" }, record_key: "rk-1",
});
const CHEAPER = priced([CREDIT(-16820), { id: "balance_adjustment", kind: "balance_adjustment", itemType: "Balance Adjustment", label: "Balance Adjustment", detail: "Remaining Credit", original: null, net: 7820, steps: [] }],
    { replacementValue: 9000, exchangeCredit: 16820, shortfall: 0, remainingCredit: 7820 });
const DEARER = priced([CREDIT(-8100), { id: "underpayment", kind: "underpayment", itemType: "Underpayment", label: "Underpayment", detail: "Collected by the Underpayment invoice", original: null, net: -900, steps: [] }],
    { replacementValue: 9000, exchangeCredit: 8100, shortfall: 900, remainingCredit: 0 });
const EQUAL = priced([CREDIT(-9000)], { replacementValue: 9000, exchangeCredit: 9000, shortfall: 0, remainingCredit: 0 });

beforeEach(() => {
    priceContractInvoiceAPI.mockReset();
    invoiceGLobalCancellationReason.mockImplementation(() => Promise.resolve({ data: { data: [
        { id: "gbo", name: "GBO" }, { id: "ebo", name: "EBO" }, { id: "medically_unfit", name: "Medically Unfit" }, { id: "other", name: "Other" }] } }));
    getWorkerStatuses.mockImplementation(() => Promise.resolve({ data: { data: [{ id: 1, name: "Available" }, { id: 2, name: "Suspended" }, { id: 7, name: "Blacklisted" }] } }));
    addInvoiceExchange.mockImplementation(() => Promise.resolve({ data: { status: true, message: "Exchange created", data: { invoice: { id: 777 } } } }));
});

const Probe = () => <pre data-testid="at">{ useLocation().pathname }</pre>;
const mount = (result) => {
    priceContractInvoiceAPI.mockImplementation(() => reply(result));
    const store = configureStore({
        reducer: { invoices, employer, workerStatuses, worker: () => ({ totalInterviewCounts: {} }) },
        middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
    });
    render(
        <Provider store={ store }>
            <MemoryRouter initialEntries={ [{ pathname: "/invoices/exchange/exchange-invoice-review", state: { contractFormInfo: INFO, setupInput: SETUP } }] }>
                <Routes>
                    <Route path="/invoices/exchange/exchange-invoice-review" element={ <InvoiceReview mode={ EXCHANGE } /> } />
                    <Route path="/invoices/add-contract-invoice/exchange-payment-review/:id" element={ <Probe /> } />
                    <Route path="/invoices" element={ <Probe /> } />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
};
const summaryBoxes = async () => {
    const section = await screen.findByText(en.key_exchange_settlement_summary);
    return [...section.closest("[data-settlement-summary]").querySelectorAll(".fs-box")].map((b) => b.textContent);
};
/* the original worker's handling: cancellation date, reason (#23's list), remarks and profile status */
const handle = async () => {
    await screen.findByRole("option", { name: "EBO" });
    await screen.findByRole("option", { name: "Available" });
    fireEvent.change(screen.getByLabelText("cancellation_date"), { target: { value: "2026-11-02" } });
    fireEvent.change(document.querySelector("select[name=cancellation_reason]"), { target: { value: "ebo" } });
    fireEvent.change(document.querySelector("textarea[name=remarks]"), { target: { value: "Employer asked for a replacement" } });
    fireEvent.change(document.querySelector("select[name=worker_status]"), { target: { value: "1" } });
};
const confirmButton = () => screen.queryAllByText(en.key_confirm_exchange).map((n) => n.closest("button")).find((b) => !b.closest("[role=dialog]"));
/* what /add-exchange receives, apart from the disposition: the input priced on this screen and the record shown */
const BODY = () => ({
    invoice_id: 100, pricing: priceContractInvoiceAPI.mock.calls[0][0], record_key: "rk-1", staff_id: 2,
    cancellation_date: "2026-11-02", cancellation_reason: "ebo", remarks: "Employer asked for a replacement", worker_status: 1,
});
const opened = async () => expect((await screen.findByTestId("at")).textContent).toBe("/invoices/add-contract-invoice/exchange-payment-review/777");

describe("the Exchange Settlement Summary (#61, #72)", () => {
    it("replaces the financial summary: Replacement value · Exchange Credit · Balance Adjustment · A2 total HK$0; no payment block", async () => {
        mount(CHEAPER);
        expect(await summaryBoxes()).toEqual([
            `${ en.key_inv_replacement_value }HK$9,000`, `${ en.key_exchange_credit }−HK$16,820`, `${ en.key_inv_balance_adjustment }HK$7,820`, `${ en.key_inv_a2_total }HK$0`,
        ]);
        expect(document.querySelector(".pay-block")).toBeNull();
        expect(document.querySelector("[data-due-now]")).toBeNull();
        expect(screen.queryByText(en.key_inv_financial_summary)).toBeNull();
        expect(document.querySelector(".review-breadcrumb").textContent).not.toContain(en.key_payment_confirmation);
        expect(document.querySelector("[data-context]").textContent).toBe(interpolate(en.key_inv_exchange_of, "I-MO000100"));
        // the engine's settlement lines in the table, the A2 total HK$0
        expect(document.querySelector(".items-card [data-total]").textContent).toBe("HK$0");
        expect(document.querySelector("[data-settlement=exchange_credit]").textContent).toContain("−HK$16,820");
    });
    it("priced by the engine with no saved credit and no employer credit controls (OP-27-108)", async () => {
        mount(EQUAL);
        await summaryBoxes();
        expect(priceContractInvoiceAPI.mock.calls[0][0]).not.toHaveProperty("credits");
        expect(priceContractInvoiceAPI.mock.calls[0][0]).toMatchObject({ route: "exchange", exchange: { invoice_id: 100, service_route: "local" } });
        // no saved-credit picker anywhere on an exchange (:434, :595; OP-27-108)
        expect(document.querySelector("[data-credit-picker]")).toBeNull();
    });
});

describe("a dearer replacement (#72, #75)", () => {
    it("announces the Underpayment invoice; no disposition; Confirm Exchange waits for the worker's handling, then opens A2", async () => {
        mount(DEARER);
        expect((await summaryBoxes())[2]).toBe(`${ en.key_inv_shortfall }HK$900`);
        expect(document.querySelector("[data-underpayment]").textContent).toBe(interpolate(en.key_inv_underpayment_announce, "HK$900"));
        expect(document.querySelector("[data-disposition]")).toBeNull();
        expect(confirmButton().disabled).toBe(true);
        await handle();
        expect(confirmButton().disabled).toBe(false);
        fireEvent.click(confirmButton());
        await waitFor(() => expect(addInvoiceExchange).toHaveBeenCalledTimes(1));
        expect(addInvoiceExchange.mock.calls[0][0]).toEqual(BODY());
        await opened();
    });
});

describe("equal value", () => {
    it("no balancing amount, no disposition, no Remaining Credit sent", async () => {
        mount(EQUAL);
        expect((await summaryBoxes())[2]).toBe(`${ en.key_inv_balance_adjustment }HK$0`);
        expect(document.querySelector("[data-disposition]")).toBeNull();
        expect(document.querySelector("[data-underpayment]")).toBeNull();
        await handle();
        fireEvent.click(confirmButton());
        await waitFor(() => expect(addInvoiceExchange).toHaveBeenCalledTimes(1));
        expect(addInvoiceExchange.mock.calls[0][0]).toEqual(BODY());
        await opened();
    });
});

describe("a cheaper replacement: the Remaining Credit is resolved before submission (#74)", () => {
    it("offers Refund Remaining Credit, Write-Off and Save as Credit; nothing is submitted until one is chosen", async () => {
        mount(CHEAPER);
        await summaryBoxes();
        const choices = [...document.querySelectorAll("[data-disposition] .path-card .pt")].map((n) => n.textContent);
        expect(choices).toEqual([en.key_refund_overpayment, en.key_inv_disposition_write_off, en.key_inv_disposition_save_credit]);
        expect(confirmButton()).toBeUndefined();
    });

    it.each([
        ["write_off", en.key_inv_disposition_write_off, en.key_inv_confirm_write_off_remaining],
        ["save_credit", en.key_inv_disposition_save_credit, en.key_inv_confirm_save_remaining],
    ])("%s: confirmed in a dialog, then sent as the disposition", async (disposition, label, copy) => {
        mount(CHEAPER);
        await summaryBoxes();
        await handle();
        fireEvent.click(screen.getByText(label));
        fireEvent.click(confirmButton());
        const dialog = await screen.findByRole("dialog");
        expect(within(dialog).getByText(interpolate(copy, "HK$7,820"))).toBeTruthy();
        expect(addInvoiceExchange).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByText(en.key_confirm_exchange));
        await waitFor(() => expect(addInvoiceExchange).toHaveBeenCalledTimes(1));
        expect(addInvoiceExchange.mock.calls[0][0]).toEqual({ ...BODY(), remaining_credit: disposition });
        await opened();
    });

    it("Refund Remaining Credit: after the worker's handling, the refund route of A1's payment; sent with the exchange, no amount", async () => {
        mount(CHEAPER);
        await summaryBoxes();
        fireEvent.click(screen.getByText(en.key_refund_overpayment));
        expect(document.querySelector("[data-handling-first]").textContent).toBe(en.key_inv_complete_worker_handling_first);
        expect(screen.queryByText(en.key_submit_refund_request)).toBeNull();
        await handle();
        fireEvent.click(await screen.findByText(en.key_submit_refund_request));
        await waitFor(() => expect(addInvoiceExchange).toHaveBeenCalledTimes(1));
        expect(addInvoiceExchange.mock.calls[0][0]).toEqual({
            ...BODY(), remaining_credit: "refund", refund_option: "cheque_refund",
            payment_method: "credit_card", card_type: "visa", card_number: "4242", time_code: "101010",
        });
        await opened();
    });
});

describe("a refusal", () => {
    it("keeps the review with the server's words and reads the record again past the cache", async () => {
        addInvoiceExchange.mockImplementation(() => Promise.reject({ response: { status: 422, data: { message: "Blocked — this worker has an Active contract" } } }));
        mount(DEARER);
        await summaryBoxes();
        await handle();
        fireEvent.click(confirmButton());
        await waitFor(() => expect(ShowToast).toHaveBeenCalledWith("error", "Blocked — this worker has an Active contract"));
        await waitFor(() => expect(priceContractInvoiceAPI).toHaveBeenCalledTimes(2));
        expect(priceContractInvoiceAPI.mock.calls[1][0]).toMatchObject({ fresh_snapshot: true });
        expect(screen.queryByTestId("at")).toBeNull();
    });
});

describe("the old Exchange screens are gone (INV-X4)", () => {
    it("no second review, payment or refund screen; their routes, store slots and options removed", () => {
        expect(fs.existsSync(path.resolve(__dirname, "../../Views/Pages/Invoice/exchange"))).toBe(false);
        const routes = SRC("Views/Pages/routes/invoiceRoutes.js");
        expect(routes).toContain('const ExchangeInvoiceReview = withInvoiceCreateGate(exchange(() => import("../Invoice/add-contract-invoice/InvoiceReview")), EXCHANGE_CREATE_KEYS);');
        expect(routes).not.toMatch(/Invoice\/exchange\//);
        expect(SRC("Views/Pages/routes/routesConfig/invoiceRoutes.js")).not.toMatch(/exchangeRefundReview|exchangeAdditionalPaymentReview|exchangeSamePaymentReview/);
        expect(SRC("redux/Slices/invoices/InvoicesSlice.js")).not.toMatch(/exchangeDataForm|exchangeItemsList|exchangeSelectionForm/);
        expect(SRC("components/ReusableComponents/constants.js")).not.toMatch(/exchangeOverpaymentOptions/);
        expect(SRC("Views/Pages/Invoice/payment-method-selector/PaymentMethodSelector.js")).not.toMatch(/exchange-contract|exchangeForm|exchangeCredit/);
        expect(SRC("components/initiate-refund/InitiateRefund.js")).not.toMatch(/exchangeForm|finalPayment/);
    });
    it("every key the review reads is in the English copy", () => {
        const keys = [...SRC("Views/Pages/Invoice/add-contract-invoice/InvoiceReview.js").matchAll(/["'](key_[a-z0-9_]+)["']/g)].map((m) => m[1]);
        expect(keys.filter((k) => !(k in en))).toEqual([]);
    });
});
