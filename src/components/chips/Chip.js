import React, { useCallback } from 'react';
import PropTypes from 'prop-types';

const Chip = ({ size, color, classes, chipName, onClick, isActive }) => {
    const handleClick = useCallback(() => {
        if (onClick) {
            onClick(chipName);
        }
    }, [onClick, chipName]);

    return (
        <button
            className={`btn chip ${size} ${color} ${classes} ${isActive ? 'active' : ''}`}
            onClick={handleClick}
        >
            {chipName}
        </button>
    );
};

Chip.propTypes = {
    size: PropTypes.string,
    color: PropTypes.string,
    classes: PropTypes.string,
    chipName: PropTypes.string,
    onClick: PropTypes.func,
    isActive: PropTypes.bool,
};

export default Chip;