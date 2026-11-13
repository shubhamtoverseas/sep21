import dayjs from "dayjs";
import routes from "../routes/routesConfig";
import { workerDetailsPath } from "../WorkerPage/workerModuleConstants";
/* Reports — module constants */

/* Default duration on every report's PRIMARY date chip: Last 7 days, pre-selected and applied to the first fetch
   (Mubin 5 Nov). Secondary date chips (Visa Expiry Date etc.) stay empty. */
export const reportDefaultDateRange = () => ({
    startDate: dayjs().startOf("day").subtract(6, "day").toDate(),
    endDate: dayjs().startOf("day").toDate(),
});

/* Status chips on the report tables use the kit Badge (the Invoice list chip: dot + text, 20px, tone by variant)
   instead of the legacy `btn chip small <status>` buttons (user, 1 Nov). Keys are the legacy status class suffixes. */
export const TIME_REQUEST_STATUS_VARIANT = Object.freeze({
    pending: "warning", approved: "success", rejected: "danger", withdrawn: "neutral", unknown: "neutral",
});
export const CONTRACT_REPORT_STATUS_VARIANT = Object.freeze({
    processing: "warning", active: "success", completed: "info", cancelled: "danger", withdrawn: "neutral",
});
export const INTERVIEW_STATUS_VARIANT = Object.freeze({
    invited: "info", applied: "info", matched: "info", pending: "warning", upcoming: "attention", completed: "success", cancelled: "danger",
});
export const REPORT_CHIP_DEFAULT_VARIANT = "neutral";

/* the legacy helpers return `className: "chip approved"`; the last word is the status key */
export const statusKeyOf = (className) => String(className || "").trim().split(/\s+/).pop().toLowerCase();

/* Feedback Report → entry dialog (user, 1 Nov): the feedback row's `created_by_type` and the code keys the list API carries.
   Backend 376 (v20 §V.3): `feedback_user_reference_id` already picks the employer or worker code by `created_by_type`;
   the two model keys stay as the fallback */
export const FEEDBACK_USER_TYPE_KEYS = Object.freeze({ employer: "key_employer", worker: "key_worker" });
export const FEEDBACK_CODE_KEYS = Object.freeze(["feedback_user_reference_id", "feedbackByUser.workerModel.reference_id", "feedbackByUser.employerModel.reference_id"]);
export const FEEDBACK_TIMESTAMP_FORMAT = "YYYY-MM-DD HH:mm:ss";
/* User filter on the five HRMS reports (ClickUp 14ykpqtyr0q; Priyanka 5 Nov, backend 393): the dropdown is
   `GET hrms/calendar/users-list?module=<report permission key>` → [{ user_id, name }] in the report's own scope,
   full reportee tree to the lowest level (403 without the report grant); each report takes `user_id` as an
   array ([] = no filter; an id outside the scope returns no rows) */
export const SESSION_HISTORY_USERS_QUERY = Object.freeze({ module: "session_history_report" });
export const SCHEDULE_COMPLIANCE_USERS_QUERY = Object.freeze({ module: "schedule_compliance_report" });
export const LEAVE_HISTORY_USERS_QUERY = Object.freeze({ module: "applied_leave_history_report" });
export const TIME_ENTRY_USERS_QUERY = Object.freeze({ module: "time_credit_report" });
export const TIME_REQUEST_USERS_QUERY = Object.freeze({ module: "time_request_report" });

/* Feedback dialog → the record (backend 390, 4 Nov): `feedback_user_id` is the employer's id when `created_by_type` is employer,
   the worker's id when worker, null otherwise (then the code shows without a link) */
export const feedbackRecordPath = (row) => {
    const id = row?.feedback_user_id;
    if (id === null || id === undefined || id === "") return null;
    const type = String(row?.created_by_type || "").toLowerCase();
    if (type === "employer") return routes.employerDetails.replace(":employer_id", String(id));
    if (type === "worker") return workerDetailsPath(id);
    return null;
};

