/* eslint-env jest */
import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import priceListReducer from "../../redux/Slices/settings/price-list/PriceListSlice";
import PromotionsTab from "../../Views/Pages/SettingsPage/newui/price-list/promotions/PromotionsTab";
import {
    buildPromotionsPayload, codesFor, datesText, issueTexts, promotionChanges, promotionIssues, savedPromotions, servicesFor,
} from "../../Views/Pages/SettingsPage/newui/price-list/promotions/promotionsConfig";

/* Price List · Promotions (27 Oct package, PL-S6): name, worker types, Applies to, Worker codes, branches, dates (or
   Indefinite) and a percentage or an amount; Add Promotion and Edit in the package's dialog; Review; Save; no delete.
   PL-UI1: staff who may edit see "+ Add Promotion" and each row's Edit at once (no page Edit step); Cancel and Review
   changes are in the footer bar. */

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
    fetchPromotionsAPI: (...a) => mockFetch(...a),
    savePromotionsAPI: (...a) => mockSave(...a),
}));

const LOCAL = ["LPF", "LPT", "LPTR", "LBF", "LBT", "LBTR", "LTF", "LTT", "LTTR", "LIF", "LIT", "LITR"];
const page = (over = {}) => ({
    version: 4,
    worker_types: ["local", "overseas"],
    services: ["local", "overseas", "direct_hire", "local_transfer", "renewal"],
    codes: { local: LOCAL, partner: [{ code: "BGS", name: "BGS Agency", nationality: "Filipino" }, { code: "KMD", name: "KMD Services", nationality: "Filipino" }] },
    branches: [{ id: 1, name: "Central" }, { id: 3, name: "Shatin Office" }, { id: 5, name: "Tsim Sha Tsui" }],
    promotions: [
        { id: 1, name: "October promotion 5%", kind: "percent", value: 5, worker_types: ["local", "overseas"], services: ["local", "overseas", "direct_hire", "local_transfer", "renewal"], codes: ["LPF", "LPT", "BGS"], branch_ids: [1, 5], start: "2026-10-01", end: "2026-10-31" },
        { id: 2, name: "Local promotion HK$200", kind: "flat", value: 200, worker_types: ["local"], services: ["local", "local_transfer", "renewal"], codes: ["LPF", "LIF"], branch_ids: [1, 5], start: "2026-09-01", end: null },
    ],
    issues: [],
    ...over,
});
const ok = (data, message = "Listed successfully") => Promise.resolve({ data: { status: true, message, data } });
const renderTab = () => {
    const store = configureStore({
        reducer: { priceList: priceListReducer, users: (state = { permissionList: {} }) => state },
        middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
    });
    render(<Provider store={store}><PromotionsTab /></Provider>);
};
const textValue = (text) => (_, el) => el?.className?.includes?.("plReviewText") && el.textContent === text;
const footText = (text) => (_, el) => el?.className?.includes?.("plFootStatus") && el.textContent === text;
const rowsOf = () => screen.getAllByRole("row").slice(1).map((row) => Array.from(row.cells).map((c) => c.textContent));

beforeEach(() => {
    mockIsAdmin = true;
    mockPermissions = {};
    mockFetch.mockReset();
    mockSave.mockReset();
    mockFetch.mockImplementation(() => ok(page()));
});

describe("the package's rules, changes and save body", () => {
    const data = page();
    const saved = savedPromotions(data);
    const base = data.promotions[0];

    it("worker types decide the services and codes a promotion can name", () => {
        expect(servicesFor(["local"]).map((s) => s.id)).toEqual(["local", "local_transfer", "renewal"]);
        expect(servicesFor(["overseas"]).map((s) => s.id)).toEqual(["overseas", "direct_hire"]);
        expect(codesFor(["overseas"], data)).toEqual(["BGS", "KMD"]);
        expect(codesFor(["local", "overseas"], data)).toHaveLength(14);
        expect(datesText("2026-10-01", "2026-10-31")).toBe("1 Oct 2026 – 31 Oct 2026");
        expect(datesText("2026-09-01", null)).toBe("From 1 Sep 2026");
    });

    it("the package's checks, with the promotion's name", () => {
        const errs = (over) => promotionIssues({ ...base, ...over }, data).map((i) => i.err);
        expect(errs({})).toEqual([]);
        expect(errs({ end: null })).toEqual([]);
        expect(errs({ name: " " })).toEqual(["A saved promotion has no name."]);
        expect(errs({ value: 120 })).toEqual(["October promotion 5% has a value that is not allowed."]);
        expect(errs({ kind: "flat", value: 1500 })).toEqual([]);
        expect(errs({ worker_types: ["overseas"] })).toEqual([
            "October promotion 5% needs valid Applies to selections.",
            "October promotion 5% has Worker Code initials that don’t match its worker types.",
        ]);
        expect(errs({ branch_ids: [] })).toEqual(["October promotion 5% has a branch that is not in the list."]);
        expect(errs({ start: "" })).toEqual(["October promotion 5% has no valid start date."]);
        expect(errs({ end: "2026-09-30" })).toEqual(["October promotion 5%: End Date must be after Start Date."]);
    });

    it("changes are one row per field (a new promotion one row with all of them); the body sends added and changed promotions", () => {
        const draft = { promotions: [
            { ...base, name: "October promotion 6%", value: 6, end: null },
            saved.promotions[1],
            { id: "new-1", name: "Year-end promotion 8%", kind: "percent", value: 8, worker_types: ["overseas"], services: ["overseas", "direct_hire"], codes: ["BGS", "KMD"], branch_ids: [1, 3, 5], start: "2026-12-01", end: "2026-12-31" },
        ] };
        expect(promotionChanges(draft, saved, data).map((c) => [c.name, c.field, c.before, c.after])).toEqual([
            ["October promotion 6%", "Name", "October promotion 5%", "October promotion 6%"],
            ["October promotion 6%", "Value", "5", "6"],
            ["October promotion 6%", "End", "31 Oct 2026", "Indefinite"],
            ["Year-end promotion 8%", "New", "Not set", "Name: Year-end promotion 8% · Discount: Percentage · Value: 8 · Worker type: Overseas · Applies to: Overseas, Direct Hire · Worker codes: BGS, KMD · Branches: Central, Shatin Office, Tsim Sha Tsui · Start: 1 Dec 2026 · End: 31 Dec 2026"],
        ]);
        expect(buildPromotionsPayload(data, draft, saved)).toEqual({
            base_version: 4,
            promotions: [
                { id: 1, name: "October promotion 6%", kind: "percent", value: 6, worker_types: ["local", "overseas"], services: ["local", "overseas", "direct_hire", "local_transfer", "renewal"], codes: ["LPF", "LPT", "BGS"], branch_ids: [1, 5], start: "2026-10-01", end: null },
                { id: null, name: "Year-end promotion 8%", kind: "percent", value: 8, worker_types: ["overseas"], services: ["overseas", "direct_hire"], codes: ["BGS", "KMD"], branch_ids: [1, 3, 5], start: "2026-12-01", end: "2026-12-31" },
            ],
        });
    });

    it("what the server found wrong on load, in the package's wording", () => {
        const withIssues = page({ issues: [{ promotion_id: 2, field: "services", key: "PRICE_LIST_PROMOTION_APPLIES_TO" }, { promotion_id: 2, field: "end", key: "PRICE_LIST_PROMOTION_END_BEFORE_START" }] });
        expect(issueTexts(withIssues).map((i) => i.text)).toEqual([
            "Local promotion HK$200 needs valid Applies to selections.",
            "Local promotion HK$200: End Date must be after Start Date.",
        ]);
    });
});

describe("Promotions", () => {
    it("view only: lists Promotion · Value · Applies to · Worker codes · Branches · Dates", async () => {
        mockIsAdmin = false;
        mockPermissions = { canViewPromotion: true };
        await act(async () => { renderTab(); });
        expect(screen.getByRole("heading", { name: "Promotions" })).toBeInTheDocument();
        expect(screen.getByText("Staff choose an eligible promotion for each invoice item. A flat amount applies to each item selected.")).toBeInTheDocument();
        expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Promotion", "Value", "Applies to", "Worker codes", "Branches", "Dates"]);
        expect(rowsOf()).toEqual([
            ["October promotion 5%", "5%", "Local, Overseas, Direct Hire, Local Transfer, Renewal", "LPF, LPT, BGS", "Central, Tsim Sha Tsui", "1 Oct 2026 – 31 Oct 2026"],
            ["Local promotion HK$200", "HK$200", "Local, Local Transfer, Renewal", "LPF, LIF", "Central, Tsim Sha Tsui", "From 1 Sep 2026"],
        ]);
        expect(screen.queryByRole("button", { name: "Edit Promotion" })).toBeNull();
    });

    it("staff who may edit see + Add Promotion and each row's Edit at once (no page Edit step)", async () => {
        await act(async () => { renderTab(); });
        expect(screen.getByRole("button", { name: "Add Promotion" })).toBeInTheDocument();
        expect(rowsOf().map((row) => row[row.length - 1])).toEqual(["Edit", "Edit"]);
        expect(screen.getByText(footText("No unsaved changes"))).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Review changes" })).toBeDisabled();
    });

    it("adds a promotion in the package's dialog (worker types decide what can be chosen), reviews and saves", async () => {
        mockSave.mockImplementation(() => ok(page({ version: 5 }), "Changes saved."));
        await act(async () => { renderTab(); });
        fireEvent.click(screen.getByRole("button", { name: "Add Promotion" }));
        const dialog = screen.getByRole("dialog", { name: "Add Promotion" });
        expect(within(dialog).getAllByText("Choose a worker type first.")).toHaveLength(2);
        fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
        expect(within(dialog).getByText("Enter a promotion value.")).toBeInTheDocument();
        fireEvent.change(within(dialog).getByLabelText("Promo name"), { target: { value: "Year-end promotion 8%" } });
        fireEvent.click(within(dialog).getByLabelText("Overseas"));
        expect(within(dialog).queryByLabelText("Local Transfer")).toBeNull();
        fireEvent.click(within(dialog).getByLabelText("Direct Hire"));
        fireEvent.click(within(dialog).getByLabelText("BGS"));
        fireEvent.click(within(dialog).getByLabelText("Central"));
        fireEvent.change(within(dialog).getByLabelText("Start date"), { target: { value: "2026-12-01" } });
        fireEvent.change(within(dialog).getByLabelText("Value"), { target: { value: "8" } });
        fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(rowsOf()).toContainEqual(["Year-end promotion 8%", "8%", "Direct Hire", "BGS", "Central", "From 1 Dec 2026", "Edit"]);
        expect(screen.getByText(footText("1 unsaved change · Promotions"))).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        const review = screen.getByRole("dialog");
        expect(within(review).getByText("Year-end promotion 8% · New")).toBeInTheDocument();
        expect(within(review).getByText(textValue("Not set→Name: Year-end promotion 8% · Discount: Percentage · Value: 8 · Worker type: Overseas · Applies to: Direct Hire · Worker codes: BGS · Branches: Central · Start: 1 Dec 2026 · End: Indefinite"))).toBeInTheDocument();
        expect(within(review).getByText("Invoices already created keep their prices.")).toBeInTheDocument();
        await act(async () => { fireEvent.click(within(review).getByRole("button", { name: "Save changes" })); });
        expect(mockSave).toHaveBeenCalledWith({
            base_version: 4,
            promotions: [{ id: null, name: "Year-end promotion 8%", kind: "percent", value: 8, worker_types: ["overseas"], services: ["direct_hire"], codes: ["BGS"], branch_ids: [1], start: "2026-12-01", end: null }],
        });
        expect(screen.getByText("Changes saved.")).toBeInTheDocument();
    });

    it("editing: an end date before the start is refused; a percentage over 100 is refused; dropping a worker type drops its choices", async () => {
        await act(async () => { renderTab(); });
        fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
        const dialog = screen.getByRole("dialog", { name: "Edit Promotion" });
        expect(within(dialog).getByLabelText("Promo name")).toHaveValue("October promotion 5%");
        fireEvent.change(within(dialog).getByLabelText("End date"), { target: { value: "2026-09-01" } });
        fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
        expect(within(dialog).getByText("October promotion 5%: End Date must be after Start Date.")).toBeInTheDocument();
        fireEvent.change(within(dialog).getByLabelText("End date"), { target: { value: "2026-11-30" } });
        fireEvent.change(within(dialog).getByLabelText("Value"), { target: { value: "120" } });
        fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
        expect(within(dialog).getByText("Enter a percentage from 0 to 100.")).toBeInTheDocument();
        fireEvent.change(within(dialog).getByLabelText("Value"), { target: { value: "5" } });
        fireEvent.click(within(within(dialog).getByRole("group", { name: "Worker type" })).getByLabelText("Local"));
        fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
        expect(rowsOf()[0]).toEqual(["October promotion 5%", "5%", "Overseas, Direct Hire", "BGS", "Central, Tsim Sha Tsui", "1 Oct 2026 – 30 Nov 2026", "Edit"]);
    });

    it("shows what the server found wrong on load", async () => {
        mockFetch.mockImplementation(() => ok(page({ issues: [{ promotion_id: 2, field: "services", key: "PRICE_LIST_PROMOTION_APPLIES_TO" }] })));
        await act(async () => { renderTab(); });
        expect(screen.getByText("Local promotion HK$200 needs valid Applies to selections.")).toBeInTheDocument();
    });

    it("View without the Promotion Edit key lists the promotions with no Edit, no Add Promotion and no footer bar", async () => {
        mockIsAdmin = false;
        mockPermissions = { canViewPromotion: true };
        await act(async () => { renderTab(); });
        expect(screen.getByText("October promotion 5%")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Add Promotion" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Review changes" })).toBeNull();
    });
});
