/* eslint-env jest */
import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import priceListReducer from "../../redux/Slices/settings/price-list/PriceListSlice";
import PricingCountriesSection from "../../Views/Pages/SettingsPage/newui/price-list/countries/PricingCountriesSection";
import {
    buildCountryGroupsPayload, groupChanges, groupIssues, savedCountryGroups,
} from "../../Views/Pages/SettingsPage/newui/price-list/countries/countryGroupsConfig";

/* Price List · Pricing countries (27 Oct package, PL-S4): groups of master countries, each country in one group at most;
   Other countries holds the rest and cannot be edited. Add group, rename, add or remove countries; Review; Save.
   PL-UI1: staff who may edit see the entries at once (no Edit step); Cancel and Review changes are in the footer bar. */

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
    fetchCountryGroupsAPI: (...a) => mockFetch(...a),
    saveCountryGroupsAPI: (...a) => mockSave(...a),
}));

const HK = 1, MO = 119, SG = 156, TW = 176, MY = 126, BN = 22, KW = 96;
const COUNTRIES = [
    { id: BN, name: "Brunei Darussalam", active: true }, { id: HK, name: "Hong Kong", active: true }, { id: KW, name: "Kuwait", active: true },
    { id: MO, name: "Macau", active: true }, { id: MY, name: "Malaysia", active: true }, { id: 900, name: "Retired land", active: false },
    { id: SG, name: "Singapore", active: true }, { id: TW, name: "Taiwan", active: true },
];
const page = (over = {}) => ({
    version: 4,
    groups: [
        { id: 2, name: "Hong Kong and Macau", country_ids: [HK, MO], rates_complete: true },
        { id: 3, name: "Singapore and Taiwan", country_ids: [SG, TW], rates_complete: true },
    ],
    other: { id: 1, name: "Other countries", rates_complete: false },
    countries: COUNTRIES,
    agency_count: 7,
    ...over,
});
const ok = (data, message = "Listed successfully") => Promise.resolve({ data: { status: true, message, data } });
const name = (id) => COUNTRIES.find((c) => c.id === id)?.name || String(id);

const renderSection = () => {
    const store = configureStore({
        reducer: { priceList: priceListReducer, users: (state = { permissionList: {} }) => state },
        middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
    });
    render(<Provider store={store}><PricingCountriesSection /></Provider>);
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
    const saved = savedCountryGroups(page());
    it("a name and a country are required; a name used twice or 'Other countries', or a country in two groups, is refused", () => {
        const draft = { groups: [...saved.groups, { id: "new-1", name: "", country_ids: [] }, { id: "new-2", name: "other countries", country_ids: [SG] }] };
        expect(groupIssues(draft, saved, "Other countries", name).map((i) => [i.index, i.field, i.err, Boolean(i.req)])).toEqual([
            [2, "name", "Enter a group name.", true],
            [2, "countries", "Add at least one country.", true],
            [3, "name", "A group with this name already exists.", false],
            [3, "countries", "Singapore is already in Singapore and Taiwan.", false],
        ]);
    });

    it("changes: new groups, renames and every country whose group changes; the body sends only added or changed groups", () => {
        const draft = { groups: [
            { id: 2, name: "Hong Kong", country_ids: [HK] },
            { id: 3, name: "Singapore and Taiwan", country_ids: [SG, TW] },
            { id: "new-1", name: "Malaysia and Brunei", country_ids: [MY, BN] },
        ] };
        expect(groupChanges(draft, saved, "Other countries", name).map((c) => [c.kind, c.kind === "move" ? `${name(c.country)}: ${c.from} → ${c.to}` : c.group.name])).toEqual([
            ["rename", "Hong Kong"],
            ["new", "Malaysia and Brunei"],
            ["move", "Brunei Darussalam: Other countries → Malaysia and Brunei"],
            ["move", "Macau: Hong Kong and Macau → Other countries"],
            ["move", "Malaysia: Other countries → Malaysia and Brunei"],
        ]);
        expect(buildCountryGroupsPayload(page(), draft, saved)).toEqual({
            base_version: 4,
            groups: [{ id: 2, name: "Hong Kong", country_ids: [HK] }, { id: null, name: "Malaysia and Brunei", country_ids: [MY, BN] }],
        });
    });
});

describe("Pricing countries", () => {
    it("view only: each group with its countries and Other countries, nothing to change", async () => {
        mockIsAdmin = false;
        mockPermissions = { canViewConditionalItemPrice: true };
        await act(async () => { renderSection(); });
        expect(screen.getByText("Group the countries used in Worker Profile → Work Experience → Work Location. Each country belongs to one pricing group.")).toBeInTheDocument();
        const hkmo = screen.getByRole("region", { name: "Hong Kong and Macau" });
        expect(within(hkmo).getByText("2 countries")).toBeInTheDocument();
        expect(within(hkmo).getByText("Macau")).toBeInTheDocument();
        expect(within(hkmo).queryByRole("button")).toBeNull();
        expect(within(screen.getByRole("region", { name: "Other countries" })).getByText("Every country not in a group above. Each agency schedule needs its own Other countries rates.")).toBeInTheDocument();
        expect(screen.queryByRole("textbox")).toBeNull();
    });

    it("staff who may edit see each group's name and countries as entries at once (no Edit step); Other countries stays fixed", async () => {
        await act(async () => { renderSection(); });
        expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
        const hkmo = screen.getByRole("region", { name: "Hong Kong and Macau" });
        expect(within(hkmo).getByLabelText("Group name")).toHaveValue("Hong Kong and Macau");
        expect(within(hkmo).getByRole("button", { name: "Remove Macau from Hong Kong and Macau" })).toBeInTheDocument();
        expect(within(screen.getByRole("region", { name: "Other countries" })).queryByRole("textbox")).toBeNull();
        expect(screen.getByText(footText("No unsaved changes"))).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Review changes" })).toBeDisabled();
    });

    it("a new group takes countries from the list (a country in another group is shown, not offered); review then save", async () => {
        mockSave.mockImplementation(() => ok(page({ version: 5 }), "Changes saved."));
        await act(async () => { renderSection(); });
        fireEvent.click(screen.getByRole("button", { name: "Add group" }));
        const card = screen.getByRole("region", { name: "New group" });
        fireEvent.change(within(card).getByLabelText("Group name"), { target: { value: "Gulf" } });
        const gulf = screen.getByRole("region", { name: "Gulf" });
        const picker = within(gulf).getByRole("combobox", { name: "Add a country to Gulf" });
        fireEvent.focus(picker);
        fireEvent.change(picker, { target: { value: "a" } });
        const list = within(gulf).getByRole("listbox");
        expect(within(list).getByRole("option", { name: /Macau/ })).toHaveAttribute("aria-disabled", "true");
        expect(within(list).getByText("In Hong Kong and Macau")).toBeInTheDocument();
        expect(within(list).queryByRole("option", { name: /Retired land/ })).toBeNull();
        fireEvent.mouseDown(within(list).getByRole("option", { name: "Kuwait" }));
        expect(within(gulf).getByText("Kuwait")).toBeInTheDocument();
        fireEvent.change(picker, { target: { value: "zzz" } });
        expect(within(gulf).getByText("No matching country")).toBeInTheDocument();

        // a country removed moves to Other countries
        const hkmo = screen.getByRole("region", { name: "Hong Kong and Macau" });
        fireEvent.click(within(hkmo).getByRole("button", { name: "Remove Macau from Hong Kong and Macau" }));
        expect(within(hkmo).getByText("Moving to Other countries:")).toBeInTheDocument();
        expect(screen.getByText(footText("3 unsaved changes · Pricing countries"))).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText("Changes to Pricing countries")).toBeInTheDocument();
        expect(within(dialog).getByText("Country groups")).toBeInTheDocument();
        expect(within(dialog).getByText("New group: Gulf")).toBeInTheDocument();
        expect(within(dialog).getByText(textValue("1 country"))).toBeInTheDocument();
        expect(within(dialog).getByText(textValue("Other countries→Gulf"))).toBeInTheDocument();
        expect(within(dialog).getByText(textValue("Hong Kong and Macau→Other countries"))).toBeInTheDocument();
        expect(within(dialog).getByText("Gulf adds 6 history amounts to each of the 7 agency schedules. Invoices with experience in Kuwait can’t be created until the amounts they need are entered.")).toBeInTheDocument();
        expect(within(dialog).getByText("Moved countries use their new group’s rates on invoices created after saving. Where one of those rates is missing, invoices that need it can’t be created until it is entered.")).toBeInTheDocument();
        await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" })); });
        expect(mockSave).toHaveBeenCalledWith({
            base_version: 4,
            groups: [{ id: 2, name: "Hong Kong and Macau", country_ids: [HK] }, { id: null, name: "Gulf", country_ids: [KW] }],
        });
        expect(screen.getByText("Changes saved.")).toBeInTheDocument();
    });

    it("Review refuses an empty group with the package's messages; a duplicate name shows at once", async () => {
        await act(async () => { renderSection(); });
        fireEvent.click(screen.getByRole("button", { name: "Add group" }));
        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        expect(screen.getByText("Correct 2 entries before saving.")).toBeInTheDocument();
        expect(screen.getByText("Enter a group name.")).toBeInTheDocument();
        expect(screen.getByText("Add at least one country.")).toBeInTheDocument();
        expect(screen.queryByRole("dialog")).toBeNull();
        fireEvent.change(within(screen.getByRole("region", { name: "New group" })).getByLabelText("Group name"), { target: { value: "singapore AND taiwan" } });
        expect(screen.getByText("A group with this name already exists.")).toBeInTheDocument();
    });

    it("View without the Overseas Edit key shows the groups with no Add group and no footer bar", async () => {
        mockIsAdmin = false;
        mockPermissions = { canViewConditionalItemPrice: true };
        await act(async () => { renderSection(); });
        expect(screen.getByRole("region", { name: "Singapore and Taiwan" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Add group" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Review changes" })).toBeNull();
    });
});
