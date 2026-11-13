import React from "react";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { render, screen } from "@testing-library/react";

/* Reservation Fee methods in the payment panel (Payment Method Rules v4, 9 Oct 2026 — "Where each method is allowed",
   C-7, C-9; ruling 2026-10-12): a new Reservation Fee offers Visa, Mastercard and UnionPay; every other method stays in
   the Payment Method list, disabled, saying "Not available for a Reservation Fee" after its name. The list is the Invoice
   API's own catalogue (ts-node); without the contract checkout next to this repo (or CONTRACT_API_DIR) the suite is
   skipped. */

const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
const contractDir = process.env.CONTRACT_API_DIR || path.resolve(__dirname, "../../../../maidmatch-contract");
const hasContract = fs.existsSync(path.join(contractDir, "src/domain/invoice/reservationFee.ts"));
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
jest.mock("../../redux/Slices/invoices/InvoicesSlice", () => ({
    uploadInvoicePaymentAttachment: jest.fn(), removeInvoicePaymentAttachment: jest.fn(),
}));
jest.mock("../../services/commonService", () => ({ uploadFile: jest.fn() }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../components/ui/DateInput", () => () => null);
jest.mock("../../services/invoices", () => ({ getPaymentMethodCatalogueAPI: jest.fn() }));

const { getPaymentMethodCatalogueAPI } = require("../../services/invoices");
const PaymentMethodSelector = require("../../Views/Pages/Invoice/payment-method-selector/PaymentMethodSelector").default;
const PayRemainingBalanceModal = require("../../Views/Pages/Invoice/payment-method-selector/PayRemainingBalanceModal").default;

const REASON = EN.key_not_available_for_reservation_fee;
/* the Payment Method list's methods (not its placeholder) */
const methodOptions = () => [...document.querySelectorAll("#pe-method option")].filter((option) => option.value);

(hasContract ? describe : describe.skip)("Reservation Fee methods in the selector", () => {
    const catalogue = hasContract ? apiCatalogue() : null;
    const label = (code) => EN[catalogue.methods.find((m) => m.code === code).labelKey];
    beforeEach(() => {
        getPaymentMethodCatalogueAPI.mockResolvedValue({ data: { data: catalogue } });
    });

    test("a new Reservation Fee: Visa, Mastercard, UnionPay selectable; the other 8 disabled with their reason", async () => {
        render(<PaymentMethodSelector invoiceData={ { payment_type: "reservation_fee" } } submitAction={ jest.fn() } />);
        await screen.findByRole("option", { name: label("visa") });
        expect(methodOptions().length).toBe(11);
        const allowed = catalogue.methods.filter((m) => m.scenarios.reservationFee).map((m) => m.code);
        expect(allowed).toEqual(["visa", "mastercard", "union_pay"]);
        for (const option of methodOptions()) {
            const code = option.value;
            if (allowed.includes(code)) {
                expect([code, option.disabled, option.textContent]).toEqual([code, false, label(code)]);
            } else {
                expect([code, option.disabled, option.textContent]).toEqual([code, true, `${ label(code) } · ${ REASON }`]);
            }
        }
        const blocked = methodOptions().filter((option) => option.disabled).map((option) => option.value).sort();
        expect(blocked).toEqual(["apple_pay", "alipay_hk", "wechat_pay_hk", "bank_transfer", "fps", "cheque", "payme", "cash"].sort());
        // the panel opens on Visa, which a Reservation Fee allows
        expect(screen.getByLabelText(EN.key_payment_method).value).toBe("visa");
    });

    test("Full Payment: every method, no reason", async () => {
        render(<PaymentMethodSelector invoiceData={ { payment_type: "full" } } submitAction={ jest.fn() } />);
        await screen.findByRole("option", { name: label("cash") });
        expect(methodOptions().length).toBe(11);
        expect(methodOptions().filter((option) => option.disabled)).toEqual([]);
        expect(methodOptions().some((option) => option.textContent.includes(REASON))).toBe(false);
    });

    test("an existing Reservation Fee's remaining balance (Pay Remaining Balance) takes every method", async () => {
        render(<PayRemainingBalanceModal invoiceData={ { id: 9, status: 4, payment_type: "reservation_fee", payRemainingBalance: { amount: 2100 } } }
            submitAction={ jest.fn() } onClose={ jest.fn() } />);
        await screen.findByRole("option", { name: label("cash") });
        const options = screen.getAllByRole("option");
        expect(options.length).toBe(11);
        expect(options.filter((option) => option.disabled)).toEqual([]);
        expect(screen.queryByText(REASON)).toBeNull();
    });
});
