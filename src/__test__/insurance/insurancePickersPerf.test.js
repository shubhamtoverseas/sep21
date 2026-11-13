import React from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* P3 · the Insurance pickers on the optimised APIs (performance track A-30, A-31): the invoice picker reads its list on
   POST /api/admin/insurance/invoices/eligible (INS-4) and sends the override reason once typing pauses (or on leaving the
   box) instead of on every keystroke; Search worker posts its text to /api/admin/insurance/identity/workers (INS-3).
   New Insurance is one form since PROMPT 6 Part C, so the list cache the four-step wizard kept for its steps is gone. */

jest.mock("../../services/insuranceAdmin", () => ({
    getEligibleInsuranceInvoicesAdminAPI: jest.fn(),
    searchInsuranceWorkersAdminAPI: jest.fn(),
}));
/* eslint-disable import/first */
import { getEligibleInsuranceInvoicesAdminAPI, searchInsuranceWorkersAdminAPI } from "../../services/insuranceAdmin";
import reducer from "../../redux/Slices/insurance/InsuranceSlice";
import InvoicePicker from "../../Views/Pages/insurance/shared/InvoicePicker";
import WorkerSearchDialog from "../../Views/Pages/insurance/new/WorkerSearchDialog";
/* eslint-enable import/first */

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
afterEach(() => { jest.useRealTimers(); jest.resetAllMocks(); });

const store = () => configureStore({ reducer: { insurance: reducer } });
const ok = (data) => Promise.resolve({ data: { status: true, data } });
const row = (id, ref, extra = {}) => ({
    id, ref, type: "general", status: 1, statusName: "Paid", date: "2026-10-01", parties: { employer: "Employer", worker: "Worker" },
    lines: ["Insurance Policy"], eligible: true, overrideApplied: false, notes: [], reasons: [], overridable: false, ...extra,
});
const list = (...invoices) => ({ invoices, ineligibleCount: 0, searchable: true, available: true });
const sent = () => getEligibleInsuranceInvoicesAdminAPI.mock.calls.map((c) => c[0]);
const flush = () => act(async () => { await Promise.resolve(); });

describe("invoice picker: the override reason", () => {
    const overridable = row(7, "I-HKC000007", { eligible: false, overridable: true, reasons: [{ code: "late" }] });

    it("is sent once typing pauses (400 ms), not on every keystroke; the form gets every keystroke", async () => {
        jest.useFakeTimers();
        getEligibleInsuranceInvoicesAdminAPI.mockImplementation(() => ok(list(overridable)));
        const onChange = jest.fn();
        render(<Provider store={store()}><InvoicePicker purpose="renew" selectedId={7} onChange={onChange} /></Provider>);
        await flush();
        const box = await screen.findByRole("textbox");
        expect(getEligibleInsuranceInvoicesAdminAPI).toHaveBeenCalledTimes(1);
        for (const value of ["P", "Pa", "Pai", "Paid at branch"]) fireEvent.change(box, { target: { value } });
        await act(async () => { jest.advanceTimersByTime(399); });
        expect(getEligibleInsuranceInvoicesAdminAPI).toHaveBeenCalledTimes(1);
        await act(async () => { jest.advanceTimersByTime(1); });
        expect(getEligibleInsuranceInvoicesAdminAPI).toHaveBeenCalledTimes(2);
        expect(sent()[1]).toEqual({ purpose: "renew", showIneligible: false, selectedId: 7, invoiceOverrideReason: "Paid at branch" });
        expect(onChange.mock.calls.map((c) => c[0].invoiceOverrideReason)).toEqual(expect.arrayContaining(["P", "Pa", "Pai", "Paid at branch"]));
    });

    it("is sent at once when the box loses focus", async () => {
        getEligibleInsuranceInvoicesAdminAPI.mockImplementation(() => ok(list(overridable)));
        render(<Provider store={store()}><InvoicePicker purpose="renew" selectedId={7} onChange={() => {}} /></Provider>);
        const box = await screen.findByRole("textbox");
        fireEvent.change(box, { target: { value: "Paid" } });
        fireEvent.blur(box);
        await waitFor(() => expect(getEligibleInsuranceInvoicesAdminAPI).toHaveBeenCalledTimes(2));
        expect(sent()[1].invoiceOverrideReason).toBe("Paid");
    });
});

describe("invoice picker: each opening reads its list", () => {
    it("a list that failed shows Retry, which reads it again", async () => {
        getEligibleInsuranceInvoicesAdminAPI
            .mockImplementationOnce(() => Promise.reject(new Error("offline")))
            .mockImplementation(() => ok(list(row(1, "I-HKC000001"))));
        render(<Provider store={store()}><InvoicePicker purpose="new" onChange={() => {}} /></Provider>);
        fireEvent.click(await screen.findByRole("button", { name: en.key_retry }));
        expect(await screen.findByText("I-HKC000001")).toBeInTheDocument();
        expect(getEligibleInsuranceInvoicesAdminAPI).toHaveBeenCalledTimes(2);
    });

    it("no form keeps a list between openings: the picker takes no cache and New Insurance passes none", async () => {
        getEligibleInsuranceInvoicesAdminAPI.mockImplementation(() => ok(list(row(1, "I-HKC000001"))));
        const one = render(<Provider store={store()}><InvoicePicker purpose="renew" onChange={() => {}} /></Provider>);
        expect(await screen.findByText("I-HKC000001")).toBeInTheDocument();
        one.unmount();
        render(<Provider store={store()}><InvoicePicker purpose="renew" onChange={() => {}} /></Provider>);
        await waitFor(() => expect(getEligibleInsuranceInvoicesAdminAPI).toHaveBeenCalledTimes(2));
        expect(sent()[1]).toMatchObject({ purpose: "renew" });
        const read = (rel) => fs.readFileSync(path.join(__dirname, "../../Views/Pages/insurance", rel), "utf8");
        expect(read("shared/InvoicePicker.js")).not.toMatch(/cache/);
        expect(read("new/NewInsuranceForm.js")).not.toMatch(/cache=|invoiceLists/);
        for (const dialog of ["RenewPolicyDialog", "AddCoverageDialog", "ChangePolicyDialog", "EditRequestDialog"]) {
            expect(read(`record/${dialog}.js`)).not.toMatch(/cache=/);
        }
    });
});

describe("Search worker", () => {
    it("posts the search text in the body to the admin route; the rows are R7's", async () => {
        searchInsuranceWorkersAdminAPI.mockImplementation((q) => ok(q ? [{ id: 4, name: "Siti Aminah", code: "W-4", dob: "1990-01-01" }] : []));
        render(<Provider store={store()}><WorkerSearchDialog caps={{}} onClose={() => {}} onPick={() => {}} /></Provider>);
        await waitFor(() => expect(searchInsuranceWorkersAdminAPI).toHaveBeenCalledWith(""));
        fireEvent.change(screen.getByRole("searchbox"), { target: { value: " Siti " } });
        expect(await screen.findByText("Siti Aminah")).toBeInTheDocument();
        expect(searchInsuranceWorkersAdminAPI).toHaveBeenLastCalledWith("Siti");
    });

    it("the old client functions are gone (no caller was left)", () => {
        const client = fs.readFileSync(path.join(__dirname, "../../services/insurance.js"), "utf8");
        expect(client).not.toMatch(/searchInsuranceWorkersAPI|getEligibleInsuranceInvoicesAPI/);
        const paths = fs.readFileSync(path.join(__dirname, "../../services/apiPath.js"), "utf8");
        expect(paths).not.toMatch(/insuranceIdentityWorkers|insuranceInvoicesEligible/);
    });
});
