/* eslint-env jest */
import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import fs from "fs";
import path from "path";
import en from "../../../public/locales/en/translation.json";
import priceListReducer from "../../redux/Slices/settings/price-list/PriceListSlice";
import LocalPricingSection from "../../Views/Pages/SettingsPage/newui/price-list/local/LocalPricingSection";
import {
    buildSavePayload, cellKey, entryLabel, savedValues, serviceKey, PERCENT_KEY,
} from "../../Views/Pages/SettingsPage/newui/price-list/local/localPricingConfig";
import { lessPct, parseEntry, pctOf } from "../../Views/Pages/SettingsPage/newui/price-list/shared/priceEntries";

/* Price List · Local (27 Oct package): Base fees (PL-S1) and Local Transfer and Renewal (PL-S2), one page, one save.
   The screen never prices: it shows saved values ("Missing" = not entered, 0 shows 0), mirrors the server's checks and
   their wording, shows each Replacement amount as the server calculates it, and saves only after Review changes.
   PL-UI1: staff who may edit see the entries at once (no Edit step); Cancel and Review changes are in the footer bar. */

jest.mock("../../utils/translation", () => {
    const strings = require("../../../public/locales/en/translation.json");
    const t = (key) => strings[key] ?? key;
    return { __esModule: true, default: t, translation: t };
});
let mockIsAdmin = true;
jest.mock("../../services/commonService", () => ({ __esModule: true, isAdminUser: () => mockIsAdmin }));
jest.mock("../../utils/permissions/configurationPermissionUtils", () => ({ __esModule: true, useConfigurationPermissions: () => ({}) }));
const mockFetch = jest.fn();
const mockSave = jest.fn();
jest.mock("../../services/settings/priceList", () => ({
    __esModule: true,
    fetchLocalPricingAPI: (...args) => mockFetch(...args),
    saveLocalPricingAPI: (...args) => mockSave(...args),
}));

const LF = 2, LT = 3, LTR = 4, PH = 71, ID = 95, TH = 198, BD = 18;
const schedule = (overrides = {}) => ({
    version: 7,
    local_replacement_percent: 15,
    categories: [{ id: LF, name: "Local Finished" }, { id: LT, name: "Local Terminated" }, { id: LTR, name: "Local Terminated (TR)" }],
    nationalities: [{ id: PH, name: "Filipino" }, { id: ID, name: "Indonesian" }, { id: TH, name: "Thai" }, { id: BD, name: "Bangladeshi" }],
    cells: [LF, LT, LTR].flatMap((c) => [PH, ID, TH, BD].map((n) => ({ contract_category_id: c, nationality_id: n, standard_fee: null, driver_fee: null }))),
    service_cells: ["local_transfer", "renewal"].flatMap((s) => [PH, ID, TH, BD].map((n) => ({ service: s, nationality_id: n, standard_fee: null, driver_fee: null }))),
    ...overrides,
});
const withCell = (data, c, n, values) => ({ ...data, cells: data.cells.map((x) => (x.contract_category_id === c && x.nationality_id === n ? { ...x, ...values } : x)) });
const withService = (data, s, n, values) => ({ ...data, service_cells: data.service_cells.map((x) => (x.service === s && x.nationality_id === n ? { ...x, ...values } : x)) });
const ok = (data, message = "Listed successfully") => Promise.resolve({ data: { status: true, message, data } });

const renderSection = () => {
    const store = configureStore({
        reducer: { priceList: priceListReducer, users: (state = { permissionList: {} }) => state },
        middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
    });
    render(<Provider store={store}><LocalPricingSection /></Provider>);
    return store;
};

/* the footer bar's status: "2 unsaved changes · Local" (the scope in its own span) */
const footText = (text) => (_, el) => el?.className?.includes?.("plFootStatus") && el.textContent === text;

beforeEach(() => { mockIsAdmin = true; mockFetch.mockReset(); mockSave.mockReset(); });

describe("the rules mirror the server (domain/priceList/amounts.ts) with the package's wording", () => {
    it("blank is not entered, 0 is a set amount; negatives, words, a third decimal and > 100% are refused", () => {
        expect(parseEntry("", "amt")).toEqual({ ok: true, value: null });
        expect(parseEntry("0", "amt")).toEqual({ ok: true, value: 0 });
        expect(parseEntry("10,000", "amt")).toEqual({ ok: true, value: 10000 });
        expect(parseEntry("HK$1,234.50", "amt")).toEqual({ ok: true, value: 1234.5 });
        expect(parseEntry("-1", "amt").err).toBe("Price cannot be negative.");
        expect(parseEntry("abc", "amt").err).toBe("Enter a number.");
        expect(parseEntry("1.005", "amt").err).toBe("Use no more than 2 decimal places.");
        expect(parseEntry("100.5", "pct").err).toBe("Enter a percentage from 0 to 100.");
        expect(parseEntry("-5", "pct").err).toBe("Enter a percentage from 0 to 100.");
        expect(parseEntry("15%", "pct")).toEqual({ ok: true, value: 15 });
    });

    it("Replacement = base less the percentage, half-up to the cent; unknown when either is not entered", () => {
        expect(lessPct(10000, 15)).toBe(8500);
        expect(lessPct(13000, 15)).toBe(11050);
        expect(pctOf(2.01, 50)).toBe(1.01);
        expect(lessPct(null, 15)).toBeNull();
        expect(lessPct(10000, null)).toBeNull();
    });

    it("the save sends the version it was based on, only the changed cells (both fees), and null for not entered", () => {
        const data = withCell(schedule(), LF, PH, { standard_fee: 10000, driver_fee: 13000 });
        const saved = savedValues(data);
        const draft = { [cellKey(LF, PH, "driver_fee")]: "", [cellKey(LT, BD, "standard_fee")]: "0", [PERCENT_KEY]: "15" };
        expect(buildSavePayload(data, draft, saved)).toEqual({
            base_version: 7,
            cells: [
                { contract_category_id: LF, nationality_id: PH, standard_fee: 10000, driver_fee: null },
                { contract_category_id: LT, nationality_id: BD, standard_fee: 0, driver_fee: null },
            ],
            service_cells: [],
        });
    });

    it("PL-S2: a changed Local Transfer or Renewal fee is sent with both of its fees; labels follow the package", () => {
        const data = withService(schedule(), "local_transfer", PH, { standard_fee: 7800, driver_fee: 9800 });
        const saved = savedValues(data);
        expect(saved[serviceKey("local_transfer", PH, "standard_fee")]).toBe(7800);
        expect(saved[serviceKey("renewal", BD, "driver_fee")]).toBeNull();
        const draft = { [serviceKey("local_transfer", PH, "driver_fee")]: "0", [serviceKey("renewal", TH, "standard_fee")]: "6,200" };
        expect(buildSavePayload(data, draft, saved)).toEqual({
            base_version: 7,
            cells: [],
            service_cells: [
                { service: "local_transfer", nationality_id: PH, standard_fee: 7800, driver_fee: 0 },
                { service: "renewal", nationality_id: TH, standard_fee: 6200, driver_fee: null },
            ],
        });
        expect(entryLabel(data, serviceKey("local_transfer", BD, "driver_fee"))).toBe("Bangladeshi · Local Transfer · Driver");
        expect(entryLabel(data, serviceKey("renewal", PH, "standard_fee"))).toBe("Filipino · Renewal · Standard");
        expect(entryLabel(data, cellKey(LF, PH, "standard_fee"))).toBe("Filipino · Local Finished · Standard");
    });
});

describe("Local · Base fees screen", () => {
    it("view only: Missing for not entered, 0 for zero, the Local % and the calculated Replacement rows; no footer bar", async () => {
        mockIsAdmin = false;
        mockFetch.mockReturnValue(ok(withCell(withCell(schedule(), LF, PH, { standard_fee: 10000, driver_fee: 13000 }), LF, ID, { standard_fee: 0 })));
        await act(async () => { renderSection(); });
        expect(screen.getByText("Base fees")).toBeInTheDocument();
        expect(screen.getByText("15%")).toBeInTheDocument();
        expect(screen.getByText("Applied once, to the base fee only.")).toBeInTheDocument();
        const standard = screen.getByRole("table", { name: "Base fees · Standard" });
        const rows = within(standard).getAllByRole("row");
        const newRow = rows.find((r) => within(r).queryByText("Local Finished"));
        const cells = within(newRow).getAllByRole("cell").map((c) => c.textContent);
        expect(cells).toEqual(["10,000", "0", "Missing", "Missing"]);
        const replacement = rows[rows.indexOf(newRow) + 1];
        expect(within(replacement).getByText("Base less 15%")).toBeInTheDocument();
        expect(within(replacement).getAllByRole("cell").map((c) => c.textContent)).toEqual(["8,500", "0", "—", "—"]);
        const driver = screen.getByRole("table", { name: "Base fees · Driver" });
        expect(within(driver).getAllByText("11,050").length).toBe(1);
        expect(screen.getByText("21 missing")).toBeInTheDocument();
        expect(screen.queryByText(/Wait in Macau/i)).toBeNull();
        expect(screen.queryByRole("textbox")).toBeNull();
        expect(screen.queryByRole("button", { name: "Review changes" })).toBeNull();
    });

    it("staff who may edit see the entries at once (no Edit step): blank shows Missing, 0 stays 0; calculated rows stay read-only", async () => {
        mockFetch.mockReturnValue(ok(withCell(withCell(schedule(), LF, PH, { standard_fee: 10000, driver_fee: 13000 }), LF, ID, { standard_fee: 0 })));
        await act(async () => { renderSection(); });
        expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
        expect(screen.getByLabelText("Local replacement discount")).toHaveValue("15");
        const standard = screen.getByRole("table", { name: "Base fees · Standard" });
        const rows = within(standard).getAllByRole("row");
        const newRow = rows.find((r) => within(r).queryByText("Local Finished"));
        expect(within(newRow).getAllByRole("textbox").map((i) => [i.value, i.placeholder])).toEqual([
            ["10,000", "Missing"], ["0", "Missing"], ["", "Missing"], ["", "Missing"],
        ]);
        const replacement = rows[rows.indexOf(newRow) + 1];
        expect(within(replacement).queryByRole("textbox")).toBeNull();
        expect(within(replacement).getAllByRole("cell").map((c) => c.textContent)).toEqual(["8,500", "0", "—", "—"]);
        expect(screen.getByText(footText("No unsaved changes"))).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Review changes" })).toBeDisabled();
    });

    it("an invalid entry blocks Review with the package's message; a valid edit is reviewed old -> new and saved", async () => {
        mockFetch.mockReturnValue(ok(withCell(schedule(), LF, PH, { standard_fee: 10000 })));
        const saveAnswer = withCell(schedule({ version: 8, local_replacement_percent: 10 }), LF, PH, { standard_fee: 10000, driver_fee: 0 });
        mockSave.mockReturnValue(ok(saveAnswer, "Changes saved."));
        await act(async () => { renderSection(); });

        const driverInput = screen.getByLabelText("Driver base fee, Local Finished, Filipino");
        fireEvent.change(driverInput, { target: { value: "-5" } });
        expect(screen.getByText("Price cannot be negative.", { exact: false })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        expect(screen.getByText("Correct 1 entry before saving.")).toBeInTheDocument();
        expect(screen.queryByRole("dialog")).toBeNull();

        fireEvent.change(driverInput, { target: { value: "0" } });
        fireEvent.change(screen.getByLabelText("Local replacement discount"), { target: { value: "10" } });
        expect(screen.getByText(footText("2 unsaved changes · Local"))).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText("Changes to Local")).toBeInTheDocument();
        expect(within(dialog).getByText("Filipino · Local Finished · Driver")).toBeInTheDocument();
        expect(within(dialog).getByText((_, el) => el?.className?.includes?.("plReviewValue") && el.textContent === "Missing→HK$0")).toBeInTheDocument();
        expect(within(dialog).getByText(/Every Local Replacement amount uses the new rate/)).toBeInTheDocument();
        expect(within(dialog).getByText(/For example, Filipino · Local Finished · Standard: HK\$8,500 → HK\$9,000\./)).toBeInTheDocument();
        expect(within(dialog).getByText("Invoices already created keep their prices.")).toBeInTheDocument();

        await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" })); });
        expect(mockSave).toHaveBeenCalledWith({
            base_version: 7,
            local_replacement_percent: 10,
            cells: [{ contract_category_id: LF, nationality_id: PH, standard_fee: 10000, driver_fee: 0 }],
            service_cells: [],
        });
        expect(screen.getByText("Changes saved.")).toBeInTheDocument();
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(screen.getByLabelText("Local replacement discount")).toHaveValue("10");
    });

    it("a save refused because the prices changed elsewhere keeps the changes and blocks saving until they are discarded", async () => {
        mockFetch.mockReturnValue(ok(schedule()));
        mockSave.mockImplementation(() => Promise.reject({ response: { status: 409, data: { status: false, message: "Saved prices changed since you opened them. Reload and review them before saving." } } }));
        await act(async () => { renderSection(); });
        fireEvent.change(screen.getByLabelText("Standard base fee, Local Finished, Filipino"), { target: { value: "9000" } });
        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        await act(async () => { fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save changes" })); });
        expect(screen.getByRole("alert")).toHaveTextContent("Saved prices changed since you opened them. Reload and review them before saving.");
        expect(screen.getByLabelText("Standard base fee, Local Finished, Filipino")).toHaveValue("9,000");
        expect(screen.getByRole("button", { name: "Review changes" })).toBeDisabled();
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(screen.getByText("Discard unsaved changes?")).toBeInTheDocument();
        await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Discard changes" })); });
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("a save refused for permission (the contract answers 401 Access Denied) shows the package's copy and keeps the changes", async () => {
        mockFetch.mockReturnValue(ok(schedule()));
        mockSave.mockImplementation(() => Promise.reject({ response: { status: 401, data: { status: false, message: "Access Denied" } } }));
        await act(async () => { renderSection(); });
        fireEvent.change(screen.getByLabelText("Standard base fee, Local Finished, Filipino"), { target: { value: "9000" } });
        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        await act(async () => { fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save changes" })); });
        expect(screen.getByRole("alert")).toHaveTextContent("Not saved. You no longer have permission to edit the Price List.");
        expect(screen.queryByText("Access Denied")).toBeNull();
        expect(screen.getByLabelText("Standard base fee, Local Finished, Filipino")).toHaveValue("9,000");
    });
});

describe("Local · Local Transfer and Renewal (PL-S2)", () => {
    it("its own Standard and Driver grids by service: Missing for not entered, 0 for zero, no Replacement row (view only)", async () => {
        mockIsAdmin = false;
        const data = withService(withService(schedule(), "local_transfer", PH, { standard_fee: 7800, driver_fee: 9800 }), "renewal", BD, { standard_fee: 0 });
        mockFetch.mockReturnValue(ok(data));
        await act(async () => { renderSection(); });
        const section = screen.getByRole("region", { name: "Local Transfer and Renewal" });
        expect(within(section).getByText("Their own Standard and Driver fees. No New or Replacement pricing, replacement discount or supplements.")).toBeInTheDocument();
        expect(within(section).getByText("13 missing")).toBeInTheDocument();
        expect(within(screen.getByRole("region", { name: "Base fees" })).getByText("24 missing")).toBeInTheDocument();

        const standard = within(section).getByRole("table", { name: "Local Transfer and Renewal · Standard" });
        expect(within(standard).getByRole("columnheader", { name: "Service" })).toBeInTheDocument();
        const [transfer, renewal] = within(standard).getAllByRole("row").slice(2);
        expect(within(transfer).getByRole("rowheader")).toHaveTextContent("Local Transfer");
        expect(within(transfer).getAllByRole("cell").map((c) => c.textContent)).toEqual(["7,800", "Missing", "Missing", "Missing"]);
        expect(within(renewal).getByRole("rowheader")).toHaveTextContent("Renewal");
        expect(within(renewal).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Missing", "Missing", "Missing", "0"]);
        expect(within(section).queryByText(/Base less/)).toBeNull();

        const driver = within(section).getByRole("table", { name: "Local Transfer and Renewal · Driver" });
        expect(within(within(driver).getAllByRole("row")[2]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["9,800", "Missing", "Missing", "Missing"]);
    });

    it("a Transfer fee is checked in its own section, reviewed under its own group, and saved in the one Local save", async () => {
        mockFetch.mockReturnValue(ok(withService(schedule(), "local_transfer", BD, { standard_fee: 4300 })));
        mockSave.mockReturnValue(ok(withService(schedule({ version: 8 }), "local_transfer", BD, { driver_fee: 0 }), "Changes saved."));
        await act(async () => { renderSection(); });
        const section = screen.getByRole("region", { name: "Local Transfer and Renewal" });
        const driverInput = screen.getByLabelText("Driver fee, Local Transfer, Bangladeshi");

        fireEvent.change(driverInput, { target: { value: "1.234" } });
        expect(within(section).getByText("1 to correct")).toBeInTheDocument();
        expect(within(section).getByText("Bangladeshi · Local Transfer · Driver")).toBeInTheDocument();
        expect(within(screen.getByRole("region", { name: "Base fees" })).queryByText(/to correct|Use no more/)).toBeNull();

        fireEvent.change(driverInput, { target: { value: "0" } });
        fireEvent.change(screen.getByLabelText("Standard fee, Local Transfer, Bangladeshi"), { target: { value: "" } });
        expect(within(section).getByText("2 changed")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        const dialog = screen.getByRole("dialog");
        const value = (text) => (_, el) => el?.className?.includes?.("plReviewValue") && el.textContent === text;
        expect(within(dialog).getByText("Local Transfer and Renewal · Standard")).toBeInTheDocument();
        expect(within(dialog).getByText("Local Transfer and Renewal · Driver")).toBeInTheDocument();
        expect(within(dialog).getByText("Bangladeshi · Local Transfer · Standard")).toBeInTheDocument();
        expect(within(dialog).getByText(value("HK$4,300→Missing"))).toBeInTheDocument();
        expect(within(dialog).getByText(value("Missing→HK$0"))).toBeInTheDocument();
        expect(within(dialog).getByText(/^1 entry becomes missing\./)).toBeInTheDocument();
        expect(within(dialog).queryByText(/Every Local Replacement amount/)).toBeNull();

        await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" })); });
        expect(mockSave).toHaveBeenCalledWith({
            base_version: 7,
            cells: [],
            service_cells: [{ service: "local_transfer", nationality_id: BD, standard_fee: null, driver_fee: 0 }],
        });
        expect(screen.getByText("Changes saved.")).toBeInTheDocument();
    });
});

describe("the old Local editor is gone", () => {
    it("no Wait-in-Macau matrix, old endpoints or helpers remain in the Price List code", () => {
        const root = path.resolve(__dirname, "../..");
        const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
        expect(fs.existsSync(path.join(root, "Views/Pages/SettingsPage/newui/price-list/conditional-items/LocalConditionalItem.js"))).toBe(false);
        expect(fs.existsSync(path.join(root, "Views/Pages/SettingsPage/newui/price-list/conditional-items/useLocalConditionalItems.js"))).toBe(false);
        expect(read("services/apiPath.js")).not.toMatch(/conditional-item-local/);
        expect(read("services/apiPath.js")).toMatch(/priceListLocal: '\/contract\/price-list\/local'/);
        expect(read("redux/Slices/settings/price-list/PriceListSlice.js")).not.toMatch(/conditionalItemLocal|conditionItemLocalList/);
        expect(read("Views/Pages/SettingsPage/newui/settingsNewUiConstants.js")).not.toMatch(/LOCAL_CONTRACT_TYPE/);
        expect(read("Views/Pages/SettingsPage/newui/price-list/priceListConfig.js")).not.toMatch(/getLocalAmount|updateLocalAmount|contractTypeExists/);
        expect(en.key_pl_missing).toBe("Missing");
    });
});
