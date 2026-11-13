import React from "react";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/* Proof and deposit receipt (Payment Method Rules v4, 9 Oct 2026 — A "Proof at record", B-6, B-7, C-2, C-6; rulings
   2026-10-12). The rules come from the Invoice API's own payload (maidmatch-contract paymentCatalogue(), run through
   ts-node); without the contract checkout next to this repo (or CONTRACT_API_DIR) the suite is skipped. */

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
/* the actor holds every key (admin): the document rules are tested here, the PK-01 P1-19 key gates in pk01InvoiceActionKeys */
jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch, useSelector: (select) => select({ users: { permissionList: { data: [] } } }) }));
jest.mock("../../redux/Slices/invoices/InvoicesSlice", () => ({
    uploadInvoicePaymentAttachment: (payload) => ({ type: "upload", payload }),
    removeInvoicePaymentAttachment: (payload) => ({ type: "remove", payload }),
}));
jest.mock("../../services/commonService", () => ({ uploadFile: jest.fn(), isAdminUser: () => true, getPermissionValue: () => "y" }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../components/ui/DateInput", () => () => null);
jest.mock("../../services/invoices", () => ({ getPaymentMethodCatalogueAPI: jest.fn() }));

const { getPaymentMethodCatalogueAPI } = require("../../services/invoices");
const { uploadFile } = require("../../services/commonService");
const { PROOF_FILE_ACCEPT, checkProofFile, paymentDocumentKind } = require("../../Views/Pages/Invoice/payment-method-selector/paymentMethodCatalogue");
const PaymentDocumentCard = require("../../Views/Pages/Invoice/general/PaymentDocumentCard").default;
const { usePaymentDocument } = require("../../Views/Pages/Invoice/general/PaymentDocumentCard");
const PaymentMethodSelector = require("../../Views/Pages/Invoice/payment-method-selector/PaymentMethodSelector").default;

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const EXE = [0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00];
const fileOf = (bytes, name, size) => {
    const file = new File([new Uint8Array(bytes)], name);
    if (size !== undefined) Object.defineProperty(file, "size", { value: size });
    return file;
};

(hasContract ? describe : describe.skip)("proof and deposit receipt — same rule as the Invoice API", () => {
    const catalogue = hasContract ? apiCatalogue() : null;
    const API_EN = hasContract ? JSON.parse(fs.readFileSync(path.join(contractDir, "src/locales/en.json"), "utf8")) : {};
    const MB5 = 5 * 1024 * 1024;

    beforeEach(() => {
        getPaymentMethodCatalogueAPI.mockResolvedValue({ data: { data: catalogue } });
        mockDispatch.mockImplementation((action) => Promise.resolve({ meta: { requestStatus: "fulfilled" }, payload: { status: true, message: "done" }, action }));
    });

    test("C-2: PDF, JPG, PNG only, max 5 MB, checked by content; the API says the same", async () => {
        expect(catalogue.proofFile).toEqual({ maxBytes: MB5, types: ["application/pdf", "image/jpeg", "image/png"] });
        expect(PROOF_FILE_ACCEPT).toBe(".pdf,.jpg,.jpeg,.png");
        expect(await checkProofFile(fileOf(PDF, "proof.pdf", MB5), catalogue.proofFile)).toBe("");
        expect(await checkProofFile(fileOf(PDF, "proof.pdf", MB5 + 1), catalogue.proofFile)).toBe(EN.key_please_upload_smaller_file);
        expect(await checkProofFile(fileOf(PNG, "renamed.pdf"), catalogue.proofFile)).toBe("");
        expect(await checkProofFile(fileOf(EXE, "photo.png"), catalogue.proofFile)).toBe(EN.key_invalid_proof_file_type);
        expect(EN.key_please_upload_smaller_file).toBe(API_EN.PAYMENT_FILE_TOO_LARGE);
        expect(EN.key_invalid_proof_file_type).toBe(API_EN.PAYMENT_FILE_TYPE_INVALID);
        expect(EN.key_proof_of_payment_is_required).toBe(API_EN.PAYMENT_PROOF_REQUIRED);
    });

    test("B-7: Cash takes a deposit receipt, the proof methods a payment proof, cards and wallets nothing", () => {
        const kinds = Object.fromEntries(["bank_transfer", "bank_in", "fps", "fps_direct", "cheque", "payme", "cash", "visa", "credit_card", "alipay_hk"]
            .map((m) => [m, paymentDocumentKind(catalogue, m)]));
        expect(kinds).toEqual({
            bank_transfer: "payment_proof", bank_in: "payment_proof", fps: "payment_proof", fps_direct: "payment_proof",
            cheque: "payment_proof", payme: "payment_proof", cash: "deposit_receipt", visa: null, credit_card: null, alipay_hk: null,
        });
    });

    const onChanged = jest.fn();
    const Harness = ({ details }) => {
        const doc = usePaymentDocument({ invoiceDetails: details, invoiceId: "7", onChanged });
        return <PaymentDocumentCard doc={ doc } methodLabel="FPS" />;
    };
    const fps = (extra = {}) => ({
        status: 2, payment_method: "fps", paymentModel: [{ payment_method: "fps" }],
        latestPaymentAttachment: "https://bucket.example/invoices/payment/a1.pdf", latestPaymentDocument: { state: "uploaded" }, ...extra,
    });

    test("Pending Paid: View, Replace and Delete; Delete asks for a reason and sends it (B-6)", async () => {
        render(<Harness details={ fps() } />);
        await screen.findByText(EN.key_view);
        expect(screen.getByText(EN.key_replace)).toBeTruthy();
        expect(screen.getByText("a1.pdf")).toBeTruthy();
        fireEvent.click(screen.getByText(EN.key_delete));
        const dialog = await screen.findByRole("dialog");
        expect(within(dialog).getByText(EN.key_delete_proof_warning)).toBeTruthy();
        const confirm = within(dialog).getByText(EN.key_delete_proof_confirm).closest("button");
        expect(confirm.disabled).toBe(true);
        fireEvent.change(within(dialog).getByLabelText(EN.key_reason_required), { target: { value: "wrong file" } });
        expect(confirm.disabled).toBe(false);
        fireEvent.click(confirm);
        await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({ type: "remove", payload: { invoice_id: 7, reason: "wrong file" } }));
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
    });

    test("after approval (Paid) the proof can only be viewed", async () => {
        render(<Harness details={ fps({ status: 1 }) } />);
        await screen.findByText(EN.key_view);
        expect(screen.queryByText(EN.key_replace)).toBeNull();
        expect(screen.queryByText(EN.key_delete)).toBeNull();
    });

    test("a proof rejected with the payment shows Rejected and its reason, without controls", async () => {
        render(<Harness details={ fps({ status: 5, latestPaymentDocument: { state: "rejected", reason: "Amount does not match" } }) } />);
        await screen.findByText(EN.key_rejected);
        expect(screen.getByText("Amount does not match")).toBeTruthy();
        expect(screen.queryByText(EN.key_replace)).toBeNull();
        expect(screen.queryByText(EN.key_delete)).toBeNull();
    });

    test("Cash without a receipt asks for the deposit receipt; uploads a checked file", async () => {
        uploadFile.mockResolvedValue({ filename: "invoices/payment/r.png" });
        const { container } = render(<Harness details={ { status: 2, payment_method: "cash", paymentModel: [{ payment_method: "cash" }], latestPaymentAttachment: null } } />);
        await screen.findByText(EN.key_deposit_receipt_missing);
        fireEvent.click(screen.getByText(EN.key_upload_deposit_receipt));
        const dialog = await screen.findByRole("dialog");
        const input = dialog.querySelector('input[type="file"]');
        expect(input.getAttribute("accept")).toBe(".pdf,.jpg,.jpeg,.png");
        fireEvent.change(input, { target: { files: [fileOf(EXE, "receipt.png")] } });
        await within(dialog).findByText(EN.key_invalid_proof_file_type);
        fireEvent.change(input, { target: { files: [fileOf(PNG, "receipt.png")] } });
        await waitFor(() => expect(within(dialog).queryByText(EN.key_invalid_proof_file_type)).toBeNull());
        fireEvent.click(within(dialog).getAllByText(EN.key_upload_deposit_receipt).pop().closest("button"));
        await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({ type: "upload", payload: { contract_invoices_id: "7", payment_attachment: "invoices/payment/r.png" } }));
        expect(container).toBeTruthy();
    });

    test("card and wallet payments have no document card", async () => {
        const { container } = render(<Harness details={ { status: 1, payment_method: "credit_card", paymentModel: [{ payment_method: "credit_card" }] } } />);
        await waitFor(() => expect(getPaymentMethodCatalogueAPI).toBeDefined());
        expect(container.querySelector(".context-side")).toBeNull();
    });

    /* the payment panel with the method picked in its Payment Method list */
    const openMethod = async (code) => {
        const { container } = render(<PaymentMethodSelector submitAction={ jest.fn((p) => p) } invoiceData={ { payment_type: "full" } } />);
        await waitFor(() => expect(screen.getByLabelText(EN.key_payment_method).value).toBe("visa"));
        fireEvent.change(screen.getByLabelText(EN.key_payment_method), { target: { value: code } });
        return container.querySelector(".pms-wrap");
    };

    test("at record: Cheque needs its proof (U-0233) — Submit disabled without it, enabled with it", async () => {
        const dialog = await openMethod("cheque");
        fireEvent.change(within(dialog).getByPlaceholderText("Cheque number"), { target: { value: "12345678" } });
        fireEvent.change(within(dialog).getAllByPlaceholderText("HSBC, Standard Chartered, Hang Seng…")[0], { target: { value: "HSBC" } });
        const submit = within(dialog).getByText(EN.key_submit_payment).closest("button");
        expect(submit.disabled).toBe(true);
        fireEvent.change(dialog.querySelector('input[type="file"]'), { target: { files: [fileOf(PDF, "cheque.pdf", 1024)] } });
        await waitFor(() => expect(submit.disabled).toBe(false));
    });

    test("at record: FPS needs its proof; a file over 5 MB is refused and Submit stays disabled", async () => {
        const dialog = await openMethod("fps");
        fireEvent.change(within(dialog).getByPlaceholderText(EN.key_fps_reference), { target: { value: "F123" } });
        const submit = within(dialog).getByText(EN.key_submit_payment).closest("button");
        expect(submit.disabled).toBe(true);
        const input = dialog.querySelector('input[type="file"]');
        fireEvent.change(input, { target: { files: [fileOf(PDF, "big.pdf", MB5 + 1)] } });
        await within(dialog).findByText(EN.key_please_upload_smaller_file);
        expect(submit.disabled).toBe(true);
        fireEvent.change(input, { target: { files: [fileOf(PDF, "slip.pdf", 1024)] } });
        await waitFor(() => expect(submit.disabled).toBe(false));
        expect(within(dialog).getByText("slip.pdf")).toBeTruthy();
    });
});
