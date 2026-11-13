import {
    featureFor, featureLabel, groupTitle, listText, moduleName, PERM_CALENDAR_ACCESS, PERM_COMMUNICATIONS_MODULE, PERM_COPY_KEYS, PERM_LEVEL_LABEL_KEYS,
    PERM_SECTION_ORDER, sectionShort, sectionTitle, t, tx,
} from "./permissionCatalogue";
import { isStorable } from "./permissionAdapter";
import { truth } from "./permissionEngine";

/*
 * Pure view-model helpers of the editor (port of the preview's structure / notes / review logic):
 * sections → groups → feature rows → items, the dependency notes and their placement, search, screen names, review rows.
 */
const PRIORITY_GROUPS = { root: "CS can assign", item: "CS priority" };
const PRIORITY_ROOT_GROUP = "Can receive CS assignments — employer language";
const PRIORITY_ITEM_GROUP = "Priority for CS assignments — employer language";
const WIDE_ACTION_LENGTH = 30;

export const baseAria = (item) => {
    const f = featureLabel(item.feature, item.r);
    return item.action ? `${f}${f !== item.feature && item.option ? ": " : " — "}${tx(item.action)}` : f;
};
export const ariaName = (item) => `${item.dup ? `${groupTitle(item.group, item.section)} — ` : ""}${baseAria(item)} · ${sectionShort(item.section)}`;
export const screenName = (row) => {
    const f = featureFor(row);
    if (!f.action) return featureLabel(row.label, row);
    return `${featureLabel(f.feature, row)}${f.option ? ": " : " — "}${tx(f.action)}`;
};
export const rowIdOf = (row, context) => { const f = featureFor(row); return `${row.uiSection || context}::${f.group}::${f.feature}`; };
const isMaster = (r) => r.id === `${r.module}.access` || r.id === `${r.module}.nonowner` || r.id.endsWith(".record_level");

/** One structure per module and audience: [{ id: section, groups: [{ name, features: [{ name, items, multi, option, wide, rowId }], columns, lone }] }] */
export const buildStructure = ({ engine, rows, moduleId, audience, bindingOf }) => {
    const sections = new Map();
    rows.forEach((r) => {
        if (r.module !== moduleId || !engine.supported(r, audience)) return;
        const f = featureFor(r);
        engine.contexts(r, audience).forEach((context) => {
            const sid = r.uiSection || context;
            if (!sections.has(sid)) sections.set(sid, { id: sid, groups: new Map() });
            const groups = sections.get(sid).groups;
            if (!groups.has(f.group)) groups.set(f.group, { name: f.group, features: new Map() });
            const features = groups.get(f.group).features;
            if (!features.has(f.feature)) features.set(f.feature, { name: f.feature, items: [] });
            const binding = bindingOf(r.id, context);
            features.get(f.feature).items.push({ r, context, section: sid, group: f.group, feature: f.feature, action: f.action, option: Boolean(f.option), key: engine.key(r.id, context), binding, storable: isStorable(binding) });
        });
    });
    return PERM_SECTION_ORDER.filter((s) => sections.has(s)).map((s) => {
        const sec = sections.get(s);
        const groups = [...sec.groups.values()].map((g) => {
            const features = [...g.features.values()].map((f) => {
                const multi = f.items.length > 1 || Boolean(f.items[0].action);
                const option = f.items.every((i) => i.option);
                const wide = multi && !option && f.items.some((i) => i.action.length > WIDE_ACTION_LENGTH);
                return { ...f, multi, option, wide, rowId: `${s}::${g.name}::${f.name}` };
            });
            const columns = [];
            features.forEach((f) => { if (f.multi && !f.option && !f.wide) f.items.forEach((i) => { if (!columns.includes(i.action)) columns.push(i.action); }); });
            return { name: g.name, features, columns, lone: features.length === 1 && features[0].name === g.name };
        });
        const counts = new Map();
        groups.forEach((g) => g.features.forEach((f) => f.items.forEach((i) => { const n = baseAria(i); counts.set(n, (counts.get(n) || 0) + 1); })));
        groups.forEach((g) => g.features.forEach((f) => f.items.forEach((i) => { i.dup = counts.get(baseAria(i)) > 1; })));
        return { id: s, groups };
    });
};

const rootName = (root, moduleId) => (root.r.module === moduleId ? screenName(root.r) : t(PERM_COPY_KEYS.inModule, { name: screenName(root.r), module: moduleName(root.r.module) }));
const retainedText = (n) => (n === 0 ? "" : ` ${t(n === 1 ? PERM_COPY_KEYS.retainedOne : PERM_COPY_KEYS.retainedMany)}`);
const requirementNames = (roots, moduleId, engine) => {
    const byFeature = new Map();
    roots.forEach((root) => {
        const f = featureFor(root.r);
        const k = f.option ? `o|${root.r.module}|${f.feature}` : `r|${engine.key(root.r.id, root.context)}`;
        if (!byFeature.has(k)) byFeature.set(k, { f, r: root.r, names: [] });
        byFeature.get(k).names.push(f.option ? tx(f.action) : rootName(root, moduleId));
    });
    return listText([...byFeature.values()].map((g) => (g.f.option
        ? `${featureLabel(g.f.feature, g.r)}: ${listText(g.names)}${g.r.module === moduleId ? "" : ` (${moduleName(g.r.module)})`}`
        : g.names[0])));
};

/** Dependency notes: one per unmet requirement and section — under a master switch of the same section, or above the first affected row */
export const computeNotes = ({ engine, draft, struct, moduleId, audience }) => {
    const notes = { list: [], describe: new Map() };
    struct.forEach((sec) => {
        const order = sec.groups.flatMap((g) => g.features.map((f) => f.rowId));
        const byRoot = new Map();
        sec.groups.forEach((g) => g.features.forEach((f) => f.items.forEach((i) => {
            if (i.r.held || !engine.blocking(draft, i.r, i.context, audience)) return;
            const root = engine.firstMissing(draft, i.r, i.context, audience);
            if (!root || root.held) return;
            const rootRow = root.r.module === moduleId ? rowIdOf(root.r, root.context) : null;
            if (rootRow === f.rowId) return;
            const k = engine.key(root.r.id, root.context);
            if (!byRoot.has(k)) byRoot.set(k, { root, rootRow, items: [] });
            byRoot.get(k).items.push({ ...i, rowId: f.rowId });
        })));
        const places = new Map();
        byRoot.forEach((e) => {
            const first = order.find((id) => e.items.some((i) => i.rowId === id));
            const master = isMaster(e.root.r) && order.includes(e.rootRow) && order.indexOf(e.rootRow) < order.indexOf(first);
            const pk = master ? `after|${e.rootRow}` : `before|${first}`;
            if (!places.has(pk)) places.set(pk, { master, rootRow: master ? e.rootRow : null, roots: [], items: [] });
            const p = places.get(pk);
            p.roots.push(e.root); p.items.push(...e.items);
        });
        places.forEach((p, pk) => {
            const rowIds = order.filter((id) => p.items.some((i) => i.rowId === id));
            const selected = new Map(rowIds.map((id) => [id, new Set(p.items.filter((i) => i.rowId === id && truth(engine.raw(draft, i.r.id, i.context))).map((i) => i.key)).size]));
            const note = {
                id: `upm-note-${sec.id}-${pk.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`, master: p.master, level: p.roots[0].r.type === "level", rootRow: p.rootRow, rows: rowIds, selected,
                requires: t(PERM_COPY_KEYS.requires, { list: requirementNames(p.roots, moduleId, engine) }), below: t(PERM_COPY_KEYS.belowRequire, { name: rootName(p.roots[0], moduleId) }),
            };
            const priorityRoots = p.roots.every((x) => x.r.group === PRIORITY_GROUPS.root || x.r.group === PRIORITY_ROOT_GROUP);
            const priorityItems = p.items.every((i) => i.r.group === PRIORITY_GROUPS.item || i.r.group === PRIORITY_ITEM_GROUP);
            if (priorityRoots && priorityItems) { note.requires = t(PERM_COPY_KEYS.priorityNote); note.fixed = true; }
            notes.list.push(note);
            p.items.forEach((i) => notes.describe.set(i.key, note.id));
        });
    });
    return notes;
};

/** Where each note appears and what it says; "retained" counts only the selections beside the note (visible ones while searching) */
export const placeNotes = (notes, visibleRows) => {
    const placed = { after: new Map(), before: new Map() };
    const put = (m, k, n) => { if (!m.has(k)) m.set(k, []); m.get(k).push(n); };
    notes.list.forEach((n) => {
        const rowIds = visibleRows ? n.rows.filter((r) => visibleRows.has(r)) : n.rows;
        if (!rowIds.length) return;
        const sel = rowIds.reduce((total, r) => total + (n.selected.get(r) || 0), 0);
        if (n.master && (!visibleRows || visibleRows.has(n.rootRow))) put(placed.after, n.rootRow, { id: n.id, kind: "after", text: n.level && sel ? t(PERM_COPY_KEYS.noAccessRetained) : n.below + retainedText(sel) });
        else put(placed.before, rowIds[0], { id: n.id, kind: "before", text: n.fixed ? n.requires : n.requires + retainedText(sel) });
    });
    return placed;
};

const matches = (q, ...texts) => texts.some((x) => String(x || "").toLowerCase().includes(q));
/** Search matches the words on screen: section titles, group titles, feature names, actions, row labels */
export const filterStructure = (struct, search, moduleId) => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return struct;
    const out = [];
    struct.forEach((sec) => {
        if (matches(q, sectionTitle(sec.id, moduleId), sectionShort(sec.id))) { out.push(sec); return; }
        const groups = [];
        sec.groups.forEach((g) => {
            if (matches(q, groupTitle(g.name, sec.id))) { groups.push(g); return; }
            const features = g.features.filter((f) => matches(q, featureLabel(f.name, f.items[0].r), ...f.items.map((i) => i.action), ...f.items.map((i) => tx(i.action)), ...f.items.map((i) => featureLabel(i.r.label, i.r))));
            if (features.length) groups.push({ ...g, features });
        });
        if (groups.length) out.push({ ...sec, groups });
    });
    return out;
};
export const hasLevels = (struct) => struct.some((s) => s.groups.some((g) => g.features.some((f) => f.items.some((i) => i.r.type === "level"))));
export const isCommunications = (moduleId) => moduleId === PERM_COMMUNICATIONS_MODULE;

/** short status beside a control */
export const tagList = ({ engine, draft, item, audience }) => {
    const { r, context: c } = item;
    const out = [];
    if (r.held) out.push(t(PERM_COPY_KEYS.tagHeld));
    else if (!item.storable) out.push(t(PERM_COPY_KEYS.tagPending));
    if (engine.locked(r, c)) out.push(t(PERM_COPY_KEYS.tagRequiredFor, { section: sectionShort(c) }));
    if (engine.floor(r, c)) out.push(t(PERM_COPY_KEYS.tagFloor));
    if (r.id === PERM_CALENDAR_ACCESS && !engine.raw(draft, r.id, c) && truth(engine.effective(draft, r.id, c, audience))) out.push(t(PERM_COPY_KEYS.tagFollowUp));
    return out;
};

/* ---- review (before Save, and the copy preview) ---- */
export const levelLabel = (v) => t(PERM_LEVEL_LABEL_KEYS[v] || PERM_LEVEL_LABEL_KEYS.Off);
export const shownValue = (engine, r, c, v) => {
    if (r.type === "level") return levelLabel(v === "Off" && engine.floor(r, c) ? "Restricted" : v);
    return v || engine.locked(r, c) ? t(PERM_COPY_KEYS.selected) : t(PERM_COPY_KEYS.notSelected);
};
export const shownOn = (engine, r, c, v) => (r.type === "level" ? v !== "Off" || engine.floor(r, c) : Boolean(v) || engine.locked(r, c));
const groupContext = (r, s, name) => { const f = featureFor(r); const g = groupTitle(f.group, s); return g === name || name.startsWith(g) || (f.feature === f.group && f.action) ? "" : g; };

/** knock-on effects grouped under their group heading: [{ group, text, keys }] */
const effectGroups = (engine, list, s) => {
    const groups = new Map();
    list.forEach((d) => {
        const r = engine.index[d.id];
        const f = featureFor(r);
        const g = groupTitle(f.group, s);
        if (!groups.has(g)) groups.set(g, new Map());
        const feats = groups.get(g);
        const k = f.action ? `f|${f.feature}` : `r|${r.id}`;
        if (!feats.has(k)) feats.set(k, { f, rs: [], keys: [] });
        feats.get(k).rs.push(r); feats.get(k).keys.push(engine.key(d.id, d.context));
    });
    return [...groups].map(([g, feats]) => {
        const parts = [...feats.values()].map(({ f, rs }) => (!f.action ? featureLabel(rs[0].label, rs[0])
            : f.option ? `${featureLabel(f.feature, rs[0])}: ${rs.map((r) => tx(featureFor(r).action)).join(", ")}`
                : rs.length === 1 ? screenName(rs[0]) : `${featureLabel(f.feature, rs[0])} — ${rs.map((r) => tx(featureFor(r).action)).join(", ")}`));
        const own = feats.size === 1 && featureLabel([...feats.values()][0].f.feature, [...feats.values()][0].rs[0]) === g;
        return { group: own ? "" : g, text: parts.join(parts.some((x) => x.includes(",")) ? "; " : ", "), keys: [...feats.values()].flatMap((x) => x.keys) };
    });
};

/** review model: [{ module, name, sections: [{ id, title, rows: [...], effects: [{ heading, groups }] }] }] in screen order */
export const buildReview = ({ engine, rows, diffs, audience, bindingOf }) => {
    const pos = new Map();
    const modules = [...new Set(diffs.map((d) => engine.index[d.id]?.module).filter(Boolean))];
    modules.forEach((mid) => {
        if (isCommunications(mid)) return;
        buildStructure({ engine, rows, moduleId: mid, audience, bindingOf }).forEach((sec) => sec.groups.forEach((g) => g.features.forEach((f) => f.items.forEach((i) => pos.set(i.key, pos.size)))));
    });
    const sorted = [...diffs].filter((d) => engine.index[d.id]).sort((a, b) => (pos.get(engine.key(a.id, a.context)) ?? 1e9) - (pos.get(engine.key(b.id, b.context)) ?? 1e9));
    const byModule = new Map();
    sorted.forEach((d) => { const m = engine.index[d.id].module; if (!byModule.has(m)) byModule.set(m, []); byModule.get(m).push(d); });
    const out = [];
    byModule.forEach((list, mid) => {
        const bySection = new Map();
        list.forEach((d) => { const r = engine.index[d.id]; const s = r.uiSection || d.context; if (!bySection.has(s)) bySection.set(s, []); bySection.get(s).push(d); });
        const sections = PERM_SECTION_ORDER.filter((s) => bySection.has(s)).map((s) => {
            const items = bySection.get(s);
            const same = (d) => { const r = engine.index[d.id]; return shownValue(engine, r, d.context, d.before) === shownValue(engine, r, d.context, d.after); };
            const explicit = items.filter((d) => !same(d)).map((d) => {
                const r = engine.index[d.id];
                const name = screenName(r);
                const on = shownOn(engine, r, d.context, d.after);
                let note = "";
                if (on && !truth(d.effectiveAfter)) note = t(PERM_COPY_KEYS.untilRequirements);
                else if (!on && truth(d.effectiveAfter) && r.id === PERM_CALENDAR_ACCESS) note = t(PERM_COPY_KEYS.stillFollowUp);
                return { key: engine.key(d.id, d.context), name, group: groupContext(r, s, name), before: shownValue(engine, r, d.context, d.before), after: shownValue(engine, r, d.context, d.after), note };
            });
            const knock = items.filter((d) => same(d) && truth(d.effectiveBefore) !== truth(d.effectiveAfter));
            const on = (d) => shownOn(engine, engine.index[d.id], d.context, d.after);
            const viaFollowUp = (d) => d.id === PERM_CALENDAR_ACCESS && !on(d);
            const effects = [
                [PERM_COPY_KEYS.fxUnavailableRetained, knock.filter((d) => !truth(d.effectiveAfter) && on(d))],
                [PERM_COPY_KEYS.fxUnavailable, knock.filter((d) => !truth(d.effectiveAfter) && !on(d))],
                [PERM_COPY_KEYS.fxAvailable, knock.filter((d) => truth(d.effectiveAfter) && !viaFollowUp(d))],
                [PERM_COPY_KEYS.fxAvailableFollowUp, knock.filter((d) => truth(d.effectiveAfter) && viaFollowUp(d))],
            ].filter(([, l]) => l.length).map(([k, l]) => ({ heading: t(k), groups: effectGroups(engine, l, s) }));
            return { id: s, title: sectionShort(s), rows: explicit, effects };
        }).filter((s) => s.rows.length || s.effects.length);
        if (sections.length) out.push({ module: mid, name: moduleName(mid), sections });
    });
    return out;
};
