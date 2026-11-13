import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { yupResolver } from "@hookform/resolvers/yup";
import { addShiftCode } from "../../../../../redux/Slices/settings/shift-code/ShiftCodeSlice";
import { shiftCodeSchema } from "../../shift-codes/add-shift-code/shiftCodeSchema";
import { addShiftCodeFormState } from "../../../../../components/ReusableComponents/form-states";
import { EMPTY_ROW } from "../../../../../components/ReusableComponents/constants";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { showSuccessOrError } from "../../../../../services/commonService";
import translation from "../../../../../utils/translation";
import { hasDuplicateShiftCodes, toShiftCodeApiRow } from "./shiftCodeConfig";

/** Ports AddShiftCode.js: field-array rows, duplicate guard, /add-shift-code payload. */
const useShiftCodeForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm({ resolver: yupResolver(shiftCodeSchema), defaultValues: addShiftCodeFormState });
    const { control, setError, clearErrors } = form;
    const { fields, append, remove } = useFieldArray({ control, name: "shift_code_data" });

    const addRow = useCallback(() => append(EMPTY_ROW), [append]);
    const onCancel = useCallback(() => navigate(-1), [navigate]);

    const onSubmit = useCallback((data) => {
        clearErrors("shift_code_data");
        const payload = { shift_code_data: data.shift_code_data.map(toShiftCodeApiRow) };

        if (hasDuplicateShiftCodes(payload.shift_code_data)) {
            setError("shift_code_data", { type: "manual", message: translation("key_duplicate_shift_codes_found") });
            ShowToast("error", translation("key_duplicate_shift_codes_found"));
            return;
        }

        setIsSaving(true);
        dispatch(addShiftCode(payload))
            .then((res) => {
                showSuccessOrError(res);
                if (!res?.error) navigate(-1);
            })
            .finally(() => setIsSaving(false));
    }, [clearErrors, dispatch, navigate, setError]);

    return { form, rows: fields, addRow, removeRow: remove, isSaving, onSubmit, onCancel };
};

export default useShiftCodeForm;
