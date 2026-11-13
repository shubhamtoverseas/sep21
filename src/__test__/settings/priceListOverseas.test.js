/* eslint-env jest */
import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import fs from "fs";
import path from "path";
import en from "../../../public/locales/en/translation.json";
import priceListReducer from "../../redux/Slices/settings/price-list/PriceListSlice";
import OverseasPricingSection from "../../Views/Pages/SettingsPage/newui/price-list/overseas/OverseasPricingSection";
import DirectHirePricingSection from "../../Views/Pages/SettingsPage/newui/price-list/direct-hire/DirectHirePricingSection";
import SkillsList from "../../Views/Pages/SettingsPage/newui/price-list/skills/SkillsList";
import {
    OS_PERCENT_KEY, NOE_KEY, agencyText, baseKey, buildAgencyPayload, buildOverseasPayload, copiedEntries, overseasLabel, savedAgency, savedOverseas, skillKey,
} from "../../Views/Pages/SettingsPage/newui/price-list/overseas/overseasPricingConfig";
import { buildDirectHirePayload, dhKey, savedDirectHire } from "../../Views/Pages/SettingsPage/newui/price-list/direct-hire/directHirePricingConfig";
import { PriceListFrameContext } from "../../Views/Pages/SettingsPage/newui/price-list/shared/priceListFrame";

/* Price List · Overseas, partner agency schedules, Direct Hire and Skills (27 Oct package, PL-S3).
   The screens never price: they show saved values ("Missing" = not entered, 0 shows 0), calculate only the base for a
   Replacement the way the server does, and save each page after Review changes.
   PL-UI1: staff who may edit see the entries at once (no Edit step); the agency's breadcrumb and the links to other Price
   List pages go through the frame. */

jest.mock("../../utils/translation", () => {
    const strings = require("../../../public/locales/en/translation.json");
    const t = (key) => strings[key] ?? key;
    return { __esModule: true, default: t, translation: t };
});
let mockIsAdmin = true;
let mockPermissions = {};
jest.mock("../../services/commonService", () => ({ __esModule: true, isAdminUser: () => mockIsAdmin }));
jest.mock("../../utils/permissions/configurationPermissionUtils", () => ({ __esModule: true, useConfigurationPermissions: () => mockPermissions }));
const mockApi = {
    fetchOverseas: jest.fn(), saveOverseas: jest.fn(), fetchAgency: jest.fn(), saveAgency: jest.fn(),
    fetchDirectHire: jest.fn(), saveDirectHire: jest.fn(), fetchSkills: jest.fn(),
};
jest.mock("../../services/settings/priceList", () => ({
    __esModule: true,
    fetchOverseasPricingAPI: (...a) => mockApi.fetchOverseas(...a),
    saveOverseasPricingAPI: (...a) => mockApi.saveOverseas(...a),
    fetchAgencyPricingAPI: (...a) => mockApi.fetchAgency(...a),
    saveAgencyPricingAPI: (...a) => mockApi.saveAgency(...a),
    fetchDirectHirePricingAPI: (...a) => mockApi.fetchDirectHire(...a),
    saveDirectHirePricingAPI: (...a) => mockApi.saveDirectHire(...a),
    fetchPriceListSkillsAPI: (...a) => mockApi.fetchSkills(...a),
}));

const PH = 71, ID = 95, TH = 198, BD = 18;
const ok = (data, message = "Listed successfully") => Promise.resolve({ data: { status: true, message, data } });
const nationalities = [{ id: PH, name: "Filipino" }, { id: ID, name: "Indonesian" }, { id: TH, name: "Thai" }, { id: BD, name: "Bangladeshi" }];
const BGS = { id: 12, code: "BGS", name: "BGS Manpower Services", nationality_id: PH };
const SRI = { id: 11, code: "SRI", name: "Silangan Recruitment International, Inc.", nationality_id: PH };
const MKA = { id: 13, code: "MKA", name: "PT Mitra Karya Anugerah", nationality_id: ID };
const TWS = { id: 14, code: "TWS", name: "Thai Workforce Solutions", nationality_id: TH };
const DBO = { id: 15, code: "DBO", name: "Dhaka Bridge Overseas", nationality_id: BD };
const overseas = () => ({
    version: 4,
    overseas_replacement_percent: 10,
    nationalities: [{ ...nationalities[0], fee: 15800 }, { ...nationalities[1], fee: null }, { ...nationalities[2], fee: 0 }, { ...nationalities[3], fee: null }],
    agencies: [{ ...BGS, missing: 0 }, { ...SRI, missing: 3 }, { ...MKA, missing: 3 }, { ...TWS, missing: 1 }, { ...DBO, missing: 3 }],
});
const schedule = (agency, values, version = 2) => ({
    version,
    agency: { ...agency, nationality_name: "Filipino" },
    base_fee: 15800,
    overseas_replacement_percent: 10,
    no_overseas_experience_fee: values.noe,
    skills: [{ id: 1, key: "caregiving", name: "Caregiving", fee: values.caregiving }, { id: 2, key: "nursing", name: "Nursing", fee: values.nursing }],
    missing: 0,
});
const bgs = () => schedule(BGS, { noe: null, caregiving: 1200, nursing: null });
const sri = () => schedule(SRI, { noe: 0, caregiving: null, nursing: 1600 }, null);

/* the Price List frame the page sits in: links (go), the agency breadcrumb (setCrumb) */
let mockFrame;
const renderWithStore = (ui) => {
    const store = configureStore({
        reducer: { priceList: priceListReducer, users: (state = { permissionList: {} }) => state },
        middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
    });
    render(<Provider store={store}><PriceListFrameContext.Provider value={mockFrame}>{ui}</PriceListFrameContext.Provider></Provider>);
    return store;
};
/* the admin's filter control (FilterSelect): open "<label> · <value>", choose an option */
const chooseFilter = (label, option) => {
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label} · `) }));
    fireEvent.click(screen.getByRole("option", { name: option }));
};
const viewOnly = () => { mockIsAdmin = false; mockPermissions = { canViewConditionalItemPrice: true }; };
const lastCrumb = () => mockFrame.setCrumb.mock.calls.filter(([c]) => c).pop()?.[0];
const dialogValue = (text) => (_, el) => el?.className?.includes?.("plReviewValue") && el.textContent === text;
const footText = (text) => (_, el) => el?.className?.includes?.("plFootStatus") && el.textContent === text;

beforeEach(() => {
    mockIsAdmin = true;
    mockPermissions = {};
    mockFrame = { go: jest.fn(), permitted: () => true, report: jest.fn(), setCrumb: jest.fn(), footNode: null };
    Object.values(mockApi).forEach((fn) => fn.mockReset());
    mockApi.fetchOverseas.mockImplementation(() => ok(overseas()));
    mockApi.fetchAgency.mockImplementation((id) => ok(id === SRI.id ? sri() : bgs()));
});

describe("the save bodies and labels mirror the server's contract", () => {
    it("Overseas: the changed bases and the % when it changed", () => {
        const data = overseas();
        const saved = savedOverseas(data);
        expect(saved[baseKey(TH)]).toBe(0);
        expect(saved[baseKey(ID)]).toBeNull();
        expect(buildOverseasPayload(data, { [OS_PERCENT_KEY]: "12", [baseKey(ID)]: "16,000", [baseKey(PH)]: "15800" }, saved))
            .toEqual({ base_version: 4, overseas_replacement_percent: 12, base_fees: [{ nationality_id: ID, fee: 16000 }] });
        expect(overseasLabel(data, baseKey(PH))).toBe("Filipino · Base fee");
        expect(overseasLabel(data, OS_PERCENT_KEY)).toBe("Overseas replacement discount");
    });

    it("agency schedule: changed amounts, and the agency a draft was copied from; Copy keeps 0 as 0 and missing as blank", () => {
        const data = bgs();
        const saved = savedAgency(data);
        expect(buildAgencyPayload(data, { [NOE_KEY]: "0", [skillKey(2)]: "1500" }, saved, { copiedFrom: { id: SRI.id, code: "SRI" } }))
            .toEqual({ base_version: 2, no_overseas_experience_fee: 0, rates: [], skill_fees: [{ skill_id: 2, fee: 1500 }], copied_from: SRI.id });
        expect(copiedEntries(data, sri())).toEqual({ [NOE_KEY]: "0", [skillKey(1)]: "", [skillKey(2)]: "1600" });
        expect(agencyText(BGS)).toBe("BGS Manpower Services (BGS)");
    });

    it("Direct Hire: one fee per partner code, only the changed ones", () => {
        const data = { version: 6, nationalities, agencies: [{ ...BGS, fee: 8600 }, { ...SRI, fee: null }] };
        expect(buildDirectHirePayload(data, { [dhKey(BGS.id)]: "", [dhKey(SRI.id)]: "9000" }, savedDirectHire(data)))
            .toEqual({ base_version: 6, fees: [{ agency_id: BGS.id, fee: null }, { agency_id: SRI.id, fee: 9000 }] });
    });
});

describe("Overseas", () => {
    it("one base per nationality across its agencies, the calculated Replacement base, codes that open pricing, and each schedule's status", async () => {
        viewOnly();
        await act(async () => { renderWithStore(<OverseasPricingSection />); });
        expect(screen.getByText("One base fee for each nationality, shared by its partner agencies. A missing price blocks only the invoices that need it.")).toBeInTheDocument();
        expect(screen.getByText("10%")).toBeInTheDocument();
        const table = screen.getByRole("table", { name: "Overseas · Base fees" });
        const rows = within(table).getAllByRole("row").slice(1);
        expect(within(rows[0]).getByRole("rowheader")).toHaveTextContent("Filipino");
        expect(within(rows[0]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["15,800", "HK$14,220", "BGS", "Complete"]);
        expect(within(rows[1]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["SRI", "Incomplete3 missing"]);
        expect(within(rows[2]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Missing", "—", "MKA", "Incomplete3 missing"]);
        expect(within(rows[3]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["0", "HK$0", "TWS", "Incomplete1 missing"]);
        expect(screen.queryByText("BGS Manpower Services")).toBeNull();

        fireEvent.change(screen.getByRole("searchbox", { name: "Find a partner agency or code" }), { target: { value: "silangan" } });
        expect(within(table).getAllByRole("row")).toHaveLength(2);
        expect(within(table).getByRole("button", { name: "SRI, Silangan Recruitment International, Inc.: open pricing" })).toBeInTheDocument();
        fireEvent.change(screen.getByRole("searchbox", { name: "Find a partner agency or code" }), { target: { value: "zzz" } });
        expect(within(table).getByText("No partner agency matches “zzz”.")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Review changes" })).toBeNull();
    });

    it("staff who may edit see the bases and the % as entries at once: blank shows Missing, 0 stays 0, the Replacement base stays calculated", async () => {
        await act(async () => { renderWithStore(<OverseasPricingSection />); });
        expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
        expect(screen.getByLabelText("Overseas replacement discount")).toHaveValue("10");
        expect(screen.getByLabelText("Filipino base fee")).toHaveValue("15,800");
        expect(screen.getByLabelText("Indonesian base fee")).toHaveValue("");
        expect(screen.getByLabelText("Indonesian base fee")).toHaveAttribute("placeholder", "Missing");
        expect(screen.getByLabelText("Thai base fee")).toHaveValue("0");
        expect(screen.getByText("HK$14,220")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Review changes" })).toBeDisabled();
        expect(mockFrame.report).toHaveBeenLastCalledWith({ changes: 0, canEdit: true, alert: "" });
        fireEvent.change(screen.getByLabelText("Indonesian base fee"), { target: { value: "16000" } });
        expect(mockFrame.report).toHaveBeenLastCalledWith({ changes: 1, canEdit: true, alert: "" });
    });

    it("bases and the Overseas % are reviewed old -> new with what they mean for invoices, then saved as one change", async () => {
        mockApi.saveOverseas.mockImplementation(() => ok({ ...overseas(), version: 5 }, "Changes saved."));
        await act(async () => { renderWithStore(<OverseasPricingSection />); });
        fireEvent.change(screen.getByLabelText("Indonesian base fee"), { target: { value: "16000" } });
        fireEvent.change(screen.getByLabelText("Overseas replacement discount"), { target: { value: "12" } });
        expect(screen.getByText(footText("2 unsaved changes · Overseas"))).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText("Changes to Overseas")).toBeInTheDocument();
        expect(within(dialog).getByText("Indonesian · Base fee")).toBeInTheDocument();
        expect(within(dialog).getByText(dialogValue("Missing→HK$16,000"))).toBeInTheDocument();
        expect(within(dialog).getByText(dialogValue("10%→12%"))).toBeInTheDocument();
        expect(within(dialog).getByText("Every nationality’s base for a Replacement uses the new rate. For example, Filipino: HK$14,220 → HK$13,904.")).toBeInTheDocument();
        expect(within(dialog).getByText("Indonesian Overseas invoices from MKA use this base fee once saved.")).toBeInTheDocument();
        expect(within(dialog).getByText("Invoices already created keep their prices.")).toBeInTheDocument();
        await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" })); });
        expect(mockApi.saveOverseas).toHaveBeenCalledWith({ base_version: 4, overseas_replacement_percent: 12, base_fees: [{ nationality_id: ID, fee: 16000 }] });
        expect(screen.getByText("Changes saved.")).toBeInTheDocument();
    });
});

describe("Overseas › agency schedule", () => {
    const openBgs = async () => {
        await act(async () => { renderWithStore(<OverseasPricingSection />); });
        await act(async () => { fireEvent.click(screen.getByRole("button", { name: "BGS, BGS Manpower Services: open pricing" })); });
        expect(mockApi.fetchAgency).toHaveBeenLastCalledWith(BGS.id);
    };

    it("shows the nationality base read-only with the way back, then No Overseas Experience and the skills; the status counts what is missing", async () => {
        viewOnly();
        await openBgs();
        expect(lastCrumb().label).toBe("Filipino · BGS");
        expect(screen.getByRole("heading", { name: "Overseas" })).toBeInTheDocument();
        const facts = screen.getByRole("region", { name: "Partner agency" });
        expect(within(facts).getByText("Filipino")).toBeInTheDocument();
        expect(within(facts).getByText("BGS Manpower Services")).toBeInTheDocument();
        expect(within(facts).getByText("Incomplete")).toBeInTheDocument();
        expect(within(facts).getByText("2 missing")).toBeInTheDocument();
        expect(screen.getByText("HK$15,800")).toBeInTheDocument();
        expect(screen.getByText((_, el) => el?.className?.includes?.("plHint") && el.textContent === "Shared by every Filipino partner agency. Set on Overseas.")).toBeInTheDocument();
        expect(screen.getByText("HK$14,220")).toBeInTheDocument();
        expect(screen.getByText("HK$1,200")).toBeInTheDocument();
        expect(screen.getAllByText("Missing")).toHaveLength(2);
    });

    it("No Overseas Experience and a skill are reviewed and saved for that agency; a complete schedule says so", async () => {
        mockApi.saveAgency.mockImplementation(() => ok({ ...bgs(), version: 3 }, "Changes saved."));
        await openBgs();
        fireEvent.change(screen.getByLabelText("No Overseas Experience"), { target: { value: "0" } });
        fireEvent.change(screen.getByLabelText("Nursing"), { target: { value: "1500" } });
        expect(within(screen.getByRole("region", { name: "Partner agency" })).getByText("Complete")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText("Changes to Filipino · BGS")).toBeInTheDocument();
        expect(within(dialog).getByText("Experience supplement")).toBeInTheDocument();
        expect(within(dialog).getByText("Skill supplements")).toBeInTheDocument();
        expect(within(dialog).getByText(dialogValue("Missing→HK$0"))).toBeInTheDocument();
        expect(within(dialog).getByText(dialogValue("Missing→HK$1,500"))).toBeInTheDocument();
        expect(within(dialog).getByText("Every supplement amount in this schedule will be entered.")).toBeInTheDocument();
        await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" })); });
        expect(mockApi.saveAgency).toHaveBeenCalledWith(BGS.id, { base_version: 2, no_overseas_experience_fee: 0, rates: [], skill_fees: [{ skill_id: 2, fee: 1500 }] });
    });

    it("Copy pricing copies another agency's saved schedule into the draft (0 as 0, missing as missing) and names it in the review and the save", async () => {
        mockApi.saveAgency.mockImplementation(() => ok({ ...bgs(), version: 3 }, "Changes saved."));
        await openBgs();
        fireEvent.click(screen.getByRole("button", { name: "Copy pricing from…" }));
        const copy = screen.getByRole("dialog");
        expect(within(copy).getByText(/Copies No Overseas Experience, all experience rates and both skill amounts into BGS\./)).toBeInTheDocument();
        fireEvent.click(within(copy).getByRole("button", { name: "Copy to BGS" }));
        expect(within(copy).getByRole("alert")).toHaveTextContent("Choose a partner code.");
        fireEvent.change(within(copy).getByLabelText("Copy from"), { target: { value: String(SRI.id) } });
        await act(async () => { fireEvent.click(within(copy).getByRole("button", { name: "Copy to BGS" })); });
        expect(mockApi.fetchAgency).toHaveBeenLastCalledWith(SRI.id);
        expect(screen.getByLabelText("No Overseas Experience")).toHaveValue("0");
        expect(screen.getByLabelText("Caregiving")).toHaveValue("");
        expect(screen.getByLabelText("Nursing")).toHaveValue("1,600");
        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText("Copied agency pricing from SRI to BGS. Shared base fees and replacement discounts are unchanged.")).toBeInTheDocument();
        expect(within(dialog).getByText(dialogValue("HK$1,200→Missing"))).toBeInTheDocument();
        expect(within(dialog).getByText("1 amount is still missing in this schedule. Invoices that need it can’t be created until it is entered.")).toBeInTheDocument();
        await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" })); });
        expect(mockApi.saveAgency).toHaveBeenCalledWith(BGS.id, {
            base_version: 2, no_overseas_experience_fee: 0, rates: [], skill_fees: [{ skill_id: 1, fee: null }, { skill_id: 2, fee: 1600 }], copied_from: SRI.id,
        });
    });

    it("leaving with unsaved changes asks first; discarding returns to Overseas", async () => {
        await openBgs();
        fireEvent.change(screen.getByLabelText("Nursing"), { target: { value: "1500" } });
        // the breadcrumb's Overseas (… › Overseas › Filipino · BGS)
        act(() => { lastCrumb().onBack(); });
        expect(screen.getByText("Discard unsaved changes?")).toBeInTheDocument();
        await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Discard changes" })); });
        expect(screen.getByRole("table", { name: "Overseas · Base fees" })).toBeInTheDocument();
        expect(mockApi.fetchOverseas).toHaveBeenCalledTimes(2);
        expect(mockFrame.setCrumb).toHaveBeenLastCalledWith(null);
    });

    it("with no unsaved changes the base fee's Overseas link returns at once", async () => {
        await openBgs();
        await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Overseas" })); });
        expect(screen.queryByText("Discard unsaved changes?")).toBeNull();
        expect(screen.getByRole("table", { name: "Overseas · Base fees" })).toBeInTheDocument();
    });
});

describe("Overseas › agency schedule · history rates (PL-S4)", () => {
    const GROUPS = [
        { id: 2, name: "Hong Kong and Macau", is_other: false, countries: ["Hong Kong", "Macau"] },
        { id: 4, name: "Middle East", is_other: false, countries: ["Saudi Arabia", "United Arab Emirates", "Kuwait", "Qatar", "Oman"] },
        { id: 1, name: "Other countries", is_other: true, countries: [] },
    ];
    const CELLS = [["we1", "finished", "over_24"], ["we1", "terminated", "12_to_24"], ["we1", "terminated", "over_24"],
        ["earlier", "finished", "over_24"], ["earlier", "terminated", "12_to_24"], ["earlier", "terminated", "over_24"]];
    const withHistory = (data, rateOf) => ({
        ...data,
        history: { groups: GROUPS, rates: GROUPS.flatMap((g) => CELLS.map(([position, outcome, band]) => ({ country_group_id: g.id, position, outcome, band, rate: rateOf(g.id, position, outcome, band) }))) },
    });
    const HKMO_RATES = { "we1|finished|over_24": 1800, "we1|terminated|12_to_24": 700, "we1|terminated|over_24": 1300, "earlier|finished|over_24": 1500, "earlier|terminated|12_to_24": 0, "earlier|terminated|over_24": 1100 };
    const bgsRates = (g, position, outcome, band) => (g === 2 ? HKMO_RATES[[position, outcome, band].join("|")] : null);
    const openBgs = async () => {
        await act(async () => { renderWithStore(<OverseasPricingSection />); });
        await act(async () => { fireEvent.click(screen.getByRole("button", { name: "BGS, BGS Manpower Services: open pricing" })); });
    };
    beforeEach(() => {
        mockApi.fetchAgency.mockImplementation((id) => ok(id === SRI.id
            ? withHistory(sri(), (g) => (g === 1 ? 900 : null))
            : withHistory(bgs(), bgsRates)));
    });

    it("each group (Other countries last) by WE1 and earlier history across Finished > 24, Terminated 12–24 and > 24; blanks Missing, 0 shown", async () => {
        viewOnly();
        await openBgs();
        const grid = screen.getByRole("table", { name: "Experience supplement" });
        expect(within(grid).getByRole("columnheader", { name: "Finished" })).toBeInTheDocument();
        expect(within(grid).getByRole("columnheader", { name: "Terminated" })).toBeInTheDocument();
        expect(within(grid).getAllByRole("columnheader", { name: "More than 24 months" })).toHaveLength(2);
        expect(within(grid).getByRole("columnheader", { name: "12 to 24 months inclusive" })).toBeInTheDocument();
        const rows = within(grid).getAllByRole("row").slice(2);
        expect(rows).toHaveLength(6);
        expect(within(rows[0]).getByRole("rowheader", { name: /Hong Kong and Macau/ })).toHaveTextContent("Hong Kong and MacauHong Kong, Macau");
        expect(within(rows[0]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["1,800", "700", "1,300"]);
        expect(within(rows[1]).getByRole("rowheader")).toHaveTextContent("Earlier history");
        expect(within(rows[1]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["1,500", "0", "1,100"]);
        expect(within(rows[2]).getByRole("rowheader", { name: /Middle East/ })).toHaveTextContent("Saudi Arabia, United Arab Emirates and 3 more");
        expect(within(rows[4]).getByRole("rowheader", { name: /Other countries/ })).toHaveTextContent("All other countries");
        expect(within(rows[4]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Missing", "Missing", "Missing"]);
        // No Overseas Experience, Nursing and 12 history rates are not entered
        expect(within(screen.getByRole("region", { name: "Partner agency" })).getByText("14 missing")).toBeInTheDocument();
        expect(screen.getByText("Finished includes About to Finish and Plan to Finish. Terminated includes every termination reason.")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Pricing countries" }));
        expect(mockFrame.go).toHaveBeenCalledWith("countries");
    });

    it("a rate is reviewed under Experience supplement with its full label and saved as one cell; Copy pricing copies the rates too", async () => {
        mockApi.saveAgency.mockImplementation(() => ok(withHistory({ ...bgs(), version: 3 }, bgsRates), "Changes saved."));
        await openBgs();
        fireEvent.change(screen.getByLabelText("Middle East, Work Experience 1 (WE1), Terminated, 12 to 24 months inclusive"), { target: { value: "500" } });
        fireEvent.change(screen.getByLabelText("Hong Kong and Macau, Earlier history, Terminated, 12 to 24 months inclusive"), { target: { value: "-1" } });
        expect(screen.getByText("Hong Kong and Macau · Earlier history · Terminated · 12 to 24 months inclusive")).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("Hong Kong and Macau, Earlier history, Terminated, 12 to 24 months inclusive"), { target: { value: "" } });
        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText("Experience supplement")).toBeInTheDocument();
        expect(within(dialog).getByText("Middle East · WE1 · Terminated · 12 to 24 months inclusive")).toBeInTheDocument();
        expect(within(dialog).getByText(dialogValue("Missing→HK$500"))).toBeInTheDocument();
        expect(within(dialog).getByText(dialogValue("HK$0→Missing"))).toBeInTheDocument();
        await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" })); });
        expect(mockApi.saveAgency).toHaveBeenCalledWith(BGS.id, {
            base_version: 2,
            rates: [
                { country_group_id: 2, position: "earlier", outcome: "terminated", band: "12_to_24", rate: null },
                { country_group_id: 4, position: "we1", outcome: "terminated", band: "12_to_24", rate: 500 },
            ],
            skill_fees: [],
        });

        fireEvent.click(screen.getByRole("button", { name: "Copy pricing from…" }));
        fireEvent.change(within(screen.getByRole("dialog")).getByLabelText("Copy from"), { target: { value: String(SRI.id) } });
        await act(async () => { fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Copy to BGS" })); });
        expect(screen.getByLabelText("Hong Kong and Macau, Work Experience 1 (WE1), Finished, More than 24 months")).toHaveValue("");
        expect(screen.getByLabelText("Other countries, Earlier history, Terminated, More than 24 months")).toHaveValue("900");
    });
});

describe("Direct Hire", () => {
    const directHire = () => ({ version: 6, nationalities, agencies: [{ ...BGS, fee: 8600 }, { ...SRI, fee: null }, { ...MKA, fee: 0 }, { ...TWS, fee: 7400 }, { ...DBO, fee: null }] });

    it("one fee per partner code by nationality, filtered by nationality or code; a cleared fee is reviewed and saved", async () => {
        mockApi.fetchDirectHire.mockImplementation(() => ok(directHire()));
        mockApi.saveDirectHire.mockImplementation(() => ok({ ...directHire(), version: 7 }, "Changes saved."));
        await act(async () => { renderWithStore(<DirectHirePricingSection />); });
        expect(screen.getByText("Employer-sourced Overseas workers. The worker’s current partner code selects the fee.")).toBeInTheDocument();
        const table = screen.getByRole("table", { name: "Direct Hire fees" });
        expect(screen.getByLabelText("BGS Manpower Services (BGS) Direct Hire fee")).toHaveValue("8,600");
        expect(screen.getByLabelText("PT Mitra Karya Anugerah (MKA) Direct Hire fee")).toHaveValue("0");
        expect(screen.getByLabelText("Silangan Recruitment International, Inc. (SRI) Direct Hire fee")).toHaveValue("");
        expect(screen.getByText("2 missing")).toBeInTheDocument();
        chooseFilter("Nationality", "Thai");
        expect(within(table).queryByText("BGS Manpower Services")).toBeNull();
        expect(within(table).getByText("Thai Workforce Solutions")).toBeInTheDocument();
        chooseFilter("Nationality", "All nationalities");

        fireEvent.change(screen.getByLabelText("BGS Manpower Services (BGS) Direct Hire fee"), { target: { value: "" } });
        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText("Changes to Direct Hire")).toBeInTheDocument();
        expect(within(dialog).getByText("BGS Manpower Services (BGS)")).toBeInTheDocument();
        expect(within(dialog).getByText(dialogValue("HK$8,600→Missing"))).toBeInTheDocument();
        expect(within(dialog).getByText(/^1 entry becomes missing\./)).toBeInTheDocument();
        await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" })); });
        expect(mockApi.saveDirectHire).toHaveBeenCalledWith({ base_version: 6, fees: [{ agency_id: BGS.id, fee: null }] });
    });
});

describe("Skills and who may edit", () => {
    it("Skills is read-only: each supported mapping with its profile field and value, a way to the agency prices and to Fixed Items", async () => {
        mockApi.fetchSkills.mockImplementation(() => ok({ skills: [
            { id: 1, key: "caregiving", name: "Caregiving", profile_field: "special_course", profile_value: { id: 1, name: "Caregiver Course" } },
            { id: 2, key: "nursing", name: "Nursing", profile_field: "special_course", profile_value: { id: 5, name: "Bachelor of Nursing" } },
        ] }));
        await act(async () => { renderWithStore(<SkillsList />); });
        const rows = within(screen.getByRole("table", { name: "Skills" })).getAllByRole("row").slice(1);
        expect(within(rows[0]).getByRole("rowheader")).toHaveTextContent("Caregiving");
        expect(within(rows[0]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Special Course", "Caregiver Course", "Agency pricing"]);
        expect(within(rows[1]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Special Course", "Bachelor of Nursing", "Agency pricing"]);
        expect(screen.queryByRole("button", { name: /Add skill/i })).toBeNull();
        expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
        fireEvent.click(within(rows[0]).getByRole("button", { name: "Agency pricing" }));
        expect(mockFrame.go).toHaveBeenCalledWith("overseas");
        fireEvent.click(screen.getByRole("button", { name: "Fixed Items" }));
        expect(mockFrame.go).toHaveBeenCalledWith("fixed-items");
    });

    it("View without the Overseas or Direct Hire Edit key shows the prices with no entries, no footer bar and no Copy pricing", async () => {
        viewOnly();
        await act(async () => { renderWithStore(<OverseasPricingSection />); });
        expect(screen.queryByRole("textbox")).toBeNull();
        expect(screen.queryByRole("button", { name: "Review changes" })).toBeNull();
        expect(mockFrame.report).toHaveBeenLastCalledWith({ changes: 0, canEdit: false, alert: "" });
        await act(async () => { fireEvent.click(screen.getByRole("button", { name: "BGS, BGS Manpower Services: open pricing" })); });
        expect(screen.queryByRole("textbox")).toBeNull();
        expect(screen.queryByRole("button", { name: "Review changes" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Copy pricing from…" })).toBeNull();
    });
});

describe("the old Overseas and Direct Hire editors are gone", () => {
    it("no old matrices, endpoints, thunks, constants or orphaned strings remain", () => {
        const root = path.resolve(__dirname, "../..");
        const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
        for (const file of ["OverseasConditionalItem.js", "useOverseasConditionalItems.js", "DirectHireConditionalItem.js", "useDirectHireConditionalItems.js"]) {
            expect(fs.existsSync(path.join(root, "Views/Pages/SettingsPage/newui/price-list/conditional-items", file))).toBe(false);
        }
        expect(read("services/apiPath.js")).not.toMatch(/conditional-item-(overseas|direct-hire)/);
        expect(read("redux/Slices/settings/price-list/PriceListSlice.js")).not.toMatch(/conditionalItem(Overseas|DirectHire)|conditionItem(OverseasList|DirectHire)/);
        expect(read("Views/Pages/SettingsPage/newui/settingsNewUiConstants.js")).not.toMatch(/OVERSEAS_(GROUP|NATIONALITY|FIELD)|CURRENCY_SYMBOL/);
        expect(read("Views/Pages/SettingsPage/newui/price-list/priceListConfig.js")).not.toMatch(/coerceOverseasNumbers|buildDirectHirePayload|getOverseasNationalityName|findOverseasGroupValue/);
        expect(fs.existsSync(path.join(root, "Views/Pages/SettingsPage/newui/price-list/conditional-items/ConditionalItemsTab.js"))).toBe(false);
        expect(read("Views/Pages/SettingsPage/newui/settingsNewUiConstants.js")).not.toMatch(/CONDITIONAL_ITEM_TAB|PRICE_LIST_TAB\b/);
        expect(read("Views/Pages/SettingsPage/newui/price-list/PriceListPage.js")).toMatch(/\[PRICE_LIST_PAGE\.SKILLS\]: lazy\(\(\) => import\("\.\/skills\/SkillsList"\)\)/);
        for (const key of ["key_if", "key_latest_overseas_experience_more_than_2_years_finished_contract", "key_singapore_taiwan", "key_malaysia_middle_east", "key_partner_code", "key_base_price", "key_replacement_description"]) {
            expect(en[key]).toBeUndefined();
        }
    });
});
