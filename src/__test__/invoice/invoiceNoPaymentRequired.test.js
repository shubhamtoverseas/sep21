import React from "react";
import fs from "fs";
import path from "path";
import { render } from "@testing-library/react";

/* OP-27-54 (27 Oct package, R-P2; CONFIRM DB 29 Oct 2026, Part B condition 2): a Contract Invoice whose Amount due now was
   HK$0 is saved Paid with no payment method and no payment record. Every screen that shows an invoice's method renders the
   empty state for the missing method; the detail screen and the printout say "No payment required" from the server's
   zero-payable fact (`no_payment_required`, read from the frozen record), never from the missing method. */

jest.mock("../../utils/translation", () => {
    const copy = JSON.parse(require("fs").readFileSync(require("path").resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
    const t = (key) => copy[key] ?? key;
    return { __esModule: true, default: t, translation: t };
});
jest.mock("react-i18next", () => {
    const copy = JSON.parse(require("fs").readFileSync(require("path").resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
    return { useTranslation: () => ({ t: (key) => copy[key] ?? key }), initReactI18next: { type: "3rdParty", init: () => {} } };
});
/* the catalogue read never answers here (a plain function: CRA resets jest.fn implementations before each test) */
jest.mock("../../services/invoices", () => ({ getPaymentMethodCatalogueAPI: () => new Promise(() => {}) }));

const PrintoutPreviewModal = require("../../Views/Pages/Invoice/general/PrintoutPreviewModal").default;
const PaymentConfirmedModal = require("../../Views/Pages/Invoice/payment-method-selector/PaymentConfirmedModal").default;
const InvoiceContractPdfGenerator = require("../../Views/Pages/Invoice/InvoiceContractPdfGenerator").default;
const InvoiceContractPdfPrint = require("../../Views/Pages/Invoice/InvoiceContractPdfPrint").default;

const SRC = path.resolve(__dirname, "../..");
const EN = JSON.parse(fs.readFileSync(path.resolve(SRC, "../public/locales/en/translation.json"), "utf8"));
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");
const NO_PAYMENT = "No payment required";

/* a zero-payable Contract Invoice as the detail answers it: Paid, no method, nothing collected */
const ZERO = { invoice_number: "I-HK000501", status: 1, invoice_type: "contract", payment_type: "full", payment_method: null,
    final_amount: 0, paid_amount: 0, remaining_balance: null, total_amount: 5000, total_discount: 0, total_credit: 5000,
    contractInvoiceItemSelectModel: [], contractInvoiceItemModel: [], adjusted_amouts: [], paymentModel: [], no_payment_required: true };
/* the same invoice paid by card: what the screens showed before */
const PAID = { ...ZERO, invoice_number: "I-HK000502", payment_method: "credit_card", final_amount: 5000, paid_amount: 5000, total_credit: 0,
    paymentModel: [{ payment_method: "credit_card", amount: 5000, created_at: "2026-10-29" }], no_payment_required: false };

test("the copy is the package's", () => {
    expect(EN.key_inv_no_payment_required).toBe(NO_PAYMENT);
});

describe("Customer Printout", () => {
    const panes = () => [...document.body.querySelectorAll(".printout-doc")];
    const totalLabel = (pane) => pane.querySelector(".doc-items tr.total td").textContent;
    const open = (invoice) => render(<PrintoutPreviewModal invoiceDetails={ invoice } totalAmount={ Number(invoice.final_amount) } onClose={ jest.fn() }
        onDownloadPDF={ jest.fn() } onPrint={ jest.fn() } />);

    test("a zero-payable invoice reads No payment required in both panes: never Payment confirmed, never Paid in full", () => {
        const { unmount } = open(ZERO);
        expect(panes()[0].querySelector(".doc-sub").textContent.endsWith(` · ${ NO_PAYMENT }`)).toBe(true);
        expect(totalLabel(panes()[1])).toBe(NO_PAYMENT);
        expect(document.body.textContent).not.toMatch(/Paid in full|Payment confirmed|null|undefined/);
        unmount();
    });

    test("a paid invoice is unchanged", () => {
        const { unmount } = open({ ...PAID, remaining_balance: 0 });
        expect(panes()[0].querySelector(".doc-sub").textContent.endsWith(` · ${ EN.key_payment_confirmed }`)).toBe(true);
        expect(totalLabel(panes()[1])).toBe("Paid in full");
        expect(document.body.textContent).not.toContain(NO_PAYMENT);
        unmount();
    });
});

describe("contract PDF and print", () => {
    for (const [name, Doc] of [["PDF", InvoiceContractPdfGenerator], ["print", InvoiceContractPdfPrint]]) {
        test(`${ name }: Payment Information says No payment required from the fact; a paid invoice lists its payment`, () => {
            const zero = render(<Doc invoiceDetails={ ZERO } totalAmount={ 0 } adjustTotalAmount={ 0 } />);
            expect(zero.container.textContent).toContain(NO_PAYMENT);
            expect(zero.container.textContent).not.toMatch(/null|undefined/);
            zero.unmount();
            const paid = render(<Doc invoiceDetails={ PAID } totalAmount={ 5000 } adjustTotalAmount={ 0 } />);
            expect(paid.container.textContent).not.toContain(NO_PAYMENT);
            paid.unmount();
        });
    }
});

test("the creation modal never reads \"via .\" when an invoice comes back without a method", () => {
    const { container, rerender } = render(<PaymentConfirmedModal info={ { status: 1, paymentType: "full", methodValue: null, invoiceNumber: "I-1" } }
        typeLabel="Contract" onClose={ () => {} } onViewDetail={ () => {} } />);
    const sentence = container.querySelector(".pm-done p").textContent;
    expect(sentence).not.toMatch(/via|null|undefined| \./);
    rerender(<PaymentConfirmedModal info={ { status: 1, paymentType: "full", methodValue: "credit_card", invoiceNumber: "I-2" } }
        typeLabel="Contract" onClose={ () => {} } onViewDetail={ () => {} } />);
    expect(container.querySelector(".pm-done p").textContent).toMatch(/via \S+/);
});

test("the contract detail's Payment segment says No payment required from the fact, without the paid tick", () => {
    const detail = read("Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js");
    expect(detail).toContain("const noPaymentRequired = Boolean(invoiceDetails?.no_payment_required);");
    expect(detail).toContain("{ (methodLabel || noPaymentRequired) && <>");
    expect(detail).toContain("{ noPaymentRequired ? t('key_inv_no_payment_required') : methodLabel }");
    expect(detail).toContain("{ !noPaymentRequired && invoiceDetails?.status === 1 && <span style={{ color: 'var(--st-success)', fontWeight: 600 }} aria-label=\"Payment confirmed\">✓</span> }");
});
