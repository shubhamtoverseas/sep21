import React, { useCallback, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import DatePicker from "react-datepicker";
import dayjs from "dayjs";
import Icon from "../Icon/Icon";
import styles from "./DateInput.module.css";

const API_DATE_FORMAT = "YYYY-MM-DD";
const DISPLAY_FORMAT = "dd/MM/yyyy";
/* typed text: only the characters of DD/MM/YYYY (Mubin 3 Nov: any letters could be typed into Sent On) */
const TYPED_DISALLOWED = /[^\d/]/g;
const TYPED_MAX = DISPLAY_FORMAT.length;

const toDate = (value) => (value && dayjs(value).isValid() ? dayjs(value).toDate() : null);
/* exactly DD/MM/YYYY and a real calendar day (round-trip guards 00/overflow values) */
const isTypedDate = (raw) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
    if (!m) return false;
    const parsed = dayjs(`${ m[3] }-${ m[2] }-${ m[1] }`);
    return parsed.isValid() && parsed.format(API_DATE_FORMAT) === `${ m[3] }-${ m[2] }-${ m[1] }`;
};

/**
 * New-UI date field: react-datepicker with the v18.6 calendar skin.
 * `value` / `onChange` speak the API string format (YYYY-MM-DD); the input
 * shows DD/MM/YYYY with a calendar glyph, matching the prototype fields.
 */
const DateInput = ({ id, name, value, onChange, onBlur, min, max, invalid, disabled, readOnly, placeholder, className }) => {
    const selected = useMemo(() => toDate(value), [value]);
    /* a pick closes the calendar after the input already blurred: hosts that save on blur get a fresh blur once the value is in */
    const blurRef = useRef(onBlur);
    blurRef.current = onBlur;
    const handleCalendarClose = useCallback(() => { if (blurRef.current) setTimeout(() => blurRef.current?.(), 0); }, []);
    const minDate = useMemo(() => toDate(min), [min]);
    const maxDate = useMemo(() => toDate(max), [max]);

    const handleChange = useCallback((date) => {
        onChange(date ? dayjs(date).format(API_DATE_FORMAT) : "");
    }, [onChange]);
    /* react-datepicker calls onChangeRaw first and then reads event.target.value, so the typed text is cleaned in place;
       a letter never reaches the field and a value longer than the format is cut */
    const handleChangeRaw = useCallback((event) => {
        const raw = event?.target?.value;
        if (typeof raw !== "string") return;
        const clean = raw.replace(TYPED_DISALLOWED, "").slice(0, TYPED_MAX);
        if (clean !== raw) event.target.value = clean;
    }, []);
    /* typed text that is not a complete, real date never reaches a save: on blur the field snaps back to the
       stored value (remount — react-datepicker keeps invalid text otherwise). ClickUp 14ykpqtyakb. */
    const [resetKey, setResetKey] = useState(0);
    const handleBlur = useCallback((event) => {
        const raw = event?.target?.value ?? "";
        if (raw && !isTypedDate(raw)) setResetKey((k) => k + 1);
        if (onBlur) onBlur(event);
    }, [onBlur]);

    return (
        <div className={`${styles.wrap} ${className || ""}`}>
            <DatePicker
                key={resetKey}
                id={id}
                name={name}
                selected={selected}
                onChange={handleChange}
                onChangeRaw={handleChangeRaw}
                onBlur={handleBlur}
                onCalendarClose={handleCalendarClose}
                minDate={minDate}
                maxDate={maxDate}
                dateFormat={DISPLAY_FORMAT}
                placeholderText={placeholder || "DD/MM/YYYY"}
                className={`${styles.input} ${invalid ? styles.invalid : ""}`}
                calendarClassName={styles.calendar}
                popperClassName={styles.popper}
                popperProps={{ strategy: "fixed" }}
                portalId="mc-dp-portal"
                showPopperArrow={false}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                disabled={disabled}
                readOnly={readOnly}
                autoComplete="off"
            />
            <Icon name="calendar" size={13} className={styles.icon} />
        </div>
    );
};

DateInput.propTypes = {
    id: PropTypes.string,
    name: PropTypes.string,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    onBlur: PropTypes.func,
    min: PropTypes.string,
    max: PropTypes.string,
    invalid: PropTypes.bool,
    disabled: PropTypes.bool,
    readOnly: PropTypes.bool,
    placeholder: PropTypes.string,
    className: PropTypes.string,
};

export default React.memo(DateInput);
