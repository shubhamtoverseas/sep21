import { useCallback, useEffect, useState } from "react";
import { priceContractInvoiceAPI } from "../../../../services/invoices";

/*
 * Contract Invoice creation · the pricing engine's answer for the current input (27 Oct package, INV-C1 endpoint
 * POST /invoices/price). The screens never price: every change sends the full input and shows what comes back.
 * idle (nothing to price yet), loading (the last answer is kept while the next one is read), ready or error.
 * A refusal the server words (4xx) keeps its message; anything else has none, so the screen shows its own copy.
 * `retry` asks again for the same input (OP-27-42: the error note's Retry); `retry({ fresh: true })` once past the snapshot
 * cache, after a submission was refused because prices changed (QA-27 ruling 9).
 * `current` is true only while the answer shown is the one for this input (in the render where the input changes, the
 * last answer still reads "ready"): what depends on the answer for these exact choices waits for it.
 */
const useContractPricing = (input) => {
    const key = input ? JSON.stringify(input) : "";
    const [attempt, setAttempt] = useState({ n: 0, fresh: false });
    const [state, setState] = useState({ status: "idle", result: null, error: "", key: "" });
    useEffect(() => {
        if (!key) {
            setState({ status: "idle", result: null, error: "", key: "" });
            return undefined;
        }
        let live = true;
        setState((current) => ({ ...current, status: "loading", error: "" }));
        priceContractInvoiceAPI({ ...JSON.parse(key), ...(attempt.fresh ? { fresh_snapshot: true } : {}) })
            .then((res) => {
                if (!live) return;
                const body = res?.data;
                if (!body || body.status === false || !body.data) setState({ status: "error", result: null, error: "", key });
                else setState({ status: "ready", result: body.data, error: "", key });
            })
            .catch((error) => {
                if (!live) return;
                const status = Number(error?.response?.status);
                const refused = status >= 400 && status < 500 ? error?.response?.data?.message || "" : "";
                setState({ status: "error", result: null, error: refused, key });
            });
        return () => { live = false; };
    }, [key, attempt]);
    const retry = useCallback((opts) => setAttempt((a) => ({ n: a.n + 1, fresh: opts?.fresh === true })), []);
    const { key: answered, ...shown } = state;
    return { ...shown, current: shown.status === "ready" && answered === key, retry };
};

export default useContractPricing;
