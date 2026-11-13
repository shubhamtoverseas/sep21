import React, { useMemo } from "react";
import PropTypes from "prop-types";
import DatePicker from "react-datepicker";
import dayjs from "dayjs";
import Icon from "../Icon/Icon";
import dateStyles from "./DateInput.module.css";
import styles from "./TimeInput.module.css";

const DISPLAY_FORMAT = "h:mm aa";
const DEFAULT_INTERVAL_MINUTES = 15;

const toDate = (value) => (value && dayjs(value).isValid() ? dayjs(value).toDate() : null);

/**
 * New-UI time field: react-datepicker in time-only mode with the shared
 * 32px field chrome. `value` / `onChange` carry Date objects (or null) so
 * callers format for the API themselves (e.g. HH:mm on submit).
 */
const TimeInput = ({ id, name, value, onChange, onBlur, invalid, disabled, placeholder, intervalMinutes, timeCaption, className }) => {
    const selected = useMemo(() => toDate(value), [value]);

    return (
        <div className={`${dateStyles.wrap} ${className || ""}`}>
            <DatePicker
                id={id}
                name={name}
                selected={selected}
                onChange={onChange}
                onBlur={onBlur}
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={intervalMinutes || DEFAULT_INTERVAL_MINUTES}
                timeCaption={timeCaption}
                dateFormat={DISPLAY_FORMAT}
                placeholderText={placeholder || "--:--"}
                className={`${dateStyles.input} ${invalid ? dateStyles.invalid : ""}`}
                calendarClassName={styles.popup}
                popperClassName={dateStyles.popper}
                popperProps={{ strategy: "fixed" }}
                showPopperArrow={false}
                disabled={disabled}
                autoComplete="off"
            />
            <Icon name="progress" size={13} className={dateStyles.icon} />
        </div>
    );
};

TimeInput.propTypes = {
    id: PropTypes.string,
    name: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string]),
    onChange: PropTypes.func.isRequired,
    onBlur: PropTypes.func,
    invalid: PropTypes.bool,
    disabled: PropTypes.bool,
    placeholder: PropTypes.string,
    intervalMinutes: PropTypes.number,
    timeCaption: PropTypes.string,
    className: PropTypes.string,
};

export default React.memo(TimeInput);
