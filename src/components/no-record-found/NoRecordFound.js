import React from "react";
import PropTypes from "prop-types";

import noRecordFile from "../../assets/img/svg/no-record-file.svg";

function NoRecordFound({ title, description, marginTopClass='mt150' }) {
    return <div className={`${marginTopClass} no-record-found text-center`}>
        <img src={noRecordFile} />
        <p className="fz24 fw-400 black">{title}</p>
        <span className="fz-16 fw-400">{description}</span>
    </div>
}
NoRecordFound.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    marginTopClass: PropTypes.string,
}
export default NoRecordFound;