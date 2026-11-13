import React from "react";
import PropTypes from "prop-types";
import constData from "../ReusableComponents/constants";
import "./EngagementIcon.css";

/* Current-engagement glyph for Employer / Job Offer listings (DASH §5): App, Web or staff-assisted.
   Shape and accessible label stay distinguishable without colour; no engagement renders an empty neutral circle. */
const EngagementIcon = ({ kind, className }) => {
    const meta = constData.ENGAGEMENT_ICONS[kind];
    const classes = ["mc-engagement", meta ? `mc-engagement-${ kind }` : "mc-engagement-none", className].filter(Boolean).join(" ");
    if (!meta) return <span className={ classes } aria-hidden="true" />;
    const label = meta.label;
    return (
        <span className={ classes } role="img" title={ label } aria-label={ label }>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                { meta.shapes.map(([tag, attrs], index) => React.createElement(tag, { key: index, ...attrs })) }
            </svg>
        </span>
    );
};

EngagementIcon.propTypes = {
    kind: PropTypes.oneOf(["app", "web", "staff"]),
    className: PropTypes.string,
};

export default React.memo(EngagementIcon);
