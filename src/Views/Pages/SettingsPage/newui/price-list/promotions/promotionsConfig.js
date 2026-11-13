import dayjs from "dayjs";
import translation from "../../../../../../utils/translation";
import { interpolate } from "../../../../../../i18n/interpolate";
import { formatMoney, formatPercent, parseEntry } from "../shared/priceEntries";
import { SERVICES, serviceName } from "../items-by-service/itemsByServiceConfig";

/*
 * Price List · Invoice promotions (27 Oct package, PL-S6; requirements section 25; layout, checks and review from the
 * package's Promotions page). Name, worker types, the services it applies to, Worker Code initials, branches, a start
 * date, an end date or Indefinite, and a percentage or an amount. No delete. The draft is { promotions: [...] } (a new
 * promotion's id is "new-<n>" until it is saved). The server repeats every check
 * (maidmatch-contract price.list.promotions.services.ts).
 */

export const WORKER_TYPES = Object.freeze([
    { id: "local", labelKey: "key_local" },
    { id: "overseas", labelKey: "key_overseas" },
]);
export const KINDS = Object.freeze([
    { id: "percent", labelKey: "key_pl_percentage_pct", reviewKey: "key_pl_percentage" },
    { id: "flat", labelKey: "key_pl_amount_hkd", reviewKey: "key_amount" },
]);

const workerTypeName = (id) => { const t = WORKER_TYPES.find((x) => x.id === id); return t ? translation(t.labelKey) : id; };
const kindName = (id) => { const k = KINDS.find((x) => x.id === id); return k ? translation(k.reviewKey) : id; };

/** The services a promotion's worker types allow: partner services for Overseas, the others for Local. */
export const servicesFor = (types) => SERVICES.filter((s) => types.includes(s.partner ? "overseas" : "local"));
/** The Worker Code initials they allow: the Local code groups for Local, the partner agency codes for Overseas. */
export const codesFor = (types, data) => [
    ...(types.includes("local") ? data?.codes?.local || [] : []),
    ...(types.includes("overseas") ? (data?.codes?.partner || []).map((c) => c.code) : []),
];
export const branchName = (data, id) => (data?.branches || []).find((b) => b.id === id)?.name || String(id);

/** "1 Oct 2026" (the package's dateText). */
export const dateText = (iso) => (iso ? dayjs(iso).format("D MMM YYYY") : "");
export const datesText = (start, end) => (end
    ? interpolate(translation("key_pl_dates_range"), dateText(start), dateText(end))
    : interpolate(translation("key_pl_dates_from"), dateText(start)));
export const valueText = (p) => (p.value == null ? "" : p.kind === "percent" ? formatPercent(p.value) : formatMoney(p.value));

const copy = (p) => ({ ...p, worker_types: [...p.worker_types], services: [...p.services], codes: [...p.codes], branch_ids: [...p.branch_ids] });
export const savedPromotions = (data) => ({ promotions: (data?.promotions || []).map(copy) });
export const currentPromotions = (draft, saved) => draft?.promotions || saved.promotions;
export const isNewPromotion = (p) => typeof p.id === "string";
export const nextPromotionId = (list) => `new-${list.filter(isNewPromotion).length + 1}`;

const isIsoDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value).format("YYYY-MM-DD") === value;
const repeats = (list) => new Set(list).size !== list.length;

/**
 * The package's checks for one promotion, in its order (engine validate): a name; a value (a percentage up to 100);
 * worker types; Applies to selections and Worker Code initials its worker types allow; branches from the list; a start
 * date; an end date on or after it, or Indefinite. -> [{ field, err }].
 */
export const promotionIssues = (p, data) => {
    const out = [];
    const name = String(p.name ?? "").trim();
    const nm = name || translation("key_pl_a_promotion");
    const issue = (field, key, withName = true) => out.push({ field, err: withName ? interpolate(translation(key), nm) : translation(key) });
    if (!name) issue("name", "key_pl_promo_name_required", false);
    if (p.value == null) issue("value", "key_pl_promo_value_required", false);
    else if (!parseEntry(String(p.value), p.kind === "percent" ? "pct" : "amt").ok) issue("value", "key_pl_promo_value_not_allowed");
    const types = p.worker_types || [];
    if (!types.length || types.some((t) => !WORKER_TYPES.some((w) => w.id === t)) || repeats(types)) issue("worker_types", "key_pl_promo_worker_type");
    const allowedServices = servicesFor(types).map((s) => s.id);
    if (!p.services.length || p.services.some((s) => !allowedServices.includes(s)) || repeats(p.services)) issue("services", "key_pl_promo_applies_to");
    const allowedCodes = codesFor(types, data);
    if (!p.codes.length || p.codes.some((c) => !allowedCodes.includes(c)) || repeats(p.codes)) issue("codes", "key_pl_promo_codes");
    const branchIds = (data?.branches || []).map((b) => b.id);
    if (!p.branch_ids.length || p.branch_ids.some((b) => !branchIds.includes(b)) || repeats(p.branch_ids)) issue("branch_ids", "key_pl_promo_branch");
    if (!isIsoDate(p.start)) issue("start", "key_pl_promo_start");
    if (p.end !== null && !isIsoDate(p.end)) issue("end", "key_pl_promo_end");
    else if (p.end !== null && isIsoDate(p.start) && p.end < p.start) issue("end", "key_pl_promo_end_before");
    return out;
};

/* the package's review fields (pl_retained.js retainedChanges) */
const listText = (items) => items.join(", ");
const FIELDS = [
    ["name", "key_pl_review_name", (p) => String(p.name).trim()],
    ["kind", "key_discount", (p) => kindName(p.kind)],
    ["value", "key_value", (p) => (p.value == null ? "" : String(p.value))],
    ["worker_types", "key_pl_worker_type", (p) => listText(p.worker_types.map(workerTypeName))],
    ["services", "key_pl_applies_to", (p) => listText(p.services.map(serviceName))],
    ["codes", "key_pl_worker_codes", (p) => listText(p.codes)],
    ["branch_ids", "key_pl_branches", (p, data) => listText(p.branch_ids.map((id) => branchName(data, id)))],
    ["start", "key_pl_start", (p) => dateText(p.start)],
    ["end", "key_pl_end", (p) => (p.end == null ? translation("key_indefinite") : dateText(p.end))],
];

/** One row per changed field, "<name> · <field>" before / after; a new promotion is one row with everything it has. */
export const promotionChanges = (draft, saved, data) => {
    if (!draft?.promotions) return [];
    const out = [];
    draft.promotions.forEach((p) => {
        const o = saved.promotions.find((x) => x.id === p.id);
        const name = String(p.name).trim();
        if (!o) {
            out.push({
                key: `${p.id}|new`, name, field: translation("key_pl_review_new"), before: translation("key_pl_not_set"),
                after: FIELDS.map(([, labelKey, text]) => `${translation(labelKey)}: ${text(p, data)}`).join(" · "),
            });
            return;
        }
        FIELDS.forEach(([field, labelKey, text]) => {
            const before = text(o, data);
            const after = text(p, data);
            if (before !== after) out.push({ key: `${p.id}|${field}`, name, field: translation(labelKey), before, after });
        });
    });
    return out;
};

export const promotionReviewRows = (changes) => changes.map((c) => ({ key: c.key, label: `${c.name} · ${c.field}`, text: true, before: c.before, after: c.after }));

const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const samePromotion = (a, b) => String(a.name).trim() === String(b.name).trim() && a.kind === b.kind && a.value === b.value
    && sameList(a.worker_types, b.worker_types) && sameList(a.services, b.services) && sameList(a.codes, b.codes)
    && sameList(a.branch_ids, b.branch_ids) && a.start === b.start && a.end === b.end;

/** The body of POST /price-list/promotions: each promotion added (id null) or changed. */
export const buildPromotionsPayload = (data, draft, saved) => ({
    base_version: data?.version ?? null,
    promotions: (draft?.promotions || [])
        .filter((p) => { const o = saved.promotions.find((x) => x.id === p.id); return !o || !samePromotion(o, p); })
        .map((p) => ({
            id: isNewPromotion(p) ? null : p.id,
            name: String(p.name).trim(),
            kind: p.kind,
            value: p.value,
            worker_types: [...p.worker_types],
            services: [...p.services],
            codes: [...p.codes],
            branch_ids: [...p.branch_ids],
            start: p.start,
            end: p.end,
        })),
});

/* the server's load issues (field -> the package's message) */
const ISSUE_KEYS = {
    name: "key_pl_promo_name_required",
    value: "key_pl_promo_value_not_allowed",
    worker_types: "key_pl_promo_worker_type",
    services: "key_pl_promo_applies_to",
    codes: "key_pl_promo_codes",
    branch_ids: "key_pl_promo_branch",
    start: "key_pl_promo_start",
    end: "key_pl_promo_end",
};

/** What the server found wrong with the saved promotions, in the package's wording. */
export const issueTexts = (data) => (data?.issues || []).map((issue, at) => {
    const p = (data.promotions || []).find((x) => x.id === issue.promotion_id);
    const nm = String(p?.name ?? "").trim() || translation("key_pl_a_promotion");
    const key = issue.key === "PRICE_LIST_PROMOTION_END_BEFORE_START" ? "key_pl_promo_end_before" : ISSUE_KEYS[issue.field] || "key_pl_promo_value_not_allowed";
    return { key: String(at), text: interpolate(translation(key), nm) };
});

