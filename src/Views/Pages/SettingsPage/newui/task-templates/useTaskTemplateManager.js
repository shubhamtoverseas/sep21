import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCalendarTaskTemplatesAPI, retireCalendarTaskTemplateAPI, saveCalendarTaskTemplateAPI } from "../../../../../services/calendar";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { SORT_ORDER, TASK_TEMPLATE_COPY, TASK_TEMPLATE_HTTP, TASK_TEMPLATE_SORT_KEYS, TASK_TEMPLATE_STATUS } from "../settingsNewUiConstants";

/*
 * Task Template Manager data (HRMS API spec A8 / A9 / A10; conflict sheet U-0011 / U-0012): the whole agency catalogue
 * including retired rows, sorted on the client (it is a short list), Add / Edit through save (a new version), and the
 * Active / Retired toggle through retire. Every write re-reads the list.
 */
const toRow = (row) => ({
    id: row?.id,
    code: row?.code || "",
    version: row?.version ?? null,
    title_en: row?.title_en || "",
    title_zh: row?.title_zh || "",
    /* S-1: the notes RIDE with the row — dropping them opened every Edit empty and the save then
       erased stored notes (incl. ones written by the Calendar task editor) with nulls */
    notes_en: row?.notes_en || "",
    notes_zh: row?.notes_zh || "",
    status: row?.status === TASK_TEMPLATE_STATUS.RETIRED ? TASK_TEMPLATE_STATUS.RETIRED : TASK_TEMPLATE_STATUS.ACTIVE,
    is_standard: Boolean(row?.is_standard),
});

const compare = (a, b, key) => String(a?.[key] || "").localeCompare(String(b?.[key] || ""), undefined, { sensitivity: "base" });
/* the duplicate check is normalised across every stored language variant of every preset, active or retired (CR "Calendar and Follow Up") */
const norm = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
const findDuplicate = (rows, { title_en, title_zh }, exceptId) => {
    const wanted = [norm(title_en), norm(title_zh)].filter(Boolean);
    return rows.find((row) => String(row.id) !== String(exceptId ?? "") && [norm(row.title_en), norm(row.title_zh)].some((own) => own && wanted.includes(own))) || null;
};

/* a server refusal → the text the form shows (403 = missing permission, else the server's message) */
const failureMessage = (err) => {
    const status = err?.response?.status;
    if (status === TASK_TEMPLATE_HTTP.FORBIDDEN) return TASK_TEMPLATE_COPY.noPermission;
    return err?.response?.data?.message || TASK_TEMPLATE_COPY.saveFailed;
};

/*
 * The one library save (U-0260: the task editor opens this same manager flow, never a second library): a title another
 * preset already carries, in either language, is refused before the request; the titles save as a new version (notes
 * U-0261; HRMS ask #7); the Active / Retired toggle follows when it changed. Resolves after the success toast; rejects
 * with the message the form shows.
 */
export const saveTaskTemplateFlow = (editing, rows, { title_en, title_zh, notes_en, notes_zh, retired }) => {
    const isEdit = editing?.id != null;
    if (findDuplicate(rows, { title_en, title_zh }, isEdit ? editing.id : null)) return Promise.reject(new Error(TASK_TEMPLATE_COPY.duplicate));
    const payload = { ...(isEdit ? { id: editing.id } : {}), title_en: (title_en || "").trim() || null, title_zh: (title_zh || "").trim() || null, notes_en: (notes_en || "").trim() || null, notes_zh: (notes_zh || "").trim() || null };
    return saveCalendarTaskTemplateAPI(payload)
        .then((res) => {
            if (res?.data?.status === false) throw Object.assign(new Error(res?.data?.message), { response: { data: res?.data } });
            const savedId = res?.data?.data?.id ?? editing?.id;
            const wasRetired = editing?.status === TASK_TEMPLATE_STATUS.RETIRED;
            if (isEdit && savedId != null && Boolean(retired) !== wasRetired) return retireCalendarTaskTemplateAPI({ id: savedId, retired: Boolean(retired) });
            return null;
        })
        .then(() => { ShowToast("success", isEdit ? TASK_TEMPLATE_COPY.updated : TASK_TEMPLATE_COPY.created); })
        .catch((err) => { throw new Error(failureMessage(err)); });
};

const useTaskTemplateManager = () => {
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [sort, setSort] = useState({ by: TASK_TEMPLATE_SORT_KEYS.TITLE_EN, order: SORT_ORDER.ASC });
    const [editing, setEditing] = useState(null);      /* null = closed · {} = new · row = edit */
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const requestSeq = useRef(0);

    const load = useCallback(() => {
        const seq = ++requestSeq.current;
        setIsLoading(true);
        setError(null);
        getCalendarTaskTemplatesAPI({ include_retired: 1 })
            .then((res) => {
                if (seq !== requestSeq.current) return;
                const list = res?.data?.data;
                setRows(Array.isArray(list) ? list.map(toRow).filter((row) => row.id != null) : []);
                setLastUpdated(new Date().toISOString());
            })
            .catch((err) => {
                /* any failure is an error with Retry (CR "connection failure uses retry, not false access denial") */
                if (seq !== requestSeq.current) return;
                setError(err?.response?.data?.message || true);
            })
            .finally(() => { if (seq === requestSeq.current) setIsLoading(false); });
    }, []);
    useEffect(() => { load(); }, [load]);

    const setSortKey = useCallback((key) => {
        setSort((prev) => ({ by: key, order: prev.by === key && prev.order === SORT_ORDER.ASC ? SORT_ORDER.DESC : SORT_ORDER.ASC }));
    }, []);
    const sortedRows = useMemo(() => {
        const sorted = [...rows].sort((a, b) => compare(a, b, sort.by));
        return sort.order === SORT_ORDER.DESC ? sorted.reverse() : sorted;
    }, [rows, sort]);
    const pageInfo = useMemo(() => ({ from: rows.length ? 1 : 0, to: rows.length, total: rows.length, currentPage: 1, lastPage: 1, limit: rows.length || 10 }), [rows.length]);

    const openNew = useCallback(() => { setFormError(""); setEditing({}); }, []);
    const openEdit = useCallback((row) => { setFormError(""); setEditing(row); }, []);
    const closeForm = useCallback(() => { if (!isSaving) { setEditing(null); setFormError(""); } }, [isSaving]);

    /* the shared flow above; the list is re-read after a success */
    const save = useCallback((values) => {
        if (!editing) return;
        setIsSaving(true);
        setFormError("");
        saveTaskTemplateFlow(editing, rows, values)
            .then(() => { setEditing(null); load(); })
            .catch((err) => setFormError(err?.message || TASK_TEMPLATE_COPY.saveFailed))
            .finally(() => setIsSaving(false));
    }, [editing, load, rows]);

    return { rows: sortedRows, isLoading, error, lastUpdated, sort, setSortKey, pageInfo, refresh: load, editing, openNew, openEdit, closeForm, save, isSaving, formError };
};

export default useTaskTemplateManager;
