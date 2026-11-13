import React from "react";
import fs from "fs";
import path from "path";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/* The invoice detail's Insurance side card (reference invoice-detail.html InsuranceSide; open point OP-UI4-01): one card per
   insurance record the invoice is linked to, as the Insurance API reads them for this user (R8
   GET /insurance/invoices/:invoiceId/records). */

/* i18next is not initialised under Jest: its t returns the key (the Insurance pages' wording helpers call it directly) */
jest.mock("i18next", () => ({ __esModule: true, default: { t: (key) => key } }));
jest.mock("../../services/insurance", () => ({ getInvoiceInsuranceRecordsAPI: jest.fn() }));

const { getInvoiceInsuranceRecordsAPI } = require("../../services/insurance");
const InvoiceInsuranceCard = require("../../components/Invoice/InvoiceInsuranceCard").default;

const SRC = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");
const EN = JSON.parse(fs.readFileSync(path.resolve(SRC, "../public/locales/en/translation.json"), "utf8"));
const ok = (records) => Promise.resolve({ data: { data: { records } } });

const ACTIVE = { ref: "IN-HK000057", policyNumber: "POL-2025-08-0917", inReview: false, note: null, openable: true,
    coverage: { label: "active", code: "active", fact: "fact.active", factDate: null } };

const renderCard = async (records, props = { invoiceId: 3, invoiceRef: "I-CBO000003" }) => {
    getInvoiceInsuranceRecordsAPI.mockReset();
    getInvoiceInsuranceRecordsAPI.mockImplementation(() => (records instanceof Error ? Promise.reject(records) : ok(records)));
    const view = render(<MemoryRouter><InvoiceInsuranceCard { ...props } /></MemoryRouter>);
    if (props.invoiceId) await waitFor(() => expect(getInvoiceInsuranceRecordsAPI).toHaveBeenCalledWith(props.invoiceId));
    return view;
};
const rows = (card) => [...card.querySelectorAll(".row")].map((r) => [r.querySelector(".k").textContent, r.lastElementChild.textContent]);

describe("the invoice detail's Insurance card", () => {
    test("a linked policy in force: Policy, Status Active (success), Anchored on this invoice, Open insurance record", async () => {
        const { container } = await renderCard([ACTIVE]);
        const card = await waitFor(() => { const c = container.querySelector("[data-insurance-ref=\"IN-HK000057\"]"); expect(c).toBeTruthy(); return c; });
        expect(card.querySelector(".head-row").textContent).toBe("key_insurance");
        expect(rows(card)).toEqual([["key_policy", "POL-2025-08-0917"], ["key_status", "key_ins_fact_active"], ["key_anchored_on", "I-CBO000003"]]);
        expect(card.querySelector(".row .v.mono").textContent).toBe("POL-2025-08-0917");
        const link = card.querySelector("a.link");
        expect([link.getAttribute("href"), link.textContent.trim()]).toEqual(["/insurance/IN-HK000057", "key_open_insurance_record"]);
        expect(card.querySelector(".rf-hold-note")).toBeNull();
    });

    test("In Review while an issue is open (attention), with the issue as the note", async () => {
        const { container } = await renderCard([{ ...ACTIVE, inReview: true, note: "void on invoice I-CBO000003 — period" }]);
        await waitFor(() => expect(container.querySelector(".context-side")).toBeTruthy());
        expect(rows(container)[1]).toEqual(["key_status", "key_in_review"]);
        expect(container.querySelector(".rf-hold-note").textContent).toBe("void on invoice I-CBO000003 — period");
    });

    test("before the insurer issues the policy: Policy '—' and the record's own state; no link without Details View", async () => {
        const { container } = await renderCard([{ ...ACTIVE, policyNumber: null, openable: false,
            coverage: { label: "none", code: "awaiting", fact: "fact.notIssued", factDate: null } }]);
        await waitFor(() => expect(container.querySelector(".context-side")).toBeTruthy());
        expect(rows(container)).toEqual([["key_policy", "—"], ["key_status", "key_ins_fact_not_issued"], ["key_anchored_on", "I-CBO000003"]]);
        expect(container.querySelector("a.link")).toBeNull();
    });

    test("one card per linked record; none when there is no link, no Insurance access or the API fails", async () => {
        let view = await renderCard([ACTIVE, { ...ACTIVE, ref: "IN-HK000058", policyNumber: "POL-2" }]);
        await waitFor(() => expect(view.container.querySelectorAll(".context-side").length).toBe(2));
        view.unmount();
        view = await renderCard([]);
        expect(view.container.innerHTML).toBe("");
        view.unmount();
        view = await renderCard(new Error("403"));
        expect(view.container.innerHTML).toBe("");
        view.unmount();
        view = await renderCard([ACTIVE], { invoiceId: null, invoiceRef: "" });
        expect(getInvoiceInsuranceRecordsAPI).not.toHaveBeenCalled();
        expect(view.container.innerHTML).toBe("");
    });

    test("the card sits after the Reservation Fee card and before the proof card on the Contract, Standalone and Exchanged screens", () => {
        for (const file of ["add-contract-invoice/PaymentTypeInvoice.js", "general/PaymentTypeInvoice.js", "add-contract-invoice/ExchangePaymentInvoice.js"]) {
            const s = read(`Views/Pages/Invoice/${ file }`);
            const at = s.indexOf("<InvoiceInsuranceCard invoiceId={ invoiceDetails?.id } invoiceRef={ invoiceDetails?.invoice_number } />");
            expect([file, at > 0, at < s.indexOf("<PaymentDocumentCard doc={ doc }"), at > s.indexOf("<PaymentDeadlineCard deadline={ doc.deadline } />")]).toEqual([file, true, true, true]);
        }
        expect(read("services/insurance.js")).toContain("export const getInvoiceInsuranceRecordsAPI = (invoiceId) => commonClient.get(`${ REACT_APP_INSURANCE_API_URL }${ apiPath.insuranceInvoices }/${ encodeURIComponent(invoiceId) }/records`);");
        expect([EN.key_insurance, EN.key_policy, EN.key_in_review, EN.key_anchored_on, EN.key_open_insurance_record])
            .toEqual(["Insurance", "Policy", "In Review", "Anchored on", "Open insurance record"]);
    });
});
