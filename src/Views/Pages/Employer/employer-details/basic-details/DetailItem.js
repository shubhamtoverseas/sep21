import React from "react";
import PropTypes from "prop-types";

import "../employer-detail.css";

const DetailItem = React.memo(function DetailItem({ title, desc, columnSize, className, isHighlighted = '' }) {
    return (
        <div className={ `${ columnSize } detail-item` }>
            <div className={`${isHighlighted} title mb-1`}>{ title }</div>
            <div className={ `desc text-break ${ className ? className : 'black' }` }>{ desc }</div>
        </div>
    );
});

DetailItem.propTypes = {
    isHighlighted: PropTypes.string,
    title: PropTypes.string.isRequired,
    desc: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    columnSize: PropTypes.string.isRequired,
    className: PropTypes.string
};
export default DetailItem;