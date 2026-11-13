import { PERM_ASSIGNMENT_MODULE, PERM_CALENDAR_ACCESS, PERM_CONTEXT, PERM_COPY_EXCLUDED_IDS, PERM_FOLLOWUP_SOURCES, PERM_LEVELS, PERM_SCOPE_GROUPS } from "./permissionCatalogue";

/*
 * Rule engine over the effective row list (port of the client's reference-source engine.mjs; same decisions):
 * raw / effective values, blocking reason, diff with knock-on effects, copy with the protected exclusions, validation.
 * Grants: { "<rowId>|<context>": true | false | "Off" | "Restricted" | "Full" }.
 */
const KEY = (id, c = PERM_CONTEXT.SINGLE) => `${id}|${c}`;
/* the owner floor is the specification's `ownerFloor` (Worker owner sections, AT-005); the preview also floored the JO / Contract
   CS Owner selects, but the written package floors Worker only and the API accepts `off` there (backend 269) */

export const truth = (v) => v !== false && v !== "Off" && v != null;

export const createPermissionEngine = (rows) => {
    const index = Object.fromEntries(rows.map((r) => [r.id, r]));
    const contexts = (r, audience) => (r && r.contexts_by_audience && r.contexts_by_audience[audience]) || [];
    const supported = (r, audience) => contexts(r, audience).length > 0;
    const isLevel = (id) => index[id]?.type === "level";
    const raw = (s, id, c = PERM_CONTEXT.SINGLE) => (s[KEY(id, c)] ?? (isLevel(id) ? "Off" : false));
    const nonOwnerMaster = (r) => index[`${r.module}.nonowner`];

    const effective = (s, id, c = PERM_CONTEXT.SINGLE, audience = "internal", seen = new Set()) => {
        const r = index[id];
        if (!r || !supported(r, audience) || !contexts(r, audience).includes(c) || r.held) return isLevel(id) ? "Off" : false;
        const k = KEY(id, c);
        if (seen.has(k)) return false;
        const trail = new Set(seen); trail.add(k);
        if (id === PERM_CALENDAR_ACCESS && audience === "internal" && PERM_FOLLOWUP_SOURCES.some((fid) => index[fid] && contexts(index[fid], audience).some((fc) => truth(effective(s, fid, fc, audience, trail))))) return true;
        let v = raw(s, id, c);
        if (r.ownerFloor?.includes(c) && v === "Off") v = "Restricted";
        if (r.lockedContexts?.includes(c)) v = true;
        if (c === PERM_CONTEXT.NON_OWNER && nonOwnerMaster(r) && !truth(effective(s, `${r.module}.nonowner`, PERM_CONTEXT.SINGLE, audience, trail))) return isLevel(id) ? "Off" : false;
        for (const p of r.parents || []) {
            const pr = index[p];
            if (!pr) continue;
            const pc = pr.contexts_by_audience?.[audience]?.includes(c) ? c : (pr.contexts_by_audience?.[audience]?.includes(PERM_CONTEXT.SINGLE) ? PERM_CONTEXT.SINGLE : c);
            if (!truth(effective(s, p, pc, audience, trail))) return isLevel(id) ? "Off" : false;
        }
        return v;
    };

    /** why a control is unavailable: "" when nothing blocks it */
    const blocking = (s, r, c, audience) => {
        if (r.held) return "held";
        if (c === PERM_CONTEXT.NON_OWNER && nonOwnerMaster(r) && !truth(effective(s, `${r.module}.nonowner`, PERM_CONTEXT.SINGLE, audience))) return `${r.module}.nonowner`;
        for (const p of r.parents || []) {
            const pr = index[p];
            if (!pr) continue;
            const pc = pr.contexts_by_audience?.[audience]?.includes(c) ? c : PERM_CONTEXT.SINGLE;
            if (!truth(effective(s, p, pc, audience))) return p;
        }
        return "";
    };
    const floor = (r, c) => Boolean(r.ownerFloor?.includes(c));
    const locked = (r, c) => Boolean(r.lockedContexts?.includes(c));

    /** the first unmet requirement of a row (walks parents), or null */
    const firstMissing = (s, r, c, audience, seen = new Set()) => {
        if (r.held) return { held: true, r, context: c };
        const k = KEY(r.id, c);
        if (seen.has(k)) return null;
        seen.add(k);
        if (c === PERM_CONTEXT.NON_OWNER && nonOwnerMaster(r) && !truth(effective(s, `${r.module}.nonowner`, PERM_CONTEXT.SINGLE, audience))) {
            const m = nonOwnerMaster(r);
            return firstMissing(s, m, PERM_CONTEXT.SINGLE, audience, seen) || { r: m, context: PERM_CONTEXT.SINGLE };
        }
        for (const pid of r.parents || []) {
            const p = index[pid];
            if (!p) continue;
            const pc = p.contexts_by_audience?.[audience]?.includes(c) ? c : (p.contexts_by_audience?.[audience]?.includes(PERM_CONTEXT.SINGLE) ? PERM_CONTEXT.SINGLE : c);
            if (!truth(effective(s, pid, pc, audience))) return firstMissing(s, p, pc, audience, seen) || { r: p, context: pc };
        }
        return null;
    };

    /** stored and effective differences, every supported row × context */
    const diff = (before, after, audience) => {
        const out = [];
        for (const r of rows) {
            if (!supported(r, audience)) continue;
            for (const c of contexts(r, audience)) {
                const b = raw(before, r.id, c), n = raw(after, r.id, c);
                const eb = effective(before, r.id, c, audience), en = effective(after, r.id, c, audience);
                if (b !== n || eb !== en) out.push({ id: r.id, context: c, before: b, after: n, effectiveBefore: eb, effectiveAfter: en });
            }
        }
        return out;
    };

    const validate = (grants, audience) => {
        const errors = [];
        for (const [k, v] of Object.entries(grants)) {
            const [id, c] = k.split("|");
            const r = index[id];
            if (!r || !supported(r, audience) || !contexts(r, audience).includes(c)) { errors.push(`unsupported:${k}`); continue; }
            if (r.type === "level" ? !PERM_LEVELS.includes(v) : typeof v !== "boolean") errors.push(`invalid:${k}`);
            if (r.held && truth(v)) errors.push(`held:${k}`);
        }
        return errors;
    };

    /** one-time copy into `current`; returns the excluded keys (ownership eligibility, branch / location scope, parameters, held, the two management authorities) */
    const copyExcluded = (r) => r.module === PERM_ASSIGNMENT_MODULE || PERM_SCOPE_GROUPS.includes(r.group) || Boolean(r.parameter) || Boolean(r.held) || PERM_COPY_EXCLUDED_IDS.includes(r.id);
    const copy = (current, source, audience) => {
        const out = { ...current };
        const excluded = [];
        for (const [k, v] of Object.entries(source)) {
            const [id, c] = k.split("|");
            const r = index[id];
            if (!r || !supported(r, audience) || !contexts(r, audience).includes(c) || copyExcluded(r)) { if (truth(v)) excluded.push(k); continue; }
            out[k] = v;
        }
        return { grants: out, excluded };
    };

    return { rows, index, contexts, supported, key: KEY, raw, effective, truth, blocking, floor, locked, firstMissing, diff, validate, copy, copyExcluded };
};
