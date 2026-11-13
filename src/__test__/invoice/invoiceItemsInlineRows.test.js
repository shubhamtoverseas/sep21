/* eslint-env jest */
import React from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* Contract Invoice · Invoice items · the inline Add Item / Add Custom Item rows (ITEMS-ROW-1; the 21 Sept package's rows, in
   place of the INV-C3 panels), in the SHARED items stage (Contract, Standalone, Exchange). The row states: empty, type
   chosen, committed, refused, custom valid, custom invalid, and an incomplete row blocking Next. The FE never prices: a
   row is sent only when it commits, and the table is the engine's answer. */

jest.mock("../../services/invoices", () => ({ priceContractInvoiceAPI: jest.fn() }));
/* eslint-disable import/first */
import { priceContractInvoiceAPI } from "../../services/invoices";
import invoices from "../../redux/Slices/invoices/InvoicesSlice";
import employer from "../../redux/Slices/employer/EmployerSlice";
import { EXCHANGE } from "../../Views/Pages/Invoice/add-contract-invoice/contractSetup";
import ContractInvoiceItems from "../../Views/Pages/Invoice/add-contract-invoice/ContractInvoiceItems";
import * as panels from "../../Views/Pages/Invoice/add-contract-invoice/ItemsPanels";
import { customEntry, offeredTypes, typeCandidates } from "../../Views/Pages/Invoice/add-contract-invoice/invoiceItems";
/* eslint-enable import/first */

jest.setTimeout(60000);
const SLOW = { timeout: 15000 };

beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
beforeEach(() => priceContractInvoiceAPI.mockReset());

const SETUP = { worker_id: 501, employer_id: 40, route: "local", category: null, type: "new", driver: false, date: "2026-11-03", branch: 5 };
const INFO = {
    currentInvoiceEmployerDetail: { employer_id: 40, name: "Chan Tai Man", reference_id: "E-1001" }, currentInvoiceWorkerDetail: { id: 501, name: "Maria Lourdes Santos", reference_id: "LPF902190" },
    invoice_date: "2026-11-03", branchId: 5, branch_name: "Tsim Sha Tsui", csId: 9, cs_name: "Lee",
};
const line = (over) => ({ kind: "item", discount: 0, steps: [], refusedSteps: [], treatment: null, amountSource: "catalogue", ...over });
const BASE = line({ id: "base", kind: "base", itemType: "Local", label: "Filipino · Local Finished · New", add: "required", original: 10000, net: 10000, item: null });
const DOC = line({ id: "item:208", item: 208, itemType: "Document Fee", label: "Contract documentation", add: "required", original: 500, net: 500 });
const REISSUE = line({ id: "item:211", item: 211, itemType: "Admin Fee", label: "Re-issue of employment documents", add: "manual", original: 180, net: 180 });
/* what the engine offers on this route: an addable Admin Fee item, a Document Fee item and one with no amount, a Coverage
   item with no amount only; a removed Insurance Policy item comes back through Add Item */
const AVAILABLE = [
    { item: 211, condition: 9, amount: 180, itemType: "Admin Fee", label: "Re-issue of employment documents" },
    { item: 209, condition: 10, amount: 250, itemType: "Document Fee", label: "OWWA membership" },
    { item: 210, condition: 11, amount: null, itemType: "Document Fee", label: "Release letter processing" },
    { item: 207, condition: 12, amount: null, itemType: "Coverage", label: "Hospital cover top-up" },
];
const RESTORABLE = [{ item: 205, condition: 4, amount: 1000, itemType: "Insurance Policy", label: "Domestic helper insurance" }];

/** the stand-in engine: the lines the choices make; an item asked "adding" may be refused as a test sets it; the removable
    Domestic helper insurance is automatic where a test sets it */
let refuse = null;
let insurance = false;
let skills = false;
const priced = (body) => {
    const lines = [BASE, DOC];
    if (insurance && !body.removed.includes(205)) lines.push(line({ id: "item:205", item: 205, itemType: "Insurance Policy", label: "Domestic helper insurance", add: "removable", original: 1000, net: 1000 }));
    if (body.add.includes(211)) lines.push(REISSUE);
    if (body.skills.some((x) => x.skill === "caregiving")) lines.push(line({ id: "skill:caregiving", kind: "skill", itemType: "Conditional item", label: "Caregiving", original: 1200, net: 1200, add: null, item: null, skill: "caregiving", amountSource: null }));
    if (body.add.includes(209)) lines.push(line({ id: "item:209", item: 209, itemType: "Document Fee", label: "OWWA membership", add: "manual", original: 250, net: 250 }));
    body.custom.forEach((c) => lines.push(line({ id: `custom:${ c.id }`, kind: "custom", itemType: "Custom Item", label: c.description, original: c.amount, net: c.amount, add: null, item: null, amountSource: null })));
    const net = lines.reduce((t, l) => t + l.net, 0);
    const refused = body.adding && refuse ? [{ item: body.add[body.add.length - 1], reason: refuse }] : [];
    return {
        ok: true, route: body.route, problems: [], notes: [], refused, clash: [], promotions: [],
        offerSkills: skills && !body.skills.some((x) => x.skill === "caregiving") ? [{ skill: "caregiving", name: "Caregiving", amount: 1200, itemType: "Conditional item" }] : [],
        lines, total: { original: net, discount: 0, net }, record_key: "rk",
        available: AVAILABLE.filter((a) => !body.add.includes(a.item)),
        restorable: body.removed.includes(205) ? RESTORABLE : [],
    };
};
const reply = (data) => Promise.resolve({ data: { status: true, data } });

const mount = ({ mode, state = { contractFormInfo: INFO, setupInput: SETUP }, choices } = {}) => {
    const store = configureStore({
        reducer: { invoices, employer },
        ...(choices ? { preloadedState: { invoices: { ...invoices(undefined, { type: "@init" }), invoiceContractItemsList: { choices } } } } : {}),
    });
    const view = render(
        <Provider store={ store }>
            <MemoryRouter initialEntries={ [{ pathname: "/items", state }] }>
                <Routes>
                    <Route path="/items" element={ <ContractInvoiceItems mode={ mode } /> } />
                    <Route path="*" element={ <div data-testid="elsewhere" /> } />
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
    return { store, ...view };
};
const ready = () => waitFor(() => expect(screen.getByRole("button", { name: en.key_add_item })).toBeEnabled(), SLOW);
const draftRow = (kind) => [...document.querySelectorAll(`tbody tr[data-draft${ kind ? `=${ kind }` : "" }]`)].pop();
const openMenu = (row, label) => fireEvent.keyDown(within(row).getByLabelText(label), { key: "ArrowDown" });
const menu = (row) => [...row.querySelectorAll(".mc-select__option")].map((o) => ({ text: o.textContent, disabled: o.getAttribute("aria-disabled") === "true" }));
const optionOf = (row, text) => [...row.querySelectorAll(".mc-select__option")].find((o) => o.firstChild.firstChild.textContent === text);
const choose = (row, label, text) => { openMenu(row, label); fireEvent.click(optionOf(row, text)); };
const lastBody = () => priceContractInvoiceAPI.mock.calls.at(-1)[0];
const total = () => document.querySelector("[data-total]").textContent;
const continueButton = () => screen.getByRole("button", { name: en.key_inv_continue_to_review });
const why = () => document.querySelector(".review-foot .why")?.textContent || "";

describe("the row helpers", () => {
    const result = { available: AVAILABLE, restorable: RESTORABLE, offerSkills: [{ skill: "nursing", name: "Nursing", amount: null, itemType: "Conditional item" }], lines: [BASE, DOC] };
    it("Item Type: every type the engine offers an item of, in the engine's order, an unpriced one included (OP-27-134)", () => {
        expect(offeredTypes(result)).toEqual(["Admin Fee", "Document Fee", "Coverage", "Insurance Policy", "Conditional item"]);
        expect(offeredTypes({})).toEqual([]);
    });
    it("Description: the type's candidates, then its lines already on the invoice", () => {
        expect(typeCandidates(result, "Document Fee").map((o) => [o.id, o.label, o.amount, Boolean(o.onInvoice)])).toEqual([
            ["item:209", "OWWA membership", 250, false], ["item:210", "Release letter processing", null, false], ["on:item:208", "Contract documentation", 500, true],
        ]);
        expect(typeCandidates(result, "Insurance Policy")[0]).toMatchObject({ item: 205, restore: true });
    });
    it("a custom row as the server checks it (R-I4): a description of at most 255 characters and HK$0 or more with at most 2 decimals", () => {
        expect(customEntry({ description: "  Courier ", amount: "320" })).toEqual({ description: "Courier", amount: 320 });
        expect(customEntry({ description: "Courier", amount: "0" })).toEqual({ description: "Courier", amount: 0 });
        expect(customEntry({ description: "Courier", amount: "12.5" })).toEqual({ description: "Courier", amount: 12.5 });
        expect(customEntry({ description: "Courier", amount: ".5" })).toEqual({ description: "Courier", amount: 0.5 });
        expect(["", "  ", "1.234", "-1", "1e3", "."].map((amount) => customEntry({ description: "Courier", amount }))).toEqual(Array(6).fill(null));
        expect(customEntry({ description: "  ", amount: "10" })).toBeNull();
        expect(customEntry({ description: "x".repeat(255), amount: "1" })).not.toBeNull();
        expect(customEntry({ description: "x".repeat(256), amount: "1" })).toBeNull();
    });
});

describe("the inline rows on the Items stage", () => {
    beforeEach(() => {
        refuse = null;
        insurance = false;
        skills = false;
        priceContractInvoiceAPI.mockImplementation((body) => reply(priced(body)));
    });

    it("empty: + Add Item appends a row at the bottom of the charged lines (no panel), focus in its Item Type; Description disabled; Amount —", async () => {
        mount();
        await ready();
        const calls = priceContractInvoiceAPI.mock.calls.length;
        fireEvent.click(screen.getByRole("button", { name: en.key_add_item }));
        expect(screen.queryByRole("dialog")).toBeNull();
        const row = draftRow("item");
        const rows = [...document.querySelectorAll("tbody tr")];
        expect(rows.indexOf(row)).toBe(rows.indexOf(document.querySelector("tr[data-line='item:208']")) + 1);
        expect(document.activeElement).toBe(within(row).getByLabelText(en.key_item_type));
        expect(row.querySelector(".mc-select__placeholder").textContent).toBe("Select Item");
        expect(within(row).getByLabelText(en.key_description)).toBeDisabled();
        expect([...row.querySelectorAll("td")].slice(2, 5).map((td) => td.textContent)).toEqual(["—", "—", "—"]);
        openMenu(row, en.key_item_type);
        expect(menu(row).map((o) => o.text)).toEqual(["Admin Fee", "Document Fee", "Coverage"]);
        // an empty row is never priced and is not in the total
        expect(priceContractInvoiceAPI.mock.calls.length).toBe(calls);
        expect(total()).toBe("HK$10,500");
    });

    it("type chosen: Description lists that type's items with the engine's amounts; no amount and already on the invoice listed, not choosable", async () => {
        mount();
        await ready();
        fireEvent.click(screen.getByRole("button", { name: en.key_add_item }));
        const row = draftRow("item");
        choose(row, en.key_item_type, "Document Fee");
        expect(within(row).getByLabelText(en.key_description)).toBeEnabled();
        openMenu(row, en.key_description);
        expect(menu(row)).toEqual([
            { text: "OWWA membershipHK$250", disabled: false },
            { text: `Release letter processing${ en.key_inv_no_amount_set }`, disabled: true },
            { text: `Contract documentation${ en.key_inv_already_on_invoice }`, disabled: true },
        ]);
        expect([en.key_inv_no_amount_set, en.key_inv_already_on_invoice]).toEqual(["no amount set, so it cannot be added", "already on this invoice"]);
        const calls = priceContractInvoiceAPI.mock.calls.length;
        fireEvent.click(optionOf(row, "Release letter processing"));
        fireEvent.click(optionOf(row, "Contract documentation"));
        expect(priceContractInvoiceAPI.mock.calls.length).toBe(calls);
        expect(draftRow("item")).toBe(row);
    });

    it("committed: choosing the Description asks the engine (adding) and the row becomes the engine's line, with Discount / Promo and a live cross", async () => {
        mount();
        await ready();
        fireEvent.click(screen.getByRole("button", { name: en.key_add_item }));
        const row = draftRow("item");
        choose(row, en.key_item_type, "Admin Fee");
        choose(row, en.key_description, "Re-issue of employment documents");
        await waitFor(() => expect(draftRow()).toBeUndefined(), SLOW);
        const line211 = await waitFor(() => { const r = document.querySelector("tr[data-line='item:211']"); expect(r).not.toBeNull(); return r; }, SLOW);
        const asked = priceContractInvoiceAPI.mock.calls.map((c) => c[0]).filter((b) => b.add.includes(211));
        expect(asked[0]).toMatchObject({ adding: true, add: [211], custom: [] });
        expect(lastBody()).toMatchObject({ add: [211], custom: [], removed: [] });
        expect("adding" in lastBody()).toBe(false);
        expect(within(line211).getByRole("button", { name: en.key_inv_discount_promo })).toBeInTheDocument();
        expect(line211.querySelector(".ibtn")).toBeEnabled();
        await waitFor(() => expect(total()).toBe("HK$10,680"));
        await waitFor(() => expect(continueButton()).toBeEnabled());
    });

    it("OP-27-134: a type whose items all lack an amount is shown, its items listed disabled \"no amount set, so it cannot be added\"; a type the engine offers nothing of is hidden", async () => {
        mount();
        await ready();
        fireEvent.click(screen.getByRole("button", { name: en.key_add_item }));
        const row = draftRow("item");
        openMenu(row, en.key_item_type);
        const types = menu(row).map((o) => o.text);
        expect(types).toContain("Coverage");
        // Local (the base line) and Insurance Policy (on the invoice, not removed) are not offered by the engine: hidden
        expect(types.filter((x) => ["Local", "Insurance Policy", "Custom Item"].includes(x))).toEqual([]);
        fireEvent.click(optionOf(row, "Coverage"));
        openMenu(row, en.key_description);
        expect(menu(row)).toEqual([{ text: "Hospital cover top-upno amount set, so it cannot be added", disabled: true }]);
        const calls = priceContractInvoiceAPI.mock.calls.length;
        fireEvent.click(optionOf(row, "Hospital cover top-up"));
        expect(priceContractInvoiceAPI.mock.calls.length).toBe(calls);
        expect(draftRow("item")).toBe(row);
        expect(continueButton()).toBeDisabled();
    });

    it("OP-27-132: a profile-linked skill is reachable through an Add Item row (type \"Conditional item\") and is added as a supplement (Keep), without the item check", async () => {
        skills = true;
        mount();
        await ready();
        fireEvent.click(screen.getByRole("button", { name: en.key_add_item }));
        const row = draftRow("item");
        openMenu(row, en.key_item_type);
        expect(menu(row).map((o) => o.text)).toContain("Conditional item");
        fireEvent.click(optionOf(row, "Conditional item"));
        openMenu(row, en.key_description);
        expect(menu(row)).toEqual([{ text: "CaregivingHK$1,200", disabled: false }]);
        fireEvent.click(optionOf(row, "Caregiving"));
        await waitFor(() => expect(document.querySelector("tr[data-line='skill:caregiving']")).not.toBeNull(), SLOW);
        expect(draftRow()).toBeUndefined();
        expect(lastBody().skills).toEqual([{ skill: "caregiving", decision: "keep" }]);
        expect(priceContractInvoiceAPI.mock.calls.some((c) => c[0].adding)).toBe(false);
        expect(within(document.querySelector("tr[data-line='skill:caregiving']")).getByRole("button", { name: en.key_inv_adjust_supplement })).toBeInTheDocument();
    });

    it("a removed removable item comes back through an Add Item row: its type offered while it is removed, the removal undone without a check", async () => {
        insurance = true;
        mount({ choices: { removed: [205], add: [], custom: [], deductions: {}, experience: null, skills: [] } });
        await ready();
        expect(document.querySelector("tr[data-removed='205']")).not.toBeNull();
        fireEvent.click(screen.getByRole("button", { name: en.key_add_item }));
        const row = draftRow("item");
        openMenu(row, en.key_item_type);
        expect(menu(row).map((o) => o.text)).toEqual(["Admin Fee", "Document Fee", "Coverage", "Insurance Policy"]);
        fireEvent.click(optionOf(row, "Insurance Policy"));
        choose(row, en.key_description, "Domestic helper insurance");
        await waitFor(() => expect(document.querySelector("tr[data-line='item:205']")).not.toBeNull(), SLOW);
        expect(document.querySelector("tr[data-removed='205']")).toBeNull();
        expect(lastBody().removed).toEqual([]);
        expect(priceContractInvoiceAPI.mock.calls.some((c) => c[0].adding)).toBe(false);
    });

    it("refused: the engine's refusal is the warning note; the row goes back to incomplete (its type kept) and blocks Next", async () => {
        mount();
        await ready();
        fireEvent.click(screen.getByRole("button", { name: en.key_add_item }));
        for (const [reason, copy] of [["already", en.key_inv_add_not_set_up], ["skill-scope", en.key_inv_add_skill_scope], ["missing", en.key_inv_add_no_amount]]) {
            refuse = reason;
            const row = draftRow("item");
            choose(row, en.key_item_type, "Admin Fee");
            choose(row, en.key_description, "Re-issue of employment documents");
            await waitFor(() => expect(document.querySelector("[data-note]")?.textContent).toBe(`Admin Fee · Re-issue of employment documents${ copy }`), SLOW);
            await waitFor(() => expect(within(draftRow("item")).getByLabelText(en.key_description)).toBeEnabled());
            expect(draftRow("item").querySelectorAll(".mc-select__single-value")).toHaveLength(1);
            expect(document.querySelector("tr[data-line='item:211']")).toBeNull();
        }
        expect(why()).toBe(en.key_inv_finish_or_remove_empty_row);
        expect(en.key_inv_finish_or_remove_empty_row).toBe("Finish or remove the empty item row.");
        expect(continueButton()).toBeDisabled();
    });

    it("an incomplete row blocks Next with \"Finish or remove the empty item row.\"; its cross removes it; leaving the stage drops it", async () => {
        const { unmount } = mount();
        await ready();
        await waitFor(() => expect(continueButton()).toBeEnabled());
        fireEvent.click(screen.getByRole("button", { name: en.key_add_custom_item }));
        expect(continueButton()).toBeDisabled();
        expect(why()).toBe("Finish or remove the empty item row.");
        fireEvent.click(within(draftRow("custom")).getByRole("button", { name: en.key_inv_remove_line }));
        expect(draftRow()).toBeUndefined();
        expect(continueButton()).toBeEnabled();
        expect(why()).toBe("");
        fireEvent.click(screen.getByRole("button", { name: en.key_add_item }));
        expect(draftRow("item")).toBeDefined();
        unmount();
        mount();
        await ready();
        expect(draftRow()).toBeUndefined();
        expect(lastBody()).toMatchObject({ add: [], custom: [] });
    });

    it("custom valid: Item Type is the text \"Custom Item\"; a description and an HK$ amount commit on blur of the amount (HK$0 allowed) and on Enter", async () => {
        mount();
        await ready();
        fireEvent.click(screen.getByRole("button", { name: en.key_add_custom_item }));
        let row = draftRow("custom");
        expect(row.querySelector("td").textContent).toBe("Custom Item");
        expect(row.querySelector("td select, td .mc-select__control")).toBeNull();
        expect(document.activeElement).toBe(within(row).getByLabelText(en.key_description));
        expect(row.querySelector(".draft-amt").textContent).toBe("HK$");
        fireEvent.change(within(row).getByLabelText(en.key_description), { target: { value: "Document courier to Manila · attestation set" } });
        fireEvent.change(within(row).getByLabelText(en.key_amount), { target: { value: "0" } });
        fireEvent.blur(within(row).getByLabelText(en.key_amount));
        await waitFor(() => expect(document.querySelector("tr[data-line='custom:c1']")).not.toBeNull(), SLOW);
        expect(draftRow()).toBeUndefined();
        expect(lastBody().custom).toEqual([{ id: "c1", description: "Document courier to Manila · attestation set", amount: 0 }]);
        fireEvent.click(screen.getByRole("button", { name: en.key_add_custom_item }));
        row = draftRow("custom");
        fireEvent.change(within(row).getByLabelText(en.key_amount), { target: { value: "320.5" } });
        fireEvent.change(within(row).getByLabelText(en.key_description), { target: { value: "Attestation" } });
        fireEvent.keyDown(within(row).getByLabelText(en.key_description), { key: "Enter" });
        await waitFor(() => expect(document.querySelector("tr[data-line='custom:c2']")).not.toBeNull(), SLOW);
        expect(lastBody().custom).toEqual([{ id: "c1", description: "Document courier to Manila · attestation set", amount: 0 }, { id: "c2", description: "Attestation", amount: 320.5 }]);
        // a blur right after Enter does not add it twice
        await act(() => new Promise((r) => setTimeout(r, 30)));
        expect(lastBody().custom).toHaveLength(2);
    });

    it("custom invalid: nothing is sent; a blank amount on blur keeps the row quietly; a missing description shows the server's rule; more than 2 decimals cannot be typed", async () => {
        mount();
        await ready();
        const calls = priceContractInvoiceAPI.mock.calls.length;
        fireEvent.click(screen.getByRole("button", { name: en.key_add_custom_item }));
        const row = draftRow("custom");
        const amount = within(row).getByLabelText(en.key_amount);
        fireEvent.blur(amount);
        expect(row.querySelector("[role=alert]")).toBeNull();
        fireEvent.change(amount, { target: { value: "12" } });
        fireEvent.change(amount, { target: { value: "12.345" } });
        expect(amount.value).toBe("12");
        fireEvent.blur(amount);
        expect(within(row).getByRole("alert").textContent).toBe(en.key_inv_custom_invalid);
        expect(within(row).getByLabelText(en.key_description)).toHaveAttribute("aria-invalid", "true");
        expect(amount).not.toHaveAttribute("aria-invalid");
        fireEvent.change(within(row).getByLabelText(en.key_description), { target: { value: "x".repeat(300) } });
        expect(within(row).getByLabelText(en.key_description)).toHaveAttribute("maxLength", "255");
        expect(row.querySelector("[role=alert]")).toBeNull();
        expect(priceContractInvoiceAPI.mock.calls.length).toBe(calls);
        expect(draftRow("custom")).toBe(row);
        expect(continueButton()).toBeDisabled();
    });

    it("several empty rows at once (the 21 Sept footer shows two): each commits on its own", async () => {
        mount();
        await ready();
        fireEvent.click(screen.getByRole("button", { name: en.key_add_custom_item }));
        fireEvent.click(screen.getByRole("button", { name: en.key_add_custom_item }));
        fireEvent.click(screen.getByRole("button", { name: en.key_add_item }));
        const [first, second] = [...document.querySelectorAll("tbody tr[data-draft=custom]")];
        expect(document.querySelectorAll("tbody tr[data-draft]")).toHaveLength(3);
        fireEvent.change(within(second).getByLabelText(en.key_description), { target: { value: "Second" } });
        fireEvent.change(within(second).getByLabelText(en.key_amount), { target: { value: "20" } });
        fireEvent.blur(within(second).getByLabelText(en.key_amount));
        await waitFor(() => expect(document.querySelector("tr[data-line='custom:c1']")).not.toBeNull(), SLOW);
        expect(document.querySelectorAll("tbody tr[data-draft]")).toHaveLength(2);
        fireEvent.change(within(first).getByLabelText(en.key_description), { target: { value: "First" } });
        fireEvent.change(within(first).getByLabelText(en.key_amount), { target: { value: "10" } });
        fireEvent.blur(within(first).getByLabelText(en.key_amount));
        choose(draftRow("item"), en.key_item_type, "Admin Fee");
        choose(draftRow("item"), en.key_description, "Re-issue of employment documents");
        await waitFor(() => expect(draftRow()).toBeUndefined(), SLOW);
        await waitFor(() => expect(lastBody()).toMatchObject({ add: [211], custom: [{ id: "c1", description: "Second", amount: 20 }, { id: "c2", description: "First", amount: 10 }] }), SLOW);
    });

    it("keyboard: Tab order Type → Description → cross (item row) and Description → Amount → cross (custom row); the selects are searchable", async () => {
        mount();
        await ready();
        fireEvent.click(screen.getByRole("button", { name: en.key_add_item }));
        fireEvent.click(screen.getByRole("button", { name: en.key_add_custom_item }));
        const focusables = (row) => [...row.querySelectorAll("input, button, select, textarea")].filter((el) => el.tabIndex !== -1 && el.type !== "hidden")
            .map((el) => el.getAttribute("aria-label") || row.querySelector(`label[for="${ el.id }"]`)?.textContent || el.tagName);
        expect(focusables(draftRow("item"))).toEqual([en.key_item_type, en.key_description, en.key_inv_remove_line]);
        expect(focusables(draftRow("custom"))).toEqual([en.key_description, en.key_amount, en.key_inv_remove_line]);
        const row = draftRow("item");
        fireEvent.change(within(row).getByLabelText(en.key_item_type), { target: { value: "adm" } });
        expect(menu(row).map((o) => o.text)).toEqual(["Admin Fee"]);
    });
});

describe("Exchange mode", () => {
    const CREDIT = { id: "exchange_credit", kind: "exchange_credit", itemType: "Exchange Credit", label: "Exchange Credit", detail: "I-MO000100", original: null, net: -16820, steps: [] };
    const BALANCE = { id: "balance_adjustment", kind: "balance_adjustment", itemType: "Balance Adjustment", label: "Balance Adjustment", detail: "Remaining Credit", original: null, net: 6320, steps: [] };
    it("the row sits at the bottom of the replacement's lines, above the Exchange Credit and the balancing line", async () => {
        priceContractInvoiceAPI.mockImplementation((body) => {
            const r = priced(body);
            return reply({ ...r, route: "exchange", lines: [...r.lines, CREDIT, BALANCE], total: { original: 10500, discount: 0, net: 0 },
                settlement: { replacementValue: 10500, exchangeCredit: 16820, shortfall: 0, remainingCredit: 6320 } });
        });
        mount({ mode: EXCHANGE, state: { contractFormInfo: { ...INFO, currentInvoiceExchange: { id: 100, invoice_number: "I-MO000100" } }, setupInput: { ...SETUP, route: "exchange", type: null, exchange: { invoice_id: 100, service_route: "local" } } } });
        await ready();
        fireEvent.click(screen.getByRole("button", { name: en.key_add_item }));
        const order = [...document.querySelectorAll("tbody tr")].map((tr) => tr.getAttribute("data-line") || tr.getAttribute("data-settlement") || tr.getAttribute("data-draft"));
        expect(order).toEqual(["base", "item:208", "item", "exchange_credit", "balance_adjustment"]);
    });
});

it("the Add Item and Add Custom Item panels are gone; their copy left the locales", () => {
    expect(Object.keys(panels).sort()).toEqual(["AdjustSupplementPanel", "DiscountPromoPanel"]);
    const src = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/Invoice/add-contract-invoice/ContractInvoiceItems.js"), "utf8");
    expect(src).not.toMatch(/AddItemPanel|AddCustomItemPanel|openPanel\("add"\)|openPanel\("custom"\)/);
    for (const key of ["key_inv_no_amount_yet", "key_inv_no_price_in_schedule", "key_inv_on_this_invoice", "key_inv_no_supplements_for"]) {
        expect([key, key in en]).toEqual([key, false]);
    }
    expect(en.key_inv_select_item).toBe("Select Item");
});
