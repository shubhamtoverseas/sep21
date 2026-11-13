/**
 * QA-27-043: the printouts' Payment Information amount read "$11200.00" while every other money cell reads "HK$11,200"
 * (the shared formatHK: thousands separated, cents only when the amount has them). The Contract and Exchange PDF / Print
 * and the Refund PDF / Print format the payment amount with formatHK; a refund's amount prints without its sign.
 */
import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import InvoiceContractPdfGenerator from "../../Views/Pages/Invoice/InvoiceContractPdfGenerator";
import InvoiceContractPdfPrint from "../../Views/Pages/Invoice/InvoiceContractPdfPrint";
import InvoiceExchangePdfGenerator from "../../Views/Pages/Invoice/InvoiceExchangePdfGenerator";
import InvoiceRefundPdfGenerator from "../../Views/Pages/Invoice/InvoiceRefundPdfGenerator";
import InvoiceRefundPdfPrint from "../../Views/Pages/Invoice/InvoiceRefundPdfPrint";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("../../utils/translation", () => ({ __esModule: true, default: (k) => k }));

const INVOICE = (over) => ({
    id: 91, invoice_number: "I-MO000091", status: 1, payment_type: "full", employer_name: "Chan Tai Man", employer_reference_id: "E-1",
    worker_name: "Tess Mora", worker_reference_id: "LUZ000423-A", final_amount: "11200.00", paid_amount: "11200.00", balance_due: 0,
    refund_amount: 0, adjusted_amouts: [], contractInvoiceItemSelectModel: [], contractInvoiceItemModel: [], childInvoices: [],
    paymentModel: [{ id: 1, payment_method: "cash", amount: "11200.00", created_at: "2026-11-03T02:00:00.000Z" }],
    ...over,
});
/* the Payment Information block's amount cell: the DetailItem titled key_amount after the payment rows */
const amounts = (container) => [...container.querySelectorAll("*")]
    .filter((el) => el.children.length === 0 && /^\$?-?[\d,]+(\.\d+)?$|^HK\$[\d,]+(\.\d+)?$/.test(el.textContent.trim()))
    .map((el) => el.textContent.trim());

it.each([
    ["the Contract PDF", InvoiceContractPdfGenerator, {}],
    ["the Contract Print", InvoiceContractPdfPrint, {}],
    ["the Exchange PDF", InvoiceExchangePdfGenerator, { status: 11, invoice_type: "exchange" }],
    ["the Refund PDF", InvoiceRefundPdfGenerator, { status: 9, invoice_type: "contract_refund", refund_type: "full", final_amount: "-11200.00", paymentModel: [{ id: 2, payment_method: "cash", amount: "-11200.00", created_at: "2026-11-03T02:00:00.000Z" }] }],
    ["the Refund Print", InvoiceRefundPdfPrint, { status: 9, invoice_type: "contract_refund", refund_type: "full", final_amount: "-11200.00", paymentModel: [{ id: 2, payment_method: "cash", amount: "-11200.00", created_at: "2026-11-03T02:00:00.000Z" }] }],
])("%s: the payment amount reads HK$11,200, like every other money cell", (_name, Printout, over) => {
    const { container } = render(<Printout invoiceDetails={ INVOICE(over) } totalAmount={ 11200 } adjustTotalAmount={ 0 } />);
    const cells = amounts(container);
    expect(cells).toContain("HK$11,200");
    expect(cells.filter((c) => c.startsWith("$"))).not.toContain("$11200.00");
    expect(container.textContent).not.toMatch(/\$11200\.00/);
});
