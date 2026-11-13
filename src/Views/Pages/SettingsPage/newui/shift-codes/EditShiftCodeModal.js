import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { Controller, useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch } from "react-redux";
import Btn from "../../../../../components/ui/Btn";
import Modal from "../../../../../components/ui/Modal";
import TimeInput from "../../../../../components/ui/TimeInput";
import { Field, FormGrid, TextInput } from "../../../../../components/ui/FormControls";
import { updateShiftCode } from "../../../../../redux/Slices/settings/shift-code/ShiftCodeSlice";
import { editShiftCodeSchema } from "../../shift-codes/add-shift-code/shiftCodeSchema";
import { calculateShiftDuration, headingCase } from "../../../../../utils/utils";
import { showSuccessOrError } from "../../../../../services/commonService";
import translation from "../../../../../utils/translation";
import styles from "./ShiftCode.module.css";
import { parseShiftTime, toShiftCodeApiRow } from "./shiftCodeConfig";
import { SHIFT_DURATION_UNIT, TIME_PICKER_INTERVAL_MINUTES } from "../settingsNewUiConstants";

/** Ports EditShiftCodePopup: same defaults, same /update-shift-code payload; bug log #29 — code / start / end are required. */
const EditShiftCodeModal = ({ shiftCode, onClose }) => {
    const dispatch = useDispatch();
    const [isSaving, setIsSaving] = useState(false);

    const { control, handleSubmit, formState: { errors } } = useForm({
        resolver: yupResolver(editShiftCodeSchema),
        defaultValues: {
            shift_code: shiftCode.shift_code,
            shift_start_time: parseShiftTime(shiftCode.shift_start_time),
            shift_end_time: parseShiftTime(shiftCode.shift_end_time),
        },
    });

    const startTime = useWatch({ control, name: "shift_start_time" });
    const endTime = useWatch({ control, name: "shift_end_time" });
    const duration = calculateShiftDuration(startTime, endTime);

    const close = useCallback(() => onClose({ isRefreshList: false }), [onClose]);

    const submit = useCallback((data) => {
        setIsSaving(true);
        dispatch(updateShiftCode({ ...toShiftCodeApiRow(data), shift_code_id: shiftCode.id }))
            .then((res) => {
                showSuccessOrError(res);
                if (!res.error) onClose({ isRefreshList: true });
            })
            .finally(() => setIsSaving(false));
    }, [dispatch, onClose, shiftCode.id]);

    return (
        <Modal
            title={headingCase(translation("key_edit_shift_code"))}
            width={560}
            onClose={close}
            closeLabel={translation("key_close")}
            footer={(
                <>
                    <Btn variant="secondary" type="button" onClick={close} disabled={isSaving}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" type="submit" form="edit-shift-code-form" disabled={isSaving}>
                        {isSaving ? translation("key_saving") : translation("key_save")}
                    </Btn>
                </>
            )}
        >
            <form id="edit-shift-code-form" onSubmit={handleSubmit(submit)} noValidate>
                <FormGrid columns={2}>
                    <Field label={translation("key_shift_code")} htmlFor="esc-shift_code" required error={errors.shift_code?.message}>
                        <Controller name="shift_code" control={control} render={({ field }) => (
                            <TextInput {...field} id="esc-shift_code" type="text" invalid={Boolean(errors.shift_code)} />
                        )} />
                    </Field>

                    <Field label={translation("key_start_time")} htmlFor="esc-start" required error={errors.shift_start_time?.message}>
                        <Controller name="shift_start_time" control={control} render={({ field }) => (
                            <TimeInput id="esc-start" value={field.value} onChange={field.onChange} onBlur={field.onBlur} intervalMinutes={TIME_PICKER_INTERVAL_MINUTES} timeCaption={translation("key_time")} />
                        )} />
                    </Field>

                    <Field label={translation("key_end_time")} htmlFor="esc-end" required error={errors.shift_end_time?.message}>
                        <Controller name="shift_end_time" control={control} render={({ field }) => (
                            <TimeInput id="esc-end" value={field.value} onChange={field.onChange} onBlur={field.onBlur} intervalMinutes={TIME_PICKER_INTERVAL_MINUTES} timeCaption={translation("key_time")} />
                        )} />
                    </Field>

                    <Field label={translation("key_duration").trim()}>
                        <div className={styles.durationBox}>
                            <span className={styles.durationValue}>{duration}</span>
                            <span className={styles.durationUnit}>{SHIFT_DURATION_UNIT}</span>
                        </div>
                    </Field>
                </FormGrid>
            </form>
        </Modal>
    );
};

EditShiftCodeModal.propTypes = {
    shiftCode: PropTypes.shape({
        id: PropTypes.number.isRequired,
        shift_code: PropTypes.string.isRequired,
        shift_start_time: PropTypes.string.isRequired,
        shift_end_time: PropTypes.string.isRequired,
    }).isRequired,
    onClose: PropTypes.func.isRequired,
};

export default EditShiftCodeModal;
