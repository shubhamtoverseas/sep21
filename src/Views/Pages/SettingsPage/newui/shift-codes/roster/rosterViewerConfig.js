import dayjs from "dayjs";
import translation from "../../../../../../utils/translation";
import { DATE_DISPLAY_FORMAT, DEFAULT_PAGE_LIMIT, ROSTER_DAY_FORMAT, ROSTER_DEFAULT_USER_IDS } from "../../settingsNewUiConstants";

const API_DATE = "YYYY-MM-DD";

export const buildDefaultRosterFilters = () => {
    const today = dayjs();
    return {
        from_date: today.startOf("month").format(API_DATE),
        to_date: today.format(API_DATE),
        user_ids: [...ROSTER_DEFAULT_USER_IDS],
        search: "",
        sort: "",
        order: "",
        page: 1,
        limit: DEFAULT_PAGE_LIMIT,
    };
};

/** Legacy /roster-view contract (ShiftRosterViewerPage.buildApiPayload). */
export const buildRosterPayload = (filters) => ({
    user_id: filters.user_ids || [],
    shift_from_date: filters.from_date || "",
    shift_to_date: filters.to_date || "",
    limit: filters.limit || DEFAULT_PAGE_LIMIT,
    page: filters.page || 1,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.sort ? { sort: filters.sort, order: filters.order } : {}),
});

export const formatRosterDate = (value) => (value && dayjs(value).isValid() ? dayjs(value).format(DATE_DISPLAY_FORMAT) : "");
export const formatRosterDay = (value) => (value && dayjs(value).isValid() ? dayjs(value).format(ROSTER_DAY_FORMAT) : "");

/** Rows → export sheet (legacy exportToExcel column set). bug log #34 (fixed 2026-10-18): table and export read the
    same holiday flag — `has_holiday`, falling back to the legacy export's `is_holiday`. */
export const toRosterExportRows = (rows) => rows.map((row) => ({
    [translation("key_username")]: row?.username || "",
    [translation("key_date")]: formatRosterDate(row?.shift_date),
    [translation("key_day")]: formatRosterDay(row?.shift_date),
    [translation("key_shift_start")]: row?.shift_start_time || "",
    [translation("key_shift_end")]: row?.shift_end_time || "",
    [translation("key_shift_code")]: row?.shift_code || "",
    [translation("key_holiday")]: (row?.has_holiday ?? row?.is_holiday) ? translation("key_yes") : translation("key_no"),
}));
