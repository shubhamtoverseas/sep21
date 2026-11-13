/* eslint-env jest */
import React, { Suspense } from "react";
import fs from "fs";
import path from "path";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/* PK-01 P1-19 (INVOICE-017, register #82; owner 5 Nov 2026 "Admin screens hide the action when the key is missing (UI
   convenience) AND the server refuses (the rule)"): the Invoice Detail actions follow the keys the contract API checks
   (contract 18a6258):
   - Customer Printout: invoice_print_customer_printout; Remark (add, and edit / delete of an own remark): invoice_remarks;
   - Upload / Replace under Pay Remaining Balance, Delete under Approve Payment (OP-V2-05); a payment PROOF also needs that
     token of invoice_payment_proof (view / upload / replace / delete); a Cash deposit receipt and refund documentation do not;
   - admin sees everything.
   OP-PK01-03 (5 Nov): a proof is shown, and acted on, only with Invoice Access AND (the view token OR Approve Payment); the
   cases below that mean such a user carry invoice_access (pk01ProofView covers the rule itself). */

const ADMIN_ROLE_ID = require("../../components/ReusableComponents/constants").ADMIN_ROLE_ID;
let mockUser = { data: { id: 30, role: { id: 999 }, staff: { staff_type: "internal" } } };
jest.mock("../../utils/storage", () => ({ getStoredUser: () => mockUser }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }), initReactI18next: { type: "3rdParty", init: () => {} } }));
jest.mock("../../utils/translation", () => ({ __esModule: true, default: (key) => key, translation: (key) => key }));
jest.mock("../../redux/Slices/invoices/InvoicesSlice", () => ({
    uploadInvoicePaymentAttachment: (payload) => ({ type: "upload", payload }),
    removeInvoicePaymentAttachment: (payload) => ({ type: "remove", payload }),
}));
jest.mock("../../redux/Slices/remarks/RemarkSlice", () => {
    /* thunks the store runs: the remarks list comes from the store's state below */
    const action = () => () => () => ({ unwrap: () => Promise.resolve([]) });
    return {
        deleteEmployerRemark: action(), deleteProcessingRemark: action(), deleteWorkerRemark: action(),
        fetchEmployerRemarks: action(), fetchProcessingRemarks: action(), fetchWorkerRemarks: action(),
        fetchInvoiceRemarks: action(), deleteInvoiceRemark: action(), fetchInsuranceRemarks: action(), removeInsuranceRemark: action(),
    };
});
const mockCatalogue = {
    methods: [{ code: "fps", proof: "required" }, { code: "cash", proof: "deposit_receipt" }],
    groups: [], fieldRules: {}, methodFields: {}, proofFile: { maxBytes: 5242880, types: [] },
};
jest.mock("../../services/invoices", () => ({ getPaymentMethodCatalogueAPI: () => Promise.resolve({ data: { data: mockCatalogue } }) }));
/* eslint-disable import/first */
import { getInvoiceActionPermissions, paymentDocumentActions, paymentProofTokens, INVOICE_REMARKS_PERMISSION_KEYS } from "../../utils/permissions/invoiceActionPermissionUtils";
import PaymentDocumentCard, { usePaymentDocument } from "../../Views/Pages/Invoice/general/PaymentDocumentCard";
import Remarks from "../../components/remarks/Remarks";
/* eslint-enable import/first */

const STAFF = { data: { id: 30, role: { id: 999 }, staff: { staff_type: "internal" } } };
const ADMIN = { data: { id: 1, role: { id: ADMIN_ROLE_ID }, staff: { staff_type: "internal" } } };
/* the invoice module as the permission list carries it: { key: value } */
const invoiceKeys = (values) => ({ data: [{ module: "invoice", category: Object.entries(values).map(([id, selected_value]) => ({ id, selected_value })) }] });
const SRC = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");

const renderDoc = (details, permissionList) => {
    const store = configureStore({ reducer: { users: () => ({ permissionList }) } });
    const Harness = () => <PaymentDocumentCard doc={ usePaymentDocument({ invoiceDetails: details, invoiceId: "7", onChanged: () => {} }) } />;
    return render(<Provider store={ store }><Harness /></Provider>);
};
const fpsWithProof = { status: 2, payment_method: "fps", paymentModel: [{ payment_method: "fps" }], latestPaymentAttachment: "https://bucket.example/invoices/payment/a1.pdf", latestPaymentDocument: { state: "uploaded" } };
const fpsMissing = { status: 2, payment_method: "fps", paymentModel: [{ payment_method: "fps" }], latestPaymentAttachment: null };
const cashMissing = { status: 2, payment_method: "cash", paymentModel: [{ payment_method: "cash" }], latestPaymentAttachment: null };

describe("PK-01 P1-19 · the key helper", () => {
    beforeEach(() => { mockUser = STAFF; });

    test("each action follows its key; nothing held shows nothing", () => {
        expect(getInvoiceActionPermissions(invoiceKeys({}))).toEqual({
            canPrintCustomerPrintout: false, canRemark: false, canPayRemainingBalance: false, canApprovePayment: false, proofTokens: new Set(),
            canViewPaymentProof: false,
        });
        const held = getInvoiceActionPermissions(invoiceKeys({ invoice_print_customer_printout: "y", invoice_remarks: "y", invoice_pay_remaining_balance: "n", invoice_approve_payment: "y", invoice_payment_proof: "view, upload,delete" }));
        expect([held.canPrintCustomerPrintout, held.canRemark, held.canPayRemainingBalance, held.canApprovePayment]).toEqual([true, true, false, true]);
        expect([...held.proofTokens]).toEqual(["view", "upload", "delete"]);
        expect([...paymentProofTokens(invoiceKeys({ invoice_payment_proof: "" }))]).toEqual([]);
        expect(INVOICE_REMARKS_PERMISSION_KEYS).toEqual([["invoice", "invoice_remarks"]]);
    });

    test("a proof needs its token on top of the route's key; a deposit receipt does not; admin holds every key", () => {
        const tokensOnly = getInvoiceActionPermissions(invoiceKeys({ invoice_payment_proof: "upload,replace,delete" }));
        expect(paymentDocumentActions(tokensOnly, true)).toEqual({ canUpload: false, canReplace: false, canDelete: false });
        const keysOnly = getInvoiceActionPermissions(invoiceKeys({ invoice_pay_remaining_balance: "y", invoice_approve_payment: "y" }));
        expect(paymentDocumentActions(keysOnly, true)).toEqual({ canUpload: false, canReplace: false, canDelete: false });
        expect(paymentDocumentActions(keysOnly, false)).toEqual({ canUpload: true, canReplace: true, canDelete: true });
        const replaceOnly = getInvoiceActionPermissions(invoiceKeys({ invoice_access: "y", invoice_pay_remaining_balance: "y", invoice_approve_payment: "y", invoice_payment_proof: "view,replace" }));
        expect(paymentDocumentActions(replaceOnly, true)).toEqual({ canUpload: false, canReplace: true, canDelete: false });
        mockUser = ADMIN;
        const admin = getInvoiceActionPermissions(invoiceKeys({}));
        expect([admin.canPrintCustomerPrintout, admin.canRemark]).toEqual([true, true]);
        expect(paymentDocumentActions(admin, true)).toEqual({ canUpload: true, canReplace: true, canDelete: true });
    });
});

describe("PK-01 P1-19 · the proof card", () => {
    beforeEach(() => { mockUser = STAFF; });

    test("with only the view right a Pending Paid proof can only be viewed", async () => {
        renderDoc(fpsWithProof, invoiceKeys({ invoice_access: "y", invoice_payment_proof: "view" }));
        await screen.findByText("key_view");
        expect(screen.queryByText("key_replace")).toBeNull();
        expect(screen.queryByText("key_delete")).toBeNull();
    });

    test("Replace needs Pay Remaining Balance and the replace token; Delete needs Approve Payment and the delete token", async () => {
        const { unmount } = renderDoc(fpsWithProof, invoiceKeys({ invoice_access: "y", invoice_pay_remaining_balance: "y", invoice_approve_payment: "y", invoice_payment_proof: "view,replace" }));
        await screen.findByText("key_replace");
        expect(screen.queryByText("key_delete")).toBeNull();
        unmount();
        renderDoc(fpsWithProof, invoiceKeys({ invoice_access: "y", invoice_pay_remaining_balance: "y", invoice_approve_payment: "y", invoice_payment_proof: "delete" }));
        await screen.findByText("key_delete");
        expect(screen.queryByText("key_replace")).toBeNull();
    });

    test("a missing proof offers Upload only with the upload token", async () => {
        const { unmount } = renderDoc(fpsMissing, invoiceKeys({ invoice_access: "y", invoice_pay_remaining_balance: "y", invoice_payment_proof: "view" }));
        await screen.findByText("key_payment_proof_missing");
        expect(screen.queryByText("key_upload_payment_proof")).toBeNull();
        unmount();
        renderDoc(fpsMissing, invoiceKeys({ invoice_access: "y", invoice_pay_remaining_balance: "y", invoice_payment_proof: "view,upload" }));
        await screen.findByText("key_upload_payment_proof");
    });

    test("a Cash deposit receipt needs Pay Remaining Balance only (no proof token)", async () => {
        const { unmount } = renderDoc(cashMissing, invoiceKeys({ invoice_pay_remaining_balance: "y" }));
        await screen.findByText("key_upload_deposit_receipt");
        unmount();
        renderDoc(cashMissing, invoiceKeys({ invoice_payment_proof: "upload,replace,delete" }));
        await screen.findByText("key_deposit_receipt_missing");
        expect(screen.queryByText("key_upload_deposit_receipt")).toBeNull();
    });

    test("admin sees Replace and Delete", async () => {
        mockUser = ADMIN;
        renderDoc(fpsWithProof, invoiceKeys({}));
        await screen.findByText("key_replace");
        expect(screen.getByText("key_delete")).toBeTruthy();
    });
});

describe("PK-01 P1-19 · invoice remarks", () => {
    const renderRemarks = (permissionList) => {
        const store = configureStore({ reducer: {
            users: () => ({ permissionList }),
            remarks: () => ({ invoiceRemarks: [{ id: 5, remarks_by: 30, remarks: "own remark", created_at: "2026-11-05T01:00:00Z" }] }),
        } });
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        return render(
            <Provider store={ store }><QueryClientProvider client={ client }><MemoryRouter><Suspense fallback={ null }>
                <Remarks entityType="invoice" entityId={ 7 } isAddRemarksPopup={ false } handleOnCloseAddRemarks={ () => {} } />
            </Suspense></MemoryRouter></QueryClientProvider></Provider>,
        );
    };
    beforeEach(() => { mockUser = STAFF; });

    test("the author edits or deletes an own invoice remark only with invoice_remarks; the list itself stays readable", async () => {
        const { container, unmount } = renderRemarks(invoiceKeys({}));
        await screen.findByText("own remark");
        await waitFor(() => expect(container.querySelector(".remark-actions")).toBeNull());
        unmount();
        const held = renderRemarks(invoiceKeys({ invoice_remarks: "y" }));
        await screen.findByText("own remark");
        await waitFor(() => expect(held.container.querySelector(".remark-act.edit")).toBeTruthy());
        expect(held.container.querySelector(".remark-act.del")).toBeTruthy();
    });
});

describe("PK-01 P1-19 · every Invoice Detail screen", () => {
    const INV = "Views/Pages/Invoice/";
    const SCREENS = ["add-contract-invoice/PaymentTypeInvoice.js", "general/PaymentTypeInvoice.js", "add-contract-invoice/ExchangePaymentInvoice.js",
        "add-contract-invoice/exchangePaymentReview.js", "general/exchangePaymentReview.js", "add-contract-invoice/RefundInvoice.js", "general/RefundInvoice.js"].map((f) => INV + f);
    const DOC_SCREENS = [SCREENS[0], SCREENS[1], SCREENS[2]];
    const REVIEWS = [SCREENS[3], SCREENS[4]];
    const REFUNDS = [SCREENS[5], SCREENS[6]];

    test("the header Customer Printout and Remark, and the Output printout, follow their keys", () => {
        for (const file of SCREENS) {
            const src = read(file);
            expect([file, src.includes("const invoiceActions = getInvoiceActionPermissions(permissionList);")]).toEqual([file, true]);
            expect([file, /\{ invoiceActions\.canRemark && <button className="btn btn-secondary md" onClick=\{ \(\) => setShowAddRemark\(true\) \}>/.test(src)]).toEqual([file, true]);
            expect([file, /\n\s+<button className="btn btn-secondary md" onClick=\{ \(\) => setShowAddRemark\(true\) \}>/.test(src)]).toEqual([file, false]);
            if (file === SCREENS[0]) {
                // the Contract screen's own printout condition (an active Reservation Fee shows none) takes the key too
                expect(src).toContain("const showPrintout = !(isReservationFee && !reservationExpired) && invoiceActions.canPrintCustomerPrintout;");
            } else {
                expect([file, /\{ invoiceActions\.canPrintCustomerPrintout && <button className="btn btn-secondary md"/.test(src), /\{ invoiceActions\.canPrintCustomerPrintout && \(\s+<div className="group">\s+<div className="lbl">\{ t\('key_output'\)/.test(src)]).toEqual([file, true, true]);
            }
        }
    });

    test("Upload / Replace / Delete read the card's key-aware flags; the exchange reviews and refunds gate their own upload", () => {
        for (const file of DOC_SCREENS) {
            const src = read(file);
            expect([file, src.includes("{ doc.canUpload && ("), src.includes("{ doc.canReplace && ("), src.includes("{ doc.canDelete && ("), src.includes("doc.canManage && (")]).toEqual([file, true, true, true, false]);
        }
        for (const file of REVIEWS) {
            const src = read(file);
            expect([file, src.includes("const documentActions = paymentDocumentActions(invoiceActions, !isPaymentByCash);"), src.includes("{ documentActions.canUpload && (")]).toEqual([file, true, true]);
        }
        for (const file of REFUNDS) expect([file, read(file).includes("{ invoiceActions.canPayRemainingBalance && (")]).toEqual([file, true]);
        const card = read(INV + "general/PaymentDocumentCard.js");
        expect([card.includes("{ doc.canReplace && <button"), card.includes("{ doc.canDelete && <button"), card.includes("{ doc.canUpload && (")]).toEqual([true, true, true]);
    });
});
