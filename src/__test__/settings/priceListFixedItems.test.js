/* eslint-env jest */
import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import priceListReducer from "../../redux/Slices/settings/price-list/PriceListSlice";
import FixedItemsTab from "../../Views/Pages/SettingsPage/newui/price-list/fixed-items/FixedItemsTab";
import { PriceListFrameContext } from "../../Views/Pages/SettingsPage/newui/price-list/shared/priceListFrame";
import {
    buildFixedItemsPayload, fixedItemChanges, itemCheck, savedFixedItems, typeError,
} from "../../Views/Pages/SettingsPage/newui/price-list/fixed-items/fixedItemsConfig";

/* Price List · Fixed items (27 Oct package, PL-S5): type cards with their items; Add Item Type, Add Item and Edit open the
   package's dialogs; amounts can be Missing (0 is a set amount); Item use; the system types can be renamed and stay
   active (QA-27-022); nothing is deleted; Review; Save.
   PL-UI1: staff who may edit see Add Item Type, Add Item and each Edit at once (no page Edit step); Cancel and Review
   changes are in the footer bar; Items by service opens through the Price List frame. */

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
    fetchFixedItemsAPI: (...a) => mockFetch(...a),
    saveFixedItemsAPI: (...a) => mockSave(...a),
}));

const page = (over = {}) => ({
    version: 8,
    types: [
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
        { id: 20, type_key: "skill_fee", name: "Skills", is_system: false, active: true, items: [
            { id: 320, type_id: 20, description: "Caregiving", amount: 1200, item_use: "caregiving" },
        ] },
    ],
    ...over,
});
const ok = (data, message = "Listed successfully") => Promise.resolve({ data: { status: true, message, data } });

const renderTab = (frame = null) => {
    const store = configureStore({
        reducer: { priceList: priceListReducer, users: (state = { permissionList: {} }) => state },
        middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
    });
    render(<Provider store={store}><PriceListFrameContext.Provider value={frame}><FixedItemsTab /></PriceListFrameContext.Provider></Provider>);
};
const textValue = (text) => (_, el) => el?.className?.includes?.("plReviewText") && el.textContent === text;
const footText = (text) => (_, el) => el?.className?.includes?.("plFootStatus") && el.textContent === text;

beforeEach(() => {
    mockIsAdmin = true;
    mockPermissions = {};
    mockFetch.mockReset();
    mockSave.mockReset();
    mockFetch.mockImplementation(() => ok(page()));
});

describe("the package's checks, changes and save body", () => {
    const saved = savedFixedItems(page());

    it("a type needs a name used by no other type (case and spaces aside); a type keeping its own name is fine", () => {
        expect(typeError({ id: "new-type-1", name: "  " }, {}, saved)).toBe("Enter an item type.");
        expect(typeError({ id: "new-type-1", name: " transport " }, {}, saved)).toBe("An item type with this name already exists.");
        expect(typeError({ id: 10, name: "Document Fee" }, {}, saved)).toBe("");
        expect(typeError({ id: 10, name: "Documents" }, {}, saved)).toBe("");
        // QA-27-022 (ruling 13): a system type stays active; it can only be renamed; any other type may be set inactive
        expect(typeError({ id: 1, name: "Insurance Policy", active: false }, {}, saved)).toBe("System item types stay active; they can only be renamed.");
        expect(typeError({ id: 1, name: "Insurance Plan", active: true }, {}, saved)).toBe("");
        expect(typeError({ id: 10, name: "Document Fee", active: false }, {}, saved)).toBe("");
    });

    it("an item: a description, an amount (blank = Missing, 0 kept), Driving refused, Caregiving / Nursing need their Item use, a description used once", () => {
        const check = (item) => itemCheck({ id: "new-item-1", type_id: 10, item_use: "general", ...item }, {}, saved);
        expect(check({ description: " ", amount: "" }).error).toBe("Enter a description.");
        expect(check({ description: "Courier", amount: "-5" }).error).toBe("Price cannot be negative.");
        expect(check({ description: "Courier", amount: "1.005" }).error).toBe("Use no more than 2 decimal places.");
        expect(check({ description: "Driving", amount: "", item_use: "other_skill" }).error).toBe("Driving is not an Overseas skill charge. Use the Local Process as driver base fee.");
        expect(check({ description: "Nursing", amount: "" }).error).toBe("Choose Nursing under Item use.");
        expect(check({ description: "nursing", amount: "1500", item_use: "nursing" })).toEqual({ error: "", amount: 1500 });
        expect(check({ description: "airport PICK-UP", amount: "" }).error).toBe("An item with this description already exists.");
        expect(check({ description: "Courier", amount: "" })).toEqual({ error: "", amount: null });
        expect(check({ description: "Courier", amount: "0" })).toEqual({ error: "", amount: 0 });
        expect(itemCheck({ id: 300, type_id: 10, description: "Contract documentation", amount: "450", item_use: "general" }, {}, saved)).toEqual({ error: "", amount: 450 });
    });

    it("changes are one row per changed field (the package's review); the body sends a new item with its new type's index", () => {
        const draft = {
            types: [...saved.types.map((t) => (t.id === 1 ? { ...t, name: "Insurance Plan", active: false } : t)), { id: "new-type-1", name: "Medical Check", active: true }],
            items: [
                ...saved.items.map((i) => (i.id === 301 ? { ...i, amount: null } : i)),
                { id: "new-item-1", type_id: "new-type-1", description: "Pre-employment medical", amount: null, item_use: "general" },
                { id: "new-item-2", type_id: 20, description: "Tutoring", amount: 800, item_use: "other_skill" },
            ],
        };
        expect(fixedItemChanges(draft, saved).map((c) => [c.name, c.field, c.before, c.after])).toEqual([
            ["Insurance Plan", "Name", "Insurance Policy", "Insurance Plan"],
            ["Insurance Plan", "Status", "Active", "Inactive"],
            ["Medical Check", "New", "Not set", "Name: Medical Check · Status: Active"],
            ["OWWA membership", "Amount", "HK$0", "Missing"],
            ["Pre-employment medical", "New", "Not set", "Description: Pre-employment medical · Amount: Missing · Item use: General item"],
            ["Tutoring", "New", "Not set", "Description: Tutoring · Amount: HK$800 · Item use: Other skill — Overseas only"],
        ]);
        expect(buildFixedItemsPayload(page(), draft, saved)).toEqual({
            base_version: 8,
            types: [{ id: 1, name: "Insurance Plan", active: false }, { id: null, name: "Medical Check", active: true }],
            items: [
                { id: 301, type_id: 10, type_index: null, description: "OWWA membership", amount: null, item_use: "general" },
                { id: null, type_id: null, type_index: 1, description: "Pre-employment medical", amount: null, item_use: "general" },
                { id: null, type_id: 20, type_index: null, description: "Tutoring", amount: 800, item_use: "other_skill" },
            ],
        });
    });
});

describe("Fixed items", () => {
    it("view only: each type with its items: Missing for not entered, HK$0 for zero, Inactive types tagged, skill items marked", async () => {
        mockIsAdmin = false;
        mockPermissions = { canViewFixedItemPrice: true };
        await act(async () => { renderTab(); });
        expect(screen.getByRole("heading", { name: "Fixed items" })).toBeInTheDocument();
        expect(screen.getByText("Catalogue descriptions and amounts. Automatic additions are set in Items by service.")).toBeInTheDocument();
        const docs = screen.getByRole("region", { name: "Document Fee" });
        expect(within(docs).getByText("HK$500")).toBeInTheDocument();
        expect(within(docs).getByText("HK$0")).toBeInTheDocument();
        expect(within(docs).getByText("Missing")).toBeInTheDocument();
        expect(within(docs).queryByRole("button")).toBeNull();
        const transport = screen.getByRole("region", { name: "Transport" });
        expect(within(transport).getByText("Inactive")).toBeInTheDocument();
        expect(within(transport).getByText("Skill · Overseas only")).toBeInTheDocument();
        const skills = screen.getByRole("region", { name: "Skills" });
        expect(within(skills).getByText("Staff-added skill charges for Overseas only. No profile entry is required.")).toBeInTheDocument();
        expect(within(skills).queryByText("Skill · Overseas only")).toBeNull();
    });

    it("staff who may edit see Add Item Type, Add Item and each Edit at once (no page Edit step)", async () => {
        await act(async () => { renderTab(); });
        expect(screen.getByRole("button", { name: "Add Item Type" })).toBeInTheDocument();
        const docs = screen.getByRole("region", { name: "Document Fee" });
        expect(within(docs).getAllByRole("button", { name: "Edit" })).toHaveLength(4);
        expect(within(docs).getByRole("button", { name: "Add Item" })).toBeInTheDocument();
        expect(within(docs).getByText("Missing")).toBeInTheDocument();
        expect(screen.getByText(footText("No unsaved changes"))).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Review changes" })).toBeDisabled();
    });

    it("Items by service is a link when the page may be opened; the page tells the frame it may be edited", async () => {
        const frame = { go: jest.fn(), permitted: () => true, report: jest.fn(), setCrumb: jest.fn(), footNode: null };
        await act(async () => { renderTab(frame); });
        fireEvent.click(screen.getByRole("button", { name: "Items by service" }));
        expect(frame.go).toHaveBeenCalledWith("items-by-service");
        expect(frame.report).toHaveBeenLastCalledWith({ changes: 0, canEdit: true, alert: "" });
    });

    it("Items by service is plain text when this user may not open it", async () => {
        await act(async () => { renderTab({ go: jest.fn(), permitted: () => false, report: jest.fn(), setCrumb: jest.fn(), footNode: null }); });
        expect(screen.queryByRole("button", { name: "Items by service" })).toBeNull();
        expect(screen.getByText(/Items by service/)).toBeInTheDocument();
    });

    it("adds a type and a Missing item, renames a system type (its Status stays Active, QA-27-022); reviews and saves", async () => {
        mockSave.mockImplementation(() => ok(page({ version: 9 }), "Changes saved."));
        await act(async () => { renderTab(); });
        fireEvent.click(screen.getByRole("button", { name: "Add Item Type" }));
        let dialog = screen.getByRole("dialog", { name: "Add Item Type" });
        fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
        expect(within(dialog).getByText("Enter an item type.")).toBeInTheDocument();
        fireEvent.change(within(dialog).getByLabelText("Item type"), { target: { value: "document fee" } });
        fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
        expect(within(dialog).getByText("An item type with this name already exists.")).toBeInTheDocument();
        fireEvent.change(within(dialog).getByLabelText("Item type"), { target: { value: "Medical Check" } });
        fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
        expect(screen.queryByRole("dialog")).toBeNull();

        const medical = screen.getByRole("region", { name: "Medical Check" });
        expect(within(medical).getByText("No items yet.")).toBeInTheDocument();
        fireEvent.click(within(medical).getByRole("button", { name: "Add Item" }));
        dialog = screen.getByRole("dialog", { name: "Add Item" });
        expect(within(dialog).getByLabelText("Base amount (HK$)")).toHaveAttribute("placeholder", "Missing");
        fireEvent.change(within(dialog).getByLabelText("Description"), { target: { value: "Driving" } });
        fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
        expect(within(dialog).getByText("Driving is not an Overseas skill charge. Use the Local Process as driver base fee.")).toBeInTheDocument();
        fireEvent.change(within(dialog).getByLabelText("Description"), { target: { value: "Pre-employment medical" } });
        fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
        expect(within(screen.getByRole("region", { name: "Medical Check" })).getByText("Missing")).toBeInTheDocument();

        const policy = screen.getByRole("region", { name: "Insurance Policy" });
        fireEvent.click(within(policy).getAllByRole("button", { name: "Edit" })[0]);
        dialog = screen.getByRole("dialog", { name: "Edit item type" });
        fireEvent.change(within(dialog).getByLabelText("Item type"), { target: { value: "Insurance Plan" } });
        expect(within(dialog).getByLabelText("Status")).toBeDisabled();
        expect(within(dialog).getByLabelText("Status")).toHaveValue("active");
        expect(within(dialog).getByText("System item types stay active; they can only be renamed.")).toBeInTheDocument();
        fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
        expect(within(screen.getByRole("region", { name: "Insurance Plan" })).queryByText("Inactive")).toBeNull();
        expect(screen.getByText(footText("3 unsaved changes · Fixed items"))).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText("Changes to Fixed items")).toBeInTheDocument();
        expect(within(dialog).getByText("Insurance Plan · Name")).toBeInTheDocument();
        expect(within(dialog).getByText(textValue("Insurance Policy→Insurance Plan"))).toBeInTheDocument();
        expect(within(dialog).queryByText(textValue("Active→Inactive"))).toBeNull();
        expect(within(dialog).getByText("Pre-employment medical · New")).toBeInTheDocument();
        expect(within(dialog).getByText(textValue("Not set→Description: Pre-employment medical · Amount: Missing · Item use: General item"))).toBeInTheDocument();
        expect(within(dialog).getByText("Invoices already created keep their prices.")).toBeInTheDocument();
        await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" })); });
        expect(mockSave).toHaveBeenCalledWith({
            base_version: 8,
            types: [{ id: 1, name: "Insurance Plan", active: true }, { id: null, name: "Medical Check", active: true }],
            items: [{ id: null, type_id: null, type_index: 1, description: "Pre-employment medical", amount: null, item_use: "general" }],
        });
        expect(screen.getByText("Changes saved.")).toBeInTheDocument();
    });

    it("editing an item: Caregiving needs its Item use; 0 is a set amount and clearing an amount makes it Missing", async () => {
        await act(async () => { renderTab(); });
        const docs = screen.getByRole("region", { name: "Document Fee" });
        fireEvent.click(within(docs).getAllByRole("button", { name: "Edit" })[1]);
        let dialog = screen.getByRole("dialog", { name: "Edit item" });
        expect(within(dialog).getByLabelText("Description")).toHaveValue("Contract documentation");
        expect(within(dialog).getByLabelText("Base amount (HK$)")).toHaveValue("500");
        fireEvent.change(within(dialog).getByLabelText("Description"), { target: { value: "Caregiving" } });
        fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
        expect(within(dialog).getByText("Choose Caregiving under Item use.")).toBeInTheDocument();
        fireEvent.change(within(dialog).getByLabelText("Description"), { target: { value: "Contract documentation" } });
        fireEvent.change(within(dialog).getByLabelText("Base amount (HK$)"), { target: { value: "" } });
        fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
        expect(within(screen.getByRole("region", { name: "Document Fee" })).getAllByText("Missing")).toHaveLength(2);
        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText(textValue("HK$500→Missing"))).toBeInTheDocument();
        expect(within(dialog).getByText("1 entry becomes missing. Invoices that need it can’t be created until it is entered again.")).toBeInTheDocument();
    });

    it("View without the Fixed item Edit key shows the catalogue with no Edit, no Add Item Type and no footer bar", async () => {
        mockIsAdmin = false;
        mockPermissions = { canViewFixedItemPrice: true };
        await act(async () => { renderTab(); });
        expect(screen.getByRole("region", { name: "Document Fee" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Add Item Type" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Review changes" })).toBeNull();
    });
});
