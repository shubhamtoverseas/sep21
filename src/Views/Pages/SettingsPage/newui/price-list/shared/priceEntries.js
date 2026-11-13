import translation from "../../../../../../utils/translation";
import { interpolate } from "../../../../../../i18n/interpolate";

/*
 * Price List entries (27 Oct package): the rules every Price List page shares. They mirror the server
 * (maidmatch-contract src/domain/priceList/amounts.ts) and use the package's wording. An entry whose key ends in "|repl"
 * is a percentage; every other entry is a money amount. "Not entered" (null) and 0 are different values everywhere:
 * null shows "Missing", 0 shows 0. The screens never price: they show saved values and calculate only what the server
 * calculates the same way (a Replacement base).
 */

/* Wording from the package (Price List preview, pl_core.js `parse`) — the server answers with the same text. */
const ERR = {
    negative: "key_pl_price_negative",
    notNumber: "key_pl_enter_number",
    percent: "key_pl_percent_range",
    decimals: "key_pl_two_decimals",
};

export const isPercentKey = (key) => key.endsWith("|repl");

/** What staff typed -> { ok, value } (value null = not entered) or { ok: false, err } with the translated message. */
export const parseEntry = (raw, kind) => {
    const text = String(raw == null ? "" : raw).trim().replace(/,/g, "").replace(/^HK\$/i, "").replace(/%$/, "").trim();
    if (text === "") return { ok: true, value: null };
    const pct = kind === "pct";
    if (/^-\s*\d+(\.\d+)?$/.test(text)) return { ok: false, err: translation(pct ? ERR.percent : ERR.negative) };
    if (!/^\d+(\.\d+)?$/.test(text)) return { ok: false, err: translation(pct ? ERR.percent : ERR.notNumber) };
    const value = Number(text);
    if (pct && value > 100) return { ok: false, err: translation(ERR.percent) };
    if (/\.\d{3,}$/.test(text)) return { ok: false, err: translation(ERR.decimals) };
    return { ok: true, value };
};

/** A percentage of an amount in exact cents, rounded half-up to the cent (same as the server's pctOf). */
export const pctOf = (amount, pct) => {
    const cents = Math.round(amount * 100);
    const p = Math.round(pct * 100);
    return Math.floor((cents * p + 5000) / 10000) / 100;
};
/** Base less the replacement percentage; null when either is not entered. */
export const lessPct = (amount, pct) => (amount == null || pct == null ? null : Math.round((amount - pctOf(amount, pct)) * 100) / 100);

export const formatNumber = (n) => {
    if (n == null || n === "") return "";
    return Number.isInteger(n) ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
export const formatMoney = (n) => `HK$${formatNumber(n)}`;
export const formatPercent = (n) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;

const kindOfKey = (key) => (isPercentKey(key) ? "pct" : "amt");
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/** One entry as the screen shows it: the draft over the saved value. */
export const entryState = (key, draft, saved) => {
    if (draft && own(draft, key)) {
        const parsed = parseEntry(draft[key], kindOfKey(key));
        if (!parsed.ok) return { invalid: true, err: parsed.err, changed: true, missing: false, value: undefined };
        return { invalid: false, changed: parsed.value !== (saved[key] ?? null), missing: parsed.value == null, value: parsed.value };
    }
    const value = saved[key] ?? null;
    return { invalid: false, changed: false, missing: value == null, value };
};

/** The value a calculation may use: undefined while the entry is invalid, so nothing derives from an old value. */
export const currentValue = (key, draft, saved) => {
    const state = entryState(key, draft, saved);
    return state.invalid ? undefined : state.value;
};

/** The text an input shows: a valid draft is shown formatted; an invalid one exactly as typed. */
export const rawValue = (key, draft, saved) => {
    if (draft && own(draft, key)) {
        const parsed = parseEntry(draft[key], kindOfKey(key));
        return parsed.ok && parsed.value != null ? formatNumber(parsed.value) : draft[key];
    }
    const value = saved[key];
    return value == null ? "" : formatNumber(value);
};

export const changedKeys = (draft, saved) => Object.keys(draft || {}).filter((k) => { const s = entryState(k, draft, saved); return s.invalid || s.changed; });
export const invalidKeys = (draft, saved) => Object.keys(draft || {}).filter((k) => entryState(k, draft, saved).invalid);
export const missingCount = (keys, draft, saved) => keys.filter((k) => currentValue(k, draft, saved) === null).length;

/** Completeness of a set of entries: missing and to-correct are counted apart; 0 is a complete value. */
export const completeness = (keys, draft, saved) => {
    const invalid = keys.filter((k) => entryState(k, draft, saved).invalid).length;
    const missing = missingCount(keys, draft, saved);
    return { missing, invalid, complete: missing === 0 && invalid === 0 };
};

/**
 * Review groups in screen order: [{ title, keys }] -> [{ title, rows: [{ key, label, before, after, pct }] }], only the
 * changed entries, empty groups left out.
 */
export const toReviewGroups = (groups, labelOf, draft, saved) => {
    const changed = new Set(changedKeys(draft, saved));
    return groups
        .map((group) => ({ ...group, keys: group.keys.filter((k) => changed.has(k)) }))
        .filter((group) => group.keys.length)
        .map((group) => ({
            title: group.title,
            rows: group.keys.map((key) => ({ key, label: labelOf(key), before: saved[key] ?? null, after: currentValue(key, draft, saved), pct: isPercentKey(key) })),
        }));
};

/** "BGS, KMD and SRI" with the translated "and". */
export const listAnd = (items) => (items.length < 2
    ? items.join("")
    : interpolate(translation("key_pl_list_and"), items.slice(0, -1).join(", "), items[items.length - 1]));

/** "Hong Kong, Macau or Taiwan" with the translated "or". */
export const listOr = (items) => (items.length < 2
    ? items.join("")
    : interpolate(translation("key_pl_list_or"), items.slice(0, -1).join(", "), items[items.length - 1]));

/** Entries that become "not entered" with this save. */
export const clearedKeys = (keys, draft, saved) => keys.filter((k) => saved[k] != null && currentValue(k, draft, saved) === null);
