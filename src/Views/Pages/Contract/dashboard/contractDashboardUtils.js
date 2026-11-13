import dayjs from "../../../../utils/dayjsConfig";
import translation from "../../../../utils/translation";
import {
    CD_COL, CD_COL_KIND, CD_COLUMN_DEFS, CD_COMPACT, CD_DEFAULT_SORT, CD_DEFAULT_STAGE_ORDER, CD_EVISA_ONLY_GROUPS, CD_EVISA_VOCAB,
    CD_FIXED_COLS, CD_PAOS_TRACK, CD_SORT_MODE, CD_STAGE, CD_STAGE_LABEL_KEYS, CD_STAGE_PRIORITY, CD_STAGE_TRACK, CR_PAOS_LABEL_KEYS,
    CD_STAGE_TONE_OVERRIDE, CD_STATUS, CD_TERMINAL, CD_TOKEN, CD_TOKEN_BLUE, CD_TOKEN_GRAY, CD_TOKEN_PURPLE, CD_TOKEN_TEAL, CD_TONE, CD_UNSORTABLE, CD_VOCAB, CD_XV_BUCKETS, CD_XV_PRESENTED, normalizeToken,
} from "../contractConstants";

export const EM_DASH = "—";

/* ---- time (prototype fmtDur / shortDate / fullStamp) ---- */
export const elapsedMinutes = (iso) => {
    if (!iso) return null;
    const at = dayjs(iso);
    return at.isValid() ? Math.max(0, Math.floor((Date.now() - at.valueOf()) / 60000)) : null;
};
export const formatDuration = (minutes) => {
    if (minutes == null) return null;
    if (minutes < 60) return "<1h";
    if (minutes < 1440) return `${ Math.floor(minutes / 60) }h`;
    const days = Math.floor(minutes / 1440);
    return days < 30 ? `${ days }d` : `${ Math.floor(days / 30) }mo`;
};
export const formatDate = (iso) => (iso && dayjs(iso).isValid() ? dayjs(iso).format("DD/MM/YYYY") : null);
export const formatShortDate = (iso) => (iso && dayjs(iso).isValid() ? dayjs(iso).format("DD/MM/YY") : null);
export const formatStamp = (iso) => (iso && dayjs(iso).isValid() ? dayjs(iso).format("DD/MM/YYYY HH:mm") : null);
export const clockNow = () => dayjs().format("HH:mm");

/* ---- people (prototype ownerInitials / abbrevName) ---- */
export { initialsOf } from "../details/contractRecordUtils";
export const abbrevName = (name) => {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) return parts[0] || "";
    return `${ parts.slice(0, -1).join(" ") } ${ parts[parts.length - 1][0] }.`;
};

/* ---- stage vocabulary ---- */
export const compactToken = (raw) => { const token = normalizeToken(raw); return CD_COMPACT[token] || token; };
export const isTerminalToken = (stage, token) => CD_TERMINAL[stage] === normalizeToken(token);
export const toneFor = (stage, raw) => {
    const token = normalizeToken(raw);
    if (token === CD_TOKEN.NOT_READY) return CD_TONE.RED;
    if (CD_TOKEN_GRAY.includes(token)) return CD_TONE.GRAY;
    if (isTerminalToken(stage, token)) return CD_TONE.GREEN;
    if (CD_STAGE_TONE_OVERRIDE[stage]?.[token]) return CD_STAGE_TONE_OVERRIDE[stage][token];
    if (CD_TOKEN_PURPLE.includes(token)) return CD_TONE.PURPLE;
    if (CD_TOKEN_BLUE.includes(token)) return CD_TONE.BLUE;
    if (CD_TOKEN_TEAL.includes(token)) return CD_TONE.TEAL;
    return CD_TONE.ORANGE;
};
export const vocabFor = (group, stage) => (stage === CD_STAGE.VISA && CD_EVISA_ONLY_GROUPS.includes(Number(group)) ? CD_EVISA_VOCAB : (CD_VOCAB[stage] || []));
/* the priority list a Group can actually produce — an impossible status is never offered */
export const priorityFor = (group, stage) => {
    if (stage === CD_STAGE.EXTEND_VISA) return CD_XV_BUCKETS;
    const allowed = vocabFor(group, stage);
    return (CD_STAGE_PRIORITY[stage] || []).filter((token) => allowed.includes(token));
};
export const stageLabel = (stageKey) => translation(CD_STAGE_LABEL_KEYS[stageKey] || stageKey);

/* ---- PAOS: `paos.token` is the stored key (backend answer #8) ---- */
export const paosKeyOf = (token) => (token && CR_PAOS_LABEL_KEYS[token] ? token : null);

/* ---- Extend Visa cell view: { presented, token, at, note, count } from the full or the legacy shape ---- */
export const extendVisaView = (xv) => {
    if (!xv || (!xv.presented && !xv.token)) return null;
    const token = xv.token || null;
    let presented = xv.presented || null;
    if (!presented) {
        if (token === CD_TOKEN.VISA_RELEASED) presented = CD_XV_PRESENTED.RELEASED;
        else if (token === CD_TOKEN.CANCELLED) presented = CD_XV_PRESENTED.CANCELLED;
        else presented = CD_XV_PRESENTED.OPEN;
    }
    return { presented, token, at: xv.at || xv.updated_at || null, note: xv.note || null, count: Number(xv.count) || 0 };
};

/* ---- the column registry (prototype allCols + v28 Active treatment) ---- */
const metaCol = (key, extra = {}) => ({ key, ...CD_COLUMN_DEFS[key], ...extra });
const stageCol = (key, track = CD_STAGE_TRACK) => ({ key, labelKey: CD_STAGE_LABEL_KEYS[key], kind: CD_COL_KIND.STAGE, ...track });
export const buildColumns = (status, group, stageOrder) => {
    const base = [metaCol(CD_COL.EMPLOYER), metaCol(CD_COL.WORKER), metaCol(CD_COL.CODE), metaCol(CD_COL.ACTIVITY)];
    const owners = [metaCol(CD_COL.CS_OWNER), metaCol(CD_COL.CS_ASSISTANT), metaCol(CD_COL.PREPARED_OWNER), metaCol(CD_COL.READY_OWNER), metaCol(CD_COL.BRANCH)];
    const stages = ((stageOrder && stageOrder[group]) || CD_DEFAULT_STAGE_ORDER[group] || []).map((key) => stageCol(key));
    const extendVisa = stageCol(CD_STAGE.EXTEND_VISA);
    if (status === CD_STATUS.ACTIVE) {
        return [...base, metaCol(CD_COL.CONTRACT_START), metaCol(CD_COL.CONTRACT_END, { expected: true }),
            ...(Number(group) === 2 ? [stageCol(CD_STAGE.PAOS, CD_PAOS_TRACK)] : []), extendVisa, ...owners];
    }
    if (status === CD_STATUS.COMPLETED) return [...base, metaCol(CD_COL.CONTRACT_END), metaCol(CD_COL.COMPLETION_REASON), ...stages, extendVisa, ...owners];
    if (status === CD_STATUS.CANCELLED) return [...base, metaCol(CD_COL.CONTRACT_END), metaCol(CD_COL.CANCELLATION_REASON), ...stages, extendVisa, ...owners];
    return [...base, ...stages, ...owners];
};
export const columnLabel = (column) => translation(column.labelKey);
export const isHideable = (key) => !CD_FIXED_COLS.includes(key);
export const isSortable = (column) => !CD_UNSORTABLE.includes(column.key);

/* a sort that names a column the new set does not carry, or a status the Group cannot produce, falls back */
export const reconcileSort = (sort, columns, group) => {
    const column = columns.find((c) => c.key === sort?.col);
    if (!column) return CD_DEFAULT_SORT;
    if (sort.mode === CD_SORT_MODE.PRIORITIZE && !priorityFor(group, sort.col).includes(sort.status)) return { col: sort.col, mode: CD_SORT_MODE.PRIORITY };
    return sort;
};

/* ---- request / response helpers ---- */
export const csvIds = (value) => String(value || "").split(",").map((part) => Number(part.trim())).filter((id) => id > 0);
export const isYes = (value) => value === "y";
export const sortParams = (sort) => {
    const params = { sort_by: sort.col };
    if (sort.mode === CD_SORT_MODE.DIR || sort.mode === CD_SORT_MODE.CHANGED || sort.mode === CD_SORT_MODE.TERMINAL) params.sort_order = sort.dir;
    if (sort.mode !== CD_SORT_MODE.DIR) params.sort_mode = sort.mode;
    if (sort.mode === CD_SORT_MODE.PRIORITIZE) params.sort_status = sort.status;
    return params;
};
/* owner / assistant facet options from the response, else derived from the loaded rows (no Inactive mark then) */
export const ownerOptionsFrom = (facets, rows, idKey, nameKey) => {
    if (Array.isArray(facets)) return facets.map((o) => ({ id: Number(o.id), name: o.name || "", inactive: Boolean(o.inactive) })).filter((o) => o.id > 0);
    const seen = new Map();
    (rows || []).forEach((row) => {
        const id = Number(row[idKey]);
        if (id > 0 && !seen.has(id)) seen.set(id, { id, name: row[nameKey] || "", inactive: false });
    });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
};
