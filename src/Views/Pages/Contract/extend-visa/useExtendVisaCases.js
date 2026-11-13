import { useCallback, useEffect, useState } from "react";
import { getExtendVisaCasesAPI } from "../../../../services/processings";
import { xvCall } from "./extendVisaUtils";

/**
 * The parent record's Extend Visa case register (GET extend-visa/cases/:contract_id): `{ contract_status, can_start,
 * open_case, latest_terminal, total, cases[] }` — the complete ordered history (EXTEND.md §15.2). `enabled` false
 * (a Processing or closed parent that never had a case) skips the call.
 */
const useExtendVisaCases = (contractId, enabled = true) => {
    const [state, setState] = useState({ loading: Boolean(enabled), data: null, error: "" });
    const load = useCallback(async () => {
        if (!enabled || !contractId) { setState({ loading: false, data: null, error: "" }); return; }
        setState((s) => ({ ...s, loading: true }));
        const res = await xvCall(getExtendVisaCasesAPI(contractId));
        setState({ loading: false, data: res.ok ? res.data : null, error: res.ok ? "" : res.message });
    }, [contractId, enabled]);
    useEffect(() => { load(); }, [load]);
    const data = state.data || {};
    return {
        loading: state.loading, error: state.error, reload: load,
        cases: Array.isArray(data.cases) ? data.cases : [],
        openCase: data.open_case || null,
        latestTerminal: data.latest_terminal || null,
        canStart: Boolean(data.can_start),
        total: Number(data.total) || (Array.isArray(data.cases) ? data.cases.length : 0),
    };
};

export default useExtendVisaCases;
