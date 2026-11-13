import React from "react";
import PropTypes from "prop-types";
import "./jo-status-tag.css";
import translation from "../../../../utils/translation";
import { JO_STATUS, JO_STATUS_FALLBACK } from "../jobOfferConstants";

export const joStatusLabel = (status) => {
    const meta = JO_STATUS[status];
    return meta ? (meta.key ? translation(meta.key) : meta.label) : '';
};

const JoStatusTag = ({ status, className = "" }) => {
    const meta = JO_STATUS[status] || JO_STATUS_FALLBACK;
    const label = meta.key ? translation(meta.key) : meta.label;
    return (
        <span
            className={ `mc-status-tag-v17 jo-status-tag tone-${ meta.tone } ${ meta.treatment === 'hollow' ? 'hollow' : 'filled' } ${ className }`.trim() }
            data-mc-status-domain="job-offer"
            data-mc-status-value={ meta.value }
            data-mc-status-tone={ meta.tone }
            data-mc-status-treatment={ meta.treatment }
        >
            { label }
        </span>
    );
};

JoStatusTag.propTypes = {
    status: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    className: PropTypes.string,
};

export default React.memo(JoStatusTag);
