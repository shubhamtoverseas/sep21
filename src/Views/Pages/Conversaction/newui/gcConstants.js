
import copyKeys from "../../../../utils/copyKeys";
import { WORKER_PROFILE_STATUS } from "../../WorkerPage/workerModuleConstants";
export const GC_CHANNEL_META = copyKeys({
    app: { label: 'key_in_app', icon: "mobile", cls: "" },
    whatsapp: { label: 'key_gc_channel_meta_whatsapp_label', icon: "wa", cls: "gc-ic-wa" },
    line: { label: "LINE", icon: "lineapp", cls: "gc-ic-line" },
});

export const GC_STAKE_TYPES = {
    employer: { avatar: "employer", cls: "employer" },
    worker: { avatar: "worker", cls: "worker" },
    partner: { avatar: "shield", cls: "partner" },
    user: { avatar: "team", cls: "team" },
    group_team: { avatar: "group", cls: "group" },
};

export const GC_LIST_LIMIT = 10;

export const PAGE_LIMIT = 10;

export const IV_MENU_GAP = 4;

export const IV_MENU_EST_HEIGHT = 140;

export const WORKER_TYPE_FILTERS = ["Local", "Overseas"];

export const OUTCOME_FILTERS = [
    { id: "declined", labelKey: "key_declined", server: { job_stage: 9 } },
    { id: "not_suitable", labelKey: "key_not_suitable", server: { job_stage: 9, not_suitable: 1 } },
    { id: "no_show", labelKey: "key_no_show", server: { job_stage: 4, no_show: 1 } },
];

export const WSTAGE_LABEL_KEY = {
    1: "key_job_invited", 17: "key_suggested",
    2: "key_applied_stage", 3: "key_applied_stage",
    4: "key_interview_invited",
    5: "key_upcoming", 6: "key_completed", 10: "key_cancelled",
};

export const WSTAGE_CLASS = {
    1: "gc-sp-invited", 17: "gc-sp-invited",
    2: "gc-sp-applied", 3: "gc-sp-applied",
    4: "gc-sp-pending",
    5: "gc-sp-upcoming",
    6: "gc-sp-completed",
    10: "gc-sp-cancelled",
};

export const WORKER_STAGE_ACTIONS = {
    1: [
        { id: "w_apply", labelKey: "key_apply", pri: true, gate: "accept" },
        { id: "w_remove", labelKey: "key_remove", danger: true, gate: "decline" },
    ],
    4: [
        { id: "w_accept", labelKey: "key_accept", pri: true, gate: "accept" },
        { id: "w_decline", labelKey: "key_decline", danger: true, gate: "decline" },
    ],
    5: [
        { id: "w_reschedule", labelKey: "key_reschedule", pri: true, gate: "reschedule" },
        { id: "w_cancel", labelKey: "key_cancel", danger: true, gate: "decline" },
    ],
};

/* worker Profile Status chip class — the header tone of the ONE registry (WORKER_PROFILE_STATUS) mapped onto the .gc-st-* palette */
const GC_STATUS_CLASS_BY_TONE = {
    avail: "gc-st-available", ver: "gc-st-available", teal: "gc-st-available",
    rev: "gc-st-info",
    inc: "gc-st-hold",
    severe: "gc-st-danger", dark: "gc-st-danger",
    up: "gc-st-neutral", slate: "gc-st-neutral",
};
export const STATUS_CHIP_BY_ID = Object.fromEntries(Object.values(WORKER_PROFILE_STATUS).map((s) => [s.id, GC_STATUS_CLASS_BY_TONE[s.tone] || "gc-st-neutral"]));

export const WORKER_STATUS_AVAILABLE = 3;

export const ROLE_KEY = {
    employer: "key_employer",
    worker: "key_worker",
    user: "key_team",
    partner: "key_partner",
    group_team: "key_group",
};

export const TRANSLATE_MODES = ["original", "translated", "both"];

/* thread header (prototype .thread-head): the scoped-chat tag, the search toggle and the name's summary tooltip */
export const GC_HEADER_COPY = copyKeys(Object.freeze({
    scopedChat: 'key_gc_scoped_chat',
    searchInConversation: 'key_gc_search_in_conversation',
    viewSummary: Object.freeze({
        employer: 'key_gc_view_employer_summary',
        worker: 'key_gc_view_worker_summary',
        group_team: 'key_gc_view_group_summary',
    }),
}));

/* search in conversation (prototype .th-search, Gap 14b) */
export const GC_SEARCH_COPY = copyKeys(Object.freeze({
    placeholder: 'key_gc_search_placeholder',
    close: 'key_gc_close_search',
    noMatch: 'key_gc_search_no_match',
    messageOne: 'key_gc_search_message_one',
    messageOther: 'key_gc_search_message_other',
}));

/* timeline (prototype bubble): the template header strip and the temporary-failure note */
export const GC_TIMELINE_COPY = copyKeys(Object.freeze({
    template: 'key_gc_template',
    deliveryFailedTemporary: 'key_gc_delivery_failed_temporary',
}));

/* composer (prototype .composer-zone): the lock panel's "Use <channel>" buttons and their switch notice (only the
   channels a WhatsApp lock can fall back to), and the blocked banner's 繁中 and server-authority lines */
export const GC_COMPOSER_COPY = copyKeys(Object.freeze({
    useChannel: Object.freeze({ app: 'key_use_in_app', line: 'key_gc_use_line' }),
    switchedTo: Object.freeze({ app: 'key_gc_switched_to_in_app', line: 'key_gc_switched_to_line' }),
    blockedNoteZh: 'key_gc_blocked_note_zh',
    blockedServerNote: 'key_gc_blocked_server_note',
}));

/* stable codes the chat service returns when it refuses a send (OP-CHAT-BE-06) — the same names as maidmatch-chat
   src/config/chat.refusal.codes.js. INTERVIEW_NOT_COMPLETED joins with CH-10, which is on hold. */
export const GC_REFUSAL_CODES = Object.freeze({
    CONTACT_SHARING_BLOCKED: "CONTACT_SHARING_BLOCKED",
});

/* CONTACT_SHARING_BLOCKED → the blocked banner: the refusal's `reason` → the banner's reason line (the keys gcBlockCheck returns) */
export const GC_BLOCK_REASON_KEYS = Object.freeze({
    phone: "key_group_blocked_phone",
    email: "key_group_blocked_email",
    contact: "key_group_blocked_contact",
    meeting: "key_group_blocked_meeting",
});

/* Send Template dialog (prototype 11, register rows #18–#20) */
export const GC_TEMPLATE_COPY = copyKeys(Object.freeze({
    sendTo: 'key_gc_send_to',
    template: 'key_gc_template',
    openWhatsApp: 'key_gc_open_whatsapp',
    openWhatsAppTitle: 'key_gc_open_whatsapp_title',
    langFallback: 'key_gc_tpl_lang_fallback',
    langUnavailable: 'key_gc_tpl_lang_unavailable',
}));

/* right panel: the neutral denial (the standalone Job Offer Details copy) and the CS Owner Team-chat refusals (register row #14) */
export const GC_PANEL_COPY = copyKeys(Object.freeze({
    deniedTitle: 'key_not_available',
    deniedText: 'key_fu_not_available',
    teamChatSelf: 'key_gc_team_chat_self',
    teamChatOwnerChanged: 'key_gc_team_chat_owner_changed',
}));

// @migration-unspecified(chat): spec is silent on the WhatsApp "window closing" threshold (open question Q2: one config value).
// Retained existing behaviour (1 hour). Confirm with product before release.
export const GC_WA_CLOSING_THRESHOLD_MS = 60 * 60 * 1000;

export const LANG_FIELD = { id: "content_id", en: "content_en", zh_cn: "content_zh_cn", zh_tw: "content_zh_tw" };

export const SCAN_DAYS = 42;

export const MAX_PILLS = 8;

/* interview report Status (JO.md 4.2): Completed / Cancelled Worker No Show / Cancelled Employer No Show — the same
   vocabulary the Worker interview card uses (workerModuleConstants) */
export const OUTCOME_LABELS = {
    completed: "key_completed",
    worker_not_show: "key_cancelled_worker_no_show",
    employer_not_show: "key_cancelled_employer_no_show",
};

export const STAKE_OPTIONS = [
    { id: "", labelKey: "key_all" },
    { id: "employer", labelKey: "key_employers" },
    { id: "worker", labelKey: "key_workers" },
    { id: "user", labelKey: "key_team" },
    { id: "partner", labelKey: "key_partners" },
    { id: "group_team", labelKey: "key_group" },
];

/* conversation-list header (prototype .convo-title-row). The prototype's + and Advanced filters buttons carry no action
   and no flow exists for either here, so both render disabled with a reason (CHAT_UI Step 2). */
export const GC_LIST_COPY = copyKeys(Object.freeze({
    title: 'key_gc_conversations',
    newConversation: 'key_gc_new_conversation',
    newConversationUnavailable: 'key_gc_new_conversation_unavailable',
    advancedFilters: 'key_gc_advanced_filters',
    advancedFiltersUnavailable: 'key_gc_advanced_filters_unavailable',
}));

export const PANEL_TITLE_KEYS = {
    "emp-sum": "key_employer_summary",
    "wkr-sum": "key_worker_summary",
    jod: "key_job_offer_details",
    "jo-app-details": "key_jo_applicant_details",
    profile: "key_worker_profile",
    invited: "key_jo_dash_title",
    "jo-worker-view": "key_jo_record_applicant_view",
};

export const SUMMARY_VIEWS = ["emp-sum", "wkr-sum"];

export const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];

export const VALID_FILE_EXTENSIONS = ["pdf", "doc", "docx"];

/* Schedule Interview ownership row (28 Sep U002 / 1 Oct Job Offer #18): read-only, taken from the Job Offer and the applicant */
export const GC_INTERVIEW_OWNERS_COPY = copyKeys(Object.freeze({
    title: 'key_gc_interview_owners_title',
    csAssistant: 'key_cal_task_cs_assistant',
    interpreterOwner: 'key_gc_interview_owners_interpreter_owner',
    note: 'key_gc_interview_owners_note',
    collision: 'key_gc_interview_owner_collision',
}));
/* backend 194: 422 at booking when a stamped owner is inactive, the CS Owner is missing, or CS Owner = CS Assistant; the message names the role */
export const GC_INTERVIEW_OWNERS_UNRESOLVED_CODE = 'INTERVIEW_OWNERS_UNRESOLVED';
