import React, { useEffect, useState, useRef } from "react";
import { sanitizeHtml } from "../../utils/sanitize";
import PropTypes from "prop-types";

import caretDown from "../../assets/img/job-offer/caret-down.svg";
import whiteCaretDown from "../../assets/img/svg/white-caret.svg";
import keyboardKeyDownIcon from "../../assets/img/svg/keyboard_arrow_down.svg";

const CustomDropDown = ({
  btnHtml,
  default: defaultValue,
  list,
  handleClick,
  isBlue,
  isnotArrow,
  relativeList,
  iconName,
  isWhiteCaret,
  isSolidCaret = true,
  isDropOptions = true,
  isBtnClickNeeded = false,
  handleDropdownBtnClicked,
  openDropdownPosition
}) => {
  const [customDropDown, setCustomDropDown] = useState(false);
  const [selectedOption, setSelectedOption] = useState(defaultValue);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setSelectedOption(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const checkIfClickedOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setCustomDropDown(false);
      }
    };
    document.addEventListener("mousedown", checkIfClickedOutside);
    return () => {
      document.removeEventListener("mousedown", checkIfClickedOutside);
    };
  }, []);

  function toggleDropDown() {
    setCustomDropDown(!customDropDown);
    if (isBtnClickNeeded) {
      handleDropdownBtnClicked();
    }
  }

  const renderDefaultText = () => {
    return selectedOption || "Select an option";
  };

  const handleOptionSelect = (name, id, enable, type) => {
    const isEnabled = enable !== false;
    if (!isEnabled) return;

    if (selectedOption === name) {
      setSelectedOption("");
      handleClick("", id);
    } else {
      // setSelectedOption(name);
      handleClick(name, id, type);
    }
    setCustomDropDown(false);
  };

  return (
    <div ref={ dropdownRef } className="custom_drop_down d-inline-block w-100">
      { btnHtml ? (
        <div
          onClick={ toggleDropDown }
          dangerouslySetInnerHTML={sanitizeHtml(btnHtml)}
        ></div>
      ) : (
        <div
          style={ { marginTop: "-2px" } }
          onClick={ toggleDropDown }
          className="custom_drop_holder w-100 d-flex align-items-center justify-content-between"
        >
          { iconName && <i className={ iconName }></i> }
          <span
            className={ `${ isBlue ? "text-white" : "grey9b" } ml-1 flex-grow-1` }
          >
            { renderDefaultText() }
          </span>
          { !isnotArrow && (
            <span className="cursorStyle">
              { !isSolidCaret ? (
                <img src={ keyboardKeyDownIcon } className="ml-1" />
              ) : (
                <img src={ isWhiteCaret ? whiteCaretDown : caretDown } />
              ) }
            </span>
          ) }
        </div>
      ) }

      { customDropDown && isDropOptions && (
        <div
          id="picker"
          className={
            `${ openDropdownPosition === "top" ? 'dropup ' : '' }${ relativeList ? 'custom_drop_menu cddTop' : 'custom_drop_menu'
            }`
          }
        >
          <ul className="mb-0">
            { list &&
              list.map((item, index) => (
                <li
                  className={ `cdd_li ${ item.enable === false ? 'text-secondary cursor-not-allowed' : 'cursor-pointer' }` }
                  onClick={ () => handleOptionSelect(item.name, item.id, item.enable, item?.type) }
                  key={ index }
                >
                  { item.name }
                </li>
              )) }
          </ul>
        </div>
      ) }
    </div>
  );
};

CustomDropDown.propTypes = {
  btnHtml: PropTypes.string,
  default: PropTypes.string,
  list: PropTypes.array,
  handleClick: PropTypes.func,
  isBlue: PropTypes.bool,
  isnotArrow: PropTypes.bool,
  relativeList: PropTypes.bool,
  iconName: PropTypes.string,
  isWhiteCaret: PropTypes.bool,
  isSolidCaret: PropTypes.bool,
  isDropOptions: PropTypes.bool,
  isBtnClickNeeded: PropTypes.bool,
  handleDropdownBtnClicked: PropTypes.func,
  openDropdownPosition: PropTypes.string,
};

export default CustomDropDown;
