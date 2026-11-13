import React, { useCallback, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Btn from "../../../../../components/ui/Btn";
import dayjs from "../../../../../utils/dayjsConfig";
import { Checkbox, Field, FormGrid, RadioGroup, SelectBox, TextInput } from "../../../../../components/ui/FormControls";
import configData from "../../../../../components/ReusableComponents/app-configs";
import translation from "../../../../../utils/translation";
import { leavePolicySchema } from "../../leave-policy/add-leave-policy/leavePolicySchema";
import shared from "../settings-newui.module.css";
import styles from "./LeavePolicy.module.css";
import { annualTotalFor, toRowPayload } from "./leavePolicyConfig";
import { headingCase } from "../../../../../utils/utils";
import {
    ACCRUAL_TYPE,
    ACCRUAL_TYPE_OPTIONS,
    DECIMAL_STEP,
    EXPIRY_TYPE,
    EXPIRY_TYPE_OPTIONS,
    LEAVE_EXPIRY_MONTH_DAYS,
    LEAVE_EXPIRY_REF_YEAR,
    LIMIT_FLAG,
    LIMIT_FLAG_OPTIONS,
    MAX_TYPE_OPTIONS,
    NUMERIC_YES_NO_OPTIONS,
    WHOLE_STEP,
} from "../settingsNewUiConstants";

const toOptions = (items) => items.map((item) => ({ value: item.value, label: translation(item.key) }));

/* Shubham 6 Nov: Expiry Type = Date picks a recurring Month + Day only — no year, and Feb caps at 28 so 29 Feb
   can never be chosen. The form value stays the legacy "YYYY-MM-DD" string on the non-leap sentinel year. */
const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => dayjs(new Date(2001, i, 1)).format("MMMM"));
const MonthDayField = ({ id, value, invalid, onChange }) => {
    const parsed = /^\d{4}-(\d{2})-(\d{2})$/.exec(String(value || ""));
    const month = parsed ? Number(parsed[1]) : "";
    const day = parsed ? Number(parsed[2]) : "";
    const emit = (nextMonth, nextDay) => {
        if (!nextMonth) { onChange(""); return; }
        const max = LEAVE_EXPIRY_MONTH_DAYS[nextMonth - 1];
        const boundedDay = Math.min(nextDay || 1, max);
        onChange(`${ LEAVE_EXPIRY_REF_YEAR }-${ String(nextMonth).padStart(2, "0") }-${ String(boundedDay).padStart(2, "0") }`);
    };
    return (
        <div className={ styles.monthDayRow }>
            <SelectBox id={ id } value={ month || "" } invalid={ invalid } aria-label={ translation("key_expiry_date") } onChange={ (e) => emit(Number(e.target.value) || 0, day) }>
                <option value="">{ translation("key_select") }</option>
                { MONTH_LABELS.map((label, i) => <option key={ label } value={ i + 1 }>{ label }</option>) }
            </SelectBox>
            <SelectBox value={ day || "" } invalid={ invalid } disabled={ !month } aria-label={ translation("key_expiry_date") } onChange={ (e) => emit(month, Number(e.target.value) || 0) }>
                <option value="">{ translation("key_select") }</option>
                { Array.from({ length: month ? LEAVE_EXPIRY_MONTH_DAYS[month - 1] : 0 }, (_, i) => <option key={ i + 1 } value={ i + 1 }>{ i + 1 }</option>) }
            </SelectBox>
        </div>
    );
};
MonthDayField.propTypes = { id: PropTypes.string, value: PropTypes.string, invalid: PropTypes.bool, onChange: PropTypes.func.isRequired };

/** Inline "leave type" editor: one row of the policy (legacy AddLeavePolicyForm). */
const LeaveTypeForm = ({ editData, onSubmitRow, onDiscard }) => {
    const { control, handleSubmit, reset, watch, setValue, trigger, formState: { errors } } = useForm({
        resolver: yupResolver(leavePolicySchema),
        mode: "onChange",
        defaultValues: editData || configData.leavePolicyFormsConfig,
    });

    const accrualType = watch("accrual_type");
    const accrualRate = watch("accrual_rate");
    const carryForward = Number(watch("carry_forward"));
    const carryForwardNoLimit = watch("carry_forward_no_limit");
    const carryForwardMaxType = watch("carry_forward_max_type");
    const encashment = Number(watch("encashment"));
    const encashmentNoLimit = watch("encashment_no_limit");
    const encashmentMaxType = watch("encashment_max_type");
    const expiryLimit = watch("expiry_value_limit");
    const expiryType = watch("expiry_type");

    const annualTotal = useMemo(() => annualTotalFor(accrualType, accrualRate), [accrualType, accrualRate]);

    useEffect(() => { if (carryForwardNoLimit) setValue("carry_forward_max", ""); }, [carryForwardNoLimit, setValue]);
    useEffect(() => { if (encashmentNoLimit) setValue("encashment_max", ""); }, [encashmentNoLimit, setValue]);
    useEffect(() => { if (carryForwardMaxType) trigger("carry_forward_max"); }, [carryForwardMaxType, trigger]);
    useEffect(() => { if (encashmentMaxType) trigger("encashment_max"); }, [encashmentMaxType, trigger]);

    useEffect(() => {
        if (!editData) return;
        Object.keys(editData).forEach((key) => {
            if (editData[key] !== undefined && editData[key] !== null) setValue(key, editData[key]);
        });
    }, [editData, setValue]);

    const submit = useCallback((data) => onSubmitRow(toRowPayload(data, annualTotal)), [onSubmitRow, annualTotal]);

    const options = useMemo(() => ({
        accrual: toOptions(ACCRUAL_TYPE_OPTIONS),
        yesNo: toOptions(NUMERIC_YES_NO_OPTIONS),
        maxType: toOptions(MAX_TYPE_OPTIONS),
        limit: toOptions(LIMIT_FLAG_OPTIONS),
        expiryType: toOptions(EXPIRY_TYPE_OPTIONS),
    }), []);

    const numberField = (name, labelKey, { placeholderKey = labelKey, step = DECIMAL_STEP, disabled, onChange, unit } = {}) => (
        <Field label={translation(labelKey)} htmlFor={`lt-${name}`} error={errors[name]?.message}>
            <div className={unit ? styles.unitWrap : undefined}>
                <Controller name={name} control={control} render={({ field }) => (
                    <TextInput
                        {...field}
                        id={`lt-${name}`}
                        className="mc-spin"
                        type="number"
                        step={step}
                        disabled={disabled}
                        placeholder={`${translation("key_enter")} ${translation(placeholderKey)}`}
                        invalid={Boolean(errors[name])}
                        onChange={(event) => { field.onChange(event); onChange?.(); }}
                    />
                )} />
                {unit && <span className={styles.unitSuffix}>{unit}</span>}
            </div>
        </Field>
    );

    const radioField = (name, labelKey, radioOptions, { onChange, full, className } = {}) => (
        <Field label={translation(labelKey)} error={errors[name]?.message} full={full} className={className}>
            <Controller name={name} control={control} render={({ field }) => (
                <RadioGroup
                    name={name}
                    value={field.value}
                    options={radioOptions}
                    onChange={(value) => { field.onChange(value); onChange?.(value); }}
                    ariaLabel={translation(labelKey)}
                />
            )} />
        </Field>
    );

    /* U-0441: the Percentage / Value radios own their error (programmatically tied to the group).
       Shubham 10 Nov: the type radios LEAD the line; the numeric box (decimals up to 2) follows with the
       No-limit checkbox embedded beside it — checking it blurs the box out. */
    const maxWithLimit = (maxName, noLimitName, typeName, labelKey) => (
        <Field label={translation(labelKey)} htmlFor={`lt-${maxName}`} error={errors[maxName]?.message} className={styles.span2}>
            <div className={styles.maxRow}>
                <Controller name={typeName} control={control} render={({ field }) => (
                    <span className={styles.maxTypeWrap}>
                        <RadioGroup name={typeName} value={field.value} options={options.maxType} onChange={field.onChange} ariaLabel={translation(labelKey)} describedBy={errors[typeName] ? `lt-${typeName}-error` : undefined} />
                        {errors[typeName] && <small id={`lt-${typeName}-error`} className={styles.radioError} role="alert">{errors[typeName].message}</small>}
                    </span>
                )} />
                <span className={styles.limitUnit}>
                    <Controller name={maxName} control={control} render={({ field }) => (
                        <TextInput
                            {...field}
                            id={`lt-${maxName}`}
                            className="mc-spin"
                            type="number"
                            step={DECIMAL_STEP}
                            placeholder={`${translation("key_enter")} ${translation(labelKey)}`}
                            invalid={Boolean(errors[maxName])}
                            disabled={Boolean(watch(noLimitName))}
                            onChange={(event) => { field.onChange(event); trigger(maxName); }}
                        />
                    )} />
                    <Controller name={noLimitName} control={control} render={({ field }) => (
                        <Checkbox label={translation("key_no_limit")} checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />
                    )} />
                </span>
            </div>
        </Field>
    );

    return (
        <form className={styles.typeForm} onSubmit={handleSubmit(submit)} noValidate>
            <div className={styles.typeFormHead}>
                <h2 className={shared.sectionEyebrow}>{headingCase(translation("key_enter_details"))}</h2>
                <div className={styles.typeFormActions}>
                    <Btn variant="ghost" type="button" onClick={() => reset()}>{translation("key_reset")}</Btn>
                    <Btn variant="secondary" type="button" onClick={onDiscard}>{translation("key_discard")}</Btn>
                </div>
            </div>

            <div className={styles.fieldsArea}>
            <FormGrid columns={4}>
                <Field label={translation("key_leave_type")} htmlFor="lt-leave_policy_type" required error={errors.leave_policy_type?.message}>
                    <Controller name="leave_policy_type" control={control} render={({ field }) => (
                        <TextInput {...field} id="lt-leave_policy_type" type="text" placeholder={translation("key_type")} invalid={Boolean(errors.leave_policy_type)} />
                    )} />
                </Field>

                <Field label={translation("key_accrual_type")} htmlFor="lt-accrual_type" required error={errors.accrual_type?.message}>
                    <Controller name="accrual_type" control={control} render={({ field }) => (
                        <SelectBox {...field} id="lt-accrual_type" invalid={Boolean(errors.accrual_type)}>
                            <option value="">{translation("key_please_select")}</option>
                            {options.accrual.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </SelectBox>
                    )} />
                </Field>

                {accrualType !== ACCRUAL_TYPE.MANUAL && (
                    <>
                        {numberField("accrual_rate", "key_accrual_rate")}
                        <Field label={translation("key_annual_total")}>
                            <div className={styles.annualTotal}>{annualTotal}</div>
                        </Field>
                    </>
                )}

                {/* Shubham 6 Nov: each Yes/No leads its own line — Carry Forwardable, then Encashable with the encash
                    fields, then Expiry with the type + value (rowStart pins the toggle to column 1) */}
                {radioField("carry_forward", "key_carry_forwardable", options.yesNo, { className: styles.rowStart })}
                {carryForward === 1 && maxWithLimit("carry_forward_max", "carry_forward_no_limit", "carry_forward_max_type", "key_carry_forward_max")}

                {radioField("encashment", "key_encashable", options.yesNo, { className: styles.rowStart })}
                {/* Shubham 10 Nov: Encash Max leads, the threshold follows */}
                {encashment === 1 && (
                    <>
                        {maxWithLimit("encashment_max", "encashment_no_limit", "encashment_max_type", "key_encash_max")}
                        {numberField("threshold", "key_min_threshold_to_encash", { step: WHOLE_STEP })}
                    </>
                )}

                {radioField("expiry_value_limit", "key_expiry", options.limit, { className: styles.rowStart })}
                {expiryLimit === LIMIT_FLAG.NO_LIMIT && (
                    <>
                        {/* the Type radio leads; the Days / Month-Day input follows it (user, 6 Nov) */}
                        {radioField("expiry_type", "key_type", options.expiryType, { onChange: () => setValue("expiry_in_days", "") })}
                        <Field
                            label={translation(expiryType === EXPIRY_TYPE.DAYS ? "key_expiry_in_days" : "key_expiry_date")}
                            htmlFor="lt-expiry_in_days"
                            error={errors.expiry_in_days?.message}
                        >
                            <Controller name="expiry_in_days" control={control} render={({ field }) => (
                                expiryType === EXPIRY_TYPE.DATE ? (
                                    <MonthDayField id="lt-expiry_in_days" value={field.value ? String(field.value) : ""} invalid={Boolean(errors.expiry_in_days)} onChange={field.onChange} />
                                ) : (
                                    <TextInput
                                        {...field}
                                        id="lt-expiry_in_days"
                                        className="mc-spin"
                                        type="number"
                                        placeholder={`${translation("key_enter")} ${translation("key_expiry_in_days")}`}
                                        invalid={Boolean(errors.expiry_in_days)}
                                    />
                                )
                            )} />
                        </Field>
                    </>
                )}

                {/* Shubham 10 Nov: the box shows its unit (days) */}
                {numberField("effective_from_date_of_hire", "key_effective_from_date_of_hire", { placeholderKey: "key_no_of_days", step: "1", unit: translation("key_days") })}
            </FormGrid>
            </div>

            {/* the foot sits on the CARD's right edge, outside the 70% fields area (Shubham 10 Nov) */}
            <div className={styles.typeFormFoot}>
                <Btn variant="primary" type="submit">
                    {translation("key_add_to_policy")}
                </Btn>
            </div>
        </form>
    );
};

LeaveTypeForm.propTypes = {
    editData: PropTypes.object,
    onSubmitRow: PropTypes.func.isRequired,
    onDiscard: PropTypes.func.isRequired,
};

export default React.memo(LeaveTypeForm);
