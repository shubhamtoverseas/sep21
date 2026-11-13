import { useCallback, useEffect, useState } from "react";
import { loadPaos } from "./paosApi";

/**
 * The contract's PAOS case (CT-06): `info` = { applicable, phase, action, next[], case, history[] } or null while
 * loading / when the request fails. `reload` after a save; `refreshKey` re-reads when the contract's phase changes.
 */
const usePaos = (contractId, refreshKey) => {
    const [info, setInfo] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const reload = useCallback(async () => {
        const result = await loadPaos(contractId);
        setInfo(result.ok ? result.data : null);
        setLoaded(true);
    }, [contractId]);
    useEffect(() => { reload(); }, [reload, refreshKey]);
    return { info, loaded, reload };
};

export default usePaos;
