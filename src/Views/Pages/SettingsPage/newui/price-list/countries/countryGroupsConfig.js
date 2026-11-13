import translation from "../../../../../../utils/translation";
import { interpolate } from "../../../../../../i18n/interpolate";

/*
 * Price List · Pricing countries (27 Oct package, PL-S4; layout and rules from the package's Pricing countries page).
 * Named groups of countries from the Worker Profile country master; a country is in at most one group; every country in
 * no group uses Other countries, which cannot be edited. No delete: a group is added, renamed, or has countries added or
 * removed. The draft is { groups: [{ id, name, country_ids }] } (a new group's id is "new-<n>" until it is saved).
 */

export const OTHER_GROUP_ID = "other";

export const savedCountryGroups = (data) => ({
    groups: (data?.groups || []).map((g) => ({ id: g.id, name: g.name, country_ids: [...g.country_ids] })),
});

export const currentGroups = (draft, saved) => draft?.groups || saved.groups;
export const isNewGroup = (group) => typeof group.id === "string";
export const nextNewGroupId = (groups) => `new-${groups.filter(isNewGroup).length + 1}`;

const trimmed = (name) => String(name ?? "").trim();
const sameName = (a, b) => trimmed(a).toLowerCase() === trimmed(b).toLowerCase();
const sameCountries = (a, b) => a.length === b.length && [...a].sort((x, y) => x - y).every((c, i) => c === [...b].sort((x, y) => x - y)[i]);

/**
 * The package's checks (pl_core.js groupIssues). `req` issues — an empty name or no country — show only after Review
 * changes; a name already used, or a country in two groups, show at once. `otherName` is the server's Other row name.
 */
export const groupIssues = (draft, saved, otherName, countryName) => {
    if (!draft?.groups) return [];
    const out = [];
    const touched = (g) => { const o = saved.groups.find((x) => x.id === g.id); return !o || o.name !== trimmed(g.name); };
    draft.groups.forEach((g, i) => {
        const name = trimmed(g.name);
        if (!name) out.push({ key: `${g.id}|name`, index: i, field: "name", err: translation("key_pl_group_name_required"), req: true });
        else if (sameName(name, otherName) || (touched(g) && draft.groups.some((o, j) => j !== i && sameName(o.name, name)))) {
            out.push({ key: `${g.id}|name`, index: i, field: "name", err: translation("key_pl_group_name_taken") });
        }
        if (!g.country_ids.length) out.push({ key: `${g.id}|countries`, index: i, field: "countries", err: translation("key_pl_group_empty"), req: true });
    });
    const seen = {};
    draft.groups.forEach((g, i) => g.country_ids.forEach((c) => {
        if (seen[c] != null && seen[c] !== i) {
            out.push({ key: `${g.id}|country|${c}`, index: i, field: "countries", err: interpolate(translation("key_pl_country_in_group"), countryName(c), trimmed(draft.groups[seen[c]].name)) });
        } else seen[c] = i;
    }));
    return out;
};

/** The package's changes (pl_core.js groupChanges): new groups, renamed groups, and every country whose group changes. */
export const groupChanges = (draft, saved, otherLabel, countryName) => {
    if (!draft?.groups) return [];
    const out = [];
    const where = (groups, c) => groups.find((g) => g.country_ids.includes(c)) || null;
    const nameOf = (g) => (g ? (trimmed(g.name) || translation("key_pl_the_new_group")) : otherLabel);
    draft.groups.forEach((g) => {
        const o = saved.groups.find((x) => x.id === g.id);
        if (!o) out.push({ kind: "new", key: `new|${g.id}`, group: g });
        else if (o.name !== trimmed(g.name)) out.push({ kind: "rename", key: `rename|${g.id}`, group: g, old: o });
    });
    const all = new Set([...saved.groups.flatMap((g) => g.country_ids), ...draft.groups.flatMap((g) => g.country_ids)]);
    [...all].sort((a, b) => countryName(a).localeCompare(countryName(b))).forEach((c) => {
        const before = where(saved.groups, c);
        const after = where(draft.groups, c);
        if ((before && before.id) !== (after && after.id)) {
            out.push({ kind: "move", key: `move|${c}`, country: c, from: nameOf(before), to: nameOf(after), toId: after ? after.id : OTHER_GROUP_ID });
        }
    });
    return out;
};

/** The body of POST /price-list/country-groups: each group added or changed (id null for a new one). */
export const buildCountryGroupsPayload = (data, draft, saved) => ({
    base_version: data?.version ?? null,
    groups: (draft?.groups || [])
        .filter((g) => {
            const o = saved.groups.find((x) => x.id === g.id);
            return !o || o.name !== trimmed(g.name) || !sameCountries(o.country_ids, g.country_ids);
        })
        .map((g) => ({ id: isNewGroup(g) ? null : g.id, name: trimmed(g.name), country_ids: [...g.country_ids] })),
});

const plural = (n, one, many) => interpolate(translation(n === 1 ? one : many), n);
export const countriesCount = (n) => plural(n, "key_pl_country_count_one", "key_pl_country_count");

/** Review rows: "New group: Middle East — 8 countries", "Group name: old → new", "Kuwait: Other countries → Middle East". */
export const reviewRows = (changes, countryName) => changes.map((c) => {
    if (c.kind === "new") return { key: c.key, label: interpolate(translation("key_pl_review_new_group"), trimmed(c.group.name)), text: true, before: null, after: countriesCount(c.group.country_ids.length) };
    if (c.kind === "rename") return { key: c.key, label: translation("key_pl_group_name"), text: true, before: c.old.name, after: trimmed(c.group.name) };
    return { key: c.key, label: countryName(c.country), text: true, before: c.from, after: c.to };
});
