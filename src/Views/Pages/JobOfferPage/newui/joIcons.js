import React from "react";
import PropTypes from "prop-types";

const PATHS = {
    video: <path d="M4 6.5h11v11H4v-11zm11 4 5-3v9l-5-3" strokeWidth="1.8" />,
    building: <path d="M4 21V4l8-2v19M12 7h8v14M8 7h.01M8 11h.01M8 15h.01M16 11h.01M16 15h.01M2 21h20" strokeWidth="1.7" />,
    share: <path d="M9 13.5 15 17m0-10-6 3.5M18 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm0 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" strokeWidth="1.8" />,
    chat: <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-5 4z" strokeWidth="1.8" />,
    link: <path d="M10 14a4.6 4.6 0 0 0 6.6.4l2.5-2.5a4.7 4.7 0 0 0-6.6-6.6L11 6.8M14 10a4.6 4.6 0 0 0-6.6-.4L4.9 12a4.7 4.7 0 0 0 6.6 6.6l1.4-1.4" strokeWidth="1.8" />,
    sliders: <path d="M5 7h8m4 0h2M5 12h2m4 0h8M5 17h11m3 0h0M13 5v4m-6 3v0m0-2v4m11 1v4" strokeWidth="1.8" />,
};

const JoIcon = ({ name, size = 14, className = "" }) => (
    <svg width={ size } height={ size } viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={ className }>
        { PATHS[name] || null }
    </svg>
);

JoIcon.propTypes = {
    name: PropTypes.oneOf(Object.keys(PATHS)).isRequired,
    size: PropTypes.number,
    className: PropTypes.string,
};

export default React.memo(JoIcon);
