import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { yupResolver } from "@hookform/resolvers/yup";
import { addDoop, clearMessage, fetchDoopById, updateDoop } from "../../../../../redux/Slices/settings/doops/DoopSlice";
import daysOfOperationSchema from "../../days-of-operation/daysOfOperationSchema";
import { addDoopFormState } from "../../../../../components/ReusableComponents/form-states";
import { showSuccessOrError, useQuery } from "../../../../../services/commonService";
import routes from "../../../routes/routesConfig";
import { absoluteRoute } from "../../../../../utils/utils";
import { WEEK_DAY_NUMBERS } from "../settingsNewUiConstants";

/** Ports AddDaysOfOpertaion.js: name, Active switch, work-day checkboxes → work_days/off_days CSV.
 *  Bug log #43 (fixed 2026-10-06): the form starts with `work_days: []` so "select at least one day" validates in add mode
 *  (the shared form state only carries `off_days`, which the schema never checks). */
const DOOP_DEFAULTS = { ...addDoopFormState, work_days: [] };
const useDoopForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const query = useQuery();
    const id = query.get("id");
    const isEdit = Boolean(id);

    const [doopStatus, setDoopStatus] = useState(Boolean(addDoopFormState.status));
    const [isLoading, setIsLoading] = useState(isEdit);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm({ resolver: yupResolver(daysOfOperationSchema), defaultValues: DOOP_DEFAULTS });
    const { reset, setValue } = form;

    useEffect(() => {
        if (!isEdit) {
            reset(DOOP_DEFAULTS);
            return undefined;
        }
        let active = true;
        setIsLoading(true);
        dispatch(fetchDoopById(id)).then((res) => {
            if (!active) return;
            const doop = !res.error ? res.payload?.data : null;
            if (doop) {
                reset({ ...doop, work_days: String(doop.work_days || "").split(",").filter(Boolean).map(Number) });
                setDoopStatus(Boolean(doop.status));
            }
            setIsLoading(false);
        });
        return () => { active = false; };
    }, [dispatch, id, isEdit, reset]);

    const toggleStatus = useCallback(() => {
        setDoopStatus((prev) => {
            const next = !prev;
            setValue("status", next, { shouldValidate: true });
            return next;
        });
    }, [setValue]);

    const onCancel = useCallback(() => navigate(-1), [navigate]);

    const onSubmit = useCallback((data) => {
        const workDays = (data.work_days || []).map(Number);
        const offDays = WEEK_DAY_NUMBERS.filter((day) => !workDays.includes(day));
        const payload = {
            doop_name: data.doop_name,
            work_days: workDays.join(","),
            off_days: offDays.join(","),
            status: data.status ? 1 : 0,
        };
        setIsSaving(true);
        dispatch(isEdit ? updateDoop({ ...payload, id }) : addDoop(payload))
            .then((res) => {
                showSuccessOrError(res);
                if (!res?.error) {
                    navigate(absoluteRoute(routes.daysOfOperation));
                    dispatch(clearMessage());
                }
            })
            .finally(() => setIsSaving(false));
    }, [dispatch, id, isEdit, navigate]);

    return { form, isEdit, isLoading, isSaving, doopStatus, toggleStatus, onSubmit, onCancel };
};

export default useDoopForm;
