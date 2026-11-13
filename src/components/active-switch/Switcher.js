import React from "react";
import "./active-switch.css";
import PropTypes from 'prop-types';

const Switcher = ({ id, checked, handleOnChange, isDisabled = false, marginBottomClass = 'mb24', isLabelYorN = true }) => {
  return (
    <div className={`maidmatch-switcher d-flex align-items-center ${marginBottomClass}`}>
     {isLabelYorN && <span className="text-n d-inline-block grey89">N</span>}
      <div className="custom-control custom-switch pl-0">
        <input
          type="checkbox"
          className="custom-control-input"
          id={id}
          checked={checked}
          onChange={handleOnChange}
          disabled={isDisabled}
        />
        <label className="custom-control-label grey2" htmlFor={id} />
      </div>
      {isLabelYorN && <span className="text-y d-inline-block grey89"> Y</span>}
    </div>
  );
};

Switcher.propTypes = {
  checked: PropTypes.bool,
  handleOnChange: PropTypes.func,
  id: PropTypes.string.isRequired,
  isDisabled: PropTypes.bool,
  marginBottomClass: PropTypes.string,
  isLabelYorN: PropTypes.bool,
};

export default React.memo(Switcher);
