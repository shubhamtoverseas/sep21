import React from "react";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/* Born status and post-submit timers (Payment Method Rules v4, 9 Oct 2026 — A "Born status" / "Timer", B-5, C-12;
   rulings 2026-10-12; conflicts sheet U-0233, 27 Oct: no 72-hour cheque proof timer): the screens show the deadline the
   Invoice API stored (what is due, by when), and Cash as "Pending Paid" (no "Unapproved"). The catalogue is the Invoice
   API's own payload (ts-node); without the
   contract checkout next to this repo (or CONTRACT_API_DIR) the suite is skipped. */

const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
const contractDir = process.env.CONTRACT_API_DIR || path.resolve(__dirname, "../../../../maidmatch-contract");
const hasContract = fs.existsSync(path.join(contractDir, "src/domain/invoice/paymentTimers.ts"));
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
/* the actor holds every key (admin): the PK-01 P1-19 key gates are tested in pk01InvoiceActionKeys */
jest.mock("react-redux", () => ({ useDispatch: () => jest.fn(() => Promise.resolve({})), useSelector: (select) => select({ users: { permissionList: { data: [] } } }) }));
jest.mock("../../redux/Slices/invoices/InvoicesSlice", () => ({
    uploadInvoicePaymentAttachment: jest.fn(), removeInvoicePaymentAttachment: jest.fn(),
}));
jest.mock("../../services/commonService", () => ({ uploadFile: jest.fn(), isAdminUser: () => true, getPermissionValue: () => "y" }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../components/ui/DateInput", () => () => null);
jest.mock("../../services/invoices", () => ({ getPaymentMethodCatalogueAPI: jest.fn() }));

const { getPaymentMethodCatalogueAPI } = require("../../services/invoices");
const PaymentDocumentCard = require("../../Views/Pages/Invoice/general/PaymentDocumentCard").default;
const { PaymentDeadlineCard, missingDocumentHintKey, usePaymentDocument } = require("../../Views/Pages/Invoice/general/PaymentDocumentCard");
const PaymentConfirmedModal = require("../../Views/Pages/Invoice/payment-method-selector/PaymentConfirmedModal").default;
const PaymentMethodSelector = require("../../Views/Pages/Invoice/payment-method-selector/PaymentMethodSelector").default;

const inDays = (d) => new Date(Date.now() + d * 86400000).toISOString();

(hasContract ? describe : describe.skip)("v4 timers on the invoice screens", () => {
    const catalogue = hasContract ? apiCatalogue() : null;
    beforeEach(() => {
        getPaymentMethodCatalogueAPI.mockResolvedValue({ data: { data: catalogue } });
    });

    test("the stored deadline: what is due and by when, per timer", () => {
        const { rerender, container } = render(<PaymentDeadlineCard deadline={ { kind: "deposit_receipt", due_at: inDays(2) } } />);
        expect(screen.getByText(EN.key_deposit_receipt_deadline)).toBeTruthy();
        expect(screen.getByText(EN.key_deposit_receipt_deadline_hint)).toBeTruthy();
        // U-0233: no proof deadline exists any more — a stored one shows nothing
        rerender(<PaymentDeadlineCard deadline={ { kind: "payment_proof", due_at: inDays(3) } } />);
        expect(container.querySelector(".deadline-side")).toBeNull();
        rerender(<PaymentDeadlineCard deadline={ { kind: "approval", due_at: inDays(-1) } } />);
        expect(screen.getByText(EN.key_management_approval_deadline)).toBeTruthy();
        expect(screen.getByText(EN.key_overdue)).toBeTruthy();
        expect(container.querySelector(".deadline-side.danger")).toBeTruthy();
        rerender(<PaymentDeadlineCard deadline={ null } />);
        expect(container.querySelector(".deadline-side")).toBeNull();
    });

    test("only Cash (48 h) can miss its document; the cheque 72 h copy and the old generic 48 h wording are gone (U-0233)", () => {
        expect(missingDocumentHintKey("cash")).toBe("key_upload_scanned_image_deposit_receipt");
        for (const m of ["cheque", "bank_transfer", "bank_in", "fps", "fps_direct", "payme", "visa"]) expect(missingDocumentHintKey(m)).toBe("");
        for (const key of ["key_payment_proof_deadline_48h", "key_upload_scanned_image_payme", "key_payment_proof_deadline_72h",
            "key_upload_scanned_image_cheque_72h", "key_payment_proof_deadline_hint", "key_payment_proof_deadline"]) {
            expect([key, EN[key]]).toEqual([key, undefined]);
        }
    });

    const Harness = ({ details }) => <PaymentDocumentCard doc={ usePaymentDocument({ invoiceDetails: details, invoiceId: "9", onChanged: () => {} }) } />;

    test("a Cheque recorded without proof (before U-0233) shows the missing proof and no 72 h rule", async () => {
        const { container } = render(<Harness details={ { status: 2, payment_method: "cheque", paymentModel: [{ payment_method: "cheque" }], latestPaymentAttachment: null } } />);
        await screen.findByText(EN.key_payment_proof_missing);
        expect(container.textContent).not.toMatch(/72/);
    });

    test("C-12: after recording, Cash reads Pending Paid; Bank Transfer / FPS / Cheque / PayMe read Pending Paid · Unapproved", async () => {
        const { rerender } = render(<PaymentConfirmedModal info={ { status: 2, paymentType: "full", methodValue: "cash", invoiceNumber: "I-1" } } typeLabel="Contract" onClose={ () => {} } onViewDetail={ () => {} } />);
        await screen.findByText(`${ EN.key_pending_paid } · Contract`, { exact: false });
        expect(screen.queryByText(EN.key_unapproved, { exact: false })).toBeNull();
        rerender(<PaymentConfirmedModal info={ { status: 2, paymentType: "full", methodValue: "fps", invoiceNumber: "I-2" } } typeLabel="Contract" onClose={ () => {} } onViewDetail={ () => {} } />);
        expect(screen.getByText(`${ EN.key_pending_paid } · ${ EN.key_unapproved } · Contract`)).toBeTruthy();
        rerender(<PaymentConfirmedModal info={ { status: 1, paymentType: "full", methodValue: "credit_card", invoiceNumber: "I-3" } } typeLabel="Contract" onClose={ () => {} } onViewDetail={ () => {} } />);
        expect(screen.getByText(EN.key_payment_confirmed)).toBeTruthy();
    });

    test("recording a Cheque: the proof is required before submit, with the 30-day approval note (U-0233)", async () => {
        const { container } = render(<PaymentMethodSelector submitAction={ jest.fn((p) => p) } invoiceData={ { payment_type: "full" } } />);
        await waitFor(() => expect(screen.getByLabelText(EN.key_payment_method).value).toBe("visa"));
        fireEvent.change(screen.getByLabelText(EN.key_payment_method), { target: { value: "cheque" } });
        const panel = within(container.querySelector(".pms-wrap"));
        expect(panel.getByText(EN.key_proof_required_before_recording_after_saving_invoice_is, { exact: false })).toBeTruthy();
        expect(container.querySelector(".pms-wrap").textContent).not.toMatch(/72/);
    });
});
