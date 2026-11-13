import { useCallback, useEffect, useState } from "react";
import { getCalendarTaskTemplatesAPI } from "../../../../services/calendar";

/*
 * The agency-shared title presets (HRMS API spec A8, GET /hrms/task/templates — active templates only). The client
 * never seeds the catalogue: an empty or failed answer leaves the editor with typed, one-off titles.
 */
const toPreset = (row) => ({
    id: row?.id,
    code: row?.code || '',
    version: row?.version ?? null,
    en: row?.title_en || '',
    zh: row?.title_zh || '',
    notesEn: row?.notes_en || '',
    notesZh: row?.notes_zh || '',
    hasNotes: Boolean(row?.notes_en || row?.notes_zh),
});

const useTaskTemplates = ({ refetchOnFocus = false } = {}) => {
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [nonce, setNonce] = useState(0);
    const refresh = useCallback(() => setNonce((n) => n + 1), []);

    useEffect(() => {
        let live = true;
        getCalendarTaskTemplatesAPI()
            .then((res) => {
                if (!live) return;
                const rows = res?.data?.data;
                setTemplates(Array.isArray(rows) ? rows.map(toPreset).filter((preset) => preset.id != null && (preset.en || preset.zh)) : []);
            })
            .catch(() => { if (live) setTemplates([]); })
            .finally(() => { if (live) setIsLoading(false); });
        return () => { live = false; };
    }, [nonce]);

    /* a host that sends managers to the Settings library in another tab re-reads the presets when the window comes back (the task editor refreshes in place — U-0260) */
    useEffect(() => {
        if (!refetchOnFocus) return undefined;
        window.addEventListener('focus', refresh);
        return () => window.removeEventListener('focus', refresh);
    }, [refetchOnFocus, refresh]);

    return { templates, isLoading, refresh };
};

export default useTaskTemplates;
