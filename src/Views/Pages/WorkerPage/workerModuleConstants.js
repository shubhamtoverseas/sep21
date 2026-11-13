import translation from "../../../utils/translation";
import copyKeys from "../../../utils/copyKeys";
import { HONGKONG_LOCATION_ID, MACAU_LOCATION_ID } from "../../../components/ReusableComponents/constants";
import routes from "../routes/routesConfig";


export const API_DATE_FORMAT = "YYYY-MM-DD";

export const SEARCH_DEBOUNCE_MS = 600;
export const WGD_VIEW_STATE_KEY = 'wgd_view_state_v2';
/* Backend id for the `Inactive` profile status (Available + no app activity for
 * 60d local / 90d overseas) — set by the schedulers job; restored to Available on
 * a new app interaction. Backend id = 14 (worker_statuses row added by ws-sql). */
export const INACTIVE_STATUS_ID = 14;
/* en keys — read through translation() */
export const WGD_SEARCH_PLACEHOLDER = 'key_wkr_search_workers_placeholder';
export const WGD_SEARCH_HELP_TEXT = 'key_wkr_search_help_text';
/* en key — read through translation() (worker_AUDIT D26: a neutral key, not the Employer one) */
export const WGD_SEARCH_DISABLED_TITLE = 'key_cd_search_disabled';
/* SEARCH.md 2.1.1: shown to a Restricted actor whose query matches more than the 10-row cap */
export const WGD_SEARCH_TOO_MANY = 'Too many results. Please refine your search criteria by providing additional details.';
/* Check-in session rules shown in the QR drawer (60-min sessions, 8h/day cap) */
export const CHECKIN_SESSION_STEP_MIN = 60;
export const CHECKIN_SESSION_CAP_MIN = 480;
/* backend 374 refusal codes on get-branch-checkin-sessions / extend-branch-checkin-session */
export const CHECKIN_ERROR_CODES = Object.freeze({ BRANCH_NOT_ALLOWED: "BRANCH_NOT_ALLOWED", SESSION_NOT_FOUND: "CHECKIN_SESSION_NOT_FOUND", DAILY_CAP_REACHED: "CHECKIN_DAILY_CAP_REACHED", EXTENSION_STEP: "CHECKIN_EXTENSION_STEP" });
/* Send registration link (Old_vs_New_By_Module 25 Sep · Worker #30–#34): the shared host/partner invitation screen */
export const SEND_REG_LINK_AGENCIES_QUERY = Object.freeze({ status: 1, agency_category: 'partner' });
export const SEND_REG_LINK_EMPTY = Object.freeze({ agency_id: '', branch_id: '', email: '' });
export const SEND_REG_LINK_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SEND_REG_LINK_PHASE = Object.freeze({
    FORM: 'form', CHOOSE_BRANCH: 'choose-branch', SENDING: 'sending', SENT: 'sent', FAILED: 'failed',
    BLOCKED_PERMISSION: 'blocked-permission', BLOCKED_SCOPE: 'blocked-scope',
});
/* Worker #38: a conflicting Pending invitation is refused with non-disclosing copy and no Retry.
   The server signals it with HTTP 409 (assumed contract — MIGRATION_OPEN_POINTS #16); anything else is an ordinary failure. */
/* 409 by `code` (backend 248, W-9): a pending invitation offers Resend / Revoke for `data.worker_id`; an already-registered contact gets the fixed copy */
export const SEND_REG_LINK_FAILURE = Object.freeze({ CONFLICT: 'conflict', CONFLICT_PENDING: 'conflict-pending', ERROR: 'error' });
export const SEND_REG_LINK_CONFLICT_STATUS = 409;
/* U-0216 (product): the one intake creates the worker AND sends the link, so a host needs BOTH grants — Create Worker (`worker_create`,
   backend 268) and Send Link; a partner holds Send Link only until its Create Worker key exists. Re-sending to an existing worker stays Send Link alone. */
export const WORKER_CREATE_GRANT = 'worker_create';
export const WORKER_SEND_LINK_GRANT = 'worker_send_link';
export const PARTNER_SEND_LINK_GRANT = 'partner_send_link';
export const canCreateWorkerByLink = ({ permissionList, isAdmin, isPartner, getPermissionValue }) => {
    if (isAdmin) return true;
    if (isPartner) return getPermissionValue(permissionList, 'partner', PARTNER_SEND_LINK_GRANT) === 'y';
    return getPermissionValue(permissionList, 'worker', WORKER_SEND_LINK_GRANT) === 'y' && getPermissionValue(permissionList, 'worker', WORKER_CREATE_GRANT) === 'y';
};
export const SEND_REG_LINK_CONFLICT_CODE = Object.freeze({ PENDING: 'PENDING_INVITATION_EXISTS', EMAIL: 'EMAIL_ALREADY_REGISTERED', MOBILE: 'MOBILE_ALREADY_REGISTERED' });
/* U-0337 (21 Oct package): Resend is a list-level action on a Pending (Not Registered) row — it needs the viewer's CURRENT Send
   Link grant (host `worker_send_link`, partner `partner_send_link`; admins always) and the server revalidates the recipient */
export const canResendInvitation = ({ permissionList, isAdmin, isPartner, getPermissionValue }) => {
    if (isAdmin) return true;
    if (isPartner) return getPermissionValue(permissionList, 'partner', PARTNER_SEND_LINK_GRANT) === 'y';
    return getPermissionValue(permissionList, 'worker', WORKER_SEND_LINK_GRANT) === 'y';
};
export const RESEND_ROW_STATUS_KEY = 'not_registered';
/* the invitation record of a worker created by a link (GET /worker-invitations) */
export const WORKER_INVITATION_STATUS = Object.freeze({ PENDING: 'pending', ACCEPTED: 'accepted', REVOKED: 'revoked' });
export const WORKER_INVITATION_NOT_PENDING = 'INVITATION_NOT_PENDING';
/* a worker created by a registration link (host or partner send) carries a `*_sent_link` registration type */
export const SENT_LINK_REGISTRATION_RE = /_sent_link$/;
/* Partner tab → Labour ID record (backend 248 W-30): the `type` of upload-indonesian-document-after-pt-assign / delete-indonesian-document */
export const LABOUR_ID_TYPE = 'labour_id';
/* PERM §1.3 / Settings #1: Restricted Search Access shows at most 10 accessible records — no further pages, no per-page chooser */
export const PARTNER_RESTRICTED_ROW_CAP = 10;
export const PARTNER_ACCESS_TYPE_RESTRICTED = 'restricted';
/* backend 269: `*_access_type = off` = search disabled (records otherwise accessible stay listed); a search request then answers SEARCH_ACCESS_OFF */
export const SEARCH_ACCESS_OFF = 'off';
export const SEARCH_ACCESS_OFF_CODE = 'SEARCH_ACCESS_OFF';
/* Worker #42: neutral display before a name is supplied; never stored as a name */
export const NAME_NOT_PROVIDED = 'Name not provided';
/* page copy from Current Build Updates U001 (English literals — no translation keys added; see MIGRATION_OPEN_POINTS) */
export const SEND_REG_LINK_COPY = copyKeys(Object.freeze({
    help: 'key_wkr_send_reg_link_help',
    agencyPlaceholder: 'key_wkr_send_reg_link_agency_placeholder',
    branchWaitsForAgency: 'key_wkr_send_reg_link_branch_waits_for_agency',
    emailHint: 'key_wkr_send_reg_link_email_hint',
    emailPlaceholder: 'key_wkr_send_reg_link_email_placeholder',
    noEligibleAgency: 'key_wkr_send_reg_link_no_eligible_agency',
    noEligibleAgencyHelp: 'key_wkr_send_reg_link_no_eligible_agency_help',
    noEligibleBranch: 'key_wkr_send_reg_link_no_eligible_branch',
    errorAgency: 'key_wkr_send_reg_link_error_agency',
    errorBranch: 'key_wkr_send_reg_link_error_branch',
    errorEmailRequired: 'key_wkr_send_reg_link_error_email_required',
    errorEmailInvalid: 'key_wkr_send_reg_link_error_email_invalid',
    chooseBranchHelp: 'key_wkr_send_reg_link_choose_branch_help',
    unavailableTitle: 'key_wkr_send_reg_link_unavailable_title',
    unavailablePermission: 'key_wkr_send_reg_link_unavailable_permission',
    unavailableScope: 'key_wkr_send_reg_link_unavailable_scope',
    backToWorkers: 'key_wkr_send_reg_link_back_to_workers',
    pendingInvitation: 'key_wkr_send_reg_link_pending_invitation',
    sentTitle: 'key_registration_link_sent',
    sentText: 'key_wkr_send_reg_link_sent_text',
    sentHelp: 'key_wkr_send_reg_link_sent_help',
    sendAnother: 'key_wkr_send_reg_link_send_another',
    failedTitle: 'key_wkr_send_reg_link_failed_title',
    failedText: 'key_wkr_send_reg_link_failed_text',
    conflictText: 'key_wkr_send_reg_link_conflict_text',
    retrySending: 'key_wkr_send_reg_link_retry_sending',
    pendingText: 'key_wkr_send_reg_link_pending_text',
    resend: 'key_wkr_invitation_resend',
    revoke: 'key_wkr_invitation_revoke',
    revokeConfirmTitle: 'key_wkr_invitation_revoke',
    revokeConfirmText: 'key_wkr_invitation_revoke_confirm',
    resentText: 'key_wkr_invitation_resent',
    revokedText: 'key_wkr_invitation_revoked',
}));

/* Worker Details / Dashboard "Send registration link" modal (prototype shared/registration-link.js, CR W-04) */
export const SEND_LINK_MODAL_COPY = copyKeys(Object.freeze({
    unresolvedType: 'key_wkr_send_link_modal_unresolved_type',
    noPermission: 'key_wkr_send_link_modal_no_permission',
}));
/* the empty recipient states (prototype copy) */
export const SEND_LINK_MODAL_TEXT = copyKeys(Object.freeze({
    noEmailOverseas: 'key_wkr_send_link_modal_no_email_overseas',
    noContactLocal: 'key_wkr_send_link_modal_no_contact_local',
}));

/* WORKER.md §4.2 / §16.6(2): a section's Change Status offers only the states it can move to; the current one is not listed */
export const SECTION_STATUS_TARGETS = ['in_review', 'action_required', 'verified'];
/* WORKER.md §16.18: Partner sections (Medical, Submit Documents, Training Certificate, Labour ID) know only Not Ready / Ready */
export const PT_SECTION_STATES = Object.freeze({ ready: 'verified', notReady: 'in_complete' });
/* WORKER.md §16.17: the only permitted wording on a partner-origin Doc Upload tab */
/* en key — read through translation() */
export const DOC_UPLOAD_PARTNER_ORIGIN_NOTE = 'key_doc_upload_partner_origin_note';
export const PARTNER_ASSIGNMENT_COPY = copyKeys(Object.freeze({ title: 'key_wkr_partner_assignment_title', note: 'key_wkr_partner_assignment_note', agency: 'key_partner_agency', branch: 'key_partner_branch', code: 'key_worker_code' }));

/* Biodata (WORKER.md Step 3 / Step 8): Overseas "Earliest Date I Can Start" max 2 years ahead; at most 5 historical work records */
export const EARLIEST_START_MAX_YEARS = 2;
export const BIODATA_MAX_PAST_EXPERIENCE = 5;

export const WKD_LIST_LIMIT = 100;
export const WKD_PAGE_LIMIT = 10;
export const NEWUI_LISTING_TABS = ['contract', 'invoice', 'insurance', 'job-offer', 'activity'];
/* record tabs, as they appear in the URL segment */
export const WKD_TAB_KEYS = ['job-offer', 'profile', 'details', 'contract', 'invoice', 'insurance', 'activity'];
/* legacy URL segments that still arrive from old links; each lands on the tab that absorbed it (OvN 32) */
export const WKD_TAB_ALIASES = Object.freeze({ address: 'details' });
/* CR Partner workspace: these tabs do not exist for a partner user; addressing one lands on Profile */
export const WKD_PARTNER_HIDDEN_TABS = ['job-offer', 'contract', 'invoice', 'insurance'];
/* the record could not be opened: 403 → neutral denied screen; unknown id → invalid entry; anything else → error + Retry */
export const WKD_ENTRY_ERROR = Object.freeze({ DENIED: 'denied', INVALID: 'invalid', FAILED: 'failed' });
/* the only photo state a header / listing may show (WORKER §16.6–16.7, U-0201) */
export const WKD_IMAGE_STATUS_VERIFIED = 'verified';
/* Worker Details route builder — the one path every module uses to open a record (`params` → query string, `tab` → URL segment) */
export const WORKER_DETAILS_FROM_PARAM = 'from';
export const workerDetailsPath = (workerId, params, tab) => {
    const base = routes.workerDetails.split('/:')[0];
    const query = Object.entries(params || {})
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${ encodeURIComponent(k) }=${ encodeURIComponent(v) }`)
        .join('&');
    return `${ base }/${ workerId }${ tab ? `/${ tab }` : '' }${ query ? `?${ query }` : '' }`;
};

export const CT_CHIP = { Processing: 'inc', Active: 'ver', Completed: 'up', Cancelled: 'dgr' };
export const INV_TONE = { 1: 'ver', 2: 'inc', 3: 'inc', 4: 'rev', 5: 'dgr', 6: 'up', 7: 'dgr', 8: 'inc', 9: 'up', 10: 'inc', 11: 'up' };

export const WKD_STATUS_TONES = {
    inc:   { bg: 'oklch(0.965 0.04 65)', bd: 'oklch(0.83 0.07 65)', fg: 'oklch(0.55 0.13 65)' },
    rev:   { bg: '#e3ecfd', bd: '#c8d9f7', fg: '#1e51c9' },
    ver:   { bg: '#e3f4e8', bd: '#c9e8d3', fg: '#1a7f37' },
    ar:    { bg: 'oklch(0.965 0.035 305)', bd: 'oklch(0.84 0.07 305)', fg: 'oklch(0.46 0.16 305)' },
    dgr:   { bg: '#fdeae7', bd: '#f5cdc6', fg: '#b42318' },
    up:    { bg: '#f0f1f3', bd: '#e0e3e8', fg: '#7d8492' },
    avail: { bg: '#e3f4e8', bd: '#c9e8d3', fg: '#1a7f37' },
    teal:  { bg: '#e0f5f3', bd: '#b8e6e0', fg: '#0f766e' },
    slate: { bg: '#eef1f5', bd: '#cfd6e0', fg: '#4b5565' },
    severe: { bg: '#b42318', bd: '#b42318', fg: '#ffffff' },
    dark:  { bg: '#3b3b41', bd: '#3b3b41', fg: '#ffffff' },
    cmp:   { bg: '#eaf6ed', bd: '#cbe7d3', fg: '#1a7f37' },
    na:    { bg: '#f4f4f3', bd: '#e3e7ed', fg: '#8a8a90' },
};

/* ---- Profile Status (WORKER §4.1 · prototype domain-tag table · U-0197) — the ONE definition ----
 * Read by: the record header chip (WkdStatusChip), the dashboard config (STATUS / STATUS_ID_TO_KEY),
 * app-configs WorkerStatusNameMapping / workerStatusLabel and the chat STATUS_CHIP_BY_ID.
 *   key / label / translationKey — canonical name (translationKey null = no en key yet, the literal is used)
 *   tone + treatment          — header chip (WKD_STATUS_TONES; 'hollow' = outlined, 'solid' = filled severe)
 *   intent + dashTone         — dashboard chip (list-page kit)
 *   className                 — legacy CSS hook (custom.css) still read by the Invoice worker picker
 * Inactive (14) is derived by the scheduler, never set by hand (U-0197). */
export const WORKER_STATUS_ID = Object.freeze({
    INCOMPLETE: 1, IN_REVIEW: 2, AVAILABLE: 3, EMPLOYED: 4, SUSPENDED: 5, BANNED: 6, ON_HOLD: 7,
    NOT_VISIBLE: 8, NOT_REGISTERED: 9, WITHDRAWN: 10, HOLIDAY_MODE: 12, HIRED: 13, INACTIVE: INACTIVE_STATUS_ID,
});
export const WORKER_PROFILE_STATUS = Object.freeze({
    1:  { id: 1,  key: 'incomplete',     label: 'Incomplete',     translationKey: 'key_incomplete',   tone: 'inc',    intent: 'warning', dashTone: 'orange',     className: 'incomplete' },
    2:  { id: 2,  key: 'in_review',      label: 'In Review',      translationKey: 'key_in_review',    tone: 'rev',    intent: 'info',    dashTone: 'blue-1',     className: 'in-review' },
    3:  { id: 3,  key: 'available',      label: 'Available',      translationKey: 'key_available',    tone: 'avail',  intent: 'success', dashTone: 'green',      className: 'available' },
    4:  { id: 4,  key: 'employed',       label: 'Employed',       translationKey: 'key_employed',     tone: 'ver',    intent: 'success', dashTone: 'green',      className: 'employed', treatment: 'hollow' },
    5:  { id: 5,  key: 'suspended',      label: 'Suspended',      translationKey: 'key_suspended',    tone: 'severe', intent: 'severe',  dashTone: 'severe-red', className: 'suspended', treatment: 'solid' },
    6:  { id: 6,  key: 'banned',         label: 'Banned',         translationKey: 'key_banned',       tone: 'dark',   intent: 'severe',  dashTone: 'dark',       className: 'banned', treatment: 'solid' },
    7:  { id: 7,  key: 'on_hold',        label: 'On Hold',        translationKey: 'key_on_hold',      tone: 'inc',    intent: 'warning', dashTone: 'orange',     className: 'hold', treatment: 'hollow' },
    8:  { id: 8,  key: 'not_visible',    label: 'Not Visible',    translationKey: 'key_not_visible',  tone: 'up',     intent: 'muted',   dashTone: 'neutral',    className: 'private', treatment: 'hollow' },
    9:  { id: 9,  key: 'not_registered', label: 'Not Registered', translationKey: 'key_not_registered', tone: 'slate',  intent: 'slate',   dashTone: 'slate',      className: 'partner-pending', treatment: 'hollow' },
    10: { id: 10, key: 'withdrawn',      label: 'Withdrawn',      translationKey: 'key_withdrawn',    tone: 'up',     intent: 'muted',   dashTone: 'neutral',    className: 'withdraw_partner' },
    12: { id: 12, key: 'holiday',        label: 'Holiday Mode',   translationKey: 'key_holiday_mode', tone: 'inc',    intent: 'warning', dashTone: 'orange',     className: 'holiday-mode', treatment: 'hollow' },
    13: { id: 13, key: 'hired',          label: 'Hired',          translationKey: 'key_hired',        tone: 'teal',   intent: 'success', dashTone: 'teal',       className: 'hired' },
    [INACTIVE_STATUS_ID]: { id: INACTIVE_STATUS_ID, key: 'inactive', label: 'Inactive', translationKey: 'key_inactive', tone: 'up', intent: 'muted', dashTone: 'neutral', className: 'inactive' },
});
export const WORKER_PROFILE_STATUS_TONE = Object.freeze(Object.fromEntries(Object.values(WORKER_PROFILE_STATUS).map((s) => [s.id, s.tone])));
export const workerStatusIsHollow = (statusId) => WORKER_PROFILE_STATUS[statusId]?.treatment === 'hollow';
/* canonical label for a status id; the API `name` still carries legacy words ("Hold", "Partner Pending"), so it is only the fallback for an unknown id */
export const workerProfileStatusLabel = (statusId, fallbackName = '') => {
    const meta = WORKER_PROFILE_STATUS[statusId];
    if (!meta) return fallbackName || '';
    return meta.translationKey ? translation(meta.translationKey) : meta.label;
};
/* U-0198 / U-0325 (21 Oct) / backend 324: the Profile status group has exactly three host actions — On Hold, Suspended, Banned
 * (Not Visible is refused as a manual target, Withdrawn is partner-side). The server decides whether a transition is legal;
 * the client offers only these three, each withheld without its role-block grant. Every change carries a required reason. */
export const MANUAL_STATUS_OFFERED = Object.freeze([WORKER_STATUS_ID.ON_HOLD, WORKER_STATUS_ID.SUSPENDED, WORKER_STATUS_ID.BANNED]);
export const MANUAL_STATUS_GRANT = Object.freeze({ [WORKER_STATUS_ID.ON_HOLD]: 'worker_status_to_hold', [WORKER_STATUS_ID.SUSPENDED]: 'worker_status_to_suspended', [WORKER_STATUS_ID.BANNED]: 'worker_status_to_ban' });
/* mobile-app-facing payload keys (change status · send registration link from a record) */
export const WORKER_STATUS_CHANGE_PAYLOAD = Object.freeze({ WORKER_ID: 'worker_id', STATUS: 'status', BACK_TO_PREVIOUS: 'back_to_previous_status', REASON: 'reason', VERSION: 'version' });
export const SEND_LINK_PAYLOAD = Object.freeze({ WORKER_ID: 'worker_id', CHANNEL: 'channel', RECIPIENT: 'recipient' });
export const SEND_LINK_CHANNEL = Object.freeze({ EMAIL: 'email', SMS: 'sms' });

export const STAGE_TONE_NEUTRAL = 'neutral';

export const STAGE_LABEL_KEYS = {
    1: 'key_invited', 17: 'key_suggested',
    2: 'key_applied_stage', 3: 'key_applied_stage',
    4: 'key_interview_invited',
    5: 'key_upcoming', 6: 'key_completed', 10: 'key_cancelled',
};

export const JOB_OFFER_ID_PARAM = 'jobOfferId';
export const SUGGEST_SCAN_DAYS = 42;
export const SUGGEST_MAX_PILLS = 4;
export const INTERVIEW_REPORT_OUTCOMES = [
    { type: "completed", labelKey: "key_completed" },
    { type: "worker_not_show", labelKey: "key_cancelled_worker_no_show" },
    { type: "employer_not_show", labelKey: "key_cancelled_employer_no_show" },
];

export const SECTION_TITLE_KEYS = { duplicates: 'key_potential_duplicates', remarks: 'key_remarks', ar: 'key_action_required_history', chat: 'key_chat_history' };
export const REMARK_MAX_LEN = 1000;
/* View Duplicate Workers: page size sent to /global/get-duplicate-workers; header sort key → normalised row field (client-side sort) */
export const DUPLICATES_PAGE_LIMIT = 10;
export const DUPLICATE_SORT_FIELD = Object.freeze({ fullname: 'name', reference_id: 'code', status: 'statusLabel', last_profile_updated_at: 'updated' });
export const CHAT_HISTORY_RANGES = [
    { key: 'all', labelKey: 'key_all_time', days: null },
    { key: '1w', labelKey: 'key_last_1_week', days: 7 },
    { key: '1m', labelKey: 'key_last_1_month', days: 30 },
    { key: '3m', labelKey: 'key_last_3_months', days: 90 },
    { key: '1y', labelKey: 'key_last_1_year', days: 365 },
];
export const CHANNEL_LABELS = copyKeys({ app: 'key_in_app', whatsapp: 'key_gc_channel_meta_whatsapp_label', line: 'key_wkr_channel_line' });

export const MARITAL_KEYS = { 1: 'key_married', 2: 'key_single', 3: 'key_divorced', 4: 'key_widowed', 5: 'key_separated' };
export const SEND_TEMPLATE_CONTEXT_KEYS = {
    basic: 'key_basic',
    processing_passport: 'key_passport',
    consulate: 'key_consulate',
};

export const EDIT_WORKER_FIELD_LABELS = {
    surname: 'key_surname',
    name: 'key_given_names',
    country_code: 'key_mobile',
    mobile_number: 'key_mobile',
    email: 'key_email',
};
/* Edit Worker: the contact fields a user may CLEAR — an empty value is sent as "" so the server clears it (KD-01 family);
 * every other empty value is omitted as before */
export const EDIT_WORKER_CLEARABLE_FIELDS = Object.freeze(['whatsapp_country_code', 'whatsapp_number', 'email', 'country_code', 'mobile_number']);

/* Actor order per W-04: All, Agents, Partner, Employer, Worker, system */
export const ACTOR_OPTIONS = () => [
    { value: "", label: translation("key_all") },
    { value: "staff", label: translation("key_agents") },
    { value: "partner", label: translation("key_partner") },
    { value: "employer", label: translation("key_employer") },
    { value: "worker", label: translation("key_worker") },
    /* SH-05: the automated actor is always lowercase "system", whatever case the locale delivers */
    { value: "system", label: translation("key_system").toLowerCase() },
];
/* Activity date-range presets (prototype RANGE_LABELS); days relative to today */
export const ACTIVITY_RANGE_PRESETS = [
    { value: "alltime", labelKey: "key_all_time", days: null },
    { value: "last1w", labelKey: "key_last_1_week", days: 7 },
    { value: "last1m", labelKey: "key_last_1_month", days: 30 },
    { value: "last3m", labelKey: "key_last_3_months", days: 90 },
    { value: "last1y", labelKey: "key_last_1_year", days: 365 },
];
export const ACTIVITY_STATUS_META = {
    /* WORKER §4.2: one section-status vocabulary — Incomplete · In Review · Action Required · Verified */
    'in_complete': { key: 'key_incomplete', tone: 'amber' },
    'in complete': { key: 'key_incomplete', tone: 'amber' },
    'incomplete': { key: 'key_incomplete', tone: 'amber' },
    'action_required': { key: 'key_action_required', tone: 'amber' },
    'action required': { key: 'key_action_required', tone: 'amber' },
    'in_review': { key: 'key_in_review', tone: 'blue' },
    'in review': { key: 'key_in_review', tone: 'blue' },
    'submitted': { key: 'key_submitted', tone: 'blue' },
    'verified': { key: 'key_verified', tone: 'green' },
    'active': { key: 'key_active', tone: 'green' },
    'renewal': { key: 'key_renewal', tone: 'green' },
    'add coverage': { key: 'key_add_coverage', tone: 'amber' },
    'endorsement': { key: 'key_endorsement', tone: 'amber' },
};

export const DOC_STATUS_META = {
    in_complete: { tone: 'inc', key: 'key_incomplete' },
    action_required: { tone: 'ar', key: 'key_action_required' },
    verified: { tone: 'ver', key: 'key_verified' },
    in_review: { tone: 'rev', key: 'key_in_review' },
    uploaded: { tone: 'up', key: 'key_uploaded' },
    na: { tone: 'na', key: 'key_not_applicable' },
};
export const DOC_EVENT_KEY_MAP = {
    "passport": { logType: "update_passport", activityType: "passport" },
    "indonesian-id": { logType: "update_indonesian_id", activityType: "indonesian_id" },
    "birth-certificate": { logType: "update_birth_certificate", activityType: "birth_certificate" },
    "family-certificate": { logType: "update_family_certificate", activityType: "family_certificate" },
    "education-certificate": { logType: "update_education_certificate", activityType: "education_certificate" },
    "eregistration": { logType: "update_eregistration", activityType: "eregistration" },
    "tesda": { logType: "update_tesda", activityType: "tesda" },
    "peos-certificate": { logType: "update_peos_certification", activityType: "peos_certification" },
};
export const DOC_UPLOAD_ACTIONS = new Set(["eregistration", "peos-certificate", "tesda", "passport", "indonesian-id", "birth-certificate", "family-certificate", "education-certificate"]);
export const PT_ACTIONS = new Set(["medical", "submit-documents", "training-certificate", "labor-id"]);
/* ---------------------------------------------------------------------------
 * Constants shared by the worker-detail screens (moved out of component files).
 * ------------------------------------------------------------------------- */

/* Details tab: form ids the sticky Save bar submits (WkdDetSaveBar formId) */
export const DET_FORM_IDS = {
    basic: 'wkd-det-basic-form',
    work: 'wkd-det-work-form',
    passport: 'wkd-det-passport-form',
    consulate: 'wkd-det-consulate-form',
};

/* masked date control (BioDateInput): typed shape per mode */
export const BIO_DATE_SHAPES = {
    month: { display: 'MM/YYYY', canonical: 'YYYY-MM', digits: 6, cuts: [2], hint: 'Enter the month as MM/YYYY' },
    date: { display: 'DD/MM/YYYY', canonical: 'YYYY-MM-DD', digits: 8, cuts: [2, 4], hint: 'Enter the date as DD/MM/YYYY' },
};

/* Biodata */
export const HONG_KONG_COUNTRY_ID = 1;                  /* work_country id that enables District */
export const INTERVIEW_ANY_DAY_ID = 8;                  /* "Any Day" option — exclusive */
export const PREFERRED_LOCATION_NO_PREF_ID = 0;         /* "No preference" option — exclusive */

/* Send Template modal: the WhatsApp application scheme (prototype launchWhatsApp — no phone number, no text) */
export const WHATSAPP_APP_SCHEME = 'whatsapp://';
/* Send Template modal: Copy / Open WhatsApp status notes (shared/send-template-l10n.js English copy) */
export const SEND_TEMPLATE_NOTES = copyKeys({
    missingValues: 'key_wkr_send_template_missing_values',
    copyOk: 'key_wkr_send_template_copy_ok',
    copyFail: 'key_wkr_send_template_copy_fail',
    waOpened: 'key_wkr_send_template_wa_opened',
    waBlocked: 'key_wkr_send_template_wa_blocked',
    /* the plain-send consequence line (prototype copy; English literal — no key added) */
    defaultNote: 'Sending delivers an informational template. It does not change any section or Profile status.',
});

export const DOC_PATH_NOTES = copyKeys({
    fil: 'key_docs_note_fil',
    indoB: 'key_wkr_doc_path_indo_b',
    indoA: 'key_wkr_doc_path_indo_a',
});
/* en key — read through translation() */
export const CENTRAL_KTP_LABEL = 'key_central_ktp_label';
export const PASSPORT_NEVER_APPLIED_REASON = 3;          /* passport_lost_reason value for Path A */

export const REGISTRATION_ORIGIN_LABELS = copyKeys({
    self_registered: 'key_wkr_registration_origin_self_registered',
    independent: 'key_wkr_registration_origin_self_registered',
    partner_added: 'key_wkr_registration_origin_partner_added',
    partner_sent_link: 'key_wkr_registration_origin_partner_added',
    default: 'key_wkr_registration_origin_default',
});

/* ---- Photo (WORKER.md §16.5–§16.10, CR SR-04 / W-04, prototype photoPaneHTML / ovCropHTML) ---- */
export const WKD_PHOTO_DEFAULT_CROP = Object.freeze({ cx: 50, cy: 32, r: 21 });      /* the system-suggested headshot crop (§16.5.3) */
export const WKD_PHOTO_CROP_RADIUS = Object.freeze({ min: 12, max: 34 });           /* r as % of the original's width */
export const WKD_PHOTO_FOLDERS = Object.freeze({ original: 'profile/full-length', headshot: 'profile/cropped' });
export const WKD_PHOTO_ACTIVITY_LIMIT = 5;
export const WKD_PHOTO_DATE_FORMAT = 'DD/MM/YYYY HH:mm';
/* backend 286 `uploaded_by_role` (case-insensitive) -> the source suffix shown after an actor's name (prototype photoMetaRow: "(worker app)", "(staff)") */
export const WKD_PHOTO_SOURCE_BY_ROLE = Object.freeze({ worker: 'sourceWorkerApp', admin: 'sourceStaff', staff: 'sourceStaff', employer: 'sourceEmployer' });
/* backend 287: the Photo tab's activity = status changes + uploads + removals + crop adjustments (one CSV `type` on worker-activity-log-list) */
export const WKD_PHOTO_ACTIVITY_TYPE = Object.freeze({ status: 'update_image', uploaded: 'image_uploaded', removed: 'image_removed', cropAdjusted: 'image_crop_adjusted' });
export const WKD_PHOTO_ACTIVITY_TYPES = Object.values(WKD_PHOTO_ACTIVITY_TYPE).join(',');
export const WKD_PHOTO_ACTIVITY_WHEN_FORMAT = 'DD MMM YYYY HH:mm';
/* by-line suffix per `log_created_by_role` / `actor_type` (prototype: "<worker> (worker)", "<staff> (staff)"; System → "system") */
export const WKD_PHOTO_LOG_ROLE_SOURCE = Object.freeze({ worker: 'key_wkr_photo_source_worker', staff: 'key_wkr_photo_source_staff', admin: 'key_wkr_photo_source_staff', employer: 'key_wkr_photo_source_employer' });
export const WKD_PHOTO_ACTIVITY_COPY = Object.freeze({
    statusSet: 'key_wkr_photo_act_status_set', published: 'key_wkr_photo_act_published',
    submitted: 'key_wkr_photo_act_submitted', uploaded: 'key_wkr_photo_act_uploaded', cropSet: 'key_wkr_photo_act_crop_set', removed: 'key_wkr_photo_act_removed',
});
export const WKD_PHOTO_TEMPLATE = copyKeys(Object.freeze({ slug: 'image_action_required', title: 'key_wkr_photo_template_title', type: 'image' }));
export const WKD_PHOTO_COPY = copyKeys(Object.freeze({
    submittedOriginal: 'key_wkr_photo_submitted_original',
    employerVisible: 'key_wkr_photo_employer_visible', notEmployerVisible: 'key_wkr_photo_not_employer_visible',
    fullPhoto: 'key_wkr_photo_full_photo', headshot: 'key_wkr_photo_headshot', headshotCrop: 'key_wkr_photo_headshot_crop', cropNotSet: 'key_wkr_photo_crop_not_set',
    approvedOn: 'key_wkr_photo_approved_on', approvedBy: 'key_wkr_photo_approved_by', uploadedOn: 'key_wkr_photo_uploaded_on', uploadedBy: 'key_wkr_photo_uploaded_by',
    submittedOn: 'key_wkr_photo_submitted_on', submittedBy: 'key_ins_col_submitted_by', file: 'key_wkr_photo_file',
    uploadPhoto: 'key_wkr_photo_upload_photo', uploadNewOriginal: 'key_wkr_photo_upload_new_original', replacePending: 'key_wkr_photo_replace_pending', replace: 'key_replace',
    adjustCrop: 'key_wkr_photo_adjust_crop', adjustReplacementCrop: 'key_wkr_photo_adjust_replacement_crop', setCrop: 'key_wkr_photo_set_crop',
    newOriginal: 'key_wkr_photo_new_original', onSave: 'key_wkr_photo_on_save',
    onSaveReplace: 'key_wkr_photo_on_save_replace',
    onSaveNew: 'key_wkr_photo_on_save_new',
    noPhoto: 'key_wkr_photo_no_photo',
    noPhotoEdit: 'key_wkr_photo_no_photo_edit',
    noCropWarn: 'key_wkr_photo_no_crop_warn',
    cropRequiredTitle: 'key_wkr_photo_crop_required_title',
    cropRequired: 'key_wkr_photo_crop_required',
    notAnImage: 'key_wkr_photo_not_an_image', couldNotRead: 'key_wkr_photo_could_not_read',
    openFull: 'key_wkr_photo_open_full', openFromHeadshot: 'key_wkr_photo_open_from_headshot',
    closeCrop: 'key_wkr_photo_close_crop', zoom: 'key_wkr_photo_zoom', headshotPreview: 'key_wkr_photo_headshot_preview', centre: 'key_wkr_photo_centre', radius: 'key_wkr_photo_radius', setBy: 'key_wkr_photo_set_by',
    keepsOriginal: 'key_wkr_photo_keeps_original', resetCrop: 'key_wkr_photo_reset_crop', applyCrop: 'key_wkr_photo_apply_crop',
    replacementSubmitted: 'key_wkr_photo_replacement_submitted', originalUploaded: 'key_wkr_photo_original_uploaded',
    notSourced: 'key_wkr_photo_not_sourced',
    saving: 'key_wkr_photo_saving', uploadingOriginal: 'key_wkr_photo_uploading_original',
    pendingOnly: 'key_wkr_photo_pending_only',
    cropApplied: 'key_wkr_photo_crop_applied',
    sourceWorkerApp: 'key_wkr_photo_source_worker_app', sourceStaff: 'key_wkr_photo_source_staff', sourceEmployer: 'key_wkr_photo_source_employer',
    /* U-0212 (today's 2 MB cap): en key still to be added — "Choose a JPG or PNG photo up to 2 MB." */
    tooLarge: 'key_wkr_photo_too_large',
}));

/* "New" on the Invoice listing of a Worker / Employer record (conflict sheet U-0056): the Invoice module's own create entries */
export const INVOICE_NEW_MENU = copyKeys(Object.freeze({ heading: 'key_create', standalone: 'key_new_invoice', contract: 'key_new_contract_invoice' }));
export const INVOICE_CREATE_PERMISSION = Object.freeze({ CONTRACT: 'contract_invoice_add_from_invoice_global', GENERAL: 'general_invoice_add_from_contract_global' });
/* general (standalone) invoice party = the :selection_type route segment (constants.GENERAL_CONFIRM_SELECTION_OPTIONS keys) */
export const INVOICE_GENERAL_SELECTION = Object.freeze({ WORKER: 'worker', EMPLOYER: 'employer' });

/* branches that check workers in (Worker dashboard Check-in): Hong Kong OEC branches + Macau, by `branch_country_code` */
export const CHECKIN_COUNTRY_IDS = Object.freeze([HONGKONG_LOCATION_ID, MACAU_LOCATION_ID]);

/* ---- Profile tab · Biodata / Photo / Doc Upload / Partner (worker_AUDIT_2026-10-16 A3) ---- */
/* WORKER.md §3 Step 2: the refusal copy for a minimum age (`workerMinAgeByNationalityId`); 18 when the nationality has no rule */
export const WORKER_MIN_AGE_MESSAGE_KEYS = Object.freeze({ 24: 'key_age_greater_than_24_years', 21: 'key_age_greater_than_21_years', 18: 'key_age_greater_than_18_years' });
export const WORKER_DEFAULT_MIN_AGE = 18;
/* WORKER.md Step 4: weight 1–150 kg */
export const BIODATA_WEIGHT_RANGE = Object.freeze({ min: 1, max: 150 });
/* conflict sheet U-0206: Years of Domestic Worker Experience is 2 … 20+; a stored 1 is preserved, never re-saved as something else */
export const BIODATA_EXPERIENCE_YEARS = Object.freeze({ min: 2, max: 20, plus: '20+', legacyMin: 1 });
/* reference letter (WORKER.md Step 9): the cap matches the "smaller than 5 MB" copy */
export const BIODATA_REFERENCE_LETTER_MAX_BYTES = 5 * 1024 * 1024;
/* Partner (PT) sections a partner user may read (§16.18): Submit Documents stays host-only */
export const PT_PARTNER_READONLY_SECTIONS = Object.freeze(['medical', 'training-certificate', 'labor-id']);

/* ---- Dashboard · duplicates · routes (worker_AUDIT_2026-10-16 A1 / A5) ---- */
/* D21 / U-0193: remembered dashboard state is scoped to the signed-in user; search text and row selection are never stored */
export const wgdViewStateKeyFor = (userId) => `${ WGD_VIEW_STATE_KEY }:${ userId ?? 'anon' }`;
/* X15 / PERM §5.3: host Search Access (`worker_access_type`) — '' disables search, `restricted` caps at 10, `full_access` is uncapped */
export const WORKER_ACCESS_TYPE_KEY = 'worker_access_type';
/* X16 / PERM §5.6: Global Screen — the Workers rail entry and the dashboard itself; record routes keep Access only */
export const WORKER_GLOBAL_LIST_KEY = 'worker_global_list';
/* X17 / PERM §5.7: Worker Global Filters. Type CSV holds `local` / `overseas`, Nationality CSV holds nationality ids,
   Profile Status CSV holds status ids, Onboarding is a radio `owner` | `all` ('' hides the widget) */
export const WORKER_GLOBAL_FILTER_KEYS = Object.freeze({
    profileStatus: 'worker_global_profile_status',
    type: 'worker_global_type',
    nationality: 'worker_global_nationality',
    onboarding: 'worker_global_onboarding',
});
export const WORKER_GLOBAL_ONBOARDING = Object.freeze({ OWNER: 'owner', ALL: 'all' });
/* backend 273: the stored grant is a CSV of owner / all; "all" wins, "owner" alone = own records, nothing = no filter */
export const onboardingModeOf = (value) => {
    const tokens = String(value || '').split(',').map((v) => v.trim());
    if (tokens.includes(WORKER_GLOBAL_ONBOARDING.ALL)) return WORKER_GLOBAL_ONBOARDING.ALL;
    if (tokens.includes(WORKER_GLOBAL_ONBOARDING.OWNER)) return WORKER_GLOBAL_ONBOARDING.OWNER;
    return '';
};
/* D42 / W-04: View Worker Duplicates grant (Settings row 20); partners never reach the duplicates page */
export const WORKER_VIEW_DUPLICATES_KEY = 'worker_view_duplicates';
/* D43: header sort key → `sort_by` sent to /global/get-duplicate-workers (the list keys), client sort stays as the fallback */
export const DUPLICATE_SORT_PARAM = Object.freeze({ fullname: 'fullname', reference_id: 'reference_id', status: 'status', last_profile_updated_at: 'last_profile_updated_at' });

/* X29 / U-0198 / U-0325 / PERM §5.9.1 — Change Status targets on the dashboard selection bar and the record header: the
   server list reduced to the three host actions (MANUAL_STATUS_OFFERED), each enabled only when the actor's role block grants
   its key; admins are never gated (Suspended accepted server-side since backend 324). */
const manualStatusGateOpen = (accessInfo, gateKey) => {
    const grant = accessInfo?.[gateKey];
    return !(Array.isArray(grant) && !grant.includes('y'));
};
export const manualStatusTargets = (statuses, { accessInfo, isAdmin } = {}) => {
    if (!Array.isArray(statuses)) return [];
    return statuses
        .filter((s) => MANUAL_STATUS_OFFERED.includes(Number(s.id)))
        .map((s) => {
            const id = Number(s.id);
            return { ...s, enable: isAdmin || manualStatusGateOpen(accessInfo, MANUAL_STATUS_GRANT[id]) };
        });
};

/* ---- Details tab · Job Offer tab (worker_AUDIT_2026-10-16 A4) ---- */
/* PERM 5.9 Basic / Passport / Consulate: the Send Template sub-verb carried in the CSV grid value */
export const WKD_SEND_TEMPLATE_VERB = 'send_template';
/* JO listing search: one request per pause, the previous in-flight one is aborted (SR-06) */
export const WKD_JO_SEARCH_DEBOUNCE_MS = 400;
/* stages that carry an interview instance — the only rows whose Interview cell shows a time (proto joListHTML hasDt) */
export const WKD_JO_INTERVIEW_STAGE_IDS = Object.freeze([4, 5, 6, 10]);
/* in-person interview type: the branch is shown only for this method (proto joTime.md) */
export const WKD_JO_IN_PERSON_TYPE = 2;
/* stage id → chip tone (CSS: .wkd-stage-chip[data-tone], .wkd-stage-tag[data-tone]); keyed by id, never by the translated label */
export const WKD_STAGE_TONE_BY_ID = Object.freeze({ 17: 'cyan', 1: 'sky', 2: 'violet', 3: 'violet', 4: 'amber', 5: 'blue', 6: 'green', 10: STAGE_TONE_NEUTRAL });
/* en keys stored in lowercase ("invited") that render as a stage title */
export const WKD_STAGE_TITLE_CASE_KEYS = Object.freeze(['key_invited']);
/* proto JO_STAGE_LIST — the fixed Stage filter vocabulary, each entry mapped to the server stage ids it covers
   (Applied covers 2 Applied + 3 Matched; `job_stage_status` is sent as the CSV of `stageIds` — backend must accept it) */
export const WKD_JO_STAGE_FILTERS = Object.freeze([
    { id: 'invited', labelKey: 'key_invited', stageIds: [1] },
    { id: 'applied', labelKey: 'key_applied_stage', stageIds: [2, 3] },
    { id: 'interview_invited', labelKey: 'key_interview_invited', stageIds: [4] },
    { id: 'upcoming', labelKey: 'key_upcoming', stageIds: [5] },
    { id: 'completed', labelKey: 'key_completed', stageIds: [6] },
    { id: 'cancelled', labelKey: 'key_cancelled', stageIds: [10] },
]);
export const WKD_JO_STAGE_FILTER_ALL = '';
/* U-0326: the Suggested stage id the worker's Job Offer tab never lists (it belongs to the Suggest screen's outcome tracking) */
export const WKD_JO_SUGGESTED_STAGE_ID = 17;
/* Activity dot intent values the prototype colours (activityEntryHTML): ar · ver · rev · stage; anything else is neutral */
export const WKD_ACTIVITY_INTENTS = Object.freeze(['ar', 'ver', 'rev', 'stage']);
/* W-36: activity entries name their target; only a Job Offer has a route today (interview / contract / worker stay text) */
export const WKD_ACTIVITY_TARGET_JOB_OFFER = 'job_offer';
/* W-19 (backend 248): Remark entries carry `json_data.old` / `new` / `deleted`; the edited entry renders old → new */
export const WKD_ACTIVITY_REMARK_EDITED = 'remark_edited';
/* W-33: `/worker-job-list` rows carry the JO lifecycle key — Request Interview only while `open` */
export const WKD_JO_STATUS_KEY = Object.freeze({ OPEN: 'open', EXPIRING: 'expiring', CLOSED: 'closed' });
/* W-32: `/manage-job` actions — declining an invitation is distinct from cancelling an application */
export const WKD_MANAGE_JOB_ACTION = Object.freeze({ APPLY: 'apply', CANCEL_APPLICATION: 'cancel_application', DECLINE_INVITE: 'decline_invite' });
/* W-18 / W-23 / W-12: optimistic concurrency — the detail's `version` travels on every record write; a stale one is refused (HTTP 409) with this code */
export const STALE_VERSION_CODE = 'STALE_VERSION';
/* Edit Worker contact OTP (work order 26 Oct; backend validateContactChanges unchanged): a changed Email / Mobile / WhatsApp saves only
   with `<field>_verified: 1` + `<field>_verified_at` for that exact value; the shared employer hook sends / verifies the code */
export const WORKER_OTP_SOURCE = 'edit_worker';
export const WORKER_CONTACT_OTP_FIELDS = Object.freeze([
    { key: 'email', kind: 'email', verificationType: 'email_verified', payloadKey: 'email', labelKey: 'key_email', sentKey: 'key_code_sent_by_email_to' },
    { key: 'mobile', verificationType: 'mobile_verified', payloadKey: 'mobile', labelKey: 'key_mobile', sentKey: 'key_code_sent_via_sms_to' },
    { key: 'whatsapp', verificationType: 'whatsapp_verified', payloadKey: 'whatsapp', labelKey: 'key_gc_channel_meta_whatsapp_label', sentKey: 'key_code_sent_via_whatsapp_to' },
]);
/* server refusals of update-worker-details → the field to highlight (the message is the server's) */
export const WORKER_CONTACT_REFUSAL_FIELD = Object.freeze({
    VERIFY_EMAIL: 'email', VERIFY_MOBILE_NUBER: 'mobile', VERIFY_MOBILE_NUMBER: 'mobile', VERIFY_WHATSAPP_NUMBER: 'whatsapp',
    MOBILE_NUMBER_DUPLICATE: 'mobile', WHATSAPP_NUMBER_DUPLICATE: 'whatsapp',
});
export const WORKER_CONTACT_OTP_COPY = Object.freeze({ pending: 'key_replacement_pending', unverifiedBanner: 'key_otp_unverified_field_banner', savedNote: 'key_otp_saved_number_note' });

/* ---- record header owner dialogs (prototype Worker_Details.html reassign-confirm; legacy-UI audit 2026-10-22 B) ---- */
/* prototype copy (English literals — no translation keys added; see MIGRATION_OPEN_POINTS); {type} · {nat} are filled */
export const WKD_OWNER_DIALOG_COPY = Object.freeze({
    note: 'Only staff with Manual assignment ticked for this role appear here, and only those eligible for a {type} {nat} worker. Onboarding assignment does not consider branch.',
    empty: 'No one is eligible for this worker. A destination has to have Manual assignment ticked and cover {type} · {nat} — nobody currently does, so this cannot be reassigned until Settings is changed.',
});
export const WKD_OWNER_SEARCH_DEBOUNCE_MS = 400;
/* `type` sent to get-worker-onboarding / update-worker-onboarding-staff */
export const ONBOARDING_TYPE_PARAM = Object.freeze({ 1: 'one', 2: 'two' });
/* Change Partner: the active partner branches eligible for this worker (the Assign Partner section's query) and the branch's PTs */
export const PARTNER_BRANCHES_QUERY = Object.freeze({ type: 'branch', status: 1 });
export const PARTNER_STAFF_QUERY_TYPE = 'worker';
/* the pre-assignment Partner inquiry (10 Nov 2026 package ST-04 / ST-06, TC01 / TC02; ruling Q5): the approved WhatsApp
   template chat sends to the proposed PT (worker name, nationality, worker code) — it never assigns */
export const PARTNER_INQUIRY = Object.freeze({ template: 'assign_pt', language: 'en' });
export const PARTNER_INQUIRY_COPY = copyKeys(Object.freeze({
    note: 'key_wkr_inquiry_note',
    unavailable: 'key_wkr_inquiry_unavailable',
    /* prototype Worker_Details.html tplSend('partner-inquiry'); {name} · {branch} are filled */
    sent: 'key_wkr_inquiry_sent',
}));
/* category 65, sent in-app to the worker after an actual assignment (ruling A, 12 Nov 2026): the English template, from
   the worker's Onboarding 2 owner, as the former inquiry-with-assignment sent it */
export const PARTNER_ASSIGNED_MESSAGE = Object.freeze({ slug: 'partner_assigned_information_auto_message', module: 'worker', languageId: 2, recipient: 'worker' });
/* ---- Action Required History (UP02; prototype Worker_Details.html actionHistoryPanelHTML, item 7) ----
   chat derives the worker's reply window from the sections in Action Required (`ar_window: { open, sections }`);
   the section keys are chat's (utils/action.required.window.util.js) */
export const AR_SECTION_LABEL_KEYS = Object.freeze({
    biodata: 'key_biodata', image: 'key_photo', eregistration: 'key_e_registration', peos_certification: 'key_peos_certification',
    tesda: 'key_tesda', passport: 'key_passport', indonesian_id: 'key_indonesian_id', birth_certificate: 'key_birth_certificate',
    family_certificate: 'key_family_certificate', education_certificate: 'key_education_certificate',
});
/* prototype copy; {name}, {count} and {sections} are filled */
export const AR_HISTORY_COPY = copyKeys(Object.freeze({
    openTitle: 'key_wkr_ar_window_open_title',
    openTextOne: 'key_wkr_ar_window_open_text_one',
    openTextOther: 'key_wkr_ar_window_open_text_other',
    closedTitle: 'key_wkr_ar_window_closed_title',
    closedText: 'key_wkr_ar_window_closed_text',
    readOnlyTitle: 'key_wkr_ar_history_readonly_title',
    readOnlyText: 'key_wkr_ar_history_readonly_text',
    emptyTitle: 'key_wkr_ar_history_empty_title',
    emptyText: 'key_wkr_ar_history_empty_text',
}));
export const ASSIGN_PT_PAYLOAD = Object.freeze({ STAFF: 'pt_staff_id', WORKER: 'worker_id', AGENCY: 'pt_staff_agency_id', BRANCH: 'pt_staff_branch_id' });

/* ---------------------------------------------------------------------------
 * Doc Upload review (prototype docsHTML review card; WORKER.md §9.1 Filipino, §9.3 Indonesian).
 * One row per document; newui/doc-review/useDocReview.js reads it. The names here are the server
 * contract of each legacy tab (type, field and status keys, template slug, module_key,
 * worker_id source, transition refusal key) — change them only on a backend brief.
 * ------------------------------------------------------------------------- */
export const DOC_FIELD_KIND = Object.freeze({ TEXT: 'text', DATE: 'date', BIRTH_DATE: 'birth_date' });
export const DOC_REVIEW_ROLE = Object.freeze({ STANDALONE: 'standalone', PASSPORT: 'passport', KTP: 'ktp', DEPENDENT: 'dependent' });
/* the record a dependent document is compared with (match tags, Verify check) */
export const DOC_COMPARE_REFS = Object.freeze({
    passport: Object.freeze({ labelKey: 'key_passport', name: 'name_in_passport', birth_date: 'birth_date_in_passport', birth_place: 'birth_place_in_passport' }),
    ktp: Object.freeze({ labelKey: CENTRAL_KTP_LABEL, name: 'name_in_indonesian_id', birth_date: 'birth_date_in_indonesian_id', birth_place: 'birth_place_in_indonesian_id' }),
});
/* passport_lost_reason → the worker's declaration shown in place of the scan (3 = Path A, the row is Not Applicable) */
export const PASSPORT_LOST_REASON_KEYS = Object.freeze({ 1: 'key_worker_has_lost_passport', 2: 'key_workers_passport_is_expired', 3: 'key_i_have_never_applied_for_a_passport_before' });
/* file extensions the preview pane cannot frame — download card instead */
export const DOC_PREVIEW_DOWNLOAD_ONLY = Object.freeze(['doc', 'docx']);
const docField = (name, labelKey, kind, extra) => Object.freeze({ name, labelKey, kind, ...extra });
export const DOC_REVIEW_SPEC = Object.freeze({
    eregistration: Object.freeze({
        type: 'eregistration', statusField: 'eregistration_status', fileField: 'eregistration_file', uploadedAtField: 'eregistration_file_uploaded_at',
        slug: 'eregistration_action_required', actionStatusType: 'eregistration', labelKey: 'key_e_registration', role: DOC_REVIEW_ROLE.STANDALONE,
        saveModuleKey: true, workerIdFromRoute: true,
        fields: Object.freeze([
            docField('passport_number_in_eregistration', 'key_passport_no', DOC_FIELD_KIND.TEXT, { maxLength: 11, mono: true }),
            docField('passport_expiry_date_in_eregistration', 'key_date_of_expiry', DOC_FIELD_KIND.DATE),
        ]),
    }),
    'peos-certificate': Object.freeze({
        type: 'peos_certification', statusField: 'peos_certification_status', fileField: 'peos_certification_file', uploadedAtField: 'peos_certification_file_uploaded_at',
        slug: 'peos_action_required', actionStatusType: 'peos_certification', labelKey: 'key_peos_certification', role: DOC_REVIEW_ROLE.STANDALONE,
        fields: Object.freeze([]), noFieldsNoteKey: 'key_wkr_visual_inspection_only_no_data_fields_are',
    }),
    tesda: Object.freeze({
        type: 'tesda', statusField: 'tesda_status', fileField: 'tesda_file', uploadedAtField: 'tesda_file_uploaded_at',
        slug: 'tesda_action_required', actionStatusType: 'tesda', labelKey: 'key_tesda', role: DOC_REVIEW_ROLE.STANDALONE,
        saveModuleKey: true, workerIdFromRoute: true, groupSubjectKey: 'key_certificate',
        fields: Object.freeze([
            docField('tesda_name', 'key_name', DOC_FIELD_KIND.TEXT),
            docField('tesda_issue_date', 'key_issued_on', DOC_FIELD_KIND.DATE),
            docField('tesda_expiry_date', 'key_valid_until', DOC_FIELD_KIND.DATE),
        ]),
    }),
    passport: Object.freeze({
        type: 'passport', statusField: 'passport_status', fileField: 'passport_file', uploadedAtField: 'passport_uploaded_at',
        slug: 'passport_action_required', actionStatusType: 'passport', labelKey: 'key_passport', role: DOC_REVIEW_ROLE.PASSPORT,
        saveModuleKey: true, validateBirthAge: true, groupTitleKey: 'key_details_in_passport',
        fields: Object.freeze([
            docField('name_in_passport', 'key_name', DOC_FIELD_KIND.TEXT, { maxLength: 20 }),
            docField('birth_date_in_passport', 'key_date_of_birth', DOC_FIELD_KIND.BIRTH_DATE),
            docField('birth_place_in_passport', 'key_place_of_birth', DOC_FIELD_KIND.TEXT, { maxLength: 20 }),
            docField('passport_number', 'key_passport_no', DOC_FIELD_KIND.TEXT, { maxLength: 11, mono: true }),
            docField('passport_issue_date', 'key_date_of_issue', DOC_FIELD_KIND.DATE),
            docField('passport_expiry_date', 'key_date_of_expiry', DOC_FIELD_KIND.DATE),
        ]),
    }),
    'indonesian-id': Object.freeze({
        type: 'indonesian_id', statusField: 'indonesian_id_status', fileField: 'indonesian_id_file', uploadedAtField: 'indonesian_id_file_uploaded_at',
        slug: 'indonesian_id_action_required', actionStatusType: 'indonesian_id', labelKey: 'key_indonesian_id', role: DOC_REVIEW_ROLE.KTP,
        groupSubjectKey: 'key_indonesian_id',
        fields: Object.freeze([
            docField('name_in_indonesian_id', 'key_name', DOC_FIELD_KIND.TEXT, { maxLength: 20, compare: 'name' }),
            docField('birth_date_in_indonesian_id', 'key_date_of_birth', DOC_FIELD_KIND.BIRTH_DATE, { compare: 'birth_date' }),
            docField('birth_place_in_indonesian_id', 'key_place_of_birth', DOC_FIELD_KIND.TEXT, { maxLength: 20, compare: 'birth_place' }),
        ]),
    }),
    'birth-certificate': Object.freeze({
        type: 'birth_certificate', statusField: 'birth_certificate_status', fileField: 'birth_certificate_file', uploadedAtField: 'birth_certificate_file_uploaded_at',
        slug: 'birth_certificate_action_required', slugIndonesianOverseas: 'birth_certificate_date_not_matched_action_required',
        actionStatusType: 'birth_certificate', labelKey: 'key_birth_certificate', role: DOC_REVIEW_ROLE.DEPENDENT,
        requiredOnSave: true, groupSubjectKey: 'key_birth_certificate',
        fields: Object.freeze([
            docField('name_in_birth_certificate', 'key_name', DOC_FIELD_KIND.TEXT, { maxLength: 20, compare: 'name', requiredKey: 'key_this_field_is_required' }),
            docField('birth_date_in_birth_certificate', 'key_date_of_birth', DOC_FIELD_KIND.BIRTH_DATE, { compare: 'birth_date', requiredKey: 'key_date_of_birth_is_required' }),
            docField('birth_place_in_birth_certificate', 'key_place_of_birth', DOC_FIELD_KIND.TEXT, { maxLength: 20, compare: 'birth_place', requiredKey: 'key_birth_place_is_required' }),
        ]),
    }),
    'family-certificate': Object.freeze({
        type: 'family_certificate', statusField: 'family_certificate_status', fileField: 'family_certificate_file', uploadedAtField: 'family_certificate_file_uploaded_at',
        slug: 'family_certificate_action_required', actionStatusType: 'family_certificate', labelKey: 'key_family_certificate', role: DOC_REVIEW_ROLE.DEPENDENT,
        requiredOnSave: true, incompleteCurrentKey: 'key_status_incomplete_family_certificate_upload_first', groupSubjectKey: 'key_family_certificate',
        fields: Object.freeze([
            docField('name_in_family_certificate', 'key_name', DOC_FIELD_KIND.TEXT, { maxLength: 20, compare: 'name', requiredKey: 'key_this_field_is_required' }),
            docField('birth_date_in_family_certificate', 'key_date_of_birth', DOC_FIELD_KIND.BIRTH_DATE, { compare: 'birth_date', requiredKey: 'key_date_of_birth_is_required' }),
            docField('birth_place_in_family_certificate', 'key_place_of_birth', DOC_FIELD_KIND.TEXT, { maxLength: 20, compare: 'birth_place', requiredKey: 'key_birth_place_is_required' }),
        ]),
    }),
    'education-certificate': Object.freeze({
        type: 'education_certificate', statusField: 'education_certificate_status', fileField: 'education_certificate_file', uploadedAtField: 'education_certificate_file_uploaded_at',
        slug: 'education_certification_action_required', actionStatusType: 'education_certificate', labelKey: 'key_education_certificate', role: DOC_REVIEW_ROLE.DEPENDENT,
        requiredOnSave: true, incompleteCurrentKey: 'key_status_incomplete_education_certificate_upload_first', groupSubjectKey: 'key_education_certificate',
        fields: Object.freeze([
            docField('name_in_education_certificate', 'key_name', DOC_FIELD_KIND.TEXT, { compare: 'name', requiredKey: 'key_this_field_is_required' }),
            docField('birth_date_in_education_certificate', 'key_date_of_birth', DOC_FIELD_KIND.BIRTH_DATE, { compare: 'birth_date', requiredKey: 'key_date_of_birth_is_required' }),
            docField('birth_place_in_education_certificate', 'key_place_of_birth', DOC_FIELD_KIND.TEXT, { compare: 'birth_place', requiredKey: 'key_birth_place_is_required' }),
        ]),
    }),
});
