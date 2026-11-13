import React from "react";
import PropTypes from "prop-types";

import './terms-and-privacy.css';

const PolicyTermsHeader = ({heading= '', title = ''}) => {
  return <div className="policy-terms-header">
      <h1 className="text-center mb8">{heading}</h1>
      <p className="text-center mb-0">{title}</p>
    </div>
};
PolicyTermsHeader.propTypes = {
    heading: PropTypes.string,
    title: PropTypes.string,
}

export default PolicyTermsHeader;