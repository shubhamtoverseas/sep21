import React from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* Dialogs and New Insurance (verification 15 Oct, group 5B; New Insurance is one form since PROMPT 6 Part C): the invoice
   picker's reason line and empty states (UI-X07 / X08), a new policy after a Contract-linked record keeps its Contract (UI-W15,
   INS #26.4), "New policy after {ref}" on the Contract's Insurance step (UI-W19), the ownership refusal before the form (UI-W08) */

jest.mock("../../services/insurance", () => ({
    getInsuranceRecordAPI: jest.fn(),
}));
/* the picker reads its list on the admin route (performance track INS-4) */
jest.mock("../../services/insuranceAdmin", () => ({
    getEligibleInsuranceInvoicesAdminAPI: jest.fn(),
}));
// eslint-disable-next-line import/first
import { getInsuranceRecordAPI } from "../../services/insurance";
// eslint-disable-next-line import/first
import { getEligibleInsuranceInvoicesAdminAPI as getEligibleInsuranceInvoicesAPI } from "../../services/insuranceAdmin";
// eslint-disable-next-line import/first
import reducer from "../../redux/Slices/insurance/InsuranceSlice";
// eslint-disable-next-line import/first
import InvoicePicker from "../../Views/Pages/insurance/shared/InvoicePicker";
// eslint-disable-next-line import/first
import { successorUrl } from "../../Views/Pages/insurance/shared/insuranceFormsConfig";
// eslint-disable-next-line import/first
import NewPolicyAfter from "../../Views/Pages/ProcessingPage/processing-detail/insurance-tab/NewPolicyAfter";
// eslint-disable-next-line import/first
import NewInsuranceForm from "../../Views/Pages/insurance/new/NewInsuranceForm";

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
afterEach(() => jest.resetAllMocks());

const src = (rel) => fs.readFileSync(path.resolve(__dirname, "../../Views/Pages", rel), "utf8");
const store = () => configureStore({ reducer: { insurance: reducer } });
const ok = (data) => Promise.resolve({ data: { data } });
const row = (id, ref, extra = {}) => ({
    id, ref, type: "general", status: 1, statusName: "Paid", date: "2026-10-01", parties: { employer: "Chan Tai Man", worker: "Siti" },
    lines: ["Insurance Policy"], eligible: true, overrideApplied: false, notes: [], reasons: [], overridable: false, ...extra,
});
const renderPicker = () => render(<Provider store={store()}><InvoicePicker purpose="new" onChange={() => {}} /></Provider>);
const search = async (value) => {
    await waitFor(() => expect(screen.getByRole("searchbox").disabled).toBe(false));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value } });
};

describe("invoice picker reason line (UI-X07)", () => {
    it("names a searched invoice that is the only match and cannot be used, with Show ineligible off", async () => {
        getEligibleInsuranceInvoicesAPI
            .mockReturnValueOnce(ok({ invoices: [row(1, "I-HKC000001")], ineligibleCount: 0, searchable: true, available: true }))
            .mockReturnValue(ok({
                invoices: [], ineligibleCount: 1, searchable: true, available: true,
                ineligibleMatch: row(5, "I-HKC000005", { eligible: false, reasons: [{ code: "void" }] }),
            }));
        renderPicker();
        await search("000005");
        expect(await screen.findByText(`I-HKC000005 cannot be used: ${en.key_ins_invoice_reason_void}.`)).toBeTruthy();
    });

    it("counts several that cannot be used", async () => {
        getEligibleInsuranceInvoicesAPI
            .mockReturnValueOnce(ok({ invoices: [row(1, "I-HKC000001")], ineligibleCount: 0, searchable: true, available: true }))
            .mockReturnValue(ok({ invoices: [], ineligibleCount: 2, searchable: true, available: true, ineligibleMatch: null }));
        renderPicker();
        await search("I-HKC");
        expect(await screen.findByText(en.key_ins_invoices_cannot_be_used.replace("{{n}}", "2"))).toBeTruthy();
    });
});

describe("invoice picker empty states (UI-X08)", () => {
    it("a search with no hits says no eligible invoice matches, not that none is available", async () => {
        getEligibleInsuranceInvoicesAPI
            .mockReturnValueOnce(ok({ invoices: [row(1, "I-HKC000001")], ineligibleCount: 0, searchable: true, available: true }))
            .mockReturnValue(ok({ invoices: [], ineligibleCount: 0, searchable: true, available: true, ineligibleMatch: null }));
        renderPicker();
        await search("nothing");
        expect(await screen.findByText(en.key_ins_no_eligible_invoice_matches)).toBeTruthy();
    });

    it("a list that could not be read shows the error and Retry, not the empty copy, then loads", async () => {
        getEligibleInsuranceInvoicesAPI
            .mockRejectedValueOnce(new Error("offline"))
            .mockReturnValue(ok({ invoices: [row(1, "I-HKC000001")], ineligibleCount: 0, searchable: true, available: true }));
        renderPicker();
        expect(await screen.findByText(en.key_couldnt_load_this_view)).toBeTruthy();
        expect(screen.queryByText(en.key_ins_no_invoice_available_to_you)).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: en.key_retry }));
        expect(await screen.findByText("I-HKC000001")).toBeTruthy();
    });
});

describe("new policy after a Contract-linked record (UI-W15, INS #26.4)", () => {
    it("keeps the Contract in the New Insurance link", () => {
        expect(successorUrl("IN-HKC000102", "C-HKC000045")).toBe("/insurance/new?prior=IN-HKC000102&contract=C-HKC000045&entry=contract");
        expect(successorUrl("IN-HKC000103")).toBe("/insurance/new?prior=IN-HKC000103");
    });

    it("the record page and New Insurance use it, and a Contract successor sends the E-Visa choice", () => {
        expect(src("insurance/record/InsuranceRecordPage.js")).toContain("navigate(successorUrl(record.ref, record.summary?.contract?.number));");
        const form = src("insurance/new/NewInsuranceForm.js");
        expect(form).toContain("navigate(successorUrl(existingRef, contract.number), { state: { contract } })");
        expect(form).toContain("if (contract) payload.useEvisaDate = model.dateSource === EVISA;");
    });
});

describe("Contract Insurance step: New policy after {ref} (UI-W19)", () => {
    it("is offered when the record offers New policy", async () => {
        getInsuranceRecordAPI.mockResolvedValueOnce({ data: { data: { actions: [{ key: "newPolicy", enabled: true }] } } });
        const onStart = jest.fn();
        render(<NewPolicyAfter insuranceRef="IN-HKC000102" onStart={onStart} />);
        fireEvent.click(await screen.findByRole("button", { name: "New policy after IN-HKC000102" }));
        expect(onStart).toHaveBeenCalled();
    });

    it("is not offered when the record does not offer it or cannot be read", async () => {
        getInsuranceRecordAPI.mockResolvedValueOnce({ data: { data: { actions: [{ key: "newPolicy", enabled: false }] } } });
        const { container, rerender } = render(<NewPolicyAfter insuranceRef="IN-1" onStart={() => {}} />);
        await waitFor(() => expect(getInsuranceRecordAPI).toHaveBeenCalledWith("IN-1"));
        expect(container.textContent).toBe("");
        getInsuranceRecordAPI.mockRejectedValueOnce(new Error("403"));
        rerender(<NewPolicyAfter insuranceRef="IN-2" onStart={() => {}} />);
        await waitFor(() => expect(getInsuranceRecordAPI).toHaveBeenCalledWith("IN-2"));
        expect(container.textContent).toBe("");
    });

    it("the Contract tab asks only for a record in use with no cover now or to come, and opens New Insurance with the Contract", () => {
        const tab = src("ProcessingPage/processing-detail/insurance-tab/ProcessingInsuranceTab.js");
        expect(tab).toContain('const successorRef = blockingRef && insurance?.coverage?.label === "none" ? blockingRef : null;');
        expect(tab).toContain("navigate(successorUrl(successorRef, contract.number), { state: { contract } });");
    });
});

describe("standalone New Insurance without ownership eligibility (UI-W08)", () => {
    const form = (ownership) => {
        const meta = { access: true, caps: { addNewInsurance: true }, search: { enabled: true }, plans: [], ownership };
        const s = configureStore({ reducer: { insurance: reducer }, preloadedState: { insurance: { ...reducer(undefined, { type: "init" }), meta } } });
        return render(<Provider store={s}><MemoryRouter initialEntries={["/insurance/new"]}><NewInsuranceForm /></MemoryRouter></Provider>);
    };

    it("refuses before the form instead of asking for a Branch it cannot offer", () => {
        form({ eligible: false, branches: [] });
        expect(screen.getByText(en.key_ins_standalone_needs_ownership)).toBeTruthy();
        expect(screen.queryByText(en.key_ins_err_select_branch)).toBeNull();
        expect(screen.queryByText(en.key_ins_parties)).toBeNull();
    });

    it("opens the form for an eligible actor", () => {
        form({ eligible: true, branches: [{ id: 1, code: "C", name: "Central" }] });
        expect(screen.queryByText(en.key_ins_standalone_needs_ownership)).toBeNull();
        expect(screen.getAllByText(en.key_ins_parties).length).toBeGreaterThan(0);
    });
});
