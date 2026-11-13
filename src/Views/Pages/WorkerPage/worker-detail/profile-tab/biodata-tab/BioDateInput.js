import React, { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import DatePicker from "react-datepicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import pickerStyles from "../../../../../../components/ui/DateInput.module.css";
import translation from "../../../../../../utils/translation";
import { BIO_DATE_SHAPES } from "../../../workerModuleConstants";

dayjs.extend(customParseFormat);

const mask = (raw, shape) => {
    const digits = raw.replace(/\D/g, '').slice(0, shape.digits);
    let out = '';
    for (let i = 0; i < digits.length; i += 1) {
        if (shape.cuts.includes(i)) out += '/';
        out += digits[i];
    }
    return out;
};

const toDisplay = (value, shape) => (value ? dayjs(value).format(shape.display) : '');
const toDate = (value) => (value && dayjs(value).isValid() ? dayjs(value).toDate() : null);

/* the calendar glyph is the picker's trigger (react-datepicker customInput): it receives onClick from the picker */
const CalendarButton = forwardRef(({ onClick, disabled, label }, ref) => (
    <button type="button" ref={ ref } className="bio-date-cal" onClick={ onClick } disabled={ disabled } aria-label={ label } tabIndex={ -1 }>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M2.5 4h11v9.5h-11zM2.5 7h11M5.5 2.2V5M10.5 2.2V5" />
        </svg>
    </button>
));
CalendarButton.displayName = 'CalendarButton';
CalendarButton.propTypes = { onClick: PropTypes.func, disabled: PropTypes.bool, label: PropTypes.string };

/* range message for a complete date outside [min, max] ('' when inside) */
const rangeHint = (parsed, shape, min, max) => {
    const lo = min ? dayjs(min) : null;
    const hi = max ? dayjs(max) : null;
    const below = lo && lo.isValid() && parsed.isBefore(lo, 'day');
    const above = hi && hi.isValid() && parsed.isAfter(hi, 'day');
    if (!below && !above) return '';
    if (lo && hi) return `Enter a date between ${ lo.format(shape.display) } and ${ hi.format(shape.display) }`;
    return below ? `Enter a date on or after ${ lo.format(shape.display) }` : `Enter a date on or before ${ hi.format(shape.display) }`;
};

const BioDateInput = ({ mode, value, onChange, disabled, name, error, placeholder, ariaLabel, min, max }) => {
    const shape = BIO_DATE_SHAPES[mode] || BIO_DATE_SHAPES.date;
    const [text, setText] = useState(() => toDisplay(value, shape));
    const [hint, setHint] = useState('');

    /* an outside change (move to current, parent sync, reset) re-seeds the box */
    useEffect(() => { setText(toDisplay(value, shape)); setHint(''); }, [value, shape]);

    const handleInput = useCallback((e) => {
        const next = mask(e.target.value, shape);
        setText(next);
        setHint('');
        if (next === '') { if (value) onChange(''); return; }
        if (next.length === shape.display.length) {
            const parsed = dayjs(next, shape.display, true);
            if (!parsed.isValid()) { setHint(shape.hint); return; }
            const outside = rangeHint(parsed, shape, min, max);
            if (outside) { setHint(outside); return; }
            onChange(parsed.format(shape.canonical));
        }
    }, [shape, value, onChange, min, max]);

    const handleBlur = useCallback(() => {
        if (text && !dayjs(text, shape.display, true).isValid()) setHint(shape.hint);
    }, [text, shape]);

    /* a calendar pick lands as the canonical value; the typed box re-seeds from it through the effect above */
    const handlePick = useCallback((date) => {
        setHint('');
        onChange(date ? dayjs(date).format(shape.canonical) : '');
    }, [onChange, shape]);
    const selected = useMemo(() => toDate(value), [value]);
    const minDate = useMemo(() => toDate(min), [min]);
    const maxDate = useMemo(() => toDate(max), [max]);
    const isMonth = shape === BIO_DATE_SHAPES.month;

    return (
        <div className="bio-date">
            <DatePicker
                selected={ selected }
                onChange={ handlePick }
                minDate={ minDate }
                maxDate={ maxDate }
                disabled={ disabled }
                customInput={ <CalendarButton label={ `${ translation('key_select_date') }${ ariaLabel ? ` · ${ ariaLabel }` : '' }` } /> }
                calendarClassName={ pickerStyles.calendar }
                popperClassName={ pickerStyles.popper }
                popperPlacement="bottom-start"
                popperProps={ { strategy: 'fixed' } }
                showPopperArrow={ false }
                showMonthYearPicker={ isMonth }
                showMonthDropdown={ !isMonth }
                showYearDropdown={ !isMonth }
                dropdownMode="select"
            />
            <input
                type="text"
                name={ name }
                className={ `form-control${ error || hint ? ' is-invalid' : '' }` }
                inputMode="numeric"
                autoComplete="off"
                placeholder={ placeholder || shape.display }
                aria-label={ ariaLabel }
                value={ text }
                maxLength={ shape.display.length }
                disabled={ disabled }
                onChange={ handleInput }
                onBlur={ handleBlur }
            />
            { hint && <small className="text-danger">{ hint }</small> }
        </div>
    );
};

BioDateInput.propTypes = {
    mode: PropTypes.oneOf(['month', 'date']),
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    name: PropTypes.string,
    error: PropTypes.bool,
    placeholder: PropTypes.string,
    ariaLabel: PropTypes.string,
    min: PropTypes.string,
    max: PropTypes.string,
};

BioDateInput.defaultProps = { mode: 'date', value: '' };

export default React.memo(BioDateInput);
