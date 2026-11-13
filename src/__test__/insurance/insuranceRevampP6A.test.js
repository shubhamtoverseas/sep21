import React from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";
import zhHK from "../../../public/locales/zh_HK/translation.json";

/* Insurance revamp PROMPT 6 Part A (dashboard and lists): the prototype column order with the saved-preference migration
   (Q-19, "nextStep" → "openRequests"); five request tags in five tones, Additional coverage teal (INS08); Needs attention as a
   warning icon and plain text (C4); the shared inactive-staff cue only for an explicitly inactive account (C3, Q-21); the
   Contract column links only for a viewer who can open the Contract; the Worker / Employer lists and the Contract Insurance
   step show Coverage status, QBE policy number and Open requests. */

jest.mock("../../services/insurance", () => ({ getInsuranceMetaAPI: jest.fn(), searchInsuranceRecordsAPI: jest.fn() }));
jest.mock("../../services/insuranceAdmin", () => ({ searchInsuranceRecordsAdminAPI: jest.fn() }));
/* eslint-disable import/first */
import { getInsuranceMetaAPI, searchInsuranceRecordsAPI } from "../../services/insurance";
import { searchInsuranceRecordsAdminAPI } from "../../services/insuranceAdmin";
import insurance from "../../redux/Slices/insurance/InsuranceSlice";
import configData from "../../components/ReusableComponents/app-configs";
import { COLUMN_VIEW_STATE_KEYS } from "../../components/ReusableComponents/constants";
import { loadColumnKeys } from "../../services/commonService";
import StaffAccountCue, { staffAccountState } from "../../components/ui/StaffAccountCue";
import InsuranceDashboardPage from "../../Views/Pages/insurance/dashboard/InsuranceDashboardPage";
import { getInsuranceColumns } from "../../Views/Pages/insurance/dashboard/insuranceDashboardColumns";
import {
    COVERAGE_TONE, INSURANCE_VIEW_STATE_KEY, REQUEST_TONE, migrateInsurancePreferences,
} from "../../Views/Pages/insurance/dashboard/insuranceDashboardConfig";
import InsuranceWorkTags from "../../Views/Pages/insurance/shared/InsuranceWorkTags";
import WorkerInsuranceListing from "../../Views/Pages/WorkerPage/worker-detail/newui/listing/WorkerInsuranceListing";
import { InsuranceStepBody } from "../../Views/Pages/ProcessingPage/processing-detail/insurance-tab/ProcessingInsuranceTab";
/* eslint-enable import/first */

const SRC = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
beforeEach(() => { window.scrollTo = jest.fn(); });
afterEach(() => { jest.resetAllMocks(); localStorage.clear(); sessionStorage.clear(); });

const ok = (data) => Promise.resolve({ data: { status: true, data } });
const COLS_KEY = COLUMN_VIEW_STATE_KEYS.insurance;
const owner = (id, name, active) => ({ id, name, active });
const ROWS = [
    { id: 1, ref: "IN-1", worker: { name: "Siti" }, employer: { name: "Chan" }, coverage: { label: "active" }, carrierRef: "QBE-1",
        work: { openRequests: ["New", "Coverage"], attention: 2 }, owner: owner(31, "Ann Lee", false), branch: { name: "HK" }, contract: { id: 55, number: "C-55" } },
    { id: 2, ref: "IN-2", worker: { name: "Maria" }, employer: { name: "Lee" }, coverage: { label: "future" }, carrierRef: null,
        work: { openRequests: [], attention: 0 }, owner: owner(32, "Mei Wong", true), branch: { name: "HK" }, contract: null },
    { id: 3, ref: "IN-3", worker: { name: "Dewi" }, employer: { name: "Wong" }, coverage: { label: "none" }, carrierRef: null,
        work: { openRequests: ["Renew"], attention: 0 }, owner: owner(33, "Kelvin Chow", null), branch: { name: "HK" }, contract: null },
];
const META = {
    access: true, caps: { detailsView: true }, branches: [{ id: 1, name: "HK" }], search: { enabled: true }, datePresets: [], customDurations: [],
    owners: { offered: true, mine: false, staff: [owner(31, "Ann Lee", false), owner(32, "Mei Wong", true), owner(33, "Kelvin Chow", null)] },
};
const usersReducer = (state = { permissionList: { data: [] }, ownerOnboardingList: { cs_of_contract_ids: [] } }) => state;
const openDashboard = async ({ admin = false } = {}) => {
    sessionStorage.setItem("user", JSON.stringify({ data: { id: 1, role: { id: admin ? 1 : 7 } } }));
    getInsuranceMetaAPI.mockReturnValue(ok(META));
    searchInsuranceRecordsAdminAPI.mockReturnValue(ok({ rows: ROWS, total: 3, page: 1, limit: 25, cards: { active: 1, future: 1, none: 1 }, work: { requests: 3, attention: 2 } }));
    const store = configureStore({ reducer: { insurance, users: usersReducer } });
    const utils = render(<Provider store={store}><MemoryRouter><InsuranceDashboardPage /></MemoryRouter></Provider>);
    await screen.findByText("Siti");
    return utils;
};
const headers = (container) => [...container.querySelectorAll("thead th")].map((th) => th.textContent.trim()).filter(Boolean);

describe("five request tags in five tones; Starts later is teal (INS08, PROMPT6_CARRY §1)", () => {
    it("every request type has its own tone, Additional coverage teal — not New policy's blue", () => {
        expect(REQUEST_TONE).toEqual({ New: "blue-1", Renew: "purple", Coverage: "teal", Endorsement: "orange", Cancellation: "red" });
        expect(new Set(Object.values(REQUEST_TONE)).size).toBe(5);
        expect(COVERAGE_TONE).toEqual({ active: "green", future: "teal", none: "neutral" });
    });

    it("every tone Insurance uses exists in the shared tag sheet; teal is added, the tones other modules use are unchanged", () => {
        const css = read("Views/Pages/Invoice/InvoiceList.module.css");
        [...Object.values(REQUEST_TONE), ...Object.values(COVERAGE_TONE)].forEach((tone) => expect(css).toContain(`.statusTag[data-tone="${tone}"]`));
        expect(css).toContain('.statusTag[data-tone="teal"]       { --tag-fg: oklch(0.45 0.1 195);  --tag-bg: oklch(0.962 0.028 195); --tag-bd: oklch(0.85 0.05 195); }');
        expect(css).toContain('.statusTag[data-tone="blue-1"]     { --tag-fg: oklch(0.50 0.14 220); --tag-bg: oklch(0.965 0.035 220); --tag-bd: oklch(0.82 0.07 220); }');
        expect(css).toContain('.statusTag[data-tone="orange"]     { --tag-fg: oklch(0.47 0.17 58);  --tag-bg: oklch(0.965 0.055 70);  --tag-bd: oklch(0.81 0.105 64); }');
    });

    it("the Open requests chip's dot is teal, as in the prototype; Needs attention's stays orange", () => {
        const css = read("Views/Pages/insurance/dashboard/InsuranceDashboard.module.css");
        expect(css).toMatch(/\.dotRequests \{ background: oklch\(0\.45 0\.1 195\); \}/);
        expect(css).toMatch(/\.dotAttention \{ background: oklch\(0\.47 0\.17 58\); \}/);
    });
});

describe("Open requests and Needs attention (one component, C4)", () => {
    it("one tag per open request in its tone; Needs attention is a warning icon and plain text with the count, not a tag", () => {
        const { container } = render(<InsuranceWorkTags openRequests={["New", "Coverage", "Endorsement"]} attention={2} />);
        expect([...container.querySelectorAll("[data-request-type]")].map((el) => [el.textContent, el.dataset.tone]))
            .toEqual([["New policy", "blue-1"], ["Additional coverage", "teal"], ["Change policy", "orange"]]);
        const note = container.querySelector("[data-attention]");
        expect(note.textContent).toBe("Needs attention (2)");
        expect(note.querySelector("svg")).not.toBeNull();
        expect(note.hasAttribute("data-tone")).toBe(false);
        expect([...container.querySelectorAll("[data-tone]")].some((el) => /Needs attention/.test(el.textContent))).toBe(false);
        expect(container.textContent).not.toMatch(/\bOpen\b/);
    });

    it("nothing open shows the empty value", () => {
        expect(render(<InsuranceWorkTags openRequests={[]} attention={0} empty={<span>—</span>} />).container.textContent).toBe("—");
    });
});

describe("dashboard columns: the prototype order and the saved-preference migration (Q-19)", () => {
    it("the retired id 'nextStep' is no column; 'openRequests' is, labelled Open requests", () => {
        expect(getInsuranceColumns(["nextStep"])).toEqual([]);
        expect(getInsuranceColumns(["openRequests"]).map((c) => c.label)).toEqual(["Open requests"]);
        expect(configData.insuranceMandatoryColumnsTrans()).toEqual(["workerName", "insuranceRef", "qbePolicyNumber"]);
    });

    it("a saved Columns choice with 'nextStep' keeps Open requests after the migration, in both stores", () => {
        localStorage.setItem(COLS_KEY, JSON.stringify({ columns: ["workerName", "nextStep", "insuranceRef", "csOwner"] }));
        localStorage.setItem(INSURANCE_VIEW_STATE_KEY, JSON.stringify({ filters: { q: "" }, columns: ["nextStep", "branch"] }));
        migrateInsurancePreferences(COLS_KEY);
        expect(JSON.parse(localStorage.getItem(COLS_KEY)).columns).toEqual(["workerName", "openRequests", "insuranceRef", "csOwner"]);
        expect(JSON.parse(localStorage.getItem(INSURANCE_VIEW_STATE_KEY))).toEqual({ filters: { q: "" }, columns: ["openRequests", "branch"] });
        const all = configData.insuranceColumnsConfigTranslate({ translation: (k) => k }).map((o) => o.value);
        const cols = loadColumnKeys(COLS_KEY, configData.insuranceColumnsConfigTrans(), all, configData.insuranceMandatoryColumnsTrans());
        expect(getInsuranceColumns(cols).map((c) => c.key)).toEqual(["workerName", "insuranceRef", "openRequests", "qbePolicyNumber", "csOwner"]);
        migrateInsurancePreferences(COLS_KEY);
        expect(JSON.parse(localStorage.getItem(COLS_KEY)).columns).toEqual(["workerName", "openRequests", "insuranceRef", "csOwner"]);
    });

    it("the dashboard migrates before it reads: a user who saved columns under 'nextStep' still sees Open requests", async () => {
        localStorage.setItem(COLS_KEY, JSON.stringify({ columns: ["workerName", "employerName", "insuranceRef", "nextStep", "csOwner"] }));
        const { container } = await openDashboard();
        expect(headers(container)).toEqual(["Worker Name", "Employer Name", "Insurance Ref", "Open requests", "QBE policy number", "CS Owner"]);
    });

    it("the default set reads Worker · Employer · Insurance Ref · Open requests · Coverage status · QBE policy number · Activity · Policy period · CS Owner · Branch", async () => {
        const { container } = await openDashboard();
        expect(headers(container)).toEqual(["Worker Name", "Employer Name", "Insurance Ref", "Open requests", "Coverage status", "QBE policy number",
            "Activity", "Policy period", "CS Owner", "Branch"]);
    });
});

describe("Request filter (INS08-6: the five tags wherever request types are offered)", () => {
    it("offers each request type as its coloured tag; the trigger keeps the plain words", async () => {
        await openDashboard();
        fireEvent.click(screen.getByRole("button", { name: /Request · /i }));
        const tags = screen.getAllByRole("option").map((o) => o.querySelector("[data-request-type]")).filter(Boolean);
        expect(tags.map((t) => [t.textContent, t.dataset.tone])).toEqual([
            ["New policy", "blue-1"], ["Renewal", "purple"], ["Additional coverage", "teal"], ["Change policy", "orange"], ["Cancellation", "red"],
        ]);
        fireEvent.click(screen.getAllByRole("option").find((o) => o.textContent === "Additional coverage"));
        expect(screen.getByRole("button", { name: /Request · / }).textContent).toContain("Request · Additional coverage");
    });
});

describe("the shared inactive-staff cue (C3; Q-21: only staffs.status 0, sent as active false)", () => {
    it("only an explicit false is inactive; true is active; anything else is unknown and shows nothing", () => {
        expect([false, true, null, undefined, 0, "0", ""].map(staffAccountState)).toEqual(["inactive", "active", "unknown", "unknown", "unknown", "unknown", "unknown"]);
        expect(render(<StaffAccountCue active={null} />).container.innerHTML).toBe("");
        expect(render(<StaffAccountCue active />).container.innerHTML).toBe("");
    });

    it("standalone: a focus stop named 'Inactive staff account' whose explanation shows on hover and on keyboard focus", () => {
        render(<StaffAccountCue active={false} />);
        const cue = screen.getByRole("img", { name: "Inactive staff account" });
        expect(cue.getAttribute("tabindex")).toBe("0");
        expect(screen.queryByRole("tooltip")).toBeNull();
        fireEvent.focus(cue);
        expect(screen.getByRole("tooltip").textContent).toBe("Inactive staff account");
        fireEvent.blur(cue);
        expect(screen.queryByRole("tooltip")).toBeNull();
        fireEvent.mouseEnter(cue);
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
        fireEvent.mouseLeave(cue);
        expect(screen.queryByRole("tooltip")).toBeNull();
    });

    it("embedded: hidden symbol, the host's name carries the text, the host's focus shows the explanation", () => {
        render(<button type="button" role="option" aria-selected="false">Ann Lee<StaffAccountCue active={false} embedded /></button>);
        const option = screen.getByRole("option");
        expect(option.textContent).toBe("Ann Lee, Inactive staff account");
        expect(option.querySelector('[data-staff-inactive="embedded"]').getAttribute("aria-hidden")).toBe("true");
        fireEvent.focus(option);
        expect(screen.getByRole("tooltip").textContent).toBe("Inactive staff account");
    });

    it("dashboard CS Owner: the cue for the inactive owner only, normal name, no 'Inactive' text badge", async () => {
        const { container } = await openDashboard();
        const rows = [...container.querySelectorAll("tbody tr")];
        expect(rows.map((tr) => Boolean(tr.querySelector('[data-staff-inactive="standalone"]')))).toEqual([true, false, false]);
        expect(within(rows[0]).getByText("Ann Lee")).toBeInTheDocument();
        expect(container.querySelector("tbody").textContent).not.toMatch(/Inactive(?! staff account)/);
    });

    it("CS Owner filter: inactive people stay offered under their plain name, with the cue; unknown status gets none", async () => {
        await openDashboard();
        fireEvent.click(screen.getByRole("button", { name: /CS Owner · /i }));
        const options = screen.getAllByRole("option");
        const named = (n) => options.find((o) => o.textContent.startsWith(n));
        expect(named("Ann Lee").textContent).toBe("Ann Lee, Inactive staff account");
        expect(named("Kelvin Chow").textContent).toBe("Kelvin Chow");
        expect(named("Mei Wong").textContent).toBe("Mei Wong");
        expect(options.some((o) => /\(Inactive\)/.test(o.textContent))).toBe(false);
    });
});

describe("dashboard Contract column: a link only for a viewer who can open the Contract", () => {
    it("with the Processing Details View grant (here: the admin role, as on the Contract record page) the word links to the Contract", async () => {
        localStorage.setItem(COLS_KEY, JSON.stringify({ columns: ["workerName", "insuranceRef", "contract"] }));
        const { container } = await openDashboard({ admin: true });
        expect(container.querySelector('a[href*="/processings/details/55"]').textContent).toBe("Contract");
    });

    it("without it the word Contract is plain text", async () => {
        localStorage.setItem(COLS_KEY, JSON.stringify({ columns: ["workerName", "insuranceRef", "contract"] }));
        const { container } = await openDashboard({ admin: false });
        const cell = container.querySelector("[data-contract-link]");
        expect(cell.textContent).toBe("Contract");
        expect(container.querySelector('a[href*="/processings/details/55"]')).toBeNull();
    });
});

describe("Worker / Employer Insurance lists (U-0328, U-0078)", () => {
    const openList = async () => {
        searchInsuranceRecordsAPI.mockReturnValue(ok({ rows: ROWS, total: 3, restricted: false }));
        const store = configureStore({
            reducer: {
                insurance,
                users: usersReducer,
                worker: (state = { workerProfileInfo: null, workerDetailTabInfo: null }) => state,
                employer: (state = { currentEmployer: null }) => state,
            },
        });
        const utils = render(<Provider store={store}><MemoryRouter><div className="wkd"><WorkerInsuranceListing employer_id={201} partyColumn="worker" paginated /></div></MemoryRouter></Provider>);
        await screen.findByText("Siti");
        return utils;
    };

    it("Coverage status, QBE policy number and Open requests; tags in their tones, Needs attention as a note, the cue for the inactive owner only", async () => {
        const { container } = await openList();
        const head = container.querySelector(".mc-worker-listing-header").textContent;
        expect(head).toContain("Coverage status");
        expect(head).toContain("QBE policy number");
        expect(head).toContain("Open requests");
        const rows = [...container.querySelectorAll(".mc-worker-listing-row")];
        expect([...rows[0].querySelectorAll("[data-request-type]")].map((el) => el.dataset.tone)).toEqual(["blue-1", "teal"]);
        expect(rows[0].querySelector("[data-attention]").textContent).toBe("Needs attention (2)");
        expect(rows.map((r) => Boolean(r.querySelector('[data-staff-inactive="standalone"]')))).toEqual([true, false, false]);
        expect(container.textContent).not.toMatch(/Next Step/i);
    });
});

describe("Contract Insurance step: Insurance now", () => {
    const base = { ref: "IN-1", plan: "Plan A", invoice: null, submittedBy: "Mei Wong", requestedEffective: "2026-03-15", openRequests: ["Renew", "Coverage"], attention: 1 };

    it("a confirmed period: the Coverage status tag (not 'Policy Active'), the request tags in their tones, the note, 'QBE policy number'", () => {
        const { container } = render(<InsuranceStepBody stage="ready" recordLink={<span>IN-1</span>}
            insurance={{ ...base, coverage: { label: "active" }, period: { carrierRef: "QBE-9", effective: "2026-03-15", expiry: "2027-03-14" } }} />);
        const now = container.querySelector("[data-insurance-now]");
        expect(now.querySelector("[data-coverage]").textContent).toBe("Active");
        expect(container.textContent).not.toContain("Policy Active");
        expect([...now.querySelectorAll("[data-request-type]")].map((el) => [el.textContent, el.dataset.tone])).toEqual([["Renewal", "purple"], ["Additional coverage", "teal"]]);
        expect(now.querySelector("[data-attention]").textContent).toBe("Needs attention (1)");
        expect(container.textContent).toContain("QBE policy number");
        expect(container.textContent).not.toContain("Policy No.");
    });

    it("a request with no period yet still shows Insurance now: No active policy and the New policy tag", () => {
        const { container } = render(<InsuranceStepBody stage="submit_policy_request" recordLink={<span>IN-1</span>}
            insurance={{ ...base, openRequests: ["New"], attention: 0, coverage: { label: "none" }, period: null }} />);
        const now = container.querySelector("[data-insurance-now]");
        expect(now.querySelector("[data-coverage]").textContent).toBe("No active policy");
        expect([...now.querySelectorAll("[data-request-type]")].map((el) => el.textContent)).toEqual(["New policy"]);
        expect(now.querySelector("[data-attention]")).toBeNull();
    });
});

describe("strings (Q-16: zh_HK shows the English until reviewed)", () => {
    it("the renamed and new keys exist; the retired ones are gone from both locales and the code", () => {
        expect(en.key_ins_col_open_requests).toBe("Open requests");
        expect(zhHK.key_ins_col_open_requests).toBe(zhHK.key_ins_work_requests);
        expect(en.key_staff_inactive_account).toBe("Inactive staff account");
        expect(zhHK.key_staff_inactive_account).toBe("Inactive staff account");
        ["key_ins_col_next_step", "key_ins_inactive", "key_cd_ins_policy_active", "key_cd_ins_policy_no"].forEach((k) => {
            expect(en[k]).toBeUndefined();
            expect(zhHK[k]).toBeUndefined();
        });
        const files = ["Views/Pages/insurance/dashboard/insuranceDashboardColumns.js", "Views/Pages/insurance/dashboard/InsuranceFilterBar.js",
            "Views/Pages/WorkerPage/worker-detail/newui/listing/WorkerInsuranceListing.js",
            "Views/Pages/ProcessingPage/processing-detail/insurance-tab/ProcessingInsuranceTab.js", "components/ReusableComponents/app-configs.js"];
        files.forEach((f) => expect({ f, hit: read(f).match(/key_ins_col_next_step|"key_ins_inactive"|key_cd_ins_policy_active|key_cd_ins_policy_no|"nextStep",|\bnextStep:|mcdt-polbadge/) }).toEqual({ f, hit: null }));
    });
});
