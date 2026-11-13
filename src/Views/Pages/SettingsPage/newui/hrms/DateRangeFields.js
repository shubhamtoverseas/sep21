import React, { useCallback } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import DateInput from "../../../../../components/ui/DateInput";
import translation from "../../../../../utils/translation";
import styles from "./Hrms.module.css";

const API_DATE_FORMAT = "YYYY-MM-DD";

const toInputValue = (date) => (date ? dayjs(date).format(API_DATE_FORMAT) : "");
const toDate = (value) => (value ? dayjs(value).toDate() : null);

/**
 * From / To date pair speaking the legacy DateRangePicker contract:
 * onChange({ startDate: Date|null, endDate: Date|null }).
 */
const DateRangeFields = ({ id, startDate, endDate, onChange }) => {
    const setStart = useCallback((value) => onChange({ startDate: toDate(value), endDate }), [onChange, endDate]);
    const setEnd = useCallback((value) => onChange({ startDate, endDate: toDate(value) }), [onChange, startDate]);

    return (
        <div className={styles.dateRange}>
            <label className={styles.dateRangeLabel} htmlFor={`${id}-from`}>{translation("key_from")}</label>
            <DateInput id={`${id}-from`} value={toInputValue(startDate)} onChange={setStart} max={toInputValue(endDate) || undefined} className={styles.dateRangeInput} />
            <label className={styles.dateRangeLabel} htmlFor={`${id}-to`}>{translation("key_to")}</label>
            <DateInput id={`${id}-to`} value={toInputValue(endDate)} onChange={setEnd} min={toInputValue(startDate) || undefined} className={styles.dateRangeInput} />
        </div>
    );
};

DateRangeFields.propTypes = {
    id: PropTypes.string.isRequired,
    startDate: PropTypes.instanceOf(Date),
    endDate: PropTypes.instanceOf(Date),
    onChange: PropTypes.func.isRequired,
};

export default React.memo(DateRangeFields);
