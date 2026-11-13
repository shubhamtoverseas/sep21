import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getExtendVisaCaseAPI } from "../../../../services/processings";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import translation from "../../../../utils/translation";
import { isNotFound, isStale, xvCall } from "./extendVisaUtils";

/**
 * One Extend Visa case (GET extend-visa/case/:contract_id/:case_uid) and the one way to mutate it. Every mutation goes
 * through `run(apiCall)`: the body already carries the loaded `version` (via `caseRef`) and a fresh idempotency key;
 * on success the whole case is reloaded so marks, `immigration_status`, `gate`, owners and Activity re-render from the
 * server (EXTEND.md §5.4 / §5.8 — nothing is computed client-side); 409 = the case changed → reload + notice;
 * 404 = the non-disclosing refusal → the generic not-found surface; 422 → the caller gets `errors` / `outstanding`.
 */
const useExtendVisaCase = (contractId, caseId) => {
    const [state, setState] = useState({ loading: true, notFound: false, data: null, error: "" });
    const [busy, setBusy] = useState(false);
    const alive = useRef(true);
    useEffect(() => () => { alive.current = false; }, []);

    const load = useCallback(async () => {
        if (!contractId || !caseId) return null;
        const res = await xvCall(getExtendVisaCaseAPI(contractId, caseId));
        if (!alive.current) return null;
        if (res.ok && res.data) { setState({ loading: false, notFound: false, data: res.data, error: "" }); return res.data; }
        setState({ loading: false, notFound: isNotFound(res) || !res.ok, data: null, error: res.message });
        return null;
    }, [contractId, caseId]);
    useEffect(() => { setState((s) => ({ ...s, loading: true })); load(); }, [load]);

    const loadedId = state.data?.extend_visa_case_id; const version = state.data?.version;
    const caseRef = useMemo(() => ({ contract_id: contractId, extend_visa_case_id: loadedId || caseId, ...(version !== undefined ? { version } : {}) }), [contractId, caseId, loadedId, version]);

    /** `apiCall(caseRef)` → `{ ok, data, message, errors, outstanding, stale }`; a success reloads the case. */
    const run = useCallback(async (apiCall, { silent = false } = {}) => {
        setBusy(true);
        const res = await xvCall(apiCall(caseRef));
        if (!alive.current) return { ok: false };
        if (res.ok) {
            if (!silent && res.message) ShowToast("success", res.message);
            await load();
            setBusy(false);
            return { ok: true, data: res.data };
        }
        setBusy(false);
        if (isStale(res)) { ShowToast("error", translation("key_cr_xv_changed_reload")); await load(); return { ok: false, stale: true }; }
        if (isNotFound(res)) { setState({ loading: false, notFound: true, data: null, error: res.message }); return { ok: false, notFound: true }; }
        const errors = res.data?.errors && typeof res.data.errors === "object" ? res.data.errors : null;
        const outstanding = Array.isArray(res.data?.outstanding) ? res.data.outstanding : null;
        if (!silent && !errors) ShowToast("error", res.message);
        return { ok: false, message: res.message, code: res.code, errors, outstanding };
    }, [caseRef, load]);

    return { loading: state.loading, notFound: state.notFound, error: state.error, data: state.data, caseRef, busy, run, reload: load };
};

export default useExtendVisaCase;
