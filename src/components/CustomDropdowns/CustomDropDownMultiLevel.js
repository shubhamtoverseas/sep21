import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

export const CustomDropDownMultiLevel = (props) => {
  const { triggerLabel, triggerCount } = props;
  const [displayFields, setDisplayFields] = useState(props.selected);

  /* SH-06: a sub-item may be a plain string or { value, label } — the stored identity is the value, never the visible label */
  const itemValue = (item) => (item && typeof item === "object" ? item.value : item);
  const itemLabel = (item) => (item && typeof item === "object" ? item.label : item);

  useEffect(() => {
    setDisplayFields(props.selected);
  }, [props.selected]);
  function addRemoveItems(item) {
    const value = itemValue(item);
    let l = [...displayFields];
    if (l.includes(value)) {
      let i = l.indexOf(value);
      l.splice(i, 1);
    } else {
      l.push(value);
    }
    setDisplayFields(l);
    props.handleItems(l);
  }
  return (
    <>
      <ul className="dropdownMultiLevel ML_menu">
        <li>
          <span className="btn btn-outline" id="ML_root">
            {triggerLabel ? (
              <>
                <i className="ri-layout-column-line" />
                {triggerLabel}
                {triggerCount != null && (
                  <span className="ml-columns-count">{triggerCount}</span>
                )}
              </>
            ) : (
              <i className="ri-more-2-fill" />
            )}
          </span>
          <ul className="ML_menu">
            { props.list &&
              props.list.map((item, index) => {
                return (
                  <li key={ index }>
                    { item.type === 1 || item.type === 2 || item.type === 3 ?
                      <Link onClick={ () => props.changeOwner(item.type) }>
                        { item.name }
                      </Link>
                      :
                      <Link>{ item.name }</Link>
                    }

                    { item.type === 0 ? (
                      <ul className="ML_menu">
                        { item.subItem.map((item, index) => {
                          return (
                            <li key={ index } className="d-flex align-items-center">
                              <label className="d-flex align-items-center px-3 py-2 mb-0 cursor-pointer text-nowrap">
                                <input
                                  type="checkbox"
                                  className="mr-2"
                                  checked={ displayFields?.includes(itemValue(item)) }
                                  onChange={ () => addRemoveItems(item) }
                                />
                                { itemLabel(item) }
                              </label>
                            </li>
                          );
                        }) }
                      </ul>
                    ) : (
                      ""
                    ) }
                  </li>
                );
              }) }
          </ul>
        </li>
      </ul>
    </>
  );
};

CustomDropDownMultiLevel.propTypes = {
  list: PropTypes.array,
  selected: PropTypes.array,
  handleItems: PropTypes.func,
  changeOwner: PropTypes.func,
  triggerLabel: PropTypes.string,
  triggerCount: PropTypes.number,
};
