/* eslint-env jest */
import React from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";
import { interpolate } from "../../i18n/interpolate";

/* OP-27-118 (decided 2 Nov 2026): an A2 the pricing engine created (INV-X1) is read from its frozen record — its lines and
   its settlement — on both A2 detail screens (Exchange Unapproved, Exchanged), the printout preview, the PDF and the Print;
   nothing sums the old-style item rows. The guard: an A2 whose item rows sum to HK$11,500 renders HK$0 from its frozen
   rows. Save as Credit is not read as a Write-Off (both leave a write-off record on A2; its reason tells them apart). */

jest.mock("../../services/invoicesAdmin", () => ({ getInvoiceListAdmin: jest.fn(), getInvoiceViewAdmin: jest.fn() }));
jest.mock("../../services/invoices", () => ({
    resolveInvoiceAPI: jest.fn(), getInvoiceDetails: jest.fn(), getActionStatusList: jest.fn(), getInvoiceActivityLogList: jest.fn(),
    getInvoicePaymentLogList: jest.fn(), invoiceGLobalCancellationReason: jest.fn(), getPaymentMethodCatalogueAPI: jest.fn(),
}));
jest.mock("../../services/remarks", () => ({ getInvoiceRemarks: jest.fn() }));
jest.mock("../../services/insurance", () => ({ getInvoiceInsuranceRecordsAPI: jest.fn() }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../Views/Pages/Invoice/InvoiceFollowUp", () => () => null);
/* eslint-disable import/first */
import { getInvoiceViewAdmin } from "../../services/invoicesAdmin";
import { getInvoiceInsuranceRecordsAPI } from "../../services/insurance";
import { getPaymentMethodCatalogueAPI } from "../../services/invoices";
import invoices from "../../redux/Slices/invoices/InvoicesSlice";
import remarks from "../../redux/Slices/remarks/RemarkSlice";
import cs from "../../redux/Slices/common/cs/CsSlice";
import { withInvoiceViewGate } from "../../Views/Pages/Invoice/InvoiceRecordGate";
import ExchangeUnapproved from "../../Views/Pages/Invoice/add-contract-invoice/exchangePaymentReview";
import ExchangedA2 from "../../Views/Pages/Invoice/add-contract-invoice/ExchangePaymentInvoice";
import ContractInvoiceDetail from "../../Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice";
import PrintoutPreviewModal from "../../Views/Pages/Invoice/general/PrintoutPreviewModal";
import InvoiceExchangePdfGenerator from "../../Views/Pages/Invoice/InvoiceExchangePdfGenerator";
import InvoiceContractPdfGenerator from "../../Views/Pages/Invoice/InvoiceContractPdfGenerator";
/* eslint-enable import/first */

jest.setTimeout(60000);
beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

/* the frozen record /add-exchange wrote: replacement HK$9,000 (HK$10,500 less HK$1,500), Exchange Credit HK$16,820 from A1,
   Balance Adjustment HK$7,820 — the lines total HK$0 */
const RECORD = {
    route: "local", pricing_code: "LC-1", price_list_version_id: 4,
    summary: { charges: 10500, discounts: 1500, invoiceTotal: 0, creditApplied: 0, amountDue: 0 },
    settlement: { replacementValue: 9000, exchangeCredit: 16820, shortfall: 0, remainingCredit: 7820 },
    lines: [
        { key: "base", role: "base", item_type: "Local", description: "Filipino · Local Finished · Replacement", detail: null, original: 10000, discount: 1500, net: 8500, removed: false,
            steps: [{ kind: "replacement", label: "Replacement 15%", value: 15, amount: 1500, locked: true }] },
        { key: "item:204", role: "item", item_type: "Document Fee", description: "Contract documentation", detail: null, original: 500, discount: 0, net: 500, removed: false, steps: [] },
        { key: "exchange_credit", role: "exchange_credit", item_type: "Exchange Credit", description: "Exchange Credit", detail: "I-MO000100", original: null, discount: 0, net: -16820, removed: false, steps: [] },
        { key: "balance_adjustment", role: "balance_adjustment", item_type: "Balance Adjustment", description: "Balance Adjustment", detail: "Remaining Credit", original: null, discount: 0, net: 7820, removed: false, steps: [] },
    ],
};
/* the old-style item rows and header figures the screens used to read: they sum to HK$11,500, A1's Final is HK$20,000 */
const ROWS = [
    { item_name: "Legacy base row", item_model_name: "legacy", amount: "10000.00", item_type: 1 },
    { item_name: "Legacy fee row", item_model_name: "legacy", amount: "1500.00", item_type: 2 },
];
const A2 = (over) => ({
    id: 501, invoice_number: "I-MO000501(E)", invoice_type: "exchange", status: 10, parent_contract_invoice_id: 100, contract_number: "C-0001",
    total_amount: 11500, total_discount: 0, final_amount: 0, paid_amount: 0, remaining_balance: 0, balance_due: 0, refund_amount: 0,
    exchange_type: "overpayment_save_to_credit_balance", employer_name: "Chan Tai Man", worker_name: "Siti Aminah",
    parentInvoice: { id: 100, invoice_number: "I-MO000100", status: 1, invoice_type: "contract", final_amount: 20000, refund_amount: 0, paid_amount: 20000 },
    childInvoices: [], paymentModel: [], contractInvoiceItemModel: [], contractInvoiceItemSelectModel: ROWS, pricing_record: RECORD,
    // Save as Credit's record (the Invoice API's remainingCreditAdjustment): a write-off record with its own reason
    adjusted_amouts: [{ type: "write_off", adjustment_type: "minus", adjusted_amount: 9000, total_amount: 7820, reason: "Credit balance saved" }],
    ...over,
});

test("the guard's premise: the item rows sum to non-zero, the frozen rows to zero", () => {
    expect(ROWS.reduce((s, r) => s + Number(r.amount), 0)).toBe(11500);
    expect(RECORD.lines.reduce((s, l) => s + l.net, 0)).toBe(0);
});

describe.each([
    ["Exchange Unapproved", ExchangeUnapproved, "exchange-payment-review", 10],
    ["Exchanged", ExchangedA2, "exchange-payment-type-invoice", 11],
])("the A2 detail · %s", (_name, Component, segment, status) => {
    beforeEach(() => {
        sessionStorage.setItem("user", JSON.stringify({ token: "t", data: { id: 9, role: { id: 1 } } }));
        getInvoiceInsuranceRecordsAPI.mockImplementation(() => Promise.resolve({ data: { data: { records: [] } } }));
        getPaymentMethodCatalogueAPI.mockImplementation(() => new Promise(() => {}));
    });
    afterEach(() => { jest.resetAllMocks(); sessionStorage.clear(); });

    const open = async (over) => {
        getInvoiceViewAdmin.mockImplementation(() => Promise.resolve({ data: { data: {
            invoice: A2({ status, ...over }), actions: [], activity: [], payments: [], remarks: [],
        } } }));
        const store = configureStore({
            reducer: {
                invoices, remarks, cs,
                users: () => ({ permissionList: { data: [] } }), worker: () => ({ totalInterviewCounts: {} }), employer: () => ({}),
            },
            middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
        });
        const Screen = withInvoiceViewGate(Component);
        render(
            <Provider store={ store }>
                <QueryClientProvider client={ new QueryClient() }>
                    <MemoryRouter initialEntries={ [`/invoices/add-contract-invoice/${ segment }/501`] }>
                        <Routes><Route path={ `/invoices/add-contract-invoice/${ segment }/:invoice_id` } element={ <Screen /> } /></Routes>
                    </MemoryRouter>
                </QueryClientProvider>
            </Provider>
        );
        expect((await screen.findAllByText("I-MO000501(E)")).length).toBeGreaterThan(0);
    };

    it("the summary tab is the Exchange Settlement Summary, in place of the Financial Summary (#61; INV-X5)", async () => {
        await open();
        expect(document.querySelector(".detail-tabs .tab.active").firstChild.textContent).toBe(en.key_exchange_settlement_summary);
        expect([...document.querySelectorAll(".detail-tabs .tab")].map((t) => t.firstChild.textContent)).not.toContain(en.key_financial_summary);
    });

    it("renders the A2 total HK$0 from the frozen rows while its item rows sum to HK$11,500", async () => {
        await open();
        const card = document.querySelector("[data-saved-record]");
        expect(card.querySelector("[data-total]").textContent).toBe("HK$0");
        expect(card.querySelector("[data-settlement=exchange_credit]").textContent).toContain("−HK$16,820");
        expect(card.querySelector("[data-settlement=balance_adjustment]").textContent).toContain("HK$7,820");
        expect([...card.querySelectorAll("[data-settlement-figure]")].map((r) => r.textContent)).toEqual([
            `${ en.key_inv_replacement_value }HK$9,000`, `${ en.key_exchange_credit }−HK$16,820`, `${ en.key_remaining_credit }HK$7,820`,
        ]);
        // two items, the settlement lines are not counted as items
        expect(card.querySelector(".head .helper").textContent).toBe(`2 ${ en.key_items.toLowerCase() }`);
        expect(screen.queryByText("Legacy base row")).toBeNull();
        expect(screen.queryByText("Legacy fee row")).toBeNull();
    });

    it("the Exchange Settlement Summary reads the frozen settlement; Save as Credit is not read as a Write-Off", async () => {
        await open();
        const values = [...document.querySelectorAll(".exchange-summary .fs-row .v")].map((v) => v.textContent);
        expect(values).toEqual(["I-MO000100", "HK$9,000", "HK$16,820", "−HK$9,000", "HK$7,820", en.key_outcome_saved_as_credit, "HK$0", "HK$0"]);
        // the disposition was made on the review: no "choose how" banner
        expect(screen.queryByText(en.key_remaining_credit_desc)).toBeNull();
    });

    it("a Write-Off A2 still reads Written Off", async () => {
        await open({ exchange_type: "overpayment_adjust_to_zero",
            adjusted_amouts: [{ type: "write_off", adjustment_type: "minus", adjusted_amount: -7820, total_amount: 7820, reason: "Balance adjustment to zero" }] });
        expect([...document.querySelectorAll(".exchange-summary .fs-row .v")].map((v) => v.textContent)[5]).toBe(en.key_outcome_written_off);
    });

    it("an A2 without a frozen record keeps the old reading", async () => {
        await open({ pricing_record: null });
        expect(document.querySelector("[data-saved-record]")).toBeNull();
        expect(screen.getByText("Legacy base row")).toBeTruthy();
    });
});

/* OP-27-130 (owner 3 Nov 2026): Approve Exchange confirms what approving does — no payment or proof wording */
describe("Approve Exchange on the A2 (OP-27-130)", () => {
    beforeEach(() => {
        sessionStorage.setItem("user", JSON.stringify({ token: "t", data: { id: 9, role: { id: 1 } } }));
        getInvoiceInsuranceRecordsAPI.mockImplementation(() => Promise.resolve({ data: { data: { records: [] } } }));
        getPaymentMethodCatalogueAPI.mockImplementation(() => new Promise(() => {}));
    });
    afterEach(() => { jest.resetAllMocks(); sessionStorage.clear(); });

    const approve = async (over) => {
        getInvoiceViewAdmin.mockImplementation(() => Promise.resolve({ data: { data: {
            invoice: A2({ status: 10, ...over }), actions: [{ id: 11, key: "approve_exchange", name: "Approve Exchange", allowed: true }], activity: [], payments: [], remarks: [],
        } } }));
        const store = configureStore({
            reducer: { invoices, remarks, cs, users: () => ({ permissionList: { data: [] } }), worker: () => ({ totalInterviewCounts: {} }), employer: () => ({}) },
            middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
        });
        const Screen = withInvoiceViewGate(ExchangeUnapproved);
        render(
            <Provider store={ store }>
                <QueryClientProvider client={ new QueryClient() }>
                    <MemoryRouter initialEntries={ ["/invoices/add-contract-invoice/exchange-payment-review/501"] }>
                        <Routes><Route path="/invoices/add-contract-invoice/exchange-payment-review/:invoice_id" element={ <Screen /> } /></Routes>
                    </MemoryRouter>
                </QueryClientProvider>
            </Provider>
        );
        expect((await screen.findAllByText("I-MO000501(E)")).length).toBeGreaterThan(0);
        [...document.querySelectorAll(".side-stack .action-btn")].find((b) => b.textContent.includes("Approve Exchange")).click();
        return (await screen.findByRole("dialog")).textContent;
    };

    it("Save as Credit: the A2 becomes Exchanged and its saved credit becomes available", async () => {
        const text = await approve();
        expect(text).toContain([interpolate(en.key_inv_approve_exchange_question, "I-MO000501(E)"),
            interpolate(en.key_inv_approve_exchange_saved_credit, "HK$7,820")].join(" "));
        expect(text).not.toMatch(/proof|payment/i);
    });

    it("a dearer replacement: the Underpayment invoice can then be collected", async () => {
        const text = await approve({ exchange_type: "additional_payment", adjusted_amouts: [],
            pricing_record: { ...RECORD, settlement: { replacementValue: 9000, exchangeCredit: 8100, shortfall: 900, remainingCredit: 0 } },
            childInvoices: [{ id: 508, invoice_number: "I-MO000508-U", invoice_type: "underpayment", status: 2, final_amount: 900 }] });
        expect(text).toContain([interpolate(en.key_inv_approve_exchange_question, "I-MO000501(E)"),
            interpolate(en.key_inv_approve_exchange_child, "I-MO000508-U")].join(" "));
        expect(text).not.toMatch(/proof|payment|saved credit/i);
    });
});

/* register #70: A1 keeps its status after the exchange (INV-X1); its only change is the hyperlink to A2. Exchange and Refund
   are blurred with their reason, Void is hard-blocked by the Invoice API with a message naming A2 */
describe("the A1 detail after its exchange (#70)", () => {
    beforeEach(() => {
        sessionStorage.setItem("user", JSON.stringify({ token: "t", data: { id: 9, role: { id: 1 } } }));
        getInvoiceInsuranceRecordsAPI.mockImplementation(() => Promise.resolve({ data: { data: { records: [] } } }));
        getPaymentMethodCatalogueAPI.mockImplementation(() => new Promise(() => {}));
    });
    afterEach(() => { jest.resetAllMocks(); sessionStorage.clear(); });

    it("links to A2 in its header; Refund and Exchange name A2; Void is blocked with the API's reason naming A2", async () => {
        const A1 = {
            id: 100, invoice_number: "I-MO000100", invoice_type: "contract", status: 1, payment_type: "full", payment_method: "visa", contract_number: "C-0001",
            total_amount: 18700, total_discount: 1880, final_amount: 16820, paid_amount: 16820, remaining_balance: 0, refund_amount: 0,
            refundable: { amount: 16820, paid: 16820, refunded: 0, pending: false, lines: [] }, adjusted_amouts: [], paymentModel: [],
            contractInvoiceItemModel: [], contractInvoiceItemSelectModel: [], parentInvoice: null,
            childInvoices: [{ id: 501, invoice_number: "I-MO000501(E)", invoice_type: "exchange", status: 10, final_amount: 0 }],
        };
        const VOID_REASON = "Blocked — cannot Void an A1 that has been exchanged to I-MO000501(E)";
        getInvoiceViewAdmin.mockImplementation(() => Promise.resolve({ data: { data: {
            invoice: A1, actions: [{ id: 6, key: "void", name: "Void", allowed: false, reason: VOID_REASON }], activity: [], payments: [], remarks: [],
        } } }));
        const store = configureStore({
            reducer: { invoices, remarks, cs, users: () => ({ permissionList: { data: [] } }), worker: () => ({ totalInterviewCounts: {} }), employer: () => ({}) },
            middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
        });
        const Screen = withInvoiceViewGate(ContractInvoiceDetail, { insuranceCard: true });
        render(
            <Provider store={ store }>
                <QueryClientProvider client={ new QueryClient() }>
                    <MemoryRouter initialEntries={ ["/invoices/add-contract-invoice/payment-type-invoice/100"] }>
                        <Routes><Route path="/invoices/add-contract-invoice/payment-type-invoice/:invoice_id" element={ <Screen /> } /></Routes>
                    </MemoryRouter>
                </QueryClientProvider>
            </Provider>
        );
        expect((await screen.findAllByText("I-MO000100")).length).toBeGreaterThan(0);
        expect(document.querySelector("[data-a2-link]").textContent).toBe(`${ en.key_exchanged } · I-MO000501(E)`);
        // the screen marks the A1 exchanged in an effect after its first render: wait for it
        const lifecycle = () => [...document.querySelectorAll(".group.danger .action-btn")].map((b) => [b.disabled, b.textContent]);
        await waitFor(() => expect(lifecycle()[0][0]).toBe(true));
        expect(lifecycle()).toEqual([
            [true, `${ en.key_refund }Blocked — this A1 has already been exchanged to I-MO000501(E)`],
            [true, `${ en.key_exchange }Blocked — this A1 has already been exchanged to I-MO000501(E)`],
            [true, `Void${ VOID_REASON }`],
        ]);
    });
});

/* register #75 (INV-X5): an Underpayment child is neither approved nor paid until its A2 is approved, and says so */
describe("the Underpayment child while its A2 is unapproved (#75)", () => {
    beforeEach(() => {
        sessionStorage.setItem("user", JSON.stringify({ token: "t", data: { id: 9, role: { id: 1 } } }));
        getInvoiceInsuranceRecordsAPI.mockImplementation(() => Promise.resolve({ data: { data: { records: [] } } }));
        getPaymentMethodCatalogueAPI.mockImplementation(() => new Promise(() => {}));
    });
    afterEach(() => { jest.resetAllMocks(); sessionStorage.clear(); });

    const openChild = async (parentStatus) => {
        const CHILD = {
            id: 108, invoice_number: "I-MO000108-U", invoice_type: "underpayment", status: 2, payment_type: "full", payment_method: null,
            total_amount: 900, total_discount: 0, final_amount: 900, paid_amount: 0, remaining_balance: 900, balance_due: 900, refund_amount: 0,
            adjusted_amouts: [], paymentModel: [], contractInvoiceItemModel: [], contractInvoiceItemSelectModel: [], childInvoices: [],
            parentInvoice: { id: 107, invoice_number: "I-MO000107(E)", invoice_type: "exchange", status: parentStatus, final_amount: 0 },
            payRemainingBalance: null,
        };
        getInvoiceViewAdmin.mockImplementation(() => Promise.resolve({ data: { data: { invoice: CHILD, actions: [], activity: [], payments: [], remarks: [] } } }));
        const store = configureStore({
            reducer: { invoices, remarks, cs, users: () => ({ permissionList: { data: [] } }), worker: () => ({ totalInterviewCounts: {} }), employer: () => ({}) },
            middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
        });
        const Screen = withInvoiceViewGate(ContractInvoiceDetail, { insuranceCard: true });
        render(
            <Provider store={ store }>
                <QueryClientProvider client={ new QueryClient() }>
                    <MemoryRouter initialEntries={ ["/invoices/add-contract-invoice/payment-type-invoice/108"] }>
                        <Routes><Route path="/invoices/add-contract-invoice/payment-type-invoice/:invoice_id" element={ <Screen /> } /></Routes>
                    </MemoryRouter>
                </QueryClientProvider>
            </Provider>
        );
        expect((await screen.findAllByText("I-MO000108-U")).length).toBeGreaterThan(0);
    };

    it("says it waits for its A2; nothing is offered to pay or approve", async () => {
        await openChild(10);
        expect(document.querySelector("[data-awaits-a2] .title").textContent).toBe(interpolate(en.key_underpayment_awaits_a2, "I-MO000107(E)"));
        expect(document.querySelector("[data-awaits-a2] .desc").textContent).toBe(en.key_underpayment_awaits_a2_desc);
        expect(screen.queryByText(en.key_approve_payment)).toBeNull();
        expect(screen.queryByText(en.key_pay_remaining_balance)).toBeNull();
    });

    it("once the A2 is approved, the note is gone", async () => {
        await openChild(11);
        expect(document.querySelector("[data-awaits-a2]")).toBeNull();
    });
});

const rows = (root) => [...root.querySelectorAll("tr")].map((tr) => [...tr.children].map((td) => td.textContent.trim()).filter(Boolean).join(" | "));

describe("the A2 printouts read the frozen record", () => {
    it("the preview: the replacement's frozen lines, then the settlement figures from the record; Net HK$0 (both panes)", () => {
        render(<PrintoutPreviewModal invoiceDetails={ A2({ status: 11 }) } totalAmount={ 0 } onClose={ jest.fn() } onDownloadPDF={ jest.fn() } onPrint={ jest.fn() } />);
        for (const label of [".printout-pane-label.admin", ".printout-pane-label.customer"]) {
            const pane = rows(document.querySelector(label).parentElement);
            expect(pane).toEqual(expect.arrayContaining([
                "Filipino · Local Finished · ReplacementLocal | HK$10,000", "Replacement 15% | −HK$1,500", `${ en.key_inv_line_net } | HK$8,500`,
                "Contract documentationDocument Fee | HK$500",
                "Replacement Service Value | HK$9,000", "Credit from Original Invoice I-MO000100 | −HK$9,000", "Net Amount Due | HK$0", "Remaining Credit | HK$7,820",
            ]));
            // the settlement lines are the exchange rows' figures there, not printed twice
            expect(pane.join("\n")).not.toMatch(/Legacy|HK\$11,500|HK\$20,000|Balance Adjustment/);
        }
    });

    it.each([
        ["Save as Credit", {}, `${ en.key_remaining_credit } · ${ en.key_outcome_saved_as_credit }`],
        ["Write-Off", { adjusted_amouts: [{ type: "write_off", adjustment_type: "minus", adjusted_amount: 9000, total_amount: 7820, reason: "Balance adjustment to zero" }] },
            `${ en.key_remaining_credit } · ${ en.key_outcome_written_off }`],
        ["Refund Remaining Credit", { adjusted_amouts: [], childInvoices: [{ id: 502, invoice_number: "I-MO000502(R)", invoice_type: "contract_refund", status: 8 }] },
            `${ en.key_remaining_credit } · ${ en.key_outcome_refunded_via } I-MO000502(R)`],
    ])("QA-27-042: the preview's Outcome names what was done with the Remaining Credit (%s), as the A2 detail and the PDF do", (_name, over, outcome) => {
        render(<PrintoutPreviewModal invoiceDetails={ A2({ status: 11, ...over }) } totalAmount={ 0 } onClose={ jest.fn() } onDownloadPDF={ jest.fn() } onPrint={ jest.fn() } />);
        for (const label of [".printout-pane-label.admin", ".printout-pane-label.customer"]) {
            const pane = rows(document.querySelector(label).parentElement);
            expect(pane).toContain(`Outcome · ${ outcome }`);
        }
        expect(document.body.textContent).not.toMatch(/Outcome · Remaining credit(?! ·)/);
    });

    it.each([
        ["the Exchanged PDF / Print", InvoiceExchangePdfGenerator],
        ["the Exchange Unapproved PDF", InvoiceContractPdfGenerator],
    ])("%s: the frozen lines, the settlement lines signed, the A2 total HK$0 and the disposition", (_name, Generator) => {
        const { container } = render(<Generator invoiceDetails={ A2({ status: 11 }) } totalAmount={ 0 } adjustTotalAmount={ 0 } />);
        const printed = rows(container);
        const expected = [
            "Local | Filipino · Local Finished · Replacement | HK$10,000", "Replacement 15% | −HK$1,500", `${ en.key_inv_line_net } | HK$8,500`,
            "Document Fee | Contract documentation | HK$500",
            "Exchange Credit | Exchange Credit · I-MO000100 | −HK$16,820", "Balance Adjustment | Balance Adjustment · Remaining Credit | HK$7,820",
            `${ en.key_inv_a2_total } | HK$0`, `${ en.key_amount_due } | HK$0`,
            `${ en.key_remaining_credit } · ${ en.key_outcome_saved_as_credit } | HK$7,820`,
            `${ en.key_balance_due } | HK$0`,
        ];
        const at = expected.map((row) => printed.indexOf(row));
        expect(at.every((i) => i >= 0)).toBe(true);
        expect(at).toEqual([...at].sort((a, b) => a - b));
        expect(printed.join("\n")).not.toMatch(/Legacy|11500|11,500|20000|20,000/);
    });
});
