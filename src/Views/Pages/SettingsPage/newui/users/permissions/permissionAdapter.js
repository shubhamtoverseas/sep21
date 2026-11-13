import {
    bindingFor, featureFor, PERM_API, PERM_ASSIGN_TYPE, PERM_ASSIGNMENT_MODULE, PERM_AUDIENCE, PERM_CONTEXT, PERM_LEVEL_FROM_API, PERM_LEVEL_TO_API, PERM_MODEL,
    PERM_OWN_ENGINES, PERM_OWN_GROUP_SOURCE, PERM_WORKER_TYPE_VALUE, PERMISSION_CATALOGUE,
} from "./permissionCatalogue";

/*
 * Adapter between the admin API permission template — { data: [ { module, category: [ { id, name, selected_value, values? } ] } ] } —
 * and the engine's flat grants. Value models per binding (docs/migration/user_permissions_KEYMAP_2026-10-22.json):
 *   BOOL  selected_value y|n (fanOut: every member key written together)      SUB   token inside a CSV selected_value ("view,edit")
 *   CSV   option id inside a multi-value category                              RADIO one legacy radio (owner|all) ↔ two booleans
 *   LEVEL off|restricted|full_access ↔ Off|Restricted|Full (backend 269: every Record / Search access key, "No access" = off)
 *   BRANCH_LEVEL one branch's Off|Restricted|Full over two CSVs: in `apiKey` = access, also in `restrictedKey` = Restricted
 *         (Insurance Record branch scope, PROMPT 4 Part B / Q-07); a level row only when the API offers the Restricted key
 *   OWN   ownership eligibility ↔ add-user / update-user payload keys          NEW · NEWSUB · HELD have no key yet (shown, disabled)
 * Nothing here deletes a key: tokens and option ids the catalogue does not know are carried through unchanged. Categories the
 * API marks `deprecated` (the three Non-Owner enable keys) are read but never sent back (backend 269: ignored_keys / 422).
 */
const csvTokens = (value) => String(value || "").split(",").map((v) => v.trim()).filter(Boolean);
const toIdList = (value) => (Array.isArray(value) ? value : csvTokens(value)).map((v) => String(v).trim()).filter((v) => v !== "");
const optionLabel = (v) => v.branch_name || v.name || v.label || String(v.id);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export const audienceOf = (staffType) => (staffType === PERM_AUDIENCE.PARTNER ? PERM_AUDIENCE.PARTNER : PERM_AUDIENCE.INTERNAL);

/** category lookup across the template (legacy panels matched on `id` or the uppercase `name`) */
export const categoryIndex = (template) => {
    const map = new Map();
    (template?.data || []).forEach((m) => (m.category || []).forEach((cat) => {
        if (cat.id) map.set(String(cat.id), cat);
        if (cat.name && !map.has(cat.name)) map.set(String(cat.name), cat);
    }));
    return map;
};

const firstContext = (row, audience) => (row.contexts_by_audience?.[audience] || [])[0];

/**
 * The rows the editor renders for this template and audience. Option groups whose legacy category carries `values`
 * (branches, date presets, statuses, nationalities …) take their options from the API, one row per value; ownership
 * option groups take them from the lookup lists. The specification rows stay the template for parents and contexts.
 * Returns { rows, bindingOf(rowId, context) }.
 */
export const buildRows = (template, lists = {}, audience = PERM_AUDIENCE.INTERNAL) => {
    const cats = categoryIndex(template);
    const dyn = new Map();
    const rows = [];
    const groups = new Map();
    PERMISSION_CATALOGUE.rows.forEach((r) => {
        const k = `${r.module}::${r.group}`;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(r);
    });
    groups.forEach((specRows) => {
        /* a group may hold several option lists (Listing filters = profile status + type + nationality): cluster by key */
        const clusters = new Map();
        specRows.forEach((r) => {
            const ctx = firstContext(r, audience);
            const b = ctx ? bindingFor(r.id, ctx, audience) : null;
            const clusterKey = b && (b.model === PERM_MODEL.CSV || b.model === PERM_MODEL.BRANCH_LEVEL) ? `csv:${b.apiKey}` : (b && b.model === PERM_MODEL.OWN && PERM_OWN_GROUP_SOURCE[r.group] ? `own:${b.payloadKey}` : `row:${r.id}`);
            if (!clusters.has(clusterKey)) clusters.set(clusterKey, { binding: b, rows: [] });
            clusters.get(clusterKey).rows.push(r);
        });
        clusters.forEach(({ binding, rows: members }, clusterKey) => {
            const first = members[0];
            const dynFeature = featureFor(first).feature;
            if (clusterKey.startsWith("csv:")) {
                const values = cats.get(binding.apiKey)?.values;
                if (Array.isArray(values) && values.length) {
                    /* a branch level only when the API template carries the Restricted key: against an older API the row stays a tick, so a
                       Restricted choice can never be saved as Full */
                    const levelled = binding.model === PERM_MODEL.BRANCH_LEVEL && cats.has(binding.restrictedKey);
                    values.forEach((v) => {
                        const id = `${first.module}.${slug(binding.apiKey)}#${v.id}`;
                        rows.push({ ...first, id, label: optionLabel(v), parameter: true, dyn: true, dynFeature });
                        dyn.set(id, levelled
                            ? { model: PERM_MODEL.BRANCH_LEVEL, apiKey: binding.apiKey, restrictedKey: binding.restrictedKey, value: String(v.id) }
                            : { model: PERM_MODEL.CSV, apiKey: binding.apiKey, value: String(v.id) });
                    });
                    return;
                }
            } else if (clusterKey.startsWith("own:")) {
                const list = lists[PERM_OWN_GROUP_SOURCE[first.group]];
                if (Array.isArray(list) && list.length) {
                    list.forEach((item) => {
                        const id = `${first.module}.${slug(binding.payloadKey)}#${item.id}`;
                        rows.push({ ...first, id, label: optionLabel(item), dyn: true, dynFeature });
                        dyn.set(id, { model: PERM_MODEL.OWN, payloadKey: binding.payloadKey, value: String(item.id) });
                    });
                    return;
                }
            }
            members.forEach((r) => rows.push(r));
        });
    });
    const bindingOf = (rowId, context) => dyn.get(rowId) || bindingFor(rowId, context, audience);
    /* a row stored as a CSV option / token / y-n today is a checkbox on screen, whatever level the specification gives it
       (branch scope rows: product ruling 22 Oct — "no dropdown where a tick does the job") */
    const shaped = rows.map((r) => {
        if (r.type !== "level") return r;
        const ctx = firstContext(r, audience);
        const b = ctx ? bindingOf(r.id, ctx) : null;
        const levelled = b && (b.model === PERM_MODEL.LEVEL || (b.model === PERM_MODEL.BRANCH_LEVEL && cats.has(b.restrictedKey)));
        return b && b.apiKey && !levelled ? { ...r, type: "boolean" } : r;
    });
    return { rows: shaped, bindingOf };
};

/* ---- ownership eligibility (module `assignment`) ↔ the staff record / wizard form ---- */
const assignTypeHas = (type, value) => type === value || type === PERM_ASSIGN_TYPE.BOTH;
const readOwn = (binding, user, form) => {
    const { payloadKey, value } = binding;
    if (!user && !form) return false;
    if (payloadKey.endsWith("_assign_type")) return assignTypeHas(user?.[payloadKey] || "", value);
    if (payloadKey === "cs_priority_assign") return toIdList(user?.cs_priority_assign).includes(value);   /* backend 264: CSV of language ids (one id before) */
    if (payloadKey === "prepared_groups" || payloadKey === "ready_groups") return toIdList(form?.[payloadKey] ?? user?.[payloadKey]).includes(value);
    if (payloadKey.endsWith("_worker_type")) return toIdList(user?.[payloadKey]).includes(String(PERM_WORKER_TYPE_VALUE[value] ?? value));
    return toIdList(user?.[payloadKey]).includes(value);
};

/** grants from the API template (+ the staff record / form for ownership eligibility) */
export const templateToGrants = ({ template, rows, bindingOf, audience, user = null, form = null }) => {
    const cats = categoryIndex(template);
    const grants = {};
    rows.forEach((r) => {
        (r.contexts_by_audience?.[audience] || []).forEach((c) => {
            const b = bindingOf(r.id, c);
            const key = `${r.id}|${c}`;
            const level = r.type === "level";
            if (!b) { grants[key] = level ? "Off" : false; return; }
            const cat = b.apiKey ? cats.get(b.apiKey) : null;
            const sv = cat ? String(cat.selected_value ?? "") : "";
            switch (b.model) {
                case PERM_MODEL.BOOL: grants[key] = sv === PERM_API.YES; break;
                case PERM_MODEL.SUB:
                case PERM_MODEL.CSV: grants[key] = csvTokens(sv).includes(String(b.value)); break;
                case PERM_MODEL.RADIO: grants[key] = sv === b.value; break;
                case PERM_MODEL.LEVEL: grants[key] = PERM_LEVEL_FROM_API[sv] || "Off"; break;
                case PERM_MODEL.BRANCH_LEVEL: {
                    const inScope = csvTokens(sv).includes(String(b.value));
                    const restricted = csvTokens(cats.get(b.restrictedKey)?.selected_value).includes(String(b.value));
                    grants[key] = level ? (!inScope ? "Off" : restricted ? "Restricted" : "Full") : inScope;
                    break;
                }
                case PERM_MODEL.OWN: grants[key] = readOwn(b, user, form); break;
                default: grants[key] = level ? "Off" : false;
            }
        });
    });
    return grants;
};

/** has this row × context a place to be stored today? (NEW / NEWSUB / HELD have none) */
export const isStorable = (binding) => Boolean(binding) && ![PERM_MODEL.NEW, PERM_MODEL.NEWSUB, PERM_MODEL.HELD].includes(binding.model);

/** a new template with the grants written back (deep copy; unknown tokens / option ids kept; deprecated categories dropped) */
export const grantsToTemplate = ({ template, grants, rows, bindingOf, audience }) => {
    const next = JSON.parse(JSON.stringify(template || { data: [] }));
    next.data = (next.data || []).map((m) => ({ ...m, category: (m.category || []).filter((cat) => !cat.deprecated) }));
    const cats = categoryIndex(next);
    const perKey = new Map();   // apiKey → { model, entries: [{ value, on }] }
    rows.forEach((r) => {
        (r.contexts_by_audience?.[audience] || []).forEach((c) => {
            const b = bindingOf(r.id, c);
            if (!b || !b.apiKey || !isStorable(b) || b.model === PERM_MODEL.OWN) return;
            const v = grants[`${r.id}|${c}`];
            if (!perKey.has(b.apiKey)) perKey.set(b.apiKey, { model: b.model, fanOut: b.fanOut, restrictedKey: b.restrictedKey, entries: [] });
            const bucket = perKey.get(b.apiKey);
            if (bucket.model !== b.model) {
                /* frontend 390: one key, one model. A catalogue slip (the employer *_details View ticks were BOOL beside SUB Edit) used to
                   take the first binding's model and write y/n, dropping the token ticks. Tokens win; the slip is named in dev. */
                if (process.env.NODE_ENV !== "production") console.warn(`permission catalogue: ${b.apiKey} mixes ${bucket.model} and ${b.model} bindings`);
                if (bucket.model === PERM_MODEL.BOOL && (b.model === PERM_MODEL.SUB || b.model === PERM_MODEL.CSV)) bucket.model = b.model;
            }
            bucket.entries.push({ value: b.value, on: v });
        });
    });
    const write = (key, value) => {
        const cat = cats.get(key);
        if (cat) cat.selected_value = value;
    };
    perKey.forEach(({ model, fanOut, restrictedKey, entries }, key) => {
        const cat = cats.get(key);
        if (!cat) return;
        const current = String(cat.selected_value ?? "");
        switch (model) {
            case PERM_MODEL.BRANCH_LEVEL: {
                /* access = every branch not at No access; Restricted = the Restricted ones (a tick, `true`, is Full); ids the screen does not
                   show are kept in both keys */
                const known = new Set(entries.map((e) => String(e.value)));
                const inScope = entries.filter((e) => e.on === true || e.on === "Full" || e.on === "Restricted").map((e) => String(e.value));
                write(key, [...csvTokens(current).filter((tok) => !known.has(tok)), ...inScope].join(","));
                const restrictedCat = cats.get(restrictedKey);
                if (restrictedCat) {
                    const restricted = entries.filter((e) => e.on === "Restricted").map((e) => String(e.value));
                    write(restrictedKey, [...csvTokens(restrictedCat.selected_value).filter((tok) => !known.has(tok)), ...restricted].join(","));
                }
                break;
            }
            case PERM_MODEL.BOOL: {
                const value = entries.some((e) => e.on === true) ? PERM_API.YES : PERM_API.NO;
                (fanOut || [key]).forEach((k) => write(k, value));
                break;
            }
            case PERM_MODEL.SUB:
            case PERM_MODEL.CSV: {
                const tokens = entries.filter((e) => e.value !== undefined && e.value !== null);   /* a value-less (BOOL) entry has no token to write */
                const known = new Set(tokens.map((e) => String(e.value)));
                const kept = csvTokens(current).filter((tok) => !known.has(tok));
                const on = tokens.filter((e) => e.on === true).map((e) => String(e.value));
                write(key, [...kept, ...on].join(","));
                break;
            }
            case PERM_MODEL.RADIO: {
                const all = entries.some((e) => e.value === PERM_API.RADIO_ALL && e.on === true);
                const owner = entries.some((e) => e.value === PERM_API.RADIO_OWNER && e.on === true);
                write(key, all ? PERM_API.RADIO_ALL : owner ? PERM_API.RADIO_OWNER : "");
                break;
            }
            case PERM_MODEL.LEVEL: write(key, PERM_LEVEL_TO_API[entries[0].on] || PERM_API.OFF); break;
            default: break;
        }
    });
    return next;
};

/** ownership eligibility payload for /add-user and /update-user (same keys the legacy parseAssignments produced).
 *  With `engine`, a tick its requirement no longer supports (a Priority language whose language is unticked) is not sent. */
export const ownershipFromGrants = ({ grants, rows, bindingOf, audience, engine = null }) => {
    const own = [];
    rows.forEach((r) => {
        if (r.module !== PERM_ASSIGNMENT_MODULE) return;
        (r.contexts_by_audience?.[audience] || []).forEach((c) => {
            const b = bindingOf(r.id, c);
            if (!b || b.model !== PERM_MODEL.OWN) return;
            const on = engine ? engine.effective(grants, r.id, c, audience) === true : grants[`${r.id}|${c}`] === true;
            own.push({ payloadKey: b.payloadKey, value: String(b.value), on });
        });
    });
    const list = (payloadKey) => own.filter((o) => o.payloadKey === payloadKey && o.on).map((o) => o.value);
    const payload = {};
    PERM_OWN_ENGINES.forEach((engine) => {
        const typeKey = `${engine.payload}_assign_type`;
        const types = list(typeKey);
        const assignType = types.includes(PERM_ASSIGN_TYPE.MANUAL) && types.includes(PERM_ASSIGN_TYPE.ROUND_ROBIN) ? PERM_ASSIGN_TYPE.BOTH : (types[0] || "");
        let any = Boolean(assignType);
        if (engine.branches) { payload[engine.branches] = list(engine.branches).map(Number); any = any || payload[engine.branches].length > 0; }
        if (engine.nationality) { payload[engine.nationality] = list(engine.nationality).map(Number); any = any || payload[engine.nationality].length > 0; }
        if (engine.workerType) { payload[engine.workerType] = list(engine.workerType).map((v) => Number(PERM_WORKER_TYPE_VALUE[v] ?? v)); any = any || payload[engine.workerType].length > 0; }
        if (engine.payload === "cs") {
            payload.cs_employer_language = list("cs_employer_language").map(Number);
            /* backend 264: every ticked Priority language, a subset of cs_employer_language (the engine keeps a Priority tick behind its
               language). Transitional shape until every admin API carries 264: one id travels as the integer both versions accept,
               several as the array (264 only), none is omitted. */
            const priority = list("cs_priority_assign").map(Number).filter((id) => payload.cs_employer_language.includes(id));
            /* backend 264 (SQL 15 applied 26 Oct): the priority languages travel as an array — the transitional single integer is gone */
            if (priority.length > 0) payload.cs_priority_assign = priority;
            any = any || payload.cs_employer_language.length > 0;
        }
        payload[typeKey] = assignType;
        payload[`is_${engine.payload}`] = assignType === "" || !any ? 0 : 1;
    });
    payload.prepared_groups = list("prepared_groups").map(Number);
    payload.ready_groups = list("ready_groups").map(Number);
    return payload;
};

/** rows of one module and audience in the order the specification lists them */
export const rowsOfModule = (rows, moduleId, audience) => rows.filter((r) => r.module === moduleId && (r.contexts_by_audience?.[audience] || []).length > 0);

export const EMPTY_TEMPLATE = Object.freeze({ data: [] });
export const PERM_CONTEXT_LIST = Object.values(PERM_CONTEXT);
