import translation from "../../../../../utils/translation";
import { interpolate } from "../../../../../i18n/interpolate";
import { PRICE_LIST_PAGE } from "../settingsNewUiConstants";
import { savedValues } from "./local/localPricingConfig";
import { savedDirectHire } from "./direct-hire/directHirePricingConfig";
import { itemOf, ruleAmount } from "./items-by-service/itemsByServiceConfig";

/*
 * Price List · the section nav (27 Oct package, PL-UI1; the reference page's .modnav). The pages in the package's order,
 * a separator before Fixed items, and what each needs, from its saved values: "3 missing" (Local, Direct Hire, Items by
 * service) or "4 incomplete" (Overseas: nationality bases, agency schedules and the replacement %; Items by service while
 * a rule's item is no longer in Fixed items, OP-27-39). A page with unsaved
 * changes shows a dot instead. Worker promotions are a separate module, listed as before and not changed (OP-27-32).
 */

/* who may open each page: the keys each page's server reads check (admins open every page) */
const conditional = (p) => p?.canViewConditionalItemPrice;
export const PRICE_LIST_PAGES = Object.freeze([
    { id: PRICE_LIST_PAGE.LOCAL, labelKey: "key_local", allowed: (p) => p?.canViewConditionalLocalItemPrice || p?.canViewConditionalItemPrice },
    { id: PRICE_LIST_PAGE.OVERSEAS, labelKey: "key_overseas", allowed: conditional },
    { id: PRICE_LIST_PAGE.DIRECT_HIRE, labelKey: "key_direct_hire", allowed: conditional },
    { id: PRICE_LIST_PAGE.ITEMS_BY_SERVICE, labelKey: "key_pl_items_by_service", allowed: (p) => p?.canViewFixedItemPrice },
    { id: PRICE_LIST_PAGE.SKILLS, labelKey: "key_skills", allowed: conditional },
    { id: PRICE_LIST_PAGE.COUNTRIES, labelKey: "key_pl_pricing_countries", allowed: conditional },
    { id: PRICE_LIST_PAGE.FIXED_ITEMS, labelKey: "key_pl_fixed_items_link", allowed: (p) => p?.canViewFixedItemPrice, separatorBefore: true },
    { id: PRICE_LIST_PAGE.PROMOTIONS, labelKey: "key_promotions", allowed: (p) => p?.canViewPromotion },
    { id: PRICE_LIST_PAGE.WORKER_PROMOTIONS, labelKey: "key_pl_worker_promotions", allowed: (p) => p?.canViewWorkerPromotion },
]);

export const permittedPages = (permissions, isAdmin) => PRICE_LIST_PAGES.filter((page) => isAdmin || Boolean(page.allowed(permissions)));
export const pageName = (pageId) => {
    const page = PRICE_LIST_PAGES.find((p) => p.id === pageId);
    return page ? translation(page.labelKey) : "";
};

const nulls = (values) => Object.values(values).filter((v) => v == null).length;
const missingText = (n) => (n ? interpolate(translation("key_pl_missing_count"), n) : "");

/* the store slice each counted page reads */
export const NAV_DATA = Object.freeze({
    [PRICE_LIST_PAGE.LOCAL]: "localPricing",
    [PRICE_LIST_PAGE.OVERSEAS]: "overseasPricing",
    [PRICE_LIST_PAGE.DIRECT_HIRE]: "directHirePricing",
    [PRICE_LIST_PAGE.ITEMS_BY_SERVICE]: "itemsByService",
});

/** What a page needs, from its saved values; "" when nothing is missing or the page is not loaded. */
export const navMeta = (pageId, data) => {
    if (!data) return "";
    switch (pageId) {
    case PRICE_LIST_PAGE.LOCAL:
        return missingText(nulls(savedValues(data)));
    case PRICE_LIST_PAGE.DIRECT_HIRE:
        return missingText(nulls(savedDirectHire(data)));
    case PRICE_LIST_PAGE.ITEMS_BY_SERVICE: {
        // OP-27-39: a rule whose item is no longer in Fixed items makes the page incomplete; it is counted with the
        // missing amounts, each rule once ("N missing" otherwise, as the package names it)
        const rules = data.rules || [];
        const retired = rules.filter((rule) => !itemOf(data, rule.price_list_id)).length;
        const n = rules.filter((rule) => !itemOf(data, rule.price_list_id) || ruleAmount(data, rule) == null).length;
        return retired ? interpolate(translation("key_pl_incomplete_count"), n) : missingText(n);
    }
    case PRICE_LIST_PAGE.OVERSEAS: {
        const n = (data.nationalities || []).filter((x) => x.fee == null).length
            + (data.agencies || []).filter((a) => Number(a.missing) > 0).length
            + (data.overseas_replacement_percent == null ? 1 : 0);
        return n ? interpolate(translation("key_pl_incomplete_count"), n) : "";
    }
    default:
        return "";
    }
};
