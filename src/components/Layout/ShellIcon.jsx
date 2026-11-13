import React from "react";
import PropTypes from "prop-types";
import Icon from "../Icon/Icon";

/* Canonical shell icon paths from the MaidMatch design bundle (v17 rail).
   Names not in this set fall back to the shared Icon component. */
const PATHS = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V9a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    building: <path d="M4 21V4l8-2v19M12 7h8v14M8 7h.01M8 11h.01M8 15h.01M16 11h.01M16 15h.01M2 21h20" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    contracts: <><path d="M7 3h8l4 4v14H7zM15 3v5h5M10 12h6M10 16h6" /><path d="M4 6v15h11" /></>,
    receipt: <path d="M6 3h12v19l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h4" />,
    shield: <><path d="M12 2 20 5v6c0 5-3.2 8.5-8 11-4.8-2.5-8-6-8-11V5z" /><path d="m9 12 2 2 4-5" /></>,
    chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    cog: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.7 5.5 3.7 9S14.5 18.5 12 21c-2.5-2.5-3.7-5.5-3.7-9S9.5 5.5 12 3" /></>,
    bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
    chev_down: <path d="m6 9 6 6 6-6" />,
};

const ShellIcon = ({ name, size = 19, strokeWidth = 1.6 }) => {
    if (!PATHS[name]) return <Icon name={ name } size={ size } strokeWidth={ strokeWidth } />;
    return (
        <svg
            width={ size }
            height={ size }
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={ strokeWidth }
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            { PATHS[name] }
        </svg>
    );
};

ShellIcon.propTypes = {
    name: PropTypes.string.isRequired,
    size: PropTypes.number,
    strokeWidth: PropTypes.number,
};

export default React.memo(ShellIcon);
