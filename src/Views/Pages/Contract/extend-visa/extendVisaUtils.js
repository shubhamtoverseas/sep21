import routes from "../../routes/routesConfig";
import translation from "../../../../utils/translation";
import { apiErrorMessage } from "../details/contractRecordUtils";
import { CR_XV, CR_XV_LIFECYCLE_LABEL_KEYS } from "../contractConstants";

/** The case route: the opaque `extend_visa_case_id` is the only key (EXTEND.md §2.2); `display_no` never routes. */
export const caseRoute = (contractId, caseId) => routes.extendVisaCase.replace(":contract_id", String(contractId)).replace(":extend_visa_case_id", encodeURIComponent(String(caseId)));

/**
 * One shape for every Extend Visa call: `{ ok, status, code, message, data }`. 409 = stale `version` or an idempotency
 * clash (the caller reloads the case); 404 = the non-disclosing refusal; 422 carries `data.errors` / `data.outstanding`.
 */
export const xvCall = async (request) => {
    try {
        const response = await request;
        const body = response?.data || {};
        return { ok: Boolean(body.status), status: response?.status || 200, code: body.code || null, message: body.message || "", data: body.data };
    } catch (error) {
        const body = error?.response?.data || {};
        return { ok: false, status: error?.response?.status || 0, code: body.code || body.error_code || body.message_code || null, message: apiErrorMessage(error), data: body.data };
    }
};
export const isStale = (res) => res?.status === 409;
export const isNotFound = (res) => res?.status === 404 || res?.code === CR_XV.ERROR.NOT_FOUND;

export const lifecycleLabel = (lifecycle) => translation(CR_XV_LIFECYCLE_LABEL_KEYS[lifecycle] || "key_open");
export const lifecycleTone = (lifecycle) => (lifecycle === CR_XV.LIFECYCLE.COMPLETED ? "green" : lifecycle === CR_XV.LIFECYCLE.CANCELLED ? "red" : "teal");
export const isTerminalCase = (c) => c?.lifecycle === CR_XV.LIFECYCLE.COMPLETED || c?.lifecycle === CR_XV.LIFECYCLE.CANCELLED;
/** the case's own stamp for a list row: completed · cancelled · else created */
export const caseStamp = (c) => c?.completed_at || c?.cancelled_at || c?.created_at || null;
/* U-0307 (EXTEND §2.2 / §16.3): a readable ordinal label — "Case n" from the server's stored `ordinal` (K-7) — never the id and never a code */
export const caseOrdinal = (c) => (c?.ordinal != null && c.ordinal !== "" ? Number(c.ordinal) : null);
export const caseLabel = (c) => { const n = caseOrdinal(c); return n ? `${ translation("key_cr_xv_case") } ${ n }` : translation("key_cr_xv_case"); };
