import React from "react";
import PropTypes from "prop-types";
import "./legend-capsule.css";

const LegendCapsule = ({ count, img, name }) => {
    return <>
        <div className={`legend-wrapper mb-sm-0 mb-2 ${name}`} >
            <img src={img} loading="lazy" height={16} width={18} />
            <span>{count}</span>
        </div>
    </>
}

LegendCapsule.propTypes = {
    count: PropTypes.number.isRequired,
    img: PropTypes.any.isRequired,
    name: PropTypes.string,
}
export default LegendCapsule;