import dayjs from "dayjs";
import translation from "../../../../../utils/translation";
import { formatDate, getTimeRequestStatusLabel } from "../../../../../services/commonService";
import {
    HALF_DAY_OPTIONS,
    LEAVE_DATE_DISPLAY_FORMAT,
    LEAVE_STATUS_LABEL_KEYS,
    LEAVE_STATUS_TONES,
    NON_REPORTEES_FLAG,
    TIME_REQUEST_STATUS_TONES,
    TIME_UNIT_LABELS,
} from "../settingsNewUiConstants";

export const asArray = (value) => (Array.isArray(value) ? value : []);

/** Legacy `order.map(id => byId[id])` pattern shared by every HRMS slice. */
export const orderedRows = (byId, order) => (asArray(order).length ? order.map((id) => byId?.[id]).filter(Boolean) : []);

export const formatLeaveDate = (value) => (value ? dayjs(value).format(LEAVE_DATE_DISPLAY_FORMAT) : "");

/** Legacy `dateRange.startDate ? formatDate(...) : null` request fields. */
export const dateRangeQuery = (dateRange) => ({
    search_from_date: dateRange?.startDate ? formatDate(dateRange.startDate) : null,
    search_to_date: dateRange?.endDate ? formatDate(dateRange.endDate) : null,
});

export const nonReporteesFlag = (showNonReportees) => (showNonReportees ? NON_REPORTEES_FLAG.YES : NON_REPORTEES_FLAG.NO);

export const leaveStatusLabel = (status) => {
    const key = LEAVE_STATUS_LABEL_KEYS[Number(status)];
    return key ? translation(key) : "";
};

export const leaveStatusTone = (status) => LEAVE_STATUS_TONES[Number(status)] || "neutral";

export const halfDayLabel = (value) => {
    const option = HALF_DAY_OPTIONS.find((item) => item.value === value);
    return option ? translation(option.labelKey) : "";
};

export const halfDayOptions = () => HALF_DAY_OPTIONS.map((option) => ({ value: option.value, label: translation(option.labelKey) }));

/** Legacy getTimeRequestStatusLabel label + a real tag tone. */
export const timeRequestStatus = (status) => {
    const parsed = parseInt(status, 10);
    return { label: getTimeRequestStatusLabel(parsed)?.label || "-", tone: TIME_REQUEST_STATUS_TONES[parsed] || "neutral" };
};

/* a missing pair (old rows carry no approved time) reads N/A, never "null hrs null mins" (backend 353) */
export const formatHoursMinutes = (hours, minutes) => (hours == null || minutes == null ? "" : `${hours} ${TIME_UNIT_LABELS.HOURS} ${minutes} ${TIME_UNIT_LABELS.MINUTES}`);

/* U-0438: the Add Time Credit day cap is the BRANCH's today (Hong Kong, UTC+8, no DST), not the device clock */
export const branchTodayIso = () => dayjs().utc().add(8, "hour").format("YYYY-MM-DD");

/** Legacy `${h}:${m}` (24h) string from a Date. */
export const toClockString = (date) => (
    date ? `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}` : ""
);

/** bug log #87: the HRMS lists send sort_by / sort_order — paging, per-page and refresh carry the active sort. */
export const hrmsSortQuery = (sort) => (sort?.sort ? { sort_by: sort.sort, sort_order: sort.order } : {});
