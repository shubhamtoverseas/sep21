import translation from "../../../../../../utils/translation";
import { changedKeys, currentValue, toReviewGroups } from "../shared/priceEntries";
import { agencyText } from "../overseas/overseasPricingConfig";

/*
 * Price List · Direct Hire (27 Oct package, PL-S3): one fee per partner code — the worker's current partner code selects
 * it; nationality alone never does (R-B5). No New / Replacement, replacement discount or supplements.
 */

export const dhKey = (agencyId) => `dh|${agencyId}`;

export const savedDirectHire = (data) => {
    const values = {};
    (data?.agencies || []).forEach((a) => { values[dhKey(a.id)] = a.fee ?? null; });
    return values;
};

/** The body of POST /price-list/direct-hire: the changed fees. */
export const buildDirectHirePayload = (data, draft, saved) => {
    const changed = new Set(changedKeys(draft, saved));
    return {
        base_version: data?.version ?? null,
        fees: (data?.agencies || []).filter((a) => changed.has(dhKey(a.id))).map((a) => ({ agency_id: a.id, fee: currentValue(dhKey(a.id), draft, saved) })),
    };
};

/** "BGS Manpower Services (BGS)" — the package's label for one Direct Hire fee. */
export const directHireLabel = (data, key) => {
    const agency = (data?.agencies || []).find((a) => dhKey(a.id) === key);
    return agency ? agencyText(agency) : "";
};

export const directHireReviewGroups = (data, draft, saved) => toReviewGroups([
    { title: translation("key_pl_dh_fees"), keys: (data?.agencies || []).map((a) => dhKey(a.id)) },
], (key) => directHireLabel(data, key), draft, saved);
