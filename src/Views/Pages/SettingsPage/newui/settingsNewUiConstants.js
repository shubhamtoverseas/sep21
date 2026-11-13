import {
    configurationLinksConfig,
    leaveManagementConfig,
    masterLinksConfig,
    peopleLinksConfig,
    shiftManagementConfig,
    SETTINGS_LINK_LABELS,
} from "../../../../components/ReusableComponents/app-configs";
import copyKeys from "../../../../utils/copyKeys";
import routes from "../../routes/routesConfig";


/* ── Settings home ───────────────────────────────────────────────────────── */
export const SETTINGS_PERMISSION_SCOPE = Object.freeze({
    SETTINGS: "settings",
    USERS: "users",
    LEAVE: "leave",
    SHIFT: "shift",
    CONFIGURATION: "configuration",
});

export const SETTINGS_GROUPS = Object.freeze([
    { id: "company_master", titleKey: "key_company_master", scope: SETTINGS_PERMISSION_SCOPE.SETTINGS, getLinks: masterLinksConfig },
    { id: "people", titleKey: "key_people", scope: SETTINGS_PERMISSION_SCOPE.USERS, getLinks: peopleLinksConfig },
    { id: "leave_management", titleKey: "key_leave_management", scope: SETTINGS_PERMISSION_SCOPE.LEAVE, getLinks: leaveManagementConfig },
    { id: "shift_management", titleKey: "key_shift_management", scope: SETTINGS_PERMISSION_SCOPE.SHIFT, getLinks: shiftManagementConfig },
    { id: "configuration", titleKey: "key_configuration", scope: SETTINGS_PERMISSION_SCOPE.CONFIGURATION, getLinks: configurationLinksConfig },
]);

/* ── Settings listings (shared contract) ─────────────────────────────────── */
export const SETTINGS_STATUS = Object.freeze({ INACTIVE: 0, ACTIVE: 1, ALL: 2 });

export const SETTINGS_STATUS_FILTER_ORDER = Object.freeze([SETTINGS_STATUS.ACTIVE, SETTINGS_STATUS.INACTIVE, SETTINGS_STATUS.ALL]);

export const SORT_ORDER = Object.freeze({ ASC: "asc", DESC: "desc" });

export const DEFAULT_PAGE_LIMIT = 10;

export const DEFAULT_SETTINGS_LIST_FILTERS = Object.freeze({
    search_text: "",
    status: SETTINGS_STATUS.ACTIVE,
    sort_by: "",
    sort_order: "",
    page: 1,
    limit: DEFAULT_PAGE_LIMIT,
});

/* ── Agencies ────────────────────────────────────────────────────────────── */
export const AGENCY_VIEW_STATE_KEY = "agl_view_state_v1";

export const AGENCY_SORT_KEYS = Object.freeze({
    NAME: "agency_name",
    TYPE: "agency_type",
    CATEGORY: "agency_category",
    CODE: "agency_code",
});

export const AGENCY_TYPE = Object.freeze({ INTERNAL: "internal", EXTERNAL: "external" });
export const AGENCY_CATEGORY = Object.freeze({ HOST: "host", PARTNER: "partner" });

export const AGENCY_TYPE_OPTIONS = Object.freeze([
    { value: AGENCY_TYPE.INTERNAL, key: "key_internal_agency" },
    { value: AGENCY_TYPE.EXTERNAL, key: "key_external_agency" },
]);

export const AGENCY_CATEGORY_OPTIONS = Object.freeze([
    { value: AGENCY_CATEGORY.HOST, key: "key_host" },
    { value: AGENCY_CATEGORY.PARTNER, key: "key_partner" },
]);

export const COUNTRY_LOOKUP_TYPE = Object.freeze({ WORKER_HOME: "worker_home", EMPLOYER: "employer", WORKER_ONLY: "worker_only" });

export const AGENCY_CODE_MAX_LENGTH = 4;
export const POC_NAME_MAX_LENGTH = 30;
export const BRANCH_ADDRESS_MAX_LENGTH = 300;

export const NON_ALPHANUMERIC_REGEX = /[^A-Za-z0-9]/g;
export const NON_LETTER_REGEX = /[^A-Za-z]/g;

/* ── Branches ────────────────────────────────────────────────────────────── */
export const BRANCH_VIEW_STATE_KEY = "brl_view_state_v1";

export const BRANCH_SORT_KEYS = Object.freeze({
    NAME: "branch_name",
    CODE: "branch_code",
    PROVINCE: "district_name",
    COUNTRY: "country_name",
    PHONE: "branch_phone_number",
    POC: "branch_poc",
});

export const ACTIVE_AGENCIES_QUERY = Object.freeze({ status: SETTINGS_STATUS.ACTIVE });

/* ── Roles ───────────────────────────────────────────────────────────────── */
export const ROLE_VIEW_STATE_KEY = "rol_view_state_v1";

export const ROLE_SORT_KEYS = Object.freeze({
    NAME: "role_name",
    EMPLOYEES: "number_of_employee",
});

/* ── Users ───────────────────────────────────────────────────────────────── */
export const USER_VIEW_STATE_KEY = "usl_view_state_v1";

export const USER_SORT_KEYS = Object.freeze({
    NAME: "name",
    STAFF_TYPE: "staff_type",
    EMAIL: "email",
    ROLE: "role",
    ACTIVITY: "last_activity_at",
    MANAGER: "manager_name",
});

export const STAFF_TYPE = Object.freeze({ INTERNAL: "internal", PARTNER: "partner" });

export const STAFF_TYPE_OPTIONS = Object.freeze([
    { value: STAFF_TYPE.INTERNAL, key: "key_internal" },
    { value: STAFF_TYPE.PARTNER, key: "key_partner" },
]);

/* Legacy users list sent no status until one was picked → default to All. */
export const DEFAULT_USER_LIST_FILTERS = Object.freeze({ ...DEFAULT_SETTINGS_LIST_FILTERS, status: SETTINGS_STATUS.ALL, staff_type: [] });

export const USER_FORM_TAB = Object.freeze({
    BASIC: "basic-information",
    SALARY: "salary-and-benefits",
    SECURITY: "security",
    PERMISSION: "user-permission",
});

export const USER_FORM_TABS = Object.freeze([
    { key: USER_FORM_TAB.BASIC, labelKey: "key_basic_information" },
    { key: USER_FORM_TAB.SALARY, labelKey: "key_salary_and_benefits" },
    { key: USER_FORM_TAB.SECURITY, labelKey: "key_security" },
    { key: USER_FORM_TAB.PERMISSION, labelKey: "key_user_permission" },
]);
/* U-0357 (21 Oct): the Permissions editor is its own page under the selected user (Settings → People → Users → Permissions);
   the Users-list shield action and the old `?tab=user-permission` address deep-link into it */
export const userPermissionsPath = (id) => `/${ routes.userPermissions }?id=${ encodeURIComponent(id) }`;

export const USER_DOCUMENT_TYPE = Object.freeze({ BANK_COPY: "bank-copy", EMPLOYMENT_CONTRACT: "employment-contract" });
export const USER_DOCUMENT_ACCEPT = ".pdf";
export const MANAGER_SELF_VALUE = "null";
export const YES_NO_OPTIONS = Object.freeze([{ value: "1", key: "key_yes" }, { value: "0", key: "key_no" }]);
export const SALARY_AMOUNT_MAX = 999999999.99;
export const SALARY_AMOUNT_MAX_LENGTH = 12;
export const SALARY_AMOUNT_STEP = "0.01";
export const BANK_BRANCH_CODE_MAX_LENGTH = 20;
export const NUMBER_INPUT_BLOCKED_KEYS = Object.freeze(["-", "e", "E", "+"]);
export const BYTES_PER_MB = 1024 * 1024;
export const ACTIVE_USERS_QUERY = Object.freeze({ INTERNAL: { status: SETTINGS_STATUS.ACTIVE, type: "internal" }, BY_STAFF_TYPE: { status: SETTINGS_STATUS.ACTIVE, type: "staff_type" } });
export const ACTIVE_ROLES_QUERY = Object.freeze({ status: SETTINGS_STATUS.ACTIVE });
export const ACTIVE_HOLIDAYS_QUERY = Object.freeze({ status: SETTINGS_STATUS.ACTIVE });
export const ACTIVE_LANGUAGES_QUERY = Object.freeze({ status: SETTINGS_STATUS.ACTIVE });

/* ── Leave policy ────────────────────────────────────────────────────────── */
export const LEAVE_POLICY_VIEW_STATE_KEY = "lpl_view_state_v1";

export const DEFAULT_LEAVE_POLICY_FILTERS = Object.freeze({ sort_by: "", sort_order: "", page: 1, limit: DEFAULT_PAGE_LIMIT });

export const LEAVE_POLICY_SORT_KEYS = Object.freeze({
    NAME: "leave_policy_name",
    TYPES: "leave_policy_count",
    ANNUAL_TOTAL: "annual_total_sum",
    UPDATED_ON: "updated_on",
    UPDATED_BY: "updated_by_name",
    EMPLOYEES: "employees_count",
    STATUS: "status",
});

export const ACCRUAL_TYPE = Object.freeze({ MANUAL: "manual", YEARLY: "yearly", MONTHLY: "monthly" });
export const ACCRUAL_TYPE_OPTIONS = Object.freeze([
    { value: ACCRUAL_TYPE.MANUAL, key: "key_manual" },
    { value: ACCRUAL_TYPE.YEARLY, key: "key_yearly" },
    { value: ACCRUAL_TYPE.MONTHLY, key: "key_monthly" },
]);
export const MAX_TYPE = Object.freeze({ PERCENTAGE: "percentage", VALUE: "value" });
export const MAX_TYPE_OPTIONS = Object.freeze([
    { value: MAX_TYPE.PERCENTAGE, key: "key_percentage" },
    { value: MAX_TYPE.VALUE, key: "key_value" },
]);
export const EXPIRY_TYPE = Object.freeze({ DAYS: "days", DATE: "date" });
/* Shubham 6 Nov: Expiry Type = Date is a recurring Month + Day (no year) and 29 Feb is not selectable. The wire
   format stays the legacy full-date string, riding on a fixed NON-LEAP sentinel year so Feb caps at 28. */
export const LEAVE_EXPIRY_REF_YEAR = "2001";
export const LEAVE_EXPIRY_MONTH_DAYS = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
export const EXPIRY_TYPE_OPTIONS = Object.freeze([
    { value: EXPIRY_TYPE.DAYS, key: "key_days" },
    { value: EXPIRY_TYPE.DATE, key: "key_date" },
]);
export const LIMIT_FLAG = Object.freeze({ NO_LIMIT: "y", LIMITED: "n" });
/** Server meaning of `carry_forward_limit` / `encashment_limit` (backend 358): "y" = a max applies, "n" = no limit. Opposite of LIMIT_FLAG, which `expiry_value_limit` keeps. */
export const CAP_FLAG = Object.freeze({ HAS_MAX: "y", NO_LIMIT: "n" });
export const LIMIT_FLAG_OPTIONS = Object.freeze([
    { value: LIMIT_FLAG.NO_LIMIT, key: "key_yes" },
    { value: LIMIT_FLAG.LIMITED, key: "key_no" },
]);
export const NUMERIC_YES_NO_OPTIONS = Object.freeze([{ value: 1, key: "key_yes" }, { value: 0, key: "key_no" }]);
export const DECIMAL_STEP = "0.01";
/** Carry-forward max, encash max and threshold are INTEGER columns on the server (backend 359). */
export const WHOLE_STEP = "1";
export const LEAVE_POLICY_DISPLAY_FIELDS = Object.freeze([
    "tempId", "leave_policy_name", "accrual", "rate", "from_doh",
    "carry_forward_display", "carry_f_max", "encashment_display", "encash_max",
]);
export const DATE_DISPLAY_FORMAT = "DD/MM/YYYY";
export const EXPIRY_DATE_DISPLAY_FORMAT = "DD MMMM";

/* ── Leave ledger ────────────────────────────────────────────────────────── */
export const LEDGER_DEFAULT_RANGE_MONTHS = 3;
export const LEDGER_SORT_ORDER = Object.freeze({ ASC: "ASC", DESC: "DESC" });
export const LEDGER_SORT_KEYS = Object.freeze({
    LEAVE_TYPE: "leave_type",
    DATE: "created_at",
    TYPE: "type",
    METHOD: "display_method",
    COUNT: "leave_count",
    BALANCE: "balance",
    COMMENT: "comment",
});
export const LEDGER_ENTRY_TYPE = Object.freeze({ CREDIT: "plus", DEBIT: "minus" });
export const LEDGER_USERS_QUERY = Object.freeze({ module: "view_leave_ledger" });

/* ── Manual update leaves ────────────────────────────────────────────────── */
export const MANUAL_LEAVE_USERS_QUERY = Object.freeze({ module: "manual_update_leave" });
export const MANUAL_LEAVE_METHOD = Object.freeze({ CREDIT: "credit", DEBIT: "debit", ENCASHMENT: "encashment" });
export const MANUAL_LEAVE_METHOD_OPTIONS = Object.freeze([
    { value: MANUAL_LEAVE_METHOD.CREDIT, key: "key_credit" },
    { value: MANUAL_LEAVE_METHOD.DEBIT, key: "key_debit" },
    { value: MANUAL_LEAVE_METHOD.ENCASHMENT, key: "key_encash" },
]);
export const LEAVE_COUNT_MIN = 1;
export const LEAVE_COUNT_MAX = 365;
export const COMMENT_ROWS = 4;

/* ── Shift codes ─────────────────────────────────────────────────────────── */
export const SHIFT_CODE_VIEW_STATE_KEY = "scl_view_state_v1";
export const DEFAULT_SHIFT_CODE_FILTERS = Object.freeze({ sort_by: "", sort_order: "", page: 1, limit: DEFAULT_PAGE_LIMIT });
export const SHIFT_CODE_SORT_KEYS = Object.freeze({ CODE: "shift_code", START: "shift_start_time", END: "shift_end_time" });
export const SHIFT_TIME_API_FORMAT = "h:mm A";
export const SHIFT_DURATION_UNIT = "H";
export const SHIFT_DURATION_LABELS = Object.freeze({ HOURS: "hr", MINUTES: "min" });
export const MINUTES_PER_HOUR = 60;

/* ── Shift import + roster viewer ────────────────────────────────────────── */
export const SHIFT_TEMPLATE_PATH = "/files/sample/shift_code_sample_excel.xlsx";
export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const XLSX_EXTENSION = ".xlsx";
export const IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const IMPORT_FEEDBACK_FILE_KEYWORD = "data";
export const IMPORT_FEEDBACK_FILE_EXTENSION = "xlsx";
export const ROSTER_DEFAULT_USER_IDS = Object.freeze([0]);
export const ROSTER_SORT_ORDER = Object.freeze({ ASC: "ASC", DESC: "DESC" });
export const ROSTER_SORT_KEYS = Object.freeze({
    USERNAME: "username",
    DATE: "shift_date",
    START: "shift_start_time",
    END: "shift_end_time",
    CODE: "shift_code",
    HOLIDAY: "is_holiday",
});
export const ROSTER_EXPORT_SHEET = "Shift Roster";
export const ROSTER_EXPORT_FILE_PREFIX = "shift-roster-";
export const ROSTER_DAY_FORMAT = "dddd";
export const ROSTER_ACTIVE_USERS_QUERY = Object.freeze({ status: SETTINGS_STATUS.ACTIVE });

/* ── Holidays ────────────────────────────────────────────────────────────── */
export const HOLIDAY_VIEW_STATE_KEY = "hol_view_state_v1";
export const DEFAULT_HOLIDAY_FILTERS = Object.freeze({ sort_by: "", sort_order: "", page: 1, limit: DEFAULT_PAGE_LIMIT });
export const HOLIDAY_SORT_KEYS = Object.freeze({ NAME: "list_name", DAYS: "days_count", USERS: "users_count", STATUS: "active" });
export const HOLIDAY_ROW_DEFAULT = Object.freeze({ holiday_name: "", holiday_date: "" });

/* ── Days of operation ───────────────────────────────────────────────────── */
export const DOOP_VIEW_STATE_KEY = "dop_view_state_v1";
export const DEFAULT_DOOP_FILTERS = Object.freeze({ sort_by: "", sort_order: "", page: 1, limit: DEFAULT_PAGE_LIMIT });
export const DOOP_SORT_KEYS = Object.freeze({ NAME: "doop_name", WORK_DAYS: "work_days", OFF_DAYS: "off_days", EMPLOYEES: "number_of_employee", STATUS: "status" });
export const WEEK_DAY_NUMBERS = Object.freeze([1, 2, 3, 4, 5, 6, 7]);

/* ── Medical clinics ─────────────────────────────────────────────────────── */
export const MEDICAL_VIEW_STATE_KEY = "mcl_view_state_v1";
export const DEFAULT_MEDICAL_FILTERS = Object.freeze({ sort_by: "", sort_order: "", page: 1, limit: DEFAULT_PAGE_LIMIT });
export const MEDICAL_SORT_KEYS = Object.freeze({ NAME: "medical_clicnic_name", COUNTRY: "country_name", AGENCY: "agency_name", EMAIL: "clinic_email" });
export const HOST_AGENCIES_QUERY = Object.freeze({ status: SETTINGS_STATUS.ACTIVE, agency_category: AGENCY_CATEGORY.HOST });

/* ── Task Template Manager (conflict sheet U-0011 / U-0012; HRMS API spec A8–A10) ───────────────────────────────
   "Templates" is renamed Send Template Manager; the OTA key `key_templates` is unchanged. */
/* an en key — consumers read it through translation() */
export const SEND_TEMPLATE_MANAGER_TITLE = SETTINGS_LINK_LABELS.sendTemplateManager;
export const TASK_TEMPLATE_STATUS = Object.freeze({ ACTIVE: "active", RETIRED: "retired" });
export const TASK_TEMPLATE_SORT_KEYS = Object.freeze({ TITLE_EN: "title_en", TITLE_ZH: "title_zh", STATUS: "status" });
export const TASK_TEMPLATE_TITLE_MAX = 255;
export const TASK_TEMPLATE_NOTES_MAX = 1000;   /* U-0261 */
export const TASK_TEMPLATE_HTTP = Object.freeze({ FORBIDDEN: 403 });
export const TASK_TEMPLATE_COPY = copyKeys(Object.freeze({
    title: SETTINGS_LINK_LABELS.taskTemplateManager,
    item: 'key_set_task_template_item',
    unit: 'key_set_task_template_unit',
    addNew: 'key_set_task_template_add_new',
    titleEn: 'key_set_task_template_title_en',
    titleZh: 'key_set_task_template_title_zh',
    /* U-0261: optional internal notes per language — never sent, never auto-translated */
    notesEn: 'key_set_task_template_notes_en',
    notesZh: 'key_set_task_template_notes_zh',
    notesHint: 'key_set_task_template_notes_hint',
    retired: 'key_set_task_template_retired',
    retireHint: 'key_set_task_template_retire_hint',
    titleRequired: 'key_set_task_template_title_required',
    noPermission: 'key_set_task_template_no_permission',
    saveFailed: 'key_set_task_template_save_failed',
    created: 'key_set_task_template_created',
    updated: 'key_set_task_template_updated',
    duplicate: 'key_set_task_template_duplicate',
}));

/* ── Templates ───────────────────────────────────────────────────────────── */
export const TEMPLATE_SEARCH_DEBOUNCE_MS = 500;
export const TEMPLATE_SORT_KEYS = Object.freeze({
    MODULE: "module_key",
    CATEGORY: "category_name",
    LANGUAGE: "language_name",
    NAME: "template_name",
    ACCESSIBILITY: "accessibility",
    CREATED_BY: "created_by_name",
    UPDATED_BY: "updated_by_name",
});
export const TEMPLATE_ACCESSIBILITY = Object.freeze({ PUBLIC: "public", PRIVATE: "private" });
export const TEMPLATE_UPLOAD_FOLDER = "template/master";
export const TEMPLATE_MEDIA_ACCEPT = "image/jpeg,image/jpg,image/png,application/pdf,application/doc,application/docx,image/x-eps,image/tiff,.doc,.docx,.pdf,.eps,.tiff";
export const TEMPLATE_IMAGE_EXTENSIONS = Object.freeze(["jpg", "jpeg", "png"]);
export const TEMPLATE_PLACEHOLDER_COLOR = "#1591ea";
export const TEMPLATE_EDITOR_HEIGHT = 200;
export const QUILL_TOOLBAR = Object.freeze([
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
    ["image", "code-block"],
    ["clean"],
]);

/* ── Operating hours ─────────────────────────────────────────────────────── */
export const API_TIME_FORMAT = "HH:mm";
export const TIME_PICKER_INTERVAL_MINUTES = 15;

export const OPERATING_TIME_SUFFIX = Object.freeze({
    START: "_branch_operating_start_time",
    END: "_branch_operating_end_time",
});

export const BRANCH_ERROR_LINE_SEPARATOR = "<br>";

/* ── Price list ──────────────────────────────────────────────────────────── */
/* the Price List's pages, as the package's reference page names them in its address (#local, #overseas, …) */
export const PRICE_LIST_PAGE = Object.freeze({
    LOCAL: "local",
    OVERSEAS: "overseas",
    DIRECT_HIRE: "direct-hire",
    ITEMS_BY_SERVICE: "items-by-service",
    SKILLS: "skills",
    COUNTRIES: "countries",
    FIXED_ITEMS: "fixed-items",
    PROMOTIONS: "promotions",
    WORKER_PROMOTIONS: "worker-promotions",
});
export const PRICE_LIST_SORT_ORDER = Object.freeze({ ASC: "ASC", DESC: "DESC" });
export const DEFAULT_WORKER_PROMOTION_SORT = Object.freeze({ sort: "", order: PRICE_LIST_SORT_ORDER.DESC });
export const PRICE_LIST_LOADING_STATUS = "loading";
export const PRICE_LIST_FIRST_PAGE = 1;

export const PROMOTION_API_DATE_FORMAT = "YYYY-MM-DD";
export const PROMOTION_SELECT_MAX_MENU_HEIGHT = 170;

export const INTERVIEW_MODE = Object.freeze({ VIDEO: "1", IN_OFFICE: "2", BOTH: "3" });
export const INTERVIEW_MODE_OPTIONS = Object.freeze([
    { value: INTERVIEW_MODE.IN_OFFICE, labelKey: "key_in_office" },
    { value: INTERVIEW_MODE.VIDEO, labelKey: "key_video" },
    { value: INTERVIEW_MODE.BOTH, labelKey: "key_both" },
]);
export const WORKER_PROMOTION_ITEM_ID_PREFIX = "item_";
export const WORKER_PROMOTION_ITEM_ID_RANDOM_MAX = 1000;

/* ── Prompt manager ──────────────────────────────────────────────────────── */
export const PROMPT_LIST_DEBOUNCE_MS = 300;
export const DEFAULT_PROMPT_SORT = Object.freeze({ sort: "", order: "" });
export const PROMPT_SORT_ORDER = Object.freeze({ ASC: "ASC", DESC: "DESC" });
/* Legacy: every column sorts by "name" — kept, see settings bug log. */
export const PROMPT_SORT_KEY = "name";
export const PROMPT_NAVIGATE_DELAY_MS = 1000;
/* Legacy literal API values (not translated — sent to the AI copywriter service). */
export const PROMPT_LANGUAGE_OPTIONS = Object.freeze([
    { value: "English", labelKey: "key_english" },
    { value: "Indonesian", labelKey: "key_indonesian" },
]);
export const PROMPT_DEFAULT_MODEL = "claude-haiku-4-5-20251001";
export const PROMPT_AUTHOR = "Maidmatch Admin";
export const PROMPT_DYNAMIC_FIELD_REGEX = /{{\s*[\w]+\s*}}/g;
export const PROMPT_EDITOR_ROWS = 10;
/* Legacy literal dropdown entries — the label text itself is inserted into the prompt. */
export const PROMPT_DYNAMIC_FIELDS = Object.freeze([
    { id: 1, name: "Helper: {{helper}}" },
    { id: 2, name: "Location: {{location}}" },
    { id: 3, name: "Salary Range: {{salary_range}}" },
    { id: 4, name: "Main Duties: {{main_duties}}" },
    { id: 5, name: "Other Responsibilities: {{other_responsibilities}}" },
    { id: 6, name: "Accommodation: {{accommodation}}" },
    { id: 7, name: "Special Course or Certification: {{special_course}}" },
    { id: 8, name: "Spoken Languages: {{spoken_languages}}" },
    { id: 9, name: "Helper Nationality: {{helper_nationality}}" },
    { id: 10, name: "Overseas Experience: {{overseas_experience}}" },
    { id: 11, name: "Contract Status: {{contract_status}}" },
    { id: 12, name: "Minimum Education Level: {{minimum_education_level}}" },
    { id: 13, name: "Employer House Size: {{employer_house_size}}" },
    { id: 14, name: "Day Off: {{day_off}}" },
    { id: 15, name: "Religion: {{religion}}" },
    { id: 16, name: "Marital Status: {{marital_status}}" },
    { id: 17, name: "Minimum Age: {{minimum_age}}" },
    { id: 18, name: "Maximum Age: {{maximum_age}}" },
]);

/* ── HRMS: leaves · my reportees · time requests · my profile ────────────── */
export const HRMS_DEFAULT_PAGE_QUERY = Object.freeze({ page: 1, limit: DEFAULT_PAGE_LIMIT });
export const HRMS_SORT_ORDER = Object.freeze({ ASC: "ASC", DESC: "DESC" });
export const DEFAULT_HRMS_SORT = Object.freeze({ sort: "", order: "" });
export const HRMS_LOADING_STATUS = "loading";
export const HRMS_FAILED_STATUS = "failed";

export const LEAVE_STATUS = Object.freeze({ PENDING: 0, APPROVED: 1, REJECTED: 2, WITHDRAWN: 3 });
export const LEAVE_STATUS_LABEL_KEYS = Object.freeze({
    [LEAVE_STATUS.PENDING]: "key_pending",
    [LEAVE_STATUS.APPROVED]: "key_approved",
    [LEAVE_STATUS.REJECTED]: "key_rejected",
    [LEAVE_STATUS.WITHDRAWN]: "key_withdrawn",
});
export const LEAVE_STATUS_TONES = Object.freeze({
    [LEAVE_STATUS.PENDING]: "orange",
    [LEAVE_STATUS.APPROVED]: "green",
    [LEAVE_STATUS.REJECTED]: "red",
    [LEAVE_STATUS.WITHDRAWN]: "neutral",
});
/* reposteesLeaveStatusChange payload values (legacy: 1 approve, 2 reject) */
export const LEAVE_ACTION = Object.freeze({ APPROVE: 1, REJECT: 2 });
export const REPORTEE_LEAVE_TAB = Object.freeze({ PENDING: "pending", ACTIONED: "actioned" });
export const HALF_DAY = Object.freeze({ FIRST: "first_half", SECOND: "second_half" });
export const HALF_DAY_OPTIONS = Object.freeze([
    { value: HALF_DAY.FIRST, labelKey: "key_first_half" },
    { value: HALF_DAY.SECOND, labelKey: "key_second_half" },
]);
export const LEAVE_DATE_DISPLAY_FORMAT = "DD MMM YYYY";
export const LEAVE_PICKER_MONTHS_BACK = 3;
export const LEAVE_PICKER_YEARS_AHEAD = 1;
export const LEAVE_COMMENT_ROWS = 5;
/* Legacy literal toast (not translated) shown when the requested duration exceeds the balance */
export const leaveBalanceExceededMessage = (available, requested) =>
    `Available: ${available} · Requested: ${requested}. Please adjust your dates or select another leave type.`;

export const MY_REPORTEES_TAB = Object.freeze({
    APPROVE_LEAVES: "approve-leaves",
    APPROVE_TIME_REQUEST: "approve-time-request",
    TIME_CREDIT: "manage-approve-time-request",
});
export const REPORTEE_TIME_REQUEST_TAB = Object.freeze({ PENDING: "pending", ACTIONED: "actioned", ALL: "all" });
export const NON_REPORTEES_FLAG = Object.freeze({ YES: 1, NO: 0 });

export const TIME_REQUEST_STATUS = Object.freeze({ PENDING: 0, PARTIALLY_APPROVED: 1, APPROVED: 2, REJECTED: 3, WITHDRAWN: 4 });
export const TIME_REQUEST_STATUS_TONES = Object.freeze({
    [TIME_REQUEST_STATUS.PENDING]: "orange",
    [TIME_REQUEST_STATUS.PARTIALLY_APPROVED]: "green",
    [TIME_REQUEST_STATUS.APPROVED]: "green",
    [TIME_REQUEST_STATUS.REJECTED]: "red",
    [TIME_REQUEST_STATUS.WITHDRAWN]: "neutral",
});
/* updateReporteesTimeRequestAction status values (legacy: 1 partial, 2 full, 3 reject) */
export const TIME_REQUEST_ACTION = Object.freeze({ PARTIAL_APPROVE: 1, FULL_APPROVE: 2, REJECT: 3 });
export const TIME_REQUEST_WITHDRAW_STATUS = TIME_REQUEST_STATUS.WITHDRAWN;
export const TIME_REQUEST_HOUR_OPTIONS = Object.freeze(Array.from({ length: 24 }, (_, index) => index + 1));
export const TIME_REQUEST_MINUTE_OPTIONS = Object.freeze(Array.from({ length: 60 }, (_, index) => index));
/* bug log #108: the approve dialog offers 0–59 like the raise form (legacy offered 1–60, so N h 0 min could never be approved in full) */
export const TIME_APPROVE_MINUTE_OPTIONS = TIME_REQUEST_MINUTE_OPTIONS;
export const TIME_CREDIT_HOUR_OPTIONS = Object.freeze(Array.from({ length: 24 }, (_, index) => index));
export const TIME_CREDIT_MINUTE_OPTIONS = Object.freeze(Array.from({ length: 60 }, (_, index) => index));
/* backend 349: `get-signed-url` allows `time-request`; "profile" was never on the allowlist ("The path format is invalid.") */
export const TIME_REQUEST_UPLOAD_FOLDER = "time-request";
export const TIME_REQUEST_DATE_FORMAT = "dd/MM/yyyy";
export const TIME_REQUEST_COMMENT_ROWS = 5;
export const TIME_REQUEST_COMMENT_MAX_LENGTH = 500;
/* backend 356: the users-list module name the server scopes by the two time-credit grants */
export const TIME_CREDIT_USERS_QUERY = Object.freeze({ module: "time_entry" });
export const TIME_CREDIT_TIME_FORMAT = "HH:mm";
export const TIME_UNIT_LABELS = Object.freeze({ HOURS: "hrs", MINUTES: "mins" });

export const PROFILE_TAB = Object.freeze({ BASIC: "basic-information", SALARY: "salary-and-benefits", SECURITY: "security" });
export const PROFILE_TABS = Object.freeze([
    { key: PROFILE_TAB.BASIC, labelKey: "key_basic_information" },
    { key: PROFILE_TAB.SALARY, labelKey: "key_salary_and_benefits" },
    { key: PROFILE_TAB.SECURITY, labelKey: "key_security" },
]);
/* U-0435 (5 Nov): business dates render DD/MM/YYYY platform-wide (Part 0 global conventions); format at display from the YYYY-MM-DD payload */
export const PROFILE_JOINED_DATE_FORMAT = "DD/MM/YYYY";
/* backend 349: each My Profile document uploads to its own allowed folder */
export const PROFILE_DOCUMENT_UPLOAD_FOLDERS = Object.freeze({ bank_hkid_copy: "hk-id", bank_copy: "bank-copy", bank_employment_contract: "employment-contract" });
/* backend 341: each My Profile card posts only its own keys (every key optional; a sent key must be valid) */
export const PROFILE_CARD_FIELDS = Object.freeze({
    official: ["mobile_number", "birth_date", "address1"],
    emergency: ["emergency_contact_name", "emergency_contact_relationship", "emergency_contact_phone"],
    personal: ["whatsapp", "telephone", "personal_email", "skype", "facebook", "instagram", "airtable"],
    bank: ["bank_name", "bank_account_number", "bank_account_name", "bank_branch_code", "bank_remarks"],
    documents: ["bank_hkid_copy", "bank_copy", "bank_employment_contract"],
});
export const PROFILE_TEXT_MAX = 255;
export const PROFILE_ADDRESS_MAX = 1000;
export const PROFILE_MIN_BIRTH_YEAR = 1900;
export const PROFILE_DOCUMENT_ACCEPT = ".pdf";
export const PROFILE_IMAGE_FIELD = "userImageModel.full_final_image";
export const PROFILE_REFRESH_ACTION = Object.freeze({ LIST: "list", UPLOAD_PHOTO: "upload_photo" });
export const PROFILE_DATE_FIELD = "birth_date";
export const PROFILE_READONLY_FIELD = "email";
export const PROFILE_DATE_VALUE_LENGTH = 10;

/* ── Last refresh (list headers) ─────────────────────────────────────────── */
export const LAST_REFRESH_FORMAT = "DD/MM/YYYY · HH:mm";

/* the Processing Groups a staff member may be eligible for as Prepared / Ready owner */

/* ── Smart Fill Holidays · Update Profile Photo (legacy-UI audit 2026-10-22 E; the legacy popups' literals) ─────────── */
export const SMART_FILL_YEARS_AHEAD = 5;
export const PROFILE_PHOTO = Object.freeze({
    MAX_BYTES: 5 * 1024 * 1024,
    TYPES: Object.freeze(["image/jpeg", "image/jpg", "image/png"]),
    ACCEPT: ".jpg, .jpeg, .png",
    FOLDER_FULL: "user-profile/full-length",
    FOLDER_CROPPED: "user-profile/cropped",
    CROP_MAX_PX: 96,            /* 45 px avatar at 2× */
    CROP_QUALITY: 0.85,
    FALLBACK_QUALITY: 0.95,
    ZOOM_MIN: 1, ZOOM_MAX: 3, ZOOM_STEP: 0.1,
});
