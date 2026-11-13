import React from "react";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/* Refund routes and payment methods (Payment Method Rules v4, 9 Oct 2026 — B-10; prototype Refund modal): a Tier 1
   payment may be refunded through its original channel or by company cheque, a Tier 2 payment — or one paid partly by
   Tier 2 — by company cheque only; Apple Pay names the Card Network that routes its refund. The screens read the Invoice
   API's refundOrigin (here: the contract's own refundOrigin over stored payment rows, via ts-node; without the contract
   checkout next to this repo, or CONTRACT_API_DIR, the rendering suites are skipped) and a refund child's refundRoute. */

const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
const ZH_HK = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/zh_HK/translation.json"), "utf8"));
const contractDir = process.env.CONTRACT_API_DIR || path.resolve(__dirname, "../../../../maidmatch-contract");
const hasContract = fs.existsSync(path.join(contractDir, "src/domain/invoice/refundRoutes.ts"));

/* payments as the payments table stores them → the API's refundOrigin, computed by the contract itself */
const STORED = {
    applePayMastercard: [{ payment_method: "credit_card", card_type: "master_card", payment_options: "apple_pay" }],
    bankTransfer: [{ payment_method: "bank_transfer", payment_options: "bank_transfer" }],
    fpsTerminalQr: [{ payment_method: "fps_terminal", payment_options: "fps_terminal" }],
    alipayHk: [{ payment_method: "alipay_hk", payment_options: "alipay_hk" }],
    visaThenBankTransfer: [{ payment_method: "credit_card", card_type: "visa", payment_options: "visa" }, { payment_method: "bank_transfer" }],
};
const apiOrigins = () => JSON.parse(execFileSync(process.execPath, [
    "-r", "ts-node/register/transpile-only", "-e",
    `const { refundOrigin } = require('./src/domain/invoice/refundRoutes');
     const rows = ${JSON.stringify(STORED)};
     process.stdout.write(JSON.stringify(Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, refundOrigin(v)]))));`,
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
    mockDispatch.mockImplementation(() => Promise.resolve({ payload: { status: 200, message: "ok", data: { id: 99, invoice: { id: 99 } } } }));
    addRefundInvoice.mockImplementation((payload) => ({ type: "invoices/addRefund", payload }));
});
const RefundModal = require("../../components/Layout/popups/invoice-popups/RefundModal").default;
const InitiateRefund = require("../../components/initiate-refund/InitiateRefund").default;
const { refundOriginLabel } = require("../../Views/Pages/Invoice/payment-method-selector/paymentMethodCatalogue");

const PARENT = {
    id: 5, invoice_number: "I-HK000005", invoice_type: "general", final_amount: 1000, refund_contract_prompt: false, employer_name: "Pang Chi Hung",
    subtotal_items: [{ id: 1, price_id: 11, item_type: "Fee", item_type_key: "fixed", item_description_during_subtotal_show: "Service fee", item_effective_amount: 1000, item_amount: 1000 }],
    paymentModel: [{ payment_method: "credit_card", card_type: "master_card" }],
    // the Invoice API's refundable offer (10 Oct register #20)
    refundable: { amount: 1000, paid: 1000, refunded: 0, pending: false, fullRefundOnly: false,
        lines: [{ id: 1, type: "fixed", priceId: 11, value: 1000, refunded: 0, remaining: 1000, full: 1000 }] },
};
const methodStep = () => {
    fireEvent.click(screen.getByText(EN.key_full_refund));
    fireEvent.click(screen.getByText(EN.key_next)); // → review
    fireEvent.click(screen.getByText(EN.key_next)); // → refund method
    return document.querySelector("p.rf-p").textContent;
};

describe("the original payment as the refund screens name it", () => {
    test("each method by its v4 name; Apple Pay with its Card Network; several methods listed", () => {
        expect(refundOriginLabel({ methods: [{ method: "apple_pay", cardNetwork: "mastercard" }] })).toBe("Apple Pay · Mastercard");
        expect(refundOriginLabel({ methods: [{ method: "apple_pay", cardNetwork: null }] })).toBe("Apple Pay");
        expect(refundOriginLabel({ methods: [{ method: "visa", cardNetwork: null }, { method: "bank_transfer", cardNetwork: null }] })).toBe("Visa, Bank Transfer");
        expect(refundOriginLabel(null)).toBe("");
    });
});

(hasContract ? describe : describe.skip)("Refund modal (invoice detail)", () => {
    const origins = hasContract ? apiOrigins() : null;

    test("a Tier 2 payment: company cheque only — no original channel (before: unknown v4 methods read as Visa · Tier 1)", () => {
        render(<RefundModal onClose={ jest.fn() } invoiceData={ { ...PARENT, payment_options: "bank_transfer", refundOrigin: origins.bankTransfer } } />);
        expect(methodStep()).toBe(`${EN.key_original_payment_method}: Bank Transfer · ${EN.key_tier_2}. ${EN.key_tier2_cheque_only}`);
        expect(screen.queryByText(EN.key_refund_through_original_channel)).toBeNull();
        expect(screen.getByText(EN.key_company_cheque).closest("button").className).toMatch(/active/);
    });

    test("FPS Terminal QR history reads as FPS, Tier 2 (before: 'FPS (Terminal)' with the original channel)", () => {
        render(<RefundModal onClose={ jest.fn() } invoiceData={ { ...PARENT, payment_options: "fps_terminal", refundOrigin: origins.fpsTerminalQr } } />);
        expect(methodStep()).toBe(`${EN.key_original_payment_method}: FPS · ${EN.key_tier_2}. ${EN.key_tier2_cheque_only}`);
        expect(screen.queryByText(EN.key_refund_through_original_channel)).toBeNull();
    });

    test("paid partly by card, partly by Bank Transfer: company cheque only (OP-PM-36)", () => {
        render(<RefundModal onClose={ jest.fn() } invoiceData={ { ...PARENT, payment_options: "visa", refundOrigin: origins.visaThenBankTransfer } } />);
        expect(methodStep()).toBe(`${EN.key_original_payment_method}: Visa, Bank Transfer · ${EN.key_tier_2}. ${EN.key_tier2_cheque_only}`);
        expect(screen.queryByText(EN.key_refund_through_original_channel)).toBeNull();
    });

    test("no refund routes from the API: company cheque only (the safe route)", () => {
        render(<RefundModal onClose={ jest.fn() } invoiceData={ { ...PARENT, payment_options: "visa" } } />);
        methodStep();
        expect(screen.queryByText(EN.key_refund_through_original_channel)).toBeNull();
    });

    test("Apple Pay: Tier 1, original channel through its Card Network, sent as direct_refund", async () => {
        render(<RefundModal onClose={ jest.fn() } invoiceData={ { ...PARENT, payment_options: "apple_pay", refundOrigin: origins.applePayMastercard } } />);
        expect(methodStep()).toBe(`${EN.key_original_payment_method}: Apple Pay · Mastercard · ${EN.key_tier_1}. ${EN.key_refund_original_or_cheque}`);
        const original = screen.getByText(EN.key_refund_through_original_channel).closest("button");
        expect(original.className).toMatch(/active/);
        expect(original.textContent).toContain(EN.key_refund_via_card_network_not_apple_pay);
        expect(screen.getByText(EN.key_company_cheque)).toBeTruthy();
        fireEvent.click(screen.getByText(EN.key_next)); // → documentation
        fireEvent.click(screen.getByText(EN.key_next)); // → confirm
        expect(screen.getByText(`${EN.key_original_channel} · Apple Pay · Mastercard`)).toBeTruthy();
        fireEvent.click(screen.getByText(new RegExp(`^${EN.key_confirm_refund}`)));
        await waitFor(() => expect(addRefundInvoice).toHaveBeenCalledTimes(1));
        expect(addRefundInvoice.mock.calls[0][0].refund_option).toBe("direct_refund");
    });

    test("a Tier 1 payment may still go by company cheque: sent as cheque_refund", async () => {
        render(<RefundModal onClose={ jest.fn() } invoiceData={ { ...PARENT, payment_options: "alipay", refundOrigin: origins.alipayHk } } />);
        expect(methodStep()).toBe(`${EN.key_original_payment_method}: AlipayHK · ${EN.key_tier_1}. ${EN.key_refund_original_or_cheque}`);
        fireEvent.click(screen.getByText(EN.key_company_cheque));
        expect(screen.getByText(EN.key_cheque_payee)).toBeTruthy();
        fireEvent.click(screen.getByText(EN.key_next));
        fireEvent.click(screen.getByText(EN.key_next));
        fireEvent.click(screen.getByText(new RegExp(`^${EN.key_confirm_refund}`)));
        await waitFor(() => expect(addRefundInvoice).toHaveBeenCalledTimes(1));
        expect(addRefundInvoice.mock.calls[0][0].refund_option).toBe("cheque_refund");
    });
});

/* the Remaining Credit refund of an exchange (INV-X4, register #74): the exchange's own submission with the refund's route */
(hasContract ? describe : describe.skip)("Exchange refund panel (Remaining Credit refund of an exchange)", () => {
    const origins = hasContract ? apiOrigins() : null;
    const EXCHANGE = { invoice_id: 3, pricing: { route: "exchange" }, record_key: "rk" };
    const panel = (refundOrigin, submitAction = jest.fn((payload) => ({ type: "exchange", payload }))) => {
        render(<InitiateRefund invoiceData={ { ...EXCHANGE, final_amount: 200, invoices_date: "2026-10-01" } } selectionType="overpayment_refund"
            submitAction={ submitAction } contractFormInfo={ { currentInvoiceExchange: { id: 3, invoice_number: "I-A1", payment_options: "visa",
                paymentModel: [{ payment_method: "credit_card", card_type: "visa" }], refundOrigin } } }
            handleCancelSelection={ jest.fn() } />);
        return submitAction;
    };
    const options = () => [...document.querySelectorAll(".rms-opt")].map((o) => o.querySelector(".rms-nm").firstChild.textContent);

    test("a Tier 2 payment: the cheque route is fixed and stated", () => {
        panel(origins.fpsTerminalQr);
        expect(screen.getByText("FPS")).toBeTruthy();
        expect(screen.getByText(EN.key_tier_2_off_terminal)).toBeTruthy();
        expect(document.querySelector(".refund-rule-box").textContent).toContain(EN.key_tier2_cheque_only);
        expect(options()).toEqual([EN.key_company_cheque]);
        expect(document.querySelector(".rms-opt").className).toMatch(/rms-sel/);
    });

    test("a card payment returns to its Card Network on the terminal (register #24): Apple Pay through its stored network", async () => {
        const submit = panel(origins.applePayMastercard);
        expect(screen.getByText("Apple Pay · Mastercard")).toBeTruthy();
        expect(screen.getByText(EN.key_tier_1_terminal_verified)).toBeTruthy();
        expect(document.querySelector(".refund-rule-box").textContent).toContain(EN.key_terminal_verified_refund_original_channel);
        expect(options()).toEqual([EN.key_refund_through_original_channel]);
        expect(document.querySelector(".rms-opt.rms-sel").textContent).toContain(EN.key_refund_via_card_network_not_apple_pay);
        fireEvent.click(screen.getByText(EN.key_submit_refund_request));
        await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
        // the exchange, its disposition and A1's stored payment: no amount, line or total (the server prices and sizes the refund)
        expect(submit.mock.calls[0][0]).toEqual({ ...EXCHANGE, remaining_credit: "refund", refund_option: "direct_refund", payment_method: "credit_card", card_type: "visa" });
    });

    test("a wallet payment returns to the wallet or by company cheque, the administrator's choice", async () => {
        const submit = panel(origins.alipayHk);
        expect(screen.getByText("AlipayHK")).toBeTruthy();
        expect(document.querySelector(".refund-rule-box").textContent).toContain(EN.key_refund_original_or_cheque);
        expect(options()).toEqual([EN.key_refund_through_original_channel, EN.key_company_cheque]);
        expect(document.querySelector(".rms-opt.rms-sel").textContent).toContain(EN.key_returns_to_original_channel);
        fireEvent.click(screen.getByText(EN.key_company_cheque));
        fireEvent.click(screen.getByText(EN.key_submit_refund_request));
        await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
        expect(submit.mock.calls[0][0].refund_option).toBe("cheque_refund");
    });

    test("paid partly by Bank Transfer: company cheque only, sent as cheque_refund", async () => {
        const submit = panel(origins.visaThenBankTransfer);
        expect(options()).toEqual([EN.key_company_cheque]);
        fireEvent.click(screen.getByText(EN.key_submit_refund_request));
        await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
        expect(submit.mock.calls[0][0].refund_option).toBe("cheque_refund");
    });
});

describe("refund child screens: the documentation gate follows the refund's route", () => {
    test("both refund screens take Approve Refund's gate and reason from the Invoice API (decision AA-06)", () => {
        for (const file of ["Views/Pages/Invoice/add-contract-invoice/RefundInvoice.js", "Views/Pages/Invoice/general/RefundInvoice.js"]) {
            const screenSrc = read(file);
            // the cheque-copy card still follows the refund's route; the gate itself is the API's (INVOICE_BLOCKED_CHEQUE_COPY_REQUIRED)
            expect(screenSrc).toMatch(/const uploadRequired = invoiceDetails\?\.refundRoute === "cheque";/);
            expect(screenSrc).not.toMatch(/UPLOAD_REQUIRED_METHODS|key_please_upload_scanned_image_payment|key_cheque_copy_required_before_approval/);
            expect(screenSrc).toMatch(/const approveAction = findAction\(actionStatusList, 'approve_refund'\);/);
            expect(screenSrc).toMatch(/const approveBlocked = isBlocked\(approveAction\);/);
            expect(screenSrc).toMatch(/\{ approveBlocked && <span className="blocked">\{ approveAction\.reason \}<\/span> \}/);
        }
        expect(EN.key_cheque_copy_required_before_approval).toBeUndefined();
    });

    test("the old refund tables and their copy are gone", () => {
        const constants = read("components/ReusableComponents/constants.js");
        for (const name of ["METHOD_CONFIG_REFUND", "REFUND_METHODS", "GENERAL_REFUND_UPLOAD_REQUIRED_METHODS", "CONTRACT_REFUND_UPLOAD_REQUIRED_METHODS"]) {
            expect(constants).not.toMatch(new RegExp(`\\b${name}\\b`));
        }
        for (const file of ["components/Layout/popups/invoice-popups/RefundModal.js", "components/initiate-refund/InitiateRefund.js"]) {
            expect(read(file)).not.toMatch(/METHOD_CONFIG_REFUND|REFUND_METHODS|payment_options \?/);
        }
        for (const key of ["key_fps_terminal_refund_cheque_only", "key_fps_direct_cannot_reverse", "key_bank_in_refunds_require_details",
            "key_cash_refunds_no_audit_trail", "key_cheque_refunds_standard_mechanism", "key_off_terminal_refund_cheque_only", "key_off_terminal_payment",
            "key_admin_selects_refund_method", "key_has_built_in_terminal_refund",
            "key_refund_method_fixed", "key_refund_method_via_card_network", "key_visa_stored_card_network"]) {
            expect([key, EN[key], ZH_HK[key]]).toEqual([key, undefined, undefined]);
        }
        // still used by the exchange refund panel for a card refund
        expect(EN.key_terminal_verified_refund_original_channel).toBeTruthy();
    });
});
