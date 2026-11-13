/*
 * Contract Invoice · Invoice items (27 Oct package, INV-C3; requirements "Items and review", Part B "Invoice item structure",
 * the Combined doc's line table). The staff's item choices and the engine input they make. The screen never prices: it sends
 * the setup's input (contractSetup.pricingInput) with these choices to POST /invoices/price on every change and shows the
 * lines that come back, in the engine's order.
 *
 * The choices (kept with the draft's items, so they survive Back and a refresh):
 *   removed     catalogue item ids staff removed (a removable automatic item then shows struck through, restorable)
 *   add         catalogue item ids staff added through Add Item, in order
 *   custom      [{ id, description, amount }] the Add Custom Item lines
 *   deductions  { [lineId]: steps in the order staff added them }: promotions { kind: "promo", id }, a manual discount
 *               { kind: "flat" | "percent", value, label, reason }, and where a supplement's Reduce sits { kind: "reduce" }
 *   experience  { decision, by, reason }: the experience supplement's Keep / Reduce / Waive
 *   skills      [{ skill, decision, by, reason }]: the Overseas skill supplements staff selected
 */

export const EMPTY_CHOICES = Object.freeze({ removed: [], add: [], custom: [], deductions: {}, experience: null, skills: [] });

export const choicesOf = (stored) => ({ ...EMPTY_CHOICES, ...(stored || {}) });

/** The engine's input for this stage: the setup's input and the staff's item choices. Null until setup has one. */
export const itemsInput = (setupInput, choices) => {
    if (!setupInput) return null;
    const c = choicesOf(choices);
    return {
        ...setupInput,
        removed: c.removed,
        add: c.add,
        custom: c.custom.map(({ id, description, amount }) => ({ id, description, amount })),
        deductions: c.deductions,
        skills: c.skills,
        ...(c.experience ? { experience: c.experience } : {}),
    };
};

/** The experience line and the selected skill lines are the genuine supplements ("Conditional item" is a type name). */
export const isSupplement = (line) => line?.kind === "experience" || line?.kind === "skill";

/** The cross is live only on removable, manual, custom and skill lines; a required line keeps a disabled one. */
export const removable = (line) => line?.add === "removable" || line?.add === "manual" || line?.kind === "custom" || line?.kind === "skill";

/**
 * The line's action: Adjust supplement on a supplement, Discount / Promo on any other line, none while its amount is not
 * known or a supplement is configured at zero (nothing to reduce or waive).
 */
export const lineAction = (line) => {
    if (!line || line.original == null) return null;
    if (isSupplement(line)) return line.original === 0 ? null : "adjust";
    return "discount";
};

/** The Description column's detail line (the Combined doc's line table), as a copy key and its argument. */
export const lineDetail = (line) => {
    if (line.savedDetail) return { text: line.savedDetail }; // a saved invoice's frozen text (R-F1)
    if (line.kind === "experience" && line.basisShort) return { text: line.basisShort };
    if (line.treatment === "waive") return { key: "key_inv_detail_waived" };
    if (line.treatment === "reduce") return { key: "key_inv_detail_reduced", amount: line.by };
    if (line.amountSource === "fixed") return { key: "key_inv_detail_amount_for_service" };
    if (line.kind === "custom") return { key: "key_inv_detail_staff_entered" };
    return null;
};

/**
 * What Add Item offers (the reference page's addOptions): the manual items set up for this service and code, the removable
 * items staff removed (added back by undoing the removal) and, Overseas only, the skills not yet selected. A candidate with
 * no amount is listed but cannot be chosen.
 */
export const addOptions = (result) => [
    ...(result?.available || []).map((a) => ({ id: `item:${ a.item }`, item: a.item, itemType: a.itemType, label: a.label, amount: a.amount })),
    ...(result?.restorable || []).map((a) => ({ id: `item:${ a.item }`, item: a.item, itemType: a.itemType, label: a.label, amount: a.amount, restore: true })),
    ...(result?.offerSkills || []).map((s) => ({ id: `skill:${ s.skill }`, skill: s.skill, itemType: s.itemType, label: s.name, amount: s.amount })),
];

/**
 * An Add Item row's Item Type select (ITEMS-ROW-1, the 21 Sept inline rows): every type the engine offers an item of for
 * this invoice, in the engine's order (OP-27-135), even when none of its items has an amount, so staff see the unpriced
 * item and get the Price List filled (OP-27-134); a type the engine offers nothing of is not shown.
 */
export const offeredTypes = (result) => [...new Set(addOptions(result).map((o) => o.itemType))];

/**
 * An Add Item row's Description select for a type: its candidates (one with no amount is listed but cannot be chosen) and
 * the invoice's item and skill lines of that type (listed as already on this invoice).
 */
export const typeCandidates = (result, type) => [
    ...addOptions(result).filter((o) => o.itemType === type),
    ...(result?.lines || []).filter((l) => (l.kind === "item" || l.kind === "skill") && l.itemType === type)
        .map((l) => ({ id: `on:${ l.id }`, itemType: l.itemType, label: l.label, amount: l.original, onInvoice: true })),
];

export const CUSTOM_DESCRIPTION_MAX = 255;
const CUSTOM_AMOUNT = /^(\d+(\.\d{0,2})?|\.\d{1,2})$/;
/** An Add Custom Item row as the server checks it (R-I4): a description (at most 255 characters) and an amount of HK$0 or
    more with at most two decimals; null while either is missing or wrong. */
export const customEntry = ({ description, amount }) => {
    const text = String(description || "").trim();
    const value = String(amount ?? "").trim();
    if (!text || text.length > CUSTOM_DESCRIPTION_MAX || !CUSTOM_AMOUNT.test(value)) return null;
    return { description: text, amount: Number(value) };
};

const withoutKey = (map, key) => {
    const next = { ...map };
    delete next[key];
    return next;
};

/** Removing a line clears only that line and its own deductions, and records the removal of a catalogue item. */
export const withoutLine = (choices, line) => {
    const c = choicesOf(choices);
    const deductions = withoutKey(c.deductions, line.id);
    if (line.kind === "item") {
        return { ...c, deductions, add: c.add.filter((id) => id !== line.item), removed: c.removed.includes(line.item) ? c.removed : [...c.removed, line.item] };
    }
    if (line.kind === "skill") return { ...c, deductions, skills: c.skills.filter((s) => s.skill !== line.skill) };
    if (line.kind === "custom") return { ...c, deductions, custom: c.custom.filter((x) => `custom:${ x.id }` !== line.id) };
    return c;
};

/** A removable item staff removed comes back by undoing the removal. */
export const withRestored = (choices, item) => {
    const c = choicesOf(choices);
    return { ...c, removed: c.removed.filter((id) => id !== item) };
};

/** A manual catalogue item staff add (an earlier removal of it is undone). */
export const withItem = (choices, item) => {
    const c = choicesOf(choices);
    return { ...c, removed: c.removed.filter((id) => id !== item), add: c.add.includes(item) ? c.add : [...c.add, item] };
};

/** An Overseas skill supplement staff select; it starts as Keep. */
export const withSkill = (choices, skill) => {
    const c = choicesOf(choices);
    return c.skills.some((s) => s.skill === skill) ? c : { ...c, skills: [...c.skills, { skill, decision: "keep" }] };
};

/** A custom line: the staff-entered description and amount, under the next free id. */
export const withCustom = (choices, { description, amount }) => {
    const c = choicesOf(choices);
    const next = c.custom.reduce((n, x) => Math.max(n, Number(String(x.id).replace(/\D/g, "")) || 0), 0) + 1;
    return { ...c, custom: [...c.custom, { id: `c${ next }`, description, amount }] };
};

/** A line's deductions, in the order staff added them (an empty list leaves the line with none). */
export const withDeductions = (choices, lineId, steps) => {
    const c = choicesOf(choices);
    return { ...c, deductions: steps.length ? { ...c.deductions, [lineId]: steps } : withoutKey(c.deductions, lineId) };
};

/**
 * A supplement's Keep / Reduce / Waive and its promotions (PV-02): Reduce keeps the place staff gave it among them; a
 * waiver replaces them, so a waived line keeps none.
 */
export const withSupplement = (choices, line, { decision, by, reason, steps }) => {
    const c = choicesOf(choices);
    const choice = { decision, ...(decision === "reduce" ? { by: Number(by) } : {}), ...(decision !== "keep" && reason ? { reason } : {}) };
    const kept = decision === "waive" ? [] : steps.filter((s) => decision === "reduce" || s.kind !== "reduce");
    const base = withDeductions(c, line.id, kept);
    if (line.kind === "experience") return { ...base, experience: choice };
    return { ...base, skills: base.skills.map((s) => (s.skill === line.skill ? { skill: s.skill, ...choice } : s)) };
};

/** The supplement's current choice, as the Adjust supplement panel opens with it. */
export const supplementChoice = (choices, line) => {
    const c = choicesOf(choices);
    const d = line.kind === "experience" ? c.experience : c.skills.find((s) => s.skill === line.skill);
    return { decision: d?.decision || "keep", by: d?.by ?? "", reason: d?.reason || "", steps: c.deductions[line.id] || [] };
};
