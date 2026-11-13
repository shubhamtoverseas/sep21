import { featureFor, featureLabel, PERM_API, PERM_HISTORY_SOURCE_KEYS, PERM_LEVEL_FROM_API, PERM_LEVEL_LABEL_KEYS, PERM_MODEL, sectionShort, t, tx } from "./permissionCatalogue";
import { categoryIndex } from "./permissionAdapter";
import { screenName } from "./permissionStructure";

/*
 * Stored permission events (backend 263: permission_change_logs / changed_since) rendered the way the grid names and shows
 * them: `key_value` → the control's label through the key map, `old_value` / `new_value` → the grid's wording
 * (Selected / Not selected, level labels, option names from the template's `values`). Unknown keys fall back to the raw key.
 */
const csvTokens = (value) => String(value ?? "").split(",").map((v) => v.trim()).filter(Boolean);

/** apiKey → the catalogue rows bound to it (one for y/n keys, several for CSV / token keys) */
export const keyIndex = (rows, bindingOf, audience) => {
    const map = new Map();
    rows.forEach((r) => {
        (r.contexts_by_audience?.[audience] || []).forEach((c) => {
            const b = bindingOf(r.id, c);
            if (!b || !b.apiKey) return;
            [b.apiKey, b.restrictedKey].filter(Boolean).forEach((k) => {
                if (!map.has(k)) map.set(k, []);
                map.get(k).push({ row: r, context: c, binding: b });
            });
        });
    });
    return map;
};

/** the control label of a stored key: the row's screen name (+ section) for a single row, the feature name for a token / option list */
export const labelForKey = (key, index) => {
    const bound = index.get(key);
    if (!bound || !bound.length) return key;
    const first = bound[0];
    const multi = bound.length > 1 && bound.some((x) => [PERM_MODEL.SUB, PERM_MODEL.CSV, PERM_MODEL.RADIO, PERM_MODEL.BRANCH_LEVEL].includes(x.binding.model));
    const name = multi ? featureLabel(featureFor(first.row).feature, first.row) : screenName(first.row);
    return first.context === "single" ? name : `${ name } · ${ sectionShort(first.context) }`;
};

/** a stored value in the grid's words */
export const formatStored = (key, value, index, template) => {
    if (value === null || value === undefined || value === "") return t("key_perm_history_never");
    const bound = index.get(key);
    const model = bound?.[0]?.binding?.model;
    const raw = String(value);
    if (model === PERM_MODEL.LEVEL || PERM_LEVEL_FROM_API[raw]) return t(PERM_LEVEL_LABEL_KEYS[PERM_LEVEL_FROM_API[raw] || "Off"]);
    if (raw === PERM_API.YES) return t("key_selected");
    if (raw === PERM_API.NO) return t("key_ins_not_selected");
    const values = categoryIndex(template).get(key)?.values;
    const names = csvTokens(raw).map((tok) => {
        const opt = Array.isArray(values) ? values.find((v) => String(v.id) === tok) : null;
        if (opt) return opt.branch_name || opt.name || opt.label || tok;
        const row = bound?.find((x) => String(x.binding.value) === tok);
        return row ? tx(featureFor(row.row).action || row.row.label) : tok;
    });
    return names.join(", ");
};

export const sourceLabel = (source) => t(PERM_HISTORY_SOURCE_KEYS[source] || "key_save");

/** events grouped by `version` (one save = one group), newest first as the API lists them */
export const groupByVersion = (events) => {
    const groups = [];
    events.forEach((e) => {
        const last = groups[groups.length - 1];
        if (last && last.version === e.version) { last.items.push(e); return; }
        groups.push({ version: e.version, at: e.created_at, actor: e.actor_name, source: e.source, items: [e] });
    });
    return groups;
};

export const formatWhen = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso || "");
    const pad = (n) => String(n).padStart(2, "0");
    return `${ pad(d.getDate()) }/${ pad(d.getMonth() + 1) }/${ d.getFullYear() } ${ pad(d.getHours()) }:${ pad(d.getMinutes()) }`;
};
