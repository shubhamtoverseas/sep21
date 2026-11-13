import React from "react";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/* Payment fields per method (Payment Method Rules v4, 9 Oct 2026 — section A "Field validation"; C-1).
   The form checks the API's own rules with the API's own English: the catalogue below is the payload the Invoice API
   serves (maidmatch-contract paymentCatalogue(), run through ts-node), not a copy. Needs the maidmatch-contract checkout
   next to this repo (or CONTRACT_API_DIR); without it the suite is skipped. */

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
const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch }));
jest.mock("../../redux/Slices/invoices/InvoicesSlice", () => ({ uploadInvoicePaymentAttachment: jest.fn() }));
jest.mock("../../services/commonService", () => ({ uploadFile: jest.fn() }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../components/ui/DateInput", () => () => null);
jest.mock("../../services/invoices", () => ({ getPaymentMethodCatalogueAPI: jest.fn() }));

const { getPaymentMethodCatalogueAPI } = require("../../services/invoices");
const PaymentMethodSelector = require("../../Views/Pages/Invoice/payment-method-selector/PaymentMethodSelector").default;
const { toSelectorMethod, validatePaymentFields } = require("../../Views/Pages/Invoice/payment-method-selector/paymentMethodCatalogue");

(hasContract ? describe : describe.skip)("payment fields per method — same rules and messages as the Invoice API", () => {
    const catalogue = hasContract ? apiCatalogue() : null;
    const API_EN = hasContract ? JSON.parse(fs.readFileSync(path.join(contractDir, "src/locales/en.json"), "utf8")) : {};
    const method = (code) => toSelectorMethod(catalogue.methods.find((m) => m.code === code), "", catalogue.methodFields);
    const check = (code, formData) => validatePaymentFields(method(code), formData, catalogue.fieldRules);
    const visa = (extra = {}) => ({ card_number: "4242", approval_code: "16:10:44", transaction_reference: "ABC123", ...extra });

    beforeEach(() => {
        getPaymentMethodCatalogueAPI.mockResolvedValue({ data: { data: catalogue } });
    });

    test("every message reads the same in the admin and in the API (English)", () => {
        Object.values(catalogue.fieldRules).forEach((rule) => {
            [rule.required, rule.invalid].filter(Boolean).forEach((m) => {
                expect(EN[m.fe]).toBeTruthy();
                expect(EN[m.fe]).toBe(API_EN[m.be]);
            });
        });
        expect(EN.key_transaction_reference_invalid).toBe("Transaction reference must be letters and numbers only (max 50).");
        expect(EN.key_card_last_4_invalid).toBe("Card last 4 must be exactly 4 digits.");
        expect(EN.key_cheque_number_invalid).toBe("Cheque number must be digits only (max 8).");
        expect(EN.key_bank_invalid).toBe("Bank must be 50 characters or fewer.");
    });

    test("Approval Code: 16:10:44 valid; 24:00:00 and VHK22B81 invalid (C-1)", () => {
        expect(check("visa", visa())).toEqual({});
        expect(check("visa", visa({ approval_code: "24:00:00" }))).toEqual({ approval_code: EN.key_invalid_time_code_format });
        expect(check("visa", visa({ approval_code: "VHK22B81" }))).toEqual({ approval_code: EN.key_invalid_time_code_format });
        expect(check("visa", visa({ approval_code: "" }))).toEqual({ approval_code: EN.key_time_code_is_required });
    });

    test("cards: last 4 exactly 4 digits, reference letters and numbers max 50; Apple Pay must choose a network", () => {
        for (const code of ["visa", "mastercard", "union_pay"]) {
            expect(check(code, visa())).toEqual({});
            expect(check(code, visa({ card_number: "123", transaction_reference: "AB-1" }))).toEqual({
                card_number: EN.key_card_last_4_invalid, transaction_reference: EN.key_transaction_reference_invalid,
            });
        }
        expect(check("visa", visa({ transaction_reference: "A".repeat(51) }))).toEqual({ transaction_reference: EN.key_transaction_reference_invalid });
        expect(check("apple_pay", visa())).toEqual({ card_type: EN.key_card_network_is_required });
        for (const network of ["visa", "master_card", "union_pay"]) expect(check("apple_pay", visa({ card_type: network }))).toEqual({});
    });

    test("wallets, transfer, FPS, PayMe, cheque and cash", () => {
        for (const code of ["alipay_hk", "wechat_pay_hk"]) {
            expect(check(code, { transaction_reference: "TX99" })).toEqual({});
            expect(check(code, { transaction_reference: "" })).toEqual({ transaction_reference: EN.key_transaction_reference_is_required });
        }
        expect(check("bank_transfer", { bank_in_reference: "BT1", bank_name: "HSBC" })).toEqual({});
        expect(check("bank_transfer", {})).toEqual({ bank_in_reference: EN.key_transfer_reference_is_required, bank_name: EN.key_bank_name_is_required });
        expect(check("fps", {})).toEqual({ transaction_reference: EN.key_fps_reference_is_required });
        expect(check("payme", { transaction_reference: "P1" })).toEqual({});
        expect(check("cheque", { cheque_number: "12345678", bank_name: "HSBC" })).toEqual({});
        expect(check("cheque", { cheque_number: "123456789", bank_name: "B".repeat(51) })).toEqual({
            cheque_number: EN.key_cheque_number_invalid, bank_name: EN.key_bank_invalid,
        });
        expect(check("cash", {})).toEqual({});
    });

    /* the payment panel opens on Visa, with its fields in the panel */
    const openVisa = async () => {
        const { container } = render(<PaymentMethodSelector submitAction={ jest.fn((p) => p) } invoiceData={ { payment_type: "full" } } />);
        await waitFor(() => expect(screen.getByLabelText(EN.key_payment_method).value).toBe("visa"));
        return container.querySelector(".pms-wrap");
    };

    test("Visa: Card Network pre-filled and read-only; error next to the field, cleared on fix; Confirm disabled while invalid", async () => {
        const dialog = await openVisa();
        // the Card Network input (the Payment Method list shows Visa as well)
        const network = within(dialog).getAllByDisplayValue("Visa").find((el) => el.tagName === "INPUT");
        expect(network.readOnly).toBe(true);
        const confirm = within(dialog).getByText(EN.key_confirm_payment).closest("button");
        expect(confirm.disabled).toBe(true);

        fireEvent.change(within(dialog).getByPlaceholderText("1234"), { target: { value: "123" } });
        expect(within(dialog).getByText(EN.key_card_last_4_invalid)).toBeTruthy();
        fireEvent.change(within(dialog).getByPlaceholderText("1234"), { target: { value: "1234" } });
        expect(within(dialog).queryByText(EN.key_card_last_4_invalid)).toBeNull();

        fireEvent.change(within(dialog).getByPlaceholderText("HH:MM:SS"), { target: { value: "161044" } });
        expect(within(dialog).getByPlaceholderText("HH:MM:SS").value).toBe("16:10:44");
        expect(confirm.disabled).toBe(true);
        fireEvent.change(within(dialog).getByPlaceholderText("Alphanumeric reference from terminal receipt"), { target: { value: "TX 1" } });
        expect(within(dialog).getByText(EN.key_transaction_reference_invalid)).toBeTruthy();
        expect(confirm.disabled).toBe(true);
        fireEvent.change(within(dialog).getByPlaceholderText("Alphanumeric reference from terminal receipt"), { target: { value: "TX1" } });
        expect(confirm.disabled).toBe(false);
    });

    test("a server rejection keeps the panel and the input, and shows the message next to the field", async () => {
        const message = API_EN.PAYMENT_APPROVAL_CODE_INVALID;
        mockDispatch.mockImplementation((payload) => {
            mockDispatch.sent = payload;
            return Promise.resolve({ payload: { status: 400, data: { status: false, error: message, errors: { approval_code: message } } } });
        });
        const dialog = await openVisa();
        fireEvent.change(within(dialog).getByPlaceholderText("1234"), { target: { value: "4242" } });
        fireEvent.change(within(dialog).getByPlaceholderText("HH:MM:SS"), { target: { value: "161044" } });
        fireEvent.change(within(dialog).getByPlaceholderText("Alphanumeric reference from terminal receipt"), { target: { value: "TX1" } });
        fireEvent.click(within(dialog).getByText(EN.key_confirm_payment));

        await waitFor(() => expect(within(dialog).getAllByText(message).length).toBeGreaterThan(0));
        expect(mockDispatch.sent).toMatchObject({ payment_method: "credit_card", card_type: "visa", card_number: "4242", approval_code: "16:10:44", transaction_reference: "TX1" });
        expect("time_code" in mockDispatch.sent).toBe(false);
        expect(screen.getByPlaceholderText("1234").value).toBe("4242");
        expect(screen.getByPlaceholderText("Alphanumeric reference from terminal receipt").value).toBe("TX1");

        // the field's server error goes when the field changes
        fireEvent.change(screen.getByPlaceholderText("HH:MM:SS"), { target: { value: "101010" } });
        expect(within(dialog).queryByText(message)).toBeNull();
        expect(screen.getByPlaceholderText("HH:MM:SS").getAttribute("aria-invalid")).toBe("false");
    });
});
