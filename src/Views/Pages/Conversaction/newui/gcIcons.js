import React from "react";
import PropTypes from "prop-types";

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8 };

const ICONS = {
    search: <path { ...STROKE } d="M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM20 20l-4.8-4.8" />,
    filter: <path { ...STROKE } d="M4 6h16m-13 6h10m-7 6h4" />,
    chevD: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="m7 10 5 5 5-5" />,
    plus: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 5v14M5 12h14" />,
    sliders: <path { ...STROKE } strokeLinecap="round" d="M5 7h8m4 0h2M5 12h2m4 0h8M5 17h11m3 0h0M13 5v4m-6 3v0m0-2v4m11 1v4" />,
    close: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />,
    back: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M14.5 6 8.5 12l6 6" />,
    link: <path fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" d="M10 14a4.6 4.6 0 0 0 6.6.4l2.5-2.5a4.7 4.7 0 0 0-6.6-6.6L11 6.8M14 10a4.6 4.6 0 0 0-6.6-.4L4.9 12a4.7 4.7 0 0 0 6.6 6.6l1.4-1.4" />,
    open: <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M14 4h6v6m0-6-9 9M11 5H5.5A1.5 1.5 0 0 0 4 6.5v12A1.5 1.5 0 0 0 5.5 20h12a1.5 1.5 0 0 0 1.5-1.5V13" />,
    share: <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M9 13.5 15 17m0-10-6 3.5M18 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm0 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />,
    job: <g { ...STROKE }><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></g>,
    mobile: <g fill="none" stroke="currentColor" strokeLinecap="round"><rect x="7" y="2.4" width="10" height="19.2" rx="2.4" strokeWidth="1.8" /><path strokeWidth="1.5" d="M10.7 5.3h2.6" /><path strokeWidth="1.8" d="M11 18.6h2" /></g>,
    wa: <path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 1.8a8.2 8.2 0 1 1-4.2 15.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 0 1 12 3.8zM8.9 7.2c-.2 0-.5 0-.7.3-.2.3-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.8 2.8 4.3 3.8 2.1.8 2.6.7 3 .6.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.4-.3-1.5-.7c-.2 0-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.1-.2 0-.4.1-.5l.5-.5.3-.5v-.5L10.8 7.6c-.2-.4-.4-.4-.5-.4h-.5z" />,
    lineapp: <path fill="currentColor" d="M12 2.5c-5.5 0-10 3.6-10 8.1 0 4 3.6 7.4 8.4 8 .3.1.8.2.9.5.1.3 0 .7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.6 8.2-6.1 1.5-1.6 2.2-3.3 2.2-5 0-4.4-4.5-8-10.5-8zM7.4 13.8H5.2a.5.5 0 0 1-.5-.5V9.2a.5.5 0 0 1 1 0v3.6h1.7a.5.5 0 0 1 0 1zm1.9-.5a.5.5 0 0 1-1 0V9.2a.5.5 0 0 1 1 0v4.1zm5 0a.5.5 0 0 1-.9.3l-2.1-2.9v2.6a.5.5 0 0 1-1 0V9.2a.5.5 0 0 1 .9-.3l2.1 2.9V9.2a.5.5 0 0 1 1 0v4.1zm3.4-2.6a.5.5 0 0 1 0 1h-1.7v1.1h1.7a.5.5 0 0 1 0 1h-2.2a.5.5 0 0 1-.5-.5V9.2c0-.3.2-.5.5-.5h2.2a.5.5 0 0 1 0 1h-1.7v1h1.7z" />,
    template: <path { ...STROKE } d="M5 3.5h14v17H5v-17zM8.5 8h7m-7 4h7m-7 4h4" />,
    attach: <path { ...STROKE } strokeLinecap="round" d="m17.5 11.5-6.1 6.1a4.2 4.2 0 0 1-6-6l7.2-7.2a2.9 2.9 0 0 1 4.1 4.1l-7.1 7.1a1.6 1.6 0 0 1-2.3-2.3l6-6" />,
    send: <path fill="currentColor" d="M3.4 20.4 20.8 12 3.4 3.6l2 6.9L14 12l-8.6 1.5-2 6.9z" />,
    clock: <path fill="none" stroke="currentColor" strokeWidth="1.9" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v5l3.5 2" />,
    lock: <path { ...STROKE } d="M6.5 10.5V8a5.5 5.5 0 0 1 11 0v2.5m-13 0h15v10h-15v-10zM12 14v3" />,
    check: <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.5 5 5 10-11" />,
    warn: <path fill="currentColor" d="M12 2.5 23 21H1L12 2.5zM11 9v5.5h2V9h-2zm0 7.5v2h2v-2h-2z" />,
    globe: <path fill="none" stroke="currentColor" strokeWidth="1.6" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0 0c2.5-2 4-5.2 4-9s-1.5-7-4-9c-2.5 2-4 5.2-4 9s1.5 7 4 9zM3.5 12h17" />,
    dots: <path fill="currentColor" d="M12 8a1.7 1.7 0 1 0 0-3.4A1.7 1.7 0 0 0 12 8zm0 5.7a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4zm0 5.7a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4z" />,
    chat: <path { ...STROKE } d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-5 4z" />,
    chevDown: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="m7 10 5 5 5-5" />,
    arrowDownDouble: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m6 6 6 6 6-6M6 13l6 6 6-6" />,
    employer: <g { ...STROKE }><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" /><path d="M10 21v-3h4v3" /></g>,
    worker: <g { ...STROKE }><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></g>,
    shield: <path { ...STROKE } strokeLinejoin="round" d="M12 3 5 5.8v5.4c0 4.3 2.9 8.3 7 9.8 4.1-1.5 7-5.5 7-9.8V5.8L12 3z" />,
    team: <g { ...STROKE }><circle cx="9" cy="8.5" r="3.2" /><path d="M2.8 20c.5-3.4 3-5.3 6.2-5.3s5.7 1.9 6.2 5.3" /><circle cx="17" cy="9.5" r="2.6" /><path d="M15.4 14.9c2.9.2 5.1 1.9 5.6 5.1" /></g>,
    group: <g { ...STROKE }><circle cx="8.5" cy="9" r="3" /><circle cx="15.5" cy="9" r="3" /><path d="M2.5 20c.5-3.2 2.8-5 6-5 1.4 0 2.6.3 3.5 1 .9-.7 2.1-1 3.5-1 3.2 0 5.5 1.8 6 5" /></g>,
    video: <path { ...STROKE } d="M4 6.5h11v11H4v-11zm11 4 5-3v9l-5-3" />,
    building: <path { ...STROKE } d="M4 20V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v14M4 20h16m-6 0v-9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v9M7.5 8.5h3m-3 3.5h3m-3 3.5h3" />,
};

const GcIcon = React.memo(function GcIcon({ name, className }) {
    const body = ICONS[name];
    if (!body) return null;
    return (
        <svg className={ className } viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            { body }
        </svg>
    );
});

GcIcon.propTypes = {
    name: PropTypes.string.isRequired,
    className: PropTypes.string,
};

export default GcIcon;
