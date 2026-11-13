/* eslint-env jest */
import React from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { render, screen, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";
import {
    addOptions, choicesOf, isSupplement, itemsInput, lineAction, lineDetail, removable, supplementChoice,
    withCustom, withDeductions, withItem, withRestored, withSkill, withSupplement, withoutLine,
} from "../../Views/Pages/Invoice/add-contract-invoice/invoiceItems";
import InvoiceItemsTable from "../../Views/Pages/Invoice/add-contract-invoice/InvoiceItemsTable";

/* Contract Invoice · Invoice items (27 Oct package, INV-C3): the staff's item choices and the engine input they make, the
   line rules (which lines take the cross, Discount / Promo or Adjust supplement), and the five-column table: enabled,
   disabled and hidden states, the detail lines, locked steps, struck removed rows and the blocked total. */

beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

const line = (over) => ({
    id: "x", kind: "item", itemType: "Document Fee", label: "Contract documentation", original: 500, discount: 0, net: 500, steps: [],
    refusedSteps: [], treatment: null, by: null, add: "required", amountSource: "catalogue", item: 1, typeId: 3, skill: null, basisShort: "", ...over,
});
const BASE = line({ id: "base", kind: "base", itemType: "Local", label: "Filipino · Local Finished · New", original: 10000, net: 10000, add: null, item: null, amountSource: null });
const EXPERIENCE = line({ id: "experience", kind: "experience", itemType: "Conditional item", label: "Experience supplement", original: 1400, net: 1400, add: null, item: null, basisShort: "Singapore · 30 months" });
const SKILL = line({ id: "skill:caregiving", kind: "skill", itemType: "Conditional item", label: "Caregiving", original: 1200, net: 1200, add: null, item: null, skill: "caregiving" });
const REQUIRED = line({ id: "item:1", item: 1 });
const REMOVABLE = line({ id: "item:2", item: 2, itemType: "Insurance Policy", label: "Domestic helper insurance", original: 1000, net: 1000, add: "removable" });
const MANUAL = line({ id: "item:3", item: 3, itemType: "Admin Fee", label: "Re-issue of employment documents", original: 180, net: 180, add: "manual" });
const CUSTOM = line({ id: "custom:c1", kind: "custom", itemType: "Custom Item", label: "Courier", original: 320, net: 320, add: null, item: null, amountSource: null });

describe("the item choices and the engine input", () => {
    const SETUP = { worker_id: 501, employer_id: 40, route: "local", category: null, type: "new", driver: false, date: "2026-10-23", branch: 5 };

    it("the input is setup's input with the choices; nothing before setup has one", () => {
        expect(itemsInput(null, {})).toBeNull();
        expect(itemsInput(SETUP, undefined)).toEqual({ ...SETUP, removed: [], add: [], custom: [], deductions: {}, skills: [] });
        const c = { ...choicesOf(), experience: { decision: "waive", reason: "x" }, custom: [{ id: "c1", description: "Courier", amount: 320, extra: 1 }] };
        expect(itemsInput(SETUP, c)).toMatchObject({ experience: { decision: "waive", reason: "x" }, custom: [{ id: "c1", description: "Courier", amount: 320 }] });
    });

    it("removing clears only that line and its own deductions, and records a catalogue item's removal; Add Item undoes it", () => {
        const c = { ...choicesOf(), add: [3], deductions: { "item:3": [{ kind: "promo", id: 1 }], base: [{ kind: "promo", id: 1 }] }, skills: [{ skill: "caregiving", decision: "keep" }], custom: [{ id: "c1", description: "Courier", amount: 320 }] };
        expect(withoutLine(c, MANUAL)).toMatchObject({ add: [], removed: [3], deductions: { base: [{ kind: "promo", id: 1 }] } });
        expect(withoutLine(c, REMOVABLE)).toMatchObject({ removed: [2], add: [3] });
        expect(withoutLine(c, SKILL).skills).toEqual([]);
        expect(withoutLine(c, CUSTOM).custom).toEqual([]);
        expect(withRestored({ ...c, removed: [2] }, 2).removed).toEqual([]);
        expect(withItem({ ...c, removed: [3], add: [] }, 3)).toMatchObject({ removed: [], add: [3] });
        expect(withItem(c, 3).add).toEqual([3]);
        expect(withSkill(c, "nursing").skills).toEqual([{ skill: "caregiving", decision: "keep" }, { skill: "nursing", decision: "keep" }]);
        expect(withCustom(c, { description: "Attestation", amount: 0 }).custom.map((x) => x.id)).toEqual(["c1", "c2"]);
        expect(withDeductions(c, "base", []).deductions).toEqual({ "item:3": [{ kind: "promo", id: 1 }] });
    });

    it("a supplement's choice: Reduce keeps its place among its promotions; Keep drops the place; a waiver keeps no promotions", () => {
        const steps = [{ kind: "promo", id: 1 }, { kind: "reduce" }];
        expect(withSupplement(choicesOf(), EXPERIENCE, { decision: "reduce", by: "400", reason: "Agreed", steps })).toMatchObject({ experience: { decision: "reduce", by: 400, reason: "Agreed" }, deductions: { experience: steps } });
        expect(withSupplement(choicesOf(), EXPERIENCE, { decision: "keep", reason: "ignored", steps }).deductions).toEqual({ experience: [{ kind: "promo", id: 1 }] });
        expect(withSupplement(choicesOf(), EXPERIENCE, { decision: "keep", steps }).experience).toEqual({ decision: "keep" });
        const waived = withSupplement({ ...choicesOf(), skills: [{ skill: "caregiving", decision: "keep" }] }, SKILL, { decision: "waive", reason: "Included", steps });
        expect([waived.skills, waived.deductions]).toEqual([[{ skill: "caregiving", decision: "waive", reason: "Included" }], {}]);
        expect(supplementChoice({ ...choicesOf(), experience: { decision: "reduce", by: 400, reason: "A" }, deductions: { experience: steps } }, EXPERIENCE))
            .toEqual({ decision: "reduce", by: 400, reason: "A", steps });
    });

    it("Add Item's candidates: manual items, removed removable items (restore) and the skills not yet selected, named by the engine", () => {
        const result = {
            available: [{ item: 3, condition: 9, amount: 180, itemType: "Admin Fee", label: "Re-issue of employment documents" }, { item: 4, condition: 10, amount: null, itemType: "Coverage", label: "Hospital cover top-up" }],
            restorable: [{ item: 2, condition: 4, amount: 1000, itemType: "Insurance Policy", label: "Domestic helper insurance" }],
            offerSkills: [{ skill: "nursing", name: "Nursing", amount: 1500, itemType: "Conditional item" }],
        };
        expect(addOptions(result).map((o) => [o.id, o.itemType, o.label, o.amount, Boolean(o.restore)])).toEqual([
            ["item:3", "Admin Fee", "Re-issue of employment documents", 180, false],
            ["item:4", "Coverage", "Hospital cover top-up", null, false],
            ["item:2", "Insurance Policy", "Domestic helper insurance", 1000, true],
            ["skill:nursing", "Conditional item", "Nursing", 1500, false],
        ]);
    });
});

describe("the line rules", () => {
    it("the cross is live on removable, manual, custom and skill lines only; supplements are the experience and skill lines", () => {
        expect([BASE, EXPERIENCE, SKILL, REQUIRED, REMOVABLE, MANUAL, CUSTOM].map(removable)).toEqual([false, false, true, false, true, true, true]);
        expect([BASE, EXPERIENCE, SKILL, REQUIRED].map(isSupplement)).toEqual([false, true, true, false]);
    });

    it("Adjust supplement on a supplement, Discount / Promo on any other line, none without an amount or on a zero supplement", () => {
        expect([BASE, EXPERIENCE, SKILL, REQUIRED, CUSTOM].map(lineAction)).toEqual(["discount", "adjust", "adjust", "discount", "discount"]);
        expect(lineAction({ ...REQUIRED, original: null })).toBeNull();
        expect(lineAction({ ...SKILL, original: 0 })).toBeNull();
        // a catalogue item that happens to carry the Conditional item type is not adjustable
        expect(lineAction({ ...MANUAL, itemType: "Conditional item" })).toBe("discount");
    });

    it("the Description's detail line: the experience basis, a waiver, a reduction, an amount set for the service, a staff-entered line", () => {
        expect([
            lineDetail(EXPERIENCE), lineDetail({ ...SKILL, treatment: "waive" }), lineDetail({ ...SKILL, treatment: "reduce", by: 300 }),
            lineDetail({ ...MANUAL, amountSource: "fixed" }), lineDetail(CUSTOM), lineDetail(REQUIRED),
        ]).toEqual([
            { text: "Singapore · 30 months" }, { key: "key_inv_detail_waived" }, { key: "key_inv_detail_reduced", amount: 300 },
            { key: "key_inv_detail_amount_for_service" }, { key: "key_inv_detail_staff_entered" }, null,
        ]);
    });
});

describe("the five-column table", () => {
    const steps = [{ label: "Replacement 15%", kind: "percent", value: 15, amount: 1500, locked: true }, { label: "October promotion 5%", kind: "percent", value: 5, amount: 425, locked: false, promo: 1 }];
    const RESULT = {
        ok: true, total: { original: 12680, discount: 2925, net: 9755 },
        lines: [
            { ...BASE, steps, discount: 1925, net: 8075 },
            { ...EXPERIENCE, treatment: "keep" },
            { ...SKILL, treatment: "waive", steps: [{ label: "Waived", kind: "all", amount: 1200, locked: false }], discount: 1200, net: 0 },
            REQUIRED, MANUAL, CUSTOM,
            line({ id: "item:5", item: 5, itemType: "Coverage", label: "Hospital cover top-up", original: null, net: null, add: "manual", amountSource: "fixed" }),
        ],
        restorable: [{ item: 2, condition: 4, amount: 1000, itemType: "Insurance Policy", label: "Domestic helper insurance" }],
    };
    const rowOf = (id) => document.querySelector(`tr[data-line="${ id }"]`);

    it("five columns plus the actions column, rows in the engine's order, the package's footer (original · −discount · net)", () => {
        render(<div className="invd"><InvoiceItemsTable result={ RESULT } mode="edit" onRemove={ jest.fn() } onPanel={ jest.fn() } /></div>);
        expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Item Type", "Description", "Amount", "Discount / Promo", "Total", "Actions"]);
        expect([...document.querySelectorAll("tbody tr[data-line]")].map((r) => r.getAttribute("data-line"))).toEqual(["base", "experience", "skill:caregiving", "item:1", "item:3", "custom:c1", "item:5"]);
        expect(document.querySelector("tfoot tr").textContent).toBe("Invoice totalHK$12,680−HK$2,925HK$9,755");
        expect(rowOf("base").textContent).toContain("Replacement 15% · locked−HK$1,500October promotion 5%−HK$425HK$8,075");
        expect(rowOf("experience").textContent).toContain("Experience supplementSingapore · 30 months");
        expect(rowOf("skill:caregiving").textContent).toContain("CaregivingWaived — original amount kept");
        expect(rowOf("custom:c1").textContent).toContain("CourierStaff-entered line");
        expect(rowOf("item:5").textContent).toContain("Hospital cover top-upAmount set for this serviceNo amount");
    });

    it("the cross: live on the removable, manual, custom and skill lines; disabled with \"Required — cannot be removed\" on the others", () => {
        render(<div className="invd"><InvoiceItemsTable result={ RESULT } mode="edit" onRemove={ jest.fn() } onPanel={ jest.fn() } /></div>);
        const cross = (id) => rowOf(id).querySelector(".ibtn");
        expect(["base", "experience", "item:1"].map((id) => [cross(id).disabled, cross(id).title])).toEqual(Array(3).fill([true, "Required — cannot be removed"]));
        expect(["skill:caregiving", "item:3", "custom:c1", "item:5"].map((id) => [cross(id).disabled, cross(id).title])).toEqual(Array(4).fill([false, "Remove this line"]));
        expect(cross("item:3").getAttribute("aria-label")).toBe("Remove Admin Fee Re-issue of employment documents");
    });

    it("the panel actions: Adjust supplement only on supplements, Discount / Promo elsewhere, none without an amount", () => {
        const onPanel = jest.fn();
        render(<div className="invd"><InvoiceItemsTable result={ RESULT } mode="edit" onRemove={ jest.fn() } onPanel={ onPanel } /></div>);
        const action = (id) => rowOf(id).querySelector(".lnk")?.textContent || null;
        expect(["base", "experience", "skill:caregiving", "item:1", "custom:c1", "item:5"].map(action))
            .toEqual(["Discount / Promo", "Adjust supplement", "Adjust supplement", "Discount / Promo", "Discount / Promo", null]);
        within(rowOf("experience")).getByRole("button", { name: "Adjust supplement" }).click();
        expect(onPanel).toHaveBeenCalledWith("adjust", RESULT.lines[1]);
    });

    it("a removed automatic line is struck through below the charged lines: \"Removed by staff · can be added again\", not charged", () => {
        render(<div className="invd"><InvoiceItemsTable result={ RESULT } mode="edit" onRemove={ jest.fn() } onPanel={ jest.fn() } /></div>);
        const rows = [...document.querySelectorAll("tbody tr")];
        const removed = rows[rows.length - 1];
        expect(removed.className).toBe("rm-row");
        expect(removed.textContent).toBe("Insurance PolicyDomestic helper insuranceRemoved by staff · can be added againHK$1,000—not charged");
        expect(removed.querySelector(".ibtn")).toBeNull();
    });

    it("blocked: no total; read-only: no actions column", () => {
        render(<div className="invd"><InvoiceItemsTable result={ { ...RESULT, ok: false, total: null } } mode="ro" /></div>);
        expect(document.querySelector("tfoot tr").textContent).toBe("Invoice total———");
        expect(screen.getAllByRole("columnheader")).toHaveLength(5);
        expect(document.querySelector(".ibtn")).toBeNull();
    });
});
