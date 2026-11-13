import React from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

/* Conflicts sheet U-0223: the invoice CS-change action is documented as "Change Invoice CS" (not "Change Handling
   Staff"), and a contract-linked invoice's CS follows its Contract (U-0160, awaiting product), so the action is not
   offered on a contract-linked invoice. Ruling C4 (27 Oct 2026): it is offered with invoice_change_cs, the key the
   Settings API enforces (admin always), and the invoice list's column chooser with invoice_select_fields_to_display. */

jest.mock("../../services/invoicesAdmin", () => ({ getInvoiceListAdmin: jest.fn(), getInvoiceViewAdmin: jest.fn() }));
jest.mock("../../services/invoices", () => ({
    resolveInvoiceAPI: jest.fn(), getInvoiceDetails: jest.fn(), getActionStatusList: jest.fn(), getInvoiceActivityLogList: jest.fn(),
    getInvoicePaymentLogList: jest.fn(), invoiceGLobalCancellationReason: jest.fn(), getPaymentMethodCatalogueAPI: jest.fn(),
}));
jest.mock("../../services/remarks", () => ({ getInvoiceRemarks: jest.fn() }));
jest.mock("../../services/insurance", () => ({ getInvoiceInsuranceRecordsAPI: jest.fn() }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../Views/Pages/Invoice/InvoiceFollowUp", () => () => null);
/* eslint-disable import/first */
import { getInvoiceViewAdmin } from "../../services/invoicesAdmin";
import { getPaymentMethodCatalogueAPI } from "../../services/invoices";
import { getInvoiceInsuranceRecordsAPI } from "../../services/insurance";
import invoices from "../../redux/Slices/invoices/InvoicesSlice";
import remarks from "../../redux/Slices/remarks/RemarkSlice";
import cs from "../../redux/Slices/common/cs/CsSlice";
import { withInvoiceViewGate } from "../../Views/Pages/Invoice/InvoiceRecordGate";
import StandalonePaymentInvoice from "../../Views/Pages/Invoice/general/PaymentTypeInvoice";
/* eslint-enable import/first */

const SCREENS = [
    "add-contract-invoice/ExchangePaymentInvoice.js", "add-contract-invoice/exchangePaymentReview.js",
    "add-contract-invoice/PaymentTypeInvoice.js", "add-contract-invoice/RefundInvoice.js",
    "general/exchangePaymentReview.js", "general/PaymentTypeInvoice.js", "general/RefundInvoice.js",
];
const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/Invoice", rel), "utf8");
const en = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));

describe("Change Invoice CS action", () => {
    test.each(SCREENS)("%s: documented label, offered with invoice_change_cs, not on a contract-linked invoice", (rel) => {
        const src = read(rel);
        expect(src).not.toMatch(/key_change_handling_staff|Change Handling Staff/);
        expect(src).toMatch(/const canChangeInvoiceCs = useCanChangeInvoiceCs\(\);/);
        const at = src.indexOf("setIsChangeCsPopup(true)");
        const before = src.slice(Math.max(0, at - 400), at);
        expect(before).toMatch(/\{ canChangeInvoiceCs && !invoiceDetails\?\.contract_number && \(/);
        expect(src.slice(at, at + 400)).toMatch(/t\('key_change_invoice_cs'\)/);
    });

    test("copy", () => {
        expect(en.key_change_invoice_cs).toBe("Change Invoice CS");
        expect(en.key_change_handling_staff).toBeUndefined();
    });

    test("the permission editor's Change standalone Invoice CS Owner row writes invoice_change_cs; the column chooser is the Invoice grant's", () => {
        const catalogue = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/SettingsPage/newui/users/permissions/permissionCatalogue.json"), "utf8"));
        expect(catalogue.bindings["invoice.standalone_owner|single"].apiKey).toBe("invoice_change_cs");
        expect(JSON.stringify(catalogue)).not.toMatch(/invoice_standalone_change_cs/);
        const filter = read("InvoiceFilter.js");
        expect(filter).toMatch(/const canSelectColumns = useMemo\(\(\) => getPermissionValue\(permissionList\?\.data, 'invoice', 'invoice_select_fields_to_display'\) === 'y', \[permissionList\]\);/);
        expect(filter).toMatch(/\{canSelectColumns && \(\s+<ColumnsDropdown/);
        expect(filter).not.toMatch(/jo_select_fields_to_display/);
    });
});

describe("Change Invoice CS on the detail: invoice_change_cs (ruling C4)", () => {
    beforeAll(async () => {
        await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
    });
    beforeEach(() => {
        getPaymentMethodCatalogueAPI.mockImplementation(() => new Promise(() => {}));
        getInvoiceInsuranceRecordsAPI.mockImplementation(() => Promise.resolve({ data: { data: { records: [] } } }));
    });
    afterEach(() => { jest.resetAllMocks(); sessionStorage.clear(); });

    const grant = (value) => [{ module: "invoice", category: [{ id: "invoice_change_cs", selected_value: value }] }];
    const open = async ({ roleId, permissions, invoice = {} }) => {
        sessionStorage.setItem("user", JSON.stringify({ token: "t", data: { id: 9, role: { id: roleId } } }));
        getInvoiceViewAdmin.mockImplementation(() => Promise.resolve({ data: { data: {
            invoice: {
                id: 351, status: 1, invoice_number: "I-TWO000351", invoice_type: "general", payment_type: "full", final_amount: 500,
                total_amount: 500, total_discount: 0, paid_amount: 500, remaining_balance: 0, adjusted_amouts: [], paymentModel: [],
                contractInvoiceItemSelectModel: [], contractInvoiceItemModel: [], childInvoices: [], ...invoice,
            },
            actions: [], activity: [], payments: [], remarks: [],
        } } }));
        const store = configureStore({
            reducer: {
                invoices, remarks, cs,
                users: () => ({ permissionList: { data: permissions } }), worker: () => ({ totalInterviewCounts: {} }), employer: () => ({}),
            },
            middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
        });
        const Screen = withInvoiceViewGate(StandalonePaymentInvoice, { insuranceCard: true });
        const route = "/invoices/general/payment-type-invoice/:invoice_id";
        render(
            <Provider store={ store }>
                <QueryClientProvider client={ new QueryClient() }>
                    <MemoryRouter initialEntries={ ["/invoices/general/payment-type-invoice/351"] }>
                        <Routes><Route path={ route } element={ <Screen /> } /></Routes>
                    </MemoryRouter>
                </QueryClientProvider>
            </Provider>
        );
        expect((await screen.findAllByText("I-TWO000351")).length).toBeGreaterThan(0);
    };
    const offered = () => screen.queryAllByText(en.key_change_invoice_cs).length > 0;

    test("a staff member without the grant is not offered it", async () => {
        await open({ roleId: 3, permissions: grant("n") });
        expect(offered()).toBe(false);
    });

    test("a staff member holding invoice_change_cs is offered it", async () => {
        await open({ roleId: 3, permissions: grant("y") });
        expect(offered()).toBe(true);
    });

    test("an admin is offered it without a grant", async () => {
        await open({ roleId: 1, permissions: [] });
        expect(offered()).toBe(true);
    });

    test("never on a contract-linked invoice, even with the grant", async () => {
        await open({ roleId: 3, permissions: grant("y"), invoice: { contract_number: "C-HKH000077" } });
        expect(offered()).toBe(false);
    });
});
