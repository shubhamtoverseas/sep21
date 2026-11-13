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

/* Reservation Fee screens (INV §11; Payment Method Rules v4 C-7, C-9; conflicts sheet U-0221). */

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
import ContractPaymentInvoice from "../../Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice";
/* eslint-enable import/first */

const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
const en = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));

describe("Reservation Fee", () => {
    test("Visa, Mastercard or UnionPay only (v4 C-7: no Cash); the selector reads them from the Invoice API's catalogue", () => {
        expect(en.key_worker_reserved_desc).toMatch(/Only Visa, Mastercard or UnionPay are accepted for a Reservation Fee\.$/);
        expect(en.key_worker_reserved_desc).not.toMatch(/Cash/);
        expect(en.key_not_available_for_reservation_fee).toBe("Not available for a Reservation Fee");
        const selector = read("Views/Pages/Invoice/payment-method-selector/PaymentMethodSelector.js");
        expect(selector).not.toMatch(/RESERVATION_FEE_METHOD_VALUES/);
        expect(selector).toMatch(/invoiceData\?\.status === undefined\s+&& !method\?\.reservationFee/);
        expect(read("components/ReusableComponents/constants.js")).not.toMatch(/RESERVATION_FEE_METHOD_VALUES/);
        // the detail banner's built-in text says the same
        expect(read("Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js")).toMatch(/Only Visa, Mastercard or UnionPay are accepted for a Reservation Fee\./);
    });

    test("detail: no Contract Ref on a Reservation Fee; Pay Remaining Balance only when the Invoice API offers it", () => {
        const detail = read("Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js");
        expect(detail).toMatch(/<InvoiceHeaderContext invoice=\{ invoiceDetails \} showContract=\{ Boolean\(invoiceDetails\?\.contract_number\) && !isReservationFee \} \/>/);
        // an expired Reservation Fee gets no offer from the API (domain guard; contract tests)
        expect(detail).toMatch(/const payRemaining = invoiceDetails\?\.payRemainingBalance \|\| null;/);
        expect(detail).toMatch(/\{ payRemaining && \(\n?\r?/);
        for (const f of ["Views/Pages/Invoice/InvoiceContractPdfGenerator.js", "Views/Pages/Invoice/InvoiceContractPdfPrint.js"]) {
            expect(read(f)).toMatch(/contract_number && !\(invoiceDetails\?\.payment_type === 'reservation_fee'/);
        }
    });
});

/* U-0221 (INV.md 400 / 758): an active Reservation Fee shows no Export — the Customer Printout in the header and the
   Output group's "Print / Download Customer Printout"; an expired one, and every other contract invoice, keep both. */
describe("Reservation Fee detail: the Customer Printout (U-0221)", () => {
    beforeAll(async () => {
        await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
    });
    beforeEach(() => {
        sessionStorage.setItem("user", JSON.stringify({ token: "t", data: { id: 9, role: { id: 1 } } }));
        getPaymentMethodCatalogueAPI.mockImplementation(() => new Promise(() => {}));
        getInvoiceInsuranceRecordsAPI.mockImplementation(() => Promise.resolve({ data: { data: { records: [] } } }));
    });
    afterEach(() => { jest.resetAllMocks(); sessionStorage.clear(); });

    const invoice = (over) => ({
        id: 412, status: 4, invoice_number: "I-HKH000412", invoice_type: "contract", payment_type: "reservation_fee",
        reservation_status: 0, final_amount: 3000, total_amount: 3000, total_discount: 0, paid_amount: 300, remaining_balance: 2700,
        adjusted_amouts: [], paymentModel: [], contractInvoiceItemSelectModel: [], contractInvoiceItemModel: [], childInvoices: [], ...over,
    });
    const open = async (over) => {
        getInvoiceViewAdmin.mockImplementation(() => Promise.resolve({ data: { data: {
            invoice: invoice(over), actions: [], activity: [], payments: [], remarks: [],
        } } }));
        const store = configureStore({
            reducer: {
                invoices, remarks, cs,
                users: () => ({ permissionList: { data: [] } }), worker: () => ({ totalInterviewCounts: {} }), employer: () => ({}),
            },
            middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
        });
        const Screen = withInvoiceViewGate(ContractPaymentInvoice, { insuranceCard: true });
        const route = "/invoices/add-contract-invoice/payment-type-invoice/:invoice_id";
        render(
            <Provider store={ store }>
                <QueryClientProvider client={ new QueryClient() }>
                    <MemoryRouter initialEntries={ ["/invoices/add-contract-invoice/payment-type-invoice/412"] }>
                        <Routes><Route path={ route } element={ <Screen /> } /></Routes>
                    </MemoryRouter>
                </QueryClientProvider>
            </Provider>
        );
        expect((await screen.findAllByText("I-HKH000412")).length).toBeGreaterThan(0);
    };
    const printouts = () => [en.key_customer_printout, en.key_print_download_customer_printout, en.key_output]
        .map((label) => screen.queryAllByText(label).length);

    test("an active Reservation Fee: neither the header button nor the Output group", async () => {
        await open({ reservation_status: 0 });
        expect(screen.getByText(en.key_worker_reserved_remaining_balance_due)).toBeTruthy();
        expect(printouts()).toEqual([0, 0, 0]);
    });

    test("an expired Reservation Fee keeps both", async () => {
        await open({ reservation_status: 1 });
        expect(screen.getByText(en.key_reservation_expired_worker_hold_released)).toBeTruthy();
        expect(printouts()).toEqual([1, 1, 1]);
    });

    test("any other contract invoice keeps both", async () => {
        await open({ status: 1, payment_type: "full", reservation_status: null, paid_amount: 3000, remaining_balance: 0 });
        expect(printouts()).toEqual([1, 1, 1]);
    });
});
