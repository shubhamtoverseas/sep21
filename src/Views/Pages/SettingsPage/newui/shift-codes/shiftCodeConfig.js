import dayjs from "dayjs";
import { calculateShiftDuration } from "../../../../../utils/utils";
import { MINUTES_PER_HOUR, SHIFT_DURATION_LABELS, SHIFT_TIME_API_FORMAT } from "../settingsNewUiConstants";

/** "h:mm A" (API) → Date for today (legacy EditShiftCodePopup.parseShiftTime). */
export const parseShiftTime = (timeString) => {
    if (!timeString) return null;
    const [time, modifier] = timeString.split(" ");
    const [rawHours, minutes] = time.split(":");
    let hours = parseInt(rawHours, 10);
    if (modifier === "PM" && rawHours !== "12") hours += 12;
    if (modifier === "AM" && rawHours === "12") hours = 0;
    const date = new Date();
    date.setHours(hours, parseInt(minutes, 10), 0, 0);
    return date;
};

/** Form row (Date values) → API row (h:mm A strings + decimal duration). */
export const toShiftCodeApiRow = (row) => ({
    shift_code: row.shift_code,
    shift_start_time: dayjs(row.shift_start_time).format(SHIFT_TIME_API_FORMAT),
    shift_end_time: dayjs(row.shift_end_time).format(SHIFT_TIME_API_FORMAT),
    duration: calculateShiftDuration(row.shift_start_time, row.shift_end_time),
});

export const hasDuplicateShiftCodes = (rows) => {
    const codes = rows.map((row) => row.shift_code);
    return new Set(codes).size !== codes.length;
};

/** Decimal hours → "8 hr 30 min" (legacy list column). */
export const formatDurationLabel = (durationHours) => {
    const totalMinutes = Math.round((Number(durationHours) || 0) * MINUTES_PER_HOUR);
    const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
    const minutes = totalMinutes % MINUTES_PER_HOUR;
    if (hours > 0 && minutes > 0) return `${hours} ${SHIFT_DURATION_LABELS.HOURS} ${minutes} ${SHIFT_DURATION_LABELS.MINUTES}`;
    if (hours > 0) return `${hours} ${SHIFT_DURATION_LABELS.HOURS}`;
    return `${minutes} ${SHIFT_DURATION_LABELS.MINUTES}`;
};
