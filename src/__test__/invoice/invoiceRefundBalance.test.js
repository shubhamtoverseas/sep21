import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/* Refundable balance and refund amounts (10 Oct register #18, #19, #20, #26; prototype transition T8 and Refund modal): the
   Refund action, the Refund modal and the /add-refund request all use the Invoice API's refundable offer — the money paid
   less every non-voided refund, never below HK$0, and per line what it may still return. A full refund sends the net
   amounts it takes from each line (never the gross line amounts); an Underpayment allows a full refund only. */

const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));

jest.mock("../../utils/translation", () => {
    const copy = JSON.parse(require("fs").readFileSync(require("path").resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
    const t = (key) => copy[key] ?? key;
    return { __esModule: true, default: t, translation: t };
});
jest.mock("react-i18next", () => {
    const copy = JSON.parse(require("fs").readFileSync(require("path").resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
    return { useTranslation: () => ({ t: (key) => copy[key] ?? key }), initReactI18next: { type: "3rdParty", init: () => {} } };
});
const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({
    useDispatch: () => mockDispatch,
    useSelector: (select) => select({ invoices: { invoiceCacellationReason: [] } }),
}));
jest.mock("../../redux/Slices/invoices/InvoicesSlice", () => ({
    addRefundInvoice: jest.fn(),
    fetchInvoiceGLobalCancellationReason: jest.fn(),
}));
jest.mock("../../services/commonService", () => ({ uploadFile: jest.fn() }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../components/ui/DateInput", () => () => null);

const { addRefundInvoice } = require("../../redux/Slices/invoices/InvoicesSlice");

/* the app's Jest config resets mocks before every test: the API answers are set here */
beforeEach(() => {
    mockDispatch.mockImplementation(() => Promise.resolve({ payload: { status: 200, message: "ok", data: { id: 99 } } }));
    addRefundInvoice.mockImplementation((payload) => ({ type: "invoices/addRefund", payload }));
});
const RefundModal = require("../../components/Layout/popups/invoice-popups/RefundModal").default;
const { buildPayload, refundLines } = require("../../components/initiate-refund/InitiateRefund");
const { hasRefundableBalance } = require("../../utils/utils");

const offer = (over = {}) => ({ amount: 0, paid: 0, refunded: 0, pending: false, fullRefundOnly: false, lines: [], ...over });
const line = (id, type, priceId, value, refunded, full) => ({ id, type, priceId, value, refunded, remaining: Math.max(0, value - refunded), full });

/* invoice I-HKH000005 on staging (12 Oct): a HK$1,000 base line with a HK$100 discount → HK$900, paid HK$900 by card */
const INVOICE_5 = {
    id: 5, invoice_number: "I-HKH000005", invoice_type: "general", final_amount: 900, paid_amount: 900, refund_amount: null, refund_contract_prompt: false,
    employer_name: "Pang Chi Hung",
    subtotal_items: [{ id: 8, price_id: null, item_type: "Local", item_type_key: "base", item_description_during_subtotal_show: "Filipino | undefined | new",
        item_amount: 1000, item_effective_amount: 900 }],
    paymentModel: [{ payment_method: "credit_card", card_type: "visa", card_number: "1234", time_code: "11:11:11" }],
};
const open = (invoiceData) => render(<RefundModal onClose={ jest.fn() } invoiceData={ invoiceData } />);
const button = (text) => screen.getByText(text).closest("button");
const next = () => fireEvent.click(screen.getByText(EN.key_next));
const balanceShown = () => document.querySelector("p.rf-p strong").textContent;
/* Review → Refund Method → Documentation → Confirm, then Confirm Refund */
const confirmFromReview = async () => {
    next();
    next();
    next();
    fireEvent.click(screen.getByText(new RegExp(`^${EN.key_confirm_refund}`)));
    await waitFor(() => expect(addRefundInvoice).toHaveBeenCalledTimes(1));
    return addRefundInvoice.mock.calls[0][0];
};

describe("register #20: the refundable balance never goes below HK$0 — Refund stops when nothing is left", () => {
    test("invoice 5 after its full refund I-HKH000015(R): HK$0, both refund types blocked with the reason", () => {
        open({ ...INVOICE_5, refundable: offer({ amount: 0, paid: 900, refunded: 900, lines: [line(8, "base", null, 900, 0, 0)] }) });
        expect(balanceShown()).toBe("HK$0");
        expect(screen.getByText(EN.key_blocked_no_refundable_value)).toBeTruthy();
        expect(button(EN.key_full_refund).disabled).toBe(true);
        expect(button(EN.key_partial_refund).disabled).toBe(true);
        expect(button(EN.key_next).disabled).toBe(true);
    });

    test("no offer from the API reads as nothing refundable (never the invoice total)", () => {
        open(INVOICE_5);
        expect(balanceShown()).toBe("HK$0");
        expect(button(EN.key_full_refund).disabled).toBe(true);
    });

    test("a refund awaiting approval blocks another (prototype transition T8)", () => {
        open({ ...INVOICE_5, refundable: offer({ amount: 400, paid: 900, refunded: 500, pending: true, lines: [line(8, "base", null, 900, 500, 400)] }) });
        expect(screen.getByText(EN.key_blocked_refund_pending)).toBeTruthy();
        expect(button(EN.key_full_refund).disabled).toBe(true);
        expect(button(EN.key_partial_refund).disabled).toBe(true);
    });

    test("the screens' rule: Refund needs a refundable balance above HK$0", () => {
        expect(hasRefundableBalance({ refundable: { amount: 0 } })).toBe(false);
        expect(hasRefundableBalance({ refundable: { amount: "0.01" } })).toBe(true);
        expect(hasRefundableBalance({ refundable: null })).toBe(false);
        expect(hasRefundableBalance({ final_amount: 900, refund_amount: 0 })).toBe(false);
        expect(hasRefundableBalance(null)).toBe(false);
    });
});

describe("the request matches what the API records", () => {
    test("invoice 5 before its refund: Full sends the net HK$900 of its line (was the gross HK$1,000), no invoice_items", async () => {
        open({ ...INVOICE_5, refundable: offer({ amount: 900, paid: 900, lines: [line(8, "base", null, 900, 0, 900)] }) });
        expect(balanceShown()).toBe("HK$900");
        fireEvent.click(screen.getByText(EN.key_full_refund));
        next(); // → review
        expect(document.querySelector(".rf-stat-row").textContent).toContain(`${EN.key_paid}HK$900`);
        const row = document.querySelector("table.refund-items tbody tr");
        expect([...row.querySelectorAll("td")].map((td) => td.textContent)).toEqual(["Local", "Filipino | undefined | new", "HK$900", "−HK$900", "HK$0"]);
        // register #18: the child is born Refunded / Unapproved and waits for Approve Refund
        next(); next(); next();
        expect(screen.getByText(new RegExp(EN.key_confirm_creates_child_prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeTruthy();
        fireEvent.click(screen.getByText(new RegExp(`^${EN.key_confirm_refund}`)));
        await waitFor(() => expect(addRefundInvoice).toHaveBeenCalledTimes(1));
        const payload = addRefundInvoice.mock.calls[0][0];
        expect(payload).toMatchObject({ invoice_id: 5, invoice_type: "general", refund_type: "full", amount: 900 });
        expect(payload.refund_items).toEqual([{ refund_item_description: "Filipino | undefined | new", refund_amount: 900, type: "base", price_id: null, id: 8 }]);
        expect(payload).not.toHaveProperty("invoice_items");
    });

    test("a full refund after a partial one returns what is left, line by line; Refunded before → after", async () => {
        const subtotal_items = [
            { id: 1, price_id: null, item_type: "Local", item_type_key: "base", item_description_during_subtotal_show: "Indonesian", item_amount: 600 },
            { id: 2, price_id: 7, item_type: "Visa", item_type_key: "fixed", item_description_during_subtotal_show: "Visa fee", item_amount: 300 },
        ];
        open({ ...INVOICE_5, subtotal_items,
            refundable: offer({ amount: 600, paid: 900, refunded: 300, lines: [line(1, "base", null, 600, 300, 300), line(2, "fixed", 7, 300, 0, 300)] }) });
        expect(balanceShown()).toBe("HK$600");
        fireEvent.click(screen.getByText(EN.key_full_refund));
        next();
        expect(document.querySelector("table.refund-items tfoot").textContent).toContain("−HK$600");
        next(); next(); next();
        const impact = document.querySelector(".impact-tbl tbody tr");
        expect([...impact.querySelectorAll("td")].map((td) => td.textContent)).toEqual([EN.key_refunded, "HK$300", "→", "HK$900"]);
        fireEvent.click(screen.getByText(new RegExp(`^${EN.key_confirm_refund}`)));
        await waitFor(() => expect(addRefundInvoice).toHaveBeenCalledTimes(1));
        const payload = addRefundInvoice.mock.calls[0][0];
        expect(payload.amount).toBe(600);
        expect(payload.refund_items.map((item) => [item.id, item.refund_amount])).toEqual([[1, 300], [2, 300]]);
    });

    test("partial: every line keeps its own row and cap — never merged by price — and a line takes no more than it has", async () => {
        const subtotal_items = [
            { id: 11, price_id: null, item_type: "Local", item_type_key: "base", item_description_during_subtotal_show: "Filipino", item_amount: 3000 },
            { id: 13, price_id: 5, item_type: "Medical", item_type_key: "fixed", item_description_during_subtotal_show: "Medical check", item_amount: 309 },
            { id: 14, price_id: 5, item_type: "Medical", item_type_key: "fixed", item_description_during_subtotal_show: "Medical check", item_amount: 50 },
            { id: 15, price_id: null, item_type: "Uniform", item_type_key: "custom", item_description_during_subtotal_show: "Uniform", item_amount: 120 },
            { id: 16, price_id: null, item_type: "Credit", item_type_key: "credit", item_description_during_subtotal_show: "Refund", item_amount: 300 },
        ];
        const lines = [line(11, "base", null, 2800, 0, 2800), line(13, "fixed", 5, 309, 309, 0), line(14, "fixed", 5, 50, 0, 50),
            line(15, "custom", null, 120, 20, 100), { ...line(16, "credit", null, 0, 0, 0) }];
        open({ ...INVOICE_5, subtotal_items, refundable: offer({ amount: 2950, paid: 3259, refunded: 309, lines }) });
        fireEvent.click(screen.getByText(EN.key_partial_refund));
        next();
        const rows = [...document.querySelectorAll("table.refund-items tbody tr")];
        // four lines (the credit line returns nothing); the old screen merged 11/15 and 13/14 into two rows
        expect(rows.map((r) => r.querySelector("td").textContent)).toEqual(["Local", "Medical", "Medical", "Custom"]);
        expect(rows.map((r) => r.querySelectorAll("td")[2].textContent)).toEqual(["HK$2,800", "HK$0", "HK$50", "HK$100"]);
        const inputs = rows.map((r) => r.querySelector("input"));
        expect(inputs[1].disabled).toBe(true);
        fireEvent.change(inputs[2], { target: { value: "60" } });
        expect(inputs[2].value).toBe("50");
        fireEvent.change(inputs[3], { target: { value: "40" } });
        const payload = await confirmFromReview();
        expect(payload).toMatchObject({ refund_type: "partial", amount: 90 });
        expect(payload.refund_items.map((item) => [item.id, item.price_id, item.type, item.refund_amount])).toEqual([[14, 5, "fixed", 50], [15, null, "custom", 40]]);
        expect(payload).not.toHaveProperty("invoice_items");
    });

    test("partial: a total over the refundable balance is stopped with the reason", () => {
        open({ ...INVOICE_5, refundable: offer({ amount: 100, paid: 900, refunded: 800, lines: [line(8, "base", null, 900, 0, 100)] }) });
        fireEvent.click(screen.getByText(EN.key_partial_refund));
        next();
        fireEvent.change(document.querySelector("table.refund-items tbody input"), { target: { value: "150" } });
        expect(screen.getByText(`${EN.key_refund_exceeds_balance} HK$100.`)).toBeTruthy();
        expect(button(EN.key_next).disabled).toBe(true);
    });

    test("buildPayload: Full carries the API's amount and net lines; none are sent when no line takes any", () => {
        const invoiceData = { ...INVOICE_5, due_amount: 1000, refundable: offer({ amount: 900, lines: [line(8, "base", null, 900, 0, 900)] }) };
        const full = buildPayload(invoiceData, "fullRefundGeneral", {}, 0, [], [], "cheque_refund", null, 0);
        expect(full).toMatchObject({ invoice_id: 5, refund_type: "full", amount: 900, refund_option: "cheque_refund" });
        expect(full.refund_items).toEqual([{ refund_item_description: "Filipino | undefined | new", refund_amount: 900, type: "base", price_id: null, id: 8 }]);
        expect(full).not.toHaveProperty("invoice_items");
        const noLines = buildPayload({ ...invoiceData, refundable: offer({ amount: 500 }) }, "fullRefund", {}, 0, [], [], "cheque_refund", null, 0);
        expect(noLines.amount).toBe(500);
        expect(noLines).not.toHaveProperty("refund_items");
        expect(refundLines({ subtotal_items: [], refundable: offer({ lines: [line(9, "credit", null, 0, 0, 0)] }) })).toEqual([]);
    });
});

describe("register #26: an Underpayment allows a full refund only", () => {
    test("Partial is disabled with the reason; Full returns the whole refundable balance", async () => {
        open({ ...INVOICE_5, invoice_type: "underpayment", subtotal_items: [],
            refundable: offer({ amount: 700, paid: 700, fullRefundOnly: true, lines: [] }) });
        expect(screen.getByText(EN.key_underpayment_partial_refund_blocked)).toBeTruthy();
        expect(EN.key_underpayment_partial_refund_blocked).toBe("Underpayment Invoices do not allow arbitrary partial refunds. Reduce the valid Amount Due first via Adjustment / Write-Off, which creates a refundable difference.");
        expect(button(EN.key_partial_refund).disabled).toBe(true);
        expect(button(EN.key_full_refund).disabled).toBe(false);
        fireEvent.click(screen.getByText(EN.key_full_refund));
        next();
        const payload = await confirmFromReview();
        expect(payload).toMatchObject({ refund_type: "full", amount: 700 });
        expect(payload).not.toHaveProperty("refund_items");
    });

    test("the Contract detail screen offers Refund on a paid Underpayment child", () => {
        const src = read("Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js");
        expect(src).toMatch(/const underpaymentRefund = invoiceDetails\?\.invoice_type === 'underpayment' && !\[3, 4, 5, 6, 7, 8, 9, 10, 11\]\.includes\(invoiceDetails\?\.status\);/);
        expect(src).toMatch(/const canRefund = \(\(lifecycleVisible \|\| underpaymentRefund\) && /);
    });
});

describe("the Refund action on every invoice screen follows the API's refundable balance", () => {
    const HOSTS = [
        "Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js",
        "Views/Pages/Invoice/general/PaymentTypeInvoice.js",
        "Views/Pages/Invoice/add-contract-invoice/ExchangePaymentInvoice.js",
        "Views/Pages/Invoice/add-contract-invoice/exchangePaymentReview.js",
        "Views/Pages/Invoice/general/exchangePaymentReview.js",
    ];

    test("each screen that opens the Refund modal gates it on hasRefundableBalance; the first-child and stored-figure rules are gone", () => {
        for (const file of HOSTS) {
            const src = read(file);
            expect([file, /hasRefundableBalance\(invoiceDetails\)/.test(src)]).toEqual([file, true]);
            expect([file, /isPartialRefund|ultimate_refund_type|firstChild\?\.invoice_type === "contract_refund"/.test(src)]).toEqual([file, false]);
        }
        expect(read(HOSTS[1])).not.toMatch(/final_amount !== invoiceDetails\?\.refund_amount/);
        // blocked reasons in the prototype's order: nothing refundable first
        expect(read(HOSTS[0])).toMatch(/const refundReason = invoiceDetails\?\.status === 3 \|\| !hasRefundableBalance\(invoiceDetails\)\s+\? \(t\('key_blocked_no_refundable_value'\)/);
    });

    test("the modal reads the API's lines and balance; the old price merge, line counter and forced-partial rule are gone", () => {
        const modal = read("components/Layout/popups/invoice-popups/RefundModal.js");
        expect(modal).not.toMatch(/dedupItems|already_paid_during_previous_refund|forcedPartial|isPartialRefund|item_effective_amount/);
        expect(modal).toMatch(/const lines = useMemo\(\(\) => refundLines\(invoiceData\), \[invoiceData\]\);/);
        const initiate = read("components/initiate-refund/InitiateRefund.js");
        expect(initiate).not.toMatch(/mapSubtotalToRefundItems|due_amount/);
        expect(fs.existsSync(path.resolve(__dirname, "../../components/Layout/popups/invoice-popups/RefundPopup.js"))).toBe(false);
    });
});
