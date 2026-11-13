/* eslint-env jest */
import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import fs from "fs";
import path from "path";
import priceListReducer from "../../redux/Slices/settings/price-list/PriceListSlice";
import LocalPricingSection from "../../Views/Pages/SettingsPage/newui/price-list/local/LocalPricingSection";
import OverseasPricingSection from "../../Views/Pages/SettingsPage/newui/price-list/overseas/OverseasPricingSection";
import DirectHirePricingSection from "../../Views/Pages/SettingsPage/newui/price-list/direct-hire/DirectHirePricingSection";
import PricingCountriesSection from "../../Views/Pages/SettingsPage/newui/price-list/countries/PricingCountriesSection";

/* Price List · the grid pages to the reference page (27 Oct package, PL-UI2): each section a card; a single value in a
   field box (HK$ before, % after); grid entries as cells whose state shows — Missing (blank, not 0), changed, to
   correct; the grid errors take staff to the entry; the calculated Replacement rows read-only on a tinted row; the
   agency's facts in one strip; Complete / Incomplete as the admin's status tag; Direct Hire's nationality bands; the
   country cards and chips. Layout and states only: the values, checks and saves are the PL-S1…S4 ones. */

jest.mock("../../utils/translation", () => {
    const strings = require("../../../public/locales/en/translation.json");
    const t = (key) => strings[key] ?? key;
    return { __esModule: true, default: t, translation: t };
});
let mockIsAdmin = true;
let mockPermissions = {};
jest.mock("../../services/commonService", () => ({ __esModule: true, isAdminUser: () => mockIsAdmin }));
jest.mock("../../utils/permissions/configurationPermissionUtils", () => ({ __esModule: true, useConfigurationPermissions: () => mockPermissions }));
const mockApi = { local: jest.fn(), overseas: jest.fn(), agency: jest.fn(), directHire: jest.fn(), countries: jest.fn() };
jest.mock("../../services/settings/priceList", () => ({
    __esModule: true,
    fetchLocalPricingAPI: (...a) => mockApi.local(...a),
    fetchOverseasPricingAPI: (...a) => mockApi.overseas(...a),
    fetchAgencyPricingAPI: (...a) => mockApi.agency(...a),
    fetchDirectHirePricingAPI: (...a) => mockApi.directHire(...a),
    fetchCountryGroupsAPI: (...a) => mockApi.countries(...a),
}));

const ok = (data) => Promise.resolve({ data: { status: true, message: "Listed successfully", data } });
const LF = 2, PH = 71, ID = 95, HK = 1, MO = 119, KW = 96;
const BGS = { id: 12, code: "BGS", name: "BGS Manpower Services", nationality_id: PH };
const SRI = { id: 11, code: "SRI", name: "Silangan Recruitment International, Inc.", nationality_id: PH };
const MKA = { id: 13, code: "MKA", name: "PT Mitra Karya Anugerah", nationality_id: ID };
const nationalities = [{ id: PH, name: "Filipino" }, { id: ID, name: "Indonesian" }];
const local = () => ({
    version: 7,
    local_replacement_percent: 15,
    categories: [{ id: LF, name: "Local Finished" }],
    nationalities,
    cells: [
        { contract_category_id: LF, nationality_id: PH, standard_fee: 10000, driver_fee: null },
        { contract_category_id: LF, nationality_id: ID, standard_fee: 0, driver_fee: null },
    ],
    service_cells: [],
});
const overseas = () => ({
    version: 4,
    overseas_replacement_percent: 10,
    nationalities: [{ ...nationalities[0], fee: 15800 }, { ...nationalities[1], fee: null }],
    agencies: [{ ...BGS, missing: 0 }, { ...SRI, missing: 3 }, { ...MKA, missing: 3 }],
});
const GROUPS = [{ id: 2, name: "Hong Kong and Macau", is_other: false, countries: ["Hong Kong", "Macau"] }, { id: 1, name: "Other countries", is_other: true, countries: [] }];
const CELLS = [["we1", "finished", "over_24"], ["we1", "terminated", "12_to_24"], ["we1", "terminated", "over_24"],
    ["earlier", "finished", "over_24"], ["earlier", "terminated", "12_to_24"], ["earlier", "terminated", "over_24"]];
const agency = () => ({
    version: 2,
    agency: { ...BGS, nationality_name: "Filipino" },
    base_fee: 15800,
    overseas_replacement_percent: 10,
    no_overseas_experience_fee: 0,
    skills: [{ id: 1, key: "caregiving", name: "Caregiving", fee: 1200 }],
    missing: 0,
    history: { groups: GROUPS, rates: GROUPS.flatMap((g) => CELLS.map(([position, outcome, band]) => ({ country_group_id: g.id, position, outcome, band, rate: 500 }))) },
});
const directHire = () => ({ version: 6, nationalities, agencies: [{ ...BGS, fee: 8600 }, { ...SRI, fee: null }, { ...MKA, fee: 0 }] });
const countries = () => ({
    version: 4,
    groups: [{ id: 2, name: "Hong Kong and Macau", country_ids: [HK, MO], rates_complete: true }],
    other: { id: 1, name: "Other countries", rates_complete: true },
    countries: [{ id: HK, name: "Hong Kong", active: true }, { id: KW, name: "Kuwait", active: true }, { id: MO, name: "Macau", active: true }],
    agency_count: 7,
});

const renderPage = async (ui) => {
    const store = configureStore({
        reducer: { priceList: priceListReducer, users: (state = { permissionList: {} }) => state },
        middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
    });
    await act(async () => { render(<Provider store={store}>{ui}</Provider>); });
};
const viewOnly = (key) => { mockIsAdmin = false; mockPermissions = { [key]: true }; };

beforeEach(() => {
    mockIsAdmin = true;
    mockPermissions = {};
    mockApi.local.mockImplementation(() => ok(local()));
    mockApi.overseas.mockImplementation(() => ok(overseas()));
    mockApi.agency.mockImplementation(() => ok(agency()));
    mockApi.directHire.mockImplementation(() => ok(directHire()));
    mockApi.countries.mockImplementation(() => ok(countries()));
});

describe("Local", () => {
    it("the section is a card; the Local % sits in a field box with its % after; the shared rate's rows end with a rule", async () => {
        await renderPage(<LocalPricingSection />);
        const section = screen.getByRole("heading", { name: "Base fees" }).closest("section");
        expect(section).toHaveClass("plSection");
        const percent = screen.getByLabelText("Local replacement discount");
        expect(percent).toHaveClass("plFboxInput");
        const box = percent.parentElement;
        expect(box).toHaveClass("plFbox", "plFboxPct");
        expect(box.lastChild).toHaveTextContent("%");
        expect(box.closest(".plRows")).toHaveClass("plRowsShared");

        fireEvent.change(percent, { target: { value: "" } });
        expect(box).toHaveClass("plFboxMissing", "plFboxChanged");
        fireEvent.change(percent, { target: { value: "120" } });
        expect(box).toHaveClass("plFboxInvalid");
        const error = screen.getByText("Enter a percentage from 0 to 100.");
        expect(error).toHaveClass("plFieldErr");
        expect(percent).toHaveAttribute("aria-describedby", error.id);
    });

    it("grid cells show their state — blank is Missing (0 is not), changed, to correct — and the error takes staff to its cell", async () => {
        await renderPage(<LocalPricingSection />);
        const filipino = screen.getByLabelText("Standard base fee, Local Finished, Filipino");
        const indonesian = screen.getByLabelText("Standard base fee, Local Finished, Indonesian");
        const driver = screen.getByLabelText("Driver base fee, Local Finished, Filipino");
        expect(filipino).toHaveClass("plCell");
        expect(filipino).not.toHaveClass("plCellMissing");
        expect(indonesian).toHaveValue("0");
        expect(indonesian).not.toHaveClass("plCellMissing");
        expect(driver).toHaveClass("plCell", "plCellMissing");
        expect(driver).toHaveAttribute("placeholder", "Missing");

        fireEvent.change(filipino, { target: { value: "9000" } });
        expect(filipino).toHaveClass("plCellChanged");
        fireEvent.change(filipino, { target: { value: "-1" } });
        expect(filipino).toHaveClass("plCellInvalid");
        expect(filipino).not.toHaveClass("plCellChanged");
        const errors = document.querySelector(".plGerr");
        expect(errors).toHaveTextContent("Price cannot be negative.");
        fireEvent.click(within(errors).getByRole("button"));
        expect(document.activeElement).toBe(filipino);
    });

    it("each grid is named in its own header; the calculated Replacement row is read-only on a tinted row", async () => {
        await renderPage(<LocalPricingSection />);
        const standard = screen.getByRole("table", { name: "Base fees · Standard" });
        expect(standard).toHaveClass("plGrid", "plGridLocal");
        expect(standard.closest(".plGridWrap")).toHaveClass("plGridWrapHead");
        expect(standard.querySelector("thead tr")).toHaveClass("plGhRow");
        expect(standard.querySelector("thead tr")).toHaveTextContent("Standard");
        const replacement = within(standard).getByText("Replacement").closest("tr");
        expect(replacement).toHaveClass("plCalcRow", "plGrpEnd");
        expect(within(replacement).queryByRole("textbox")).toBeNull();
        within(replacement).getAllByRole("cell").forEach((cell) => expect(cell).toHaveClass("plRo"));
        expect(within(replacement).getAllByRole("cell").map((c) => c.textContent)).toEqual(["8,500", "0"]);
    });

    it("view only: saved values as values, Missing in its own style, no field boxes", async () => {
        viewOnly("canViewConditionalLocalItemPrice");
        await renderPage(<LocalPricingSection />);
        expect(document.querySelector(".plFbox")).toBeNull();
        expect(screen.getByText("15%")).toHaveClass("plVal");
        expect(screen.getAllByText("Missing")[0]).toHaveClass("plMissing");
        expect(screen.getByText("10,000")).toHaveClass("plVal");
    });
});

describe("Overseas and the agency schedule", () => {
    it("each nationality's base spans its codes, ruled off from the next; codes link; Complete / Incomplete are the admin's status tags", async () => {
        await renderPage(<OverseasPricingSection />);
        const table = screen.getByRole("table", { name: "Overseas · Base fees" });
        expect(table).toHaveClass("plGrid", "plGridOb");
        expect(within(table).getByRole("columnheader", { name: "Partner agency" })).toHaveClass("plGl");
        const filipino = within(table).getByRole("rowheader", { name: "Filipino" });
        expect(filipino).toHaveClass("plRg", "plRgEnd");
        expect(within(table).getByRole("rowheader", { name: "Indonesian" })).not.toHaveClass("plRgEnd");
        expect(within(table).getByRole("button", { name: "SRI, Silangan Recruitment International, Inc.: open pricing" }).closest("tr")).toHaveClass("plGrpEnd");
        expect(within(table).getByRole("button", { name: "BGS, BGS Manpower Services: open pricing" })).toHaveClass("plCodeLink");
        expect(within(table).getByText("Complete")).toHaveClass("badge", "success");
        expect(within(table).getAllByText("Incomplete")[0]).toHaveClass("badge", "warning");
    });

    it("the agency's facts in one strip; the history grid's Finished / Terminated heads; its notes", async () => {
        await renderPage(<OverseasPricingSection />);
        await act(async () => { fireEvent.click(screen.getByRole("button", { name: "BGS, BGS Manpower Services: open pricing" })); });
        const facts = screen.getByRole("region", { name: "Partner agency" });
        expect(facts).toHaveClass("plFacts");
        expect(facts.querySelectorAll(".plFact")).toHaveLength(3);
        expect(facts.querySelectorAll(".plFact")[2]).toHaveClass("plFactStatus");
        expect(within(facts).getByText("Complete")).toHaveClass("badge", "success");

        const grid = screen.getByRole("table", { name: "Experience supplement" });
        expect(within(grid).getByRole("columnheader", { name: "Terminated" })).toHaveClass("plGrp", "plGl");
        expect(within(grid).getByRole("columnheader", { name: "12 to 24 months inclusive" })).toHaveClass("plSub", "plGl");
        expect(screen.getByLabelText("No Overseas Experience").closest(".plRows")).toHaveClass("plRowsShared");
        expect(screen.getByLabelText("Caregiving").parentElement).toHaveClass("plFbox");
        expect(screen.getByText("Finished includes About to Finish and Plan to Finish. Terminated includes every termination reason.")).toHaveClass("plNote");
        expect(screen.getByText(/^Countries in no group use Other countries\./)).toHaveClass("plNote");
    });
});

describe("Direct Hire", () => {
    it("nationality bands; each agency's name and code on their own lines; the fee as a cell", async () => {
        await renderPage(<DirectHirePricingSection />);
        const table = screen.getByRole("table", { name: "Direct Hire fees" });
        expect(table).toHaveClass("plGrid", "plGridFit");
        expect(within(table).getByRole("columnheader", { name: "Filipino" }).closest("tr")).toHaveClass("plBand");
        const agencyCell = within(table).getByRole("rowheader", { name: /BGS Manpower Services/ });
        expect(within(agencyCell).getByText("BGS Manpower Services")).toHaveClass("plAgName");
        expect(within(agencyCell).getByText("BGS")).toHaveClass("plAgCode");
        expect(screen.getByLabelText("Silangan Recruitment International, Inc. (SRI) Direct Hire fee")).toHaveClass("plCell", "plCellMissing");
        expect(screen.getByLabelText("PT Mitra Karya Anugerah (MKA) Direct Hire fee")).not.toHaveClass("plCellMissing");
    });
});

describe("Pricing countries", () => {
    it("one card per group; its name a full-width field; chips with an icon to remove; the picker with its search icon; what moves out", async () => {
        await renderPage(<PricingCountriesSection />);
        const card = screen.getByRole("region", { name: "Hong Kong and Macau" });
        expect(card).toHaveClass("plSection", "plGrpCard");
        const name = within(card).getByLabelText("Group name");
        expect(name).toHaveClass("plText", "plGrpName");
        fireEvent.change(name, { target: { value: "Hong Kong" } });
        expect(name).toHaveClass("plTextChanged");
        const remove = within(card).getByRole("button", { name: "Remove Macau from Hong Kong" });
        expect(remove.querySelector("svg")).not.toBeNull();
        expect(remove).toHaveTextContent("");
        expect(within(card).getByRole("combobox").parentElement.querySelector("svg")).not.toBeNull();
        fireEvent.click(remove);
        expect(within(card).getByText("Moving to Other countries:").closest("p")).toHaveClass("plRemoved");
        const other = screen.getByRole("region", { name: "Other countries" });
        expect(other).toHaveClass("plSection", "plGrpCard");
        expect(other.querySelector(".plSecHead")).toHaveClass("plSecHeadBare");
    });

    it("view only: chips without a remove button", async () => {
        viewOnly("canViewConditionalItemPrice");
        await renderPage(<PricingCountriesSection />);
        const chip = within(screen.getByRole("region", { name: "Hong Kong and Macau" })).getByText("Macau");
        expect(chip).toHaveClass("plChip", "plChipRo");
        expect(within(chip).queryByRole("button")).toBeNull();
    });
});

describe("what the Price List keeps in view sits under the shell's topbar", () => {
    const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
    const css = read("Views/Pages/SettingsPage/newui/price-list/PriceList.module.css");
    const rule = (selector) => css.match(new RegExp(`\\n${selector.replace(/\./g, "\\.")} \\{([^}]*)\\}`))?.[1] || "";

    it("the topbar's height is one token the shell and the Price List read; the nav and the facts strip sit below it, under its menus", () => {
        const tokens = read("tokens.css");
        expect(tokens).toMatch(/--shell-topbar-h: 52px;/);
        expect(read("components/Layout/Topbar.module.css")).toMatch(/\.topbar \{[^}]*height: var\(--shell-topbar-h\);[^}]*min-height: var\(--shell-topbar-h\);/);
        expect(rule(".plNav")).toMatch(/top: calc\(var\(--shell-topbar-h\) \+ 16px\)/);
        expect(rule(".plFacts")).toMatch(/position: sticky;[\s\S]*top: var\(--shell-topbar-h\);[\s\S]*z-index: 4;/);
        expect(rule(".plGridLocal thead th")).toMatch(/top: calc\(var\(--shell-topbar-h\) \+ 30px\)/);
        // no offset of its own: every "top" under the topbar reads the token (52px row heights are the lists' own)
        expect(css).not.toMatch(/--pl-topbar-h/);
        expect(css.match(/top:[^;]*52px/g)).toBeNull();
        const zSticky = Number(tokens.match(/--z-sticky:\s*(\d+)/)[1]);
        expect(4).toBeLessThan(zSticky);
    });

    it("QA-27-031: a grid that scrolls sideways keeps its two header rows inside its own box — the group row at 0, the row under it at the group row's 30px", () => {
        expect(rule(".plGridLocal thead tr.plGhRow th")).toMatch(/top: var\(--shell-topbar-h\);[\s\S]*height: 30px;/);
        expect(rule(".plScrolls .plGridLocal thead th")).toMatch(/top: 0;/);
        expect(rule(".plScrolls .plGridLocal thead tr.plGhRow th")).toMatch(/top: 0;/);
        expect(css).toMatch(/\n\.plScrolls \.plGridLocal thead tr\.plGhRow \+ tr th \{\s*top: 30px;\s*\}/);
        // the 900px breakpoint (the section select in place of the nav) stays as PL-UI2 set it
        expect(css).toMatch(/@media \(max-width: 900px\) \{\s*\.plLayout \{ grid-template-columns: minmax\(0, 1fr\); \}\s*\.plNav \{ display: none; \}/);
    });
});
