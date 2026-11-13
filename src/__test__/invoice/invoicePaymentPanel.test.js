import React from "react";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/* The payment panel of invoice creation (user 14 Oct, "CONFIRM PANEL"): the look of the Pay Remaining Balance modal
   (reference RecordPaymentModal) in the right panel, not a popup — a locked amount, one Payment Method list (Visa first),
   the method's fields, the result note and "Required: ..." with Confirm Payment / Submit Payment — while the rules stay
   as they were. The catalogue is the Invoice API's own payload (ts-node); without the contract checkout next to this
   repo (or CONTRACT_API_DIR) the rendering suite is skipped. */

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

(hasContract ? describe : describe.skip)("the creation payment panel", () => {
    const catalogue = hasContract ? apiCatalogue() : null;
    beforeEach(() => {
        getPaymentMethodCatalogueAPI.mockResolvedValue({ data: { data: catalogue } });
        mockDispatch.sent = null;
        mockDispatch.mockImplementation((payload) => {
            mockDispatch.sent = payload;
            return Promise.resolve({ payload: { status: 200, message: "ok", data: { invoice: { id: 7 } } } });
        });
    });

    const renderPanel = async (invoiceData, props = {}) => {
        const view = render(<PaymentMethodSelector submitAction={ jest.fn((p) => p) } invoiceData={ invoiceData } { ...props } />);
        await waitFor(() => expect(screen.getByLabelText(EN.key_payment_method).value).toBe("visa"));
        return { ...view, panel: view.container.querySelector(".pms-wrap") };
    };
    const pick = (code) => fireEvent.change(screen.getByLabelText(EN.key_payment_method), { target: { value: code } });

    test("in the panel, not a popup: the locked amount (net of applied credits), Visa first, its fields and Required list", async () => {
        const { panel } = await renderPanel({ payment_type: "full", final_amount: 1000, apply_credits: [{ amount: 200 }] });
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(panel.querySelectorAll("button.payment-tile").length).toBe(0);
        expect(within(panel).getByText(EN.key_amount_due_now)).toBeTruthy();
        expect(within(panel).getAllByText("HK$800").length).toBeGreaterThan(0);
        expect(within(panel).getByText(EN.key_system_calculated_locked)).toBeTruthy();
        expect(within(panel).getByPlaceholderText("1234")).toBeTruthy();
        expect(within(panel).getByText(`${ EN.key_required }: ${ [EN.key_approval_code, EN.key_transaction_reference, EN.key_card_last_4].join(" · ") }`)).toBeTruthy();
        expect(within(panel).getByRole("button", { name: EN.key_confirm_payment }).disabled).toBe(true);
        expect(within(panel).queryByText(EN.key_cancel)).toBeNull();
    });

    test("Cash records with nothing entered: Submit Payment, Pending Paid", async () => {
        const { panel } = await renderPanel({ payment_type: "full", final_amount: 500 });
        pick("cash");
        expect(panel.querySelector(".pm-resultnote strong").textContent).toBe(EN.key_pending_paid);
        fireEvent.click(within(panel).getByRole("button", { name: EN.key_submit_payment }));
        await waitFor(() => expect(mockDispatch.sent).toBeTruthy());
        expect(mockDispatch.sent).toMatchObject({ payment_method: "cash", payment_options: "cash", payment_type: "full" });
    });

    test("a new Reservation Fee: its due-now amount; Confirm blocked with the existing note until its details are in", async () => {
        const { panel, rerender } = await renderPanel({ payment_type: "reservation_fee", paid_amount: 300, final_amount: 3000 });
        expect(within(panel).getByText(EN.key_reservation_fee_due_now)).toBeTruthy();
        expect(within(panel).getAllByText("HK$300").length).toBeGreaterThan(0);
        expect(within(panel).getByText(EN.key_complete_reservation_fee_details)).toBeTruthy();
        fireEvent.change(within(panel).getByPlaceholderText("1234"), { target: { value: "4242" } });
        fireEvent.change(within(panel).getByPlaceholderText("HH:MM:SS"), { target: { value: "161044" } });
        fireEvent.change(within(panel).getByPlaceholderText("Alphanumeric reference from terminal receipt"), { target: { value: "TX1" } });
        expect(within(panel).getByRole("button", { name: EN.key_confirm_payment }).disabled).toBe(true);
        rerender(<PaymentMethodSelector submitAction={ jest.fn((p) => p) }
            invoiceData={ { payment_type: "reservation_fee", paid_amount: 300, final_amount: 3000, due_date: "2026-10-20 10:00:00", follow_up_note: "call" } } />);
        expect(within(panel).queryByText(EN.key_complete_reservation_fee_details)).toBeNull();
        expect(within(panel).getByRole("button", { name: EN.key_confirm_payment }).disabled).toBe(false);
    });

    test("switching the path to a Reservation Fee while a blocked method is picked goes back to Visa", async () => {
        const { rerender } = await renderPanel({ payment_type: "full", final_amount: 3000 });
        pick("cash");
        rerender(<PaymentMethodSelector submitAction={ jest.fn((p) => p) } invoiceData={ { payment_type: "reservation_fee", paid_amount: 300, final_amount: 3000 } } />);
        await waitFor(() => expect(screen.getByLabelText(EN.key_payment_method).value).toBe("visa"));
    });

    test("the stepper hears when payment details are entered — not before", async () => {
        const entered = jest.fn();
        const { panel } = await renderPanel({ payment_type: "full", final_amount: 500 }, { onDetailsEntered: entered });
        expect(entered).toHaveBeenLastCalledWith(false);
        fireEvent.change(within(panel).getByPlaceholderText("1234"), { target: { value: "4" } });
        expect(entered).toHaveBeenLastCalledWith(true);
    });
});

const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/Invoice", rel), "utf8");

// one review stage for Contract and Standalone Invoices since INV-G4
test.each(["add-contract-invoice/InvoiceReview.js"])(
    "%s: the stepper follows the panel's payment details; no payment popup toggle remains", (rel) => {
        const src = read(rel);
        expect(src).toMatch(/onDetailsEntered=\{ setPayStarted \}/);
        expect(src).not.toMatch(/onPaymentModalToggle|payOpen/);
    });
