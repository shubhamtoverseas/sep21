/* Contract module constants — the Contracts dashboard (prototype Contracts_Dashboard.html, CT-01 / CT-06) */
import { CONTRACT_STATUS } from "../ProcessingPage/processingConstants";
import { CAL_SOURCE_QUERY } from "../Calendar/newui/calendarConstants";
import { bangladeshId, indonesiaId, thaiId } from "../../../components/ReusableComponents/constants";

/* ---- status cards ---- */
export const CD_STATUS = Object.freeze({ PROCESSING: "processing", ACTIVE: "active", COMPLETED: "completed", CANCELLED: "cancelled" });
export const CD_STATUS_KEYS = Object.freeze([CD_STATUS.PROCESSING, CD_STATUS.ACTIVE, CD_STATUS.COMPLETED, CD_STATUS.CANCELLED]);
export const CD_STATUS_ID = Object.freeze({
    [CD_STATUS.PROCESSING]: CONTRACT_STATUS.PROCESSING,
    [CD_STATUS.ACTIVE]: CONTRACT_STATUS.ACTIVE,
    [CD_STATUS.COMPLETED]: CONTRACT_STATUS.COMPLETED,
    [CD_STATUS.CANCELLED]: CONTRACT_STATUS.CANCELLED,
});
export const CD_STATUS_LABEL_KEYS = Object.freeze({
    [CD_STATUS.PROCESSING]: "key_processing", [CD_STATUS.ACTIVE]: "key_active", [CD_STATUS.COMPLETED]: "key_completed", [CD_STATUS.CANCELLED]: "key_cancelled",
});
export const CD_STATUS_DESC_KEYS = Object.freeze({
    [CD_STATUS.PROCESSING]: "key_contract_status_desc_processing", [CD_STATUS.ACTIVE]: "key_contract_status_desc_active",
    [CD_STATUS.COMPLETED]: "key_contract_status_desc_completed", [CD_STATUS.CANCELLED]: "key_contract_status_desc_cancelled",
});
export const CD_DEFAULT_STATUS = CD_STATUS.PROCESSING;

/* ---- views, groups, paging ---- */
export const CD_VIEW = Object.freeze({ LIST: "list", PAOS: "paos" });
export const CD_GROUPS = Object.freeze([1, 2, 3, 4]);
export const CD_DEFAULT_GROUP = 1;   /* first VIEW tab (PROCESS.md §5 order); the prototype's Group 2 default was a fixture artefact (work order 27 Oct) */
export const CD_QUERY = Object.freeze({ STATUS: "status" });
/* ClickUp 14ykpqtz7y7 (Shubham, 7 Nov): Groups 1 & 3 offer the ITB nationalities only — Indonesian · Thai · Bangladeshi,
   never Filipino; Groups 2 & 4 carry no Nationality filter at all (the control is absent, nothing is sent) */
export const CD_NATIONALITY_FILTER_GROUPS = Object.freeze([1, 3]);
export const CD_ITB_NATIONALITY_IDS = Object.freeze([String(indonesiaId), String(thaiId), String(bangladeshId)]);
export const CD_PAGE_SIZES = Object.freeze([25, 50, 100]);
export const CD_DEFAULT_PAGE_SIZE = 25;
export const CD_SEARCH_DEBOUNCE_MS = 250;
export const CD_TOAST_MS = 2600;
/* session return context (one round trip to a record) and per-user preferences (sort + hidden columns) */
export const CD_RETURN_STATE_KEY = "contracts_dashboard_return_v1";
export const CD_PREFS_KEY = "contracts_dashboard_prefs_v1";

/* ---- stages (keys are the API `stage_order` / `stages` keys) ---- */
export const CD_STAGE = Object.freeze({
    CONTRACT: "contract", PRE_DEPARTURE: "pre_departure", IMMIGRATION: "immigration", VISA: "visa", INSURANCE: "insurance",
    CONSULATE: "consulate", MEDICAL: "medical", DEPLOYMENT: "deployment", EXTEND_VISA: "extend_visa", PAOS: "paos",
});
export const CD_STAGE_LABEL_KEYS = Object.freeze({
    [CD_STAGE.CONTRACT]: "key_stage_contract", [CD_STAGE.PRE_DEPARTURE]: "key_stage_pre_departure", [CD_STAGE.IMMIGRATION]: "key_stage_immigration",
    [CD_STAGE.VISA]: "key_stage_visa", [CD_STAGE.INSURANCE]: "key_stage_insurance", [CD_STAGE.CONSULATE]: "key_stage_consulate",
    [CD_STAGE.MEDICAL]: "key_stage_medical", [CD_STAGE.DEPLOYMENT]: "key_stage_deployment", [CD_STAGE.EXTEND_VISA]: "key_stage_extend_visa",
    [CD_STAGE.PAOS]: "key_stage_paos",
});
/* prototype STAGE_MODEL — the server's `stage_order` overrides it */
export const CD_DEFAULT_STAGE_ORDER = Object.freeze({
    1: [CD_STAGE.CONTRACT, CD_STAGE.CONSULATE, CD_STAGE.IMMIGRATION, CD_STAGE.VISA, CD_STAGE.INSURANCE, CD_STAGE.DEPLOYMENT],
    2: [CD_STAGE.CONTRACT, CD_STAGE.PRE_DEPARTURE, CD_STAGE.IMMIGRATION, CD_STAGE.VISA, CD_STAGE.INSURANCE, CD_STAGE.CONSULATE, CD_STAGE.DEPLOYMENT],
    3: [CD_STAGE.CONTRACT, CD_STAGE.INSURANCE, CD_STAGE.MEDICAL, CD_STAGE.CONSULATE, CD_STAGE.IMMIGRATION, CD_STAGE.VISA],
    4: [CD_STAGE.CONTRACT, CD_STAGE.INSURANCE, CD_STAGE.MEDICAL, CD_STAGE.IMMIGRATION, CD_STAGE.VISA, CD_STAGE.CONSULATE],
});
/* vocabulary (prototype TERMINAL / VOCAB / COMPACT / tone tables) — tokens are the exact status labels */
export const CD_TOKEN = Object.freeze({
    NOT_READY: "Not Ready", READY: "Ready", READY_TO_SUBMIT: "Ready to Submit", SUBMITTED: "Submitted", RETURNED: "Returned",
    AUTH_READY: "Letter of Authorization Ready", REF_RELEASED: "Visa Ref. No. Released", VISA_RELEASED: "Visa Released", REQUEST_SUBMITTED: "Request Submitted",
    POLICY_CONFIRMED: "Policy Confirmed", NOT_REQUIRED: "Not Required", CHECKUP_COMPLETED: "Check Up Completed",
    APPROVED_BY_ER: "Approved by ER", FLIGHT_BOOKED: "Flight Booked", COMPLETED: "Completed", IN_PROGRESS: "In Progress", CANCELLED: "Cancelled",
    HELPER_PICKED_UP: "Helper Picked Up",   /* the Deployment roll-up's terminal (U-0301; server K-5) */
});
export const CD_TERMINAL = Object.freeze({
    [CD_STAGE.CONTRACT]: CD_TOKEN.READY, [CD_STAGE.PRE_DEPARTURE]: CD_TOKEN.READY, [CD_STAGE.CONSULATE]: CD_TOKEN.RETURNED,
    [CD_STAGE.IMMIGRATION]: CD_TOKEN.SUBMITTED, [CD_STAGE.VISA]: CD_TOKEN.VISA_RELEASED, [CD_STAGE.INSURANCE]: CD_TOKEN.POLICY_CONFIRMED,
    [CD_STAGE.MEDICAL]: CD_TOKEN.APPROVED_BY_ER, [CD_STAGE.DEPLOYMENT]: CD_TOKEN.HELPER_PICKED_UP, [CD_STAGE.EXTEND_VISA]: CD_TOKEN.VISA_RELEASED,
});
export const CD_VOCAB = Object.freeze({
    [CD_STAGE.CONTRACT]: [CD_TOKEN.NOT_READY, CD_TOKEN.READY],
    [CD_STAGE.PRE_DEPARTURE]: [CD_TOKEN.NOT_READY, CD_TOKEN.READY],
    [CD_STAGE.CONSULATE]: [CD_TOKEN.NOT_READY, CD_TOKEN.READY_TO_SUBMIT, CD_TOKEN.SUBMITTED, CD_TOKEN.RETURNED],
    [CD_STAGE.IMMIGRATION]: [CD_TOKEN.NOT_READY, CD_TOKEN.READY_TO_SUBMIT, CD_TOKEN.SUBMITTED],
    [CD_STAGE.INSURANCE]: [CD_TOKEN.NOT_READY, CD_TOKEN.REQUEST_SUBMITTED, CD_TOKEN.POLICY_CONFIRMED, CD_TOKEN.NOT_REQUIRED],
    [CD_STAGE.MEDICAL]: [CD_TOKEN.NOT_READY, CD_TOKEN.CHECKUP_COMPLETED, CD_TOKEN.APPROVED_BY_ER, CD_TOKEN.NOT_REQUIRED],
    [CD_STAGE.VISA]: [CD_TOKEN.NOT_READY, CD_TOKEN.AUTH_READY, CD_TOKEN.REF_RELEASED, CD_TOKEN.VISA_RELEASED],
    [CD_STAGE.DEPLOYMENT]: [CD_TOKEN.NOT_READY, CD_TOKEN.FLIGHT_BOOKED, CD_TOKEN.HELPER_PICKED_UP],
    /* U-0306: an open case presents its Immigration status until Submitted, then the Visa status */
    [CD_STAGE.EXTEND_VISA]: [CD_TOKEN.NOT_READY, CD_TOKEN.READY_TO_SUBMIT, CD_TOKEN.SUBMITTED, CD_TOKEN.REF_RELEASED, CD_TOKEN.VISA_RELEASED],
});
/* N-2 (backend answers 15 Oct): the Active → Processing reversal's refusals */
export const CR_REVERT_ERROR = Object.freeze({ POST_HIRE: "REVERT_BLOCKED_POST_HIRE", OVERRIDE_REASON_REQUIRED: "REVERT_BLOCKED_POST_HIRE_OVERRIDE_REASON_REQUIRED" });
/* B-3 / N-7: the correctable visa fields of the latest issuance on an Active contract (`field` of visa-field-correction) */
export const CR_VISA_FIELD = Object.freeze({ EXPIRY: "visa_expiry_date", ENTRY_EXPIRY: "entry_visa_expiry_date", REFERENCE_NO: "visa_reference_no", PAYMENT_DATE: "e_visa_payment_date" });
export const CR_VISA_REFERENCE_MAX = 20;
/* Groups 3 / 4 have no Authorization Letter: Visa is the E-Visa-only step */
export const CD_EVISA_ONLY_GROUPS = Object.freeze([3, 4]);
export const CD_EVISA_VOCAB = Object.freeze([CD_TOKEN.NOT_READY, CD_TOKEN.REF_RELEASED, CD_TOKEN.VISA_RELEASED]);
/* prototype TOKEN_EXPAND: the server's stage token "Authorization Ready" (contracts_dashboard ask #6) and the compact card
   labels all read as one token; the sub-stage status option keeps its own name "Letter of Authorization Ready" */
export const CD_TOKEN_ALIAS = Object.freeze({
    "Authorization Ready": CD_TOKEN.AUTH_READY, "Auth Ready": CD_TOKEN.AUTH_READY,
    "Ref. No. Released": CD_TOKEN.REF_RELEASED, "Released": CD_TOKEN.VISA_RELEASED,
    /* U-0443: one form, one stored status, one label — "Check Up Completed" everywhere; "Coupon Shared" stays a date label only */
    "Coupon Shared": CD_TOKEN.CHECKUP_COMPLETED,
});
export const normalizeToken = (token) => CD_TOKEN_ALIAS[token] || token;
/* U-0443: display-name map for server status names — ONLY the Medical label is rewritten; every other option
   keeps its own (possibly longer) server name, e.g. "Letter of Authorization Ready" */
export const CD_STATUS_DISPLAY_NAME = Object.freeze({ "Coupon Shared": CD_TOKEN.CHECKUP_COMPLETED });
export const statusDisplayName = (name) => CD_STATUS_DISPLAY_NAME[name] || name;
/* prototype COMPACT_STATUS: the three long Visa tokens shorten on the stage cards (Shubham 30 Oct, HTML over the 26 Oct order) */
export const CD_COMPACT = Object.freeze({ [CD_TOKEN.AUTH_READY]: "Auth Ready", [CD_TOKEN.REF_RELEASED]: "Ref. No. Released", [CD_TOKEN.VISA_RELEASED]: "Released" });
export const CD_TONE = Object.freeze({ RED: "red", GRAY: "gray", GREEN: "green", BLUE: "blue", TEAL: "teal", ORANGE: "orange", PURPLE: "purple" });
/* colour rules: conflict rows U-0424..U-0430 (PROCESS.md lines 271-272) overlay the 29 Oct prototype tones.
   Purple = Consulate Ready to Submit + Visa Authorization Ready; Orange = Immigration Ready to Submit, Consulate Submitted,
   Visa Ref No Released, Check Up Completed / Coupon Shared (orange also stays the unrecognised fallback). */
export const CD_TOKEN_BLUE = Object.freeze([]);
export const CD_TOKEN_PURPLE = Object.freeze([CD_TOKEN.AUTH_READY]);
export const CD_TOKEN_TEAL = Object.freeze([CD_TOKEN.SUBMITTED, CD_TOKEN.REQUEST_SUBMITTED, CD_TOKEN.FLIGHT_BOOKED, CD_TOKEN.IN_PROGRESS]);
/* same token, different stage: Ready to Submit and Submitted are ruled per stage (U-0424 / U-0425 / U-0426) */
export const CD_STAGE_TONE_OVERRIDE = Object.freeze({
    [CD_STAGE.CONSULATE]: Object.freeze({ [CD_TOKEN.READY_TO_SUBMIT]: CD_TONE.PURPLE, [CD_TOKEN.SUBMITTED]: CD_TONE.ORANGE }),
    [CD_STAGE.IMMIGRATION]: Object.freeze({ [CD_TOKEN.READY_TO_SUBMIT]: CD_TONE.ORANGE }),
});
export const CD_TOKEN_GRAY = Object.freeze([CD_TOKEN.NOT_REQUIRED]);
/* stage-aware sort priorities — the longest-waiting record first inside a non-terminal status */
export const CD_STAGE_PRIORITY = Object.freeze({
    [CD_STAGE.CONTRACT]: [CD_TOKEN.NOT_READY, CD_TOKEN.READY],
    [CD_STAGE.PRE_DEPARTURE]: [CD_TOKEN.NOT_READY, CD_TOKEN.READY],
    [CD_STAGE.IMMIGRATION]: [CD_TOKEN.READY_TO_SUBMIT, CD_TOKEN.NOT_READY, CD_TOKEN.SUBMITTED],
    [CD_STAGE.VISA]: [CD_TOKEN.AUTH_READY, CD_TOKEN.NOT_READY, CD_TOKEN.REF_RELEASED, CD_TOKEN.VISA_RELEASED],
    [CD_STAGE.INSURANCE]: [CD_TOKEN.NOT_READY, CD_TOKEN.REQUEST_SUBMITTED, CD_TOKEN.NOT_REQUIRED, CD_TOKEN.POLICY_CONFIRMED],
    [CD_STAGE.CONSULATE]: [CD_TOKEN.READY_TO_SUBMIT, CD_TOKEN.NOT_READY, CD_TOKEN.SUBMITTED, CD_TOKEN.RETURNED],
    [CD_STAGE.DEPLOYMENT]: [CD_TOKEN.FLIGHT_BOOKED, CD_TOKEN.NOT_READY, CD_TOKEN.HELPER_PICKED_UP],
    [CD_STAGE.MEDICAL]: [CD_TOKEN.CHECKUP_COMPLETED, CD_TOKEN.NOT_READY, CD_TOKEN.NOT_REQUIRED, CD_TOKEN.APPROVED_BY_ER],
});
/* Extend Visa sorts by case bucket, not by status */
export const CD_XV_BUCKET = Object.freeze({ OPEN: "__open__", NONE: "__none__", DONE: "__done__" });
export const CD_XV_BUCKETS = Object.freeze([CD_XV_BUCKET.OPEN, CD_XV_BUCKET.NONE, CD_XV_BUCKET.DONE]);
export const CD_XV_BUCKET_LABEL_KEYS = Object.freeze({
    [CD_XV_BUCKET.OPEN]: "key_cd_prioritize_open_cases", [CD_XV_BUCKET.NONE]: "key_cd_prioritize_no_case", [CD_XV_BUCKET.DONE]: "key_cd_prioritize_completed_cases",
});
/* Extend Visa presentation (EXTEND §15.1 / workbook #70): open case · latest Released · latest Cancelled · no case */
export const CD_XV_PRESENTED = Object.freeze({ OPEN: "open", RELEASED: "released", CANCELLED: "cancelled" });

/* ---- PAOS column (Active · Group 2) — tones by stored progress key (CR_PAOS_PROGRESS) ---- */
export const CD_PAOS_TONE = Object.freeze({
    to_arrange: CD_TONE.RED, scheduled: CD_TONE.TEAL, attended_certificate_pending: CD_TONE.TEAL, completed: CD_TONE.GREEN, needs_rebooking: CD_TONE.ORANGE,
});

/* ---- sorting ---- */
export const CD_SORT_MODE = Object.freeze({ DIR: "dir", PRIORITY: "priority", PRIORITIZE: "prioritize", CHANGED: "changed", TERMINAL: "terminal" });
export const CD_SORT_DIR = Object.freeze({ ASC: "ASC", DESC: "DESC" });
export const CD_DEFAULT_SORT = Object.freeze({ col: "worker_name", mode: CD_SORT_MODE.DIR, dir: CD_SORT_DIR.ASC });
/* U-0445: hidden by default (still offered by the column picker); crux with Mike — added 14 Oct from the backend S4
   contract, not from the HTML or the DASH / OWNERS annexes */
export const CD_DEFAULT_HIDDEN_COLS = Object.freeze(["prepared_owner", "ready_owner"]);
export const CD_UNSORTABLE = Object.freeze(["cs_owner", "cs_assistant", "branch"]);
export const CD_SORT_LABEL_KEYS = Object.freeze({
    AZ: ["key_cd_a_to_z", "key_cd_z_to_a"],
    NEWEST_FIRST: ["key_cd_newest_to_oldest", "key_cd_oldest_to_newest"],
    OLDEST_FIRST: ["key_cd_oldest_to_newest", "key_cd_newest_to_oldest"],
});

/* ---- columns (kit listing tracks; widths are the prototype's) ---- */
export const CD_COL = Object.freeze({
    EMPLOYER: "employer_name", WORKER: "worker_name", CODE: "worker_code", ACTIVITY: "activity", CONTRACT_START: "contract_start", CONTRACT_END: "contract_end",
    COMPLETION_REASON: "completion_reason", CANCELLATION_REASON: "cancellation_reason", CS_OWNER: "cs_owner", CS_ASSISTANT: "cs_assistant",
    PREPARED_OWNER: "prepared_owner", READY_OWNER: "ready_owner", BRANCH: "branch",
});
export const CD_COL_KIND = Object.freeze({ ID: "id", META: "meta", STAGE: "stage" });
export const CD_FIXED_COLS = Object.freeze([CD_COL.WORKER, CD_COL.CODE]);
export const CD_COLUMN_DEFS = Object.freeze({
    [CD_COL.EMPLOYER]: { labelKey: "key_employer_name", trackRole: "name", trackWidth: 200, kind: CD_COL_KIND.ID, sticky: "wemp", dirKeys: CD_SORT_LABEL_KEYS.AZ },
    [CD_COL.WORKER]: { labelKey: "key_worker_name", trackRole: "name", trackWidth: 200, kind: CD_COL_KIND.ID, sticky: "wname", dirKeys: CD_SORT_LABEL_KEYS.AZ },
    [CD_COL.CODE]: { labelKey: "key_worker_code", trackRole: "ref", trackWidth: 140, kind: CD_COL_KIND.ID, sticky: "wcode", dirKeys: CD_SORT_LABEL_KEYS.AZ },
    [CD_COL.ACTIVITY]: { labelKey: "key_activity", trackRole: "date", trackWidth: 112, kind: CD_COL_KIND.META, dirKeys: CD_SORT_LABEL_KEYS.NEWEST_FIRST },
    [CD_COL.CONTRACT_START]: { labelKey: "key_contract_start", trackRole: "datex", trackWidth: 180, kind: CD_COL_KIND.META, dirKeys: CD_SORT_LABEL_KEYS.OLDEST_FIRST },
    [CD_COL.CONTRACT_END]: { labelKey: "key_contract_end", trackRole: "datex", trackWidth: 180, kind: CD_COL_KIND.META, dirKeys: CD_SORT_LABEL_KEYS.OLDEST_FIRST },
    [CD_COL.COMPLETION_REASON]: { labelKey: "key_cd_completion_reason", trackRole: "status", trackWidth: 186, kind: CD_COL_KIND.META, dirKeys: CD_SORT_LABEL_KEYS.AZ },
    [CD_COL.CANCELLATION_REASON]: { labelKey: "key_cd_cancellation_reason", trackRole: "status", trackWidth: 192, kind: CD_COL_KIND.META, dirKeys: CD_SORT_LABEL_KEYS.AZ },
    [CD_COL.CS_OWNER]: { labelKey: "key_cs_owner", trackRole: "staff", trackWidth: 132, kind: CD_COL_KIND.META, ownerFilter: "cs_owner" },
    [CD_COL.CS_ASSISTANT]: { labelKey: "key_cs_assistant", trackRole: "staff", trackWidth: 132, kind: CD_COL_KIND.META, ownerFilter: "cs_assistant" },
    [CD_COL.PREPARED_OWNER]: { labelKey: "key_prepared_owner", trackRole: "staff", trackWidth: 132, kind: CD_COL_KIND.META, ownerFilter: "prepared_owner", dirKeys: CD_SORT_LABEL_KEYS.AZ },
    [CD_COL.READY_OWNER]: { labelKey: "key_ready_owner", trackRole: "staff", trackWidth: 132, kind: CD_COL_KIND.META, ownerFilter: "ready_owner", dirKeys: CD_SORT_LABEL_KEYS.AZ },
    [CD_COL.BRANCH]: { labelKey: "key_branch", trackRole: "staff", trackWidth: 132, kind: CD_COL_KIND.META },
});
export const CD_STAGE_TRACK = Object.freeze({ trackRole: "status", trackWidth: 144 });
export const CD_PAOS_TRACK = Object.freeze({ trackRole: "status", trackWidth: 172 });

/* ---- owner header filters + bulk ownership ---- */
export const CD_OWNER_REGISTER = Object.freeze({ CS_OWNER: "cs_owner", CS_ASSISTANT: "cs_assistant", PREPARED: "prepared_owner", READY: "ready_owner" });
export const CD_ASSISTANT_UNASSIGNED = "__unassigned__";
export const CD_OWNER_UNASSIGNED = CD_ASSISTANT_UNASSIGNED;   /* the Unassigned entry of every register filter */
export const CD_OWNER_FILTER_LABEL_KEYS = Object.freeze({
    [CD_OWNER_REGISTER.CS_OWNER]: "key_cd_filter_cs_owner", [CD_OWNER_REGISTER.CS_ASSISTANT]: "key_cd_filter_cs_assistant",
    [CD_OWNER_REGISTER.PREPARED]: "key_cd_filter_prepared_owner", [CD_OWNER_REGISTER.READY]: "key_cd_filter_ready_owner",
});
export const CD_OWNER_HIDE_BLOCKED_KEYS = Object.freeze({
    [CD_OWNER_REGISTER.CS_OWNER]: "key_cd_clear_cs_owner_filter_first", [CD_OWNER_REGISTER.CS_ASSISTANT]: "key_cd_clear_cs_assistant_filter_first",
    [CD_OWNER_REGISTER.PREPARED]: "key_cd_clear_prepared_owner_filter_first", [CD_OWNER_REGISTER.READY]: "key_cd_clear_ready_owner_filter_first",
});
export const CD_OWNER_API_PARAMS = Object.freeze({
    [CD_OWNER_REGISTER.CS_OWNER]: { ids: "cs_owner_ids", options: "owner_options" },
    [CD_OWNER_REGISTER.CS_ASSISTANT]: { ids: "cs_assistant_ids", options: "assistant_options", unassigned: "cs_assistant_unassigned", hasUnassigned: "has_unassigned_assistant" },
    /* the registers take ids and the literal "unassigned" in one list; facets from the list response (N-16) */
    [CD_OWNER_REGISTER.PREPARED]: { ids: "prepared_owner_staff_id", unassignedValue: "unassigned", options: "prepared_owner_options", hasUnassigned: "has_unassigned_prepared" },
    [CD_OWNER_REGISTER.READY]: { ids: "ready_owner_staff_id", unassignedValue: "unassigned", options: "ready_owner_options", hasUnassigned: "has_unassigned_ready" },
});
/* the row fields each register reads (id, name) */
export const CD_OWNER_ROW_KEYS = Object.freeze({
    [CD_OWNER_REGISTER.CS_OWNER]: ["cs_owner_id", "cs_owner_name"], [CD_OWNER_REGISTER.CS_ASSISTANT]: ["cs_assistant_id", "cs_assistant_name"],
    [CD_OWNER_REGISTER.PREPARED]: ["prepared_owner_id", "prepared_owner_name"], [CD_OWNER_REGISTER.READY]: ["ready_owner_id", "ready_owner_name"],
});
/* the bulk run copy per register */
export const CD_BULK_REGISTER_COPY = Object.freeze({
    [CD_OWNER_REGISTER.CS_OWNER]: { label: "key_processing_cs_owner", title: "key_change_processing_cs_owner", pickLabel: "key_new_cs_owner", note: "key_bulk_cs_owner_note", unassignedVerb: "key_bulk_set_assistant_unassigned" },
    [CD_OWNER_REGISTER.CS_ASSISTANT]: { label: "key_cs_assistant", title: "key_change_cs_assistant", pickLabel: "key_new_cs_assistant", note: "key_bulk_cs_assistant_note", unassignedVerb: "key_bulk_set_assistant_unassigned" },
    [CD_OWNER_REGISTER.PREPARED]: { label: "key_prepared_owner", title: "key_change_prepared_owner", pickLabel: "key_new_prepared_owner", note: "key_cr_prepared_owner_note", unassignedVerb: "key_cr_set_prepared_unassigned" },
    [CD_OWNER_REGISTER.READY]: { label: "key_ready_owner", title: "key_change_ready_owner", pickLabel: "key_new_ready_owner", note: "key_cr_ready_owner_note", unassignedVerb: "key_cr_set_ready_unassigned" },
});

/* ---- permission keys this screen reads (Settings grid ids) ---- */
export const CD_PERMISSION = Object.freeze({
    ACCESS_MODULE: "contract_processing", MASTER_ACCESS: "contract_processing_access",
    CONTRACT_MODULE: "contract", CONTRACT_CS_FILTER: "contract_global_cs", CONTRACT_BRANCH_FILTER: "contract_global_branch", NEW_CONTRACT_INVOICE: "contract_invoice_add_from_contract_global", /* PERM §6.5 (U-0272) */
    PROCESSING_MODULE: "processing",   /* K-21: the processing_global_* scope keys are retired — the dashboard reads contract_global_* only */
    BULK_OWNERS: "processing_bulk_change_owners", CHANGE_ASSISTANT: "processing_change_cs_assistant", CHANGE_PREP_READY: "processing_change_prep_ready_owner",
    START_EXTEND_VISA: "processing_start_extend_visa",
    OWNER_MODULE: "processing_cs_owner", OWNER_DETAILS: "processing_cs_owner_details", OWNER_CHANGE_OWNER: "processing_cs_owner_change_owner",
    NON_OWNER_MODULE: "processing_cs_non_owner", NON_OWNER_DETAILS: "processing_cs_non_owner_details", NON_OWNER_CHANGE_OWNER: "processing_cs_non_owner_change_owner",
});
export const CD_CS_FILTER_SCOPE = Object.freeze({ OWNER: "owner", ALL: "all" });
/* Search access on the Contracts dashboard (backend 269): the `contract_processing_access_type` level; `off` hides the search box,
   and a list request refused with SEARCH_ACCESS_OFF is "no search", not an error */
export const CD_SEARCH_ACCESS = Object.freeze({ KEY: "contract_processing_access_type", OFF: "off", REFUSAL_CODE: "SEARCH_ACCESS_OFF" });

/* ================= Contract record (/contracts/details/:contract_id — prototype Contract_Details.html) ================= */
export const CR_TAB = Object.freeze({ PROGRESS: "progress", DETAILS: "details", FORMS: "forms", INVOICE: "invoice", ACTIVITY: "activity" });
export const CR_TABS = Object.freeze([CR_TAB.PROGRESS, CR_TAB.DETAILS, CR_TAB.FORMS, CR_TAB.INVOICE, CR_TAB.ACTIVITY]);
export const CR_TAB_LABEL_KEYS = Object.freeze({
    [CR_TAB.PROGRESS]: "key_progress", [CR_TAB.DETAILS]: "key_details", [CR_TAB.FORMS]: "key_forms", [CR_TAB.INVOICE]: "key_invoice", [CR_TAB.ACTIVITY]: "key_activity",
});
export const CR_DETAIL_SECTION = Object.freeze({ VISA: "visa", PASSPORT: "passport", INSURANCE: "insurance" });
export const CR_DETAIL_SECTION_LABEL_KEYS = Object.freeze({
    [CR_DETAIL_SECTION.VISA]: "key_stage_visa", [CR_DETAIL_SECTION.PASSPORT]: "key_passport", [CR_DETAIL_SECTION.INSURANCE]: "key_stage_insurance",
});
export const CR_RAIL = Object.freeze({ CONTEXT: "context", CHAT: "chat" });
/* contract status id → dashboard status key (phase chip, labels) */
export const CR_STATUS_KEY_BY_ID = Object.freeze(Object.fromEntries(Object.entries(CD_STATUS_ID).map(([key, id]) => [id, key])));
/* workbook #8 — the only Change Status targets per phase; Active is reached through End of Deployment / End of Processing only */
export const CR_PHASE_TARGETS = Object.freeze({
    [CONTRACT_STATUS.PROCESSING]: [CONTRACT_STATUS.CANCELLED],
    [CONTRACT_STATUS.ACTIVE]: [CONTRACT_STATUS.COMPLETED, CONTRACT_STATUS.PROCESSING],
    [CONTRACT_STATUS.COMPLETED]: [CONTRACT_STATUS.ACTIVE],
    [CONTRACT_STATUS.CANCELLED]: [CONTRACT_STATUS.PROCESSING],
});
export const CR_CANCEL_REASONS = Object.freeze([
    { value: "gbo", labelKey: "key_gbo" }, { value: "ebo", labelKey: "key_ebo" }, { value: "medically_unfit", labelKey: "key_medically_unfit" }, { value: "other", labelKey: "key_other" },
]);
export const CR_SUSPENDING_REASONS = Object.freeze(["gbo", "medically_unfit"]);
/* the worker contract-status id that means a full-term "Finished" (processing API envs.worker_contract_status.finished_contract) */
export const CR_FINISHED_REASON_ID = 1;
export const CR_EXPECTED_END_YEARS = 2;
/* a reversion to Processing may reopen every stage of the Group except Insurance (approved rule) */
export const CR_REOPEN_EXCLUDED_STAGES = Object.freeze([CD_STAGE.INSURANCE]);
export const CR_REVERT_STEP = Object.freeze({ FORM: 1, REVIEW: 2 });
export const CR_ACTIVITY_RANGES = Object.freeze([
    { value: "all", labelKey: "key_all_time" }, { value: "7", labelKey: "key_last_1_week" }, { value: "30", labelKey: "key_last_1_month" },
    { value: "90", labelKey: "key_last_3_months" }, { value: "365", labelKey: "key_last_1_year" },
]);
export const CR_ACTIVITY_ALL_ACTORS = "all";
export const CR_ACTIVITY_PAGE_LIMIT = 100;
export const CR_INVOICE_PAGE_LIMIT = 50;
/* owner registers shown on the record (header pill, drawer) */
export const CR_OWNER_ROLE = Object.freeze({ CS: "cs", ASSISTANT: "assistant", PREPARED: "prepared", READY: "ready" });
export const CR_OWNER_ROLE_LABEL_KEYS = Object.freeze({
    [CR_OWNER_ROLE.CS]: "key_customer_service", [CR_OWNER_ROLE.ASSISTANT]: "key_cs_assistant", [CR_OWNER_ROLE.PREPARED]: "key_prepared_owner", [CR_OWNER_ROLE.READY]: "key_ready_owner",
});
/* permission keys the record reads beyond processingPermissionsUtils */
export const CR_PERMISSION = Object.freeze({
    WORKER_MODULE: "worker", WORKER_ACCESS: "worker_access", PARTNER_WORKER_MODULE: "partner_worker", PARTNER_WORKER_ACCESS: "partner_worker_access",
    EMPLOYER_MODULE: "employer", EMPLOYER_ACCESS: "employer_access",
    OWNER_PREFIX: "processing_cs_owner", NON_OWNER_PREFIX: "processing_cs_non_owner", REMARKS: "remarks", CHAT_HISTORY: "chat_history",
});
/* Employer Contact Details · Edit (PERM §6.7; backend K-14): POST /update-contact-details walks the contract ladder on this module key */
export const CR_CONTACT_MODULE_KEY = "contract";
export const CR_CONTACT_TYPE = Object.freeze({ EMPLOYER: "employer" });
export const CR_CONTACT_FIELD_MAX = Object.freeze({ NAME: 100, PHONE: 15, EMAIL: 120 });
/* E-1 / U-0032 duplicate-phone warn step rendered with the dialog's own .mcdt-dlg .note classes */
export const CR_DUPLICATE_WARNING_CLASSES = Object.freeze({
    root: "note warn", title: "ttl", text: "", list: "plain", row: "", source: "src", name: "", number: "num", note: "gap",
});

/* ---- Documents view (workbook #58 folders per Group, #60 View / Upload / Manage) ---- */
export const CR_DOC_FOLDER = Object.freeze({ CONTRACT: "contract", CONSULATE: "consulate", IMMIGRATION: "immigration", VISA: "visa", PRE_DEPARTURE: "predeparture" });
export const CR_DOC_FOLDERS_BY_GROUP = Object.freeze({
    1: [CR_DOC_FOLDER.CONTRACT, CR_DOC_FOLDER.CONSULATE, CR_DOC_FOLDER.IMMIGRATION, CR_DOC_FOLDER.VISA],
    2: [CR_DOC_FOLDER.CONTRACT, CR_DOC_FOLDER.PRE_DEPARTURE, CR_DOC_FOLDER.IMMIGRATION, CR_DOC_FOLDER.VISA, CR_DOC_FOLDER.CONSULATE],
    3: [CR_DOC_FOLDER.CONTRACT, CR_DOC_FOLDER.CONSULATE, CR_DOC_FOLDER.IMMIGRATION, CR_DOC_FOLDER.VISA],
    4: [CR_DOC_FOLDER.CONTRACT, CR_DOC_FOLDER.IMMIGRATION, CR_DOC_FOLDER.VISA, CR_DOC_FOLDER.CONSULATE],
});
export const CR_DOC_FOLDER_LABEL_KEYS = Object.freeze({
    [CR_DOC_FOLDER.CONTRACT]: "key_stage_contract", [CR_DOC_FOLDER.CONSULATE]: "key_stage_consulate", [CR_DOC_FOLDER.IMMIGRATION]: "key_stage_immigration",
    [CR_DOC_FOLDER.VISA]: "key_stage_visa", [CR_DOC_FOLDER.PRE_DEPARTURE]: "key_stage_pre_departure",
});
/* folders with an Uploaded declaration listing (get-processing-details) */
export const CR_DOC_LISTING_TITLE_KEYS = Object.freeze({
    [CR_DOC_FOLDER.CONTRACT]: "key_contract_documents", [CR_DOC_FOLDER.CONSULATE]: "key_consulate_documents", [CR_DOC_FOLDER.IMMIGRATION]: "key_immigration_documents",
});
export const CR_DOC_PERMISSION = Object.freeze({ VIEW: "view", UPLOAD: "upload", MANAGE: "manage" });
export const CR_DOC_VIEW = Object.freeze({ GALLERY: "gallery", LIST: "list" });
export const CR_DOC_FOLDER_ONLY = "none";
export const CR_DOC_PAGE_LIMIT = 200;
/* PROCESS §8.1 (U-0285): 10 MB, PDF / JPG / PNG only — Word files are no longer accepted (stored ones stay viewable) */
export const CR_DOC_FILE_LIMIT = 10 * 1024 * 1024;
export const CR_DOC_ACCEPT = ".jpg, .jpeg, .png, .pdf";
export const CR_DOC_ACCEPT_RE = /\.(pdf|jpe?g|png)$/i;
export const CR_IMMIGRATION_SUBMITTED = "submitted";

/* ---- PAOS (CT-06, §PAOS boundaries; prototype V28_PAOS_STATES / V28_PAOS_NEXT, v211 closed-parent outcome) ---- */
export const CR_PAOS_PROGRESS = Object.freeze({
    TO_ARRANGE: "to_arrange", SCHEDULED: "scheduled", ATTENDED: "attended_certificate_pending", COMPLETED: "completed", NEEDS_REBOOKING: "needs_rebooking",
});
export const CR_PAOS_LABEL_KEYS = Object.freeze({
    [CR_PAOS_PROGRESS.TO_ARRANGE]: "key_paos_to_arrange", [CR_PAOS_PROGRESS.SCHEDULED]: "key_paos_scheduled",
    [CR_PAOS_PROGRESS.ATTENDED]: "key_paos_attended_certificate_pending", [CR_PAOS_PROGRESS.COMPLETED]: "key_paos_completed",
    [CR_PAOS_PROGRESS.NEEDS_REBOOKING]: "key_paos_needs_rebooking",
});
/* progress moves only along these edges, by an explicit update */
export const CR_PAOS_NEXT = Object.freeze({
    [CR_PAOS_PROGRESS.TO_ARRANGE]: [CR_PAOS_PROGRESS.SCHEDULED],
    [CR_PAOS_PROGRESS.SCHEDULED]: [CR_PAOS_PROGRESS.ATTENDED, CR_PAOS_PROGRESS.NEEDS_REBOOKING],
    [CR_PAOS_PROGRESS.NEEDS_REBOOKING]: [CR_PAOS_PROGRESS.SCHEDULED],
    [CR_PAOS_PROGRESS.ATTENDED]: [CR_PAOS_PROGRESS.COMPLETED],
    [CR_PAOS_PROGRESS.COMPLETED]: [],
});
/* an outcome exists only for an arranged session (closed-parent Record outcome) */
export const CR_PAOS_OUTCOME_FROM = Object.freeze([CR_PAOS_PROGRESS.SCHEDULED, CR_PAOS_PROGRESS.ATTENDED]);
export const CR_PAOS_ACTION = Object.freeze({ ARRANGE: "arrange", UPDATE: "update", RECORD_OUTCOME: "record_outcome", VIEW: "view" });
export const CR_PAOS_TRI = Object.freeze({ NONE: "", YES: "yes", NO: "no" });
export const CR_PAOS_PROCESSING = Object.freeze({ INCLUDED: "included", EXCLUDED: "excluded" });
export const CR_PAOS_ROSTER_LIMIT = 25;
/* prototype V28_ROSTER_COLS (two sticky identity columns, kit tracks) */
export const CR_PAOS_ROSTER_COLS = Object.freeze([
    { key: "name", labelKey: "key_worker_name", trackRole: "name", trackWidth: 200, sticky: "wemp" },
    { key: "code", labelKey: "key_worker_code", trackRole: "ref", trackWidth: 140, sticky: "wname" },
    { key: "employer", labelKey: "key_employer_name", trackRole: "name", trackWidth: 200 },
    { key: "start", labelKey: "key_contract_start", trackRole: "datex", trackWidth: 180 },
    { key: "parent", labelKey: "key_contract", trackRole: "status", trackWidth: 150 },
    { key: "branch", labelKey: "key_branch", trackRole: "staff", trackWidth: 132 },
    { key: "owner", labelKey: "key_cs_owner", trackRole: "staff", trackWidth: 132 },
    { key: "paos", labelKey: "key_stage_paos", trackRole: "status", trackWidth: 150 },
    { key: "session", labelKey: "key_session", trackRole: "status", trackWidth: 150 },
    { key: "venue", labelKey: "key_venue", trackRole: "datex", trackWidth: 170 },
    { key: "cert", labelKey: "key_certificate", trackRole: "ref", trackWidth: 144 },
]);

/* ---- Follow Up arrival (prototype v29ApplyFollowup: ?followup=<task>[&send=1][&from=…] lands on the rail pane) ---- */
export const CR_FOLLOW_UP_QUERY = Object.freeze({ TASK: CAL_SOURCE_QUERY.FOLLOW_UP, SEND: "send", FROM: CAL_SOURCE_QUERY.FROM });
export const CR_FOLLOW_UP_SEND_ON = "1";
/* Send Template from a Contract task (U-0013): the Contract stage composer, as the Contract stage panel opens it */
export const CR_TASK_SEND_TEMPLATE = Object.freeze({ userType: "processing" });

/* ---- stage panels: stored status id → vocabulary token (PROCESS "Stage status vocabulary"; one map for every panel head) ---- */
export const CR_SUB_TOKEN = Object.freeze({ RECEIVED_BY_HELPER: "Received by Helper", HKID_PROCESSED: "HKID Processed", HELPER_PICKED_UP: CD_TOKEN.HELPER_PICKED_UP });
export const CR_STATUS_TOKEN = Object.freeze({
    not_ready: CD_TOKEN.NOT_READY, ready: CD_TOKEN.READY, ready_to_submit: CD_TOKEN.READY_TO_SUBMIT, submitted: CD_TOKEN.SUBMITTED, returned: CD_TOKEN.RETURNED,
    letter_of_authorization_ready: CD_TOKEN.AUTH_READY, visa_reference_number_released: CD_TOKEN.REF_RELEASED, visa_released: CD_TOKEN.VISA_RELEASED,
    submit_policy_request: CD_TOKEN.REQUEST_SUBMITTED, not_required: CD_TOKEN.NOT_REQUIRED,
    coupon_shared: CD_TOKEN.CHECKUP_COMPLETED, approved_by_er: CD_TOKEN.APPROVED_BY_ER, flight_booked: CD_TOKEN.FLIGHT_BOOKED,
    received_by_helper: CR_SUB_TOKEN.RECEIVED_BY_HELPER, hkid_processed: CR_SUB_TOKEN.HKID_PROCESSED, helper_picked_up: CR_SUB_TOKEN.HELPER_PICKED_UP,
    completed: CD_TOKEN.COMPLETED, in_progress: CD_TOKEN.IN_PROGRESS,
});
/* the terminal token per panel (the dashboard stages + the Deployment sub-stages and the Visa sub-panels) */
/* The status menus receive `{ id, name, enable, blocked_by }` options, while a document stores its status either as the
   option id (stage documents) or as a slug such as `letter_of_authorization_ready` (visa / deployment / medical sub-stages).
   The current option matches by id, by name, by the slug of the name, or by the slug's token label. */
const slugOf = (text) => String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
export const isCurrentStatusOption = (option, current) => {
    if (current === null || current === undefined || current === "") return false;
    const cur = String(current).toLowerCase();
    const name = String(option?.name || "").toLowerCase();
    if (String(option?.id).toLowerCase() === cur || name === cur || slugOf(name) === cur) return true;
    const token = CR_STATUS_TOKEN[cur];
    return Boolean(token) && token.toLowerCase() === name;
};
export const CR_STAGE_TERMINAL_TOKEN = Object.freeze({
    ...CD_TERMINAL,
    dhl_contract: CR_SUB_TOKEN.RECEIVED_BY_HELPER, flight_details: CD_TOKEN.FLIGHT_BOOKED, hkid: CR_SUB_TOKEN.HKID_PROCESSED, pickup: CR_SUB_TOKEN.HELPER_PICKED_UP,
    authorization_letter: CD_TOKEN.AUTH_READY, e_visa: CD_TOKEN.VISA_RELEASED,
});
export const CR_PICKUP_REQUIRE = Object.freeze({ YES: "y", NO: "n" });

/* ---- E-Visa panel (TERMINAL §5, U-0187): read-only after release; PDF accepted (PROCESS §8.1), size rule per Q-05 ---- */
export const CR_EVISA_RELEASED = "visa_released";
export const CR_EVISA_ACCEPT = ".jpg, .jpeg, .png, .pdf";

/* ---- Prepared owner / Ready owner registers (OWNERS "Prepared and Ready"; backend S4): sign-off registers, never the CS Owner ---- */
export const CR_PREP_READY = Object.freeze({
    REGISTER: Object.freeze({ PREPARED: "prepared_owner", READY: "ready_owner" }),
    REGISTER_BY_ROLE: Object.freeze({ [CR_OWNER_ROLE.PREPARED]: "prepared_owner", [CR_OWNER_ROLE.READY]: "ready_owner" }),
    REASON_MAX: 500,
    GROUPS: CD_GROUPS,
    /* the one 409 that is not a stale case: the person already holds that register (backend 378) */
    ALREADY_ASSIGNED_CODE: "PREP_READY_OWNER_ALREADY_ASSIGNED",
});

/* ---- Forms tab (S14; prototype formsHTML / fx*; PROCESS §4, §11.4; workbook #61–#63): one canonical model behind the
   Master Form and the three official ImmD forms, each surface a render of it ---- */
export const CR_FORM = Object.freeze({ MASTER: "master", ID988A: "988A", ID988B: "988B", ID407: "407" });
export const CR_FORMS = Object.freeze([CR_FORM.MASTER, CR_FORM.ID988A, CR_FORM.ID988B, CR_FORM.ID407]);
export const CR_FORM_LABEL_KEYS = Object.freeze({ [CR_FORM.MASTER]: "key_master_form", [CR_FORM.ID988A]: "key_id_988a", [CR_FORM.ID988B]: "key_id_988b", [CR_FORM.ID407]: "key_id_407" });
/* the blank official references (prototype OFFICIAL_FORMS / OFFICIAL_PAGES; files under public/official-forms) */
export const CR_FORM_OFFICIAL = Object.freeze({
    [CR_FORM.ID988A]: { file: "id988a.pdf", title: "ID 988A", version: "ID 988A (06/2024)", pages: 5, slug: "id988a" },
    [CR_FORM.ID988B]: { file: "id988b.pdf", title: "ID 988B", version: "ID 988B (06/2024)", pages: 4, slug: "id988b" },
    [CR_FORM.ID407]: { file: "id407.pdf", title: "ID 407", version: "ID 407 (11/2016)", pages: 2, slug: "id407" },
});
export const CR_FORM_OFFICIAL_PATH = "/official-forms/";
export const CR_FORM_PERMISSION = Object.freeze({ VIEW: "view", EDIT: "edit" });   /* processing_cs_(non_)owner_forms CSV values */
/* enumerations: one code set per datum (the panel-wide gender codes; the server's own string codes elsewhere) */
export const CR_FX = Object.freeze({
    GENDER: Object.freeze({ FEMALE: "1", MALE: "2" }),   /* the `genders` master table (backend C-6): 1 = Female, 2 = Male */
    YES_NO: Object.freeze({ YES: "yes", NO: "no" }),
    YN: Object.freeze({ YES: "y", NO: "n" }),
    BIT: Object.freeze({ YES: "1", NO: "0" }),
    ENTRY_VISA: Object.freeze({ ENTRY: "take_up_employment", RENEW_LEAVE: "new_contract", RENEW_DEFER: "deferring_home_leave", EXTEND: "completion_of_current_contract" }),
    EMPLOYMENT: Object.freeze({ FIRST: "first_time", RENEWAL: "renewal", REPLACE: "replacement", ADDITIONAL: "additional_letter" }),
    BASIS: Object.freeze({ A: "A", B: "B", C: "C" }),
    UNIT: Object.freeze({ SQFT: "sqft", SQM: "sqm" }),
    FOOD: Object.freeze({ PROVIDED: "provided", ALLOWANCE: "allowance" }),
    SLEEP: Object.freeze({ SHARE: "share_room", PARTITION: "separate_area", OTHERS: "others" }),
    STATUS: Object.freeze({ EMPLOYMENT: "employment", OTHER: "other" }),
    AGED_CARE: Object.freeze({ REQUIRED: "required", NOT: "not_required" }),
    PURPOSE: Object.freeze({ DEFER: "deferring_home_leave", COMPLETE: "completion_of_current_contract" }),
    LEAVING: Object.freeze({ BEFORE: "take_leave_before_new_contract", DEFER: "mututaly_agreed_defer_leave" }),
});
/* option lists (value → en key); the official forms add the Chinese mirror beside the English label */
export const CR_FX_OPTS = Object.freeze({
    sex: [[CR_FX.GENDER.MALE, "key_male", "男"], [CR_FX.GENDER.FEMALE, "key_female", "女"]],
    yesno: [[CR_FX.YES_NO.YES, "key_yes", "有"], [CR_FX.YES_NO.NO, "key_no", "沒有"]],
    yesnoPlain: [[CR_FX.YES_NO.YES, "key_yes"], [CR_FX.YES_NO.NO, "key_no"]],
    yn: [[CR_FX.YN.YES, "key_yes"], [CR_FX.YN.NO, "key_no"]],
    bit: [[CR_FX.BIT.YES, "key_yes"], [CR_FX.BIT.NO, "key_no"]],
    unit: [[CR_FX.UNIT.SQFT, "key_square_feet"], [CR_FX.UNIT.SQM, "key_square_metres"]],
    food: [[CR_FX.FOOD.PROVIDED, "key_fx_food_provided"], [CR_FX.FOOD.ALLOWANCE, "key_fx_food_allowance_paid"]],
    basis: [[CR_FX.BASIS.A, "key_fx_basis_a"], [CR_FX.BASIS.B, "key_fx_basis_b"], [CR_FX.BASIS.C, "key_fx_basis_c"]],
    /* K-18: (c) extension of stay never appears on a processing record */
    appType: [[CR_FX.ENTRY_VISA.ENTRY, "key_fx_app_a"], [CR_FX.ENTRY_VISA.RENEW_LEAVE, "key_fx_app_b1"], [CR_FX.ENTRY_VISA.RENEW_DEFER, "key_fx_app_b2"]],
    /* the one editable home-leave choice of a (b) application (K-18) */
    purpose: [[CR_FX.PURPOSE.COMPLETE, "key_taking_home_leave_before_new_contract"], [CR_FX.PURPOSE.DEFER, "key_deferring_home_leave"]],
    employment: [[CR_FX.EMPLOYMENT.FIRST, "key_first_time_employment"], [CR_FX.EMPLOYMENT.RENEWAL, "key_contract_renewal_with_the_same_helper"], [CR_FX.EMPLOYMENT.REPLACE, "key_replacement"], [CR_FX.EMPLOYMENT.ADDITIONAL, "key_fx_additional_helper"]],
    agedCare: [[CR_FX.AGED_CARE.REQUIRED, "key_fx_aged_care_required"], [CR_FX.AGED_CARE.NOT, "key_fx_not_required"]],
    relationship: [["Employer", "key_employer"], ["Spouse of employer", "key_fx_spouse_of_employer"], ["Relative of employer", "key_fx_relative_of_employer"], ["Other", "key_other"]],
    sleep: [[CR_FX.SLEEP.SHARE, "key_fx_share_room_with_children"], [CR_FX.SLEEP.PARTITION, "key_fx_separate_partitioned_area"], [CR_FX.SLEEP.OTHERS, "key_fx_others"]],
    status: [[CR_FX.STATUS.EMPLOYMENT, "key_employment", "僱傭工作"], [CR_FX.STATUS.OTHER, "key_fx_others_please_specify", "其他 (請註明)"]],
});
/* the model keys the server has no column for yet (prototype fields; backend asks F-01…F-05) — posted, may be ignored */
export const CR_FX_NEW_KEYS = Object.freeze(["worker_travel_document_type", "contract_commencement_basis", "previous_contract_number", "aged_care_required", "worker_undertaking_live_in"]);

/* ================= Extend Visa case (EXTEND.md; backend S2 — /processing/global/extend-visa) ================= */
export const CR_XV = Object.freeze({
    LIFECYCLE: Object.freeze({ OPEN: "open", COMPLETED: "completed", CANCELLED: "cancelled" }),
    /* Immigration stage: Not Ready → Ready to Submit → Submitted (back to Not Ready through Return / Rework) */
    IMM: Object.freeze({ NOT_READY: "not_ready", READY_TO_SUBMIT: "ready_to_submit", SUBMITTED: "submitted" }),
    IMM_COMMAND: Object.freeze({ READY_TO_SUBMIT: "ready_to_submit", SUBMITTED: "submitted", RETURN: "return" }),
    /* Visa stage: Not Ready → Visa Ref. No. Released → Visa Released (the case completes) */
    VISA: Object.freeze({ NOT_READY: "not_ready", REF_RELEASED: "visa_reference_number_released", RELEASED: "visa_released" }),
    MARK: Object.freeze({ PREPARED: "prepared", READY: "ready" }),
    ASSESS: Object.freeze({ APPLICABLE: "applicable", NOT_APPLICABLE: "not_applicable" }),
    SECTION: Object.freeze({ EMPLOYER: "employer", HELPER: "helper", DRIVING: "driving_duties", FINANCIAL: "financial_support", RENTAL: "public_rental", COMPANY: "company_support", OPTIONAL: "optional" }),
    CANCEL_CAUSE: Object.freeze({ STANDALONE: "standalone", PARENT_COMPLETED: "parent_completed", PARENT_CANCELLED: "parent_cancelled" }),
    ACK_FIELD: "acknowledge_extend_visa_cancel",
    REASON_MAX: 500,
    ERROR: Object.freeze({
        NOT_FOUND: "EXTEND_VISA_CASE_NOT_FOUND", PARENT_NOT_ACTIVE: "EXTEND_VISA_PARENT_NOT_ACTIVE", OPEN_EXISTS: "EXTEND_VISA_OPEN_CASE_EXISTS",
        ACK_REQUIRED: "EXTEND_VISA_OPEN_CASE_ACK_REQUIRED", GATE: "EXTEND_VISA_GATE_NOT_SATISFIED",
        NOT_PREPARED_OWNER: "EXTEND_VISA_NOT_PREPARED_OWNER", NOT_READY_OWNER: "EXTEND_VISA_NOT_READY_OWNER", READY_REQUIRES_PREPARED: "EXTEND_VISA_READY_REQUIRES_PREPARED",
    }),
});
/* the stage keys the shared status-token map (stageToken) resolves the case rail with */
export const CR_XV_STAGE_KEY = Object.freeze({ IMM: "immigration", VISA: "e_visa" });
/* the case's two document folders (`folder` on extend-visa/files and on every case file — K-9) */
export const CR_XV_FOLDER = Object.freeze({ IMM: "immigration", VISA: "visa" });
export const CR_XV_LIFECYCLE_LABEL_KEYS = Object.freeze({ [CR_XV.LIFECYCLE.OPEN]: "key_open", [CR_XV.LIFECYCLE.COMPLETED]: "key_completed", [CR_XV.LIFECYCLE.CANCELLED]: "key_cancelled" });

/* Contract Details → record header Edit (PROCESS.md §3.3.2; work order 2026-10-21): the record's own editable metadata,
   and the legacy-detail key the Deployment arrival is read from until the record carries a flat `arrival_date` (asked 21 Oct) */
export const CR_RECORD_EDIT = Object.freeze({
    FIELDS: Object.freeze({ REQUESTED_START: "requested_start_date", ARRIVAL: "arrival_date" }),
    ARRIVAL_DETAIL_KEY: "processingDeploymentModel.arrival_date",
});

/* visa-expiry-update refusals the E-Visa panel reacts to (TERMINAL §5 / REQ-11): a changed recorded expiry needs a reason */
export const CR_VISA_EXPIRY_CODE = Object.freeze({ REASON_REQUIRED: "VISA_EXPIRY_CHANGE_REASON_REQUIRED" });
/* backend 365: update-processing-visa-evisa after release without `reason` → 422, body.error_code (body.code is the HTTP number) */
export const CR_VISA_CORRECTION_CODE = Object.freeze({ REASON_REQUIRED: "VISA_CORRECTION_REASON_REQUIRED" });

/* Documents — the image → PDF conversion dialog's two steps */
export const CR_DOC_CONVERT_STEP = Object.freeze({ CONFIRM: "confirm", PREVIEW: "preview" });

/* Details → Visa History (open point 18): a correction row names its field by the API key or the prototype short code */
export const CR_VISA_LEGACY_PROVENANCE = "legacy_unknown";
export const CR_VISA_FIELD_LABEL_KEYS = Object.freeze({
    visa_reference_no: "key_visa_reference_no", ref: "key_visa_reference_no",
    e_visa_payment_date: "key_e_visa_payment_date", pay: "key_e_visa_payment_date",
    visa_expiry_date: "key_visa_expiry", expiry: "key_visa_expiry",
    entry_visa_expiry_date: "key_entry_visa_expiry", entry: "key_entry_visa_expiry",
});
