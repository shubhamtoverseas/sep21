import dayjs from "dayjs";
import i18n from "i18next";

/* translation with interpolation (the shared translation() helper takes no options) */
export const translation = (key, options) => i18n.t(key, options);

/* Insurance dashboard (INDEX §3.1, ENUMS §F/§H). The server decides coverage, open requests and
   what the actor may filter (R1 / R5); this file only names, orders and formats. */

export const INSURANCE_VIEW_STATE_KEY = "insurance_dashboard_v1";
/* where a record was opened from (page, scroll, row): this browser session only, read once on the way back */
export const INSURANCE_RETURN_STATE_KEY = "insurance_dashboard_return_v1";
export const SEARCH_DEBOUNCE_MS = 300;
export const DEFAULT_PAGE_LIMIT = 25;

export const COVERAGE_LABELS = ["active", "future", "none"];
export const REQUEST_TYPES = ["New", "Renew", "Coverage", "Endorsement", "Cancellation"];

export const DEFAULT_SORT = { key: "lastActivity", dir: "desc" };

export const DEFAULT_FILTERS = Object.freeze({
    q: "",
    coverage: [],
    request: [],
    review: "",
    branch: [],
    owner: "all",
    activity: null,
    sort: DEFAULT_SORT,
    page: 1,
    limit: DEFAULT_PAGE_LIMIT,
});

/* Coverage label → tag tone (spec tones green / teal / gray; teal added to the shared tag sheet in PROMPT 6, OP-U2 closed) */
export const COVERAGE_TONE = { active: "green", future: "teal", none: "neutral" };

export const coverageLabel = (label) => translation(`key_ins_coverage_${label}`);
export const requestTypeLabel = (type) => translation(`key_ins_req_${String(type).toLowerCase()}`);

/* Open requests: one tag per open request, five distinct tones (Insurance.txt INS08: New policy blue, Renewal purple,
   Additional coverage teal, Change policy amber — the design system's orange, as in the prototype's rules.js — and
   Cancellation red). Next Step is retired (9 Nov model). */
export const REQUEST_TONE = { New: "blue-1", Renew: "purple", Coverage: "teal", Endorsement: "orange", Cancellation: "red" };

/* Saved dashboard preferences (Q-19): the Open requests column was stored under the retired id "nextStep". It is renamed
   in place wherever a column list is remembered — the Columns choice (insurance_columns_v1) and the dashboard view state
   (insurance_dashboard_v1) — so a saved choice keeps the column instead of losing it. (Sorting never used the id: the
   column has no sort key.) Run before the preferences are read; running it again changes nothing. */
export const RETIRED_COLUMN_IDS = { nextStep: "openRequests" };
export const migrateInsurancePreferences = (columnsKey, store = window.localStorage) => {
    [columnsKey, INSURANCE_VIEW_STATE_KEY].forEach((key) => {
        try {
            const saved = JSON.parse(store.getItem(key));
            if (!saved || !Array.isArray(saved.columns) || !saved.columns.some((id) => RETIRED_COLUMN_IDS[id])) return;
            const columns = Array.from(new Set(saved.columns.map((id) => RETIRED_COLUMN_IDS[id] || id)));
            store.setItem(key, JSON.stringify({ ...saved, columns }));
        } catch { /* storage unavailable or unreadable: nothing to migrate */ }
    });
};

export const DATE_PRESET_KEYS = {
    yesterday: "key_ins_preset_yesterday",
    last_7_days: "key_ins_preset_last_7_days",
    last_30_days: "key_ins_preset_last_30_days",
    last_60_days: "key_ins_preset_last_60_days",
    last_90_days: "key_ins_preset_last_90_days",
    this_month: "key_ins_preset_this_month",
    last_month: "key_ins_preset_last_month",
    this_quarter: "key_ins_preset_this_quarter",
    year_to_date: "key_ins_preset_year_to_date",
    last_year: "key_ins_preset_last_year",
};

export const CUSTOM_DURATIONS = [
    { key: "90_days", labelKey: "key_ins_duration_90_days", maxDays: 90, months: null },
    { key: "6_months", labelKey: "key_ins_duration_6_months", maxDays: null, months: 6 },
    { key: "1_year", labelKey: "key_ins_duration_1_year", maxDays: null, months: 12 },
    { key: "2_years", labelKey: "key_ins_duration_2_years", maxDays: null, months: 24 },
    { key: "all_time", labelKey: "key_ins_duration_all_time", maxDays: null, months: null },
];

/* ── Dates ──────────────────────────────────────────────────────────────── */
/* One day rule (ACT #19; verification 15 Oct FN-236): an Insurance instant (ISO, UTC) is shown on the Hong Kong calendar and
   clock — the day the server's Activity filter counts — whatever the browser's zone. A plain date ("YYYY-MM-DD") is shown as it is. */
const HK_CLOCK = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
const isInstant = (value) => value instanceof Date || (typeof value === "string" && /T\d{2}:\d{2}/.test(value));
const wallClock = (value) => {
    if (!value || !dayjs(value).isValid()) return null;
    if (!isInstant(value)) {
        const d = dayjs(value);
        return { y: d.format("YYYY"), m: d.format("MM"), d: d.format("DD"), hh: d.format("HH"), mm: d.format("mm") };
    }
    const p = Object.fromEntries(HK_CLOCK.formatToParts(new Date(value)).map((x) => [x.type, x.value]));
    return { y: p.year, m: p.month, d: p.day, hh: p.hour, mm: p.minute };
};
export const fmtDateShort = (value) => { const w = wallClock(value); return w ? `${w.d}/${w.m}/${w.y.slice(2)}` : ""; };
export const fmtDateLong = (value) => { const w = wallClock(value); return w ? `${w.d}/${w.m}/${w.y}` : ""; };
export const fmtDateTime = (value) => { const w = wallClock(value); return w ? `${w.d}/${w.m}/${w.y.slice(2)} ${w.hh}:${w.mm}` : ""; };

/* "Ends <date>" names the LAST COVERED DAY. An accepted cancellation's effective date is the first uncovered day
   (Insurance.txt INS03 date convention; State Machine #12; owner ruling 10 Nov 2026), so "Ends" shows the day before it.
   Display only: the stored effective date, the coverage calculation and the API field do not change, and the cancellation
   detail still prints the effective date itself, labelled "effective". Every "Ends" goes through this one function; set the
   switch to false to show the effective date again if Insurance operations' policy evidence (Q-10) contradicts the
   convention. */
export const ENDS_SHOWS_LAST_COVERED_DAY = true;
export const endsDate = (effective) => {
    if (!ENDS_SHOWS_LAST_COVERED_DAY || !effective || !dayjs(effective).isValid()) return effective;
    return dayjs(effective).subtract(1, "day").format("YYYY-MM-DD");
};

/* Activity relative time (core.relTime) */
export const relTime = (iso, now = Date.now()) => {
    if (!iso || !dayjs(iso).isValid()) return "";
    const m = Math.round((now - new Date(iso).getTime()) / 6e4);
    if (m < 1) return translation("key_ins_rel_now");
    if (m < 60) return translation("key_ins_rel_minutes", { n: m });
    const h = Math.round(m / 60);
    if (h < 24) return translation("key_ins_rel_hours", { n: h });
    const d = Math.round(h / 24);
    if (d < 30) return translation("key_ins_rel_days", { n: d });
    const mo = Math.round(d / 30);
    if (mo < 12) return translation("key_ins_rel_months", { n: mo });
    return translation("key_ins_rel_years", { n: Math.round(mo / 12) });
};

/* Calendar months clamp to the last valid day (core.addMonths) */
export const addMonths = (iso, n) => {
    const d = dayjs(iso);
    if (!d.isValid()) return null;
    const target = d.startOf("month").add(n, "month");
    return target.date(Math.min(d.date(), target.daysInMonth())).format("YYYY-MM-DD");
};

const isIsoDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && dayjs(s).format("YYYY-MM-DD") === s;

/* Custom range validation (permissions.validateCustomRange) — same rules the server applies */
export const validateCustomRange = (range, grantedDurations) => {
    if (!grantedDurations.length) return { ok: false, errors: { duration: translation("key_ins_range_not_granted") } };
    const errors = {};
    const d = CUSTOM_DURATIONS.find((x) => x.key === range?.duration);
    if (!d || !grantedDurations.includes(range.duration)) errors.duration = translation("key_ins_range_select_duration");
    if (!isIsoDate(range?.from)) errors.from = translation("key_ins_range_from");
    if (!isIsoDate(range?.to)) errors.to = translation("key_ins_range_to");
    if (!Object.keys(errors).length && range.from > range.to) errors.to = translation("key_ins_range_order");
    if (!Object.keys(errors).length && d.maxDays != null && dayjs(range.to).diff(dayjs(range.from), "day") + 1 > d.maxDays) {
        errors.to = translation("key_ins_range_span_days", { label: translation(d.labelKey), n: d.maxDays });
    }
    if (!Object.keys(errors).length && d.months != null) {
        const until = addMonths(range.from, d.months);
        if (until && range.to > until) {
            errors.to = translation("key_ins_range_span_months", { label: translation(d.labelKey), from: fmtDateLong(range.from), until: fmtDateLong(until) });
        }
    }
    return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
};

/* ── Coverage facts: the detail behind the tag (rules.coverage detail); the listing cell itself shows the tag only (register #84) ── */
const FACT_KEYS = {
    "fact.active": "key_ins_fact_active",
    "fact.ends": "key_ins_fact_ends",
    "fact.starts": "key_ins_fact_starts",
    "fact.expired": "key_ins_fact_expired",
    "fact.cancelled": "key_ins_fact_cancelled",
    "fact.cancelledInception": "key_ins_fact_cancelled_inception",
    "fact.notIssued": "key_ins_fact_not_issued",
    "fact.noPeriod": "key_ins_fact_no_period",
};
export const factText = (fact, date) => (FACT_KEYS[fact]
    ? translation(FACT_KEYS[fact], { date: fmtDateShort(fact === "fact.ends" ? endsDate(date) : date) })
    : "");

const pastFactText = (pastFact) => {
    if (!pastFact) return "";
    if (pastFact.fact === "fact.cancelled") return translation("key_ins_past_cancelled", { date: fmtDateShort(pastFact.date) });
    if (pastFact.fact === "fact.expired") return `${translation("key_ins_fact_expired")} ${fmtDateShort(pastFact.date)}`;
    return factText(pastFact.fact);
};

/* The coverage detail shown as the pill's title */
export const coverageDetail = (cv) => {
    if (cv.legacy && cv.code === "cancelled" && !cv.pastFact) return translation("key_ins_detail_legacy", { raw: cv.legacy });
    if (cv.label === "active") {
        const parts = [];
        if (cv.code === "ending") parts.push(translation("key_ins_detail_cxl_accepted_ends", { date: fmtDateShort(endsDate(cv.factDate)) }));
        if (cv.nextStart) {
            let next = translation("key_ins_detail_next_period", { date: fmtDateShort(cv.nextStart) });
            if (cv.gapDays) next += ` · ${translation("key_ins_gap_days", { n: cv.gapDays })}`;
            else if (cv.overlapDays) next += ` · ${translation("key_ins_overlap_days", { n: cv.overlapDays })}`;
            parts.push(next);
        }
        return parts.join(" · ");
    }
    if (cv.label === "future") {
        let detail = translation("key_ins_detail_not_in_force");
        if (cv.nextCancellation) detail += ` · ${translation("key_ins_detail_future_cxl", { date: fmtDateShort(cv.nextCancellation) })}`;
        if (cv.pastFact) {
            const past = pastFactText(cv.pastFact);
            detail += ` · ${translation("key_ins_detail_last_period", { fact: past.charAt(0).toLowerCase() + past.slice(1) })}`;
            if (cv.gapDays) detail += ` (${translation("key_ins_gap_days", { n: cv.gapDays })})`;
        }
        return detail;
    }
    if (cv.code === "expired" || cv.code === "cancelled") return pastFactText(cv.pastFact);
    if (cv.code === "awaiting") return translation("key_ins_detail_no_period_yet");
    return "";
};

/* ── Request payload ────────────────────────────────────────────────────── */
export const buildSearchPayload = (filters, extra = {}) => {
    const payload = { page: filters.page, limit: filters.limit, sort: filters.sort, ...extra };
    if (filters.q && filters.q.trim().length >= 3) payload.q = filters.q.trim();
    if (filters.coverage.length) payload.coverage = filters.coverage;
    if (filters.request.length) payload.request = filters.request;
    if (filters.review === "open") payload.review = "open";
    if (filters.branch.length) payload.branch = filters.branch.map(Number);
    if (filters.owner === "mine") payload.owner = "mine";
    else if (filters.owner && filters.owner !== "all") payload.owner = Number(filters.owner);
    if (filters.activity) payload.activity = filters.activity;
    return payload;
};

export const isFilterActive = (filters) => Boolean(
    filters.q || filters.coverage.length || filters.request.length || filters.review
    || filters.branch.length || (filters.owner && filters.owner !== "all") || filters.activity
);
