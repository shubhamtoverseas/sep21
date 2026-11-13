import routesConfig from "../Views/Pages/routes/routesConfig/index";

/* The kit select skin (components/ui/select-kit.css) applies by route: every module except Invoice, Insurance and
   Chat, which belong to another team (user ruling, 3 Nov 2026). The scope is written on <body> so portalled
   dialogs (Follow Up editor, drawers) are covered too. */
export const SELECT_SCOPE = Object.freeze({ KIT: "kit", LEGACY: "legacy" });
export const SELECT_SCOPE_ATTR = "mcSelect";   /* body.dataset key → data-mc-select */

const withSlash = (path) => (String(path || "").startsWith("/") ? String(path) : `/${ path }`);
const firstSegment = (path) => withSlash(path).split("/").filter(Boolean)[0] || "";

/* route prefixes of the excluded modules, read from the route config so a renamed route follows */
export const SELECT_LEGACY_PREFIXES = Object.freeze(Array.from(new Set([
    routesConfig.invoices, routesConfig.invoiceRecord, routesConfig.addContractInvoice,
    routesConfig.insurance, routesConfig.insuranceDetails,
    routesConfig.chat, routesConfig.altchat, routesConfig.conversaction,
].filter(Boolean).map(firstSegment).filter(Boolean))));

export const selectScopeFor = (pathname) => (
    SELECT_LEGACY_PREFIXES.includes(firstSegment(pathname)) ? SELECT_SCOPE.LEGACY : SELECT_SCOPE.KIT
);
