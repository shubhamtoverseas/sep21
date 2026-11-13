import React from "react";

export const videoIcon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7d8492" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 6.5h11v11H4v-11zm11 4 5-3v9l-5-3" />
    </svg>
);

export const buildingIcon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7d8492" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 20V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v14M4 20h16m-6 0v-9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v9M7.5 8.5h3m-3 3.5h3m-3 3.5h3" />
    </svg>
);

/* the interview type arrives as a number or a numeric string depending on the endpoint */
export const ivMethodIcon = (type) => (Number(type) === 1 ? videoIcon : Number(type) === 2 ? buildingIcon : null);
