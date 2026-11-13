/* Hong Kong wall-clock helpers for the Calendar. Every value is an ISO date string ("YYYY-MM-DD") or "HH:MM";
   nothing is parsed into a browser-local Date for a HK time (CR 292: times are HKT exactly as the source records them). */

const HK_TZ = 'Asia/Hong_Kong';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const pad = (n) => String(n).padStart(2, '0');
export const isIsoDate = (value) => ISO_DATE.test(String(value || ''));

/* today's date in Hong Kong, regardless of the browser zone (en-CA formats as YYYY-MM-DD) */
export const todayHK = () => new Intl.DateTimeFormat('en-CA', { timeZone: HK_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/* a calendar date as a local Date at midnight — used only for weekday / month arithmetic, never for a HK time */
export const toDate = (iso) => {
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(y, m - 1, d);
};
export const fromDate = (date) => `${ date.getFullYear() }-${ pad(date.getMonth() + 1) }-${ pad(date.getDate()) }`;

export const addDays = (iso, days) => {
    const date = toDate(iso);
    date.setDate(date.getDate() + days);
    return fromDate(date);
};

/* Monday-first week */
export const weekStart = (iso) => {
    const date = toDate(iso);
    const shift = (date.getDay() + 6) % 7;
    return addDays(iso, -shift);
};

export const timeToMinutes = (hhmm) => {
    if (!hhmm) return null;
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + (m || 0);
};
export const minutesToTime = (minutes) => `${ pad(Math.floor(minutes / 60) % 24) }:${ pad(minutes % 60) }`;
export const addMinutes = (hhmm, minutes) => minutesToTime(timeToMinutes(hhmm) + minutes);
/* "09:30:00" → "09:30"; anything unparseable → null */
export const normalizeTime = (value) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(value || '').trim());
    return m ? `${ pad(Number(m[1])) }:${ m[2] }` : null;
};

/* "Wed 16 Sep 2026" */
export const formatDayLabel = (iso) => {
    const d = toDate(iso);
    return `${ DOW[d.getDay()] } ${ d.getDate() } ${ MON[d.getMonth()] } ${ d.getFullYear() }`;
};
/* "14 Sep – 20 Sep 2026" */
export const formatRangeLabel = (startIso, endIso) => {
    const s = toDate(startIso), e = toDate(endIso);
    return `${ s.getDate() } ${ MON[s.getMonth()] } – ${ e.getDate() } ${ MON[e.getMonth()] } ${ e.getFullYear() }`;
};
/* "2026-10-06 16:23:00" → "6 Oct 2026 16:23" (a Hong Kong wall-clock stamp as the API returns it; never re-zoned) */
export const formatStamp = (value) => {
    const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(String(value || ''));
    if (!m) return String(value || '');
    const d = toDate(m[1]);
    return `${ d.getDate() } ${ MON[d.getMonth()] } ${ d.getFullYear() } ${ m[2] }`;
};
/* "16 Sep" */
export const formatShortDate = (iso) => {
    const d = toDate(iso);
    return `${ d.getDate() } ${ MON[d.getMonth()] }`;
};
/* "Wed 16 Sep" (prototype task-ui fDshort: day headings, overdue rows, sheet kickers) */
export const formatShortDateDow = (iso) => {
    const d = toDate(iso);
    return `${ DOW[d.getDay()] } ${ d.getDate() } ${ MON[d.getMonth()] }`;
};
export const dayOfWeekLabel = (iso) => DOW[toDate(iso).getDay()].toUpperCase();
export const dayNumber = (iso) => toDate(iso).getDate();
