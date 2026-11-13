import dayjs from "../../../../utils/dayjsConfig";
import { CHECKIN_ERROR_CODES, CHECKIN_SESSION_CAP_MIN } from "../workerModuleConstants";

/* Check-in drawer readers for the delivered session contract (backend 374, Priyanka v18 §T.1):
   `checked_in_at` / `valid_until` are UTC `YYYY-MM-DD HH:mm:ss`; `can_extend` says whether +60 stays within the 8 h day. */
export const utcToLocalClock = (utc) => {
    if (!utc) return "";
    const d = dayjs(`${ String(utc).trim().replace(" ", "T") }Z`);
    return d.isValid() ? d.format("HH:mm") : String(utc);
};

export const isSessionCapped = (row) => (
    row?.can_extend === true || row?.can_extend === false ? !row.can_extend : Number(row?.minutes_used ?? 0) >= CHECKIN_SESSION_CAP_MIN
);

/* after a refused extend: 404 (session already over) and 409 (cap reached) mean the list is stale — reload it */
export const extendRefusalReloads = (code) => code === CHECKIN_ERROR_CODES.SESSION_NOT_FOUND || code === CHECKIN_ERROR_CODES.DAILY_CAP_REACHED;
