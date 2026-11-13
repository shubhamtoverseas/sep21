/*
 * Contract Invoice · Contract setup (27 Oct package, INV-C2; requirements "Setup and context", reference page "Contract
 * setup"). The application's choices, the route they make and the pricing engine's input. The screen never prices: it
 * sends the worker and these choices to POST /invoices/price (INV-C1) on every change and shows what comes back.
 *
 * The choices (stored with the invoice's local info, so they survive Back):
 *   local_transfer  "yes" | "no"   Local workers whose profile category is a Local category
 *   direct_hire     "yes" | "no"   Overseas workers
 *   contract_category  contract_categories.id | ""   Local workers whose profile holds Local Transfer or Renewal (OP-27-40)
 *   contract_type_internal  "new" | "replacement"   ordinary Local and ordinary Overseas only
 *   process_as_driver  "yes" | "no" | ""   every Local route; no default, never taken from the profile (R-B2)
 *
 * The same stages create a Standalone Invoice (mode STANDALONE, INV-G2 … G4): one party, no route choices; see the
 * Standalone section below. They also create an Exchange's A2 (mode EXCHANGE, INV-X2 … X4): see the Exchange section.
 */

export const YES = "yes";
export const NO = "no";

/* the worker profile's Contract Category names that are routes, not Local categories (constants
   INVOICE_REPLACEMENT_CATEGORIES) */
const RENEWAL_CATEGORIES = ["Renewal", "Renew"];
const LOCAL_TRANSFER_CATEGORY = "Local Transfer";
const DIRECT_HIRE_CATEGORY = "Direct Hire";

export const isLocalWorker = (worker) => Number(worker?.type) === 1;
export const isRenewal = (worker, categoryName) => isLocalWorker(worker) && RENEWAL_CATEGORIES.includes(categoryName);

/* OP-27-40 (decided 28 Oct 2026, interim select; splitting the profile field is a Worker-module question): Local Transfer
   and Renewal in a Local worker's profile category are route facts. They set the route, shown read-only, and the Local
   pricing category (Finished / Terminated / Terminated (TR)) is then this application's required choice, sent to the
   engine as the pricing-code input and never written to the profile. A profile Local category is used as it is. */
/** Local Transfer = Yes, from the profile (read-only) */
export const isProfileTransfer = (worker, categoryName) => isLocalWorker(worker) && categoryName === LOCAL_TRANSFER_CATEGORY;
/** the Contract category select: a Local worker whose profile category is a route */
export const asksCategory = (worker, categoryName) => isRenewal(worker, categoryName) || isProfileTransfer(worker, categoryName);

/** The choices a worker starts with: the route from the profile category; Contract category and Process as driver unset. */
export const initialChoices = (worker, categoryName) => ({
    local_transfer: isProfileTransfer(worker, categoryName) ? YES : NO,
    direct_hire: !isLocalWorker(worker) && categoryName === DIRECT_HIRE_CATEGORY ? YES : NO,
    contract_category: "",
    process_as_driver: "",
});

/** The pricing route the worker and the choices make (the engine's route ids). */
export const routeOf = (worker, categoryName, choices) => {
    if (!worker) return null;
    if (isLocalWorker(worker)) {
        if (isRenewal(worker, categoryName)) return "renewal";
        if (isProfileTransfer(worker, categoryName)) return "local_transfer";
        return choices?.local_transfer === YES ? "local_transfer" : "local";
    }
    return choices?.direct_hire === YES ? "direct_hire" : "overseas";
};

/** New or Replacement appears only for ordinary Local and Overseas (R-B4). */
export const asksType = (route) => route === "local" || route === "overseas";
/** Process as driver appears on every Local route (R-B2). */
export const asksDriver = (route) => route === "local" || route === "local_transfer" || route === "renewal";

/**
 * Why Continue waits: the Contract category where the application chooses it (OP-27-40), then Process as driver on a
 * Local route (the reference page's setupWhy).
 */
export const setupWhy = (route, choices, categoryAsked = false) => {
    if (categoryAsked && !choices?.contract_category) return "category";
    if (asksDriver(route) && !choices?.process_as_driver) return "driver";
    return "";
};

/**
 * The engine's input for this stage: the worker (its nationality, category and partner code are read on the server) and
 * the employer (a Renewal's predecessor is theirs, OP-27-41), the route, the Contract category where the application
 * chooses it, New / Replacement and Process as driver where the route has them (null otherwise, so the engine never
 * refuses a choice the screen does not offer), the invoice date and branch, and the Contract the creation was opened
 * from when the origin names one. Null until the worker and branch are known.
 */
export const pricingInput = ({ worker, employerId, categoryName, choices, invoiceDate, branchId, originContractId }) => {
    const route = routeOf(worker, categoryName, choices);
    if (!route || !branchId || !invoiceDate) return null;
    const type = asksType(route) && choices?.contract_type_internal
        ? (choices.contract_type_internal === "replacement" ? "rep" : "new")
        : null;
    const driver = asksDriver(route) && choices?.process_as_driver ? choices.process_as_driver === YES : null;
    const category = asksCategory(worker, categoryName) && choices?.contract_category ? Number(choices.contract_category) : null;
    return {
        worker_id: Number(worker.id),
        employer_id: employerId ? Number(employerId) : null,
        route,
        category,
        type,
        driver,
        date: invoiceDate,
        branch: Number(branchId),
        ...(originContractId ? { origin_contract_id: Number(originContractId) } : {}),
    };
};

/* ---------------- Standalone Invoice (INV-G2; register #28; the INV-G1 engine route) ---------------- */

/** The mode the creation stages take for a Standalone Invoice (the /invoices/general/ routes; route segment unchanged, #27). */
export const STANDALONE = "standalone";
/** A Standalone Invoice bills one party, an employer or a worker, never both (#28). */
export const PARTY_TYPES = Object.freeze(["employer", "worker"]);

/**
 * The engine's input for a Standalone Invoice: route "standalone", the one party (null until chosen; the engine then says
 * what is missing), the invoice date and branch. No worker pricing facts and no route choices. Null until the date and
 * branch are known.
 */
export const standaloneInput = ({ partyType, employerId, workerId, invoiceDate, branchId }) => {
    if (!branchId || !invoiceDate) return null;
    const id = partyType === "employer" ? employerId : partyType === "worker" ? workerId : null;
    return { route: STANDALONE, party: id ? { type: partyType, id: Number(id) } : null, date: invoiceDate, branch: Number(branchId) };
};

/* ---------------- Exchange (INV-X2; register #70 – #76; the INV-X1 engine route "exchange") ---------------- */

/** The mode the creation stages take for an Exchange (the /invoices/exchange/ routes; route segments unchanged). */
export const EXCHANGE = "exchange";

/**
 * The replacement's service (the engine's exchange.service_route): the Contract routes the worker and the choices make,
 * except that a Renewal is not an exchange (OP-27-112). @migration-unspecified(invoice): a replacement whose profile holds
 * Renewal is priced as Local (Local Transfer when chosen) with the Contract category chosen here, as OP-27-40 does for any
 * profile that holds a route. Confirm with product before release (OP-27-122).
 */
export const exchangeServiceOf = (worker, categoryName, choices) => {
    if (!worker) return null;
    if (isLocalWorker(worker)) return isProfileTransfer(worker, categoryName) || choices?.local_transfer === YES ? "local_transfer" : "local";
    return choices?.direct_hire === YES ? "direct_hire" : "overseas";
};

/**
 * The engine's input for an Exchange setup: route "exchange", A1 and the replacement's service; the replacement worker once
 * picked (before that the engine still reports A1's Exchange Credit and says what is missing); the Contract category where
 * it is asked; Process as driver on a Local service (no default, never A1's, R-B2); the invoice date and branch. No employer
 * (it is A1's) and no New / Replacement (the exchange is the Replacement, OP-27-106). Null until A1, the date and the branch
 * are known.
 */
export const exchangeInput = ({ a1Id, worker, categoryName, choices, invoiceDate, branchId }) => {
    if (!a1Id || !branchId || !invoiceDate) return null;
    const service = exchangeServiceOf(worker, categoryName, choices);
    return {
        route: EXCHANGE,
        exchange: { invoice_id: Number(a1Id), service_route: service || "" },
        ...(worker ? { worker_id: Number(worker.id) } : {}),
        category: worker && asksCategory(worker, categoryName) && choices?.contract_category ? Number(choices.contract_category) : null,
        driver: service && asksDriver(service) && choices?.process_as_driver ? choices.process_as_driver === YES : null,
        date: invoiceDate,
        branch: Number(branchId),
    };
};

/** An A2's settlement lines (#71, #72): the Exchange Credit and the one balancing line, the engine's and read-only. */
export const SETTLEMENT_KINDS = Object.freeze(["exchange_credit", "balance_adjustment", "underpayment"]);

const thousands = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
/** HK$11,500 · HK$8,969.37 (the engine's money text) */
export const hk = (amount) => {
    const cents = Math.round(Number(amount) * 100);
    const part = Math.abs(cents) % 100;
    return `HK$${thousands(Math.trunc(Math.abs(cents) / 100))}${part ? `.${String(part).padStart(2, "0")}` : ""}`;
};
