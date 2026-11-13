import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent } from "@testing-library/react";

/* Void, Mark Unsettled, Mark Bad Debt and Revert need a reason, which the Invoice API now requires (spec v5 §2.4, §7.7;
   development fix 14 Oct). The Revert confirm, a refund child's Void confirm and the listing's batch bar sent none. */

jest.mock("../../utils/translation", () => {
    const copy = JSON.parse(require("fs").readFileSync(require("path").resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
    const t = (key) => copy[key] ?? key;
    return { __esModule: true, default: t, translation: t };
});

const { default: CommonStatusPopup } = require("../../components/Layout/popups/invoice-popups/CommonStatusPopup");
const { default: ActionStatusPopup } = require("../../components/Layout/popups/invoice-popups/ActionStatusPopup");
const { needsReason } = require("../../Views/Pages/Invoice/invoiceActionList");

const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
const confirmButton = (container) => container.querySelector(".foot .btn-primary");

describe("the reason the Invoice API requires", () => {
    test("Unsettled, Void, Bad Debt and Revert need one; approvals do not", () => {
        for (const id of [5, 6, 7, 12, "6", "12"]) expect(needsReason(id)).toBe(true);
        for (const id of [1, 9, 11, 0, "", undefined]) expect(needsReason(id)).toBe(false);
    });

    test("the confirm popup asks for it and passes it on", () => {
        const confirm = jest.fn();
        const { container } = render(<CommonStatusPopup title="Revert back to Paid" message="Sure?" requireReason confirmStatusContract={ confirm } cancelStatusDialog={ () => {} } />);
        expect(screen.getByText(EN.key_reason_required)).toBeTruthy();
        expect(confirmButton(container).disabled).toBe(true);
        fireEvent.change(container.querySelector("textarea[name='reason']"), { target: { value: "  Payment cleared after all  " } });
        expect(confirmButton(container).disabled).toBe(false);
        fireEvent.click(confirmButton(container));
        expect(confirm).toHaveBeenCalledWith({ reason: "Payment cleared after all" });
    });

    test("without requireReason the popup is unchanged: no reason box, confirm called as before", () => {
        const confirm = jest.fn();
        const { container } = render(<CommonStatusPopup title="Approve Exchange" message="Sure?" confirmStatusContract={ confirm } cancelStatusDialog={ () => {} } />);
        expect(container.querySelector("textarea")).toBeNull();
        fireEvent.click(confirmButton(container));
        expect(confirm).toHaveBeenCalledWith();
    });

    test("the batch popup asks for a reason when the chosen status needs one", () => {
        const update = jest.fn();
        const list = [{ id: 6, name: "Void", key: "void", allowed: true }, { id: 1, name: "Approve Payment", key: "approve_payment", allowed: true }];
        const { container } = render(<ActionStatusPopup onClose={ () => {} } actionStatusList={ list } handleUpdateStatus={ update } initialStatus={ 6 } />);
        expect(container.querySelector("select[name='status']").value).toBe("6");
        fireEvent.click(confirmButton(container));
        expect(update).not.toHaveBeenCalled();
        expect(screen.getByText(EN.key_reason_is_required)).toBeTruthy();
        fireEvent.change(container.querySelector("textarea[name='reason']"), { target: { value: "Duplicate invoices" } });
        fireEvent.click(confirmButton(container));
        expect(update).toHaveBeenCalledWith("6", "Duplicate invoices");
    });

    test("the batch popup sends no reason for a status that needs none", () => {
        const update = jest.fn();
        const list = [{ id: 1, name: "Approve Payment", key: "approve_payment", allowed: true }];
        const { container } = render(<ActionStatusPopup onClose={ () => {} } actionStatusList={ list } handleUpdateStatus={ update } />);
        fireEvent.change(container.querySelector("select[name='status']"), { target: { name: "status", value: "1" } });
        expect(container.querySelector("textarea")).toBeNull();
        fireEvent.click(confirmButton(container));
        expect(update).toHaveBeenCalledWith("1", undefined);
    });

    test("every detail screen passes the popup's reason on and asks for it by status", () => {
        for (const file of ["add-contract-invoice/PaymentTypeInvoice.js", "general/PaymentTypeInvoice.js", "add-contract-invoice/ExchangePaymentInvoice.js",
            "add-contract-invoice/exchangePaymentReview.js", "general/exchangePaymentReview.js", "add-contract-invoice/RefundInvoice.js", "general/RefundInvoice.js"]) {
            const src = read(`Views/Pages/Invoice/${ file }`);
            expect(src).not.toContain("confirmStatusContract={ () => handleActionStatus() }");
            expect(src).toContain("confirmStatusContract={ (payload) => handleActionStatus(payload) }");
            expect(src).toMatch(/requireReason=\{ needsReason\(actionStatus\) \}/);
        }
    });

    test("a Revert that follows an adjustment carries the adjustment's reason", () => {
        for (const file of ["add-contract-invoice/PaymentTypeInvoice.js", "general/PaymentTypeInvoice.js", "add-contract-invoice/ExchangePaymentInvoice.js"]) {
            expect(read(`Views/Pages/Invoice/${ file }`)).toContain("handleActionStatus({ reason: payload?.reason })");
        }
    });

    test("the listing's batch sends the reason and opens the popup for a status that needs one", () => {
        const src = read("Views/Pages/Invoice/Invoice.js");
        expect(src).toContain("to_status: status, ...(reason ? { reason } : {})");
        expect(src).toContain("onClick={ () => needsReason(item.id) ? openBatchReason(item.id) : handleUpdateStatus(item.id) }");
        expect(src).toContain("initialStatus={ batchStatus }");
    });
});
