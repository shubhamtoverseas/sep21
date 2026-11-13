import React, { Suspense } from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";
import zhHK from "../../../public/locales/zh_HK/translation.json";

/* Insurance revamp PROMPT 6 Part B — the record page (Insurance.html details.js; Insurance.txt INS08; UI Correction C1–C4):
   a Context rail with Remarks (drawer) and Follow Up; Overview / Requests / Activity only, Activity from /history and old
   History / Ownership links opening it; the header's small Copy control (specific accessible name, honest toast) and one
   Coverage status tag; Open requests tags and the Needs attention note; the summary strip with CS Owner and Branch as two
   facts (the shared inactive-staff cue on CS Owner); request rows with their own buttons and no "Open" badge; Close issue
   beside the issue; an Actions menu of at most eight record-level entries. */

jest.mock("../../services/insurance", () => ({
    getInsuranceRecordAPI: jest.fn(), getInsuranceRecordHistoryAPI: jest.fn(), getInsuranceMetaAPI: jest.fn(),
}));
jest.mock("../../services/insuranceAdmin", () => ({ getInsuranceRecordViewAdminAPI: jest.fn(), getInsuranceRecordViewByIdAdminAPI: jest.fn() }));
jest.mock("../../services/remarks", () => ({ getInsuranceRemarks: jest.fn() }));
jest.mock("../../services/calendar", () => ({ getSourceTasksAPI: jest.fn() }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
/* eslint-disable import/first */
import { getInsuranceMetaAPI, getInsuranceRecordHistoryAPI } from "../../services/insurance";
import { getInsuranceRecordViewAdminAPI } from "../../services/insuranceAdmin";
import { getSourceTasksAPI } from "../../services/calendar";
import { ShowToast } from "../../components/show-toast/ShowToast";
import insurance from "../../redux/Slices/insurance/InsuranceSlice";
import remarks from "../../redux/Slices/remarks/RemarkSlice";
import InsuranceRecordPage from "../../Views/Pages/insurance/record/InsuranceRecordPage";
import { RECORD_TABS, menuActionGroups, recordTabFromQuery } from "../../Views/Pages/insurance/record/insuranceRecordConfig";
/* eslint-enable import/first */

const SRC = path.resolve(__dirname, "../..");

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
afterEach(() => { jest.resetAllMocks(); sessionStorage.clear(); });

const ok = (data, message = "") => Promise.resolve({ data: { status: true, message, data } });
const person = (name, at = "2026-11-01T02:00:00Z") => ({ name, at });
const request = (id, type, extra = {}) => ({
    id, type, state: "pending", version: 1, submittedBy: person("Ann Lee"), recordedBy: null, closed: null, periodEnded: false, attention: false,
    buttons: { record: true, edit: type !== "Cancellation", withdraw: true, reject: type !== "Cancellation" }, ...extra,
});
const ACTIONS = (linked) => [
    { key: "renew", group: "start", enabled: true }, { key: "newPolicy", group: "start", enabled: false, why: "onlyAfterExpiredOrCancelled" },
    { key: "addCoverage", group: "start", enabled: true }, { key: "change", group: "start", enabled: true },
    { key: "requestCancel", group: "start", enabled: true, danger: true },
    { key: "editRequest", group: "manage", enabled: true }, { key: "cancelRequest", group: "manage", enabled: true },
    { key: "reject", group: "manage", enabled: true }, { key: "dismissReview", group: "manage", enabled: true },
    { key: "correctStatus", group: "admin", enabled: true },
    { key: "changeCsOwner", group: "admin", enabled: !linked, why: linked ? "followsContract" : null },
    { key: "changeBranch", group: "admin", enabled: !linked, why: linked ? "followsContract" : null },
];
const record = (extra = {}) => ({
    id: 101, ref: "IN-HKH000101", factsVersion: 1,
    header: { workerName: "Siti Aminah", coverage: { label: "active", code: "ending", fact: "fact.ends", factDate: "2026-12-01" } },
    summary: { plan: "Plan A", carrierRef: "QBE-1", periodKind: "current", period: { effective: "2026-01-01", expiry: "2026-12-31" },
        owner: { id: 31, name: "Mei Wong", active: true }, branch: { id: 1, code: "HKH", name: "Hung Hom" }, contract: { id: 55, number: "C-HKH000055" } },
    work: { openRequests: ["Renew", "Coverage", "Endorsement"], attention: 1 },
    relationship: { continuesFrom: null, followedBy: [] },
    actions: ACTIONS(true),
    requests: [
        request(41, "Renew", { plan: "Plan A", targetPeriodStart: "2027-01-01" }),
        request(42, "Coverage", { coverageItem: "Dental", attention: true }),
        request(43, "Endorsement", { endorsement: { type: "address", description: "address → Flat 12A" }, remarks: "Employer moved; QBE needs the address." }),
        request(31, "New", { state: "confirmed", plan: "Plan A", buttons: null }),
    ],
    issues: [{ id: 5, issue: "Refund on invoice I-1", scope: { kind: "record" }, openedAt: "2026-11-05T07:10:00Z", blocksRecord: false }],
    periods: [{ id: 11, kind: "initial", status: "active", carrierRef: "QBE-1", effective: "2026-01-01", expiry: "2026-12-31", plan: "Plan A", provider: "QBE",
        requestedEffective: "2026-01-01", invoice: null, recordedBy: person("Mei Wong"), carrierAcceptanceNote: null, version: 1, gapBefore: null,
        openCancellation: null, amendments: [], cancellation: null, withdrawnCancellation: null, voided: null }],
    voidedPeriods: [], coverages: [], riders: [],
    parties: { worker: { name: "Siti Aminah" }, employer: { name: "Chan Tai Man" }, contract: { id: 55, number: "C-HKH000055" }, previously: [], addressOnPolicy: null },
    renewal: { targetStart: "2027-01-01", planId: 1, nextConfirmed: null, grace: { applies: false } },
    ...extra,
});
const REMARKS = [
    { id: 9, remarks: "Employer confirmed the new address by phone.", remarks_by: 7, remarks_by_name: "Mei Wong", created_at: "2026-11-09T02:00:00Z" },
    { id: 8, remarks: "QBE asked for the contract copy.", remarks_by: 7, remarks_by_name: "Mei Wong", created_at: "2026-11-04T02:00:00Z" },
];

const openRecord = async (view = record(), { url = "/insurance/IN-HKH000101", admin = true } = {}) => {
    sessionStorage.setItem("user", JSON.stringify({ data: { id: 1, role: { id: admin ? 1 : 7 } } }));
    getInsuranceRecordViewAdminAPI.mockReturnValue(ok({ record: view, remarks: REMARKS }));
    getInsuranceMetaAPI.mockReturnValue(ok({ access: true, caps: { writeRemarks: true } }));
    getInsuranceRecordHistoryAPI.mockReturnValue(ok({ events: [{ id: 2, at: "2026-10-20T02:00:00Z", actor: "Mei Wong", action: "CS Owner changed", summary: "Kelvin Chow → Mei Wong", changes: [] }], total: 1 }));
    getSourceTasksAPI.mockReturnValue(ok({ outstanding_count: 2 }));
    const store = configureStore({ reducer: {
        insurance, remarks, users: (state = { permissionList: { data: [] }, ownerOnboardingList: { cs_of_contract_ids: [] } }) => state,
    } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: false } } });
    const utils = render(
        <QueryClientProvider client={queryClient}>
            <Provider store={store}>
                <MemoryRouter initialEntries={[url]}>
                    <Suspense fallback={null}>
                        <Routes><Route path="/insurance/:ref" element={<InsuranceRecordPage />} /></Routes>
                    </Suspense>
                </MemoryRouter>
            </Provider>
        </QueryClientProvider>,
    );
    await screen.findByRole("heading", { name: view.header.workerName });
    return utils;
};
const tabs = () => screen.getAllByRole("tab").map((t) => t.textContent);
const openActions = () => fireEvent.click(screen.getByRole("button", { name: /^Actions/ }));
const menuItems = () => Array.from(document.querySelectorAll("[role='menuitem']"));
/* a menu item's label without the reason line under it */
const labelOf = (m) => { const sub = m.querySelector("[data-menu-sub]"); return sub ? m.textContent.slice(0, m.textContent.length - sub.textContent.length) : m.textContent; };

describe("tabs: Overview, Requests, Activity only (INS08-1/2/3)", () => {
    it("offers three tabs; no History or Ownership tab", async () => {
        await openRecord();
        expect(tabs()).toEqual(["Overview", "Requests", "Activity"]);
        expect(RECORD_TABS.map((t) => t.key)).toEqual(["overview", "requests", "activity"]);
    });

    it("Activity reads the record's history (R3); older ?tab=history and ?tab=ownership links open it", async () => {
        for (const old of ["activity", "history", "ownership"]) {
            const { container, unmount } = await openRecord(record(), { url: `/insurance/IN-HKH000101?tab=${old}` });
            expect(await within(container.querySelector('[data-panel="activity"]')).findByText("CS Owner changed")).toBeInTheDocument();
            expect(screen.getByRole("tab", { name: "Activity" }).getAttribute("aria-selected")).toBe("true");
            unmount();
        }
        expect(recordTabFromQuery("ownership")).toBe("activity");
        expect(recordTabFromQuery("bogus")).toBe("overview");
    });
});

describe("Context rail: Remarks and Follow Up (INS08-4, C4)", () => {
    it("Remarks shows the count and the latest remark and opens the Remarks drawer; the Overview has no remarks panel", async () => {
        const { container } = await openRecord();
        const card = container.querySelector('[data-ins-context="remarks"]');
        expect(card.textContent).toContain("Remarks");
        expect(card.querySelector("[data-remarks-count]").textContent).toBe("2");
        expect(card.textContent).toContain("Employer confirmed the new address by phone.");
        expect(container.querySelector('#ins-tabpanel').textContent).not.toContain("QBE asked for the contract copy.");
        card.focus();
        fireEvent.click(card);
        const drawer = await screen.findByRole("dialog", { name: "Remarks" });
        expect(await within(drawer).findByText("QBE asked for the contract copy.")).toBeInTheDocument();
        // PROMPT 7: the drawer body is remarks.js, whose composer button reads "Add remark"
        expect(within(drawer).getByRole("button", { name: en.key_ins_add_remark })).toBeInTheDocument();
        fireEvent.keyDown(document.body, { key: "Escape" });
        await waitFor(() => expect(screen.queryByRole("dialog", { name: "Remarks" })).toBeNull());
        expect(document.activeElement).toBe(card);
    });

    it("an older shared Remarks link (?tab=remarks) opens the record on Overview with the Remarks drawer open (P6B-2)", async () => {
        const { container } = await openRecord(record(), { url: "/insurance/IN-HKH000101?tab=remarks" });
        const drawer = await screen.findByRole("dialog", { name: "Remarks" });
        expect(await within(drawer).findByText("QBE asked for the contract copy.")).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected")).toBe("true");
        fireEvent.keyDown(document.body, { key: "Escape" });
        await waitFor(() => expect(screen.queryByRole("dialog", { name: "Remarks" })).toBeNull());
        expect(document.activeElement).toBe(container.querySelector('[data-ins-context="remarks"]'));
    });

    it("Follow Up sits in Context with its count; the Actions menu has no Follow Up entry; request rows keep theirs", async () => {
        const { container } = await openRecord();
        const fu = await waitFor(() => { const el = container.querySelector('[data-ins-context="follow-up"]'); expect(el).not.toBeNull(); return el; });
        expect(fu.textContent).toContain("Follow Up");
        expect(fu.querySelector("[data-fu-count]").textContent).toBe("2");
        openActions();
        expect(menuItems().some((m) => /Follow Up/.test(m.textContent))).toBe(false);
        expect(container.querySelectorAll("[data-fu-request]").length).toBe(3);
    });
});

describe("header: name, Insurance Ref, small Copy control, one Coverage status tag, Back, Actions (C2)", () => {
    beforeEach(() => { Object.defineProperty(navigator, "clipboard", { value: { writeText: jest.fn() }, configurable: true }); });

    it("Copy has a specific accessible name, copies only the reference and says when it worked", async () => {
        await openRecord();
        navigator.clipboard.writeText.mockReturnValue(Promise.resolve());
        const copy = screen.getByRole("button", { name: "Copy insurance reference" });
        expect(copy.textContent).toBe("Copy");
        expect(document.body.textContent).not.toMatch(/Copy ref/);
        await act(async () => { fireEvent.click(copy); });
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("IN-HKH000101");
        expect(ShowToast).toHaveBeenCalledWith("success", "Reference copied.");
    });

    it("a refused copy is reported as a failure, not as copied", async () => {
        await openRecord();
        navigator.clipboard.writeText.mockReturnValue(Promise.reject(new Error("denied")));
        await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copy insurance reference" })); });
        expect(ShowToast).toHaveBeenCalledWith("error", "The browser did not allow copying. Select the reference and copy it manually.");
        expect(ShowToast).not.toHaveBeenCalledWith("success", expect.anything());
    });

    it("the identity line carries exactly one Coverage status tag", async () => {
        const { container } = await openRecord();
        const head = screen.getByRole("heading", { name: "Siti Aminah" }).parentElement;
        expect(head.querySelectorAll("[data-tone]")).toHaveLength(1);
        expect(head.querySelector("[data-coverage]").textContent).toBe("Active");
        expect(container.querySelector("[data-request-type]").closest("[data-work]")).not.toBeNull();
    });
});

describe("Actions menu: at most eight record-level entries (PROMPT 6; C1)", () => {
    it("lists only Renew, New policy, Add coverage, Change policy, Request cancellation, Correct record, Change CS Owner, Change Branch", async () => {
        await openRecord();
        openActions();
        expect(menuItems().map(labelOf)).toEqual([
            "Renew", "New policy", "Add coverage", "Change policy", "Request cancellation", "Correct record", "Change CS Owner", "Change Branch",
        ]);
        const labels = document.body.textContent;
        ["Start work", "Manage requests"].forEach((g) => expect(labels).not.toContain(g));
        expect(menuActionGroups(ACTIONS(true)).map((g) => g.map((i) => i.key))).toEqual([
            ["renew", "newPolicy", "addCoverage", "change", "requestCancel"], ["correctStatus"], ["changeCsOwner", "changeBranch"],
        ]);
        expect(menuActionGroups([{ key: "somethingNew", enabled: true }])).toEqual([]);
    });

    it("on a Contract-linked record the owner and branch entries are disabled with 'Follows Contract <number>' under the label", async () => {
        await openRecord();
        openActions();
        const owner = menuItems().find((m) => m.textContent.startsWith("Change CS Owner"));
        const branch = menuItems().find((m) => m.textContent.startsWith("Change Branch"));
        [owner, branch].forEach((m) => {
            expect(m.getAttribute("aria-disabled")).toBe("true");
            /* P6B-6: the reason is a second line under the label (prototype menuItem `why`), not beside it */
            expect(m.querySelector("[data-menu-sub]").textContent).toBe("Follows Contract C-HKH000055");
        });
        expect(menuItems().find((m) => labelOf(m) === "New policy").querySelector("[data-menu-sub]").textContent).toBe("Only after an expired or cancelled policy");
    });
});

describe("work strip and summary strip (INS08-6/7, C1, C3)", () => {
    it("Open requests are tags in their tones; Needs attention is the warning note, not a tag", async () => {
        const { container } = await openRecord();
        const strip = container.querySelector('[data-work="summary"]');
        expect([...strip.querySelectorAll("[data-request-type]")].map((el) => [el.textContent, el.dataset.tone]))
            .toEqual([["Renewal", "purple"], ["Additional coverage", "teal"], ["Change policy", "orange"]]);
        expect(strip.querySelector("[data-attention]").textContent).toBe("Needs attention (1)");
        expect([...strip.querySelectorAll("[data-tone]")].some((el) => /Needs attention/.test(el.textContent))).toBe(false);
    });

    it("the facts run Plan · Coverage status · QBE policy number · period · Contract · CS Owner · Branch; CS Owner and Branch are separate", async () => {
        const { container } = await openRecord();
        const facts = [...container.querySelectorAll("[data-fact]")];
        expect(facts.map((f) => f.dataset.fact)).toEqual(["plan", "coverage", "carrierRef", "period", "contract", "owner", "branch"]);
        expect(facts[1].firstChild.textContent).toBe("Coverage status");
        expect(facts[1].lastChild.textContent).toBe("ActiveEnds 30/11/26");
        expect(facts[3].firstChild.textContent).toBe("Current policy period");
        expect(facts[5].lastChild.textContent).toContain("Mei Wong");
        expect(facts[6].lastChild.textContent).toBe("Hung Hom");
        expect(facts[5].querySelector('[data-staff-inactive]')).toBeNull();
    });

    it("an explicitly inactive CS Owner gets the shared cue; unknown status gets none", async () => {
        const inactive = await openRecord(record({ summary: { ...record().summary, owner: { id: 32, name: "Ann Lee", active: false } } }));
        const owner = inactive.container.querySelector('[data-fact="owner"]');
        expect(within(owner).getByRole("img", { name: "Inactive staff account" })).toBeInTheDocument();
        expect(owner.textContent).not.toMatch(/Inactive(?! staff account)/);
        inactive.unmount();
        const unknown = await openRecord(record({ summary: { ...record().summary, owner: { id: 33, name: "Kelvin Chow", active: null } } }));
        expect(unknown.container.querySelector('[data-fact="owner"] [data-staff-inactive]')).toBeNull();
    });

    it("the Contract number links only for a viewer who can open that Contract", async () => {
        const allowed = await openRecord(record(), { admin: true });
        expect(allowed.container.querySelector('[data-fact="contract"] a').textContent).toBe("C-HKH000055");
        allowed.unmount();
        const denied = await openRecord(record(), { admin: false });
        expect(denied.container.querySelector('[data-fact="contract"] a')).toBeNull();
        expect(denied.container.querySelector('[data-fact="contract"]').textContent).toContain("C-HKH000055");
    });
});

describe("Overview: requests first, Needs attention, Policy periods; request rows (INS08-8/10, C4)", () => {
    it("orders the panels and names the dated section Policy periods", async () => {
        const { container } = await openRecord();
        expect([...container.querySelectorAll("#ins-tabpanel [data-panel]")].map((p) => p.dataset.panel)).toEqual(["pending", "review", "policy", "parties"]);
        expect(container.querySelector('[data-panel="policy"] h3').textContent).toBe("Policy periods");
    });

    it("an open request carries its type tag only (no Open badge), its own buttons and its Request details; a closed one its outcome", async () => {
        const { container } = await openRecord(record(), { url: "/insurance/IN-HKH000101?tab=requests" });
        const row = (id) => container.querySelector(`[data-request="${id}"]`);
        await waitFor(() => expect(row(43).querySelector("[data-fu-request]")).not.toBeNull());   /* Follow Up once the grant is confirmed */
        expect(row(43).querySelector("[data-request-state]")).toBeNull();
        expect(row(43).textContent).not.toMatch(/\bOpen\b/);
        expect(row(43).querySelector("[data-request-type]").dataset.tone).toBe("orange");
        expect(row(43).textContent).toContain("Request details: Employer moved; QBE needs the address.");
        expect(within(row(43)).getAllByRole("button").map((b) => b.textContent)).toEqual(["Confirm changes", "Edit", "Withdraw request", "Reject", "Follow Up"]);
        expect(row(42).querySelector('[data-note="attention"]').textContent).toBe("Needs attention");
        expect(row(42).querySelectorAll("[data-tone]")).toHaveLength(1);
        expect(row(31).querySelector("[data-request-state]").textContent).toBe("Result recorded");
    });

    it("an issue is warning text with its own Close issue", async () => {
        const { container } = await openRecord();
        const issue = container.querySelector('[data-issue="5"]');
        expect(issue.querySelector("[data-tone]")).toBeNull();
        expect(issue.querySelector("svg")).not.toBeNull();
        expect(within(issue).getByRole("button", { name: en.key_ins_action_close_issue })).toBeInTheDocument();
    });
});

describe("retired parts and strings", () => {
    it("the Ownership tab, the request picker and the old remarks card are gone; the admin no longer reads /ownership", () => {
        ["Views/Pages/insurance/record/RecordOwnershipTab.js", "Views/Pages/insurance/record/RequestPickerDialog.js",
            "components/remarks-collapse-view/RemarksCollapseView.js", "Views/Pages/insurance/record/RecordHistoryTab.js"]
            .forEach((f) => expect({ f, exists: fs.existsSync(path.join(SRC, f)) }).toEqual({ f, exists: false }));
        expect(fs.readFileSync(path.join(SRC, "services/insurance.js"), "utf8")).not.toMatch(/\/ownership/);
        expect(fs.readFileSync(path.join(SRC, "redux/Slices/insurance/InsuranceSlice.js"), "utf8")).not.toMatch(/fetchInsuranceRecordOwnership/);
    });

    it("new strings exist in en and zh_HK (English until reviewed); retired ones are gone from both", () => {
        const NEW = {
            key_ins_copy_insurance_reference: "Copy insurance reference", key_ins_reference_copied: "Reference copied.",
            key_ins_copy_not_allowed: "The browser did not allow copying. Select the reference and copy it manually.", key_ins_policy_periods: "Policy periods",
            key_ins_current_policy_period: "Current policy period", key_ins_next_policy_period: "Next policy period", key_ins_last_policy_period: "Last policy period",
        };
        Object.entries(NEW).forEach(([k, v]) => { expect(en[k]).toBe(v); expect(zhHK[k]).toBe(v); });
        ["key_ins_tab_history", "key_ins_tab_ownership", "key_ins_coverage_panel", "key_ins_owner_and_branch", "key_ins_ownership_history",
            "key_ins_owner_inactive", "key_ins_basis", "key_ins_no_changes", "key_ins_group_start", "key_ins_group_manage",
            "key_ins_select_request_edit", "key_ins_select_request_withdraw", "key_ins_select_request_reject", "key_ins_requests_open_select", "key_ins_withdraw",
            "key_ins_next_period", "key_ins_last_period"]
            .forEach((k) => { expect(en[k]).toBeUndefined(); expect(zhHK[k]).toBeUndefined(); });
    });
});
