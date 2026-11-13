import React from "react";
import fs from "fs";
import path from "path";
import { render, fireEvent } from "@testing-library/react";
import MarkStatusModal from "../../components/Layout/popups/invoice-popups/MarkStatusModal";
import ApprovePaymentModal from "../../components/Layout/popups/invoice-popups/ApprovePaymentModal";
import CommonStatusPopup from "../../components/Layout/popups/invoice-popups/CommonStatusPopup";
import InitiateExchangePopup from "../../components/Layout/popups/invoice-popups/InitiateExchangePopup";
import { APPROVAL_STATUS_IDS } from "../../Views/Pages/Invoice/invoiceActionList";

/* UI Step 5 — popups I (UI verification 14 Oct, rows E-01 … E-64): the action modals, Refund, Exchange, Void and Pay
   Remaining Balance follow the prototype (Invoice_Detail.html: ModalShell, ApproveModal, RefundModal, ExchangeModal,
   VoidModal, RecordPaymentModal). UI only: each modal sends what it sent before. */

const SRC = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");
const DETAIL = read("Views/Pages/Invoice/InvoiceDetail.css");
const EN = JSON.parse(fs.readFileSync(path.resolve(SRC, "../public/locales/en/translation.json"), "utf8"));

const CONTRACT = "Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js";
const STANDALONE = "Views/Pages/Invoice/general/PaymentTypeInvoice.js";
const EXCHANGED = "Views/Pages/Invoice/add-contract-invoice/ExchangePaymentInvoice.js";
const REVIEWS = ["Views/Pages/Invoice/add-contract-invoice/exchangePaymentReview.js", "Views/Pages/Invoice/general/exchangePaymentReview.js"];
const REFUNDS = ["Views/Pages/Invoice/add-contract-invoice/RefundInvoice.js", "Views/Pages/Invoice/general/RefundInvoice.js"];
const PENDING_PAID = { status: 2, paid_amount: 5000, remaining_balance: 0, unsettled_amount: 0 };
const PROOF = { url: "https://bucket.example/invoices/payment/p.pdf", fileName: "p.pdf" };

describe("UI Step 5 · action modals", () => {
    test("E-01: a click on the veil closes the modal, a click in the card does not, nor while it is busy", () => {
        const onClose = jest.fn();
        const { container, rerender } = render(<ApprovePaymentModal onClose={ onClose } onConfirm={ jest.fn() } invoiceRef="I-1" statusLabel="Pending Paid" />);
        fireEvent.click(container.querySelector(".modal-card"));
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.click(container.querySelector(".modal-veil"));
        expect(onClose).toHaveBeenCalledTimes(1);
        rerender(<ApprovePaymentModal onClose={ onClose } onConfirm={ jest.fn() } loading invoiceRef="I-1" statusLabel="Pending Paid" />);
        fireEvent.click(container.querySelector(".modal-veil"));
        expect(onClose).toHaveBeenCalledTimes(1);
        const cancel = jest.fn();
        const common = render(<CommonStatusPopup cancelStatusDialog={ cancel } confirmStatusContract={ jest.fn() } title="Void" message="m" />);
        fireEvent.click(common.container.querySelector(".modal-veil"));
        expect(cancel).toHaveBeenCalledTimes(1);
        for (const file of ["MarkStatusModal.js", "InitiateExchangePopup.js", "VoidWorkerCancellationPopup.js", "RefundModal.js", "ActionStatusPopup.js", "CommonStatusPopup.js", "ApprovePaymentModal.js"]) {
            const src = read(`components/Layout/popups/invoice-popups/${ file }`);
            expect([file, (src.match(/className="invd modal-veil" role="dialog" aria-modal="true" onClick=\{ \(e\) => e\.target === e\.currentTarget && /g) || []).length])
                .toEqual([file, (src.match(/className="invd modal-veil"/g) || []).length]);
        }
    });

    test("E-04 … E-07: Reject / Mark Unsettled on Pending Paid — x icon, reference copy, the proof, Status / Payment review rows first", () => {
        const { container, getByText, getByRole } = render(<MarkStatusModal kind="reject" invoiceDetails={ PENDING_PAID } proof={ PROOF } statusLabel="Pending Paid" onClose={ jest.fn() } onConfirm={ jest.fn() } />);
        expect(container.querySelector(".head h2").textContent).toBe("key_reject_mark_unsettled");
        expect(container.querySelector(".head .msub").textContent).toBe("key_reject_mark_unsettled_subtitle");
        expect(getByText("p.pdf")).toBeTruthy();
        expect(getByText("key_uploaded_payment_proof")).toBeTruthy();
        const textarea = getByRole("textbox");
        expect([textarea.getAttribute("rows"), textarea.getAttribute("placeholder")]).toEqual(["3", "key_reject_reason_placeholder"]);
        const firstCells = [...container.querySelectorAll(".impact-tbl tbody tr")].map((tr) => tr.firstChild.textContent);
        expect(firstCells.slice(0, 2)).toEqual(["key_status", "key_payment_review"]);
        expect(firstCells).toContain("key_unsettled");
        const cta = container.querySelector(".foot .btn-danger");
        expect(cta.textContent).toBe("key_reject_and_mark_unsettled");
        expect([EN.key_reject_mark_unsettled_subtitle, EN.key_reject_and_mark_unsettled, EN.key_reject_reason_placeholder]).toEqual([
            "The recorded payment cannot be verified. The amount will move from Paid to Unsettled. Audit trail is kept.",
            "Reject and Mark Unsettled", "Proof did not match the recorded payment / could not verify...",
        ]);
    });

    test("the other Mark Unsettled / Bad Debt modals are unchanged (no proof, no state rows, Confirm)", () => {
        const { container } = render(<MarkStatusModal kind="unsettled" invoiceDetails={ { ...PENDING_PAID, status: 1 } } proof={ PROOF } statusLabel="Paid" onClose={ jest.fn() } onConfirm={ jest.fn() } />);
        expect(container.querySelector(".proof-pill")).toBeNull();
        expect(container.querySelector(".impact-tbl tbody tr").firstChild.textContent).toBe("key_paid");
        expect(container.querySelector(".foot .btn-danger").textContent).toBe("key_confirm");
    });

    test("E-08, E-09: Approve Payment, Approve Refund and Approve Exchange confirm in the Approve modal on every screen; on the contract A2 Approve Exchange has its own confirmation (OP-27-130)", () => {
        expect(APPROVAL_STATUS_IDS).toEqual([1, 9, 11]);
        // OP-27-130 (owner 3 Nov 2026): on the contract A2 (Exchange Unapproved) Approve Exchange confirms the status change only
        const A2_REVIEW = "Views/Pages/Invoice/add-contract-invoice/exchangePaymentReview.js";
        expect(read(A2_REVIEW)).toContain("isCommonStatusModel && actionStatus === 11 && <Suspense fallback={ null }><ConfirmActionModal ");
        for (const file of [CONTRACT, STANDALONE, EXCHANGED, ...REVIEWS]) {
            const src = read(file);
            const approve = file === A2_REVIEW ? "isCommonStatusModel && APPROVAL_STATUS_IDS.includes(actionStatus) && actionStatus !== 11 && <Suspense fallback={ null }><ApprovePaymentModal "
                : "isCommonStatusModel && APPROVAL_STATUS_IDS.includes(actionStatus) && <Suspense fallback={ null }><ApprovePaymentModal ";
            expect([file, src.includes(approve),
                src.includes("isCommonStatusModel && !APPROVAL_STATUS_IDS.includes(actionStatus) && !MARK_STATUS_IDS.includes(actionStatus) && ")]).toEqual([file, true, true]);
            expect([file, /afterStatusLabel=\{ actionStatus === 1 \? undefined : configData\.invoiceStatusIdMapping\[actionStatus\]\?\.label \}/.test(src)]).toEqual([file, true]);
        }
        for (const file of [CONTRACT, STANDALONE, EXCHANGED]) {
            expect([file, read(file).includes("<MarkStatusModal kind={ actionStatus === 12 ? 'revert' : actionStatus === 7 ? 'bad_debt' : (invoiceDetails?.status === 2 ? 'reject' : 'unsettled') } title={ actionModelData?.name } proof={ doc.proof } statusLabel={ statusLabel } ")]).toEqual([file, true]);
        }
        for (const file of REFUNDS) expect([file, read(file).includes("afterStatusLabel={ configData.invoiceStatusIdMapping[9]?.label }")]).toEqual([file, true]);
    });

    test("E-12: the Approve impact preview reads the status after approval and ends with the Balance Due footnote", () => {
        const { container } = render(<ApprovePaymentModal title="Approve Exchange" afterStatusLabel="Exchanged" onClose={ jest.fn() } onConfirm={ jest.fn() } invoiceRef="I-1" statusLabel="Exchange / Unapproved" />);
        expect(container.querySelector(".impact-tbl tbody tr td.a").textContent).toBe("Exchanged");
        expect(container.querySelector(".appr-impact p.note").textContent).toBe("key_balance_due_footnote");
        const plain = render(<ApprovePaymentModal onClose={ jest.fn() } onConfirm={ jest.fn() } invoiceRef="I-2" statusLabel="Pending Paid" />);
        expect(plain.container.querySelector(".impact-tbl tbody tr td.a").textContent).toBe("key_paid");
    });

    test("E-03: the modal subtitle is 12px text-3 with no top margin or own line-height", () => {
        expect(DETAIL).toMatch(/\.invd \.modal-card \.head \.msub \{\s+font-size: 12px;\s+color: var\(--text-3\);\s+\}/);
    });
});

describe("UI Step 5 · Refund, Initiate Exchange and Void", () => {
    const REFUND_MODAL = read("components/Layout/popups/invoice-popups/RefundModal.js");

    test("E-13, E-16, E-17, E-29, E-32: stepper 'Refund Type', 28px choices, 'Remarks', a warning 'Upload later', 'Uploaded' in the summary", () => {
        expect(REFUND_MODAL).toContain("{ id: 'type', label: headingCase(t('key_refund_type')) },");
        expect(EN.key_refund_type).toBe("REFUND TYPE");
        expect(REFUND_MODAL).not.toMatch(/'btn md ' \+/);
        expect(REFUND_MODAL).toContain("<Field label={ t('key_remarks') }>");
        expect(REFUND_MODAL).toContain("className={ 'btn btn-secondary' + (docState === 'missing' ? ' rf-later-on' : '') }");
        expect(REFUND_MODAL).toContain("docState === 'uploaded' && docFile ? t('key_uploaded') : t('key_due_within_48h')");
        expect(DETAIL).toMatch(/\.invd \.rf-later-on \{ border-color: var\(--st-warning-bd\); color: var\(--st-warning\); \}/);
    });

    test("E-18, E-19, E-23, E-24, E-33: the wizard's notes and the Full / Partial row take the reference sizes", () => {
        expect(REFUND_MODAL).toContain("className=\"rf-span2 rf-note warn small\"");
        expect(REFUND_MODAL).toContain("className=\"rf-note retained\"");
        expect(REFUND_MODAL).toContain("className=\"rf-note danger callout\"");
        expect(REFUND_MODAL).toContain("className=\"rf-note confirm-note\"");
        for (const rule of [
            ".invd .rf-note.small { font-size: 11.5px; }",
            ".invd .rf-note.retained { padding: 10px 12px; color: var(--text-2); }",
            ".invd .rf-note.callout { padding: 10px 12px; border-radius: 7px; font-size: 12.5px; }",
            ".invd .rf-note.confirm-note { padding: 12px; color: var(--text-2); line-height: 1.55; margin-bottom: 14px; }",
            ".invd .refund-type-row { display: flex; gap: 10px; }",
        ]) expect([rule, DETAIL.includes(rule)]).toEqual([rule, true]);
        // one rule for the row (the review sheet's duplicate is gone)
        expect(read("Views/Pages/Invoice/new-ui-review.css")).not.toMatch(/\.refund-type-row/);
    });

    test("E-34, E-35, E-36: the A1 card — keys 12px text-3, values 500, Employer / Current Worker in the sans font", () => {
        const { container } = render(<InitiateExchangePopup onClose={ jest.fn() } onSelectWorker={ jest.fn() } invoiceData={ { invoice_number: "I-C1", employer_name: "Chan", worker_name: "Siti", paid_amount: 100 } } />);
        const values = [...container.querySelectorAll(".src-row .v")].map((v) => v.className);
        expect(values.slice(0, 3)).toEqual(["v mono", "v", "v"]);
        expect(values.slice(3).every((c) => c.startsWith("v mono"))).toBe(true);
        expect(DETAIL).toContain(".invd .exch-src .src-row .k { font-size: 12px; color: var(--text-3); }");
        expect(DETAIL).toContain(".invd .exch-src .src-row .v { color: var(--text-1); font-weight: 500; text-align: right; }");
        expect(DETAIL).toContain(".invd .exch-src .src-row .v.success { color: var(--st-success); font-weight: 600; }");
    });

    test("E-42: the Void impact text is a 12.5px line (not a paragraph) under a 6px header gap", () => {
        const src = read("components/Layout/popups/invoice-popups/VoidWorkerCancellationPopup.js");
        expect(src).toContain("<div className=\"appr-impact void-impact mt14\">");
        expect(src).toContain("<div className=\"void-impact-note\">");
        expect(src).not.toContain("void-impact-note\">\n");
        expect(DETAIL).toContain(".invd .appr-impact.void-impact .hd { margin-bottom: 6px; }");
        expect(DETAIL).toContain(".invd .void-impact-note { font-size: 12.5px; color: var(--text-2); }");
    });
});

describe("UI Step 5 · Pay Remaining Balance", () => {
    const PMS = "Views/Pages/Invoice/payment-method-selector/";
    const SELECTOR_CSS = read(PMS + "paymentMethodSelector.css");
    const MODULE_CSS = read(PMS + "PaymentMethodSelector.module.css");
    const FIELDS = read(PMS + "PaymentFields.js");

    test("E-43, E-63: the method fields sit in a 1fr 1fr grid (14px gap); 12px under each field", () => {
        expect(SELECTOR_CSS).toContain(".invd .pe-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }");
        expect(SELECTOR_CSS).toContain(".invd .pe-fields > .pe-span2, .invd .pe-fields > .cash-note { grid-column: 1 / -1; }");
        expect(SELECTOR_CSS).toContain(".invd .pe-grid, .invd .pe-fields { grid-template-columns: 1fr; }");
        expect(SELECTOR_CSS).toContain(".invd .pe-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; margin-bottom: 12px; }");
        expect(MODULE_CSS).toMatch(/\.formGroup \{\s+display: flex;\s+flex-direction: column;\s+gap: 4px;\s+min-width: 0;\s+margin-bottom: 12px;\s+\}/);
    });

    test("E-44: the method-field labels are the reference Field label, with no asterisk", () => {
        expect(MODULE_CSS).toMatch(/\.fieldLabel \{\s+font-size: 10\.5px;\s+font-weight: 600;\s+text-transform: uppercase;\s+letter-spacing: 0\.08em;\s+color: var\(--text-4\);\s+font-family: var\(--sans\);\s+margin: 0;\s+\}/);
        expect(MODULE_CSS).not.toMatch(/\.required/);
        expect(FIELDS).not.toMatch(/styles\.required/);
    });

    test("E-45, E-49: card fields Approval Code, Transaction Reference, Card last 4; Bank before Cheque number", () => {
        const at = (s) => FIELDS.indexOf(s);
        expect(at("{ t(\"key_approval_code\") } (HH:MM:SS)")).toBeLessThan(at("{ t('key_transaction_reference') }"));
        expect(at("{ t('key_transaction_reference') }")).toBeLessThan(at("{ t('key_card_last_4') }"));
        expect(at("{ t(\"key_bank\") }")).toBeLessThan(at("{ t(\"key_cheque_number\") }"));
        expect(at("{ t(\"key_cheque_number\") }")).toBeLessThan(at("{ t(\"key_cheque_date\") }"));
    });

    test("E-51: the Cash note is the reference's blue info box, loaded with the payment form", () => {
        expect(SELECTOR_CSS).toContain(".invd .cash-note { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 14px; padding: 11px 13px; border-radius: 6px; background: var(--st-info-bg); border: 1px solid var(--st-info-bd); font-size: 12px; color: var(--text-2); line-height: 1.55; }");
        expect(SELECTOR_CSS).toContain(".invd .cash-note .after { margin-top: 6px; font-size: 12px; color: var(--text-3); }");
        expect(read("Views/Pages/Invoice/new-ui-create.css")).not.toMatch(/\.cash-note/);
    });

    test("E-52: the proof upload zone takes the reference look", () => {
        for (const rule of [
            ".pms-proof { border: 1.5px dashed var(--line-1); border-radius: 8px; padding: 18px; text-align: center; background: var(--bg-subtle); cursor: pointer; color: var(--text-3); }",
            ".pms-proof:not(.has-file):hover { border-color: var(--accent); background: var(--accent-bg); }",
            ".pms-proof > i { font-size: 22px; }",
            ".pms-proof .t { font-size: 13px; font-weight: 500; color: var(--text-1); margin-top: 6px; }",
            ".pms-proof .h { font-size: 11px; color: var(--text-3); margin-top: 4px; }",
        ]) expect([rule, SELECTOR_CSS.includes(rule)]).toEqual([rule, true]);
        expect(FIELDS).toContain("<div className={ `${ styles.formGroup } pe-span2` }>");
    });

    test("E-55: the status labels use the middle dot", () => {
        expect(EN.key_paid_approved).toBe("Paid · Approved");
        expect(EN.key_pending_paid_unapproved).toBe("Pending Paid · Unapproved");
    });

    test("E-56, E-57, E-58: Status and Payment review rows come first; the Balance Due footnote follows the table", () => {
        const src = read(PMS + "PayRemainingBalanceModal.js");
        const at = (s) => src.indexOf(s);
        expect(at("<td>{ t(\"key_status\") }</td>")).toBeLessThan(at("<td>{ t(\"key_payment_review\") }</td>"));
        expect(at("<td>{ t(\"key_payment_review\") }</td>")).toBeLessThan(at("<td>{ t(\"key_paid\") }</td>"));
        expect(src).toContain("const reviewAfter = method ? t(method.tier === 1 ? \"key_confirmed\" : \"key_pending_review\") : null;");
        expect(src).toContain("<p className=\"note\">{ t(\"key_balance_due_footnote\") }</p>");
    });
});
