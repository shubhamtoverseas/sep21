import React from "react";
import PropTypes from "prop-types";
import Icon from "../Icon/Icon";
import styles from "./FormControls.module.css";

const cx = (...parts) => parts.filter(Boolean).join(" ");

/* Controlled when a value prop is given (Controller); uncontrolled with register(). */
const valueProp = (value) => (value === undefined ? {} : { value: value ?? "" });

export const FormGrid = ({ columns = 2, className, children }) => (
    <div className={cx(styles.grid, columns === 3 && styles.grid3, columns === 4 && styles.grid4, className)}>
        {children}
    </div>
);
FormGrid.propTypes = { columns: PropTypes.oneOf([2, 3, 4]), className: PropTypes.string, children: PropTypes.node };

export const FormSection = ({ children }) => <div className={styles.sectionDivider}>{children}</div>;
FormSection.propTypes = { children: PropTypes.node };

export const Field = ({ label, htmlFor, required, error, hint, full, trailing, className, children }) => (
    <div className={cx(styles.field, full && styles.fieldFull, className)}>
        {label && (
            <label className={styles.fieldLabel} htmlFor={htmlFor}>
                <span>{label}{required && <span className={styles.required}>*</span>}</span>
                {trailing}
            </label>
        )}
        {children}
        {error && <div className={styles.fieldError} role="alert">{error}</div>}
        {!error && hint && <div className={styles.hint}>{hint}</div>}
    </div>
);
Field.propTypes = {
    label: PropTypes.node,
    htmlFor: PropTypes.string,
    required: PropTypes.bool,
    error: PropTypes.node,
    hint: PropTypes.node,
    full: PropTypes.bool,
    trailing: PropTypes.node,
    className: PropTypes.string,
    children: PropTypes.node,
};

export const TextInput = React.forwardRef(({ invalid, className, value, ...rest }, ref) => (
    <input ref={ref} {...valueProp(value)} className={cx(styles.input, invalid && styles.invalid, className)} {...rest} />
));
TextInput.displayName = "TextInput";
TextInput.propTypes = {
    invalid: PropTypes.bool,
    className: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export const TextArea = React.forwardRef(({ invalid, className, value, ...rest }, ref) => (
    <textarea ref={ref} {...valueProp(value)} className={cx(styles.textarea, invalid && styles.invalid, className)} {...rest} />
));
TextArea.displayName = "TextArea";
TextArea.propTypes = TextInput.propTypes;

export const SelectBox = React.forwardRef(({ invalid, disabled, className, value, children, ...rest }, ref) => (
    <div className={cx(styles.selectWrap, invalid && styles.invalid, disabled && styles.readonly, className)}>
        <select ref={ref} {...valueProp(value)} disabled={disabled} className={styles.select} {...rest}>{children}</select>
        <Icon name="chev_down" size={12} strokeWidth={1.8} className={styles.selectChevron} />
    </div>
));
SelectBox.displayName = "SelectBox";
SelectBox.propTypes = {
    invalid: PropTypes.bool,
    disabled: PropTypes.bool,
    className: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    children: PropTypes.node,
};

export const RadioGroup = ({ name, value, options, onChange, disabled, ariaLabel, describedBy }) => (
    <div className={styles.radioRow} role="radiogroup" aria-label={ariaLabel} aria-describedby={describedBy}>
        {options.map((option) => {
            const isDisabled = disabled || option.disabled;
            return (
                <label key={String(option.value)} className={cx(styles.radioLabel, isDisabled && styles.disabled)}>
                    <input
                        type="radio"
                        name={name}
                        className={styles.radio}
                        value={option.value}
                        checked={String(value) === String(option.value)}
                        disabled={isDisabled}
                        onChange={() => onChange(option.value)}
                    />
                    {option.label}
                </label>
            );
        })}
    </div>
);
RadioGroup.propTypes = {
    name: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
    options: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]).isRequired,
        label: PropTypes.node.isRequired,
        disabled: PropTypes.bool,
    })).isRequired,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    ariaLabel: PropTypes.string,
    describedBy: PropTypes.string,
};

export const Checkbox = ({ label, className, disabled, ...rest }) => (
    <label className={cx(styles.checkLabel, disabled && styles.disabled, className)}>
        <input type="checkbox" className={styles.checkbox} disabled={disabled} {...rest} />
        {label}
    </label>
);
Checkbox.propTypes = { label: PropTypes.node, className: PropTypes.string, disabled: PropTypes.bool };

export const Switch = ({ id, label, checked, onChange, disabled, className }) => (
    <label className={cx(styles.switchLabel, disabled && styles.disabled, className)} htmlFor={id}>
        {label}
        <span className={styles.switch}>
            <input
                id={id}
                type="checkbox"
                role="switch"
                className={styles.switchInput}
                checked={Boolean(checked)}
                aria-checked={Boolean(checked)}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
            />
            <span className={styles.switchTrack} aria-hidden="true">
                <span className={styles.switchKnob} />
            </span>
        </span>
    </label>
);
Switch.propTypes = {
    id: PropTypes.string,
    label: PropTypes.node,
    checked: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    className: PropTypes.string,
};

export default styles;
