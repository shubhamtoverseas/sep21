/* eslint-env jest */
import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import priceListReducer from "../../redux/Slices/settings/price-list/PriceListSlice";
import ItemsByServiceSection from "../../Views/Pages/SettingsPage/newui/price-list/items-by-service/ItemsByServiceSection";
import { PriceListFrameContext } from "../../Views/Pages/SettingsPage/newui/price-list/shared/priceListFrame";
import {
    buildItemsByServicePayload, issueTexts, overlaps, retiredDescription, reviewRows, ruleChanges, savedItemRules,
} from "../../Views/Pages/SettingsPage/newui/price-list/items-by-service/itemsByServiceConfig";
import { navMeta } from "../../Views/Pages/SettingsPage/newui/price-list/priceListNav";

/* Price List · Items by service (27 Oct package, PL-S5): a Fixed items catalogue item for one service and All codes or
   listed codes, how it is added and which amount applies. The same item, service and code are never set up twice, All
   codes against listed codes included. Add item / Edit / Remove in the package's editor; Review; Save.
   PL-UI1: staff who may edit see "+ Add item" and each row's Edit at once (no page Edit step); the service filter and the
   search sit in the list's section; Cancel and Review changes are in the footer bar; Fixed items opens through the frame. */

jest.mock("../../utils/translation", () => {
    const strings = require("../../../public/locales/en/translation.json");
    const t = (key) => strings[key] ?? key;
    return { __esModule: true, default: t, translation: t };
});
let mockIsAdmin = true;
let mockPermissions = {};
jest.mock("../../services/commonService", () => ({ __esModule: true, isAdminUser: () => mockIsAdmin }));
jest.mock("../../utils/permissions/configurationPermissionUtils", () => ({ __esModule: true, useConfigurationPermissions: () => mockPermissions }));
const mockFetch = jest.fn();
const mockSave = jest.fn();
jest.mock("../../services/settings/priceList", () => ({
    __esModule: true,
    fetchItemsByServiceAPI: (...a) => mockFetch(...a),
    saveItemsByServiceAPI: (...a) => mockSave(...a),
}));

const LOCAL = ["LPF", "LPT", "LPTR", "LBF", "LBT", "LBTR", "LTF", "LTT", "LTTR", "LIF", "LIT", "LITR"];
const page = (over = {}) => ({
    version: 5,
    services: ["local", "overseas", "direct_hire", "local_transfer", "renewal"],
    codes: {
        local: LOCAL,
        partner: [
            { code: "BGS", name: "BGS Agency", nationality: "Filipino" },
            { code: "KMD", name: "KMD Services", nationality: "Filipino" },
            { code: "SRI", name: "SRI Manpower", nationality: "Filipino" },
        ],
    },
    types: [
        { id: 1, type_key: "insurance_policy", name: "Insurance Policy", is_system: true, active: true, items: [
            { id: 185, type_id: 1, description: "Domestic helper insurance", amount: 1000, item_use: "general" },
        ] },
        { id: 10, type_key: null, name: "Document Fee", is_system: false, active: true, items: [
            { id: 300, type_id: 10, description: "Contract documentation", amount: 500, item_use: "general" },
            { id: 301, type_id: 10, description: "OWWA membership", amount: 250, item_use: "general" },
            { id: 302, type_id: 10, description: "Release letter processing", amount: 350, item_use: "general" },
        ] },
        { id: 20, type_key: "skill_fee", name: "Skills", is_system: false, active: true, items: [
            { id: 320, type_id: 20, description: "Caregiving", amount: 1200, item_use: "caregiving" },
        ] },
    ],
    rules: [
        { id: 1, price_list_id: 300, service: "local", codes: "all", treatment: "required", amount_source: "catalogue", fixed_amount: null },
        { id: 3, price_list_id: 302, service: "local", codes: ["LPTR", "LITR"], treatment: "required", amount_source: "none", fixed_amount: null },
        { id: 8, price_list_id: 301, service: "overseas", codes: ["KMD", "SRI"], treatment: "required", amount_source: "fixed", fixed_amount: 200 },
    ],
    issues: [],
    ...over,
});
const ok = (data, message = "Listed successfully") => Promise.resolve({ data: { status: true, message, data } });

const renderSection = (frame = null) => {
    const store = configureStore({
        reducer: { priceList: priceListReducer, users: (state = { permissionList: {} }) => state },
        middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
    });
    render(<Provider store={store}><PriceListFrameContext.Provider value={frame}><ItemsByServiceSection /></PriceListFrameContext.Provider></Provider>);
};
const textValue = (text) => (_, el) => el?.className?.includes?.("plReviewText") && el.textContent === text;
const footText = (text) => (_, el) => el?.className?.includes?.("plFootStatus") && el.textContent === text;
/* the admin's filter control (FilterSelect): open "<label> · <value>", choose an option */
const chooseFilter = (label, option) => {
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label} · `) }));
    fireEvent.click(screen.getByRole("option", { name: option }));
};
const rowsOf = () => screen.getAllByRole("row").slice(1).map((row) => row.textContent);

beforeEach(() => {
    mockIsAdmin = true;
    mockPermissions = {};
    mockFetch.mockReset();
    mockSave.mockReset();
    mockFetch.mockImplementation(() => ok(page()));
});

describe("the package's rules, changes and save body", () => {
    const data = page();
    const saved = savedItemRules(data);

    it("the same item and service never share a code — All codes against listed codes too; other items and services stay apart", () => {
        const all = { price_list_id: 300, service: "local", codes: "all" };
        expect(overlaps([all, { price_list_id: 300, service: "local", codes: ["LBF"] }], data).map((o) => o.codes)).toEqual([["LBF"]]);
        expect(overlaps([{ price_list_id: 301, service: "overseas", codes: ["SRI", "BGS"] }, { price_list_id: 301, service: "overseas", codes: ["KMD", "SRI"] }], data).map((o) => o.codes)).toEqual([["SRI"]]);
        expect(overlaps([all, { price_list_id: 300, service: "local_transfer", codes: ["LBF"] }, { price_list_id: 302, service: "local", codes: ["LBF"] }], data)).toEqual([]);
    });

    it("changes are new, edited and removed rules; the body sends the new and edited ones and the removed ids", () => {
        const draft = { rules: [
            { ...saved.rules[0], treatment: "removable" },
            saved.rules[2],
            { id: "new-1", price_list_id: 185, service: "overseas", codes: "all", treatment: "manual", amount_source: "fixed", fixed_amount: 0 },
        ] };
        const changes = ruleChanges(draft, saved);
        expect(changes.map((c) => c.kind)).toEqual(["edit", "new", "removed"]);
        expect(buildItemsByServicePayload(data, draft, saved)).toEqual({
            base_version: 5,
            rules: [
                { id: 1, price_list_id: 300, service: "local", codes: "all", treatment: "removable", amount_source: "catalogue", fixed_amount: null },
                { id: null, price_list_id: 185, service: "overseas", codes: "all", treatment: "manual", amount_source: "fixed", fixed_amount: 0 },
            ],
            removed: [3],
        });
        expect(reviewRows(changes, data).map((r) => [r.label, r.before, r.after])).toEqual([
            ["Document Fee · Contract documentation · Local · All Local code groups", null, ""],
            ["How it’s added", "Automatic, required", "Automatic, removable"],
            ["New: Insurance Policy · Domestic helper insurance", null, "Overseas · All partner codes, including codes added later · Manual · HK$0"],
            ["Removed: Document Fee · Release letter processing", null, "Local · LPTR, LITR · Automatic, required · Missing"],
        ]);
    });

    it("what the server found on load, in the package's wording", () => {
        const withIssues = page({ issues: [
            { kind: "overlap", rule_ids: [1, 3], codes: ["LPTR", "LITR", "LPF", "LBF"] },
            { kind: "codes", rule_id: 8, codes: ["LUZ"] },
            { kind: "skill", rule_id: 8 },
            { kind: "item", rule_id: 3 },
        ] });
        expect(issueTexts(withIssues).map((i) => i.text)).toEqual([
            "Document Fee · Contract documentation is set up twice for LPTR, LITR, LPF and others in Local.",
            "Document Fee · OWWA membership has worker codes that don’t belong to Overseas.",
            "Skill Fixed Items are manual-only Overseas items using the Fixed items amount.",
            "A saved item for a service is incomplete.",
        ]);
    });

    it("OP-27-39 (b): a rule whose item is no longer in Fixed items is named on load, keeps its name in the list and makes the nav say incomplete", () => {
        const retired = { id: 9, price_list_id: 303, service: "renewal", codes: "all", treatment: "removable", amount_source: "fixed", fixed_amount: 10 };
        const data = page({ rules: [...page().rules, retired], issues: [{ kind: "item", rule_id: 9, description: "Old courier fee" }, { kind: "item", rule_id: 3, description: null }] });
        expect(issueTexts(data).map((i) => i.text)).toEqual([
            "Old courier fee for Renewal is no longer an item in Fixed items. Choose another item or remove this rule.",
            "A saved item for a service is incomplete.",
        ]);
        expect(retiredDescription(data, retired)).toBe("Old courier fee");
        expect(retiredDescription(data, data.rules[0])).toBe("");
        // the nav: the package's "N missing" for amounts only; "N incomplete" once a rule's item is retired, each rule once
        expect(navMeta("items-by-service", page())).toBe("1 missing");
        expect(navMeta("items-by-service", data)).toBe("2 incomplete");
        const retiredCatalogue = page({ rules: [...page().rules, { ...retired, amount_source: "catalogue", fixed_amount: null }] });
        expect(navMeta("items-by-service", retiredCatalogue)).toBe("2 incomplete");
        expect(navMeta("items-by-service", page({ rules: [page().rules[0]] }))).toBe("");
    });
});

describe("Items by service", () => {
    it("lists the rules by service: Item type · Description · Applies to · How it’s added · Amount; filters by service or by an item or code", async () => {
        mockIsAdmin = false;
        mockPermissions = { canViewFixedItemPrice: true };
        await act(async () => { renderSection(); });
        expect(screen.getByText("Fixed items that apply to a Contract Invoice for each service and code. Items and their types are kept in Fixed items.")).toBeInTheDocument();
        const head = screen.getAllByRole("rowgroup")[0];
        expect(within(head).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Item type", "Description", "Applies to", "How it’s added", "Amount"]);
        expect(rowsOf()).toEqual([
            "Local",
            "Document FeeContract documentationAll Local code groupsAutomatic, requiredHK$500Fixed items amount",
            "Document FeeRelease letter processingLPTR, LITRAutomatic, requiredMissing",
            "Overseas",
            "Document FeeOWWA membershipKMD, SRIAutomatic, requiredHK$200",
        ]);
        expect(screen.getByText("1 missing")).toBeInTheDocument();
        chooseFilter("Service", "Overseas");
        expect(rowsOf()).toEqual(["Overseas", "Document FeeOWWA membershipKMD, SRIAutomatic, requiredHK$200"]);
        chooseFilter("Service", "All services");
        fireEvent.change(screen.getByRole("searchbox", { name: "Find an item or code" }), { target: { value: "litr" } });
        expect(rowsOf()).toEqual(["Local", "Document FeeRelease letter processingLPTR, LITRAutomatic, requiredMissing"]);
        fireEvent.change(screen.getByRole("searchbox", { name: "Find an item or code" }), { target: { value: "zzz" } });
        expect(rowsOf()).toEqual(["No item matches."]);
    });

    it("staff who may edit see + Add item and each row's Edit at once (no page Edit step); the filters sit in the list's section", async () => {
        await act(async () => { renderSection(); });
        expect(screen.getByRole("heading", { name: "Items by service" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
        const head = screen.getAllByRole("rowgroup")[0];
        expect(within(head).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Item type", "Description", "Applies to", "How it’s added", "Amount", "Edit"]);
        expect(screen.getByRole("button", { name: "Edit Release letter processing, Local" })).toBeInTheDocument();
        const section = screen.getByRole("table").closest("section");
        expect(within(section).getByRole("button", { name: "Service · All services" })).toBeInTheDocument();
        expect(within(section).getByRole("searchbox", { name: "Find an item or code" })).toBeInTheDocument();
        expect(within(section).getByText("1 missing")).toBeInTheDocument();
        expect(screen.getByText(footText("No unsaved changes"))).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Review changes" })).toBeDisabled();
    });

    it("the editor: every field is required; an overlap shows at once with the existing entry; skill items are not offered", async () => {
        await act(async () => { renderSection(); });
        fireEvent.click(screen.getByRole("button", { name: "Add item" }));
        const dialog = screen.getByRole("dialog", { name: "Add item" });
        expect(within(dialog).queryByRole("option", { name: "Skills" })).toBeNull();
        fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));
        for (const text of ["Choose an item type.", "Choose an item.", "Choose a service.", "Choose how it’s added.", "Choose which amount applies."]) {
            expect(within(dialog).getByText(text)).toBeInTheDocument();
        }
        fireEvent.change(within(dialog).getByLabelText("Item type"), { target: { value: "10" } });
        fireEvent.change(within(dialog).getByLabelText("Item"), { target: { value: "300" } });
        fireEvent.change(within(dialog).getByLabelText("Service"), { target: { value: "local" } });
        expect(within(dialog).getByText("Add a Local code group, or choose all Local code groups.")).toBeInTheDocument();
        fireEvent.change(within(dialog).getByRole("combobox", { name: "Add a Local code group" }), { target: { value: "LPF" } });
        expect(within(dialog).getByText("LPF already has Contract documentation in Local (All Local code groups · Automatic, required · HK$500). A code can have each item only once in a service. Edit the existing entry instead.")).toBeInTheDocument();
        fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("adds an item for all partner codes, removes another; reviews (what it means for invoices) and saves", async () => {
        mockSave.mockImplementation(() => ok(page({ version: 6 }), "Changes saved."));
        await act(async () => { renderSection(); });
        fireEvent.click(screen.getByRole("button", { name: "Add item" }));
        let dialog = screen.getByRole("dialog", { name: "Add item" });
        fireEvent.change(within(dialog).getByLabelText("Item type"), { target: { value: "1" } });
        fireEvent.change(within(dialog).getByLabelText("Item"), { target: { value: "185" } });
        fireEvent.change(within(dialog).getByLabelText("Service"), { target: { value: "overseas" } });
        expect(within(dialog).getByRole("combobox", { name: "Add a partner agency code" })).toHaveTextContent("SRI · SRI Manpower · Filipino");
        fireEvent.click(within(dialog).getByLabelText("All partner codes"));
        expect(within(dialog).getByText("Includes partner codes added later.")).toBeInTheDocument();
        fireEvent.click(within(dialog).getByRole("radio", { name: /Automatic, removable/ }));
        fireEvent.click(within(dialog).getByRole("radio", { name: /Set amount for this service/ }));
        expect(within(dialog).getByText("Can be saved as missing. Matching invoices can’t be created while it’s on them. Staff can remove it.")).toBeInTheDocument();
        fireEvent.change(within(dialog).getByLabelText("Amount for this service"), { target: { value: "0" } });
        expect(within(dialog).getByText("HK$0 is a set amount, not missing.")).toBeInTheDocument();
        fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));
        expect(rowsOf()).toContain("Insurance PolicyDomestic helper insuranceAll partner codesAutomatic, removableHK$0Edit");

        fireEvent.click(screen.getByRole("button", { name: "Edit Release letter processing, Local" }));
        dialog = screen.getByRole("dialog", { name: "Edit item" });
        fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
        expect(screen.getByText(footText("2 unsaved changes · Items by service"))).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText("New: Insurance Policy · Domestic helper insurance")).toBeInTheDocument();
        expect(within(dialog).getByText(textValue("Overseas · All partner codes, including codes added later · Automatic, removable · HK$0"))).toBeInTheDocument();
        expect(within(dialog).getByText("Removed: Document Fee · Release letter processing")).toBeInTheDocument();
        expect(within(dialog).getByText("Automatic items are added to matching invoices created after saving.")).toBeInTheDocument();
        expect(within(dialog).getByText("Removed entries no longer apply to invoices created after saving.")).toBeInTheDocument();
        expect(within(dialog).getByText("Invoices already created keep their prices.")).toBeInTheDocument();
        await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" })); });
        expect(mockSave).toHaveBeenCalledWith({
            base_version: 5,
            rules: [{ id: null, price_list_id: 185, service: "overseas", codes: "all", treatment: "removable", amount_source: "fixed", fixed_amount: 0 }],
            removed: [3],
        });
        expect(screen.getByText("Changes saved.")).toBeInTheDocument();
    });

    it("OP-27-39 (b): a rule on a retired item is listed in Problems found on load and its row keeps the item's name, ready to edit or remove", async () => {
        const retired = { id: 9, price_list_id: 303, service: "renewal", codes: "all", treatment: "removable", amount_source: "fixed", fixed_amount: 10 };
        mockFetch.mockImplementation(() => ok(page({ rules: [...page().rules, retired], issues: [{ kind: "item", rule_id: 9, description: "Old courier fee" }] })));
        await act(async () => { renderSection(); });
        expect(screen.getByRole("alert")).toHaveTextContent("Old courier fee for Renewal is no longer an item in Fixed items. Choose another item or remove this rule.");
        expect(rowsOf()).toContain("Old courier feeAll Local code groupsAutomatic, removableHK$10Edit");
        fireEvent.click(screen.getByRole("button", { name: "Edit Old courier fee, Renewal" }));
        const dialog = screen.getByRole("dialog", { name: "Edit item" });
        fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
        expect(rowsOf().some((r) => r.includes("Old courier fee"))).toBe(false);
    });

    it("shows what was found wrong on load; Fixed items is a link", async () => {
        mockFetch.mockImplementation(() => ok(page({ issues: [{ kind: "codes", rule_id: 8, codes: ["LUZ"] }] })));
        const frame = { go: jest.fn(), permitted: () => true, report: jest.fn(), setCrumb: jest.fn(), footNode: null };
        await act(async () => { renderSection(frame); });
        expect(screen.getByText("Document Fee · OWWA membership has worker codes that don’t belong to Overseas.")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Fixed items" }));
        expect(frame.go).toHaveBeenCalledWith("fixed-items");
    });

    it("View without the Fixed item Edit key lists the rules with no Edit, no Add item and no footer bar", async () => {
        mockIsAdmin = false;
        mockPermissions = { canViewFixedItemPrice: true };
        await act(async () => { renderSection(); });
        expect(screen.getByText("Contract documentation")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Add item" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Review changes" })).toBeNull();
    });
});
