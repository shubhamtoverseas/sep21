import React from "react";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/* Refund documentation chosen in the Refund modal ("Upload now"; Payment Method Rules v4 B-6, C-2; Step 8 F3): the file is
   checked with the Invoice API's own rule — PDF, JPG or PNG up to 5 MB, by content — before it is kept and uploaded
   (the rule comes from the contract's paymentCatalogue(), run through ts-node; without the contract checkout next to this
   repo, or CONTRACT_API_DIR, the suite is skipped). */

const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
const contractDir = process.env.CONTRACT_API_DIR || path.resolve(__dirname, "../../../../maidmatch-contract");
const hasContract = fs.existsSync(path.join(contractDir, "src/domain/invoice/paymentDocuments.ts"));
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
jest.mock("../../services/invoices", () => ({ getPaymentMethodCatalogueAPI: jest.fn() }));

const { addRefundInvoice } = require("../../redux/Slices/invoices/InvoicesSlice");
const { uploadFile } = require("../../services/commonService");
const { ShowToast } = require("../../components/show-toast/ShowToast");
const { getPaymentMethodCatalogueAPI } = require("../../services/invoices");
const RefundModal = require("../../components/Layout/popups/invoice-popups/RefundModal").default;

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];
const EXE = [0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00];
const MB5 = 5 * 1024 * 1024;
const fileOf = (bytes, name, size) => {
    const file = new File([new Uint8Array(bytes)], name);
    if (size !== undefined) Object.defineProperty(file, "size", { value: size });
    return file;
};

const INVOICE = {
    id: 7, invoice_number: "I-HKH000007", invoice_type: "general", final_amount: 900, refund_contract_prompt: false,
    subtotal_items: [{ id: 8, price_id: null, item_type: "Local", item_type_key: "base", item_description_during_subtotal_show: "Filipino" }],
    paymentModel: [{ payment_method: "credit_card", card_type: "visa" }],
    refundable: { amount: 900, paid: 900, refunded: 0, pending: false, fullRefundOnly: false,
        lines: [{ id: 8, type: "base", priceId: null, value: 900, refunded: 0, remaining: 900, full: 900 }] },
};
const next = () => fireEvent.click(screen.getByText(EN.key_next));
/* Refund Type (Full) → Review → Refund Method → Documentation */
const toDocumentation = () => {
    render(<RefundModal onClose={ jest.fn() } invoiceData={ INVOICE } />);
    fireEvent.click(screen.getByText(EN.key_full_refund));
    next(); next(); next();
    return document.querySelector('input[type="file"]');
};
/* the rule is loaded from the API once, then kept: each test waits for what the screen does with the file */
const choose = (input, file) => fireEvent.change(input, { target: { files: [file] } });

(hasContract ? describe : describe.skip)("refund documentation chosen at creation — the Invoice API's file rule", () => {
    const catalogue = hasContract ? apiCatalogue() : null;

    beforeEach(() => {
        getPaymentMethodCatalogueAPI.mockResolvedValue({ data: { data: catalogue } });
        mockDispatch.mockImplementation(() => Promise.resolve({ payload: { status: 200, message: "ok", data: { id: 99 } } }));
        addRefundInvoice.mockImplementation((payload) => ({ type: "invoices/addRefund", payload }));
        uploadFile.mockResolvedValue({ filename: "invoices/payment/cheque-copy.pdf" });
    });

    test("the picker offers PDF, JPG and PNG only", () => {
        expect(toDocumentation().getAttribute("accept")).toBe(".pdf,.jpg,.jpeg,.png");
    });

    test("a file over 5 MB or of another type (whatever its name) is refused and not kept", async () => {
        const input = toDocumentation();
        choose(input, fileOf(PDF, "cheque.pdf", MB5 + 1));
        await waitFor(() => expect(ShowToast).toHaveBeenCalledWith("error", EN.key_please_upload_smaller_file));
        choose(input, fileOf(EXE, "cheque.pdf"));
        await waitFor(() => expect(ShowToast).toHaveBeenCalledWith("error", EN.key_invalid_proof_file_type));
        expect(screen.queryByText("cheque.pdf")).toBeNull();
        expect(screen.getByText(EN.key_choose_file)).toBeTruthy();
    });

    test("a valid file is kept, uploaded on Confirm and sent with the refund", async () => {
        const input = toDocumentation();
        choose(input, fileOf(PDF, "cheque.pdf", MB5));
        await waitFor(() => expect(screen.getByText("cheque.pdf")).toBeTruthy());
        expect(ShowToast).not.toHaveBeenCalled();
        next();
        fireEvent.click(screen.getByText(new RegExp(`^${EN.key_confirm_refund}`)));
        await waitFor(() => expect(addRefundInvoice).toHaveBeenCalledTimes(1));
        expect(uploadFile).toHaveBeenCalledWith([{ file: expect.any(File), name: "invoices/payment" }]);
        expect(addRefundInvoice.mock.calls[0][0].payment_attachment).toBe("invoices/payment/cheque-copy.pdf");
    });
});
