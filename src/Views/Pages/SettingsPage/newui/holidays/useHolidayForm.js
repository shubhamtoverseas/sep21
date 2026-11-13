import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { yupResolver } from "@hookform/resolvers/yup";
import { addHoliday, fetchHolidayById, updateHoliday } from "../../../../../redux/Slices/settings/holidays/HolidaySlice";
import { holidaySchema } from "../../holiday-list/holidaySchema";
import { addHolidayFormState } from "../../../../../components/ReusableComponents/form-states";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import translation from "../../../../../utils/translation";
import { showSuccessOrError, useQuery } from "../../../../../services/commonService";
import routes from "../../../routes/routesConfig";
import { absoluteRoute } from "../../../../../utils/utils";
import { HOLIDAY_ROW_DEFAULT } from "../settingsNewUiConstants";

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Legacy cleanDateString: strip timezone / time parts, always yield YYYY-MM-DD or "". */
export const cleanDateString = (value) => {
    if (!value) return "";
    if (typeof value === "string" && ISO_DATE_ONLY.test(value)) return value;
    if (typeof value === "string" && value.includes("T")) return value.split("T")[0];
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    }
    return "";
};

const cleanRows = (rows = []) => rows.map((row) => ({ ...row, holiday_date: cleanDateString(row.holiday_date) }));

/** Ports AddHolidayList.js: list name + holiday rows, Smart Fill merge, add/update. */
const useHolidayForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const query = useQuery();
    const id = query.get("id");
    const isEdit = Boolean(id);

    const [isLoading, setIsLoading] = useState(isEdit);
    const [isSaving, setIsSaving] = useState(false);
    const [isSmartFillOpen, setIsSmartFillOpen] = useState(false);

    const form = useForm({ resolver: yupResolver(holidaySchema), defaultValues: addHolidayFormState });
    const { control, reset, getValues } = form;
    const { fields, append, remove, replace } = useFieldArray({ control, name: "holidays_data" });

    useEffect(() => {
        if (!isEdit) {
            reset(addHolidayFormState);
            return undefined;
        }
        let active = true;
        setIsLoading(true);
        dispatch(fetchHolidayById(id)).then((res) => {
            if (!active) return;
            const holiday = !res.error ? res.payload?.data : null;
            if (holiday) reset({ ...holiday, holidays_data: cleanRows(holiday.holidays_data) });
            setIsLoading(false);
        });
        return () => { active = false; };
    }, [dispatch, id, isEdit, reset]);

    const addRow = useCallback(() => append({ ...HOLIDAY_ROW_DEFAULT }), [append]);

    const openSmartFill = useCallback(() => setIsSmartFillOpen(true), []);
    const closeSmartFill = useCallback(() => setIsSmartFillOpen(false), []);

    /* Legacy merge: on edit keep existing rows and skip duplicates (same name + date). */
    const applySmartFill = useCallback((selectedHolidays) => {
        const current = getValues("holidays_data") || [];
        const existing = isEdit && current.length > 0 ? current : [];
        const fresh = selectedHolidays.filter((candidate) => !existing.some((row) =>
            row.holiday_name === candidate.holiday_name
            && cleanDateString(row.holiday_date) === cleanDateString(candidate.holiday_date)
        ));
        replace([...existing, ...cleanRows(fresh)]);
        ShowToast("success", translation("key_holidays_added_successfully").replace("{{count}}", fresh.length));
    }, [getValues, isEdit, replace]);

    const onCancel = useCallback(() => navigate(-1), [navigate]);

    const onSubmit = useCallback((data) => {
        const payload = { ...data, holidays_data: cleanRows(data.holidays_data) };
        setIsSaving(true);
        dispatch(isEdit ? updateHoliday({ ...payload, holiday_list_id: id }) : addHoliday(payload))
            .then((res) => {
                showSuccessOrError(res);
                if (!res.error) navigate(absoluteRoute(routes.holidays));
            })
            .finally(() => setIsSaving(false));
    }, [dispatch, id, isEdit, navigate]);

    return {
        form,
        isEdit,
        isLoading,
        isSaving,
        rows: fields,
        addRow,
        removeRow: remove,
        isSmartFillOpen,
        openSmartFill,
        closeSmartFill,
        applySmartFill,
        onSubmit,
        onCancel,
    };
};

export default useHolidayForm;
