/* eslint-env jest */
import React from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { fireEvent, render, screen } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";
import { interpolate } from "../../i18n/interpolate";
import VoidWorkerCancellationPopup from "../../components/Layout/popups/invoice-popups/VoidWorkerCancellationPopup";

/* Register #69 (INV-X5): voiding an A2 whose Underpayment child is live is a three-way choice — Void Both, Void A2 Only or
   Cancel — sent through the existing Void (void_child_invoice / child_invoice_id). A Remaining Credit refund child keeps its
   question; an A2 with no live child is asked nothing about one. */

jest.mock("../../components/ui/DateInput", () => () => null);

beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

const UNDERPAYMENT = { id: 108, invoice_number: "I-MO000108-U", invoice_type: "underpayment", status: 2 };
const REFUND = { id: 102, invoice_number: "I-MO000102(R)", invoice_type: "overpaid_refund", status: 8 };
const open = (childInvoices) => {
    const handleUpdateStatus = jest.fn();
    const onClose = jest.fn();
    render(<VoidWorkerCancellationPopup onClose={ onClose } handleUpdateStatus={ handleUpdateStatus } invoiceCacellationReason={ [] }
        invoice_type="exchange" invoiceNumber="I-MO000107(E)" parentInvoiceNumber="I-MO000094" workerName="Irene Sarmiento" childInvoices={ childInvoices } />);
    // the existing questions: keep the contract, give a reason
    fireEvent.click(screen.getAllByText(en.key_no)[0]);
    fireEvent.change(document.querySelector("textarea[name=other_reason]"), { target: { value: "Raised in error" } });
    return { handleUpdateStatus, onClose };
};
const footer = () => [...document.querySelectorAll(".foot button")].map((b) => b.textContent);

describe("Void on an A2 with a live Underpayment child (#69)", () => {
    it("names A2, the child and A1, says Void cannot be reversed; offers Cancel, Void A2 Only and Void Both; no Yes / No question", () => {
        open(UNDERPAYMENT);
        const note = document.querySelector("[data-void-underpayment]").textContent;
        expect(note).toBe(interpolate(en.key_void_a2_underpayment_note, "I-MO000107(E)", "I-MO000108-U", "I-MO000094"));
        // OP-27-127 (owner 3 Nov 2026): both references, irreversible, and A1 named as the invoice whose actions stay unrestored
        expect(note).toMatch(/I-MO000107\(E\).*I-MO000108-U/);
        expect(note).toMatch(/cannot be reversed/);
        expect(note).toMatch(/does not unwind the exchange or restore I-MO000094’s actions/);
        expect(footer()).toEqual([en.key_cancel, en.key_void_a2_only, en.key_void_both]);
        expect(screen.queryByText(/Void child invoice/)).toBeNull();
    });
    it.each([["both", "1"], ["a2-only", "0"]])("%s: the existing Void, with void_child_invoice %s for the child", (choice, flag) => {
        const { handleUpdateStatus } = open(UNDERPAYMENT);
        fireEvent.click(document.querySelector(`[data-void-choice="${ choice }"]`));
        expect(handleUpdateStatus).toHaveBeenCalledTimes(1);
        expect(handleUpdateStatus.mock.calls[0][0]).toMatchObject({ cancel_contract: "0", other_reason: "Raised in error", void_child_invoice: flag, child_invoice_id: 108 });
    });
    it("Cancel closes without voiding", () => {
        const { handleUpdateStatus, onClose } = open(UNDERPAYMENT);
        fireEvent.click(document.querySelector(".foot .btn-ghost"));
        expect(onClose).toHaveBeenCalled();
        expect(handleUpdateStatus).not.toHaveBeenCalled();
    });
    it("a voided Underpayment child asks nothing: one Void", () => {
        const { handleUpdateStatus } = open({ ...UNDERPAYMENT, status: 6 });
        expect(document.querySelector("[data-void-underpayment]")).toBeNull();
        expect(footer()).toEqual([en.key_cancel, en.key_void_invoice]);
        fireEvent.click(document.querySelector(".foot .btn-danger"));
        expect(handleUpdateStatus).toHaveBeenCalledTimes(1);
    });
});

describe("Void on an A2 without an Underpayment child", () => {
    it("a Remaining Credit refund child keeps its question", () => {
        const { handleUpdateStatus } = open(REFUND);
        expect(screen.getByText(/Void child invoice/).textContent).toContain("I-MO000102(R)");
        expect(footer()).toEqual([en.key_cancel, en.key_void_invoice]);
        fireEvent.click(document.querySelector(".foot .btn-danger"));
        expect(handleUpdateStatus).not.toHaveBeenCalled(); // the question needs an answer
    });
    it("no child: no question about one; the Void goes through", () => {
        const { handleUpdateStatus } = open({});
        expect(screen.queryByText(/Void child invoice/)).toBeNull();
        fireEvent.click(document.querySelector(".foot .btn-danger"));
        expect(handleUpdateStatus).toHaveBeenCalledTimes(1);
    });
});
