import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import translation from "../../../../utils/translation";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { fetchWorkerNationalities, getEmployerNationalityList } from "../../../../redux/Slices/common/nationalities/NationalitiesSlice";
import { fetchMaritalStatus } from "../../../../redux/Slices/common/CommonSlice";
import {
    fetchLastPullDetailsAPI, fetchProfileDetailsAPI, getMasterFormDetailsAPI, updateID407FormDataAPI, updateID988aFormDataAPI, updateID988bFormDataAPI, updateMasterFormAPI,
} from "../../../../services/processings";
import { CR_FORM } from "../contractConstants";
import { EMPTY_MODEL, modelFromServer, masterPayload, PAYLOAD_BY_FORM } from "./formsModel";
import { apiErrorMessage as apiError } from "../details/contractRecordUtils";

const SAVE_BY_FORM = { [CR_FORM.ID407]: updateID407FormDataAPI, [CR_FORM.ID988A]: updateID988aFormDataAPI, [CR_FORM.ID988B]: updateID988bFormDataAPI };
const toOptions = (list) => (Array.isArray(list) ? list.map((o) => ({ value: String(o.id ?? o.value), label: o.name ?? o.label ?? "" })) : []);

/**
 * The Forms tab state (PROCESS §4 / §11.4): one model loaded once from GET get-master-details and shared by the four
 * surfaces; Save posts master-update and, on an official form, that form's own endpoint too (the legacy endpoints each
 * own a few columns); Cancel restores the saved snapshot; Pull latest replaces the draft with the profile data until
 * saved. Lookups (nationalities, marital status) come from the shared slices.
 */
const useContractForms = (contractId) => {
    const dispatch = useDispatch();
    const workerNationalities = useSelector((s) => s.nationalities?.workerNationalities);
    const employerNationalities = useSelector((s) => s.nationalities?.employerNationalities);
    const maritalStatus = useSelector((s) => s.common?.maritalStatus);
    const [snapshot, setSnapshot] = useState(null);     /* the last saved model */
    const [model, setModel] = useState(EMPTY_MODEL);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);    /* { created_at, created_by_name } */
    const [lastPulled, setLastPulled] = useState(null);
    const [pulled, setPulled] = useState(false);         /* a Pull latest is in the draft, unsaved */
    const inFlight = useRef(false);

    const load = useCallback(async () => {
        try {
            const res = await getMasterFormDetailsAPI(contractId);
            const data = res?.data?.data;
            if (!res?.data?.status || !data) { setLoadError(res?.data?.message || translation("key_something_went_wrong")); return; }
            const next = modelFromServer(data);
            setSnapshot(next); setModel(next); setPulled(false); setLoadError("");
            setLastSaved(data.last_saved_at && typeof data.last_saved_at === "object" && data.last_saved_at.created_at ? data.last_saved_at : null);
        } catch (e) { setLoadError(apiError(e)); }
        finally { setLoading(false); }
    }, [contractId]);
    const loadPull = useCallback(async () => {
        try { const res = await fetchLastPullDetailsAPI(contractId); const d = res?.data?.data; setLastPulled(d?.created_at ? d : null); } catch { setLastPulled(null); }
    }, [contractId]);

    useEffect(() => {
        setLoading(true); load(); loadPull();
        dispatch(fetchWorkerNationalities({ type: "worker" })); dispatch(getEmployerNationalityList({ type: "employer" })); dispatch(fetchMaritalStatus({ type: "worker" }));
    }, [load, loadPull, dispatch]);

    const set = useCallback((key, value) => setModel((m) => (m[key] === value ? m : { ...m, [key]: value })), []);
    const dirty = useMemo(() => snapshot !== null && (pulled || Object.keys(model).some((k) => JSON.stringify(model[k]) !== JSON.stringify(snapshot[k]))), [model, snapshot, pulled]);

    const cancel = useCallback(() => { if (snapshot) { setModel(snapshot); setPulled(false); } }, [snapshot]);

    const save = useCallback(async (form) => {
        if (inFlight.current) return false;
        inFlight.current = true; setSaving(true);
        try {
            const master = await updateMasterFormAPI(masterPayload(model, contractId));
            if (!master?.data?.status) { ShowToast("error", master?.data?.message || translation("key_something_went_wrong")); return false; }
            const saveForm = SAVE_BY_FORM[form];
            if (saveForm) {
                const res = await saveForm(PAYLOAD_BY_FORM[form](model, contractId));
                if (!res?.data?.status) { ShowToast("error", res?.data?.message || translation("key_something_went_wrong")); return false; }
            }
            ShowToast("success", master.data.message || translation("key_success"));
            await load();
            return true;
        } catch (e) { ShowToast("error", apiError(e)); return false; }
        finally { inFlight.current = false; setSaving(false); }
    }, [model, contractId, load]);

    /* PROCESS §11.4 Pull latest data from profile: the profile facts replace the draft; nothing is stored until Save */
    const pullLatest = useCallback(async () => {
        if (inFlight.current) return;
        inFlight.current = true; setSaving(true);
        try {
            const res = await fetchProfileDetailsAPI(contractId);
            const data = res?.data?.data;
            if (!res?.data?.status || !data) { ShowToast("error", res?.data?.message || translation("key_something_went_wrong")); return; }
            setModel(modelFromServer(data)); setPulled(true);
            ShowToast("success", translation("key_fx_pulled_from_profile"));
            loadPull();
        } catch (e) { ShowToast("error", apiError(e)); }
        finally { inFlight.current = false; setSaving(false); }
    }, [contractId, loadPull]);

    const lookups = useMemo(() => ({
        workerNationality: toOptions(workerNationalities), employerNationality: toOptions(employerNationalities), maritalStatus: toOptions(maritalStatus),
    }), [workerNationalities, employerNationalities, maritalStatus]);

    return { model, set, snapshot, loading, loadError, saving, dirty, lastSaved, lastPulled, pulled, save, cancel, pullLatest, reload: load, lookups };
};

export default useContractForms;
