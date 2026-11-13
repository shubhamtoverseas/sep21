/* eslint-env jest */
import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

/* OP-PK01-03 (owner 5 Nov 2026: "enforce the proof view token: Invoice Access AND (view token OR Approve Payment); unknown
   file = same refusal"): the contract detail hands out a payment proof's file only to such a user (contract 78aa170), so for
   anyone else it cannot tell a missing proof from a hidden one. The screen then shows nothing about the proof: no file, no
   "missing" claim, no Upload / Replace / Delete. A Cash deposit receipt and refund documentation keep their own rule. */

const ADMIN_ROLE_ID = require("../../components/ReusableComponents/constants").ADMIN_ROLE_ID;
let mockUser = { data: { id: 30, role: { id: 999 }, staff: { staff_type: "internal" } } };
jest.mock("../../utils/storage", () => ({ getStoredUser: () => mockUser }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }), initReactI18next: { type: "3rdParty", init: () => {} } }));
jest.mock("../../utils/translation", () => ({ __esModule: true, default: (key) => key, translation: (key) => key }));
jest.mock("../../redux/Slices/invoices/InvoicesSlice", () => ({
    uploadInvoicePaymentAttachment: (payload) => ({ type: "upload", payload }),
    removeInvoicePaymentAttachment: (payload) => ({ type: "remove", payload }),
}));
const mockCatalogue = {
    methods: [{ code: "fps", proof: "required" }, { code: "cash", proof: "deposit_receipt" }],
    groups: [], fieldRules: {}, methodFields: {}, proofFile: { maxBytes: 5242880, types: [] },
};
jest.mock("../../services/invoices", () => ({ getPaymentMethodCatalogueAPI: () => Promise.resolve({ data: { data: mockCatalogue } }) }));
/* eslint-disable import/first */
import { getInvoiceActionPermissions, paymentDocumentActions } from "../../utils/permissions/invoiceActionPermissionUtils";
import PaymentDocumentCard, { usePaymentDocument } from "../../Views/Pages/Invoice/general/PaymentDocumentCard";
/* eslint-enable import/first */

const STAFF = { data: { id: 30, role: { id: 999 }, staff: { staff_type: "internal" } } };
const ADMIN = { data: { id: 1, role: { id: ADMIN_ROLE_ID }, staff: { staff_type: "internal" } } };
const invoiceKeys = (values) => ({ data: [{ module: "invoice", category: Object.entries(values).map(([id, selected_value]) => ({ id, selected_value })) }] });
const renderDoc = (details, permissionList) => {
    const store = configureStore({ reducer: { users: () => ({ permissionList }) } });
    const Harness = () => <PaymentDocumentCard doc={ usePaymentDocument({ invoiceDetails: details, invoiceId: "7", onChanged: () => {} }) } />;
    return render(<Provider store={ store }><Harness /></Provider>);
};
/* what the server sends a user who may not view: the proof's file is null whether or not one is on file */
const fpsHidden = { status: 2, payment_method: "fps", paymentModel: [{ payment_method: "fps" }], latestPaymentAttachment: null, latestPaymentDocument: { state: "uploaded" } };
const cashMissing = { status: 2, payment_method: "cash", paymentModel: [{ payment_method: "cash" }], latestPaymentAttachment: null };
const EVERY_KEY_BUT_VIEW = { invoice_access: "y", invoice_pay_remaining_balance: "y", invoice_payment_proof: "upload,replace,delete" };

describe("OP-PK01-03 · who may view a payment proof", () => {
    beforeEach(() => { mockUser = STAFF; });

    test("Invoice Access AND (the view token OR Approve Payment); admin always", () => {
        const can = (values) => getInvoiceActionPermissions(invoiceKeys(values)).canViewPaymentProof;
        expect(can({ invoice_access: "y", invoice_payment_proof: "view" })).toBe(true);
        expect(can({ invoice_access: "y", invoice_approve_payment: "y" })).toBe(true);
        expect(can({ invoice_access: "y", invoice_payment_proof: "upload,replace,delete" })).toBe(false);
        expect(can({ invoice_payment_proof: "view", invoice_approve_payment: "y" })).toBe(false);
        mockUser = ADMIN;
        expect(can({})).toBe(true);
    });

    test("without it nothing is offered for a proof, whatever the other keys; a deposit receipt keeps its rule", () => {
        const held = getInvoiceActionPermissions(invoiceKeys(EVERY_KEY_BUT_VIEW));
        expect(paymentDocumentActions(held, true)).toEqual({ canUpload: false, canReplace: false, canDelete: false });
        expect(paymentDocumentActions(held, false).canUpload).toBe(true);
    });
});

describe("OP-PK01-03 · the proof card", () => {
    beforeEach(() => { mockUser = STAFF; });

    test("a user who may not view sees nothing about the proof: no file, no missing claim, no upload", async () => {
        /* a Cash card beside it shows once the method catalogue has loaded: the point where the proof card would show too */
        const store = configureStore({ reducer: { users: () => ({ permissionList: invoiceKeys(EVERY_KEY_BUT_VIEW) }) } });
        const Card = ({ details }) => <PaymentDocumentCard doc={ usePaymentDocument({ invoiceDetails: details, invoiceId: "7", onChanged: () => {} }) } />;
        render(<Provider store={ store }><Card details={ cashMissing } /><Card details={ fpsHidden } /></Provider>);
        await screen.findByText("key_upload_deposit_receipt");
        expect(screen.queryByText("key_payment_proof_missing")).toBeNull();
        expect(screen.queryByText("key_upload_payment_proof")).toBeNull();
    });

    test("with the view token the same answer reads as a missing proof (the screen trusts what it may see)", async () => {
        renderDoc(fpsHidden, invoiceKeys({ ...EVERY_KEY_BUT_VIEW, invoice_payment_proof: "view,upload" }));
        await screen.findByText("key_payment_proof_missing");
        expect(screen.getByText("key_upload_payment_proof")).toBeTruthy();
    });

    test("a Cash deposit receipt is shown without the view right", async () => {
        renderDoc(cashMissing, invoiceKeys({ invoice_pay_remaining_balance: "y" }));
        await screen.findByText("key_upload_deposit_receipt");
    });
});
