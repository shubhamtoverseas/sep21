import React from "react";
import PropTypes from "prop-types";

import "./custom-checkbox.css";

const CustomCheckbox = ({ checked, onChange, checkId, checkedLabel, labelClasses, inputClasses, marginBottom='', disabled=false}) => {
    return (
        <div className={`${marginBottom} custom-checkbox`}>
            <input
                type="checkbox"
                id={checkId}
                className={`${inputClasses} custom-check-input`}
                checked={checked}
                onChange={onChange}
                disabled={disabled}
            />
            <label htmlFor={checkId} className={`${labelClasses} fz12`}>
                {checkedLabel && checkedLabel}
            </label>
        </div>
    );
};

CustomCheckbox.propTypes = {
    checked: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
    checkId: PropTypes.string.isRequired,
    checkedLabel: PropTypes.string,
    inputClasses: PropTypes.string,
    labelClasses: PropTypes.string,
    marginBottom: PropTypes.string,
    disabled: PropTypes.bool,
};

export default CustomCheckbox;