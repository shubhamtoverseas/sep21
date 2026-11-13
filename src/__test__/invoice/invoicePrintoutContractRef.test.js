import React from "react";
import fs from "fs";
import path from "path";
import { render } from "@testing-library/react";
import InvoiceContractPdfPrint from "../../Views/Pages/Invoice/InvoiceContractPdfPrint";
import InvoiceRefundPdfPrint from "../../Views/Pages/Invoice/InvoiceRefundPdfPrint";

/* OP-SR05-01 (ruled 26 Oct 2026): the customer printouts show the Contract Ref as neutral text, like the Invoice No.
   A printout opens nothing, and SR-05 keeps blue for an available, authorized record view. The blue class they used
   (.text-info-important, #1E88E5) had no other user and is gone. */

jest.mock("react-i18next", () => {
    const copy = JSON.parse(require("fs").readFileSync(require("path").resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
    return { useTranslation: () => ({ t: (key) => copy[key] ?? key }) };
});

const SRC = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");

const base = {
    invoice_number: "I-HKH000432", contract_number: "C-HKH000162", invoices_date: "2026-10-14", branch_name: "Central",
    staff_name: "Mubin Shaha", employer_name: "Wong Chi", worker_name: "Karla", status: 1, payment_type: "full",
    total_amount: 990, total_discount: 0, final_amount: 990, remaining_balance: 0, adjusted_amouts: [], paymentModel: [],
    contractInvoiceItemSelectModel: [], contractInvoiceItemModel: [],
};
const descOf = (container, text) => [...container.querySelectorAll(".detail-item .desc")].find((n) => n.textContent === text);

describe("printouts: the Contract Ref is neutral text", () => {
    test("Contract Invoice printout: the same neutral text as the Invoice No.", () => {
        const { container } = render(<InvoiceContractPdfPrint invoiceDetails={ base } totalAmount={ 990 } adjustTotalAmount={ 0 } />);
        const ref = descOf(container, "C-HKH000162");
        expect(ref).toBeTruthy();
        expect(ref.className).toBe(descOf(container, "I-HKH000432").className);
        expect(ref.classList.contains("black")).toBe(true);
        expect(ref.classList.contains("text-info-important")).toBe(false);
    });

    test("Refund printout: the same neutral text as the Invoice No.", () => {
        const refund = { ...base, invoice_number: "I-HKH000420(R)", status: 8, invoice_type: "contract_refund", refund_type: "partial",
            refund_origin: "normal_invoice", contractInvoiceRefundItemModel: [] };
        const { container } = render(<InvoiceRefundPdfPrint invoiceDetails={ refund } totalAmount={ 990 } parentTotalAmount={ 990 } adjustTotalAmount={ 0 } />);
        const ref = descOf(container, "C-HKH000162");
        expect(ref).toBeTruthy();
        expect(ref.className).toBe(descOf(container, "I-HKH000420(R)").className);
        expect(ref.classList.contains("text-info-important")).toBe(false);
    });

    test("the blue class is gone from the stylesheet and from every invoice screen", () => {
        expect(read("Views/Pages/Invoice/invoice.css")).not.toMatch(/text-info-important/);
        for (const f of ["Views/Pages/Invoice/InvoiceContractPdfPrint.js", "Views/Pages/Invoice/InvoiceRefundPdfPrint.js"]) {
            expect(read(f)).not.toMatch(/text-info-important/);
        }
    });
});
