import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

/* Contract cancellation prompt on refund (28 Sep sheet row 2; PROCESS §2.6; 10 Oct register #23): the Refund dialog shows
   the Contract impact step on a full or partial refund only when the Invoice API says this refund asks it
   (refund_contract_prompt) — never because the page passes isContract. */

jest.mock("react-i18next", () => {
    const copy = JSON.parse(require("fs").readFileSync(require("path").resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
    return { useTranslation: () => ({ t: (key) => copy[key] ?? key }), initReactI18next: { type: "3rdParty", init: () => {} } };
});
const mockDispatch = jest.fn(() => Promise.resolve({}));
jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch, useSelector: (fn) => fn({ invoices: { invoiceCacellationReason: [] } }) }));
jest.mock("../../redux/Slices/invoices/InvoicesSlice", () => ({
    addRefundInvoice: jest.fn(() => ({ type: "refund" })),
    /* the reasons are read once, while the store has none (performance track A-14; the guard: invoiceDetailPerf.test.js) */
    loadInvoiceCancellationReasons: jest.fn(() => ({ type: "reasons" })),
}));
jest.mock("../../components/initiate-refund/InitiateRefund", () => ({ buildPayload: jest.fn(() => ({})), refundLines: () => [] }));
jest.mock("../../services/commonService", () => ({ uploadFile: jest.fn() }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../components/Icon/Icon", () => () => null);

const RefundModal = require("../../components/Layout/popups/invoice-popups/RefundModal").default;
const { loadInvoiceCancellationReasons } = require("../../redux/Slices/invoices/InvoicesSlice");

/* the Invoice API's refundable offer: HK$1,000 still refundable */
const REFUNDABLE = { amount: 1000, paid: 1000, refunded: 0, pending: false, fullRefundOnly: false, lines: [] };
const invoice = (over = {}) => ({ id: 1, invoice_number: "I-HKH000001", invoice_type: "contract", final_amount: 1000, refundable: REFUNDABLE, ...over });
const open = (props) => render(<RefundModal onClose={ jest.fn() } { ...props } />);

describe("refund dialog: contract impact step", () => {
    beforeEach(() => jest.clearAllMocks());

    test("a Contract invoice whose refund asks shows the step on a full and on a partial refund, and loads the reasons", () => {
        for (const refundType of ["Full Refund", "Partial Refund"]) {
            const { unmount } = open({ invoiceData: invoice({ refund_contract_prompt: true }), isContract: true });
            expect(screen.getByText("Contract impact")).toBeTruthy();
            fireEvent.click(screen.getByText(refundType));
            fireEvent.click(screen.getByText("Next"));
            expect(screen.getByText("This is a Contract Invoice. Is the associated worker / contract also being cancelled?")).toBeTruthy();
            unmount();
        }
        expect(loadInvoiceCancellationReasons).toHaveBeenCalled();
    });

    test("a Standalone invoice never shows it, even when the page passes isContract", () => {
        open({ invoiceData: invoice({ invoice_type: "general", refund_contract_prompt: false }), isContract: true });
        expect(screen.queryByText("Contract impact")).toBeNull();
        expect(loadInvoiceCancellationReasons).not.toHaveBeenCalled();
    });

    test("a Contract invoice whose contract is already Cancelled does not ask again", () => {
        open({ invoiceData: invoice({ refund_contract_prompt: false }), isContract: true });
        expect(screen.queryByText("Contract impact")).toBeNull();
    });
});
