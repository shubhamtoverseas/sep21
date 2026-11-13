import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchActiveUsers } from "../../../../../redux/Slices/settings/users/UsersSlice";
import { getPrepReadyDefaultsAPI, savePrepReadyDefaultAPI } from "../../../../../services/processings";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import translation from "../../../../../utils/translation";
import { ACTIVE_USERS_QUERY } from "../settingsNewUiConstants";
import { CR_PREP_READY } from "../../../Contract/contractConstants";

const csvGroups = (value) => (Array.isArray(value) ? value.map(Number) : String(value || "").split(",").map((v) => Number(v.trim())).filter(Boolean));
const apiError = (e) => {
    const d = e?.response?.data;
    const fieldErrors = d?.errors && typeof d.errors === "object" ? Object.values(d.errors).flat().join(" ") : "";
    return fieldErrors || d?.message || translation("key_something_went_wrong");
};
/* why a stored default would resolve to Unassigned at record creation (requirements N02) */
export const PRD_STALE = Object.freeze({ INACTIVE: "inactive", NOT_ELIGIBLE: "not_eligible" });

/**
 * Settings → People → Prepared and Ready defaults (client package 22 Oct 2026, requirements N01 / N02): the staff a new
 * Contract in each Group starts with, per register — GET /processing/global/prep-ready-owners/defaults →
 * { defaults[], can_edit, agency_name? }; POST { processing_group, register, staff_id | null } per selector. Each list
 * offers the active internal staff whose Sign-off eligibility (`prepared_groups` / `ready_groups`) names the group —
 * every active internal staff while the list API carries no eligibility. Choosing a default never changes eligibility
 * or existing records; an inactive or no-longer-eligible default stays visible with what it means.
 */
const usePreparedReadyDefaults = () => {
    const dispatch = useDispatch();
    const { activeUsers } = useSelector((state) => state.users);
    const [defaults, setDefaults] = useState(null);
    const [canEdit, setCanEdit] = useState(false);
    const [agencyName, setAgencyName] = useState("");
    const [error, setError] = useState("");
    const [savingKey, setSavingKey] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await getPrepReadyDefaultsAPI();
            const d = res?.data?.data;
            if (!res?.data?.status || !d) { setDefaults([]); setError(res?.data?.message || translation("key_something_went_wrong")); return; }
            setDefaults(Array.isArray(d.defaults) ? d.defaults : []);
            setCanEdit(Boolean(d.can_edit));
            /* backend 307: `agency: { id, name }` is the explicit context of the eight selectors (one host today) */
            setAgencyName(d.agency?.name || d.agency_name || d.agency?.agency_name || "");
            setError("");
        } catch (e) { setDefaults([]); setError(apiError(e)); }
    }, []);
    useEffect(() => { load(); dispatch(fetchActiveUsers(ACTIVE_USERS_QUERY.INTERNAL)); }, [load, dispatch]);

    const cellOf = useCallback((group, register) => (defaults || []).find((d) => Number(d.processing_group) === group && d.register === register) || null, [defaults]);
    const optionsFor = useCallback((group, register) => {
        const field = register === CR_PREP_READY.REGISTER.PREPARED ? "prepared_groups" : "ready_groups";
        const list = Array.isArray(activeUsers) ? activeUsers : [];
        const carries = list.some((u) => u[field] !== undefined && u[field] !== null);
        /* backend 262: rows carry prepared_groups / ready_groups / status — only active staff eligible for this register and Group */
        return list
            .filter((u) => (u.status === undefined || Number(u.status) === 1) && (!carries || csvGroups(u[field]).includes(group)))
            .map((u) => ({ value: String(u.id), label: u.name || [u.first_name, u.last_name].filter(Boolean).join(" ") }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [activeUsers]);
    /** the stored default cannot be offered any more: inactive, or no longer eligible for this register and Group */
    const staleReason = useCallback((cell, options) => {
        if (!cell?.staff_id) return null;
        if (Number(cell.staff_active) === 0) return PRD_STALE.INACTIVE;
        return options.some((o) => o.value === String(cell.staff_id)) ? null : PRD_STALE.NOT_ELIGIBLE;
    }, []);

    const save = useCallback(async (group, register, staffId) => {
        const key = `${ group }|${ register }`;
        setSavingKey(key); setError("");
        try {
            const res = await savePrepReadyDefaultAPI({ processing_group: group, register, staff_id: staffId ? Number(staffId) : null });
            if (!res?.data?.status) { setError(res?.data?.message || translation("key_something_went_wrong")); return; }
            ShowToast("success", res.data.message || translation("key_success"));
            await load();
        } catch (e) { setError(apiError(e)); }
        finally { setSavingKey(null); }
    }, [load]);

    const groups = useMemo(() => CR_PREP_READY.GROUPS, []);
    return { defaults, canEdit, agencyName, error, savingKey, groups, cellOf, optionsFor, staleReason, save };
};

export default usePreparedReadyDefaults;
