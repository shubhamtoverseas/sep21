import React from 'react';
import PropTypes from 'prop-types';
import RcSlider from 'rc-slider';
import 'rc-slider/assets/index.css';
import './range-slider.css';

// Drop-in replacement for @mui/material's Slider covering the props this app
// uses: value (number or [min,max]), min, max, step, onChange(event, value),
// valueLabelDisplay, aria-labelledby. Built on rc-slider so MUI/emotion can be
// dropped from the bundle.
const Slider = ({ value, min, max, step, onChange, valueLabelDisplay, 'aria-labelledby': ariaLabelledBy }) => {
    const handleRender = (node, handleProps) => {
        if (!valueLabelDisplay || valueLabelDisplay === 'off') return node;
        return React.cloneElement(node, {}, (
            handleProps.dragging
                ? <span className="range-slider-value-label">{ handleProps.value }</span>
                : null
        ));
    };

    return (
        <RcSlider
            range={ Array.isArray(value) }
            allowCross={ false }
            min={ min }
            max={ max }
            step={ step }
            value={ value }
            onChange={ (val) => onChange && onChange(null, val) }
            handleRender={ handleRender }
            ariaLabelledByForHandle={ ariaLabelledBy }
        />
    );
};

Slider.propTypes = {
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.arrayOf(PropTypes.number)]),
    min: PropTypes.number,
    max: PropTypes.number,
    step: PropTypes.number,
    onChange: PropTypes.func,
    valueLabelDisplay: PropTypes.string,
    'aria-labelledby': PropTypes.string,
};

export default Slider;
