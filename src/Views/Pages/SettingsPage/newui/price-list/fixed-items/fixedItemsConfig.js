import translation from "../../../../../../utils/translation";
import { interpolate } from "../../../../../../i18n/interpolate";
import { formatMoney, parseEntry } from "../shared/priceEntries";

/*
 * Price List · Fixed items (27 Oct package, PL-S5; requirements section 24; layout and checks from the package's Fixed
 * items page). Item types — the two system types keep their identifiers, are never deleted and stay active (they can only be
 * renamed, QA-27-022); any other type can be renamed and set Active or Inactive — and their items: description, amount ("Missing" = not entered, 0 = zero) and Item use.
 * Nothing is deleted. The draft is { types: [{ id, name, active }], items: [{ id, type_id, description, amount, item_use }] }
 * (a new type's or item's id is "new-<n>" until it is saved). The server repeats every check
 * (maidmatch-contract price.list.items.services.ts).
 */

/* Item use, as stored (price_lists.item_use); the skill uses are manual ordinary-Overseas options */
export const ITEM_USES = Object.freeze([
    { id: "general", labelKey: "key_pl_item_use_general" },
    { id: "caregiving", labelKey: "key_pl_item_use_caregiving" },
    { id: "nursing", labelKey: "key_pl_item_use_nursing" },
    { id: "other_skill", labelKey: "key_pl_item_use_other_skill" },
]);
export const itemUseName = (id) => translation((ITEM_USES.find((u) => u.id === id) || ITEM_USES[0]).labelKey);
export const isSkillUse = (id) => Boolean(id) && id !== "general";

/* the package's checks on a description: "Driving" / "Driver" is never a skill charge; "Caregiving" / "Nursing" must
   carry that Item use */
const DRIVING = ["driving", "driver"];
const SKILL_DESCRIPTION_USE = { caregiving: "caregiving", nursing: "nursing" };

const trimmed = (text) => String(text ?? "").trim();
const nameKey = (text) => trimmed(text).toLowerCase();

export const savedFixedItems = (data) => ({
    types: (data?.types || []).map((t) => ({ id: t.id, name: t.name, active: t.active, is_system: t.is_system, type_key: t.type_key })),
    items: (data?.types || []).flatMap((t) => t.items.map((i) => ({ id: i.id, type_id: t.id, description: i.description, amount: i.amount, item_use: i.item_use }))),
});

export const isNew = (row) => typeof row.id === "string";
export const nextNewId = (prefix, rows) => `${prefix}-${rows.filter(isNew).length + 1}`;
export const currentCatalogue = (draft, saved) => ({ types: draft?.types || saved.types, items: draft?.items || saved.items });

/** Add Item Type / Edit item type: a name, used by no other type (a type keeping its saved name is not checked again). */
export const typeError = (type, draft, saved) => {
    const name = trimmed(type.name);
    if (!name) return translation("key_pl_enter_item_type");
    const before = saved.types.find((t) => t.id === type.id);
    /* a system type (Insurance Policy, Insurance Additional Coverage) stays active (ruling 13; the server refuses too) */
    if ((before?.is_system || type.is_system) && !type.active) return translation("key_pl_system_type_stays_active");
    if (before && nameKey(before.name) === nameKey(name)) return "";
    const others = currentCatalogue(draft, saved).types.filter((t) => t.id !== type.id);
    return others.some((t) => nameKey(t.name) === nameKey(name)) ? translation("key_pl_item_type_taken") : "";
};

/**
 * Add Item / Edit item: a description, an amount (blank = Missing), the package's Driving and Caregiving / Nursing checks,
 * and a description no other item uses (a description the item keeps is not checked again). -> { error, amount }.
 */
export const itemCheck = (item, draft, saved) => {
    const description = trimmed(item.description);
    if (!description) return { error: translation("key_pl_enter_description") };
    const amount = parseEntry(item.amount, "amt");
    if (!amount.ok) return { error: amount.err };
    const exact = description.toLowerCase();
    if (DRIVING.includes(exact)) return { error: translation("key_pl_driving_not_skill") };
    if (SKILL_DESCRIPTION_USE[exact] && item.item_use !== SKILL_DESCRIPTION_USE[exact]) return { error: interpolate(translation("key_pl_choose_item_use"), description) };
    const before = saved.items.find((i) => i.id === item.id);
    const keeps = before && nameKey(before.description) === exact;
    const others = currentCatalogue(draft, saved).items.filter((i) => i.id !== item.id);
    if (!keeps && others.some((i) => nameKey(i.description) === exact)) return { error: translation("key_pl_description_taken") };
    return { error: "", amount: amount.value };
};

const statusText = (active) => translation(active ? "key_active" : "key_inactive");
const amountText = (value) => (value == null ? translation("key_pl_missing") : formatMoney(value));

/**
 * The package's review (pl_retained.js retainedChanges): one row per changed field, "<name> · <field>" before / after;
 * a new type or item is one row, "New", with everything it is created with.
 */
export const fixedItemChanges = (draft, saved) => {
    if (!draft?.types) return [];
    const out = [];
    draft.types.forEach((t) => {
        const o = saved.types.find((x) => x.id === t.id);
        const name = trimmed(t.name);
        if (!o) {
            out.push({ key: `type|${t.id}|new`, name, field: translation("key_pl_review_new"), before: translation("key_pl_not_set"), after: interpolate(translation("key_pl_type_summary"), name, statusText(t.active)) });
            return;
        }
        if (o.name !== name) out.push({ key: `type|${t.id}|name`, name, field: translation("key_pl_review_name"), before: o.name, after: name });
        if (o.active !== t.active) out.push({ key: `type|${t.id}|active`, name, field: translation("key_status"), before: statusText(o.active), after: statusText(t.active) });
    });
    draft.items.forEach((i) => {
        const o = saved.items.find((x) => x.id === i.id);
        const name = trimmed(i.description);
        if (!o) {
            out.push({ key: `item|${i.id}|new`, name, field: translation("key_pl_review_new"), before: translation("key_pl_not_set"), after: interpolate(translation("key_pl_item_summary"), name, amountText(i.amount), itemUseName(i.item_use)) });
            return;
        }
        if (o.description !== name) out.push({ key: `item|${i.id}|description`, name, field: translation("key_description"), before: o.description, after: name });
        if (o.amount !== i.amount) out.push({ key: `item|${i.id}|amount`, name, field: translation("key_amount"), before: amountText(o.amount), after: amountText(i.amount) });
        if (o.item_use !== i.item_use) out.push({ key: `item|${i.id}|use`, name, field: translation("key_pl_item_use"), before: itemUseName(o.item_use), after: itemUseName(i.item_use) });
    });
    return out;
};

export const fixedReviewRows = (changes) => changes.map((c) => ({ key: c.key, label: `${c.name} · ${c.field}`, text: true, before: c.before, after: c.after }));

/** Items that become "Missing" with this save. */
export const clearedItems = (draft, saved) => (draft?.items || []).filter((i) => {
    const o = saved.items.find((x) => x.id === i.id);
    return o && o.amount != null && i.amount == null;
}).length;

/**
 * The body of POST /price-list/fixed-items: each type and item added or changed. A new item names its saved type, or
 * the index of its new type in `types` (every new type is sent).
 */
export const buildFixedItemsPayload = (data, draft, saved) => {
    const types = (draft?.types || []).filter((t) => {
        const o = saved.types.find((x) => x.id === t.id);
        return !o || o.name !== trimmed(t.name) || o.active !== t.active;
    });
    const items = (draft?.items || []).filter((i) => {
        const o = saved.items.find((x) => x.id === i.id);
        return !o || o.description !== trimmed(i.description) || o.amount !== i.amount || o.item_use !== i.item_use;
    });
    return {
        base_version: data?.version ?? null,
        types: types.map((t) => ({ id: isNew(t) ? null : t.id, name: trimmed(t.name), active: t.active })),
        items: items.map((i) => {
            const newType = typeof i.type_id === "string";
            return {
                id: isNew(i) ? null : i.id,
                type_id: newType ? null : i.type_id,
                type_index: newType ? types.findIndex((t) => t.id === i.type_id) : null,
                description: trimmed(i.description),
                amount: i.amount,
                item_use: i.item_use,
            };
        }),
    };
};
