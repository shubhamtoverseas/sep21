import React from "react";
import PropTypes from "prop-types";

import globalSearchIcon from '../../assets/img/svg/global-search-icon.svg';
import translation from "../../utils/translation";
import "./filter-search-bar.css";

const FilterSearchBar = ({ onSearch, placeholder = `${ translation('key_search') }`, value = '' }) => {
  return <div className="input-group customInputGroup inputgroupBoth">
    <div className="input-group-prepend">
      <span className="input-group-text pl-0 pr-1">
        <img src={ globalSearchIcon } width={ 20 } height={ 20 } alt="search icon" />
      </span>
    </div>
    <input
      type="text"
      className="form-control"
      aria-label={ translation('key_amount_nearest_dollar') }
      placeholder={ placeholder }
      value={ value }
      onChange={ onSearch }
    />
  </div>
}

FilterSearchBar.propTypes = {
  onSearch: PropTypes.func,
  placeholder: PropTypes.string,
  value: PropTypes.string
}
export default FilterSearchBar;
