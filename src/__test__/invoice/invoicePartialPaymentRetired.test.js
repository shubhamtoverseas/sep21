import React from "react";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

/* Conflicts sheet U-0235 (B5; rulings C6 and C7, 27 Oct 2026): "There is only reservation fee and no partial payment".
   - The payment panel keeps no Partial rule: a Full Payment offers Bank Transfer, Cheque and Cash.
   - The create flow (Standalone, Contract, Exchange) and its review screens carry no Partial Payment path. The exchange
     screen also loses its Reservation Fee checks: an exchange's new invoice is always paid in full.
   - Stored partial invoices still print (the printouts keep their partial lines), and Status 3 rows are moved to Unsettled
     by sql/2026-10-27_RETIRE_partial_pay_status.sql.
   The panel test uses the Invoice API's own catalogue (ts-node); without the contract checkout next to this repo (or
   CONTRACT_API_DIR) it is skipped. */

const SRC = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
const contractDir = process.env.CONTRACT_API_DIR || path.resolve(__dirname, "../../../../maidmatch-contract");
const hasContract = fs.existsSync(path.join(contractDir, "src/domain/invoice/paymentFields.ts"));
const apiCatalogue = () => JSON.parse(execFileSync(process.execPath, [
    "-r", "ts-node/register/transpile-only", "-e",
    "process.stdout.write(JSON.stringify(require('./src/domain/invoice/paymentFields').paymentCatalogue()))",
], { cwd: contractDir, encoding: "utf8" }));

jest.mock("../../utils/translation", () => {
    const copy = JSON.parse(require("fs").readFileSync(require("path").resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
    const t = (key) => copy[key] ?? key;
    return { __esModule: true, default: t, translation: t };
});
jest.mock("react-i18next", () => {
    const copy = JSON.parse(require("fs").readFileSync(require("path").resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
    return { useTranslation: () => ({ t: (key) => copy[key] ?? key }), initReactI18next: { type: "3rdParty", init: () => {} } };
});
jest.mock("react-redux", () => ({ useDispatch: () => jest.fn(() => Promise.resolve({})) }));
jest.mock("../../services/commonService", () => ({ uploadFile: jest.fn() }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../components/ui/DateInput", () => () => null);
jest.mock("../../services/invoices", () => ({ getPaymentMethodCatalogueAPI: jest.fn() }));

const { getPaymentMethodCatalogueAPI } = require("../../services/invoices");
const PaymentMethodSelector = require("../../Views/Pages/Invoice/payment-method-selector/PaymentMethodSelector").default;

const CREATE_FLOW = [
    "Views/Pages/Invoice/payment-method-selector/PaymentMethodSelector.js",
    // the Standalone Invoice items and review stages are the Contract Invoice ones since INV-G3 / G4
    // an Exchange's review is the same stage in its Exchange mode since INV-X4 (no payment there, #72)
    "Views/Pages/Invoice/add-contract-invoice/InvoiceReview.js",
];

describe("no Partial Payment (U-0235)", () => {
    test.each(CREATE_FLOW)("%s keeps no Partial Payment path", (rel) => {
        expect(SRC(rel)).not.toMatch(/=== ["']partial["']|\["reservation_fee", "partial"\]|partialPaymentInfo|key_partial_payment_due_now/);
    });

    test("an exchange's items are the Contract Invoice items stage (INV-X3): no payment type, no Reservation Fee there (C7)", () => {
        expect(SRC("Views/Pages/routes/invoiceRoutes.js")).toContain('const AddContractInvoiceExchange = withInvoiceCreateGate(exchange(() => import("../Invoice/add-contract-invoice/ContractInvoiceItems"))');
        expect(SRC("Views/Pages/Invoice/add-contract-invoice/ContractInvoiceItems.js")).not.toMatch(/payment_type|reservationFee|reservationDateTime|paymentType/);
    });

    test("the dead invoice status helpers of the old scheme are gone", () => {
        expect(SRC("services/commonService.js")).not.toMatch(/getContractInvoiceStatusLabel|invoicesStatusFilterOptions|Partially Paid/);
    });

    test("stored partial invoices still print their partial lines", () => {
        for (const rel of ["Views/Pages/Invoice/InvoiceContractPdfGenerator.js", "Views/Pages/Invoice/InvoiceContractPdfPrint.js"]) {
            expect(SRC(rel)).toMatch(/payment_type === 'partial'/);
        }
        expect(EN.key_partial_payment_paid).toBeTruthy();
    });
});

(hasContract ? describe : describe.skip)("the payment panel (U-0235)", () => {
    const catalogue = hasContract ? apiCatalogue() : null;
    beforeEach(() => getPaymentMethodCatalogueAPI.mockResolvedValue({ data: { data: catalogue } }));

    test("a Full Payment offers Bank Transfer, Cheque and Cash: there is no Partial rule", async () => {
        render(<PaymentMethodSelector submitAction={ jest.fn() } invoiceData={ { payment_type: "full", final_amount: 500 } } />);
        const select = await screen.findByLabelText(EN.key_payment_method);
        await waitFor(() => expect(select.value).toBe("visa"));
        for (const code of ["bank_transfer", "cheque", "cash"]) {
            const option = [...select.querySelectorAll("option")].find((o) => o.value === code);
            expect([code, Boolean(option), option?.disabled]).toEqual([code, true, false]);
        }
    });

    test("a stored payment_type 'partial' gets no special rule either: the same methods stay open", async () => {
        render(<PaymentMethodSelector submitAction={ jest.fn() } invoiceData={ { payment_type: "partial", final_amount: 500, paid_amount: 200 } } />);
        const select = await screen.findByLabelText(EN.key_payment_method);
        await waitFor(() => expect(select.value).toBe("visa"));
        for (const code of ["bank_transfer", "cheque", "cash"]) {
            const option = [...select.querySelectorAll("option")].find((o) => o.value === code);
            expect([code, option?.disabled]).toEqual([code, false]);
        }
        fireEvent.change(select, { target: { value: "cash" } });
        expect(select.value).toBe("cash");
    });
});
