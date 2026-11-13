import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Controller, useWatch } from "react-hook-form";
import Btn from "../../../../../components/ui/Btn";
import Icon from "../../../../../components/Icon/Icon";
import TimeInput from "../../../../../components/ui/TimeInput";
import { Field, TextInput } from "../../../../../components/ui/FormControls";
import { calculateShiftDuration } from "../../../../../utils/utils";
import translation from "../../../../../utils/translation";
import { absoluteRoute, toTitleCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import styles from "./ShiftCode.module.css";
import useShiftCodeForm from "./useShiftCodeForm";
import { SHIFT_DURATION_UNIT, TIME_PICKER_INTERVAL_MINUTES } from "../settingsNewUiConstants";

const ShiftCodeRow = ({ index, control, register, errors, canRemove, onRemove }) => {
    const startTime = useWatch({ control, name: `shift_code_data.${index}.shift_start_time` });
    const endTime = useWatch({ control, name: `shift_code_data.${index}.shift_end_time` });
    const duration = useMemo(() => calculateShiftDuration(startTime, endTime), [startTime, endTime]);
    const rowErrors = errors?.shift_code_data?.[index] || {};

    return (
        <div className={styles.row}>
            <Field error={rowErrors.shift_code?.message}>
                <TextInput
                    type="text"
                    aria-label={translation("key_shift_code")}
                    invalid={Boolean(rowErrors.shift_code)}
                    {...register(`shift_code_data.${index}.shift_code`)}
                />
            </Field>

            <Field error={rowErrors.shift_start_time?.message}>
                <Controller name={`shift_code_data.${index}.shift_start_time`} control={control} render={({ field }) => (
                    <TimeInput
                        id={`shift-${index}-start`}
                        value={field.value || null}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        invalid={Boolean(rowErrors.shift_start_time)}
                        intervalMinutes={TIME_PICKER_INTERVAL_MINUTES}
                        timeCaption={translation("key_time")}
                    />
                )} />
            </Field>

            <Field error={rowErrors.shift_end_time?.message}>
                <Controller name={`shift_code_data.${index}.shift_end_time`} control={control} render={({ field }) => (
                    <TimeInput
                        id={`shift-${index}-end`}
                        value={field.value || null}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        invalid={Boolean(rowErrors.shift_end_time)}
                        intervalMinutes={TIME_PICKER_INTERVAL_MINUTES}
                        timeCaption={translation("key_time")}
                    />
                )} />
            </Field>

            <div className={styles.durationBox}>
                <span className={styles.durationValue}>{duration}</span>
                <span className={styles.durationUnit}>{SHIFT_DURATION_UNIT}</span>
            </div>

            <div className={styles.rowAction}>
                {canRemove && (
                    <button type="button" className={shared.rowIconBtn} onClick={onRemove} aria-label={translation("key_remove")} title={translation("key_remove")}>
                        <Icon name="trash" size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

ShiftCodeRow.propTypes = {
    index: PropTypes.number.isRequired,
    control: PropTypes.object.isRequired,
    register: PropTypes.func.isRequired,
    errors: PropTypes.object,
    canRemove: PropTypes.bool,
    onRemove: PropTypes.func.isRequired,
};

const ShiftCodeFormPage = () => {
    const shift = useShiftCodeForm();
    const { control, register, handleSubmit, formState: { errors } } = shift.form;
    const title = toTitleCase(translation("key_add_shift_codes"));

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.shiftCodes)}>{toTitleCase(translation("key_shift_codes"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{title}</span>
            </nav>

            <form className={shared.card} onSubmit={handleSubmit(shift.onSubmit)} noValidate>
                <div className={shared.cardHead}>
                    <h1 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{title}</h1>
                </div>

                <div className={styles.rows}>
                    <div className={`${styles.row} ${styles.rowHead}`}>
                        <span>{translation("key_shift_code")}</span>
                        <span>{translation("key_start_time")}</span>
                        <span>{translation("key_end_time")}</span>
                        <span>{translation("key_duration").trim()}</span>
                        <span />
                    </div>

                    {shift.rows.map((row, index) => (
                        <ShiftCodeRow
                            key={row.id}
                            index={index}
                            control={control}
                            register={register}
                            errors={errors}
                            canRemove={index > 0}
                            onRemove={() => shift.removeRow(index)}
                        />
                    ))}
                </div>

                {errors.shift_code_data?.message && (
                    <div className={styles.rowsError} role="alert">{errors.shift_code_data.message}</div>
                )}

                <div className={styles.addRow}>
                    <Btn variant="secondary" type="button" onClick={shift.addRow}>
                        <Icon name="plus" size={14} /> {translation("key_add")}
                    </Btn>
                </div>

                <div className={shared.formFoot}>
                    <Btn variant="secondary" type="button" onClick={shift.onCancel} disabled={shift.isSaving}>
                        {translation("key_cancel")}
                    </Btn>
                    <span className={shared.formFootSpacer} />
                    <Btn variant="primary" type="submit" disabled={shift.isSaving}>
                        {shift.isSaving ? translation("key_saving") : translation("key_save")}
                    </Btn>
                </div>
            </form>
        </div>
    );
};

export default ShiftCodeFormPage;
