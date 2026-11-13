import constData from "../../../components/ReusableComponents/constants";
import routes from "../routes/routesConfig";
import copyKeys from "../../../utils/copyKeys";
import { workerDetailsPath, WORKER_DETAILS_FROM_PARAM } from "../WorkerPage/workerModuleConstants";


const R = constData.LISTING_TRACK_ROLES;

export const JO_LIST_TRACKS = Object.freeze({
    employer: { role: R.NAME, width: 200 },
    ref: { role: R.REF, width: 140 },
    activity: { role: R.DATE, width: 112 },
    status: { role: R.STATUS, width: 140 },
    open: { role: R.AMOUNT, width: 88 },
    views: { role: R.AMOUNT, width: 88 },
    apply: { role: R.AMOUNT, width: 88 },
    start: { role: R.DATE, width: 112 },
    stages: { role: R.STATUS, width: constData.LISTING_STAGE_TRACK },
    cs: { role: R.STAFF, width: 132 },
    branch: { role: R.STAFF, width: 132 },
});

export const JO_DASH_VIEW_STATE_KEY = 'jo_dashboard_view_v2';
export const JO_DASH_API_DATE = 'YYYY-MM-DD';
export const JO_DASH_PAGE_LIMIT = 10;
export const JO_DASH_DEFAULT_FILTERS = Object.freeze({
    page: 1, limit: JO_DASH_PAGE_LIMIT, search_text: '', sort_by: '', sort_order: '',
    location: '', branch_location: Object.freeze([]), status: Object.freeze([]), current_engagement: '', cs_owner_id: Object.freeze([]),
    created: '', from_date: '', to_date: '',
});
export const JO_DASH_COLUMN = Object.freeze({ EMPLOYER: 'employer', REF: 'ref', ACTIVITY: 'activity', STATUS: 'status', OPEN: 'open', VIEWS: 'views', APPLY: 'apply', START: 'start', STAGES: 'stages', CS: 'cs', BRANCH: 'branch' });
export const JO_DASH_COLUMN_ORDER = Object.freeze(Object.values(JO_DASH_COLUMN));
/* U-0252: Employer, Ref and Status always stay in the listing */
export const JO_DASH_MANDATORY_COLUMNS = Object.freeze([JO_DASH_COLUMN.EMPLOYER, JO_DASH_COLUMN.REF, JO_DASH_COLUMN.STATUS]);
export const JO_DASH_SORT_OPTIONS = copyKeys(Object.freeze([
    { key: JO_DASH_COLUMN.EMPLOYER, label: 'key_employer' }, { key: JO_DASH_COLUMN.REF, label: 'key_jo_ref' }, { key: JO_DASH_COLUMN.ACTIVITY, label: 'key_activity' },
    { key: JO_DASH_COLUMN.STATUS, label: 'key_jo_dash_sort_options_3_label' }, { key: JO_DASH_COLUMN.OPEN, label: 'key_open' }, { key: JO_DASH_COLUMN.VIEWS, label: 'key_views' },
    { key: JO_DASH_COLUMN.APPLY, label: 'key_jo_dash_sort_options_6_label' }, { key: JO_DASH_COLUMN.START, label: 'key_jo_dash_sort_options_7_label' },
]));
export const JO_DASH_SORT_API = Object.freeze({
    employer: 'employer_fullname', ref: 'reference_id', activity: 'last_activity', status: 'status', open: 'days_open', views: 'view_count', apply: 'apply_percentage', start: 'start_date',
});
/* U-0253: the five stored values (PERM §4.7); Open (Expiring) is derived at render, follows the Open tick and has no card / filter of its own */
export const JO_DASH_STATUS_FILTER_IDS = Object.freeze([7, 2, 1, 3, 6]);
export const JO_DASH_STATUS_CARDS = copyKeys(Object.freeze([
    { id: 7, subtitle: 'key_jo_dash_status_cards_0_subtitle' },
    { id: 2, subtitle: 'key_jo_dash_status_cards_1_subtitle' },
    { id: 1, subtitle: 'key_jo_dash_status_cards_2_subtitle' },
    { id: 3, subtitle: 'key_jo_dash_status_cards_4_subtitle' },
    { id: 6, subtitle: 'key_jo_dash_status_cards_5_subtitle' },
]));
/* the Type filter is current engagement (U-0127; backend 12 Oct ask 1): `current_engagement` app | web | staff */
export const JO_DASH_TYPE_OPTIONS = copyKeys(Object.freeze([{ value: 'app', label: 'key_jo_dash_type_options_0_label' }, { value: 'web', label: 'key_jo_dash_type_options_1_label' }, { value: 'staff', label: 'key_jo_dash_type_options_2_label' }]));
export const JO_DASH_PREPUBLISH_STATUSES = Object.freeze([7, 2]);
export const JO_DASH_CLOSED_STATUS = 6;
export const JO_SEARCH_ACCESS = Object.freeze({ NONE: '', OFF: 'off', RESTRICTED: 'restricted', FULL: 'full_access' });   /* backend 269: `off` = search disabled */
export const JO_DASH_RESTRICTED_ROW_CAP = 10;
export const JO_DASH_COPY = copyKeys(Object.freeze({
    searchDisabledTitle: 'key_emp_employer_search_disabled_title',
    tooManyResults: 'key_cd_too_many_results', /* U-0254: the one specified Restricted string (SEARCH §2.1.1) */
    title: 'key_jo_dash_title',
    lastRefresh: 'key_last_refresh',
    newJobOffer: 'key_jo_dash_new_job_offer',
    searchPlaceholder: 'key_jo_dash_search_placeholder',
    searchHelp: 'key_jo_dash_search_help',
    searchHelpLabel: 'key_jo_dash_search_help_label',
    created: 'key_created', status: 'key_jo_status', type: 'key_type', location: 'key_location', branch: 'key_branch', sort: 'key_jo_dash_sort',
    clearFilters: 'key_ins_clear_filters',
    columns: 'key_ins_columns', columnsTitle: 'key_ins_select_fields',
    csOwnerFilter: 'key_jo_dash_cs_owner_filter', clearCs: 'key_jo_dash_clear_cs',
    empty: 'key_jo_dash_empty',
    legend: 'key_jo_dash_legend',
    jobOffers: 'key_jo_dash_job_offers', jobOffer: 'key_jo_dash_job_offer',
    open: 'key_open', activity: 'key_activity', start: 'key_jo_dash_start', apply: 'key_jo_dash_sort_options_6_label', views: 'key_views', stageDetails: 'key_jo_dash_stage_details', csOwner: 'key_cs_owner', employerName: 'key_jo_dash_employer_name', joRef: 'key_jo_ref', joStatus: 'key_jo_dash_sort_options_3_label',
    openRecord: 'key_jo_dash_open_record',
    deniedTitle: 'key_not_available', deniedText: 'key_fu_not_available',
    csRequest: 'key_jo_dash_cs_request',
}));
/* Stage details cells and the footer Legend — the six applicant stages in lifecycle order (U-0129 Pending before Upcoming;
   U-0133 no Invited: suggestions live on the Suggest screen) */
export const JO_DASH_STAGE_CELLS = Object.freeze([
    { id: 2, icon: 'user' }, { id: 3, icon: 'link' }, { id: 4, icon: 'clock' }, { id: 5, icon: 'calendar' }, { id: 6, icon: 'check' }, { id: 10, icon: 'x' },
]);
export const JO_DASH_STAGE_EMPHASIS = Object.freeze([2, 3]);

/* the one status registry. `filterLabel` is the card / JO Status option wording where it differs from the tag text
   ("Open (Expiring)" vs the tag's "Open · Expiring"). Stored legacy values 5 Expired and 9 Deleted present as Closed
   (U-0126; the stored value is kept until the backend migration); 8 Banned stays its own value pending product. */
export const JO_STATUS = copyKeys(Object.freeze({
    1: { value: 'Open', key: 'key_open', tone: 'green', treatment: 'filled' },
    2: { value: 'In Review', key: 'key_in_review', tone: 'blue-1', treatment: 'filled' },
    3: { value: 'On Hold', label: 'key_jo_status_3_label', tone: 'red', treatment: 'hollow' },
    4: { value: 'Open (Expiring)', label: 'key_jo_status_4_label', filterLabel: 'key_jo_status_4_filter_label', tone: 'orange', treatment: 'filled' },
    6: { value: 'Closed', key: 'key_closed', tone: 'neutral', treatment: 'filled' },
    7: { value: 'Draft', key: 'key_draft', tone: 'neutral', treatment: 'hollow' },
    5: { value: 'Closed', key: 'key_closed', tone: 'neutral', treatment: 'filled' },
    8: { value: 'Banned', key: 'key_banned', tone: 'neutral', treatment: 'hollow' },
    9: { value: 'Closed', key: 'key_closed', tone: 'neutral', treatment: 'filled' },
}));
export const JO_STATUS_FALLBACK = Object.freeze({ value: '', label: '—', tone: 'neutral', treatment: 'hollow' });
/* the record is live: Open and the derived Open (Expiring) */
export const JO_OPEN_STATUS_IDS = Object.freeze([1, 4]);

export const JO_ROUTE_QUERY = Object.freeze({ FROM: 'from' });
export const JO_FROM = Object.freeze({ DASHBOARD: 'job-offers', EMPLOYER: 'employer-details', WORKER: 'worker-details', NOTIFICATIONS: 'notifications', CALENDAR: 'calendar' });
export const jobOfferDetailsPath = (jobId, from) => `${ routes.jobOfferDetails.replace(':jobId', String(jobId)) }${ from ? `?${ JO_ROUTE_QUERY.FROM }=${ from }` : '' }`;

export const JO_LOAD_STATE = Object.freeze({ LOADING: 'loading', READY: 'ready', DENIED: 'denied', INVALID: 'invalid', ERROR: 'error' });

export const JO_RECORD_COPY = copyKeys(Object.freeze({
    title: 'key_job_offer_details',
    applicantView: 'key_jo_record_applicant_view',
    starts: 'key_starts', daysOpen: 'key_days_open_lc', views: 'views', office: 'key_jo_record_office', asap: 'ASAP',
    notAssigned: 'key_jo_record_not_assigned',
    engagement: { app: 'key_jo_dash_type_options_0_label', web: 'key_jo_dash_type_options_1_label', staff: 'key_jo_dash_type_options_2_label' },
    deniedText: 'key_fu_not_available',
    invalidTitle: 'key_jo_record_invalid_title',
    backTo: { 'worker-details': 'key_jo_record_back_to_worker_details', 'employer-details': 'key_jo_record_back_to_employer_details', notifications: 'key_jo_record_back_to_notifications', calendar: 'key_jo_record_back_to_calendar', 'job-offers': 'key_back_to_job_offers' },
}));

/* Change CS Owner of one Job Offer (backend 12 Oct ask 3) */
export const JO_OWNER_COPY = copyKeys(Object.freeze({
    title: 'key_change_cs_owner', current: 'key_current_cs', newOwner: 'key_new_cs_owner', reason: 'key_reason', confirm: 'key_change',
    pick: 'key_cal_task_transfer_pick', noEligible: 'key_jo_owner_no_eligible', changed: 'key_jo_owner_changed', failed: 'key_jo_owner_failed',
    /* the prototype help note under New CS Owner — the Contract register's wording (branch preserved, invoices follow the owner: backend 189) */
    help: 'key_reassign_cs_owner_note',
}));
export const JO_OWNER_REASON_MAX = 500;
/* owner / assistant collision (prototype B27-15): the assistant register is cleared in the same operation */
export const JO_OWNER_ASSISTANT_ACTION = Object.freeze({ REMOVE: 'remove' });
/* backend 283: the server's own answer when the new owner is the current CS Assistant and no action was sent (the detail was stale) */
export const JO_OWNER_COLLISION_CODE = 'ASSISTANT_COLLISION';
/* backend 333: a Job Offer with a pending employer CS-change request also needs Approve CS Request in the caller's context —
   the 403 stays in the form (it is not the withdrawn-grant case) */
export const JO_CS_REQUEST_APPROVAL_CODE = 'CS_REQUEST_APPROVAL_REQUIRED';
/* Day Off is multi (U-0142; backend 12 Oct ask 12, built as CHANGE_HISTORY 198 / 204): the detail keeps the single
   `day_off` / `day_off_info` for legacy readers and carries every chosen day in `day_off_list_info[]` (`day_off_ids[]`) */
export const jobOfferDayOffRows = (detail) => {
    if (Array.isArray(detail?.day_off_list_info)) return detail.day_off_list_info.filter(Boolean);
    if (Array.isArray(detail?.day_off_ids) && detail.day_off_ids.length) return detail.day_off_ids.map((id) => ({ id }));
    const raw = detail?.day_off_info ?? detail?.day_off;
    if (Array.isArray(raw)) return raw.filter(Boolean);
    return raw && typeof raw === 'object' ? [raw] : [];
};
export const jobOfferDayOffNames = (detail) => jobOfferDayOffRows(detail).map((row) => row?.name).filter(Boolean);
export const JO_SEND_TEMPLATE = Object.freeze({ slug: 'job', userType: 'employer' });
export const JO_SHARE_WORKER_TEMPLATE = Object.freeze({ slug: 'share_worker', userType: 'employer' });
/* en key — read through translation() */
export const JO_SEND_TEMPLATE_NOTE = 'key_jo_send_template_note';

export const jobOfferEditPath = (jobId, from) => `${ routes.jobOfferEdit.replace(':jobId', String(jobId)) }${ from ? `?${ JO_ROUTE_QUERY.FROM }=${ from }` : '' }`;
/* Worker Details from a Job Offer surface; `from` names the surface that opened it (the record passes JO_EDIT_FROM.RECORD) */
export const workerDetailsFromJobOfferPath = (workerId, from = JO_FROM.DASHBOARD) => workerDetailsPath(workerId, { [WORKER_DETAILS_FROM_PARAM]: from });

export const JO_STAGE_ID = Object.freeze({ INVITED: 1, APPLIED: 2, MATCHED: 3, PENDING: 4, UPCOMING: 5, COMPLETED: 6, NOT_INTERESTED: 9, CANCELLED: 10, SUGGESTED: 17 });
export const JO_STAGE = Object.freeze({
    [JO_STAGE_ID.INVITED]: { key: 'key_invited', className: 'invited', countKey: 'invited_stages_count' },
    [JO_STAGE_ID.APPLIED]: { key: 'key_applied', className: 'applied', countKey: 'applied_stages_count' },
    [JO_STAGE_ID.MATCHED]: { key: 'key_matched', className: 'matched', countKey: 'matched_stages_count' },
    [JO_STAGE_ID.PENDING]: { key: 'key_pending', className: 'pending', countKey: 'pending_stages_count' },
    [JO_STAGE_ID.UPCOMING]: { key: 'key_upcoming', className: 'upcoming', countKey: 'upcoming_stages_count' },
    [JO_STAGE_ID.COMPLETED]: { key: 'key_completed', className: 'completed', countKey: 'completed_stages_count' },
    [JO_STAGE_ID.CANCELLED]: { key: 'key_cancelled', className: 'cancelled', countKey: 'cancelled_stages_count' },
});
export const JO_RECORD_STAGE_IDS = Object.freeze([JO_STAGE_ID.APPLIED, JO_STAGE_ID.MATCHED, JO_STAGE_ID.PENDING, JO_STAGE_ID.UPCOMING, JO_STAGE_ID.COMPLETED, JO_STAGE_ID.CANCELLED]);
export const JO_HIDDEN_ROW_STAGES = Object.freeze([JO_STAGE_ID.INVITED, JO_STAGE_ID.SUGGESTED]);
/* U-0133 (21 Oct): Invited applicants are reachable on Job Offer Details for a viewer holding Worker Chat — Invited
   (`jo_*_invited_worker_chat`, which requires Open Details): the Invited chip joins the pipeline first and its rows show;
   Suggested rows never show here (they live under Suggest). Chat's Job Offers panel keeps JO_HIDDEN_ROW_STAGES as is. */
export const applicantStageIds = (showInvited) => (showInvited ? [JO_STAGE_ID.INVITED, ...JO_RECORD_STAGE_IDS] : [...JO_RECORD_STAGE_IDS]);
export const visibleApplicantRows = (rows, showInvited) => (rows || []).filter((row) => {
    const id = Number(row?.job_stage_status_id);
    return id !== JO_STAGE_ID.SUGGESTED && (showInvited || id !== JO_STAGE_ID.INVITED);
});
export const stageClassOf = (stageId) => JO_STAGE[stageId]?.className || JO_STAGE[JO_STAGE_ID.CANCELLED].className;
/* U-0259 / backend 326: no numeric Offer stage exists (ids are shared with the apps) — `get-job-worker-list` rows carry
   `applicant_stage`, `offer` = Completed + Extend Offer sent. The row badge reads "Offer" on that string; no "Offer Sent"
   sub-line (delivery is never asserted); the pipeline chips keep the server's six counts. */
export const JO_APPLICANT_STAGE = Object.freeze({ OFFER: 'offer' });
export const JO_OFFER_STAGE = Object.freeze({ key: 'key_offer', className: 'offer' });
export const applicantStageBadge = (row) => (row?.applicant_stage === JO_APPLICANT_STAGE.OFFER
    ? { labelKey: JO_OFFER_STAGE.key, className: JO_OFFER_STAGE.className }
    : { label: row?.job_stage_status_name || '', className: stageClassOf(Number(row?.job_stage_status_id)) });

export const JO_APPLICANT_PAGE_LIMIT = 10;
/* Filters popover (our delivered chip set, @migration-unspecified: the spec designs no applicant filter set);
   payloads are the legacy `/get-job-worker-list` flags; a filter that implies a stage forces it (legacy behaviour) */
export const JO_APPLICANT_FILTERS = Object.freeze([
    { id: 'local', key: 'key_local', payload: { type: 1 } },
    { id: 'overseas', key: 'key_overseas', payload: { type: 2 } },
    { id: 'declined', key: 'key_declined', payload: { job_stage: JO_STAGE_ID.CANCELLED, declined: 1 }, stage: JO_STAGE_ID.CANCELLED },
    { id: 'no_show', key: 'key_no_show', payload: { job_stage: JO_STAGE_ID.CANCELLED, not_show: 1 }, stage: JO_STAGE_ID.CANCELLED },
    { id: 'not_interested', key: 'key_not_interested', payload: { job_stage: JO_STAGE_ID.NOT_INTERESTED }, stage: JO_STAGE_ID.NOT_INTERESTED },
    { id: 'archived', key: 'key_archived', payload: { is_archived: 1 } },
]);
export const JO_APPLICANT_SORT = Object.freeze({ NAME: 'name', CODE: 'code', STAGE: 'stage' });
/* `/get-job-worker-list` sort keys (backend D-SORT) */
export const JO_APPLICANT_SORT_API = Object.freeze({ [JO_APPLICANT_SORT.NAME]: 'name', [JO_APPLICANT_SORT.CODE]: 'reference_id', [JO_APPLICANT_SORT.STAGE]: 'job_stage_status_id' });
export const JO_SORT_NEXT = Object.freeze({ asc: 'desc', desc: null });
export const JO_SORT_COPY = copyKeys(Object.freeze({ by: 'key_jo_sort_by', asc: 'ascending', desc: 'descending', clear: 'key_jo_sort_clear' }));

export const JO_INTERVIEW_METHOD = Object.freeze({ 1: { icon: 'video', key: 'key_video' }, 2: { icon: 'building', key: 'key_in_person_space' } });
export const JO_INTERVIEW_CELL_FORMAT = 'D MMM · h:mm A';

export const JO_ACTION = Object.freeze({
    REMOVE_APPLICANT: 'e_remove_applicant', SCHEDULE: 'e_schedule', INSTANT: 'e_instant',
    INSTANT_STATUS: 'e_instant_status', NOT_INTERESTED: 'e_not_interested', RESCHEDULE_PENDING: 'e_reschedule_pending',
    RESCHEDULE_UPCOMING: 'e_reschedule_upcoming', RESCHEDULE_CANCELLED: 'e_reschedule_cancelled', CANCEL_INTERVIEW: 'e_cancel_interview',
    MARK_REPORT: 'e_mark_report', VIEW_REPORT: 'e_view_report', INTERVIEW_AGAIN: 'e_interview_again', EXTEND_OFFER: 'e_extend_offer',
    /* U-0389 / U-0150 (21 Oct): no Undo Not Interested and no Cancel Suggestion — neither has a grant in the catalogue */
    CANCEL_INVITE: 'e_cancel_invite',
    START_GROUP_CHAT: 'jo_start_group_chat', NEW_CONTRACT_INVOICE: 'jo_new_contract_invoice', CHANGE_INTERPRETER: 'jo_change_interpreter',
    UNARCHIVE: 'jo_unarchive', FOLLOW_UP: 'jo_follow_up',
});
export const JO_ACTION_LABEL_KEY = Object.freeze({
    /* U-0240 / U-0134: removal from Applied is "Mark as Not Suitable" (EMPLOYER_REMOVED_APPLICANT); Matched keeps "Mark as Not Interested" */
    [JO_ACTION.REMOVE_APPLICANT]: 'key_mark_as_not_suitable', [JO_ACTION.SCHEDULE]: 'key_schedule',
    [JO_ACTION.INSTANT]: 'key_instant_interview', [JO_ACTION.INSTANT_STATUS]: 'key_update_instant_interview_status',
    [JO_ACTION.NOT_INTERESTED]: 'key_mark_as_not_interested', [JO_ACTION.RESCHEDULE_PENDING]: 'key_reschedule',
    [JO_ACTION.RESCHEDULE_UPCOMING]: 'key_reschedule', [JO_ACTION.RESCHEDULE_CANCELLED]: 'key_reschedule', [JO_ACTION.CANCEL_INTERVIEW]: 'key_cancel',
    [JO_ACTION.MARK_REPORT]: 'key_mark_interview_report', [JO_ACTION.VIEW_REPORT]: 'key_view_interview_report',
    [JO_ACTION.INTERVIEW_AGAIN]: 'key_interview_again', [JO_ACTION.EXTEND_OFFER]: 'key_extend_offer',
    [JO_ACTION.CANCEL_INVITE]: 'key_cancel_invite', [JO_ACTION.START_GROUP_CHAT]: 'key_start_group_chat',
    [JO_ACTION.NEW_CONTRACT_INVOICE]: 'key_new_contract_invoice', [JO_ACTION.CHANGE_INTERPRETER]: 'key_change_interpreter',
    [JO_ACTION.UNARCHIVE]: 'key_unarchive', [JO_ACTION.FOLLOW_UP]: 'key_fu_follow_up',
});
export const JO_ACTION_CONFIRM = Object.freeze({
    [JO_ACTION.REMOVE_APPLICANT]: { bodyKey: 'key_jo_remove_applicant_confirm', danger: true },
    [JO_ACTION.NOT_INTERESTED]: { bodyKey: 'key_are_you_sure_mark_not_interested', danger: true },
    [JO_ACTION.CANCEL_INTERVIEW]: { bodyKey: 'key_are_you_sure_cancel', danger: true },
    [JO_ACTION.EXTEND_OFFER]: { bodyKey: 'key_are_you_sure_extend_offer' },
    [JO_ACTION.CANCEL_INVITE]: { bodyKey: 'key_are_you_sure_cancel_invite', danger: true },
    [JO_ACTION.INSTANT]: { bodyKey: 'key_are_you_sure_generate_instant_meeting' },
});
export const JO_INTERVIEW_KEY = Object.freeze({
    INSTANT_STATUS: 'update_instant_interview_status',
    AGAIN_DONE: ['interveiw_again_done', 'no_action_in_completed'],
    OFFER_DONE: ['offer_sent', 'offer_sent_interview_again', 'no_action_in_completed'],
    RESCHEDULE_AFTER_CANCEL_DONE: 'reschedule_after_cancel_done',
});
export const JO_ACTION_MENU_WIDTH = 236;

export const JO_APPLICANT_COPY = copyKeys(Object.freeze({
    pipeline: 'key_jo_applicant_pipeline',
    filterByStage: 'key_jo_applicant_filter_by_stage',
    filters: 'key_filters', suggest: 'key_jo_applicant_suggest',
    noApplicants: 'key_no_applicants_match_filters',
    showing: 'key_showing', of: 'of', applicants: 'applicants',
    filteredTo: 'key_jo_applicant_filtered_to', clearStage: 'key_jo_applicant_clear_stage', clearFilter: 'key_jo_applicant_clear_filter',
    previous: 'key_previous', next: 'key_next',
    actionsFor: 'key_jo_applicant_actions_for', noActions: 'key_jo_applicant_no_actions',
    selectApplicant: 'key_jo_applicant_select_applicant',
    noInterview: 'key_jo_applicant_no_interview',
    openWorker: 'key_jo_applicant_open_worker',
    select: 'key_select',
    messageWorker: 'key_jo_applicant_message_worker', addLink: 'key_add_link',
    shareTitle: 'key_jo_applicant_share_title',
    addLinkTitle: 'key_jo_applicant_add_link_title',
    messageWorkerTitle: 'key_jo_applicant_message_worker_title',
    interpreterNotSourced: 'key_jo_applicant_interpreter_not_sourced',
    csAssistant: 'key_cal_task_cs_assistant',
    teamChatDeferred: 'key_jo_applicant_team_chat_deferred',
    experience: 'key_experience', earliestStart: 'key_jo_applicant_earliest_start', location: 'key_location',
    skillDetails: 'key_jo_applicant_skill_details', reference: 'key_reference', referenceAvailable: 'key_jo_applicant_reference_available',
    hasCaredFor: 'key_jo_applicant_has_cared_for', experiencedIn: 'key_jo_applicant_experienced_in',
    years: 'key_jo_applicant_years',
    backToProfile: 'key_profile',
    jobOffer: 'key_cal_task_source_job_offer',
}));
export const JO_MAIN_SKILLS_MAX = 3;
export const JO_COOKING_SKILL = 'Cooking';
export const JO_HONG_KONG = 'Hong Kong';

export const JO_APPLICANT_VIEW_COPY = copyKeys(Object.freeze({
    title: 'key_jo_record_applicant_view',
    subtitle: 'key_jo_applicant_view_subtitle',
    close: 'key_jo_applicant_view_close',
    jobDescription: 'key_job_description', mainDuties: 'key_main_duties', otherResponsibilities: 'key_other_responsibilities',
    salary: 'key_salary', startDate: 'key_start_date', language: 'key_language',
    accommodation: 'key_accommodation', coworker: 'key_coworker', dayOff: 'key_day_off',
    startDateFormat: 'D MMM YYYY',
    sqft: 'key_sq_ft_dot',
    editTitle: 'key_jo_applicant_view_edit_title',
}));

export const JO_RETURN_STATE_KEY = 'jo_record_return_v1';

export const JO_EDIT_FROM = Object.freeze({ RECORD: 'job-offer-details', WORKER: 'worker-details', CHAT: 'chat' });
export const JO_SALARY = Object.freeze({ FLOOR: 4990, CEILING: 20000, RANGE_ID: '2', FIXED_ID: '3', MAX_DIGITS: 6 });
export const JO_AGE = Object.freeze({ MIN: 18, MAX: 65 });
export const JO_NOTES_MAX = 1000;
export const JO_HOUSE_SIZE_MAX_DIGITS = 5;
export const JO_MAIN_DUTIES_MAX = 3;
export const JO_NO_PREFERENCE_ID = 0;
export const JO_COOKING_DUTY_ID = 10;
export const JO_NULL_CHOICE = 'null';
export const JO_YES_NO_CONSIDER = Object.freeze([{ value: '1', key: 'key_yes' }, { value: '0', key: 'key_no' }, { value: '2', key: 'key_consider' }]);
export const JO_YES_NO = Object.freeze([{ value: '1', key: 'key_yes' }, { value: '0', key: 'key_no' }]);
export const JO_CONSIDER_DEFAULT = '2';
export const JO_PET_MAX_COUNT = 5;
/* the last pet option is "5+" and travels as that string (backend 12 Oct ask 16) */
export const JO_PET_PLUS = '5+';
/* Household (backend D-07): one count per care-recipient type (prototype: Expecting / Baby / Toddler / Elderly up to 2,
   Child / Teen up to 3) and per pet type; no adults row */
export const JO_CARE_RECIPIENT_TYPES = copyKeys(Object.freeze([
    { type: 'expecting', label: 'key_jo_care_recipient_types_0_label', max: 2 },
    { type: 'baby_0_1', label: 'key_jo_care_recipient_types_1_label', max: 2 },
    { type: 'toddler_2_5', label: 'key_jo_care_recipient_types_2_label', max: 2 },
    { type: 'child_6_12', label: 'key_jo_care_recipient_types_3_label', max: 3 },
    { type: 'teen_13_17', label: 'key_jo_care_recipient_types_4_label', max: 3 },
    { type: 'elderly_65', label: 'key_jo_care_recipient_types_5_label', max: 2 },
]));
export const JO_PET_TYPES = copyKeys(Object.freeze([{ type: 'dog', label: 'key_jo_pet_types_0_label' }, { type: 'cat', label: 'key_jo_pet_types_1_label' }, { type: 'other', label: 'key_other' }]));
/* legacy `*_count_info` categories → D-07 types (read-only fallback while the old arrays are still returned) */
export const JO_LEGACY_CARE_TYPE = Object.freeze({ expecting_baby: 'expecting', baby: 'baby_0_1', child: 'child_6_12', elderly: 'elderly_65' });
/* `/save-job-offer` lifecycle action (backend D-10): Save as Draft, Approve & Open — the prototype footer's two saves */
export const JO_SAVE_ACTION = Object.freeze({ DRAFT: 'draft', APPROVE_OPEN: 'approve_open', SAVE: 'save' }); /* SAVE = an Open record's plain save (U-0243; backend ask J-4) */
/* U-0250: the Job Offer religion preference offers exactly these master rows (+ No preference); a stored value outside them
   stays visible. Hindu + Other added per the All-Modules HTML (Shubham, 9 Nov) — supersedes U-0250's four. */
export const JO_RELIGION_PREFERENCE_NAMES = Object.freeze(['christian', 'catholic', 'muslim', 'buddhist', 'hindu', 'other']);
export const JO_GENDER_OPTIONS = Object.freeze([{ value: 2, key: 'key_female' }, { value: 1, key: 'key_male' }]);
export const JO_COPY_REQUIRED = Object.freeze(['start_date', 'skills', 'helper_nationality', 'employer_district', 'helper_accommadation']);
export const JO_EDITOR_COPY = copyKeys(Object.freeze({
    editTitle: 'key_jo_editor_edit_title',
    addTitle: 'key_add_new_job_offer',
    crumbRecord: 'key_job_offer_details',
    sections: {
        start: 'key_jo_dash_sort_options_7_label', role: 'key_jo_editor_sections_role', duties: 'key_jo_editor_sections_duties', household: 'key_jo_editor_sections_household',
        other: 'key_jo_editor_sections_other', home: 'key_jo_editor_sections_home', terms: 'key_jo_editor_sections_terms', prefs: 'key_jo_editor_sections_prefs',
        notes: 'key_jo_editor_sections_notes', copy: 'key_jo_editor_sections_copy',
    },
    date: 'key_date', flexible: 'key_jo_editor_flexible', asap: 'key_set_as_asap', asapValue: 'key_jo_editor_asap_value',
    role: 'key_role', speak: 'key_worker_should_speak', nationality: 'key_jo_editor_nationality', currentLocation: 'key_jo_editor_current_location',
    overseasExp: 'key_jo_editor_overseas_exp', contractStatus: 'key_jo_editor_contract_status',
    mainDuties: 'key_jo_editor_main_duties', mainDutiesHint: 'key_jo_editor_main_duties_hint', mainDutiesCap: 'key_jo_editor_main_duties_cap',
    priority: 'key_jo_editor_priority', optional: 'key_optional',
    slotEmpty: ['key_jo_editor_slot_empty_0', 'key_jo_editor_slot_empty_1', 'key_jo_editor_slot_empty_2'], moveToRank: 'key_jo_editor_move_to_rank',
    driverNote: 'key_jo_editor_driver_note',
    driverDropped: (names) => ` Three duties is the maximum, so ${ names.join(' and ') } ${ names.length > 1 ? 'were' : 'was' } removed — add ${ names.length > 1 ? 'them' : 'it' } under Other responsibilities if it still applies.`,
    keyInfo: 'key_jo_editor_key_info', notShown: 'key_jo_editor_not_shown',
    needsCare: 'key_jo_editor_needs_care', number: 'key_number', ageGender: 'key_jo_editor_age_gender', age: 'key_age', gender: 'key_jo_editor_gender', pets: 'key_jo_editor_pets',
    ageWarn: (row, range) => `${ row } is ${ range }.`,
    adultsWorking: 'key_jo_editor_adults_working',
    otherResp: 'key_jo_editor_sections_other', otherRespHint: 'key_jo_editor_other_resp_hint', otherRespNote: 'key_jo_editor_other_resp_note',
    cooking: 'key_cooking', cookingHint: 'key_jo_editor_cooking_hint',
    specialCourse: 'key_jo_editor_special_course', minEducation: 'key_jo_editor_min_education',
    employerNationality: 'key_jo_editor_employer_nationality', district: 'key_district', houseSize: 'key_jo_editor_house_size', sqft: 'key_jo_editor_sqft',
    accommodation: 'key_jo_editor_accommodation', dayOff: 'key_jo_editor_day_off', coworkers: 'key_jo_editor_coworkers',
    expectedSalary: 'key_jo_editor_expected_salary', minimum: 'key_jo_editor_minimum', maximum: 'key_jo_editor_maximum', fixed: 'key_jo_editor_fixed',
    floorHint: 'key_jo_editor_floor_hint', ceilingHint: 'key_jo_editor_ceiling_hint',
    minBelowFloor: 'key_jo_editor_min_below_floor', maxAboveCeiling: 'key_jo_editor_max_above_ceiling', maxBelowMin: 'key_jo_editor_max_below_min',
    historical: (date, amount) => `Recorded on ${ date } at HKD ${ amount }, below the current HKD 4,990 minimum. Shown as recorded; the minimum applies once the amount is edited.`,
    higherSalary: 'key_jo_editor_higher_salary', bonus: 'key_jo_editor_bonus',
    prefsHint: 'key_jo_editor_prefs_hint',
    religion: 'key_religion', siblings: 'key_siblings', marital: 'key_jo_editor_marital', children: 'key_jo_editor_children', helperAge: 'key_jo_editor_helper_age', anyAge: 'key_jo_editor_any_age',
    notesHint: 'key_jo_editor_notes_hint',
    notesPlaceholder: 'key_jo_editor_notes_placeholder',
    notesLong: 'key_jo_editor_notes_long',
    copyPlaceholderTitle: 'key_jo_editor_copy_placeholder_title',
    copyPlaceholderText: 'key_jo_editor_copy_placeholder_text',
    selectLanguages: 'key_jo_editor_select_languages', selectNationalities: 'key_jo_editor_select_nationalities',
    selectDuties: 'key_jo_editor_select_duties', selectCuisines: 'key_jo_editor_select_cuisines', selectDayOff: 'key_jo_editor_select_day_off',
    readOnly: 'key_jo_editor_read_only', back: 'key_back',
    /* the package has three languages — the internal Traditional Chinese review aid is part of it (prototype field chips) */
    copyFields: ['key_headline_english', 'key_job_description_english', 'key_headline_indonesian', 'key_job_description_indonesian', 'key_traditional_chinese_review_aid'],
    copyNote: 'key_jo_editor_copy_note',
    stillNeeded: 'key_jo_editor_still_needed',
    requiredLabels: { start_date: 'key_jo_dash_sort_options_7_label', skills: 'key_jo_editor_required_labels_skills', helper_nationality: 'key_jo_editor_nationality', employer_district: 'key_district', helper_accommadation: 'key_jo_editor_accommodation' },
    close: 'key_close', cancel: 'key_cancel', saveChanges: 'key_save_changes', saveDraft: 'key_jo_editor_save_draft', generate: 'key_jo_editor_generate', approve: 'key_jo_editor_approve',
    approveWaitsCopy: 'key_jo_editor_approve_waits_copy',
    approveNeedsCs: 'key_jo_approve_needs_cs',
    draftTitle: 'key_jo_editor_draft_title',
    footNone: 'key_jo_editor_foot_none',
    footReady: 'key_jo_editor_foot_ready',
    footStale: 'key_jo_editor_foot_stale',
    footApproved: 'key_jo_editor_foot_approved',
    discard: 'key_jo_editor_discard', keepEditing: 'key_keep_editing', discardBtn: 'key_discard',
    noPreference: 'key_jo_editor_no_preference', select: 'key_select', selectDistrict: 'key_jo_editor_select_district',
    maternityLabel: 'key_jo_editor_maternity_label',
    deniedTitle: 'key_not_available', deniedText: 'key_fu_not_available', invalidTitle: 'key_jo_record_invalid_title',
    required: 'key_required', atLeastOne: 'key_jo_editor_at_least_one',
    houseSizeDigits: 'key_jo_editor_house_size_digits', notesMax: 'key_jo_editor_notes_max',
    salaryRequired: 'key_jo_editor_salary_required',
}));

export const JO_SUGGEST_MODE = Object.freeze({ LOCAL: 'local', OVERSEAS: 'overseas' });
/* `/find-worker` filters on `type` — 1 local · 2 overseas — the applicant-list convention (confirmed, backend D-25) */
export const JO_SUGGEST_MODE_TYPE = Object.freeze({ [JO_SUGGEST_MODE.LOCAL]: 1, [JO_SUGGEST_MODE.OVERSEAS]: 2 });
export const JO_SUGGEST_PAGE_LIMIT = 10;
export const JO_SUGGEST_STATE_VERSION = 'v1';
export const jobOfferSuggestStateKey = (adminId, jobId) => `sw_filters_${ JO_SUGGEST_STATE_VERSION }:${ adminId ?? 'anon' }:${ jobId }`;
export const JO_SUGGEST_AGE = Object.freeze({ MIN: 21, MAX: 60 });
export const JO_SUGGEST_FIELD_KIND = Object.freeze({ MULTI: 'multi', SINGLE: 'single', RANGE: 'range', NUMBER: 'number' });
export const JO_SUGGEST_GROUPS = copyKeys(Object.freeze([
    { id: 'worker', label: 'key_worker' },
    { id: 'experience', label: 'key_experience' },
    { id: 'willingness', label: 'key_jo_suggest_groups_2_label' },
    { id: 'local', label: 'key_local', scope: JO_SUGGEST_MODE.LOCAL },
    { id: 'overseas', label: 'key_overseas', scope: JO_SUGGEST_MODE.OVERSEAS },
]));
/* the filter registry in the prototype's group order (shared/suggest-workers.js FGROUPS); a field with `dep` is rendered
   disabled (and cleared) while its gate is closed; `wide` takes two grid columns; `noFirst` orders Yes/No as No preference · No · Yes */
export const JO_SUGGEST_FIELDS = copyKeys(Object.freeze([
    { k: 'nationality', labelKey: 'key_nationality', group: 'worker', kind: JO_SUGGEST_FIELD_KIND.MULTI, list: 'workerNationalities' },
    { k: 'language', labelKey: 'key_language', group: 'worker', kind: JO_SUGGEST_FIELD_KIND.MULTI, list: 'spokenLanguages' },
    { k: 'gender', labelKey: 'key_jo_editor_gender', group: 'worker', kind: JO_SUGGEST_FIELD_KIND.SINGLE, list: 'genderList' },
    { k: 'age', labelKey: 'key_age', group: 'worker', kind: JO_SUGGEST_FIELD_KIND.RANGE },
    { k: 'religion', labelKey: 'key_religion', group: 'worker', kind: JO_SUGGEST_FIELD_KIND.MULTI, list: 'religionList' },
    { k: 'marital_status', labelKey: 'key_marital_status', group: 'worker', kind: JO_SUGGEST_FIELD_KIND.MULTI, list: 'maritalStatus' },
    { k: 'siblings_count', labelKey: 'key_siblings', group: 'worker', kind: JO_SUGGEST_FIELD_KIND.NUMBER },
    { k: 'role', labelKey: 'key_role', group: 'worker', kind: JO_SUGGEST_FIELD_KIND.SINGLE, list: 'workerRoles' },
    { k: 'education', labelKey: 'key_minimum_education', group: 'worker', kind: JO_SUGGEST_FIELD_KIND.MULTI, list: 'educationList' },
    { k: 'has_reference_letter', labelKey: 'key_reference_letter', group: 'worker', kind: JO_SUGGEST_FIELD_KIND.SINGLE, yesNo: true },
    { k: 'children_count', labelKey: 'key_number_of_children', group: 'worker', kind: JO_SUGGEST_FIELD_KIND.NUMBER },
    { k: 'oldest_child_age', labelKey: 'key_age_of_oldest_child', group: 'worker', kind: JO_SUGGEST_FIELD_KIND.NUMBER, dep: { k: 'children_count', ne: '0' } },
    { k: 'experience', label: 'key_jo_suggest_fields_17_label', group: 'experience', kind: JO_SUGGEST_FIELD_KIND.RANGE, params: ['experience_min', 'experience_max'] },
    { k: 'overseas_experience', labelKey: 'key_overseas_experience', group: 'experience', kind: JO_SUGGEST_FIELD_KIND.SINGLE, yesNo: true, noFirst: true },
    { k: 'overseas_country_ids', label: 'key_jo_suggest_fields_26_label', group: 'experience', kind: JO_SUGGEST_FIELD_KIND.MULTI, list: 'countries', dep: { k: 'overseas_experience', eq: '1' } },
    { k: 'skills', labelKey: 'key_skills', group: 'experience', kind: JO_SUGGEST_FIELD_KIND.MULTI, list: 'mainSkills' },
    { k: 'cooking_ids', labelKey: 'key_cooking', group: 'experience', kind: JO_SUGGEST_FIELD_KIND.MULTI, list: 'cookingList' },
    { k: 'baby_care_age_ids', label: 'key_jo_suggest_fields_19_label', group: 'experience', kind: JO_SUGGEST_FIELD_KIND.MULTI, list: 'childCareAgeList', wide: true },
    { k: 'baby_care_task_ids', label: 'key_jo_suggest_fields_20_label', group: 'experience', kind: JO_SUGGEST_FIELD_KIND.MULTI, list: 'childCareDuties', wide: true },
    { k: 'elderly_care_task_ids', labelKey: 'key_elderly_care', group: 'experience', kind: JO_SUGGEST_FIELD_KIND.MULTI, list: 'elderlyCareDuties' },
    { k: 'special_course', labelKey: 'key_special_course', group: 'experience', kind: JO_SUGGEST_FIELD_KIND.MULTI, list: 'courseList' },
    { k: 'share_room', label: 'key_jo_suggest_share_a_room', group: 'willingness', kind: JO_SUGGEST_FIELD_KIND.SINGLE, yesNo: true },
    { k: 'share_work', labelKey: 'key_share_work_with_another_helper', group: 'willingness', kind: JO_SUGGEST_FIELD_KIND.SINGLE, yesNo: true },
    { k: 'day_off', labelKey: 'key_day_off', group: 'willingness', kind: JO_SUGGEST_FIELD_KIND.MULTI, list: 'dayOffList' },
    { k: 'contract_status', labelKey: 'key_contract_status', group: 'local', scope: JO_SUGGEST_MODE.LOCAL, kind: JO_SUGGEST_FIELD_KIND.SINGLE, list: 'contractStatus', labelField: 'admin_panel_status' },
]));
/* Job Offer fields that pre-fill a filter — EXACT equivalence only (SUGGEST-FILTER; U-0147): nationality, language,
   Day Off, Share a room (from the accommodation answer), start date. Share work is never inferred from co-workers. */
export const JO_SUGGEST_JO_DEFAULTS = Object.freeze({
    nationality: 'helper_nationality',
    language: 'spoken_language',
    start_date: 'start_date',
    day_off: 'day_off_info',
    accommodation: 'helper_accommadation_info',
});
/* accommodation answer → Share a room (U-0147): "Share with …" = Yes, "Own Room" = No; To Be Discussed / Live Out / Flexible stay unset */
export const JO_SUGGEST_SHARE_ROOM_RULES = Object.freeze([
    { prefix: 'own room', value: '0' },
    { prefix: 'share', value: '1' },
]);
/* stage-17 `suggestion_outcome` (backend D-16) → label and tone */
export const JO_SUGGESTED_STATUS = Object.freeze({
    awaiting: 'Awaiting worker response', worker_declined: 'Worker declined', applied: 'Applied', matched: 'Matched', employer_declined: 'Employer declined',
});
export const JO_SUGGEST_OUTCOME_TONE = Object.freeze({ awaiting: 'plain', worker_declined: 'neg', applied: 'applied', matched: 'matched', employer_declined: 'neg' });
export const JO_SUGGEST_COPY = copyKeys(Object.freeze({
    title: 'key_suggest_workers',
    close: 'key_jo_suggest_close',
    searchPlaceholder: 'key_jo_suggest_search_placeholder',
    searchHelp: 'key_jo_suggest_search_help',
    workerSet: 'key_jo_suggest_worker_set', local: 'key_local', overseas: 'key_overseas',
    startDate: 'key_start_date',
    filters: 'key_filters', clearAll: 'key_jo_suggest_clear_all', restore: 'key_jo_suggest_restore',
    suggested: 'key_suggested', back: 'key_back',
    searchGroup: 'key_jo_suggest_search_group',
    all: 'key_all', noOptions: 'key_jo_suggest_no_options', min: 'key_min', max: 'key_max', noPreference: 'key_jo_editor_no_preference',
    select: 'key_select',
    workerName: 'key_worker_name', workerCode: 'key_worker_code', contractStatus: 'key_contract_status', daysRemaining: 'key_jo_suggest_days_remaining',
    earliestStart: 'key_jo_applicant_earliest_start', overseasExperience: 'key_overseas_experience', type: 'key_type', status: 'key_status',
    noResults: 'key_jo_suggest_no_results',
    noSuggested: 'key_jo_suggest_no_suggested',
    selectWorker: 'key_jo_suggest_select_worker',
    workers: 'workers', selected: 'selected', page: 'key_jo_suggest_page', of: 'of', previous: 'key_previous', next: 'key_next',
    suggestWorkers: 'key_suggest_workers',
    sent: (n) => `${ n } ${ n === 1 ? 'worker' : 'workers' } sent. They now appear under Suggested as Awaiting worker response, and the employer is notified only if a worker applies.`,
    batchTitle: 'key_jo_suggest_batch_title', batchNote: 'key_jo_suggest_batch_note', batchSent: 'key_sent', batchSkipped: 'key_wkr_skipped', batchFailed: 'key_failed',
    batchReason: { already_suggested: 'key_jo_suggest_reason_already_suggested' }, dismiss: 'key_dismiss',
    noneSent: 'key_jo_suggest_none_sent',
    openWorker: 'key_jo_suggest_open_worker',
    profileLabel: 'key_jo_suggest_profile_label',
}));

/* Change Interpreter Owner of one applicant (row action; OWNERS "Interpreter Owner") — en keys + the owner-search debounce */
export const JO_INTERPRETER_COPY = copyKeys(Object.freeze({
    title: 'key_change_interpreter', current: 'key_interpreter', newOwner: 'key_interpreter', branch: 'key_branch', type: 'key_type', nationality: 'key_nationality',
    assignedFor: 'key_is_currently_assigned_for', from: 'key_from', workers: 'key_workers', jobOffers: 'key_jo_dash_job_offers', sendEmail: 'key_send_notification_email',
    required: 'key_this_field_is_required', pick: 'key_please_select', confirm: 'key_submit', noResults: 'key_no_results_found',
    noEligible: 'key_jo_no_eligible_interpreter',
}));
export const JO_OWNER_SEARCH_DEBOUNCE_MS = 400;
/* Change Interpreter (work order 26 Oct): one searchable select — client-side filter up to this many eligible rows, else the server is asked again as the user types */
export const JO_INTERPRETER_CLIENT_FILTER_MAX = 50;
export const JO_INTERPRETER_SEARCH_DEBOUNCE_MS = 300;
