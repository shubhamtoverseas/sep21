import translation from "../../../../../../utils/translation";
import { currentValue, changedKeys, toReviewGroups } from "../shared/priceEntries";

/*
 * Price List · Local (27 Oct package): grid A1 (Local Finished / Local Terminated / Local Terminated (TR) x nationality x
 * Standard / Driver) and the one Local replacement percentage (PL-S1); grid A2 (Local Transfer / Renewal x nationality x
 * Standard / Driver, PL-S2). The page is edited, reviewed and saved as one. The entry rules shared by every Price List
 * page are in ../shared/priceEntries.js.
 */

export const FEE_KINDS = Object.freeze({ STANDARD: "standard_fee", DRIVER: "driver_fee" });
export const PERCENT_KEY = "local|repl";
export const cellKey = (categoryId, nationalityId, kind) => `${categoryId}|${nationalityId}|${kind}`;

/* Grid A2 rows in order; ids as the server sends them (maidmatch-contract price.list.services.ts LOCAL_SERVICES). */
export const LOCAL_SERVICES = Object.freeze([
    { id: "local_transfer", labelKey: "key_local_transfer" },
    { id: "renewal", labelKey: "key_renewal" },
]);
const SERVICE_PREFIX = "svc";
export const serviceKey = (service, nationalityId, kind) => `${SERVICE_PREFIX}|${service}|${nationalityId}|${kind}`;
export const isServiceKey = (key) => key.startsWith(`${SERVICE_PREFIX}|`);
export const serviceName = (service) => {
    const known = LOCAL_SERVICES.find((s) => s.id === service);
    return known ? translation(known.labelKey) : service;
};

/** Saved values by key, from the server's Local schedule, in screen order. */
export const savedValues = (data) => {
    const values = { [PERCENT_KEY]: data?.local_replacement_percent ?? null };
    (data?.cells || []).forEach((cell) => {
        values[cellKey(cell.contract_category_id, cell.nationality_id, FEE_KINDS.STANDARD)] = cell.standard_fee ?? null;
        values[cellKey(cell.contract_category_id, cell.nationality_id, FEE_KINDS.DRIVER)] = cell.driver_fee ?? null;
    });
    (data?.service_cells || []).forEach((cell) => {
        values[serviceKey(cell.service, cell.nationality_id, FEE_KINDS.STANDARD)] = cell.standard_fee ?? null;
        values[serviceKey(cell.service, cell.nationality_id, FEE_KINDS.DRIVER)] = cell.driver_fee ?? null;
    });
    return values;
};

/**
 * The body of POST /price-list/local: changed cells of each grid with both of their fees, and the percentage when it
 * changed. Unchanged cells are not sent.
 */
export const buildSavePayload = (data, draft, saved) => {
    const changed = new Set(changedKeys(draft, saved));
    const body = { base_version: data?.version ?? null, cells: [], service_cells: [] };
    if (changed.has(PERCENT_KEY)) body.local_replacement_percent = currentValue(PERCENT_KEY, draft, saved);
    const fees = (std, drv) => ({ standard_fee: currentValue(std, draft, saved), driver_fee: currentValue(drv, draft, saved) });
    (data?.cells || []).forEach((cell) => {
        const std = cellKey(cell.contract_category_id, cell.nationality_id, FEE_KINDS.STANDARD);
        const drv = cellKey(cell.contract_category_id, cell.nationality_id, FEE_KINDS.DRIVER);
        if (!changed.has(std) && !changed.has(drv)) return;
        body.cells.push({ contract_category_id: cell.contract_category_id, nationality_id: cell.nationality_id, ...fees(std, drv) });
    });
    (data?.service_cells || []).forEach((cell) => {
        const std = serviceKey(cell.service, cell.nationality_id, FEE_KINDS.STANDARD);
        const drv = serviceKey(cell.service, cell.nationality_id, FEE_KINDS.DRIVER);
        if (!changed.has(std) && !changed.has(drv)) return;
        body.service_cells.push({ service: cell.service, nationality_id: cell.nationality_id, ...fees(std, drv) });
    });
    return body;
};

const nameOf = (list, id) => (list || []).find((x) => x.id === id)?.name || "";

/** "Filipino · Local Finished · Standard" / "Filipino · Local Transfer · Standard" — the package's label for one Local price. */
export const entryLabel = (data, key) => {
    if (key === PERCENT_KEY) return translation("key_pl_local_replacement_discount");
    const service = isServiceKey(key);
    const [rowId, nationalityId, kind] = service ? key.split("|").slice(1) : key.split("|");
    const kindText = kind === FEE_KINDS.DRIVER ? translation("key_pl_driver") : translation("key_pl_standard");
    const rowName = service ? serviceName(rowId) : nameOf(data?.categories, Number(rowId));
    return `${nameOf(data?.nationalities, Number(nationalityId))} · ${rowName} · ${kindText}`;
};

/**
 * Review groups in screen order: Replacement discount, Base fees · Standard, Base fees · Driver,
 * Local Transfer and Renewal · Standard, Local Transfer and Renewal · Driver.
 */
export const reviewGroups = (data, draft, saved) => {
    const keys = Object.keys(savedValues(data));
    const of = (service, kind) => keys.filter((k) => k !== PERCENT_KEY && isServiceKey(k) === service && k.endsWith(`|${kind}`));
    return toReviewGroups([
        { title: translation("key_pl_replacement_discount"), keys: [PERCENT_KEY] },
        { title: translation("key_pl_base_fees_standard"), keys: of(false, FEE_KINDS.STANDARD) },
        { title: translation("key_pl_base_fees_driver"), keys: of(false, FEE_KINDS.DRIVER) },
        { title: translation("key_pl_local_services_standard"), keys: of(true, FEE_KINDS.STANDARD) },
        { title: translation("key_pl_local_services_driver"), keys: of(true, FEE_KINDS.DRIVER) },
    ], (key) => entryLabel(data, key), draft, saved);
};
