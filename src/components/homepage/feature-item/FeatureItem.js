import React from "react";
import PropTypes from "prop-types";

import "./feature-item.css";

const FeatureItem = ({ icon, title, description, itemColor, marginBorromClass='mb-0' }) => {
    return (
        <div className="col-sm-6 col-12 mb-3 mb-sm-0">
            <div className={`${itemColor} ${marginBorromClass} feature-item  d-flex flex-column`} >
                <img src={icon} alt="Icon" className="mb24" />
                <h2 className="step-title2 mb24">{title}</h2>
                <p className="step-description mb-0">
                    {description}
                </p>
            </div>
        </div>
    );
};

FeatureItem.propTypes = {
    icon: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    itemColor: PropTypes.string,
    marginBorromClass: PropTypes.string
};

export default FeatureItem;
