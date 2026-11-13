/**
 * Customer output of a saved invoice (QA-27-033): the preview's customer pane, the PDF and the Print read the frozen record,
 * with each deduction and credit as its own row and the saved figures, and print no reason.
 */
import React from "react";
import { render, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import PrintoutPreviewModal from "../../Views/Pages/Invoice/general/PrintoutPreviewModal";
import InvoiceContractPdfGenerator from "../../Views/Pages/Invoice/InvoiceContractPdfGenerator";
import InvoiceContractPdfPrint from "../../Views/Pages/Invoice/InvoiceContractPdfPrint";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("../../utils/translation", () => ({ __esModule: true, default: (k) => k }));

const RECORD = {
    route: "overseas", pricing_code: "OV-1", price_list_version_id: 3,
    summary: { charges: 18700, discounts: 1880, invoiceTotal: 16820, creditApplied: 300, amountDue: 16520 },
    lines: [
        { key: "base", role: "base", item_type: "Overseas", description: "Filipino · BGS · Replacement", detail: "internal basis", original: 15800, discount: 1580, net: 14220, removed: false,
            steps: [{ kind: "replacement", label: "Replacement 10%", value: 10, amount: 1580, locked: true }] },
        { key: "experience", role: "experience", item_type: "Conditional item", description: "Experience supplement", detail: null, original: 1400, discount: 300, net: 1100, removed: false,
            steps: [{ kind: "reduce", label: "Reduced", value: 300, amount: 300, locked: false }] },
        { key: "skill:caregiving", role: "skill", item_type: "Conditional item", description: "Caregiving", detail: null, original: 800, discount: 800, net: 0, removed: false,
            steps: [{ kind: "waive", label: "Waived", value: null, amount: 800, locked: false }] },
        { key: "item:1", role: "item", item_type: "Document Fee", description: "Contract documentation", detail: null, original: 700, discount: 0, net: 700, removed: false, steps: [] },
        { key: "item:2", role: "item", item_type: "Insurance", description: "Removed line", detail: null, original: 900, discount: 0, net: 900, removed: true, steps: [] },
        { key: "credit:23", role: "credit", item_type: "Credit · Reservation Fee (Expired)", description: "From I-MO000049", detail: null, original: null, discount: null, net: -300, removed: false, steps: [] },
    ],
};
const INVOICE = {
    id: 85, invoice_number: "I-C000085", status: 1, payment_type: "full", employer_name: "Chan Tai Man", employer_reference_id: "E-1", worker_name: "Maria Santos", worker_reference_id: "W-9",
    final_amount: "16820.00", paid_amount: "16520.00", remaining_balance: 0, refund_amount: 0, pricing_record: RECORD, paymentModel: [],
    contractInvoiceItemSelectModel: [{ item_name: "Legacy row", item_model_name: "x", amount: "15800.00", item_type: 1 }], contractInvoiceItemModel: [],
    adjusted_amouts: [{ adjustment_type: "minus", type: "adjust_amount", adjusted_amount: "50.00", reason: "internal adjustment reason" }],
};

const textRows = (root) => [...root.querySelectorAll("tr")].map((tr) => [...tr.children].map((td) => td.textContent.trim()).filter(Boolean).join(" | "));
const customerPane = () => document.querySelector(".printout-pane-label.customer").parentElement;
const EXPECTED = [
    "Replacement 10% | −HK$1,580", "key_inv_line_net | HK$14,220",
    "Reduced | −HK$300", "key_inv_line_net | HK$1,100",
    "Waived | −HK$800", "key_inv_line_net | HK$0",
    "key_subtotal_after_discounts_and_promo | HK$16,820",
    "Credit · Reservation Fee (Expired) · From I-MO000049 | −HK$300",
    "key_amount_due | HK$16,520",
    "key_negative_adjustment | −HK$50",
    "key_paid | −HK$16,520",
];

describe.each([
    ["the preview's customer pane", () => {
        render(<PrintoutPreviewModal invoiceDetails={ INVOICE } totalAmount={ 16820 } onClose={ jest.fn() } onDownloadPDF={ jest.fn() } onPrint={ jest.fn() } />);
        return customerPane();
    }],
    ["the PDF", () => render(<InvoiceContractPdfGenerator invoiceDetails={ INVOICE } totalAmount={ 16820 } adjustTotalAmount={ 0 } />).container],
    ["the Print", () => render(<InvoiceContractPdfPrint invoiceDetails={ INVOICE } totalAmount={ 16820 } adjustTotalAmount={ 0 } />).container],
])("%s", (_name, mount) => {
    it("shows the original amounts, every deduction and credit as a row, and the saved figures", () => {
        const rows = textRows(mount());
        EXPECTED.forEach((row) => expect(rows).toContain(row));
        // in the record's order
        const at = EXPECTED.map((row) => rows.indexOf(row));
        expect(at).toEqual([...at].sort((a, b) => a - b));
        ["HK$15,800", "HK$1,400", "HK$800", "HK$700"].forEach((original) => expect(rows.some((r) => r.endsWith(`| ${ original }`))).toBe(true));
    });
    it("keeps reasons, the internal basis, removed lines and the old rows off it", () => {
        const text = mount().textContent;
        ["internal adjustment reason", "internal basis", "Removed line", "Legacy row"].forEach((hidden) => expect(text).not.toContain(hidden));
    });
});

it("an Unsettled invoice prints its stored balance, never \"Paid in full\" (its remaining_balance is stale)", () => {
    const unsettled = { ...INVOICE, status: 5, paid_amount: "0.00", balance_due: "16520.00", remaining_balance: null, adjusted_amouts: [] };
    render(<PrintoutPreviewModal invoiceDetails={ unsettled } totalAmount={ 16820 } onClose={ jest.fn() } onDownloadPDF={ jest.fn() } onPrint={ jest.fn() } />);
    const rows = textRows(customerPane());
    expect(rows).toContain("Balance Due | HK$16,520");
    expect(rows.some((r) => r.startsWith("Paid in full"))).toBe(false);
});

it("a voided invoice keeps its own output", () => {
    render(<PrintoutPreviewModal invoiceDetails={ { ...INVOICE, status: 6 } } totalAmount={ 0 } onClose={ jest.fn() } onDownloadPDF={ jest.fn() } onPrint={ jest.fn() } />);
    expect(within(customerPane()).queryByText("key_amount_due")).toBeNull();
});
