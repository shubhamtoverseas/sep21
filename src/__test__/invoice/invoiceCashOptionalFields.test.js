import React from "react";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/* Cash: optional receipt number and Received By (Payment Method Rules v4 A, Cash — "NONE required at recording. / Optional:
   receipt number, Received-By."; INV §5.2; 10 Oct register #13; Step 8 F4). Cash is recorded with nothing entered; what
   is entered is sent trimmed and stored on the payment. The catalogue is the payload the Invoice API serves
   (maidmatch-contract paymentCatalogue(), run through ts-node); without that checkout the suite is skipped. */

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

test("the copy", () => {
    expect(EN.key_receipt_no).toBe("Receipt No.");
    expect(EN.key_received_by).toBe("Received by");
});

(hasContract ? describe : describe.skip)("Cash: receipt number and Received By, optional", () => {
    const catalogue = hasContract ? apiCatalogue() : null;

    beforeEach(() => {
        getPaymentMethodCatalogueAPI.mockResolvedValue({ data: { data: catalogue } });
        mockDispatch.sent = null;
        mockDispatch.mockImplementation((payload) => {
            mockDispatch.sent = payload;
            return Promise.resolve({ payload: { status: 200, message: "ok", data: { invoice: { id: 7 } } } });
        });
    });

    /* the payment panel with the method picked in its Payment Method list */
    const open = async (code) => {
        const { container } = render(<PaymentMethodSelector submitAction={ jest.fn((p) => p) } invoiceData={ { payment_type: "full" } } />);
        await waitFor(() => expect(screen.getByLabelText(EN.key_payment_method).value).toBe("visa"));
        fireEvent.change(screen.getByLabelText(EN.key_payment_method), { target: { value: code } });
        return container.querySelector(".pms-wrap");
    };
    const inputOf = (dialog, label) => within(dialog).getByText(label).closest("div").querySelector("input");

    test("two optional inputs, capped by the API's rules; the deposit receipt note stays; submittable with nothing entered", async () => {
        const dialog = await open("cash");
        for (const [label, field] of [[EN.key_receipt_no, "receipt_number"], [EN.key_received_by, "received_by"]]) {
            const labelEl = within(dialog).getByText(label);
            expect(labelEl.querySelector("span")).toBeNull(); // no required mark
            expect(inputOf(dialog, label).maxLength).toBe(catalogue.optionalFieldRules[field].maxLength);
        }
        expect(within(dialog).getByText(EN.key_no_proof_required_at_payment_time)).toBeTruthy();
        expect(within(dialog).getByText(EN.key_submit_payment).closest("button").disabled).toBe(false);
    });

    test("what is entered is sent trimmed with the payment", async () => {
        const dialog = await open("cash");
        fireEvent.change(inputOf(dialog, EN.key_receipt_no), { target: { value: "  R-00123 " } });
        fireEvent.change(inputOf(dialog, EN.key_received_by), { target: { value: " Ana Cruz  " } });
        fireEvent.click(within(dialog).getByText(EN.key_submit_payment));
        await waitFor(() => expect(mockDispatch.sent).toBeTruthy());
        expect(mockDispatch.sent).toMatchObject({ payment_method: "cash", receipt_number: "R-00123", received_by: "Ana Cruz" });
    });

    test("nothing entered: neither is sent", async () => {
        const dialog = await open("cash");
        fireEvent.change(inputOf(dialog, EN.key_received_by), { target: { value: "   " } });
        fireEvent.click(within(dialog).getByText(EN.key_submit_payment));
        await waitFor(() => expect(mockDispatch.sent).toBeTruthy());
        expect(mockDispatch.sent.payment_method).toBe("cash");
        expect("receipt_number" in mockDispatch.sent).toBe(false);
        expect("received_by" in mockDispatch.sent).toBe(false);
    });

    test("no other method shows them", async () => {
        const dialog = await open("fps");
        expect(within(dialog).queryByText(EN.key_receipt_no)).toBeNull();
        expect(within(dialog).queryByText(EN.key_received_by)).toBeNull();
    });
});
