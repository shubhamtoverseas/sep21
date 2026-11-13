/**
 * Customer output of a worker-party invoice (QA-27-034): the party card names the worker and the code, where an employer's
 * name goes, in the preview's customer pane, the PDF and the Print.
 */
import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import PrintoutPreviewModal from "../../Views/Pages/Invoice/general/PrintoutPreviewModal";
import InvoiceContractPdfGenerator from "../../Views/Pages/Invoice/InvoiceContractPdfGenerator";
import InvoiceContractPdfPrint from "../../Views/Pages/Invoice/InvoiceContractPdfPrint";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("../../utils/translation", () => ({ __esModule: true, default: (k) => k }));

const WORKER_PARTY = {
    id: 90, invoice_number: "I-G000090", status: 1, payment_type: "full", employer_name: null, worker_name: "Maria Santos", worker_reference_id: "W-9",
    final_amount: "700.00", total_amount: "700.00", paid_amount: "700.00", remaining_balance: 0, paymentModel: [], contractInvoiceItemSelectModel: [], contractInvoiceItemModel: [], adjusted_amouts: [],
};
const BOTH = { ...WORKER_PARTY, employer_name: "Chan Tai Man", employer_reference_id: "E-1" };
const customerPane = () => document.querySelector(".printout-pane-label.customer").parentElement;

it("the preview issues it to the worker, with the code", () => {
    render(<PrintoutPreviewModal invoiceDetails={ WORKER_PARTY } totalAmount={ 700 } onClose={ jest.fn() } onDownloadPDF={ jest.fn() } onPrint={ jest.fn() } />);
    const section = within(customerPane()).getByText("Issued to").parentElement;
    expect(within(section).getByText("Maria Santos")).toBeInTheDocument();
    expect(section).toHaveTextContent("W-9");
});

it("the preview of an invoice with an employer still issues it to the employer", () => {
    render(<PrintoutPreviewModal invoiceDetails={ BOTH } totalAmount={ 700 } onClose={ jest.fn() } onDownloadPDF={ jest.fn() } onPrint={ jest.fn() } />);
    const section = within(customerPane()).getByText("Issued to").parentElement;
    expect(within(section).getByText("Chan Tai Man")).toBeInTheDocument();
    expect(section).toHaveTextContent("Re: Maria Santos");
});

describe.each([["PDF", InvoiceContractPdfGenerator], ["Print", InvoiceContractPdfPrint]])("the %s", (_name, Doc) => {
    it("puts the worker first, with no empty employer card", () => {
        render(<Doc invoiceDetails={ WORKER_PARTY } totalAmount={ 700 } adjustTotalAmount={ 0 } />);
        expect(screen.queryByText("key_employer")).toBeNull();
        expect(screen.getByText("key_worker")).toBeInTheDocument();
        expect(screen.getByText(/Maria Santos \(W-9\)/)).toBeInTheDocument();
    });
    it("keeps both cards when there is an employer", () => {
        render(<Doc invoiceDetails={ BOTH } totalAmount={ 700 } adjustTotalAmount={ 0 } />);
        expect(screen.getByText("key_employer")).toBeInTheDocument();
        expect(screen.getByText("key_worker")).toBeInTheDocument();
    });
});
