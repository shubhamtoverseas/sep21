import React from "react";
import PropTypes from "prop-types";

import "./feature-box.css"; 

const FeatureBox = ({ icon, title }) => {
    return (
        <div className="feature-box d-flex align-items-center mb-3 mb-sm-0">
            <img src={icon} alt="Icon" height={34} width={34} />
            <p className="feature-box-title mb-0">{title}</p>
        </div>
    );
};

FeatureBox.propTypes = {
    icon: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired
};

export default FeatureBox;
