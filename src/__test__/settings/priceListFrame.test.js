/* eslint-env jest */
import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import priceListReducer from "../../redux/Slices/settings/price-list/PriceListSlice";
import PriceListPage from "../../Views/Pages/SettingsPage/newui/price-list/PriceListPage";
import { savedValues } from "../../Views/Pages/SettingsPage/newui/price-list/local/localPricingConfig";

/* Price List · the frame (27 Oct package, PL-UI1; layout of the package's reference Price List page): the breadcrumb, the
   "Price List" title (View only when the page shown may not be edited), the section nav in the package's order with a
   separator before Fixed items and what each page needs, the page named by the address (#local, #overseas, …) and its
   footer bar. Leaving a page with unsaved changes asks first. Worker promotions are a separate module, shown as before. */

jest.mock("../../utils/translation", () => {
    const strings = require("../../../public/locales/en/translation.json");
    const t = (key) => strings[key] ?? key;
    return { __esModule: true, default: t, translation: t };
});
let mockIsAdmin = true;
let mockPermissions = {};
jest.mock("../../services/commonService", () => ({ __esModule: true, isAdminUser: () => mockIsAdmin }));
jest.mock("../../utils/permissions/configurationPermissionUtils", () => ({ __esModule: true, useConfigurationPermissions: () => mockPermissions }));
jest.mock("../../Views/Pages/SettingsPage/newui/price-list/worker-promotions/WorkerPromotionsTab", () => {
    const R = require("react");
    return { __esModule: true, default: () => R.createElement("p", null, "The worker promotions module") };
});
const mockApi = {
    fetchLocal: jest.fn(), saveLocal: jest.fn(), fetchOverseas: jest.fn(), fetchAgency: jest.fn(), fetchDirectHire: jest.fn(), fetchItemsByService: jest.fn(),
};
jest.mock("../../services/settings/priceList", () => ({
    __esModule: true,
    fetchLocalPricingAPI: (...a) => mockApi.fetchLocal(...a),
    saveLocalPricingAPI: (...a) => mockApi.saveLocal(...a),
    fetchOverseasPricingAPI: (...a) => mockApi.fetchOverseas(...a),
    fetchAgencyPricingAPI: (...a) => mockApi.fetchAgency(...a),
    fetchDirectHirePricingAPI: (...a) => mockApi.fetchDirectHire(...a),
    fetchItemsByServiceAPI: (...a) => mockApi.fetchItemsByService(...a),
}));

const ok = (data) => Promise.resolve({ data: { status: true, message: "Listed successfully", data } });
const LF = 2, PH = 71, ID = 95;
const local = () => ({
    version: 7,
    local_replacement_percent: 15,
    categories: [{ id: LF, name: "Local Finished" }],
    nationalities: [{ id: PH, name: "Filipino" }, { id: ID, name: "Indonesian" }],
    cells: [PH, ID].map((n) => ({ contract_category_id: LF, nationality_id: n, standard_fee: n === PH ? 10000 : null, driver_fee: null })),
    service_cells: ["local_transfer", "renewal"].flatMap((s) => [PH, ID].map((n) => ({ service: s, nationality_id: n, standard_fee: 0, driver_fee: 0 }))),
});
const BGS = { id: 12, code: "BGS", name: "BGS Manpower Services", nationality_id: PH };
const MKA = { id: 13, code: "MKA", name: "PT Mitra Karya Anugerah", nationality_id: ID };
const overseas = () => ({
    version: 4,
    overseas_replacement_percent: 10,
    nationalities: [{ id: PH, name: "Filipino", fee: 15800 }, { id: ID, name: "Indonesian", fee: null }],
    agencies: [{ ...BGS, missing: 0 }, { ...MKA, missing: 3 }],
});
const agency = () => ({
    version: 2,
    agency: { ...BGS, nationality_name: "Filipino" },
    base_fee: 15800,
    overseas_replacement_percent: 10,
    no_overseas_experience_fee: 0,
    skills: [],
    missing: 0,
});
const directHire = () => ({ version: 6, nationalities: [{ id: PH, name: "Filipino" }, { id: ID, name: "Indonesian" }], agencies: [{ ...BGS, fee: 8600 }, { ...MKA, fee: null }] });
const itemsByService = () => ({ version: 5, services: ["local"], codes: { local: [], partner: [] }, types: [], rules: [], issues: [] });

const renderPage = (entry = "/settings/price-list") => {
    const store = configureStore({
        reducer: { priceList: priceListReducer, users: (state = { permissionList: {} }) => state },
        middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
    });
    render(<Provider store={store}><MemoryRouter initialEntries={[entry]}><PriceListPage /></MemoryRouter></Provider>);
};
const sectionNav = () => screen.getByRole("navigation", { name: "Price List sections" });
const navLabels = () => within(sectionNav()).getAllByRole("button").map((b) => b.firstChild.textContent);
const navButton = (label) => within(sectionNav()).getAllByRole("button").find((b) => b.firstChild.textContent === label);
const crumbs = () => screen.getByRole("navigation", { name: "Settings" });
const footText = (text) => (_, el) => el?.className?.includes?.("plFootStatus") && el.textContent === text;

beforeEach(() => {
    mockIsAdmin = true;
    mockPermissions = {};
    Object.values(mockApi).forEach((fn) => fn.mockReset());
    mockApi.fetchLocal.mockImplementation(() => ok(local()));
    mockApi.fetchOverseas.mockImplementation(() => ok(overseas()));
    mockApi.fetchAgency.mockImplementation(() => ok(agency()));
    mockApi.fetchDirectHire.mockImplementation(() => ok(directHire()));
    mockApi.fetchItemsByService.mockImplementation(() => ok(itemsByService()));
});

describe("the frame", () => {
    it("the breadcrumb, the title, the nav in the package's order with a separator before Fixed items, and what each page needs", async () => {
        await act(async () => { renderPage(); });
        expect(await screen.findByRole("heading", { name: "Local" })).toBeInTheDocument();
        expect(within(crumbs()).getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
        expect(crumbs()).toHaveTextContent("SettingsConfigurationPrice ListLocal");
        expect(within(crumbs()).getByText("Local")).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("heading", { level: 1, name: "Price List" })).toBeInTheDocument();
        expect(screen.queryByText("View only")).toBeNull();

        expect(navLabels()).toEqual(["Local", "Overseas", "Direct Hire", "Items by service", "Skills", "Pricing countries", "Fixed items", "Promotions", "Worker promotions"]);
        expect(within(sectionNav()).getByRole("presentation").nextElementSibling).toHaveTextContent(/^Fixed items/);
        expect(navButton("Local")).toHaveAttribute("aria-current", "page");
        expect(navButton("Overseas")).not.toHaveAttribute("aria-current");
        // the pages not shown load their saved values for the nav: a missing base, MKA's schedule -> 2 incomplete
        const localMissing = Object.values(savedValues(local())).filter((v) => v == null).length;
        expect(navButton("Local")).toHaveTextContent(`Local${localMissing} missing`);
        expect(navButton("Overseas")).toHaveTextContent("Overseas2 incomplete");
        expect(navButton("Direct Hire")).toHaveTextContent("Direct Hire1 missing");
        expect(navButton("Items by service")).toHaveTextContent(/^Items by service$/);
        expect(mockApi.fetchLocal).toHaveBeenCalledTimes(1);
    });

    it("the address names the page; the nav opens another page and the breadcrumb follows", async () => {
        await act(async () => { renderPage("/settings/price-list#direct-hire"); });
        expect(await screen.findByRole("heading", { name: "Direct Hire" })).toBeInTheDocument();
        expect(navButton("Direct Hire")).toHaveAttribute("aria-current", "page");
        expect(crumbs()).toHaveTextContent("SettingsConfigurationPrice ListDirect Hire");
        await act(async () => { fireEvent.click(navButton("Overseas")); });
        expect(await screen.findByRole("table", { name: "Overseas · Base fees" })).toBeInTheDocument();
        expect(navButton("Overseas")).toHaveAttribute("aria-current", "page");
        // Price List in the breadcrumb returns to the first page
        await act(async () => { fireEvent.click(within(crumbs()).getByRole("button", { name: "Price List" })); });
        expect(await screen.findByRole("heading", { name: "Local" })).toBeInTheDocument();
    });

    it("an address naming a page this user may not open shows the first page they may", async () => {
        await act(async () => { renderPage("/settings/price-list#nowhere"); });
        expect(await screen.findByRole("heading", { name: "Local" })).toBeInTheDocument();
    });

    it("unsaved changes: the nav's dot, the footer bar under the page, and Discard unsaved changes? before leaving", async () => {
        await act(async () => { renderPage(); });
        const percent = await screen.findByLabelText("Local replacement discount");
        fireEvent.change(percent, { target: { value: "12" } });
        expect(navButton("Local")).toHaveTextContent("Local, unsaved changes");
        const slot = document.querySelector(".plFootSlot");
        expect(within(slot).getByText(footText("1 unsaved change · Local"))).toBeInTheDocument();

        fireEvent.click(navButton("Overseas"));
        let dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText("Discard unsaved changes?")).toBeInTheDocument();
        expect(within(dialog).getByText("Local has 1 unsaved change. Your saved prices will stay unchanged.")).toBeInTheDocument();
        fireEvent.click(within(dialog).getByRole("button", { name: "Keep editing" }));
        expect(screen.getByLabelText("Local replacement discount")).toHaveValue("12");
        expect(navButton("Local")).toHaveAttribute("aria-current", "page");

        fireEvent.click(navButton("Overseas"));
        dialog = screen.getByRole("dialog");
        await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Discard changes" })); });
        expect(await screen.findByRole("table", { name: "Overseas · Base fees" })).toBeInTheDocument();
        expect(within(slot).getByText(footText("No unsaved changes"))).toBeInTheDocument();
        // back on Local the draft is gone
        await act(async () => { fireEvent.click(navButton("Local")); });
        expect(await screen.findByLabelText("Local replacement discount")).toHaveValue("15");
    });

    it("an agency schedule: … › Overseas › Filipino · BGS; the breadcrumb's Overseas returns to the overview", async () => {
        await act(async () => { renderPage("/settings/price-list#overseas"); });
        await act(async () => { fireEvent.click(await screen.findByRole("button", { name: "BGS, BGS Manpower Services: open pricing" })); });
        expect(crumbs()).toHaveTextContent("SettingsConfigurationPrice ListOverseasFilipino · BGS");
        expect(within(crumbs()).getByText("Filipino · BGS")).toHaveAttribute("aria-current", "page");
        await act(async () => { fireEvent.click(within(crumbs()).getByRole("button", { name: "Overseas" })); });
        expect(screen.getByRole("table", { name: "Overseas · Base fees" })).toBeInTheDocument();
        expect(crumbs()).toHaveTextContent("SettingsConfigurationPrice ListOverseas");
    });

    it("View only: a user who may see but not edit the page shown gets the tag and no footer bar; the nav lists only the pages they may open", async () => {
        mockIsAdmin = false;
        mockPermissions = { canViewConditionalItemPrice: true };
        await act(async () => { renderPage(); });
        expect(await screen.findByRole("heading", { name: "Local" })).toBeInTheDocument();
        // the reference page's tag beside the title (PL-UI2), not a status tag
        expect(screen.getByText("View only")).toHaveClass("plRoTag");
        expect(screen.queryByRole("button", { name: "Review changes" })).toBeNull();
        expect(navLabels()).toEqual(["Local", "Overseas", "Direct Hire", "Skills", "Pricing countries"]);
        expect(mockApi.fetchItemsByService).not.toHaveBeenCalled();
    });

    it("Worker promotions are a separate module, shown as before", async () => {
        await act(async () => { renderPage("/settings/price-list#worker-promotions"); });
        expect(await screen.findByText("The worker promotions module")).toBeInTheDocument();
        expect(navButton("Worker promotions")).toHaveAttribute("aria-current", "page");
    });

    it("the alert under the title: saved prices not loaded (the page keeps Retry); saving blocked while there are unsaved changes", async () => {
        mockApi.fetchLocal.mockImplementationOnce(() => Promise.reject({ response: { status: 500, data: { status: false } } }));
        await act(async () => { renderPage(); });
        const loadAlert = await screen.findByRole("alert");
        expect(loadAlert).toHaveTextContent("Saved prices could not be loaded. Saving is unavailable so they cannot be overwritten.");
        expect(loadAlert).toHaveClass("plAlert");
        await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry" })); });
        expect(screen.queryByRole("alert")).toBeNull();

        const elsewhere = "Saved prices changed since you opened them. Reload and review them before saving.";
        mockApi.saveLocal.mockImplementation(() => Promise.reject({ response: { status: 409, data: { status: false, message: elsewhere } } }));
        fireEvent.change(screen.getByLabelText("Local replacement discount"), { target: { value: "12" } });
        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        await act(async () => { fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save changes" })); });
        const alerts = screen.getAllByRole("alert");
        expect(alerts.map((a) => a.className)).toEqual([expect.stringContaining("plAlert"), expect.stringContaining("plFootStatus")]);
        expect(alerts[0]).toHaveTextContent(elsewhere);
        // discarding the changes ends the block and the alert
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        await act(async () => { fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Discard changes" })); });
        expect(document.querySelector(".plAlert")).toBeNull();
    });

    it("no Price List page may be opened: the reason, and no nav", async () => {
        mockIsAdmin = false;
        await act(async () => { renderPage(); });
        expect(screen.getByText("You don’t have permission to view the Price List.")).toBeInTheDocument();
        expect(screen.queryByRole("navigation", { name: "Price List sections" })).toBeNull();
        expect(Object.values(mockApi).every((fn) => fn.mock.calls.length === 0)).toBe(true);
    });
});
