import React from "react";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";

/* Pay Remaining Balance, the one collection action (Payment Method Rules v4, 9 Oct 2026 — B-8): the screens show a blue
   action only when the Invoice API offers it (invoiceDetails.payRemainingBalance) and open its modal when it is pressed
   (reference invoice-detail.html · ActionMenu record_payment + RecordPaymentModal; user 14 Oct: no payment panel shown
   directly). The amount is the one the API locked to the current Balance Due; there is no Full Payment or Reservation Fee
   choice; the amount and version go back to the API, which re-checks them at commit. "Record Payment" (/add-payment) is
   gone. The catalogue is the Invoice API's own payload (ts-node); without the contract checkout next to this repo (or
   CONTRACT_API_DIR) the rendering suite is skipped. */

const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
const ZH_HK = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/zh_HK/translation.json"), "utf8"));
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
/* dispatch hands back what the thunk returned, so a test decides the API's answer */
jest.mock("react-redux", () => ({ useDispatch: () => (action) => Promise.resolve(action) }));
jest.mock("../../redux/Slices/invoices/InvoicesSlice", () => ({
    uploadInvoicePaymentAttachment: jest.fn(), removeInvoicePaymentAttachment: jest.fn(),
}));
jest.mock("../../services/commonService", () => ({ uploadFile: jest.fn() }));
jest.mock("../../services/commonClient", () => ({ __esModule: true, default: { post: jest.fn(() => Promise.resolve({ data: {} })), get: jest.fn() } }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../components/ui/DateInput", () => () => null);
jest.mock("../../services/invoices", () => ({
    ...jest.requireActual("../../services/invoices"),
    getPaymentMethodCatalogueAPI: jest.fn(),
}));

const { getPaymentMethodCatalogueAPI, setPayRemainingBalance } = require("../../services/invoices");
const commonClient = require("../../services/commonClient").default;
const { ShowToast } = require("../../components/show-toast/ShowToast");
const { PayRemainingBalanceAction } = require("../../Views/Pages/Invoice/payment-method-selector/PayRemainingBalanceModal");

/* an active Reservation Fee: HK$300 paid, HK$2,100 still due, as the Invoice API offers it */
const RF_INVOICE = { id: 9, status: 4, payment_type: "reservation_fee", paid_amount: 300, remaining_balance: 2700,
    payRemainingBalance: { amount: 2100, version: 3 } };
const fulfilled = (data) => ({ meta: { requestStatus: "fulfilled" }, payload: { status: true, message: "done", data } });

(hasContract ? describe : describe.skip)("Pay Remaining Balance on the invoice screens", () => {
    const catalogue = hasContract ? apiCatalogue() : null;
    beforeEach(() => {
        getPaymentMethodCatalogueAPI.mockResolvedValue({ data: { data: catalogue } });
        ShowToast.mockClear();
    });

    const renderPay = (invoiceData, submitAction = jest.fn(() => fulfilled({ contract_invoices_id: 9 })), onSuccess = jest.fn()) => ({
        submitAction, onSuccess,
        ...render(<PayRemainingBalanceAction invoiceData={ invoiceData } statusLabel={ EN.key_reservation_fee } submitAction={ submitAction } onSuccess={ onSuccess } />),
    });
    /* press the action and wait for the catalogue: the modal opens on Visa */
    const open = async () => {
        fireEvent.click(screen.getByRole("button", { name: EN.key_pay_remaining_balance }));
        const dialog = screen.getByRole("dialog");
        await waitFor(() => expect(within(dialog).getByLabelText(EN.key_payment_method).value).toBe("visa"));
        return dialog;
    };
    const pick = (dialog, code) => fireEvent.change(within(dialog).getByLabelText(EN.key_payment_method), { target: { value: code } });
    const impactRows = (dialog) => [...dialog.querySelectorAll(".impact-tbl tbody tr")].map((tr) => [...tr.children].map((td) => td.textContent));

    test("hidden when the Invoice API offers none (Balance Due HK$0, expired Reservation Fee, refund child)", () => {
        for (const offer of [null, undefined]) {
            const { container, unmount } = renderPay({ ...RF_INVOICE, payRemainingBalance: offer });
            expect(container.innerHTML).toBe("");
            unmount();
        }
    });

    test("a blue action; nothing about the payment is shown until it is pressed", async () => {
        renderPay(RF_INVOICE);
        const action = screen.getByRole("button", { name: EN.key_pay_remaining_balance });
        expect(action.className).toBe("action-btn primary");
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(document.querySelectorAll("button.payment-tile").length).toBe(0);
        expect(screen.queryByText(EN.key_amount_due_now)).toBeNull();
        const dialog = await open();
        expect(within(dialog).getByRole("heading", { name: EN.key_pay_remaining_balance })).toBeTruthy();
        expect(within(dialog).getByText(EN.key_pay_remaining_balance_subtitle)).toBeTruthy();
        fireEvent.click(within(dialog).getByText(EN.key_cancel));
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    test("the modal: the locked amount (cents kept), Visa first, all 11 methods in their 4 groups, none disabled", async () => {
        renderPay({ ...RF_INVOICE, payRemainingBalance: { amount: 499.99 } });
        const dialog = await open();
        expect(within(dialog).getByText(EN.key_amount_due_now)).toBeTruthy();
        expect(within(dialog).getAllByText("HK$499.99").length).toBeGreaterThan(0);
        expect(within(dialog).getByText(EN.key_system_calculated_locked)).toBeTruthy();
        const select = within(dialog).getByLabelText(EN.key_payment_method);
        expect([...select.querySelectorAll("optgroup")].map((g) => g.label)).toEqual(catalogue.groups.map((g) => EN[g.labelKey]));
        const options = [...select.querySelectorAll("option")];
        expect(options.length).toBe(11);
        options.forEach((option) => expect(option.disabled).toBe(false));
        // no amount to type: the amount is not an input; never Full Payment or Reservation Fee
        expect(dialog.querySelector("input[type=number]")).toBeNull();
        for (const absent of [EN.key_full_payment, EN.key_reservation_fee_due_now]) {
            expect(within(dialog).queryByText(absent, { exact: false })).toBeNull();
        }
    });

    test("the footer names what is still required and the payment cannot be confirmed until it is entered", async () => {
        renderPay(RF_INVOICE);
        const dialog = await open();
        expect(within(dialog).getByText(`${ EN.key_required }: ${ [EN.key_approval_code, EN.key_transaction_reference, EN.key_card_last_4].join(" · ") }`)).toBeTruthy();
        expect(within(dialog).getByRole("button", { name: EN.key_confirm_payment }).disabled).toBe(true);
        pick(dialog, "fps");
        expect(within(dialog).getByText(`${ EN.key_required }: ${ [EN.key_fps_reference, EN.key_proof_of_payment].join(" · ") }`)).toBeTruthy();
        pick(dialog, "cash");
        expect(dialog.querySelector(".pe-foot-note")).toBeNull();
        expect(within(dialog).getByRole("button", { name: EN.key_submit_payment }).disabled).toBe(false);
    });

    test("the chosen method decides: a card confirms as Paid; Cash records Pending Paid, FPS Pending Paid · Unapproved", async () => {
        renderPay(RF_INVOICE);
        const dialog = await open();
        const resultStatus = () => dialog.querySelector(".pm-resultnote strong").textContent;
        expect(resultStatus()).toBe(EN.key_paid_approved);
        expect(within(dialog).getByRole("button", { name: EN.key_confirm_payment })).toBeTruthy();
        pick(dialog, "cash");
        expect(resultStatus()).toBe(EN.key_pending_paid);
        expect(within(dialog).getByRole("button", { name: EN.key_submit_payment })).toBeTruthy();
        pick(dialog, "fps");
        expect(resultStatus()).toBe(EN.key_pending_paid_unapproved);
    });

    test("the impact preview: the status and payment review the method leads to, then Paid and Balance Due before → after", async () => {
        renderPay(RF_INVOICE);
        const dialog = await open();
        expect(impactRows(dialog)).toEqual([
            [EN.key_status, EN.key_reservation_fee, "→", EN.key_paid],
            [EN.key_payment_review, "—", "→", EN.key_confirmed],
            [EN.key_paid, "HK$300", "→", "HK$2,400"],
            [EN.key_balance_due, "HK$2,100", "→", "HK$0"],
        ]);
        pick(dialog, "cash");
        expect(impactRows(dialog).slice(0, 2)).toEqual([
            [EN.key_status, EN.key_reservation_fee, "→", EN.key_pending_paid],
            [EN.key_payment_review, "—", "→", EN.key_pending_review],
        ]);
        expect(dialog.querySelector(".appr-impact .note").textContent).toBe(EN.key_balance_due_footnote);
    });

    test("an Unsettled / Bad Debt balance is cleared by the payment; the status and review rows are left out when they do not change", async () => {
        let { unmount } = render(<PayRemainingBalanceAction invoiceData={ { id: 5, status: 5, paid_amount: 200, payRemainingBalance: { amount: 800 } } }
            statusLabel={ EN.key_unsettled } submitAction={ jest.fn() } />);
        let dialog = await open();
        pick(dialog, "cash");
        expect(impactRows(dialog)).toEqual([
            [EN.key_status, EN.key_unsettled, "→", EN.key_pending_paid],
            [EN.key_payment_review, "—", "→", EN.key_pending_review],
            [EN.key_paid, "HK$200", "→", "HK$1,000"],
            [EN.key_balance_due, "HK$800", "→", "HK$0"],
            [EN.key_unsettled, "HK$800", "→", "HK$0"],
        ]);
        unmount();
        ({ unmount } = render(<PayRemainingBalanceAction invoiceData={ { id: 6, status: 7, paid_amount: 0, payRemainingBalance: { amount: 500 } } }
            statusLabel={ EN.key_bad_debt } submitAction={ jest.fn() } />));
        dialog = await open();
        expect(impactRows(dialog)[4]).toEqual([EN.key_bad_debt, "HK$500", "→", "HK$0"]);
        unmount();
        render(<PayRemainingBalanceAction invoiceData={ { id: 7, status: 2, paid_amount: 0, payRemainingBalance: { amount: 300 } } }
            statusLabel={ EN.key_pending_paid } submitAction={ jest.fn() } />);
        dialog = await open();
        // a card on a Pending Paid invoice: Paid, and its review Confirmed
        expect(impactRows(dialog).slice(0, 2)).toEqual([
            [EN.key_status, EN.key_pending_paid, "→", EN.key_paid],
            [EN.key_payment_review, EN.key_pending_review, "→", EN.key_confirmed],
        ]);
        pick(dialog, "cash");
        expect(impactRows(dialog)).toEqual([
            [EN.key_paid, "HK$0", "→", "HK$300"],
            [EN.key_balance_due, "HK$300", "→", "HK$0"],
        ]);
    });

    test("the method fields: a 2-column grid in the reference order, Field labels without asterisks", async () => {
        renderPay(RF_INVOICE);
        const dialog = await open();
        const fields = dialog.querySelector(".pe-fields");
        const labels = () => [...fields.querySelectorAll("label")].map((l) => l.textContent.trim());
        expect(labels()).toEqual([EN.key_card_network, `${ EN.key_approval_code } (HH:MM:SS)`, EN.key_transaction_reference, EN.key_card_last_4]);
        expect(labels().some((l) => l.includes("*"))).toBe(false);
        pick(dialog, "apple_pay");
        expect(labels()).toEqual([EN.key_card_network, `${ EN.key_approval_code } (HH:MM:SS)`, EN.key_transaction_reference, EN.key_card_last_4]);
        pick(dialog, "cheque");
        expect(labels()).toEqual([EN.key_bank, EN.key_cheque_number, EN.key_cheque_date, EN.key_proof_of_payment]);
        // the proof spans both columns
        expect(fields.querySelector(".pms-proof").closest(".pe-span2")).toBeTruthy();
        pick(dialog, "cash");
        expect(fields.querySelector(".cash-note")).toBeTruthy();
    });

    test("submits the locked amount and version with the method; the invoice reloads on success and the modal closes", async () => {
        const { submitAction, onSuccess } = renderPay(RF_INVOICE);
        const dialog = await open();
        pick(dialog, "cash");
        fireEvent.click(within(dialog).getByRole("button", { name: EN.key_submit_payment }));
        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        const payload = submitAction.mock.calls[0][0];
        expect(payload).toMatchObject({ invoice_id: 9, amount: 2100, version: 3, payment_method: "cash", payment_options: "cash" });
        expect(payload).not.toHaveProperty("payment_type");
        expect(payload).not.toHaveProperty("remaining_balance");
        expect(onSuccess.mock.calls[0][0]).toBe(9);
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    test("a refused amount (409: the Balance Due changed) keeps the modal open with the API's message", async () => {
        const message = "This invoice changed while you were editing. Reload it to see the latest version.";
        const refused = jest.fn(() => ({ meta: { requestStatus: "rejected" }, payload: { status: 409, data: { status: false, message, data: message } } }));
        const { onSuccess } = renderPay(RF_INVOICE, refused);
        const dialog = await open();
        pick(dialog, "cash");
        fireEvent.click(within(dialog).getByRole("button", { name: EN.key_submit_payment }));
        await waitFor(() => expect(ShowToast).toHaveBeenCalledWith("error", message));
        expect(screen.getByRole("dialog")).toBeTruthy();
        expect(within(screen.getByRole("dialog")).getByText(message)).toBeTruthy();
        expect(onSuccess).not.toHaveBeenCalled();
    });
});

test("the call: POST /contract/invoices/:id/pay-remaining-balance with the body the screen built", async () => {
    await setPayRemainingBalance({ invoice_id: 9, amount: 2100, version: 3, payment_method: "cash" });
    const [url, body] = commonClient.post.mock.calls[0];
    expect(url).toMatch(/\/contract\/invoices\/9\/pay-remaining-balance$/);
    expect(body).toEqual({ amount: 2100, version: 3, payment_method: "cash" });
});

const SRC = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");
const SCREENS = [
    "Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js",
    "Views/Pages/Invoice/add-contract-invoice/ExchangePaymentInvoice.js",
    "Views/Pages/Invoice/add-contract-invoice/exchangePaymentReview.js",
    "Views/Pages/Invoice/general/PaymentTypeInvoice.js",
    "Views/Pages/Invoice/general/exchangePaymentReview.js",
];

test.each(SCREENS)("%s offers Pay Remaining Balance as the first action of the action panel, only when the Invoice API offers it", (rel) => {
    const src = read(rel);
    expect(src).toMatch(/const payRemaining = invoiceDetails\?\.payRemainingBalance \|\| null;/);
    expect(src).toMatch(/\{ payRemaining && \(\s+<Suspense fallback=\{ null \}>\s+<PayRemainingBalanceAction invoiceData=\{ invoiceDetails \} statusLabel=\{ statusLabel \} submitAction=\{ payRemainingBalance \}/);
    // inside the action panel, before the Output group; no payment panel shown directly
    const action = src.indexOf("<PayRemainingBalanceAction");
    expect(action).toBeGreaterThan(src.indexOf('<div className="action-card">'));
    expect(action).toBeLessThan(src.indexOf("t('key_output')"));
    expect(src).not.toMatch(/PaymentMethodSelector/);
});

test("the payment selector keeps no Pay Remaining Balance mode; the method tiles and the confirm popup are gone", () => {
    const selector = read("Views/Pages/Invoice/payment-method-selector/PaymentMethodSelector.js");
    expect(selector).not.toMatch(/pms-prb-head|isPayRemaining|payRemainingBalance=|MethodButton|ConfirmPaymentModal|showModal/);
    for (const gone of ["Views/Pages/Invoice/payment-method-selector/ConfirmPaymentModal.js",
        "Views/Pages/Invoice/payment-method-selector/method-button/MethodButton.js"]) {
        expect([gone, fs.existsSync(path.join(SRC, gone))]).toEqual([gone, false]);
    }
    const css = read("Views/Pages/Invoice/payment-method-selector/paymentMethodSelector.css");
    expect(css).not.toMatch(/pms-prb-head|ps-title|payment-tile|pay-brand|pms-method-summary|pm-btnrow/);
    expect(read("components/ReusableComponents/constants.js")).not.toMatch(/PAYMENT_BRAND_CONFIG|methodShape = /);
    for (const key of ["key_proceed_to_payment", "key_selected_method", "key_result_after_confirmation", "key_confirmed_at_terminal_no_review",
        "key_visible_while_awaiting_review_proof_required", "key_confirm_payment_terminal_then_enter_details", "key_record_payment_reference_attach_proof",
        "key_submit_for_review", "key_record"]) {
        expect([key, key in EN, key in ZH_HK]).toEqual([key, false, false]);
    }
});

test("\"Record Payment\" is gone from the admin: no /add-payment call, thunk, path, partial-due rule or label", () => {
    const files = [];
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== "__test__") walk(p); } else if (/\.jsx?$/.test(e.name)) files.push(p);
    });
    walk(SRC);
    for (const f of files) {
        const src = fs.readFileSync(f, "utf8");
        expect([f, /add-payment|updatePaymentInvoice|setUpdatePaymentInvoice|_partial_reservation_paid|hasPartialDue/.test(src)]).toEqual([f, false]);
    }
    expect(EN.key_record_x_payment).toBeUndefined();
    expect(ZH_HK.key_record_x_payment).toBeUndefined();
});
