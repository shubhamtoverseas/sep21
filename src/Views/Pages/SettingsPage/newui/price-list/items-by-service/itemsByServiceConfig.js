import translation from "../../../../../../utils/translation";
import { interpolate } from "../../../../../../i18n/interpolate";
import { formatMoney } from "../shared/priceEntries";

/*
 * Price List · Items by service (27 Oct package, PL-S5; requirements section 15; layout, checks and review from the
 * package's Items by service page). A Fixed items catalogue item linked to one service, with All codes (a live scope:
 * codes added later are included) or listed codes, how it is added and which amount applies. The same item, service and
 * code are never set up twice — All codes against listed codes included; different catalogue items never conflict.
 * Values as stored (maidmatch-contract src/domain/priceList/catalogue.ts); the server repeats every check.
 * The draft is { rules: [...] } (a new rule's id is "new-<n>" until it is saved).
 */

export const SERVICES = Object.freeze([
    { id: "local", labelKey: "key_local", partner: false },
    { id: "overseas", labelKey: "key_overseas", partner: true },
    { id: "direct_hire", labelKey: "key_direct_hire", partner: true },
    { id: "local_transfer", labelKey: "key_local_transfer", partner: false },
    { id: "renewal", labelKey: "key_renewal", partner: false },
]);
export const serviceName = (id) => { const s = SERVICES.find((x) => x.id === id); return s ? translation(s.labelKey) : id; };
export const isPartnerService = (id) => Boolean(SERVICES.find((x) => x.id === id)?.partner);

/* R-I1: how it's added, with the package's hints */
export const TREATMENTS = Object.freeze([
    { id: "required", nameKey: "key_pl_treat_required", hintKey: "key_pl_treat_required_hint" },
    { id: "removable", nameKey: "key_pl_treat_removable", hintKey: "key_pl_treat_removable_hint" },
    { id: "manual", nameKey: "key_pl_treat_manual", hintKey: "key_pl_treat_manual_hint" },
]);
export const treatName = (id) => { const t = TREATMENTS.find((x) => x.id === id); return t ? translation(t.nameKey) : ""; };

/* what a missing amount means for invoices, by treatment (the package's MISSING_FX) */
export const missingEffect = (treatment) => translation({
    required: "key_pl_missing_fx_required",
    removable: "key_pl_missing_fx_removable",
    manual: "key_pl_missing_fx_manual",
}[treatment] || "key_pl_missing_fx_manual");

/* ---------------- codes ---------------- */

/** The codes a service uses now: the current partner agency codes, or the existing Local code groups. */
export const codesFor = (service, data) => (isPartnerService(service)
    ? (data?.codes?.partner || []).map((c) => c.code)
    : [...(data?.codes?.local || [])]);

/** "SRI Manpower · Filipino" for a partner code; a Local code group is shown as itself. */
export const codeName = (service, code, data) => {
    if (!isPartnerService(service)) return "";
    const agency = (data?.codes?.partner || []).find((c) => c.code === code);
    return agency ? [agency.name, agency.nationality].filter(Boolean).join(" · ") : "";
};

export const allCodesText = (service) => translation(isPartnerService(service) ? "key_pl_all_partner_codes" : "key_pl_all_local_code_groups");
export const laterText = (service) => translation(isPartnerService(service) ? "key_pl_partner_codes_later" : "key_pl_local_codes_later");
export const codesLabel = (service) => translation(isPartnerService(service) ? "key_pl_partner_agency_codes" : "key_pl_local_code_groups");
export const codesText = (rule) => (rule.codes === "all" ? allCodesText(rule.service) : rule.codes.join(", "));
const codesReviewText = (rule) => (rule.codes === "all"
    ? interpolate(translation(isPartnerService(rule.service) ? "key_pl_codes_review_partner" : "key_pl_codes_review_local"), allCodesText(rule.service))
    : rule.codes.join(", "));

/* ---------------- the catalogue ---------------- */

export const catalogueItems = (data) => (data?.types || []).flatMap((t) => t.items);
export const itemOf = (data, id) => catalogueItems(data).find((i) => i.id === id) || null;
export const typeNameOf = (data, item) => (item ? (data?.types || []).find((t) => t.id === item.type_id)?.name || "" : "");
/** The package's conditionName: "<Item type> · <description>". */
export const ruleName = (data, rule) => {
    const item = itemOf(data, rule.price_list_id);
    return item ? `${typeNameOf(data, item)} · ${item.description}` : "";
};
/** The types the editor offers: those with at least one item that is not classified as a skill (skill items are manual
    Overseas options with no rule of their own, requirements section 24). */
export const editorTypes = (data) => (data?.types || []).filter((t) => t.items.some((i) => i.item_use === "general"));
export const editorItems = (data, typeId) => ((data?.types || []).find((t) => t.id === typeId)?.items || []).filter((i) => i.item_use === "general");

/** The amount a rule applies: the current Fixed items amount, its own amount, or none (null = Missing). */
export const ruleAmount = (data, rule) => {
    if (rule.amount_source === "catalogue") return itemOf(data, rule.price_list_id)?.amount ?? null;
    return rule.amount_source === "fixed" ? rule.fixed_amount : null;
};
const ruleAmountText = (data, rule) => {
    const value = ruleAmount(data, rule);
    if (value == null) return translation("key_pl_missing");
    return rule.amount_source === "catalogue" ? interpolate(translation("key_pl_amount_catalogue_suffix"), formatMoney(value)) : formatMoney(value);
};

/* ---------------- rules ---------------- */

export const savedItemRules = (data) => ({ rules: (data?.rules || []).map((r) => ({ ...r, codes: r.codes === "all" ? "all" : [...r.codes] })) });
export const currentRules = (draft, saved) => draft?.rules || saved.rules;
export const isNewRule = (rule) => typeof rule.id === "string";
export const nextRuleId = (rules) => `new-${rules.filter(isNewRule).length + 1}`;

const ruleCodes = (rule, data) => (rule.codes === "all" ? codesFor(rule.service, data) : rule.codes);

/** Requirements section 15 (the server's domain/priceList/catalogue.ts overlaps): pairs of rules for the same item and
    service that share a code, with the shared codes in the first rule's order. */
export const overlaps = (rules, data) => {
    const out = [];
    for (let i = 0; i < rules.length; i += 1) {
        for (let j = i + 1; j < rules.length; j += 1) {
            const a = rules[i];
            const b = rules[j];
            if (a.price_list_id !== b.price_list_id || a.service !== b.service) continue;
            const theirs = new Set(ruleCodes(b, data));
            const shared = a.codes === "all" && b.codes === "all" && !theirs.size ? [allCodesText(a.service)] : ruleCodes(a, data).filter((c) => theirs.has(c));
            if (shared.length) out.push({ a, b, codes: shared });
        }
    }
    return out;
};

const sameCodes = (a, b) => (a === "all" || b === "all" ? a === b : a.length === b.length && [...a].sort().join(",") === [...b].sort().join(","));
export const sameRule = (a, b) => a.price_list_id === b.price_list_id && a.service === b.service && sameCodes(a.codes, b.codes)
    && a.treatment === b.treatment && a.amount_source === b.amount_source && (a.fixed_amount ?? null) === (b.fixed_amount ?? null);

/** The package's conditionChanges: new, edited and removed rules. */
export const ruleChanges = (draft, saved) => {
    if (!draft?.rules) return [];
    const out = [];
    draft.rules.forEach((rule) => {
        const old = saved.rules.find((r) => r.id === rule.id);
        if (!old) out.push({ kind: "new", key: `new|${rule.id}`, rule });
        else if (!sameRule(old, rule)) out.push({ kind: "edit", key: `edit|${rule.id}`, rule, old });
    });
    saved.rules.forEach((old) => {
        if (!draft.rules.some((r) => r.id === old.id)) out.push({ kind: "removed", key: `removed|${old.id}`, old });
    });
    return out;
};

/** The body of POST /price-list/items-by-service: each rule added (id null) or changed, and the saved rules removed. */
export const buildItemsByServicePayload = (data, draft, saved) => {
    const changes = ruleChanges(draft, saved);
    return {
        base_version: data?.version ?? null,
        rules: changes.filter((c) => c.kind !== "removed").map(({ rule }) => ({
            id: isNewRule(rule) ? null : rule.id,
            price_list_id: rule.price_list_id,
            service: rule.service,
            codes: rule.codes === "all" ? "all" : [...rule.codes],
            treatment: rule.treatment,
            amount_source: rule.amount_source,
            fixed_amount: rule.amount_source === "fixed" ? rule.fixed_amount : null,
        })),
        removed: changes.filter((c) => c.kind === "removed").map((c) => c.old.id),
    };
};

/** One rule in a line: "Local · All Local code groups · Automatic, required · HK$500 (Fixed items amount)". */
const ruleSummary = (data, rule, forReview) => [serviceName(rule.service), forReview ? codesReviewText(rule) : codesText(rule), treatName(rule.treatment), ruleAmountText(data, rule)].join(" · ");

/** The package's review: "New: …" and "Removed: …" with the rule in one line; an edited rule with each changed field. */
export const reviewRows = (changes, data) => changes.flatMap((c) => {
    if (c.kind === "new") return [{ key: c.key, label: interpolate(translation("key_pl_review_new_item"), ruleName(data, c.rule)), text: true, before: null, after: ruleSummary(data, c.rule, true) }];
    if (c.kind === "removed") return [{ key: c.key, label: interpolate(translation("key_pl_review_removed_item"), ruleName(data, c.old)), text: true, before: null, after: ruleSummary(data, c.old, false) }];
    const field = (key, label, before, after) => (before === after ? [] : [{ key: `${c.key}|${key}`, label, text: true, before, after }]);
    return [
        { key: c.key, label: [ruleName(data, c.old), serviceName(c.old.service), codesText(c.old)].join(" · "), text: true, before: null, after: "" },
        ...field("item", translation("key_pl_item"), ruleName(data, c.old), ruleName(data, c.rule)),
        ...field("service", translation("key_pl_service"), serviceName(c.old.service), serviceName(c.rule.service)),
        ...field("codes", translation("key_pl_applies_to"), codesText(c.old), codesText(c.old) === codesText(c.rule) ? codesText(c.old) : codesReviewText(c.rule)),
        ...field("treatment", translation("key_pl_how_added"), treatName(c.old.treatment), treatName(c.rule.treatment)),
        ...field("amount", translation("key_amount"), ruleAmountText(data, c.old), ruleAmountText(data, c.rule)),
    ];
});

/** What saving means for invoices (the package's review effects for Items by service). */
export const reviewEffects = (changes, data) => {
    const kept = changes.filter((c) => c.kind !== "removed");
    const effects = [];
    if (kept.some((c) => c.rule.treatment !== "manual")) effects.push({ key: "auto", text: translation("key_pl_effect_auto_items") });
    if (kept.some((c) => c.rule.treatment === "manual")) effects.push({ key: "manual", text: translation("key_pl_effect_manual_items") });
    if (changes.some((c) => c.kind === "removed")) effects.push({ key: "removed", text: translation("key_pl_effect_removed_items") });
    kept.filter((c) => ruleAmount(data, c.rule) == null).forEach((c) => effects.push({
        key: `missing|${c.key}`, warn: true, text: interpolate(translation("key_pl_effect_no_amount"), ruleName(data, c.rule), missingEffect(c.rule.treatment)),
    }));
    return effects;
};

/** The engine's wording for shared codes: the first three, then "and others". */
const sharedCodesText = (codes) => (codes.length > 3 ? interpolate(translation("key_pl_and_others"), codes.slice(0, 3).join(", ")) : codes.join(", "));

/** The description of a rule's item that is no longer in Fixed items, as the server named it on load (OP-27-39); "" when
    the item is in the catalogue or its row is gone. */
export const retiredDescription = (data, rule) => (data?.issues || []).find((i) => i.kind === "item" && i.rule_id === rule.id)?.description || "";

/** What the server found wrong with the saved rules (validated on load), in the package engine's wording; a rule whose
    item is retired is named (OP-27-39, not the package's copy: its saved configuration would be unreadable). */
export const issueTexts = (data) => (data?.issues || []).map((issue, at) => {
    const rule = (id) => (data.rules || []).find((r) => r.id === id) || { price_list_id: null, service: "" };
    if (issue.kind === "item" && issue.description) {
        return { key: `${at}`, text: interpolate(translation("key_pl_issue_item_retired"), issue.description, serviceName(rule(issue.rule_id).service)) };
    }
    if (issue.kind === "overlap") {
        const first = rule(issue.rule_ids[0]);
        return { key: `${at}`, text: interpolate(translation("key_pl_issue_overlap"), ruleName(data, first), sharedCodesText(issue.codes), serviceName(first.service)) };
    }
    if (issue.kind === "codes") {
        const r = rule(issue.rule_id);
        return { key: `${at}`, text: interpolate(translation("key_pl_issue_codes"), ruleName(data, r), serviceName(r.service)) };
    }
    return { key: `${at}`, text: translation(issue.kind === "skill" ? "key_pl_issue_skill" : "key_pl_issue_item") };
});
