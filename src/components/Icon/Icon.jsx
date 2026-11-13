import React from "react";
import PropTypes from "prop-types";

/* ============================================================
 * Icon — Lucide-style line icons, stroke = currentColor.
 * Ported verbatim from the new-UI design bundle so the admin
 * portal renders pixel-identical glyphs. Extra glyphs the app
 * needs (menu / logout / handshake / panel toggles) are appended
 * in the same 24×24 stroke style.
 * ============================================================ */
const ICONS = {
  /* nav + topbar */
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9h5v-6h4v6h5v-9" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" /><path d="M10 21v-3h4v3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  /* deactivated staff account (Tabler "user-off", MIT): the shared inactive-staff cue (UI Correction C3) */
  user_off: <><path d="M8.18 8.189a4.01 4.01 0 0 0 2.616 2.627m3.507-.545a4 4 0 1 0-5.59-5.552" /><path d="M6 21v-2a4 4 0 0 1 4-4h4c.412 0 .81.062 1.183.178m2.633 2.618c.12.38.184.785.184 1.204v2" /><path d="M3 3l18 18" /></>,
  filetext: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  progress: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  shield: <><path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6z" /></>,
  chart: <><path d="M3 21V3" /><path d="M7 21v-7M11 21v-12M15 21v-5M19 21v-9" /></>,
  cog: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
  msg: <><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-5 4z" /></>,
  inbox: <><path d="M3 13h5l2 3h4l2-3h5" /><path d="M5 3h14l2 10v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z" /></>,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  /* table + actions */
  refresh: <><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" /><path d="M3 21v-5h5" /></>,
  filter: <><path d="M3 5h18l-7 9v6l-4-2v-4z" /></>,
  columns: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v18" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  chev_down: <><path d="m6 9 6 6 6-6" /></>,
  chev_up: <><path d="m6 15 6-6 6 6" /></>,
  chev_left: <><path d="m15 6-6 6 6 6" /></>,
  chev_right: <><path d="m9 6 6 6-6 6" /></>,
  sort: <><path d="M8 4v16M5 17l3 3 3-3" /><path d="M16 20V4M13 7l3-3 3 3" /></>,
  sort_asc: <><path d="M8 4v16M5 17l3 3 3-3" /></>,
  sort_desc: <><path d="M8 20V4M5 7l3-3 3 3" /></>,
  x: <><path d="m6 6 12 12M6 18 18 6" /></>,
  close: <><path d="m6 6 12 12M6 18 18 6" /></>,
  more: <><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>,
  more_v: <><circle cx="12" cy="5" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="12" cy="19" r="1.2" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v.5" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.3a2.4 2.4 0 1 1 3.4 2.2c-.7.3-1 .9-1 1.5v.4" /><path d="M12 17h.01" /></>,
  /* listing sort indicators (Contracts dashboard): direction arrows + the status-aware "priority" lines */
  arrow_up: <><path d="M12 19V5M6 11l6-6 6 6" /></>,
  arrow_down: <><path d="M12 5v14M6 13l6 6 6-6" /></>,
  priority: <><path d="M4 7h16M4 12h10M4 17h5" /></>,
  lock: <><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  /* Documents view: folder chip, Gallery / List segment */
  folder: <><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  list: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  external: <><path d="M14 4h6v6" /><path d="m10 14 10-10" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>,
  check: <><path d="m4 12 5 5L20 6" /></>,
  alert: <><path d="M12 9v4M12 17v.5" /><path d="M10.3 3.4 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0z" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
  download: <><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
  paperclip: <><path d="m21 11-8 8a5 5 0 0 1-7-7l9-9a3 3 0 0 1 4 4l-9 9a1 1 0 0 1-1-1l8-8" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="1.5" /><path d="M5 15V5a1 1 0 0 1 1-1h10" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  trash: <><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M5 6h14l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z" /></>,
  /* nav: devices */
  laptop: <><rect x="3" y="5" width="18" height="11" rx="1" /><path d="M2 19h20" /></>,
  smartphone: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></>,
  tablet: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M11 18h2" /></>,
  terminal: <><path d="m5 8 4 4-4 4M12 16h7" /><rect x="2" y="3" width="20" height="18" rx="2" /></>,
  /* topbar */
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 4 9 14 14 0 0 1-4 9 14 14 0 0 1-4-9 14 14 0 0 1 4-9z" /></>,
  /* processing-specific */
  plane: <><path d="M21 14 2 9V7l19 4z" /><path d="m9 11 3 7-1 1-4-5" /><path d="m6 15 2 1" /></>,
  pin: <><path d="M12 22s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12z" /><circle cx="12" cy="10" r="2.5" /></>,
  stamp: <><path d="M5 21h14" /><path d="M7 18h10v-3l-1.5-1.5a1 1 0 0 1-.3-.7V8a3 3 0 1 0-6.4 0v4.8a1 1 0 0 1-.3.7L7 15z" /></>,
  hospital: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8M8 12h8" /></>,
  link: <><path d="M10 13a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1" /><path d="M14 11a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1" /></>,
  /* ---- app extras (same Lucide stroke style) ---- */
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  menu: <><path d="M3 6h18M3 12h18M3 18h18" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  handshake: <><path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /><path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" /></>,
  panel_close: <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path d="m16 15-3-3 3-3" /></>,
  panel_open: <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path d="m14 9 3 3-3 3" /></>,
};

const Icon = ({ name, size = 16, strokeWidth = 1.6, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden="true"
  >
    {ICONS[name] || null}
  </svg>
);

Icon.propTypes = {
  name: PropTypes.string.isRequired,
  size: PropTypes.number,
  strokeWidth: PropTypes.number,
  className: PropTypes.string,
  style: PropTypes.object,
};

export const ICON_NAMES = Object.keys(ICONS);

export default React.memo(Icon);
