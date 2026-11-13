/* eslint-env jest */
import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import fs from "fs";
import path from "path";
import priceListReducer from "../../redux/Slices/settings/price-list/PriceListSlice";
import ItemsByServiceSection from "../../Views/Pages/SettingsPage/newui/price-list/items-by-service/ItemsByServiceSection";
import FixedItemsTab from "../../Views/Pages/SettingsPage/newui/price-list/fixed-items/FixedItemsTab";
import SkillsList from "../../Views/Pages/SettingsPage/newui/price-list/skills/SkillsList";
import PromotionsTab from "../../Views/Pages/SettingsPage/newui/price-list/promotions/PromotionsTab";
import DirectHirePricingSection from "../../Views/Pages/SettingsPage/newui/price-list/direct-hire/DirectHirePricingSection";

/* Price List · the list pages to the reference page (27 Oct package, PL-UI3): each list on its section card in the
   reference's list style; Items by service's tools (the admin's filter control, the search with its icon) and its amount
   by source — the Fixed items amount (named so), the rule's own amount (HK$0 is an amount) or none set — three states,
   never 0 for a missing amount; its editor's label rows, the admin's selects and the amount in the field box; Fixed items'
   cards (Inactive as the admin's status tag, the system types renamed, never removed) and dialogs on the admin's form
   grid; Skills and Promotions on their cards. Layout and states only: the values, checks and saves are PL-S3…S6's. */

jest.mock("../../utils/translation", () => {
    const strings = require("../../../public/locales/en/translation.json");
    const t = (key) => strings[key] ?? key;
    return { __esModule: true, default: t, translation: t };
});
let mockIsAdmin = true;
let mockPermissions = {};
jest.mock("../../services/commonService", () => ({ __esModule: true, isAdminUser: () => mockIsAdmin }));
jest.mock("../../utils/permissions/configurationPermissionUtils", () => ({ __esModule: true, useConfigurationPermissions: () => mockPermissions }));
const mockApi = { ibs: jest.fn(), fixed: jest.fn(), skills: jest.fn(), promotions: jest.fn(), directHire: jest.fn() };
jest.mock("../../services/settings/priceList", () => ({
    __esModule: true,
    fetchItemsByServiceAPI: (...a) => mockApi.ibs(...a),
    fetchFixedItemsAPI: (...a) => mockApi.fixed(...a),
    fetchPriceListSkillsAPI: (...a) => mockApi.skills(...a),
    fetchPromotionsAPI: (...a) => mockApi.promotions(...a),
    fetchDirectHirePricingAPI: (...a) => mockApi.directHire(...a),
}));

const ok = (data) => Promise.resolve({ data: { status: true, message: "Listed successfully", data } });
const LOCAL = ["LPF", "LPT", "LPTR", "LBF", "LBT", "LBTR", "LTF", "LTT", "LTTR", "LIF", "LIT", "LITR"];
const types = () => [
    { id: 1, type_key: "insurance_policy", name: "Insurance Policy", is_system: true, active: true, items: [
        { id: 185, type_id: 1, description: "Domestic helper insurance", amount: 1000, item_use: "general" },
    ] },
    { id: 10, type_key: null, name: "Document Fee", is_system: false, active: true, items: [
        { id: 300, type_id: 10, description: "Contract documentation", amount: 500, item_use: "general" },
        { id: 301, type_id: 10, description: "OWWA membership", amount: 0, item_use: "general" },
        { id: 302, type_id: 10, description: "Release letter processing", amount: null, item_use: "general" },
    ] },
    { id: 15, type_key: null, name: "Transport", is_system: false, active: false, items: [
        { id: 310, type_id: 15, description: "Airport pick-up", amount: 300, item_use: "other_skill" },
    ] },
];
const ibs = () => ({
    version: 5,
    services: ["local", "overseas"],
    codes: { local: LOCAL, partner: [{ code: "BGS", name: "BGS Agency", nationality: "Filipino" }, { code: "SRI", name: "SRI Manpower", nationality: "Filipino" }] },
    types: types().filter((t) => t.id !== 15),
    rules: [
        // the Fixed items amount, entered
        { id: 1, price_list_id: 300, service: "local", codes: "all", treatment: "required", amount_source: "catalogue", fixed_amount: null },
        // the Fixed items amount, not entered on the item
        { id: 2, price_list_id: 302, service: "local", codes: ["LPF"], treatment: "removable", amount_source: "catalogue", fixed_amount: null },
        // the rule's own amount: HK$0
        { id: 3, price_list_id: 301, service: "overseas", codes: ["SRI"], treatment: "required", amount_source: "fixed", fixed_amount: 0 },
        // no amount set
        { id: 4, price_list_id: 185, service: "overseas", codes: ["BGS"], treatment: "manual", amount_source: "none", fixed_amount: null },
    ],
    issues: [],
});
const fixed = () => ({ version: 8, types: types() });
const promotions = (over = {}) => ({
    version: 4,
    worker_types: ["local", "overseas"],
    services: ["local", "overseas"],
    codes: { local: LOCAL, partner: [{ code: "BGS", name: "BGS Agency", nationality: "Filipino" }] },
    branches: [{ id: 1, name: "Central" }, { id: 5, name: "Tsim Sha Tsui" }],
    promotions: [{ id: 1, name: "October promotion 5%", kind: "percent", value: 5, worker_types: ["local"], services: ["local"], codes: ["LPF"], branch_ids: [1], start: "2026-10-01", end: null }],
    issues: [],
    ...over,
});

const renderPage = async (ui) => {
    const store = configureStore({
        reducer: { priceList: priceListReducer, users: (state = { permissionList: {} }) => state },
        middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
    });
    await act(async () => { render(<Provider store={store}>{ui}</Provider>); });
};
const cellsOf = (row) => within(row).getAllByRole("cell");
const rowOf = (text) => screen.getByText(text).closest("tr");

beforeEach(() => {
    mockIsAdmin = true;
    mockPermissions = {};
    mockApi.ibs.mockImplementation(() => ok(ibs()));
    mockApi.fixed.mockImplementation(() => ok(fixed()));
    mockApi.promotions.mockImplementation(() => ok(promotions()));
    mockApi.skills.mockImplementation(() => ok({ skills: [{ id: 1, key: "caregiving", name: "Caregiving", profile_field: "special_course", profile_value: { id: 1, name: "Caregiver Course" } }] }));
    mockApi.directHire.mockImplementation(() => ok({ version: 6, nationalities: [{ id: 71, name: "Filipino" }], agencies: [] }));
});

describe("Items by service", () => {
    it("the amount by its source: Fixed items amount (entered or Missing), the rule's own HK$0, none set — never 0 for missing", async () => {
        await renderPage(<ItemsByServiceSection />);
        const amount = (text) => cellsOf(rowOf(text))[4];
        expect(amount("Contract documentation")).toHaveTextContent(/^HK\$500Fixed items amount$/);
        expect(amount("Release letter processing")).toHaveTextContent(/^MissingFixed items amount$/);
        expect(amount("OWWA membership")).toHaveTextContent(/^HK\$0$/);
        expect(amount("Domestic helper insurance")).toHaveTextContent(/^Missing$/);
        expect(within(amount("Release letter processing")).getByText("Missing")).toHaveClass("plMissing");
        expect(within(amount("OWWA membership")).getByText("HK$0")).toHaveClass("plVal");
        expect(within(amount("Contract documentation")).getByText("Fixed items amount")).toHaveClass("plAmtSrc");
        expect(screen.getByText("2 missing")).toBeInTheDocument();
    });

    it("the reference list on the section card: band rows, codes in mono, all codes muted, Edit on the right, labels for narrow screens", async () => {
        await renderPage(<ItemsByServiceSection />);
        const table = screen.getByRole("table", { name: "Items by service" });
        expect(table).toHaveClass("plList", "plListTall", "plStack");
        expect(table.closest("section")).toHaveClass("plSection");
        expect(within(table).getByRole("columnheader", { name: "Overseas" }).closest("tr")).toHaveClass("plBand");
        const row = rowOf("Release letter processing");
        expect(within(row).getByText("LPF")).toHaveClass("plCodes");
        expect(within(rowOf("Contract documentation")).getByText("All Local code groups")).toHaveClass("plMuted");
        expect(within(row).getByText("Release letter processing")).toHaveClass("plNm");
        expect(cellsOf(row).slice(0, 5).map((c) => c.getAttribute("data-label"))).toEqual(["Item type", "Description", "Applies to", "How it’s added", "Amount"]);
        cellsOf(row).slice(0, 5).forEach((c) => expect(c).toHaveClass("plKv"));
        expect(cellsOf(row)[5]).toHaveClass("plAct");
    });

    it("the list's tools: the admin's filter control for the service, the search with its icon", async () => {
        await renderPage(<ItemsByServiceSection />);
        const tools = screen.getByRole("button", { name: "Service · All services" }).closest("div[class*='plListTools']");
        expect(tools).not.toBeNull();
        const search = within(tools).getByRole("searchbox", { name: "Find an item or code" });
        expect(search.parentElement).toHaveClass("plSearchField");
        expect(search.parentElement.querySelector("svg")).not.toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "Service · All services" }));
        fireEvent.click(screen.getByRole("option", { name: "Overseas" }));
        expect(screen.getByRole("button", { name: "Service · Overseas" })).toBeInTheDocument();
        expect(screen.queryByText("Release letter processing")).toBeNull();
    });

    it("the editor: label rows, the admin's selects, code chips with an icon, the set amount in the field box (blank Missing, 0 an amount)", async () => {
        await renderPage(<ItemsByServiceSection />);
        fireEvent.click(screen.getByRole("button", { name: "Edit Release letter processing, Local" }));
        const dialog = screen.getByRole("dialog", { name: "Edit item" });
        const type = within(dialog).getByLabelText("Item type");
        expect(type.parentElement).toHaveClass("selectWrap", "plEdSelect");
        expect(type.closest("div[class*='plEdRow']").querySelector("[class*='plEdValue']")).not.toBeNull();
        const chip = within(dialog).getByText("LPF").closest("span");
        expect(chip).toHaveClass("plChip");
        expect(within(chip).getByRole("button").querySelector("svg")).not.toBeNull();
        expect(within(dialog).getByRole("combobox", { name: "Add a Local code group" }).parentElement).toHaveClass("selectWrap", "plEdAdd");

        fireEvent.click(within(dialog).getByRole("radio", { name: /Set amount for this service/ }));
        const input = within(dialog).getByLabelText("Amount for this service");
        expect(input).toHaveClass("plFboxInput");
        const box = input.parentElement;
        expect(box).toHaveClass("plFbox", "plFboxMissing");
        expect(box.firstChild).toHaveTextContent("HK$");
        fireEvent.change(input, { target: { value: "0" } });
        expect(box).not.toHaveClass("plFboxMissing");
        expect(within(dialog).getByText("HK$0 is a set amount, not missing.")).toBeInTheDocument();
        fireEvent.change(input, { target: { value: "abc" } });
        expect(box).toHaveClass("plFboxInvalid");
        expect(within(dialog).getByText("Enter a number.")).toHaveClass("plFieldErr");
    });

    it("what the server found wrong on load sits in the error box", async () => {
        mockApi.ibs.mockImplementation(() => ok({ ...ibs(), issues: [{ kind: "item", rule_id: 2 }] }));
        await renderPage(<ItemsByServiceSection />);
        expect(screen.getByText("A saved item for a service is incomplete.").closest("ul")).toHaveClass("plGerr");
    });
});

describe("Fixed items", () => {
    it("a card per type: its name with Edit, Inactive as the admin's status tag, Add Item; the reference list; Missing vs HK$0", async () => {
        await renderPage(<FixedItemsTab />);
        const docs = screen.getByRole("region", { name: "Document Fee" });
        expect(docs).toHaveClass("plSection", "plFiCard");
        expect(within(docs).getByRole("table")).toHaveClass("plList", "plListTall", "plStack");
        expect(within(rowOf("Release letter processing")).getByText("Missing")).toHaveClass("plMissing");
        expect(within(rowOf("OWWA membership")).getByText("HK$0")).toHaveClass("plVal");
        const transport = screen.getByRole("region", { name: "Transport" });
        expect(transport).toHaveClass("plCardOff");
        expect(within(transport).getByText("Inactive")).toHaveClass("badge", "neutral");
        expect(within(transport).getByText("Skill · Overseas only")).toHaveClass("plAmtSrc");
    });

    it("the system type can be renamed, never removed; the dialogs sit on the admin's form grid, their error under it", async () => {
        await renderPage(<FixedItemsTab />);
        const policy = screen.getByRole("region", { name: "Insurance Policy" });
        expect(within(policy).queryByRole("button", { name: /remove|delete/i })).toBeNull();
        fireEvent.click(within(policy).getAllByRole("button", { name: "Edit" })[0]);
        let dialog = screen.getByRole("dialog", { name: "Edit item type" });
        expect(within(dialog).getByLabelText("Item type")).toHaveValue("Insurance Policy");
        expect(within(dialog).getByLabelText("Item type").closest("[class*='grid']")).not.toBeNull();
        fireEvent.change(within(dialog).getByLabelText("Item type"), { target: { value: "document fee" } });
        fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
        expect(within(dialog).getByText("An item type with this name already exists.")).toHaveClass("plFieldErr");
        fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

        fireEvent.click(within(screen.getByRole("region", { name: "Document Fee" })).getByRole("button", { name: "Add Item" }));
        dialog = screen.getByRole("dialog", { name: "Add Item" });
        expect(within(dialog).getByLabelText("Base amount (HK$)")).toHaveAttribute("placeholder", "Missing");
        expect(within(dialog).getByLabelText("Base amount (HK$)").className).not.toMatch(/cellInput/);
    });
});

describe("Skills and Promotions", () => {
    it("Skills: the list on its section card; the note about other skills after it", async () => {
        await renderPage(<SkillsList />);
        const table = screen.getByRole("table", { name: "Skills" });
        expect(table).toHaveClass("plList", "plStack");
        expect(table.closest("section")).toHaveClass("plSection");
        expect(screen.getByText(/^For another skill/).closest("section")).toBeNull();
    });

    it("Promotions: the list on its section card; the name and codes styled; the choice groups wide in the dialog", async () => {
        mockApi.promotions.mockImplementation(() => ok(promotions({ issues: [{ promotion_id: 1, field: "services", key: "PRICE_LIST_PROMOTION_APPLIES_TO" }] })));
        await renderPage(<PromotionsTab />);
        const table = screen.getByRole("table", { name: "Promotions" });
        expect(table).toHaveClass("plList", "plPromos", "plStack");
        expect(table.closest("section")).toHaveClass("plSection");
        expect(screen.getByText("October promotion 5%")).toHaveClass("plNm");
        expect(screen.getByText("LPF")).toHaveClass("plCodes");
        expect(screen.getByText("October promotion 5% needs valid Applies to selections.").closest("ul")).toHaveClass("plGerr");
        fireEvent.click(screen.getByRole("button", { name: "Edit" }));
        const dialog = screen.getByRole("dialog", { name: "Edit Promotion" });
        expect(within(dialog).getByRole("group", { name: "Worker type" })).not.toHaveClass("plFieldsetWide");
        ["Applies to", "Worker codes", "Branches"].forEach((name) => expect(within(dialog).getByRole("group", { name })).toHaveClass("plFieldsetWide"));
        expect(within(dialog).getByLabelText("Value").className).not.toMatch(/cellInput/);
    });

    it("Direct Hire's nationality filter is the admin's filter control", async () => {
        await renderPage(<DirectHirePricingSection />);
        expect(screen.getByRole("button", { name: "Nationality · All nationalities" })).toBeInTheDocument();
        expect(screen.getByRole("searchbox", { name: "Find a partner agency or code" }).parentElement).toHaveClass("plSearchField");
    });
});

describe("the old list, cell-input and pill styles are gone", () => {
    it("no rule or use of them remains in the Price List", () => {
        const dir = path.resolve(__dirname, "../../Views/Pages/SettingsPage/newui/price-list");
        const css = fs.readFileSync(path.join(dir, "PriceList.module.css"), "utf8");
        const retired = ["matrix", "matrixCard", "matrixWrap", "tdRight", "tdNumber", "tdMuted", "cellInput", "cellInputNumber", "cellInputInvalid",
            "cellError", "plPctBox", "plAdorn", "plGridCard", "plGridErrors", "plInputMissing", "plSearch", "plTag", "plTagGrey", "plBandRow",
            "plGroupCard", "plCategoryCell", "plItemName", "plSubNote"];
        const sources = [];
        const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".js") && sources.push(fs.readFileSync(path.join(d, e.name), "utf8"))));
        walk(dir);
        const left = retired.filter((c) => new RegExp(`\\.${c}\\b(?![A-Za-z0-9])`).test(css) || sources.some((src) => new RegExp(`styles\\.${c}\\b`).test(src)));
        expect(left).toEqual([]);
    });
});
