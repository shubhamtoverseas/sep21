/* eslint-env jest */
import React from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";
import { DATA, DAY, PARTIES, engineRows, hasContract, priceStandalone } from "./invoiceStandaloneEngine";

/* Standalone Invoice · Invoice items (INV-G3; register #28; the INV-G1 engine route "standalone"). The Contract Invoice
   items stage in its Standalone mode: the same five-column table, opening EMPTY with its empty state; an Add Item row offers
   every active Fixed item (OP-27-66; ITEMS-ROW-1), an Add Custom Item row, Discount / Promo with the promotions the engine
   returns, no Adjust supplement, every line removable; refusals and the blocked state as INV-C3. Every change is priced
   by the engine. */

jest.mock("../../services/invoices", () => ({ priceContractInvoiceAPI: jest.fn() }));
/* eslint-disable import/first */
import { priceContractInvoiceAPI } from "../../services/invoices";
import invoices from "../../redux/Slices/invoices/InvoicesSlice";
import employer from "../../redux/Slices/employer/EmployerSlice";
import { STANDALONE, hk } from "../../Views/Pages/Invoice/add-contract-invoice/contractSetup";
import ContractInvoiceItems from "../../Views/Pages/Invoice/add-contract-invoice/ContractInvoiceItems";
/* eslint-enable import/first */

jest.setTimeout(60000);
/* lazy panels and the engine answer can take longer than the default 1 s under a full parallel run */
const SLOW = { timeout: 15000 };

beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
beforeEach(() => priceContractInvoiceAPI.mockReset());

const SETUP = { route: "standalone", party: { type: "employer", id: 40 }, date: "2026-10-23", branch: 5 };
const INFO = {
    party_type: "employer", currentInvoiceEmployerDetail: { employer_id: 40, name: "Chan Tai Man", reference_id: "E-1001" }, currentInvoiceWorkerDetail: null,
    invoice_date: "2026-10-23", branchId: 5, branch_name: "Tsim Sha Tsui", csId: 7, cs_name: "Lee Ka Yan",
};
const EMPTY = {
    ok: true, route: "standalone", problems: [], notes: [], lines: [], total: { original: 0, discount: 0, net: 0 }, refused: [], clash: [],
    available: [
        { item: 204, itemType: "Document Fee", label: "Contract documentation", amount: 500 },
        { item: 210, itemType: "Conditional item", label: "Caregiving", amount: 800 },
    ],
    restorable: [], offerSkills: [], promotions: [], record_key: "rk",
};
const LINE = { id: "item:204", kind: "item", itemType: "Document Fee", label: "Contract documentation", item: 204, add: "manual", amountSource: "catalogue", original: 500, discount: 0, net: 500, steps: [] };
const reply = (data) => Promise.resolve({ data: { status: true, data } });

const Probe = () => {
    const { pathname, state } = useLocation();
    return <pre data-testid="next">{ JSON.stringify({ pathname, state }) }</pre>;
};
const mount = (state = { contractFormInfo: INFO, setupInput: SETUP }) => {
    const store = configureStore({ reducer: { invoices, employer } });
    render(
        <Provider store={ store }>
            <MemoryRouter initialEntries={ [{ pathname: "/invoices/general/form", state }] }>
                <Routes>
                    <Route path="/invoices/general/form" element={ <ContractInvoiceItems mode={ STANDALONE } /> } />
                    <Route path="/invoices/general/invoice-review" element={ <Probe /> } />
                    <Route path="/invoices/general/add-contract-invoice/:selection_type" element={ <Probe /> } />
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
    return store;
};
const continueButton = () => screen.getByRole("button", { name: en.key_inv_continue_to_review });
const nextScreen = async () => JSON.parse((await screen.findByTestId("next")).textContent);
/* the Add Item / Add Custom Item rows (ITEMS-ROW-1): the last empty row of a kind; a row select's menu and its options */
const draftRow = (kind) => [...document.querySelectorAll(`tbody tr[data-draft=${ kind }]`)].pop();
const openMenu = (row, label) => fireEvent.keyDown(within(row).getByLabelText(label), { key: "ArrowDown" });
const menuOptions = (row) => [...row.querySelectorAll(".mc-select__option")].map((o) => o.textContent);
const choose = (row, label, text) => {
    openMenu(row, label);
    fireEvent.click([...row.querySelectorAll(".mc-select__option")].find((o) => o.firstChild.firstChild.textContent === text));
};

describe("the Standalone items stage", () => {
    it("opens EMPTY with the empty state; Standalone wording; the party cell; no Conditional note; nothing to continue with yet", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply(EMPTY));
        mount();
        expect((await screen.findByText(en.key_inv_no_items_yet)).closest("tr")).toHaveAttribute("data-empty");
        expect(en.key_inv_no_items_yet).toBe("No items yet — use Add Item or Add Custom Item.");
        expect(priceContractInvoiceAPI).toHaveBeenCalledWith(expect.objectContaining({ route: "standalone", party: { type: "employer", id: 40 }, add: [], custom: [] }));
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en.key_add_general_invoice);
        expect(document.querySelector(".review-breadcrumb .step.done")).toHaveTextContent(en.key_invoice_setup);
        const party = document.querySelector("[data-party]");
        expect(party).toHaveTextContent(`${ en.key_employer }Chan Tai Man E-1001`);
        expect(screen.queryByText(en.key_worker_code)).toBeNull();
        expect(screen.getAllByRole("note").map((n) => n.textContent)).toEqual([`${ en.key_inv_rule_columns_title } ${ en.key_inv_rule_columns }`]);
        expect(document.querySelector("[data-total]")).toHaveTextContent("HK$0");
        expect(continueButton()).toBeDisabled();
        expect(document.querySelector(".review-foot .why")).toHaveTextContent(en.key_please_add_item_first);
        expect(screen.queryByRole("button", { name: /Apply Credit/ })).toBeNull();
    });

    it("an Add Item row offers the types and items the engine offers, each item with its amount; the empty state gives way to the row", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply(EMPTY));
        mount();
        await screen.findByText(en.key_inv_no_items_yet, {}, SLOW);
        fireEvent.click(screen.getByRole("button", { name: en.key_add_item }));
        const row = draftRow("item");
        expect(screen.queryByText(en.key_inv_no_items_yet)).toBeNull();
        expect(screen.queryByRole("dialog")).toBeNull();
        openMenu(row, en.key_item_type);
        expect(menuOptions(row)).toEqual(["Document Fee", "Conditional item"]);
        choose(row, en.key_item_type, "Document Fee");
        openMenu(row, en.key_description);
        expect(menuOptions(row)).toEqual(["Contract documentationHK$500"]);
    });

    it("a line: Discount / Promo and a live cross, never Adjust supplement; Continue opens the Standalone review with setup's input", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply({ ...EMPTY, lines: [LINE], total: { original: 500, discount: 0, net: 500 } }));
        mount();
        const row = await waitFor(() => { const r = document.querySelector("tr[data-line='item:204']"); expect(r).not.toBeNull(); return r; });
        expect(within(row).getByRole("button", { name: en.key_inv_discount_promo })).toBeInTheDocument();
        expect(within(row).queryByRole("button", { name: en.key_inv_adjust_supplement })).toBeNull();
        expect(row.querySelector(".ibtn")).toBeEnabled();
        expect(screen.queryByText(en.key_inv_no_items_yet)).toBeNull();
        await waitFor(() => expect(continueButton()).toBeEnabled());
        fireEvent.click(continueButton());
        const next = await nextScreen();
        expect(next.pathname).toBe("/invoices/general/invoice-review");
        expect(next.state).toEqual({ contractFormInfo: INFO, setupInput: SETUP });
    });

    it("blocked as INV-C3: the engine's problems word for word, no total, no Continue", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply({ ...EMPTY, ok: false, total: null, lines: [{ ...LINE, original: null, net: null }],
            problems: [{ scope: "item", item: 204, text: "Contract documentation is no longer an active Fixed item." }] }));
        mount();
        expect(await screen.findByRole("alert")).toHaveTextContent("Contract documentation is no longer an active Fixed item.");
        expect(document.querySelector("[data-total]")).toHaveTextContent("—");
        expect(continueButton()).toBeDisabled();
        expect(screen.queryByRole("button", { name: en.key_inv_back_to_setup })).toBeNull();
    });

    it("a worker party: its cell is the worker with its code", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply(EMPTY));
        mount({ contractFormInfo: { ...INFO, party_type: "worker", currentInvoiceEmployerDetail: null, currentInvoiceWorkerDetail: { id: 56, name: "Ana Cruz", reference_id: "LPF000056" } },
            setupInput: { ...SETUP, party: { type: "worker", id: 56 } } });
        await screen.findByText(en.key_inv_no_items_yet, {}, SLOW);
        expect(document.querySelector("[data-party]")).toHaveTextContent(`${ en.key_worker }Ana Cruz LPF000056`);
    });

    it("a direct link without setup's input starts at Standalone setup", async () => {
        mount(null);
        expect((await nextScreen()).pathname).toBe("/invoices/general/add-contract-invoice/employer");
        expect(priceContractInvoiceAPI).not.toHaveBeenCalled();
    });
});

/* ---------------- one walk per party, priced by the engine ---------------- */

const rows = () => [...document.querySelectorAll("tbody tr[data-line]")];
const rowWith = (label) => rows().find((tr) => tr.querySelector("td.de").firstChild.textContent === label);
const tableLines = () => rows().map((tr) => {
    const cells = tr.querySelectorAll("td");
    const de = cells[1].cloneNode(true);
    de.querySelectorAll(".dt").forEach((n) => n.remove());
    const steps = [...cells[3].querySelectorAll(".inv-step")].map((s) => {
        const label = s.querySelector(".sl").cloneNode(true);
        const locked = Boolean(label.querySelector(".lk"));
        label.querySelectorAll(".lk").forEach((n) => n.remove());
        return `${ label.textContent } ${ s.querySelector(".sv").textContent.replace("−", "") }${ locked ? " (locked)" : "" }`;
    });
    return `${ cells[0].textContent } · ${ de.textContent } · ${ cells[2].textContent }${ steps.length ? ` − [${ steps.join("; ") }]` : "" } → ${ cells[4].textContent }`;
});
const settled = () => act(() => new Promise((r) => setTimeout(r, 30)));
const addItem = async (itemType, label) => {
    fireEvent.click(screen.getByRole("button", { name: en.key_add_item }));
    const row = draftRow("item");
    choose(row, en.key_item_type, itemType);
    choose(row, en.key_description, label);
    await waitFor(() => expect(draftRow("item")).toBeUndefined(), SLOW);
    await waitFor(() => expect(rowWith(label)).toBeDefined(), SLOW);
};
const addCustom = async (description, amount) => {
    fireEvent.click(screen.getByRole("button", { name: en.key_add_custom_item }));
    const row = draftRow("custom");
    fireEvent.change(within(row).getByLabelText(en.key_description), { target: { value: description } });
    fireEvent.change(within(row).getByLabelText(en.key_amount), { target: { value: String(amount) } });
    fireEvent.keyDown(within(row).getByLabelText(en.key_amount), { key: "Enter" });
    await waitFor(() => expect(rowWith(description)).toBeDefined(), SLOW);
};
/** Discount / Promo on a line: the panel lists the engine's promotions; the steps are applied in order */
const discounts = async (label, steps, offered) => {
    fireEvent.click(within(rowWith(label)).getByRole("button", { name: en.key_inv_discount_promo }));
    const dialog = await screen.findByRole("dialog", { name: en.key_inv_discount_promo }, SLOW);
    expect([...dialog.querySelectorAll(".choice .t")].map((n) => n.textContent)).toEqual([...offered, en.key_inv_manual_discount]);
    for (const step of steps) {
        if (step.promo) fireEvent.click(within(dialog).getByRole("checkbox", { name: (name) => name.startsWith(step.promo) }));
        else {
            fireEvent.click(within(dialog).getByRole("checkbox", { name: en.key_inv_manual_discount }));
            fireEvent.change(within(dialog).getByLabelText(/^Amount/), { target: { value: String(step.flat) } });
            fireEvent.change(within(dialog).getByLabelText(/^Reason/), { target: { value: step.reason } });
        }
    }
    const apply = within(dialog).getByRole("button", { name: en.key_apply });
    await waitFor(() => expect(apply).toBeEnabled(), SLOW);
    fireEvent.click(apply);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), SLOW);
    await settled();
};
const removeLine = async (label) => {
    fireEvent.click(rowWith(label).querySelector(".ibtn"));
    await waitFor(() => expect(rowWith(label)).toBeUndefined(), SLOW);
    await settled();
};
/** the engine's answer for the stage's last request: what the table must show */
const lastAnswer = () => priceStandalone(priceContractInvoiceAPI.mock.calls.at(-1)[0]);

const promo = (id) => DATA.F.promotions[id];
const WALKS = DATA && {
    employer: {
        actions: async () => {
            await addItem("Document Fee", "Contract documentation");
            await addItem("Admin Fee", "Re-issue of employment documents");
            await addItem("Transport", "Airport pick-up");
            await addCustom("Document courier", 320);
            // promotions for an employer party: branch and date only (OP-27-67)
            await discounts("Contract documentation", [{ flat: 100, reason: "Returning employer" }, { promo: promo("p1") }], [promo("p1"), promo("p2"), promo("p3")]);
            await removeLine("Airport pick-up");
        },
        // the INV-G1 fixture 1 without the pick-up: 500 − 100 − 5% of 400 = 380, + 180 + 320
        lines: [
            "Document Fee · Contract documentation · HK$500 − [Manual discount HK$100; October promotion 5% HK$20] → HK$380",
            "Admin Fee · Re-issue of employment documents · HK$180 → HK$180",
            "Custom Item · Document courier · HK$320 → HK$320",
        ],
        total: "HK$880",
    },
    worker: {
        actions: async () => {
            await addItem("Medical Check", "Pre-employment medical");
            await addItem("Insurance Policy", "Domestic helper insurance");
            // an Overseas worker of BGS: its type and code match too, so the Local-only flat promotion is not offered
            await discounts("Pre-employment medical", [{ promo: promo("p2") }], [promo("p1"), promo("p2")]);
        },
        lines: [
            "Medical Check · Pre-employment medical · HK$450 − [Seasonal promotion 7.5% HK$33.75] → HK$416.25",
            "Insurance Policy · Domestic helper insurance · HK$1,000 → HK$1,000",
        ],
        total: "HK$1,416.25",
    },
};

(hasContract ? describe : describe.skip)("one walk per party, priced by the engine (route standalone)", () => {
    beforeEach(() => priceContractInvoiceAPI.mockImplementation((body) => reply(priceStandalone(body))));

    for (const type of ["employer", "worker"]) {
        it(`${ type } party: from empty to the engine's lines; every line removable; Continue carries setup's input`, async () => {
            const p = PARTIES[type];
            const setupInput = { route: "standalone", party: p.party, date: DAY.date, branch: DAY.branch };
            const contractFormInfo = { ...INFO, party_type: type, currentInvoiceEmployerDetail: type === "employer" ? p.record : null, currentInvoiceWorkerDetail: type === "worker" ? p.record : null };
            mount({ contractFormInfo, setupInput });
            await screen.findByText(en.key_inv_no_items_yet, {}, SLOW);
            expect(lastAnswer().lines).toEqual([]);
            await WALKS[type].actions();
            await settled();
            const answer = lastAnswer();
            expect(answer.ok).toBe(true);
            // the table is the engine's answer, line by line, and its total
            expect(tableLines()).toEqual(engineRows(answer.lines, hk));
            expect(tableLines()).toEqual(WALKS[type].lines);
            expect(document.querySelector("[data-total]").textContent).toBe(hk(answer.total.net));
            expect(hk(answer.total.net)).toBe(WALKS[type].total);
            expect(rows().map((tr) => tr.querySelector(".ibtn").disabled)).toEqual(answer.lines.map(() => false));
            expect(screen.queryByRole("button", { name: en.key_inv_adjust_supplement })).toBeNull();
            fireEvent.click(continueButton());
            const next = await nextScreen();
            expect(next.pathname).toBe("/invoices/general/invoice-review");
            expect(next.state.setupInput).toEqual(setupInput);
        });
    }
});

it("the /invoices/general/form route is the Contract Invoice items stage in Standalone mode; the old Standalone items screen is gone", () => {
    const routes = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/routes/invoiceRoutes.js"), "utf8");
    expect(routes).toMatch(/const AddContractInvoiceFormGeneral = withInvoiceCreateGate\(standalone\(\(\) => import\("\.\.\/Invoice\/add-contract-invoice\/ContractInvoiceItems"\)\), STANDALONE_CREATE_KEYS\);/);
    const general = path.resolve(__dirname, "../../Views/Pages/Invoice/general");
    expect(["AddContractInvoiceForm.js", "ItemTable.js"].filter((f) => fs.existsSync(path.join(general, f)))).toEqual([]);
    // key_enter_passport came back with the Standalone worker form (owner, 30 Oct)
    for (const key of ["key_add_invoice", "key_base_from_settings_chip", "key_please_add_item_amount_first", "key_row_level_discount_promo"]) {
        expect([key, key in en]).toEqual([key, false]);
    }
    expect(en.key_enter_passport).toBe("Enter Passport");
});
