import React from "react";
import fs from "fs";
import path from "path";
import { render, fireEvent, waitFor } from "@testing-library/react";
import MarkStatusModal from "../../components/Layout/popups/invoice-popups/MarkStatusModal";
import RevertBackPopup from "../../components/Layout/popups/invoice-popups/RevertBackPopup";
import AdjustAmountPopup from "../../Views/Pages/Invoice/general/AdjustAmountPopup";
import ContractAdjustAmountPopup from "../../Views/Pages/Invoice/add-contract-invoice/AdjustAmountPopup";
import { MARK_STATUS_IDS } from "../../Views/Pages/Invoice/invoiceActionList";
import ProofPreviewModal from "../../Views/Pages/Invoice/general/ProofPreviewModal";
import ProofUploadModal from "../../Views/Pages/Invoice/general/ProofUploadModal";
import { DeleteProofImpact } from "../../Views/Pages/Invoice/general/PaymentDocumentCard";
import PrintoutPreviewModal from "../../Views/Pages/Invoice/general/PrintoutPreviewModal";

/* the translation util returns the key, as react-i18next's t does here */
jest.mock("../../utils/translation", () => {
    const t = (key) => key;
    return { __esModule: true, default: t, translation: t };
});
/* the file check loads the Invoice API's rule; here every picked file passes */
jest.mock("../../Views/Pages/Invoice/payment-method-selector/paymentMethodCatalogue", () => ({
    ...jest.requireActual("../../Views/Pages/Invoice/payment-method-selector/paymentMethodCatalogue"),
    checkPaymentDocumentFile: jest.fn(() => Promise.resolve("")),
}));

/* UI Step 6 — popups II (UI verification 14 Oct, rows F-01 … F-61): the financial action modals, the proof modals and the
   Customer Printout follow the prototype (Invoice_Detail.html: FinancialActionModal, RemarkModal, UploadProofModal,
   ViewProofModal, ReplaceProofModal, DeleteProofModal, PrintoutModal). UI only: each modal sends what it sent before. */

const SRC = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");
const EN = JSON.parse(fs.readFileSync(path.resolve(SRC, "../public/locales/en/translation.json"), "utf8"));

const INV = "Views/Pages/Invoice/";
const SCREENS = ["add-contract-invoice/PaymentTypeInvoice.js", "general/PaymentTypeInvoice.js", "add-contract-invoice/ExchangePaymentInvoice.js",
    "add-contract-invoice/exchangePaymentReview.js", "general/exchangePaymentReview.js", "add-contract-invoice/RefundInvoice.js", "general/RefundInvoice.js"]
    .map((f) => INV + f);
const confirmBtn = (container) => container.querySelector(".foot .btn-primary, .foot .btn-danger");

describe("UI Step 6 · financial action modals", () => {
    test("F-01: Adjust / Write-Off confirm only with a reason and an amount; the over-limit check stays on click", () => {
        const onUpdate = jest.fn();
        const { container, getByRole } = render(<AdjustAmountPopup onClose={ jest.fn() } handleUpdateInvoice={ onUpdate } isAdjustAmountActionType="adjust_amount" totalAmount={ 1000 } invoiceDetails={ { balance_due: 1000 } } />);
        const amount = container.querySelector("input[name=adjusted_amount]");
        expect(confirmBtn(container).disabled).toBe(true);
        fireEvent.change(amount, { target: { value: "-50" } });
        expect(confirmBtn(container).disabled).toBe(true);
        fireEvent.change(getByRole("textbox"), { target: { value: "goodwill" } });
        expect(confirmBtn(container).disabled).toBe(false);
        fireEvent.change(amount, { target: { value: "0" } });
        expect(confirmBtn(container).disabled).toBe(true);
        fireEvent.change(amount, { target: { value: "-5000" } });
        fireEvent.click(confirmBtn(container));
        expect(onUpdate).not.toHaveBeenCalled();
        expect(container.querySelector(".err").textContent).toBe("key_adjustment_amount_less_than_total");
        fireEvent.change(amount, { target: { value: "-50" } });
        fireEvent.click(confirmBtn(container));
        expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ adjustment_type: "minus", adjusted_amount: 50, reason: "goodwill" }));
        // Write-Off opens on the total: the reason alone enables Confirm
        const wo = render(<ContractAdjustAmountPopup onClose={ jest.fn() } handleUpdateInvoice={ jest.fn() } isAdjustAmountActionType="write_off" totalAmount={ 300 } invoiceDetails={ {} } />);
        expect(confirmBtn(wo.container).disabled).toBe(true);
        fireEvent.change(wo.container.querySelector("textarea"), { target: { value: "uncollectable" } });
        expect(confirmBtn(wo.container).disabled).toBe(false);
        expect(EN.key_adjustment_amount_is_required).toBeUndefined();
    });

    test("F-03: the Contract Adjust / Write-Off modal and the Revert chooser close on a veil click (not while saving)", () => {
        const onClose = jest.fn();
        const { container, rerender } = render(<ContractAdjustAmountPopup onClose={ onClose } handleUpdateInvoice={ jest.fn() } isAdjustAmountActionType="adjust_amount" totalAmount={ 100 } invoiceDetails={ {} } />);
        fireEvent.click(container.querySelector(".modal-card"));
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.click(container.querySelector(".modal-veil"));
        expect(onClose).toHaveBeenCalledTimes(1);
        rerender(<ContractAdjustAmountPopup onClose={ onClose } handleUpdateInvoice={ jest.fn() } isAdjustAmountActionType="adjust_amount" totalAmount={ 100 } invoiceDetails={ {} } isLoading />);
        fireEvent.click(container.querySelector(".modal-veil"));
        expect(onClose).toHaveBeenCalledTimes(1);
        const closeChooser = jest.fn();
        const chooser = render(<RevertBackPopup onClose={ closeChooser } handleConfirmAdjustType={ jest.fn() } revertBackTitle="Revert back to Paid" />);
        fireEvent.click(chooser.container.querySelector(".modal-veil"));
        expect(closeChooser).toHaveBeenCalledTimes(1);
    });

    test("F-08: the Amount label has no required mark", () => {
        for (const file of ["general/AdjustAmountPopup.js", "add-contract-invoice/AdjustAmountPopup.js"]) {
            const src = read(INV + file);
            expect([file, src.includes("<label className=\"rf-lbl\">{ t('key_amount') }</label>"), src.includes("rf-lbl required")]).toEqual([file, true, false]);
        }
    });

    test("F-09: Write-Off on a Bad Debt / Unsettled invoice shows the bucket it reduces (Bad Debt first, then Unsettled)", () => {
        const rows = (container) => [...container.querySelectorAll(".impact-tbl tbody tr")].map((tr) => [...tr.children].map((td) => td.textContent));
        const { container } = render(<AdjustAmountPopup onClose={ jest.fn() } handleUpdateInvoice={ jest.fn() } isAdjustAmountActionType="write_off" totalAmount={ 500 }
            invoiceDetails={ { status: 7, balance_due: 500, bad_debt_amount: 300, unsettled_amount: 200 } } />);
        expect(rows(container)).toEqual([
            ["key_balance_due", "HK$500", "→", "HK$0"],
            ["key_unsettled", "HK$200", "→", "HK$0"],
            ["key_bad_debt", "HK$300", "→", "HK$0"],
            ["key_adjustment", "HK$0", "→", "(HK$500)"],
        ]);
        // an Adjust never touches the buckets
        const adj = render(<AdjustAmountPopup onClose={ jest.fn() } handleUpdateInvoice={ jest.fn() } isAdjustAmountActionType="adjust_amount" totalAmount={ 500 }
            invoiceDetails={ { status: 7, balance_due: 500, bad_debt_amount: 300 } } />);
        fireEvent.change(adj.container.querySelector("input[name=adjusted_amount]"), { target: { value: "-100" } });
        expect(rows(adj.container).map((r) => r[0])).toEqual(["key_balance_due", "key_adjustment"]);
    });

    test("F-05: Mark Unsettled / Bad Debt show the reclassified amount, locked; Reject does not", () => {
        const amountOf = (props) => {
            const { container, unmount } = render(<MarkStatusModal onClose={ jest.fn() } onConfirm={ jest.fn() } { ...props } />);
            const box = container.querySelector(".amount-locked");
            const out = box ? [container.querySelector(".rf-field .rf-lbl").textContent, box.textContent, container.querySelectorAll("input").length] : null;
            unmount();
            return out;
        };
        expect(amountOf({ kind: "unsettled", invoiceDetails: { status: 1, paid_amount: 800 } })).toEqual(["key_amount", "HK$800", 0]);
        expect(amountOf({ kind: "bad_debt", invoiceDetails: { status: 5, paid_amount: 0, unsettled_amount: 650 } })).toEqual(["key_amount", "HK$650", 0]);
        expect(amountOf({ kind: "reject", invoiceDetails: { status: 2, paid_amount: 800 } })).toBeNull();
        expect(read(INV + "InvoiceDetail.css")).toContain(".invd .amount-locked { display: flex; align-items: center; gap: 7px; background: var(--bg-subtle); }");
    });

    test("F-12 … F-14, F-16, F-17: the Revert confirm — check on success, the API's title, the reference subtitle, locked amount, no question", () => {
        const onConfirm = jest.fn();
        const { container, getByRole } = render(<MarkStatusModal kind="revert" title="Revert back to Paid" invoiceDetails={ { status: 5, paid_amount: 0, unsettled_amount: 900 } } onClose={ jest.fn() } onConfirm={ onConfirm } />);
        expect(container.querySelector(".head .ico.success svg")).toBeTruthy();
        expect(container.querySelector(".head h2").textContent).toBe("Revert back to Paid");
        expect(container.querySelector(".head .msub").textContent).toBe("key_revert_subtitle");
        expect(EN.key_revert_subtitle).toBe("Revert this invoice out of Unsettled or Bad Debt classification once the situation is resolved.");
        expect(container.querySelector(".amount-locked").textContent).toBe("HK$900");
        expect(getByRole("textbox").getAttribute("placeholder")).toBe("key_recorded_in_payment_records");
        expect(container.querySelector("p")).toBeNull();
        // the API computes what the revert restores (Paid, previous status): no preview (F-15 open)
        expect(container.querySelector(".appr-impact")).toBeNull();
        const cta = confirmBtn(container);
        expect([cta.className, cta.querySelector("svg") !== null, cta.disabled]).toEqual(["btn md btn-primary", true, true]);
        fireEvent.change(getByRole("textbox"), { target: { value: "  paid in full " } });
        fireEvent.click(cta);
        expect(onConfirm).toHaveBeenCalledWith({ reason: "paid in full" });
    });

    test("Mark Unsettled, Mark Bad Debt and Revert open the financial action modal on every screen", () => {
        expect(MARK_STATUS_IDS).toEqual([5, 7, 12]);
        for (const file of SCREENS) {
            const src = read(file);
            expect([file, src.includes("isCommonStatusModel && MARK_STATUS_IDS.includes(actionStatus) && "), src.includes("!MARK_STATUS_IDS.includes(actionStatus) && "),
                src.includes("actionStatus === 12 ? 'revert' : actionStatus === 7 ? 'bad_debt' : "), /title=\{ actionModelData\?\.name \}/.test(src)])
                .toEqual([file, true, true, true, true]);
        }
    });

    test("F-18: the exchange warning reads HK$ and the reference without brackets; the unreachable English copy is gone", () => {
        const { container } = render(<MarkStatusModal kind="bad_debt" isDisabledWarning warnAmount={ 1200 } exchangeId="INV-9" invoiceDetails={ { status: 1, paid_amount: 1200 } } onClose={ jest.fn() } onConfirm={ jest.fn() } />);
        expect(container.querySelector(".void-warn-banner").textContent).toBe("Credit of HK$1,200 transferred to INV-9. Bad Debt does not reverse the exchange. Proceed?");
        const common = read("components/Layout/popups/invoice-popups/CommonStatusPopup.js");
        expect(common).not.toMatch(/HK\[\$|isDisabledWarning|exchangeId/);
        expect(read(INV + "add-contract-invoice/PaymentTypeInvoice.js")).not.toMatch(/<CommonStatusPopup[^\n]*isDisabledWarning/);
    });

    test("F-21: the Add Remark textarea is 4 rows at auto height with 10px padding", () => {
        for (const file of SCREENS) {
            const src = read(file);
            expect([file, /<textarea className="input" rows=\{ 4 \} style=\{ ?\{ height: 'auto', padding: 10, resize: 'vertical' \} ?\}/.test(src), src.includes("height: 110")]).toEqual([file, true, false]);
        }
    });
});

describe("UI Step 6 · proof modals", () => {
    const CARD = read(INV + "general/PaymentDocumentCard.js");

    test("F-30: View opens the Proof preview — eye icon, the reference title / subtitle, the file, its status while awaiting approval, Close", () => {
        const onClose = jest.fn();
        const open = jest.spyOn(window, "open").mockImplementation(() => null);
        const { unmount } = render(<ProofPreviewModal url="https://b.example/invoices/payment/slip.png" fileName="slip.png" awaitingApproval onClose={ onClose } />);
        const card = document.body.querySelector(".modal-card");
        expect(card.querySelector(".head h2").textContent).toBe("key_proof_preview");
        expect(card.querySelector(".head .msub").textContent).toBe("key_payment_proof_on_file");
        expect(card.querySelector(".proof-preview .area img").getAttribute("src")).toBe("https://b.example/invoices/payment/slip.png");
        expect(card.querySelector(".proof-preview .strip .nm").textContent).toBe("slip.png");
        expect(card.querySelector(".proof-preview-note").textContent).toBe("key_status: key_uploaded_awaiting_approval. key_approve_or_reject_proof_from key_approve_payment.");
        fireEvent.click(card.querySelector(".strip .link"));
        expect(open).toHaveBeenCalledWith("https://b.example/invoices/payment/slip.png", "_blank", "noopener");
        fireEvent.click(card.querySelector(".foot .btn-ghost"));
        expect(onClose).toHaveBeenCalledTimes(1);
        unmount();
        render(<ProofPreviewModal url="https://b.example/invoices/payment/receipt.pdf" fileName="receipt.pdf" isCash onClose={ jest.fn() } />);
        const pdf = document.body.querySelector(".modal-card");
        expect(pdf.querySelector(".head .msub").textContent).toBe("key_cash_deposit_receipt_on_file");
        expect([pdf.querySelector(".area img"), pdf.querySelector(".area .nm").textContent, pdf.querySelector(".proof-preview-note")]).toEqual([null, "receipt.pdf", null]);
        open.mockRestore();
        expect(CARD).toMatch(/view: \(\) => \{ if \(url\) setShowView\(true\); \},/);
        expect(CARD).toContain("<ProofPreviewModal url={ doc.proof.url } fileName={ doc.proof.fileName } isCash={ isCash } awaitingApproval={ doc.canManage } onClose={ doc.closeView } />");
        expect(CARD).not.toMatch(/viewFile/);
        expect([EN.key_proof_preview, EN.key_payment_proof_on_file, EN.key_cash_deposit_receipt_on_file, EN.key_approve_or_reject_proof_from])
            .toEqual(["Proof preview", "Payment proof on file.", "Cash deposit receipt on file.", "Approve or reject this proof from"]);
    });

    test("F-31, F-32: Replace has its own title, subtitle, hint, note and action; a picked file reads '<name> · ready' on a success border", async () => {
        const onUpload = jest.fn();
        render(<ProofUploadModal replace methodLabel="FPS" onClose={ jest.fn() } onUpload={ onUpload } />);
        const card = document.body.querySelector(".modal-card");
        expect(card.querySelector(".head h2").textContent).toBe("key_replace_payment_proof");
        expect(card.querySelector(".head .msub").textContent).toBe("key_replace_proof_subtitle");
        expect(card.querySelector(".upload-zone .hint").textContent).toBe("key_proof_replace_hint");
        expect(card.querySelector(".body > div:last-child").textContent).toBe("key_replace_proof_note_lead key_pending_paid_unapproved. key_replace_proof_note_tail");
        const cta = card.querySelector(".foot .btn-primary");
        expect([cta.textContent, cta.disabled]).toEqual(["key_replace_proof", true]);
        const file = new File(["%PDF-1.4"], "slip-v2.pdf", { type: "application/pdf" });
        fireEvent.change(card.querySelector("input[type=file]"), { target: { files: [file] } });
        await waitFor(() => expect(card.querySelector(".upload-zone .title").textContent).toBe("slip-v2.pdf · key_ready"));
        expect(read(INV + "general/ProofUploadModal.js")).toContain("style={ file ? { borderColor: 'var(--st-success-bd)' } : dragOver ? { borderColor: 'var(--accent)', background: 'var(--accent-bg)' } : undefined }");
        fireEvent.click(cta);
        expect(onUpload).toHaveBeenCalledWith(file);
        expect([EN.key_replace_payment_proof, EN.key_replace_proof_subtitle, EN.key_proof_replace_hint, EN.key_replace_proof_note_lead, EN.key_replace_proof_note_tail]).toEqual([
            "Replace payment proof", "Upload a new file to replace the current proof.", "PDF, JPG, PNG · max 5 MB.", "Replacing proof keeps this invoice",
            "The replacement will be reviewed by an approver. A Proof replaced event is written to Payment Records.",
        ]);
        // the card's and the action panels' Replace open this mode
        expect(CARD).toContain("onClick={ doc.openReplace }><Icon name=\"upload\" size={ 12 } />{ t('key_replace') }</button>");
        expect(CARD).toContain("replace={ doc.replacing }");
        for (const file of ["add-contract-invoice/PaymentTypeInvoice.js", "general/PaymentTypeInvoice.js", "add-contract-invoice/ExchangePaymentInvoice.js"]) {
            expect([file, /onClick=\{ doc\.openReplace \}>\s+<Icon name="upload" size=\{14\} className="ico" \/><span className="label">\{ t\('key_replace_proof'\) \}/.test(read(INV + file))]).toEqual([file, true]);
        }
    });

    test("F-28: the Cash upload note shows '48 hours' in text-1 and 'Unsettled' in red; a first upload keeps its own copy", () => {
        render(<ProofUploadModal isCash onClose={ jest.fn() } onUpload={ jest.fn() } />);
        const card = document.body.querySelector(".modal-card");
        expect(card.querySelector(".head h2").textContent).toBe("key_upload_deposit_receipt");
        expect([...card.querySelectorAll(".body strong")].map((s) => s.textContent)).toEqual(["key_48_hours", "key_unsettled"]);
        expect(read(INV + "general/ProofUploadModal.js")).toContain("<strong style={ { color: 'var(--text-1)' } }>{ t('key_48_hours') }</strong> { t('key_cash_note_auto_unsettled') } <strong style={ { color: 'var(--st-danger)' } }>{ t('key_unsettled') }</strong>");
        expect(card.querySelector(".upload-zone .hint").textContent).toBe("key_proof_upload_hint");
    });

    test("F-33, F-34: Delete shows its warning in the danger box, then Status → Unsettled and Paid moving to Unsettled", () => {
        const { container } = render(<DeleteProofImpact warning="Deleting this proof…" figures={ { paid: 1500, balanceDue: 500, unsettled: 0 } } />);
        expect(container.querySelector(".proof-delete-warn").textContent).toBe("Deleting this proof…");
        const rows = [...container.querySelectorAll(".impact-tbl tbody tr")].map((tr) => [...tr.children].map((td) => td.textContent));
        expect(rows.map((r) => r[0])).toEqual(["key_status", "key_paid", "key_balance_due", "key_unsettled"]);
        expect(rows.slice(1)).toEqual([
            ["key_paid", "HK$1,500", "→", "HK$0"],
            ["key_balance_due", "HK$500", "→", "HK$2,000"],
            ["key_unsettled", "HK$0", "→", "HK$1,500"],
        ]);
        expect(container.querySelector(".appr-impact p.note").textContent).toBe("key_balance_due_footnote");
        expect(CARD).toContain("message={ <DeleteProofImpact warning={ isCash ? t('key_delete_deposit_receipt_warning') : t('key_delete_proof_warning') } figures={ doc.figures } /> }");
        expect(read(INV + "InvoiceDetail.css")).toContain(".invd .proof-delete-warn { padding: 12px; background: var(--st-danger-bg); border: 1px solid var(--st-danger-bd); border-radius: 8px; font-size: 12.5px; color: var(--text-1); line-height: 1.6; margin-bottom: 14px; }");
    });
});

describe("UI Step 6 · Customer Printout and Change Invoice CS", () => {
    const PRINTOUT = read(INV + "general/PrintoutPreviewModal.js");
    /* an A2 Exchange Settlement invoice: HK$1,000 credit from A1 */
    const A2 = { invoice_number: "INV-A2", status: 11, invoice_type: "exchange", final_amount: 1500, parentInvoice: { invoice_number: "INV-A1", final_amount: 1000 },
        childInvoices: [{ invoice_type: "underpayment", invoice_number: "INV-U1" }], contractInvoiceItemSelectModel: [] };
    const panes = () => [...document.body.querySelectorAll(".printout-doc")];
    const cells = (pane) => [...pane.querySelectorAll(".doc-items tbody td:first-child")].map((td) => td.textContent);

    test("F-41, F-42, F-45: an additional payment names its Underpayment Invoice; Remaining Credit / Outcome only without one", () => {
        const { unmount } = render(<PrintoutPreviewModal invoiceDetails={ A2 } totalAmount={ 1500 } onClose={ jest.fn() } onDownloadPDF={ jest.fn() } onPrint={ jest.fn() } />);
        for (const pane of panes()) {
            expect(cells(pane)).toEqual(["Replacement Service Value", "Credit from Original Invoice INV-A1", "Additional Payment",
                "Collected via Underpayment Invoice INV-U1", "Net Amount Due", "Balance Due"]);
        }
        expect(panes()[1].textContent).toContain("Additional payment HK$500 collected via Underpayment Invoice INV-U1.");
        unmount();
        render(<PrintoutPreviewModal invoiceDetails={ { ...A2, final_amount: 800, childInvoices: [] } } totalAmount={ 800 } onClose={ jest.fn() } onDownloadPDF={ jest.fn() } onPrint={ jest.fn() } />);
        expect(cells(panes()[0])).toEqual(["Replacement Service Value", "Credit from Original Invoice INV-A1", "Net Amount Due", "Remaining Credit",
            /* QA-27-042: the Outcome names the disposition (no write-off record, no refund child: Saved as Credit) */
            "Outcome · key_remaining_credit · key_outcome_saved_as_credit", "Balance Due"]);
    });

    test("F-43: the customer pane's credit label is in the body colour (the admin pane keeps text-3)", () => {
        expect(PRINTOUT).toContain("<td style={ customer ? undefined : { color: 'var(--text-3)' } }>Credit from Original Invoice { parentRef }</td>");
        expect(PRINTOUT).toContain("{ xs ? exchangeRows(false) : (");
        expect(PRINTOUT).toContain("{ xs ? exchangeRows(true) : saved ? (");
    });

    test("F-40: the admin pane names the payment review state; F-39: pane labels at 600", () => {
        const sub = (status) => {
            const { unmount } = render(<PrintoutPreviewModal invoiceDetails={ { invoice_number: "INV-1", status, final_amount: 100, contractInvoiceItemSelectModel: [] } } totalAmount={ 100 } onClose={ jest.fn() } onDownloadPDF={ jest.fn() } onPrint={ jest.fn() } />);
            const text = panes()[0].querySelector(".doc-sub").textContent;
            unmount();
            return text;
        };
        expect(sub(2).endsWith(" · key_payment_review_pending")).toBe(true);
        expect(sub(1).endsWith(" · key_payment_confirmed")).toBe(true);
        expect(sub(5)).not.toMatch(/key_payment_/);
        expect(EN.key_payment_review_pending).toBe("Payment pending review");
        expect(read(INV + "InvoiceDetail.css")).toMatch(/\.invd \.printout-pane-label \{[^}]*font-weight: 600;/);
    });

    test("F-03, F-60: Change Invoice CS closes on a veil click and names the current owner the Current CS", () => {
        const src = read("components/Layout/popups/change-owner/ChangeCsInvoiceInsurancePopup.js");
        expect(src).toContain("<div className=\"invd modal-veil\" role=\"dialog\" aria-modal=\"true\" onClick={ (e) => e.target === e.currentTarget && props.onClose() }>");
        expect(src).toContain("<span>{ translation('key_current_cs') }: <b>{ props?.entity.staff_name || '' }</b></span>");
        expect([EN.key_current_cs, EN.key_current_interpreter]).toEqual(["Current CS", undefined]);
    });
});
