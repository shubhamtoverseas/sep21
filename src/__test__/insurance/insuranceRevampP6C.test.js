import React, { Suspense } from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";
import zhHK from "../../../public/locales/zh_HK/translation.json";

/* Insurance revamp PROMPT 6 Part C — forms and dialogs (Insurance.html newflow.js, forms.js, ownership.js; Insurance.txt INS01,
   INS02, INS06; UI Correction C3):
   - New Insurance is ONE form (Parties · Plan and requested date · Invoice · Create request), also for Contract entry, with the
     reference branch override for holders of insurance_reference_branch_override on a new standalone record;
   - request, result and record dialogs follow the prototype's copy, order and widths; server field errors sit beside their field;
   - Complete portfolio handover shows the shared inactive-staff cue instead of "(inactive)";
   - every dialog keeps the focus contract (focus in, Tab inside, Escape, inert background, focus back to its opener);
   - no wizard steps, Next Step, quote, Qnect or "sent to QBE" anywhere. */

jest.mock("../../services/insurance", () => ({
    getInsuranceRecordAPI: jest.fn(), getInsuranceRecordHistoryAPI: jest.fn(), getInsuranceMetaAPI: jest.fn(), lookupInsuranceContractAPI: jest.fn(),
    createInsuranceRecordAPI: jest.fn(), searchInsuranceEmployersAPI: jest.fn(), changeInsurancePolicyAPI: jest.fn(), recordInsuranceQbeResultAPI: jest.fn(),
    checkInsuranceCarrierRefAPI: jest.fn(), correctInsuranceRecordAPI: jest.fn(), getInsuranceOwnerPortfolioAPI: jest.fn(), getInsuranceOwnerRecipientsAPI: jest.fn(),
    recordInsuranceCancellationResultAPI: jest.fn(),
}));
jest.mock("../../services/insuranceAdmin", () => ({
    getEligibleInsuranceInvoicesAdminAPI: jest.fn(), searchInsuranceWorkersAdminAPI: jest.fn(),
    getInsuranceRecordViewAdminAPI: jest.fn(), getInsuranceRecordViewByIdAdminAPI: jest.fn(),
}));
jest.mock("../../services/remarks", () => ({ getInsuranceRemarks: jest.fn() }));
jest.mock("../../services/calendar", () => ({ getSourceTasksAPI: jest.fn() }));
jest.mock("../../services/contracts", () => ({ getContracts: jest.fn() }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
/* eslint-disable import/first */
import {
    checkInsuranceCarrierRefAPI, correctInsuranceRecordAPI, createInsuranceRecordAPI, getInsuranceMetaAPI, getInsuranceOwnerPortfolioAPI,
    getInsuranceOwnerRecipientsAPI, getInsuranceRecordAPI, getInsuranceRecordHistoryAPI, lookupInsuranceContractAPI,
    recordInsuranceCancellationResultAPI, recordInsuranceQbeResultAPI, searchInsuranceEmployersAPI,
} from "../../services/insurance";
import { getEligibleInsuranceInvoicesAdminAPI, getInsuranceRecordViewAdminAPI, searchInsuranceWorkersAdminAPI } from "../../services/insuranceAdmin";
import { getSourceTasksAPI } from "../../services/calendar";
import { getContracts } from "../../services/contracts";
import { ShowToast } from "../../components/show-toast/ShowToast";
import insurance from "../../redux/Slices/insurance/InsuranceSlice";
import remarks from "../../redux/Slices/remarks/RemarkSlice";
import SearchSelect from "../../components/ui/SearchSelect";
import insuranceRoutes from "../../Views/Pages/routes/insuranceRoutes";
import routes from "../../Views/Pages/routes/routesConfig";
import InsuranceRecordPage from "../../Views/Pages/insurance/record/InsuranceRecordPage";
import ChangePolicyDialog from "../../Views/Pages/insurance/record/ChangePolicyDialog";
import RenewPolicyDialog from "../../Views/Pages/insurance/record/RenewPolicyDialog";
import AddCoverageDialog from "../../Views/Pages/insurance/record/AddCoverageDialog";
import EditRequestDialog from "../../Views/Pages/insurance/record/EditRequestDialog";
import RecordQbeResultDialog from "../../Views/Pages/insurance/record/RecordQbeResultDialog";
import CorrectRecordDialog from "../../Views/Pages/insurance/record/CorrectRecordDialog";
import PortfolioHandoverDialog from "../../Views/Pages/insurance/ownership/PortfolioHandoverDialog";
import CancellationResultDialog from "../../Views/Pages/insurance/record/CancellationResultDialog";
/* eslint-enable import/first */

const SRC = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");
/* New Insurance as the router serves it (the same lookup works for the four-step wizard it replaces) */
const NewInsurance = insuranceRoutes.find((r) => r.path === routes.insuranceNew).component;

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
afterEach(() => { jest.resetAllMocks(); sessionStorage.clear(); });

const ok = (data, message = "") => Promise.resolve({ data: { status: true, message, data } });
const refused = (errors, message = "Complete the required fields", code = "VALIDATION") => Promise.reject({
    response: { status: 400, data: { status: false, message, data: {}, code, errors } },
});
const BRANCHES = [{ id: 1, code: "HKH", name: "Hung Hom" }, { id: 2, code: "CBO", name: "Causeway Bay" }, { id: 4, code: "TKO", name: "Tseung Kwan O" }];
const META = (caps = {}, extra = {}) => ({
    access: true, today: "2026-11-10", search: { enabled: true, invoice: true },
    caps: { detailsView: true, addNewInsurance: true, contractEntryNew: true, referenceBranchOverride: true, renew: true, addCoverage: true,
        requestEndorsement: true, cancelPolicy: true, correctStatus: true, changeOwner: true, changeBranch: true, bulkChangeOwner: true, ...caps },
    plans: [{ id: 185, name: "1-Year Full Body" }, { id: 186, name: "2-Year Full Body" }], coverageItems: [{ id: 187, name: "Cancer and heart" }],
    changeTypes: [{ id: "address", invoice: "if-charge" }, { id: "reassign", invoice: "if-charge" }, { id: "rider", invoice: "required" }, { id: "name", invoice: "if-charge" }],
    cancellationReasons: ["Cover not required", "Employment terminated", "Worker departed", "Replaced by another policy", "Other"],
    ownership: { eligible: true, branches: [BRANCHES[0], BRANCHES[2]] }, referenceBranches: BRANCHES, allBranches: BRANCHES, ...extra,
});
const invoiceRow = (id, ref) => ({ id, ref, type: "general", status: 1, statusName: "Paid", date: "2026-11-02", parties: { employer: "Chan Tai Man", worker: "Siti Aminah" },
    lines: ["Insurance — 1-Year Full Body"], eligible: true, overrideApplied: false, overridable: false, notes: [], reasons: [] });
const INVOICES = { invoices: [invoiceRow(501, "I-HKH000501")], ineligibleCount: 0, searchable: true, available: true };
const users = (state = { permissionList: { data: [] }, ownerOnboardingList: { cs_of_contract_ids: [] } }) => state;
const storeWith = (meta) => configureStore({ reducer: { insurance, remarks, users }, preloadedState: { insurance: { ...insurance(undefined, { type: "init" }), meta } } });
const signIn = () => sessionStorage.setItem("user", JSON.stringify({ data: { id: 1, role: { id: 1 }, staff: { id: 7, first_name: "Mei", last_name: "Wong" } } }));

/* ---------------- New Insurance ---------------- */

const openNew = async ({ meta = META(), url = "/insurance/new", state } = {}) => {
    signIn();
    getEligibleInsuranceInvoicesAdminAPI.mockReturnValue(ok(INVOICES));
    const [pathname, search = ""] = url.split("?");
    const entry = state ? { pathname, search: search ? `?${search}` : "", state } : url;
    const utils = render(
        <Provider store={storeWith(meta)}>
            <MemoryRouter initialEntries={[entry]}>
                <Suspense fallback={null}>
                    <Routes>
                        <Route path="/insurance/new" element={<NewInsurance />} />
                        <Route path="/insurance/:ref" element={<div data-testid="record-page" />} />
                        <Route path="/insurance" element={<div data-testid="insurance-page" />} />
                        <Route path="/processings/details/:contract_id" element={<div data-testid="contract-page" />} />
                    </Routes>
                </Suspense>
            </MemoryRouter>
        </Provider>,
    );
    // the route's component loads lazily, as it does in the app
    await screen.findByRole("heading", { level: 1 }, { timeout: 8000 });
    return utils;
};
const beside = (container, field) => container.querySelector(`[data-field="${field}"]`)?.textContent || "";
const PARTY = { party: { employer: { id: 201, name: "Chan Tai Man" }, worker: { id: 101, name: "Siti Aminah" } } };
/* a standalone request ready to send: parties from a Worker / Employer record, plan, date and invoice */
const fillStandalone = async (container) => {
    await screen.findByText("Chan Tai Man");
    await screen.findByText("Siti Aminah");
    fireEvent.change(container.querySelector("#ins-new-plan"), { target: { value: "185" } });
    fireEvent.change(container.querySelector("#ins-new-date"), { target: { value: "20/11/2026" } });
    fireEvent.click((await screen.findByText("I-HKH000501")).closest('[role="option"]'));
};
const resolvesParties = () => {
    searchInsuranceEmployersAPI.mockReturnValue(ok([{ id: 201, name: "Chan Tai Man", code: "E-000201" }]));
    searchInsuranceWorkersAdminAPI.mockReturnValue(ok([{ id: 101, name: "Siti Aminah", code: "W101", dob: "1990-04-12" }]));
};

describe("New Insurance is one form (Insurance.html newflow.js)", () => {
    it("Parties, Plan and requested date and Invoice show together, then Create request; no steps, Continue or review", async () => {
        const { container } = await openNew();
        expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("New Insurance");
        for (const panel of ["parties", "plan", "invoice"]) expect(container.querySelector(`[data-panel="${panel}"]`)).not.toBeNull();
        expect(screen.getByRole("heading", { name: "Parties" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Plan and requested date" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Invoice" })).toBeInTheDocument();
        expect(screen.getByText("Enter the issued dates when you confirm the policy.")).toBeInTheDocument();
        expect(screen.getByText("Create the request now. Record the policy number and issued dates when confirmed.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Create request" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
        expect(screen.queryByText(/Review and submit/)).toBeNull();
        expect(container.querySelector("ol")).toBeNull();
    });

    it("Create request with nothing chosen: each required field says so beside it, focus goes to the first, nothing is sent", async () => {
        const { container } = await openNew({ meta: META({ referenceBranchOverride: false }) });
        fireEvent.click(screen.getByRole("button", { name: "Create request" }));
        expect(beside(container, "employerId")).toContain("Select the employer");
        expect(beside(container, "workerId")).toContain("Select the worker");
        expect(beside(container, "planId")).toContain(en.key_ins_err_select_plan);
        expect(beside(container, "requestedEffective")).toContain(en.key_ins_err_requested_effective);
        expect(beside(container, "invoiceId")).toContain(en.key_ins_err_select_invoice);
        await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Search employer" })));
        expect(createInsuranceRecordAPI).not.toHaveBeenCalled();
    });

    it("the reference branch override: holders only, on a new standalone record; it asks for the reference Branch and a reason and sends both", async () => {
        resolvesParties();
        createInsuranceRecordAPI.mockReturnValue(ok({ ref: "IN-CBO000120" }, "IN-CBO000120 created"));
        const { container } = await openNew({ state: PARTY });
        await fillStandalone(container);
        expect(screen.queryByLabelText(/Reference branch/)).toBeNull();
        fireEvent.click(screen.getByRole("checkbox", { name: "Override new Insurance reference branch" }));
        const branch = container.querySelector("#ins-new-ref-branch");
        // the record Branch (Hung Hom, the first ownership Branch) is never its own override
        expect(Array.from(branch.options).map((o) => o.textContent)).toEqual(["Select Branch…", "Causeway Bay (CBO)", "Tseung Kwan O (TKO)"]);
        expect(screen.getByText("Insurance Ref is immutable after issuance. Changing Branch later never renumbers the record.")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Create request" }));
        expect(beside(container, "referenceBranch")).toContain("Select a reference Branch within your authorised branches");
        expect(beside(container, "referenceBranchReason")).toContain(en.key_ins_err_enter_reason);
        await waitFor(() => expect(document.activeElement).toBe(branch));
        expect(createInsuranceRecordAPI).not.toHaveBeenCalled();
        fireEvent.change(branch, { target: { value: "2" } });
        fireEvent.change(container.querySelector("#ins-new-ref-reason"), { target: { value: "Registry numbering for CBO." } });
        fireEvent.click(screen.getByRole("button", { name: "Create request" }));
        await waitFor(() => expect(createInsuranceRecordAPI).toHaveBeenCalledTimes(1));
        expect(createInsuranceRecordAPI.mock.calls[0][0]).toMatchObject({
            entry: "insurance", employerId: 201, workerId: 101, branch: 1, planId: 185, requestedEffective: "2026-11-20", invoiceId: 501,
            referenceBranch: 2, referenceBranchReason: "Registry numbering for CBO.",
        });
        expect(await screen.findByTestId("record-page")).toBeInTheDocument();
    });

    it("without the grant there is no override, and an unticked override sends no reference branch", async () => {
        resolvesParties();
        createInsuranceRecordAPI.mockReturnValue(ok({ ref: "IN-HKH000121" }));
        const { container } = await openNew({ meta: META({ referenceBranchOverride: false }), state: PARTY });
        await fillStandalone(container);
        expect(screen.queryByRole("checkbox", { name: "Override new Insurance reference branch" })).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "Create request" }));
        await waitFor(() => expect(createInsuranceRecordAPI).toHaveBeenCalledTimes(1));
        expect(createInsuranceRecordAPI.mock.calls[0][0]).not.toHaveProperty("referenceBranch");
        expect(createInsuranceRecordAPI.mock.calls[0][0]).not.toHaveProperty("referenceBranchReason");
    });

    it("server field errors sit beside their fields, focus goes to the first, and errors with no field are listed in the toast", async () => {
        resolvesParties();
        createInsuranceRecordAPI.mockImplementation(() => refused({
            referenceBranch: "Select a reference Branch within your authorised branches",
            invoiceId: "I-HKH000501 cannot be used: linked to another policy",
            somethingElse: "The Contract changed.",
        }));
        const { container } = await openNew({ state: PARTY });
        await fillStandalone(container);
        fireEvent.click(screen.getByRole("checkbox", { name: "Override new Insurance reference branch" }));
        fireEvent.change(container.querySelector("#ins-new-ref-branch"), { target: { value: "4" } });
        fireEvent.change(container.querySelector("#ins-new-ref-reason"), { target: { value: "Registry numbering." } });
        fireEvent.click(screen.getByRole("button", { name: "Create request" }));
        await waitFor(() => expect(beside(container, "referenceBranch")).toContain("Select a reference Branch within your authorised branches"));
        expect(beside(container, "invoiceId")).toContain("I-HKH000501 cannot be used: linked to another policy");
        await waitFor(() => expect(document.activeElement).toBe(container.querySelector("#ins-new-ref-branch")));
        expect(ShowToast).toHaveBeenLastCalledWith("error", "Complete the required fields • The Contract changed.");
    });

    it("Contract entry opens the same form: the Contract's parties and CS Owner, the E-Visa choice, no override", async () => {
        const contract = { id: 57, number: "C-CBO000057", employerId: 203, employerName: "Wong Siu Ming", workerId: 103, workerName: "Dewi Lestari", workerCode: "W103",
            ownerName: "Kelvin Chow", branchName: "Causeway Bay", branchCode: "CBO", evisaDate: "2026-11-20", stage: "not_ready", insuranceRef: null };
        createInsuranceRecordAPI.mockReturnValue(ok({ ref: "IN-CBO000122" }));
        const { container } = await openNew({ url: "/insurance/new?contract=C-CBO000057&entry=contract", state: { contract } });
        expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("New Insurance from Contract");
        for (const panel of ["parties", "plan", "invoice"]) expect(container.querySelector(`[data-panel="${panel}"]`)).not.toBeNull();
        expect(within(container.querySelector('[data-panel="parties"]')).getByText(/from Contract C-CBO000057/)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Search employer" })).toBeNull();
        expect(screen.queryByRole("checkbox", { name: "Override new Insurance reference branch" })).toBeNull();
        fireEvent.click(screen.getByRole("checkbox", { name: /Use the E-Visa payment date/ }));
        fireEvent.change(container.querySelector("#ins-new-plan"), { target: { value: "186" } });
        fireEvent.click((await screen.findByText("I-HKH000501")).closest('[role="option"]'));
        fireEvent.click(screen.getByRole("button", { name: "Create request" }));
        await waitFor(() => expect(createInsuranceRecordAPI).toHaveBeenCalledTimes(1));
        expect(createInsuranceRecordAPI.mock.calls[0][0]).toMatchObject({ entry: "contract", contractId: 57, useEvisaDate: true, planId: 186, requestedEffective: "2026-11-20", invoiceId: 501 });
        expect(createInsuranceRecordAPI.mock.calls[0][0]).not.toHaveProperty("referenceBranch");
    });

    it("the search dialogs return focus to the button that opened them", async () => {
        searchInsuranceEmployersAPI.mockReturnValue(ok([]));
        await openNew();
        const opener = screen.getByRole("button", { name: "Search employer" });
        opener.focus();
        fireEvent.click(opener);
        const dialog = await screen.findByRole("dialog", { name: "Search employer" });
        await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
        fireEvent.keyDown(document.activeElement, { key: "Escape" });
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        expect(document.activeElement).toBe(opener);
    });
});

/* ---------------- dialogs ---------------- */

const person = (name, at = "2026-11-01T02:00:00Z") => ({ name, at });
const request = (id, type, extra = {}) => ({
    id, type, state: "pending", version: 1, submittedBy: person("Ann Lee"), recordedBy: null, closed: null, periodEnded: false, attention: false,
    buttons: { record: true, edit: type !== "Cancellation", withdraw: true, reject: type !== "Cancellation" }, ...extra,
});
const period = (id, extra = {}) => ({ id, kind: "initial", status: "active", carrierRef: "QBE-1", effective: "2026-01-01", expiry: "2026-12-31", plan: "Plan A",
    provider: "QBE", requestedEffective: "2026-01-01", invoice: null, recordedBy: person("Mei Wong"), carrierAcceptanceNote: null, version: 1, gapBefore: null,
    openCancellation: null, amendments: [], cancellation: null, withdrawnCancellation: null, voided: null, ...extra });
const ACTIONS = (linked) => [
    { key: "renew", enabled: true }, { key: "newPolicy", enabled: false, why: "onlyAfterExpiredOrCancelled" }, { key: "addCoverage", enabled: true },
    { key: "change", enabled: true }, { key: "requestCancel", enabled: true, danger: true }, { key: "editRequest", enabled: true },
    { key: "cancelRequest", enabled: true }, { key: "reject", enabled: true }, { key: "dismissReview", enabled: true }, { key: "correctStatus", enabled: true },
    { key: "changeCsOwner", enabled: !linked, why: linked ? "followsContract" : null }, { key: "changeBranch", enabled: !linked, why: linked ? "followsContract" : null },
];
const record = (extra = {}) => ({
    id: 101, ref: "IN-HKH000101", factsVersion: 1,
    header: { workerName: "Siti Aminah", coverage: { label: "active", code: "active", fact: "fact.active", factDate: null } },
    summary: { plan: "Plan A", carrierRef: "QBE-1", periodKind: "current", period: { effective: "2026-01-01", expiry: "2026-12-31" },
        owner: { id: 31, name: "Mei Wong", active: true }, branch: BRANCHES[0], contract: { id: 55, number: "C-HKH000055" } },
    work: { openRequests: ["Renew"], attention: 1 }, relationship: { continuesFrom: null, followedBy: [] }, actions: ACTIONS(true),
    requests: [request(41, "Renew", { plan: "Plan A", planId: 185, targetPeriodStart: "2027-01-01", requestedEffective: "2027-01-01" })],
    issues: [{ id: 5, issue: "Refund on invoice I-1", scope: { kind: "record" }, openedAt: "2026-11-05T07:10:00Z", blocksRecord: false }],
    periods: [period(11)], voidedPeriods: [], coverages: [], riders: [],
    parties: { worker: { id: 101, name: "Siti Aminah" }, employer: { id: 201, name: "Chan Tai Man" }, contract: { id: 55, number: "C-HKH000055" }, previously: [], addressOnPolicy: "Flat 3B" },
    renewal: { targetStart: "2027-01-01", planId: 185, nextConfirmed: null, grace: { applies: false } },
    ...extra,
});
const dialog = (element, meta = META()) => render(<Provider store={storeWith(meta)}><MemoryRouter>{element}</MemoryRouter></Provider>);

describe("request dialogs follow Insurance.html forms.js", () => {
    it("Change policy: the subtitle says details stay unchanged until confirmed (no Qnect); Additional charge shows before a type; Name correction preselects the worker", () => {
        dialog(<ChangePolicyDialog record={record()} onClose={jest.fn()} onDone={jest.fn()} />);
        expect(screen.getByText("IN-HKH000101 · current policy details stay unchanged until you confirm the change")).toBeInTheDocument();
        expect(document.body.textContent).not.toMatch(/Qnect/);
        expect(screen.getByLabelText(/Additional charge/)).toBeInTheDocument();
        fireEvent.change(document.querySelector("#ins-chg-type"), { target: { value: "name" } });
        const who = document.querySelector("#ins-chg-person");
        expect(who.value).toBe("worker");
        expect(Array.from(who.options).map((o) => o.value)).toEqual(["worker", "employer"]);
    });

    it("Renew, Add coverage and Edit request give the prototype's date hint; Add coverage asks for the Coverage item", () => {
        const hint = "Enter the issued dates when you confirm the policy.";
        getEligibleInsuranceInvoicesAdminAPI.mockReturnValue(ok(INVOICES));
        const renew = dialog(<RenewPolicyDialog record={record()} onClose={jest.fn()} onDone={jest.fn()} />);
        expect(screen.getByText(hint)).toBeInTheDocument();
        renew.unmount();
        const cover = dialog(<AddCoverageDialog record={record()} onClose={jest.fn()} onDone={jest.fn()} />);
        expect(screen.getByText(hint)).toBeInTheDocument();
        expect(screen.getByText("Coverage item")).toBeInTheDocument();
        cover.unmount();
        dialog(<EditRequestDialog record={record()} request={record().requests[0]} onClose={jest.fn()} onDone={jest.fn()} />);
        expect(screen.getByText(hint)).toBeInTheDocument();
    });
});

describe("result dialogs follow Insurance.html forms.openConfirm", () => {
    const reassign = request(44, "Endorsement", {
        chargeApplies: "no", targetPeriodId: 11,
        endorsement: { type: "reassign", fields: { newWorkerId: 103, newContractId: 57 }, follows: { owner: "Kelvin Chow", branch: "CBO", contract: "C-CBO000057" },
            proposed: [{ field: "Worker", old: "Siti Aminah (W101)", new: "Dewi Lestari (W103)" }, { field: "Governing Contract", old: "C-HKH000055", new: "C-CBO000057" }] },
    });

    it("Confirm changes: \"Change to confirm\"; a refusal of the governing Contract sits with the change rows", async () => {
        recordInsuranceQbeResultAPI.mockImplementation(() => refused({ newContractId: "C-CBO000057 is not Dewi Lestari's Contract with Chan Tai Man." }));
        dialog(<RecordQbeResultDialog record={record()} request={reassign} onClose={jest.fn()} onDone={jest.fn()} />, META({ changeGoverningContract: true }));
        const title = screen.getByText("Change to confirm");
        fireEvent.click(screen.getAllByRole("button", { name: "Confirm changes" }).pop());
        await waitFor(() => expect(within(title.parentElement).getByRole("alert").textContent).toBe("C-CBO000057 is not Dewi Lestari's Contract with Chan Tai Man."));
        expect(within(title.parentElement).getByText("Governing Contract")).toBeInTheDocument();
        expect(ShowToast).toHaveBeenLastCalledWith("error", "Complete the required fields");
    });

    it("the duplicate-reference override reason comes before the change rows (dupBox follows the dates)", async () => {
        checkInsuranceCarrierRefAPI.mockReturnValue(ok({ duplicate: true, label: "IN-HKH000099" }));
        dialog(<RecordQbeResultDialog record={record()} request={reassign} onClose={jest.fn()} onDone={jest.fn()} />, META({ carrierRefDupOverride: true }));
        fireEvent.change(document.querySelector("#ins-qbe-ref"), { target: { value: "QBE-DUP-1" } });
        const reason = await screen.findByLabelText(/Override reason/, {}, { timeout: 2000 });
        const rows = screen.getByText("Change to confirm");
        // eslint-disable-next-line no-bitwise
        expect(reason.compareDocumentPosition(rows) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("without Change Governing Contract the confirm dialog says so for a reassignment that sets a governing Contract", () => {
        dialog(<RecordQbeResultDialog record={record()} request={reassign} onClose={jest.fn()} onDone={jest.fn()} />, META());
        expect(screen.getByText("Owner becomes Kelvin Chow and Branch CBO (from C-CBO000057).")).toBeInTheDocument();
        expect(screen.getByText("Changing the governing Contract is not available to you.")).toBeInTheDocument();
    });
});

describe("record dialogs", () => {
    it("Correct record opens the Activity tab when it succeeds", async () => {
        correctInsuranceRecordAPI.mockReturnValue(ok({}, "Correction recorded"));
        const onDone = jest.fn();
        dialog(<CorrectRecordDialog record={record()} onClose={jest.fn()} onDone={onDone} />);
        fireEvent.change(document.querySelector("#ins-fix-kind"), { target: { value: "confirmation" } });
        fireEvent.change(document.querySelector("#ins-fix-period"), { target: { value: "11" } });
        fireEvent.change(document.querySelector("#ins-fix-facts"), { target: { value: "QBE issued it in error." } });
        fireEvent.click(screen.getByRole("button", { name: "Record correction" }));
        await waitFor(() => expect(onDone).toHaveBeenCalledWith("activity"));
    });

    it("Complete portfolio handover: the shared inactive-staff cue beside an inactive owner (none for unknown), counts under the name, no \"(inactive)\"", async () => {
        getInsuranceOwnerPortfolioAPI.mockReturnValue(ok({ owners: [
            { id: 32, name: "Ann Lee", active: false, total: 7, standalone: 3 }, { id: 33, name: "Kelvin Chow", active: null, total: 3, standalone: 1 },
            { id: 31, name: "Mei Wong", active: true, total: 12, standalone: 4 },
        ] }));
        dialog(<PortfolioHandoverDialog onClose={jest.fn()} onContinue={jest.fn()} />);
        const input = await screen.findByRole("combobox");
        fireEvent.keyDown(input, { key: "ArrowDown" });
        const option = (name) => screen.getByText(name).closest('[role="option"]');
        expect(option("Ann Lee").querySelector('[data-staff-inactive="embedded"]')).not.toBeNull();
        expect(option("Ann Lee").textContent).toContain("Inactive staff account");
        expect(option("Kelvin Chow").querySelector("[data-staff-inactive]")).toBeNull();
        expect(option("Mei Wong").querySelector("[data-staff-inactive]")).toBeNull();
        expect(option("Ann Lee").textContent).toContain("7 record(s), 3 standalone");
        expect(document.body.textContent).not.toMatch(/\(inactive\)/i);
    });

    it("every Insurance dialog puts Cancel and its action at the right end, and uses the prototype's widths (860 wide, 480 narrow)", () => {
        const dir = "Views/Pages/insurance";
        const footers = ["record/RenewPolicyDialog", "record/AddCoverageDialog", "record/ChangePolicyDialog", "record/EditRequestDialog", "record/CloseRequestDialog",
            "record/RequestCancellationDialog", "record/RecordQbeResultDialog", "record/CancellationResultDialog", "record/CancellationReferenceDialog",
            "record/CloseIssueDialog", "record/CorrectRecordDialog", "ownership/ChangeOwnerDialog", "ownership/ChangeBranchDialog",
            "ownership/PortfolioHandoverDialog", "ownership/HandoverResultDialog", "new/CreateInsuranceWorkerDialog"];
        for (const f of footers) expect(read(`${dir}/${f}.js`)).toMatch(/<span className=\{styles\.spacer\} \/>/);
        for (const f of ["record/RenewPolicyDialog", "record/AddCoverageDialog", "record/ChangePolicyDialog", "record/EditRequestDialog", "record/RequestCancellationDialog",
            "record/RecordQbeResultDialog", "record/CancellationResultDialog", "record/CorrectRecordDialog", "ownership/ChangeOwnerDialog", "ownership/PortfolioHandoverDialog"]) {
            expect(read(`${dir}/${f}.js`)).toMatch(/width=\{860\}/);
        }
        expect(read(`${dir}/record/CancellationReferenceDialog.js`)).toMatch(/width=\{480\}/);
        expect(read(`${dir}/shared/InsuranceForms.module.css`)).toMatch(/\.spacer \{ flex: 1; \}/);
    });
});

/* ---------------- focus contract on the record page ---------------- */

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const openRecord = async (view, url) => {
    signIn();
    getInsuranceRecordViewAdminAPI.mockReturnValue(ok({ record: view, remarks: [] }));
    getInsuranceMetaAPI.mockReturnValue(ok(META()));
    getInsuranceRecordHistoryAPI.mockReturnValue(ok({ events: [], total: 0 }));
    getSourceTasksAPI.mockReturnValue(ok({ outstanding_count: 0 }));
    getEligibleInsuranceInvoicesAdminAPI.mockReturnValue(ok(INVOICES));
    getInsuranceOwnerRecipientsAPI.mockReturnValue(ok({ recipients: [{ id: 34, name: "Tom Yip", title: "CS", branches: [BRANCHES[2]], ownershipBranchIds: [4], accessBranchIds: [4] }] }));
    getContracts.mockReturnValue(Promise.resolve({ data: { data: { data: [] } } }));
    const store = configureStore({ reducer: { insurance, remarks, users } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const utils = render(
        <QueryClientProvider client={queryClient}>
            <Provider store={store}>
                <MemoryRouter initialEntries={[url || `/insurance/${view.ref}`]}>
                    <Suspense fallback={null}>
                        <Routes><Route path="/insurance/:ref" element={<InsuranceRecordPage />} /></Routes>
                    </Suspense>
                </MemoryRouter>
            </Provider>
        </QueryClientProvider>,
    );
    await screen.findByRole("heading", { name: view.header.workerName }, { timeout: 8000 });
    await waitFor(() => expect(getInsuranceMetaAPI).toHaveBeenCalled());
    return utils;
};
/* opens a dialog from `open()`, then: focus inside, Tab and Shift+Tab stay inside, the page behind is inert, Escape closes, focus
   returns to `returnTo` (the Actions button for a menu entry: the menu closes onto it before the dialog opens) */
const focusContract = async (open, title, returnTo) => {
    open();
    const box = await screen.findByRole("dialog", { name: title }, { timeout: 3000 });
    await waitFor(() => expect(box.contains(document.activeElement)).toBe(true));
    expect(document.querySelector(".wkd-body").hasAttribute("inert")).toBe(true);
    const list = Array.from(box.querySelectorAll(FOCUSABLE));
    list[list.length - 1].focus();
    fireEvent.keyDown(document.activeElement, { key: "Tab" });
    expect(document.activeElement).toBe(list[0]);
    fireEvent.keyDown(document.activeElement, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(list[list.length - 1]);
    fireEvent.keyDown(document.activeElement, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: title })).toBeNull());
    expect(document.querySelector(".wkd-body").hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(returnTo());
};
const actions = () => screen.getByRole("button", { name: /^Actions/ });
const fromMenu = (label) => () => {
    fireEvent.click(actions());
    fireEvent.click(Array.from(document.querySelectorAll("[role='menuitem']")).find((m) => m.textContent.startsWith(label)));
};
const rowButton = (id, label) => () => Array.from(document.querySelectorAll(`[data-request="${id}"] button`)).find((b) => b.textContent === label);

describe("every dialog keeps the focus contract (focus in, Tab inside, Escape, inert background, focus back to its opener)", () => {
    it("Actions menu dialogs on a Contract-linked record", async () => {
        await openRecord(record());
        for (const [label, title] of [["Renew", "Renew policy"], ["Add coverage", "Add coverage"], ["Change policy", "Change policy"],
            ["Request cancellation", "Request cancellation"], ["Correct record", "Correct record"]]) {
            // eslint-disable-next-line no-await-in-loop
            await focusContract(fromMenu(label), title, actions);
        }
    });

    it("request row dialogs: Confirm, Edit, Withdraw, Reject, and Close issue beside its issue", async () => {
        await openRecord(record(), "/insurance/IN-HKH000101?tab=requests");
        for (const [label, title] of [["Confirm renewal", "Confirm renewal"], ["Edit", "Edit request"], ["Withdraw request", "Withdraw request"], ["Reject", "Reject request"]]) {
            const opener = rowButton(41, label);
            // eslint-disable-next-line no-await-in-loop
            await focusContract(() => { opener().focus(); fireEvent.click(opener()); }, title, opener);
        }
        fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
        const closeIssue = () => document.querySelector('[data-issue="5"] button');
        await focusContract(() => { closeIssue().focus(); fireEvent.click(closeIssue()); }, "Close issue", closeIssue);
    });

    it("standalone record: Change CS Owner, Change Branch, Record cancellation outcome and Add QBE reference", async () => {
        const standalone = record({
            ref: "IN-TKO000113", summary: { ...record().summary, contract: null, branch: BRANCHES[2] }, actions: ACTIONS(false), parties: { ...record().parties, contract: null },
            requests: [request(51, "Cancellation", { cancellationPeriod: { id: 11, version: 1, effective: "2026-01-01", expiry: "2026-12-31", carrierRef: "QBE-1" }, reason: "Employment terminated", requestedEffective: "2026-12-01" })],
            periods: [period(11, { status: "ending", cancellation: { effective: "2026-12-01", requestedEffective: "2026-12-01", reason: "Employment terminated", fromInception: false,
                carrierRef: null, legacy: false, recordedBy: person("Mei Wong"), addReference: true } })],
        });
        await openRecord(standalone);
        for (const [label, title] of [["Change CS Owner", "Change CS Owner"], ["Change Branch", "Change Branch"]]) {
            // eslint-disable-next-line no-await-in-loop
            await focusContract(fromMenu(label), title, actions);
        }
        const addRef = () => screen.getByRole("button", { name: "Add QBE reference" });
        await focusContract(() => { addRef().focus(); fireEvent.click(addRef()); }, "QBE reference (cancellation)", addRef);
        fireEvent.click(screen.getByRole("tab", { name: "Requests" }));
        const outcome = rowButton(51, "Record cancellation outcome");
        await focusContract(() => { outcome().focus(); fireEvent.click(outcome()); }, "Record cancellation outcome", outcome);
    });
});

/* ---------------- stale removal, shared select, strings ---------------- */

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));

describe("no wizard steps, Next Step, quote, Qnect or \"sent to QBE\" anywhere in Insurance", () => {
    it("the four-step wizard and its strings are gone", () => {
        expect(fs.existsSync(path.join(SRC, "Views/Pages/insurance/new/NewInsuranceWizard.js"))).toBe(false);
        for (const k of ["key_ins_step_parties", "key_ins_step_plan_date", "key_ins_step_invoice", "key_ins_step_review", "key_ins_contract_step_update_notice",
            "key_ins_history_unchanged", "key_ins_submit_request", "key_ins_inactive_paren", "key_ins_change_sub", "key_ins_requested_date_hint",
            "key_ins_portfolio_owner_option", "key_ins_evisa_payment_date", "key_ins_record_created", "key_ins_qbe_result_recorded"]) {
            expect(en).not.toHaveProperty(k);
            expect(zhHK).not.toHaveProperty(k);
        }
        const css = read("Views/Pages/insurance/shared/InsuranceForms.module.css");
        expect(css).not.toMatch(/\.stepper|\.stepNum|\.stepDone/);
    });

    /* PROMPT 9 F-5 (owner, 12 Nov 2026): "Record QBE result" joined the list after key_ins_blocks_record still read "Blocks Record
       QBE result"; the result buttons are Confirm policy / renewal / additional coverage / changes and Record cancellation outcome */
    it("no Insurance screen or string speaks of Next Step, a quote, Qnect, sending to QBE or Record QBE result", () => {
        const files = walk(path.join(SRC, "Views/Pages/insurance")).filter((f) => /\.js$/.test(f));
        /* code and copy only: a comment may record what was retired */
        const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
        for (const f of files) {
            const text = code(fs.readFileSync(f, "utf8"));
            expect([f, /Next Step|key_ins_step_|stepper|Qnect|\bquote\b|sent to QBE|sentToInsurer|key_continue|Record QBE result/i.test(text)]).toEqual([f, false]);
        }
        for (const [lang, dict] of [["en", en], ["zh_HK", zhHK]]) {
            const bad = Object.entries(dict).filter(([k, v]) => k.startsWith("key_ins_") && /Qnect|next step|\bquote\b|sent to QBE|Record QBE result/i.test(String(v)));
            expect([lang, bad]).toEqual([lang, []]);
        }
    });
});

describe("the kit select shows an option's adornment beside its label", () => {
    it("the adornment renders next to the label; filtering still reads the plain label", () => {
        render(<SearchSelect inputId="pick" value="" onChange={() => {}} options={[
            { value: "32", label: "Ann Lee", adornment: <span data-testid="cue" />, sub: "7 record(s)" },
            { value: "31", label: "Mei Wong", sub: "12 record(s)" },
        ]} />);
        const input = screen.getByRole("combobox");
        fireEvent.keyDown(input, { key: "ArrowDown" });
        expect(screen.getByText("Ann Lee").closest('[role="option"]').querySelector('[data-testid="cue"]')).not.toBeNull();
        fireEvent.change(input, { target: { value: "ann" } });
        expect(screen.getByText("Ann Lee")).toBeInTheDocument();
        expect(screen.queryByText("Mei Wong")).toBeNull();
    });
});

describe("every new string is in en and zh_HK (English until the zh_HK review)", () => {
    it("the Part C strings", () => {
        const NEW = {
            key_ins_plan_and_requested_date: "Plan and requested date",
            key_ins_create_request: "Create request",
            key_ins_create_request_note: "Create the request now. Record the policy number and issued dates when confirmed.",
            key_ins_issued_dates_hint: "Enter the issued dates when you confirm the policy.",
            key_ins_override_reference_branch: "Override new Insurance reference branch",
            key_ins_reference_branch: "Reference branch",
            key_ins_reference_branch_hint: "Insurance Ref is immutable after issuance. Changing Branch later never renumbers the record.",
            key_ins_err_select_reference_branch: "Select a reference Branch within your authorised branches",
            key_ins_coverage_item: "Coverage item",
            key_ins_change_policy_sub: "{{ref}} · current policy details stay unchanged until you confirm the change",
            key_ins_change_to_confirm: "Change to confirm",
            key_ins_portfolio_owner_counts: "{{n}} record(s), {{s}} standalone",
            // owner decisions P6C-1 / P6C-2 (11 Nov 2026)
            key_ins_request_created: "{{ref}} — request created",
            key_ins_confirmed_policy: "Confirmed policy",
            key_ins_confirmed_renewal: "Confirmed renewal",
            key_ins_confirmed_additional_coverage: "Confirmed additional coverage",
            key_ins_confirmed_change_applied: "Confirmed change applied",
            key_ins_cancellation_outcome_recorded: "Cancellation outcome recorded",
            key_ins_confirmed_address_on_policy: "Confirmed address on policy",
            key_ins_confirmed_name_on_policy: "Confirmed name on policy",
            key_ins_err_enter_confirmed_address: "Enter the confirmed address",
            key_ins_err_enter_confirmed_name: "Enter the confirmed name",
        };
        for (const [k, v] of Object.entries(NEW)) {
            expect([k, en[k]]).toEqual([k, v]);
            expect([k, zhHK[k]]).toEqual([k, v]);
        }
    });
});

/* ---------------- owner decisions on Part C (11 Nov 2026) ---------------- */

const addressChange = request(43, "Endorsement", {
    chargeApplies: "no", targetPeriodId: 11,
    endorsement: { type: "address", fields: { newAddress: "Flat 1, Requested Court" }, follows: null,
        proposed: [{ field: "Address on policy", old: "Flat 3B", new: "Flat 1, Requested Court" }] },
});
const nameChange = request(45, "Endorsement", {
    chargeApplies: "no", targetPeriodId: 11,
    endorsement: { type: "name", fields: { person: "worker", newName: "Siti Requested Name" }, follows: null,
        proposed: [{ field: "Worker name on policy", old: "Siti Aminah", new: "Siti Requested Name" }] },
});
const confirmButton = (label) => screen.getAllByRole("button", { name: label }).pop();

describe("P6C-1: success words follow Insurance.html", () => {
    it("Confirm changes, Confirm policy and Record cancellation outcome say what the prototype says when the server sends no message", async () => {
        recordInsuranceQbeResultAPI.mockReturnValue(ok({}, ""));
        const changes = dialog(<RecordQbeResultDialog record={record()} request={addressChange} onClose={jest.fn()} onDone={jest.fn()} />);
        fireEvent.click(confirmButton("Confirm changes"));
        await waitFor(() => expect(ShowToast).toHaveBeenLastCalledWith("success", "Confirmed change applied"));
        changes.unmount();

        const fresh = request(61, "New", { plan: "Plan A", planId: 185, requestedEffective: "2026-11-20" });
        const policy = dialog(<RecordQbeResultDialog record={record()} request={fresh} onClose={jest.fn()} onDone={jest.fn()} />);
        fireEvent.change(document.querySelector("#ins-qbe-ref"), { target: { value: "QBE-NEW-1" } });
        fireEvent.change(document.querySelector("#ins-qbe-exp"), { target: { value: "19/11/2027" } });
        fireEvent.click(confirmButton("Confirm policy"));
        await waitFor(() => expect(ShowToast).toHaveBeenLastCalledWith("success", "Confirmed policy"));
        policy.unmount();

        recordInsuranceCancellationResultAPI.mockReturnValue(ok({}, ""));
        const cxl = request(51, "Cancellation", { cancellationPeriod: { id: 11, version: 1, effective: "2026-01-01", expiry: "2026-12-31", carrierRef: "QBE-1" },
            reason: "Employment terminated", requestedEffective: "2026-12-01" });
        dialog(<CancellationResultDialog record={record()} request={cxl} onClose={jest.fn()} onDone={jest.fn()} />);
        fireEvent.click(document.querySelector('input[type="radio"][value="declined"]'));
        fireEvent.click(confirmButton("Record cancellation outcome"));
        await waitFor(() => expect(ShowToast).toHaveBeenLastCalledWith("success", "Cancellation outcome recorded"));
    });

    it("New Insurance says \"{ref} — request created\" when the server sends no message", async () => {
        resolvesParties();
        createInsuranceRecordAPI.mockReturnValue(ok({ ref: "IN-HKH000130" }, ""));
        const { container } = await openNew({ meta: META({ referenceBranchOverride: false }), state: PARTY });
        await fillStandalone(container);
        fireEvent.click(screen.getByRole("button", { name: "Create request" }));
        await waitFor(() => expect(ShowToast).toHaveBeenLastCalledWith("success", "IN-HKH000130 — request created"));
    });
});

describe("P6C-2: Confirm changes records the confirmed address / name", () => {
    it("the confirmed address is pre-filled with the requested one, editable, and is what the confirmation sends", async () => {
        recordInsuranceQbeResultAPI.mockReturnValue(ok({}, "Confirmed change applied"));
        dialog(<RecordQbeResultDialog record={record()} request={addressChange} onClose={jest.fn()} onDone={jest.fn()} />);
        const field = screen.getByLabelText(/Confirmed address on policy/);
        expect(field.value).toBe("Flat 1, Requested Court");
        fireEvent.change(field, { target: { value: "Flat 2, Accepted House" } });
        fireEvent.click(confirmButton("Confirm changes"));
        await waitFor(() => expect(recordInsuranceQbeResultAPI).toHaveBeenCalledTimes(1));
        expect(recordInsuranceQbeResultAPI.mock.calls[0][0]).toMatchObject({ requestId: 43, change: { chargeApplies: "no", confirmedAddress: "Flat 2, Accepted House" } });
    });

    it("a blank confirmed address is refused beside the field and nothing is sent; the server's refusal also sits beside it", async () => {
        dialog(<RecordQbeResultDialog record={record()} request={addressChange} onClose={jest.fn()} onDone={jest.fn()} />);
        const field = screen.getByLabelText(/Confirmed address on policy/);
        fireEvent.change(field, { target: { value: "  " } });
        fireEvent.click(confirmButton("Confirm changes"));
        expect(field.closest("div").textContent).toContain("Enter the confirmed address");
        expect(recordInsuranceQbeResultAPI).not.toHaveBeenCalled();

        recordInsuranceQbeResultAPI.mockImplementation(() => refused({ confirmedAddress: "Enter the confirmed address" }));
        fireEvent.change(field, { target: { value: "Flat 9" } });
        fireEvent.click(confirmButton("Confirm changes"));
        await waitFor(() => expect(recordInsuranceQbeResultAPI).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Enter the confirmed address"));
    });

    it("the confirmed name is pre-filled with the requested name and sent", async () => {
        recordInsuranceQbeResultAPI.mockReturnValue(ok({}, ""));
        dialog(<RecordQbeResultDialog record={record()} request={nameChange} onClose={jest.fn()} onDone={jest.fn()} />);
        const field = screen.getByLabelText(/Confirmed name on policy/);
        expect(field.value).toBe("Siti Requested Name");
        fireEvent.change(field, { target: { value: "Siti Accepted Name" } });
        fireEvent.click(confirmButton("Confirm changes"));
        await waitFor(() => expect(recordInsuranceQbeResultAPI).toHaveBeenCalledTimes(1));
        expect(recordInsuranceQbeResultAPI.mock.calls[0][0].change).toMatchObject({ confirmedName: "Siti Accepted Name" });
    });
});

describe("P6C-3: Cancel on New Insurance", () => {
    const contract57 = { id: 57, number: "C-CBO000057", employerId: 203, employerName: "Wong Siu Ming", workerId: 103, workerName: "Dewi Lestari", workerCode: "W103",
        ownerName: "Kelvin Chow", branchName: "Causeway Bay", branchCode: "CBO", evisaDate: null, stage: "not_ready", insuranceRef: null };

    it("Contract entry returns to the Contract the person came from (differs from the prototype; OPEN_QUESTIONS)", async () => {
        await openNew({ url: "/insurance/new?contract=C-CBO000057&entry=contract", state: { contract: contract57 } });
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(await screen.findByTestId("contract-page")).toBeInTheDocument();
    });

    it("a new policy opened from its record returns to that record; a standalone form returns to Insurance", async () => {
        getInsuranceRecordAPI.mockReturnValue(ok(record({ ref: "IN-HKH000106", actions: [{ key: "newPolicy", enabled: true }] })));
        lookupInsuranceContractAPI.mockReturnValue(ok({ ...contract57, id: 55, number: "C-HKH000055", insuranceRef: "IN-HKH000106" }));
        const one = await openNew({ url: "/insurance/new?prior=IN-HKH000106&contract=C-HKH000055&entry=contract" });
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(await screen.findByTestId("record-page")).toBeInTheDocument();
        one.unmount();
        await openNew();
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(await screen.findByTestId("insurance-page")).toBeInTheDocument();
    });
});

describe("P6C-6: the governing Contract in Change policy", () => {
    it("is offered only to holders of insurance_change_governing_contract (the server refuses it without the key)", () => {
        const pick = () => fireEvent.change(document.querySelector("#ins-chg-type"), { target: { value: "reassign" } });
        const holder = dialog(<ChangePolicyDialog record={record()} onClose={jest.fn()} onDone={jest.fn()} />, META({ changeGoverningContract: true }));
        pick();
        expect(screen.getByLabelText(/Governing Contract/)).toBeInTheDocument();
        holder.unmount();
        dialog(<ChangePolicyDialog record={record()} onClose={jest.fn()} onDone={jest.fn()} />, META({ changeGoverningContract: false }));
        pick();
        expect(screen.getByText("Replacement worker")).toBeInTheDocument();
        expect(screen.queryByLabelText(/Governing Contract/)).toBeNull();
        expect(screen.queryByText("Must be the replacement worker's Contract.")).toBeNull();
        expect(getContracts).not.toHaveBeenCalled();
    });
});
