import React, { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { Controller, useWatch } from "react-hook-form";
import Icon from "../../../../../components/Icon/Icon";
import TimeInput from "../../../../../components/ui/TimeInput";
import { Checkbox, Field } from "../../../../../components/ui/FormControls";
import configData from "../../../../../components/ReusableComponents/app-configs";
import translation from "../../../../../utils/translation";
import styles from "../agencies/AgencyForm.module.css";
import { BRANCH_ERROR_LINE_SEPARATOR, OPERATING_TIME_SUFFIX, TIME_PICKER_INTERVAL_MINUTES } from "../settingsNewUiConstants";

const startKey = (day) => `${day}${OPERATING_TIME_SUFFIX.START}`;
const endKey = (day) => `${day}${OPERATING_TIME_SUFFIX.END}`;
const withPrefix = (prefix, key) => (prefix ? `${prefix}.${key}` : key);
const HOUR_KEYS = configData.daysOfWeek.flatMap((day) => [startKey(day), endKey(day)]);

/* The branch-level yup test reports hour problems as one "<br>"-joined string
   keyed by field (missing time) or by day name (start >= end). Depending on the
   schema shape it lands on `root` (nested branch) or on the "" key (flat form). */
const readRootMessage = (errors) => {
    const message = errors?.root?.message || errors?.[""]?.message || errors?.message;
    return typeof message === "string" ? message : "";
};

const splitErrorLines = (message) => (message ? message.split(BRANCH_ERROR_LINE_SEPARATOR) : []);

const DayCard = ({ control, namePrefix, idPrefix, day, dayNumber, previousDay, isOn, onToggle, values, errorLines, setValue }) => {
    const startName = withPrefix(namePrefix, startKey(day));
    const endName = withPrefix(namePrefix, endKey(day));
    const prevStart = previousDay ? values?.[startKey(previousDay)] : null;
    const prevEnd = previousDay ? values?.[endKey(previousDay)] : null;
    const canCopy = Boolean(isOn && prevStart && prevEnd);
    const startError = errorLines.some((line) => line.includes(startKey(day))) ? translation("key_start_time_is_required") : null;
    const endError = errorLines.some((line) => line.includes(endKey(day))) ? translation("key_end_time_is_required") : null;

    const copyPrevious = useCallback(() => {
        if (!canCopy) return;
        setValue(startName, prevStart);
        setValue(endName, prevEnd);
    }, [canCopy, setValue, startName, endName, prevStart, prevEnd]);

    return (
        <div className={`${styles.dayCard} ${isOn ? "" : styles.dayCardOff}`}>
            <div className={styles.dayHead}>
                <span>{translation(`key_${day}`)}</span>
                <Checkbox aria-label={translation(`key_${day}`)} checked={isOn} onChange={() => onToggle(dayNumber, !isOn)} />
            </div>

            <Field label={translation("key_office_start_time")} required={isOn} error={startError}>
                <Controller name={startName} control={control} render={({ field }) => (
                    <TimeInput
                        id={`${idPrefix}-${day}-start`}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        disabled={!isOn}
                        invalid={Boolean(startError)}
                        intervalMinutes={TIME_PICKER_INTERVAL_MINUTES}
                        timeCaption={translation("key_time")}
                    />
                )} />
            </Field>

            <Field label={translation("key_office_end_time")} required={isOn} error={endError}>
                <Controller name={endName} control={control} render={({ field }) => (
                    <TimeInput
                        id={`${idPrefix}-${day}-end`}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        disabled={!isOn}
                        invalid={Boolean(endError)}
                        intervalMinutes={TIME_PICKER_INTERVAL_MINUTES}
                        timeCaption={translation("key_time")}
                    />
                )} />
            </Field>

            {previousDay && (
                <button type="button" className={styles.copyBtn} onClick={copyPrevious} disabled={!canCopy}>
                    <Icon name="copy" size={12} /> {translation("key_copy_from_previous")}
                </button>
            )}
        </div>
    );
};

DayCard.propTypes = {
    control: PropTypes.object.isRequired,
    namePrefix: PropTypes.string,
    idPrefix: PropTypes.string.isRequired,
    day: PropTypes.string.isRequired,
    dayNumber: PropTypes.number.isRequired,
    previousDay: PropTypes.string,
    isOn: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
    values: PropTypes.object,
    errorLines: PropTypes.arrayOf(PropTypes.string).isRequired,
    setValue: PropTypes.func.isRequired,
};

/**
 * Seven-day operating-hours grid bound to `<namePrefix>.off_days` and the
 * `<day>_branch_operating_{start,end}_time` fields. `namePrefix` is empty for a
 * flat branch form or e.g. `branch_data[0]` inside the agency form.
 * Only the 14 hour fields are watched (the day cards read the previous day's
 * times for "Copy from previous"), so typing in any other field of the form
 * does not re-render the cards and their time pickers. They are watched under
 * the names their Controllers register: RHF matches watch subscriptions by name
 * string, so `branch_data.0.x` never sees a change made to `branch_data[0].x`.
 */
const BranchHoursGrid = ({ control, namePrefix = "", idPrefix = "branch", errors, setValue, clearErrors }) => {
    const hourNames = useMemo(() => HOUR_KEYS.map((key) => withPrefix(namePrefix, key)), [namePrefix]);
    const hourValues = useWatch({ control, name: hourNames });
    const values = useMemo(() => Object.fromEntries(HOUR_KEYS.map((key, index) => [key, hourValues[index]])), [hourValues]);
    const errorLines = useMemo(() => splitErrorLines(readRootMessage(errors)), [errors]);
    const summaryLines = useMemo(() => errorLines.filter((line) => !line.includes("_branch_operating_")), [errorLines]);

    const clearDayTimes = useCallback((day) => {
        clearErrors(withPrefix(namePrefix, startKey(day)));
        setValue(withPrefix(namePrefix, startKey(day)), null);
        setValue(withPrefix(namePrefix, endKey(day)), null);
    }, [clearErrors, namePrefix, setValue]);

    return (
        <div className={styles.hoursBox}>
            <div className={styles.hoursTitle}>{translation("key_hours_of_operation")}</div>
            <Controller
                name={withPrefix(namePrefix, "off_days")}
                control={control}
                render={({ field }) => {
                    const selectedDays = Array.isArray(field.value) ? field.value : [];
                    const toggleDay = (dayNumber, nextOn) => {
                        field.onChange(nextOn
                            ? [...selectedDays, dayNumber]
                            : selectedDays.filter((value) => value !== dayNumber));
                        if (!nextOn) clearDayTimes(configData.daysOfWeek[dayNumber - 1]);
                    };
                    return (
                        <div className={styles.daysGrid}>
                            {configData.daysOfWeek.map((day, dayIndex) => (
                                <DayCard
                                    key={day}
                                    control={control}
                                    namePrefix={namePrefix}
                                    idPrefix={idPrefix}
                                    day={day}
                                    dayNumber={dayIndex + 1}
                                    previousDay={dayIndex > 0 ? configData.daysOfWeek[dayIndex - 1] : null}
                                    isOn={selectedDays.includes(dayIndex + 1)}
                                    onToggle={toggleDay}
                                    values={values}
                                    errorLines={errorLines}
                                    setValue={setValue}
                                />
                            ))}
                        </div>
                    );
                }}
            />

            {errors?.off_days?.message && <div className={styles.errorLine} role="alert">{errors.off_days.message}</div>}
            {summaryLines.length > 0 && (
                <ul className={styles.errorList} role="alert">
                    {summaryLines.map((line) => <li key={line}>{line}</li>)}
                </ul>
            )}
        </div>
    );
};

BranchHoursGrid.propTypes = {
    control: PropTypes.object.isRequired,
    namePrefix: PropTypes.string,
    idPrefix: PropTypes.string,
    errors: PropTypes.object,
    setValue: PropTypes.func.isRequired,
    clearErrors: PropTypes.func.isRequired,
};

export default React.memo(BranchHoursGrid);
