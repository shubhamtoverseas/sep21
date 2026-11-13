import React from "react";
import i18n from "i18next";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";
import zhHK from "../../../public/locales/zh_HK/translation.json";
import catalogue from "../../Views/Pages/SettingsPage/newui/users/permissions/permissionCatalogue.json";

/* PROMPT 9 fix round (owner, 12 Nov 2026), admin side. Each block fails on the code before its fix.
   F-1 / F-2  after a stale conflict or a failed save the dialog stays open with the typed values and the message above them;
              closing it reloads the record; a retry after a lost answer sends the same submission key, so it writes once
   F-7c       a refused or failed Contract read in Change policy is shown as such, never as an empty list (U-0107)
   F-7d       the invoice picker says when Invoice Search access Restricted held invoices back (U-0114)
   F-5        a request-scoped issue reads "Resolve before confirmation" (Insurance.html), not "Blocks Record QBE result"
   labels     Settings permission labels follow the buttons; the permission and translation keys stay */

jest.mock("../../services/insurance", () => ({
    getInsuranceMetaAPI: jest.fn(), renewInsuranceRecordAPI: jest.fn(), editInsuranceRequestAPI: jest.fn(), changeInsurancePolicyAPI: jest.fn(),
}));
jest.mock("../../services/insuranceAdmin", () => ({ getEligibleInsuranceInvoicesAdminAPI: jest.fn() }));
jest.mock("../../services/contracts", () => ({ getContracts: jest.fn() }));
jest.mock("../../services/remarks", () => ({
    addEditInsuranceRemarks: jest.fn(), removeInsuranceRemarks: jest.fn(), getInsuranceRemarks: jest.fn(), getInvoiceRemarks: jest.fn(),
}));
jest.mock("../../services/commonService", () => ({
    ...jest.requireActual("../../services/commonService"),
    getCurrentUser: () => ({ data: { id: 1 } }),
}));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
/* the worker search picks one worker and closes */
jest.mock("../../Views/Pages/insurance/new/WorkerSearchDialog", () => {
    const ReactLocal = require("react");
    return {
        __esModule: true,
        default: ({ onPick, onClose }) => ReactLocal.createElement("button", {
            type: "button", onClick: () => { onPick({ id: 301, name: "Nur Aini", code: "W-301" }); onClose(); },
        }, "pick-worker"),
    };
});

/* eslint-disable import/first */
import { changeInsurancePolicyAPI, editInsuranceRequestAPI, renewInsuranceRecordAPI } from "../../services/insurance";
import { getEligibleInsuranceInvoicesAdminAPI } from "../../services/insuranceAdmin";
import { getContracts } from "../../services/contracts";
import { addEditInsuranceRemarks } from "../../services/remarks";
import insurance from "../../redux/Slices/insurance/InsuranceSlice";
import remarks from "../../redux/Slices/remarks/RemarkSlice";
import RenewPolicyDialog from "../../Views/Pages/insurance/record/RenewPolicyDialog";
import EditRequestDialog from "../../Views/Pages/insurance/record/EditRequestDialog";
import ChangePolicyDialog from "../../Views/Pages/insurance/record/ChangePolicyDialog";
import InsuranceRemarks from "../../Views/Pages/insurance/record/InsuranceRemarks";
import InvoicePicker from "../../Views/Pages/insurance/shared/InvoicePicker";
import { featureFor } from "../../Views/Pages/SettingsPage/newui/users/permissions/permissionCatalogue";
/* eslint-enable import/first */

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
afterEach(() => { jest.resetAllMocks(); });

const ok = (data, message = "") => Promise.resolve({ data: { status: true, message, data } });
const refusedWith = (status, code, message) => Promise.reject({ response: { status, data: { status: false, message, data: {}, code } } });
const noAnswer = () => Promise.reject({ message: "Network Error" });
const STALE = "This record changed since the form was opened. Reopen it to see the current values.";

const META = (caps = {}) => ({
    access: true, today: "2026-11-12", search: { enabled: true, invoice: true },
    caps: { detailsView: true, renew: true, addCoverage: true, requestEndorsement: true, edit: true, ...caps },
    plans: [{ id: 185, name: "1-Year Full Body" }, { id: 186, name: "2-Year Full Body" }], coverageItems: [],
    changeTypes: [{ id: "address", invoice: "if-charge" }, { id: "reassign", invoice: "if-charge" }],
    cancellationReasons: [], ownership: { eligible: true, branches: [] }, referenceBranches: [], allBranches: [],
});
const invoiceRow = (id, ref) => ({ id, ref, type: "general", status: 1, statusName: "Paid", date: "2026-11-02", parties: { employer: "Chan Tai Man", worker: "Siti Aminah" },
    lines: ["Insurance — 1-Year Full Body"], eligible: true, overrideApplied: false, overridable: false, notes: [], reasons: [] });
const INVOICES = { invoices: [invoiceRow(501, "I-HKH000501")], ineligibleCount: 0, searchable: true, available: true };
const record = () => ({
    id: 101, ref: "IN-HKH000101", factsVersion: 3,
    summary: { period: { effective: "2026-01-01", expiry: "2026-12-31" } },
    parties: { worker: { id: 101, name: "Siti Aminah" }, employer: { id: 201, name: "Chan Tai Man" }, addressOnPolicy: "Flat 3B" },
    renewal: { targetStart: "2027-01-01", planId: 185, nextConfirmed: null, grace: { applies: false } },
    requests: [], issues: [], periods: [], voidedPeriods: [], coverages: [], riders: [],
});
const users = (state = { permissionList: { data: [] } }) => state;
const storeWith = (meta) => configureStore({ reducer: { insurance, remarks, users }, preloadedState: { insurance: { ...insurance(undefined, { type: "init" }), meta } } });
const dialog = (element, meta = META()) => render(<Provider store={storeWith(meta)}><MemoryRouter>{element}</MemoryRouter></Provider>);
const kept = () => document.querySelector("[data-kept-draft]");

/* ---------------- F-1 / F-2: the draft survives a stale conflict and a failed save ---------------- */
describe("F-1 / F-2: a request dialog keeps what was typed after a stale conflict or a failed save", () => {
    const openRenew = async () => {
        getEligibleInsuranceInvoicesAdminAPI.mockReturnValue(ok(INVOICES));
        const onClose = jest.fn();
        const onDone = jest.fn();
        dialog(<RenewPolicyDialog record={record()} onClose={onClose} onDone={onDone} />);
        fireEvent.change(document.querySelector("#ins-renew-plan"), { target: { value: "186" } });
        fireEvent.click(await screen.findByText("I-HKH000501"));
        return { onClose, onDone, submit: () => fireEvent.click(screen.getByRole("button", { name: en.key_ins_submit_renewal })) };
    };

    it("F-2: the save got no answer — the dialog stays open with plan, date and invoice; the retry sends the same key and writes once", async () => {
        const { onClose, onDone, submit } = await openRenew();
        renewInsuranceRecordAPI.mockImplementationOnce(noAnswer);
        submit();
        await waitFor(() => expect(kept()).toBeTruthy());
        expect(kept().textContent).toBe(en.key_something_went_wrong);
        expect(onClose).not.toHaveBeenCalled();
        expect(onDone).not.toHaveBeenCalled();
        expect(document.querySelector("#ins-renew-plan").value).toBe("186");
        expect(document.querySelector('[role="option"][aria-selected="true"]')).toHaveTextContent("I-HKH000501");
        // the retry: one key for the draft, so a save that did happen is answered "already recorded" instead of written twice
        renewInsuranceRecordAPI.mockReturnValueOnce(ok({ ref: "IN-HKH000101" }));
        submit();
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        const [first, second] = renewInsuranceRecordAPI.mock.calls.map((c) => c[0]);
        expect(second.submissionKey).toBe(first.submissionKey);
        expect([second.planId, second.requestedEffective, second.invoiceId]).toEqual([186, "2027-01-01", 501]);
    });

    it("F-1: a stale conflict keeps the dialog open with the message above the fields; closing it reloads the record", async () => {
        const { onClose, onDone, submit } = await openRenew();
        renewInsuranceRecordAPI.mockImplementationOnce(() => refusedWith(409, "STALE", STALE));
        submit();
        await waitFor(() => expect(kept()).toBeTruthy());
        expect(kept().textContent).toBe(STALE);
        expect(kept().getAttribute("role")).toBe("alert");
        // above the fields: the first thing in the form
        expect(kept().parentElement.firstElementChild).toBe(kept());
        expect(document.querySelector("#ins-renew-plan").value).toBe("186");
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", { name: en.key_cancel }));
        expect(onDone).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("a submission already recorded (DUPLICATE) still closes and reloads, as before; Cancel without a conflict reloads nothing", async () => {
        const first = await openRenew();
        renewInsuranceRecordAPI.mockImplementationOnce(() => refusedWith(409, "DUPLICATE", "This submission was already recorded."));
        first.submit();
        await waitFor(() => expect(first.onClose).toHaveBeenCalled());
        expect(first.onDone).toHaveBeenCalled();
    });

    it("Cancel on an untouched dialog closes it without a reload", async () => {
        const { onClose, onDone } = await openRenew();
        fireEvent.click(screen.getByRole("button", { name: en.key_cancel }));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onDone).not.toHaveBeenCalled();
    });

    it("F-1: Edit request — a stale conflict keeps the reason typed and says why", async () => {
        const onClose = jest.fn();
        const rq = { id: 41, type: "Coverage", version: 2, requestedEffective: "2026-11-20" };
        dialog(<EditRequestDialog record={record()} request={rq} onClose={onClose} onDone={jest.fn()} />);
        fireEvent.change(document.querySelector("#ins-edit-reason"), { target: { value: "Employer asked for a later date" } });
        editInsuranceRequestAPI.mockImplementationOnce(() => refusedWith(409, "STALE", "This request changed since the form was opened. Reopen it to see the current values."));
        fireEvent.click(screen.getByRole("button", { name: en.key_save }));
        await waitFor(() => expect(kept()).toBeTruthy());
        expect(document.querySelector("#ins-edit-reason").value).toBe("Employer asked for a later date");
        expect(onClose).not.toHaveBeenCalled();
    });

    it("F-1: a remark edit refused as changed (409) keeps the text and the message; closing reloads the remarks", async () => {
        const onChanged = jest.fn();
        const mine = { id: 7, remarks: "Policy copy sent", remarks_by: 1, remarks_by_name: "Mei Wong", created_at: new Date().toISOString(), version: 0, deleted: false, history: [] };
        render(<Provider store={storeWith(META())}><MemoryRouter><InsuranceRemarks record={record()} remarks={[mine]} canWrite onChanged={onChanged} /></MemoryRouter></Provider>);
        fireEvent.click(document.querySelector('[data-action="edit-remark"]'));
        fireEvent.change(document.querySelector("#ins-remark-text"), { target: { value: "Policy copy sent by email on 12 Nov" } });
        addEditInsuranceRemarks.mockImplementationOnce(() => Promise.reject({ response: { status: 409, data: { message: "This remark changed. Reopen it before saving." } } }));
        fireEvent.click(document.querySelector('[data-action="save-remark"]'));
        await waitFor(() => expect(kept()).toBeTruthy());
        expect(kept().textContent).toBe("This remark changed. Reopen it before saving.");
        expect(document.querySelector("#ins-remark-text").value).toBe("Policy copy sent by email on 12 Nov");
        expect(onChanged).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", { name: en.key_cancel }));
        expect(onChanged).toHaveBeenCalledTimes(1);
        expect(document.querySelector("#ins-remark-text")).toBeNull();
    });

    it("a remark that is gone (404) still closes the edit dialog and reloads, as before", async () => {
        const onChanged = jest.fn();
        const mine = { id: 8, remarks: "Old note", remarks_by: 1, remarks_by_name: "Mei Wong", created_at: new Date().toISOString(), version: 0, deleted: false, history: [] };
        render(<Provider store={storeWith(META())}><MemoryRouter><InsuranceRemarks record={record()} remarks={[mine]} canWrite onChanged={onChanged} /></MemoryRouter></Provider>);
        fireEvent.click(document.querySelector('[data-action="edit-remark"]'));
        addEditInsuranceRemarks.mockImplementationOnce(() => Promise.reject({ response: { status: 404, data: { message: "Remark not found" } } }));
        fireEvent.click(document.querySelector('[data-action="save-remark"]'));
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
        expect(kept()).toBeNull();
    });
});

/* ---------------- F-7c: the governing Contract list in Change policy ---------------- */
describe("F-7c: Change policy never shows a refused or failed Contract read as an empty list", () => {
    const openReassign = async () => {
        dialog(<ChangePolicyDialog record={record()} onClose={jest.fn()} onDone={jest.fn()} />, META({ changeGoverningContract: true }));
        fireEvent.change(document.querySelector("#ins-chg-type"), { target: { value: "reassign" } });
        fireEvent.click(document.querySelector("#ins-chg-worker"));
        fireEvent.click(await screen.findByText("pick-worker"));
    };
    const options = () => Array.from(document.querySelector("#ins-chg-contract").options).map((o) => o.textContent);

    it("refused by the Contract module: its own message is shown beside the field", async () => {
        getContracts.mockImplementationOnce(() => Promise.reject({ response: { status: 401, data: { message: "Access Denied" } } }));
        await openReassign();
        expect(await screen.findByText("Access Denied")).toHaveAttribute("data-contracts", "refused");
        expect(options()).toEqual([en.key_ins_standalone]);
    });

    it("failed: the list says it could not be read, with Retry; Retry reads it again", async () => {
        getContracts.mockImplementationOnce(() => Promise.reject({ message: "Network Error" }));
        await openReassign();
        const failed = await screen.findByText(en.key_couldnt_load_this_view);
        expect(failed.closest("[data-contracts]")).toHaveAttribute("data-contracts", "failed");
        getContracts.mockImplementationOnce(() => Promise.resolve({ data: { data: { data: [{ id: 9, contract_number: "C-HKH000009" }] } } }));
        fireEvent.click(screen.getByRole("button", { name: en.key_retry }));
        await waitFor(() => expect(options()).toEqual([en.key_ins_standalone, "C-HKH000009"]));
        expect(document.querySelector("[data-contracts]")).toBeNull();
        expect(getContracts).toHaveBeenCalledTimes(2);
    });

    it("a worker with no Contracts with this Employer: only Standalone, and nothing else is said (as before)", async () => {
        getContracts.mockImplementationOnce(() => Promise.resolve({ data: { data: { data: [] } } }));
        await openReassign();
        await waitFor(() => expect(getContracts).toHaveBeenCalled());
        expect(options()).toEqual([en.key_ins_standalone]);
        expect(document.querySelector("[data-contracts]")).toBeNull();
    });
});

/* ---------------- F-7d: the invoice picker under Invoice Search access Restricted ---------------- */
describe("F-7d: the invoice picker says when the Restricted ten held invoices back", () => {
    const pick = async (data) => {
        getEligibleInsuranceInvoicesAdminAPI.mockReturnValue(ok(data));
        dialog(<InvoicePicker purpose="new" title="Invoice" onChange={jest.fn()} />);
        await screen.findByText("I-HKH000001");
    };
    const ten = Array.from({ length: 10 }, (_, i) => invoiceRow(i + 1, `I-HKH${String(i + 1).padStart(6, "0")}`));

    it("capped: the listing's two lines under the list", async () => {
        await pick({ invoices: ten, ineligibleCount: 0, searchable: true, available: true, restricted: true, capped: true });
        expect(document.querySelector('[data-invoices="capped"]').textContent).toBe(`${en.key_ins_capped_first} ${en.key_ins_capped_refine}`);
    });

    it("not capped (Full access, or ten or fewer): nothing is said", async () => {
        await pick({ invoices: ten, ineligibleCount: 0, searchable: true, available: true, restricted: true, capped: false });
        expect(document.querySelector('[data-invoices="capped"]')).toBeNull();
    });
});

/* ---------------- F-5 and the Settings labels ---------------- */
describe("F-5 and the Settings permission labels follow the buttons", () => {
    it("F-5: a request-scoped issue reads as Insurance.html words it (en; zh_HK shows the English until reviewed)", () => {
        expect(en.key_ins_blocks_record).toBe("Resolve before confirmation");
        expect(zhHK.key_ins_blocks_record).toBe("Resolve before confirmation");
    });

    it("the two result permissions are labelled as their buttons; Record cancellation outcome already is", () => {
        const row = (id) => catalogue.rows.find((r) => r.id === id);
        expect(row("insurance.confirmPolicy").label).toBe("Confirm policy / renewal / additional coverage");
        expect(row("insurance.confirmEndorsement").label).toBe("Confirm changes");
        expect(row("insurance.recordCancellationOutcome").label).toBe("Record cancellation outcome");
        // each is its own row on the Settings screen, no longer two ticks under "Record QBE result"
        expect(featureFor(row("insurance.confirmPolicy"))).toMatchObject({ feature: "Confirm policy / renewal / additional coverage", action: "" });
        expect(featureFor(row("insurance.confirmEndorsement"))).toMatchObject({ feature: "Confirm changes", action: "" });
    });

    it("keys unchanged: the permission keys and the translation keys stay; only the wording moved", () => {
        expect(catalogue.bindings["insurance.confirmPolicy|single"].apiKey).toBe("insurance_confirm_policy");
        expect(catalogue.bindings["insurance.confirmEndorsement|single"].apiKey).toBe("insurance_confirm_change");
        expect(catalogue.labels["Confirm policy / renewal / additional coverage"]).toBe("key_perm_t_record_qbe_result_policy_confirmation");
        expect(catalogue.labels["Confirm changes"]).toBe("key_perm_t_record_qbe_result_change_policy");
        expect(en.key_perm_t_record_qbe_result_policy_confirmation).toBe("Confirm policy / renewal / additional coverage");
        expect(en.key_perm_t_record_qbe_result_change_policy).toBe("Confirm changes");
    });

    it("no Settings label, label key or English value says Record QBE result any more", () => {
        expect(JSON.stringify(catalogue)).not.toMatch(/Record QBE result/);
        expect(en).not.toHaveProperty("key_perm_t_record_qbe_result");
        expect(Object.entries(en).filter(([, v]) => /Record QBE result/.test(String(v)))).toEqual([]);
        expect(Object.entries(zhHK).filter(([, v]) => /Record QBE result/.test(String(v)))).toEqual([]);
    });
});
