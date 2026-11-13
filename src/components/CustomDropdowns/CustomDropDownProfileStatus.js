import React, { useCallback, useEffect, useState } from "react";
import { sanitizeHtml } from "../../utils/sanitize";
import PropTypes from "prop-types";

import keyboardKeyDownIcon from "../../assets/img/svg/keyboard_arrow_down.svg";
import caretDown from "../../assets/img/job-offer/caret-down.svg";
import whiteCaretDown from "../../assets/img/svg/white-caret.svg";

const CustomDropDownProfileStatus = ({
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
  openDropdownPosition
}) => {
  const [customDropDown, setCustomDropDown] = useState(false);
  const [selectedOption] = useState(defaultValue);

  useEffect(() => {
    const checkIfClickedOutside = (e) => {
      if (e.target.className !== "cdd_li") {
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
  }

  const renderDefaultText = () => {
    return selectedOption || "Select an option";
  };

  const handleOptionSelect = useCallback(
    (id, name, flag) => {
      if (flag) {
        handleClick(id, name, flag);
        setCustomDropDown(false);
      }
    }, [handleClick, setCustomDropDown]);

  return (
    <div className="custom_drop_down d-inline-block w-100">
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
            className={ `${ isBlue ? "black" : "grey9b" } ml-1 flex-grow-1` }
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
                (item?.id) ?
                  <li
                    className="cdd_li"
                    key={ index }
                    onClick={ () => handleOptionSelect(item.id, item.name, item.enable) }
                    disabled={ !item?.enable }
                    style={ { cursor: item?.enable ? "pointer" : "not-allowed", color: !item?.enable ? "#888" : "" } }
                  >
                    { item.name }
                  </li>
                  : ""
              )) }
          </ul>
        </div>
      ) }
    </div>
  );
};

CustomDropDownProfileStatus.propTypes = {
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
  openDropdownPosition: PropTypes.string,
};

export default React.memo(CustomDropDownProfileStatus);
