
import copyKeys from "../../../../utils/copyKeys";
/* Calendar module constants (handoff modules/calendar + shared/calendar-i18n.js; CR "Calendar and Follow Up"; Settings #23). */

export const CAL_ROUTE_QUERY = Object.freeze({
    VIEW: 'view', DATE: 'date', WEEK: 'week', TASK: 'task', SEARCH: 'search', STAFF: 'staff', SHOW: 'show', STATUS: 'status', FROM: 'from',
});
export const CAL_VIEWS = Object.freeze({ DAY: 'day', WEEK: 'week', AGENDA: 'agenda' });
export const CAL_VIEW_ORDER = [CAL_VIEWS.DAY, CAL_VIEWS.WEEK, CAL_VIEWS.AGENDA];
export const CAL_STAFF_ME = 'me';
export const CAL_SHOW = Object.freeze({ ALL: 'all', INTERVIEWS: 'interview', TASKS: 'task' });
export const CAL_STATUS = Object.freeze({ ALL: 'all', UPCOMING: 'Upcoming', OVERDUE: 'Overdue', COMPLETED: 'Completed', CANCELLED: 'Cancelled' });

/* the latest choices survive reload and an interface-language change (prototype STATE_KEY) */
export const CAL_STATE_KEY = 'mc:state:calendar';

/* grid geometry: 54px per hour, 08–20 extended to include every accepted time (prototype PX / H0 / H1) */
export const CAL_HOUR_PX = 54;
export const CAL_DEFAULT_HOURS = Object.freeze({ start: 8, end: 20 });
export const CAL_INTERVIEW_MINUTES = 30;          /* an interview occupies a 30-minute block */
export const CAL_PIN_HEIGHT_PX = 22;              /* task markers within one marker height collapse into a cluster */
export const CAL_BLOCK_SUBTITLE_MIN_PX = 40;      /* a block shorter than this shows only its title line */

/* interview tone families (shared task-ui IVT): the status label is also the class modifier */
export const CAL_INTERVIEW_STATUS = Object.freeze({ UPCOMING: 'Upcoming', PENDING: 'Pending', COMPLETED: 'Completed', CANCELLED: 'Cancelled' });
export const CAL_INTERVIEW_TONE_CLASS = Object.freeze({ Upcoming: 'iv-upcoming', Pending: 'iv-pending', Completed: 'iv-completed', Cancelled: 'iv-cancelled' });

/* interview stage as the list reports it (HRMS API spec A4 `stage`) → the status label */
export const CAL_INTERVIEW_STAGE_STATUS = Object.freeze({ pending: 'Pending', upcoming: 'Upcoming', completed: 'Completed', cancelled: 'Cancelled' });
export const CAL_INTERVIEW_METHOD = Object.freeze({ VIDEO: 'video', IN_PERSON: 'in_person' });

/* the record a task belongs to (HRMS API spec §2.1 `source_type`); null = an unlinked personal task */
export const CAL_TASK_SOURCE = Object.freeze({ NONE: null, WORKER: 'worker', EMPLOYER: 'employer', JOB_OFFER: 'job_offer', INVOICE: 'invoice', CONTRACT: 'contract', INSURANCE: 'insurance' });
export const CAL_TASK_SOURCE_LABEL = copyKeys(Object.freeze({ worker: 'key_worker', employer: 'key_employer', job_offer: 'key_cal_task_source_job_offer', invoice: 'key_invoice', contract: 'key_contract', insurance: 'key_insurance' }));
/* `task_status` values; "overdue" is a display state only (outstanding and past due) */
export const CAL_TASK_STATE = Object.freeze({ OUTSTANDING: 'outstanding', COMPLETED: 'completed', CANCELLED: 'cancelled' });
export const CAL_TASK_OVERDUE = 'overdue';
/* POST /hrms/task/status `action` */
export const CAL_TASK_ACTION = Object.freeze({ COMPLETE: 'complete', REOPEN: 'reopen', CANCEL: 'cancel' });
export const CAL_HTTP = Object.freeze({ FORBIDDEN: 403, CONFLICT: 409, UNPROCESSABLE: 422 });
/* arrival params on a source record opened from a task (spec §4: ?followup=<task id>&from=…) */
/* REQUEST: the Insurance request a task was launched from (its source link returns to that request) */
export const CAL_SOURCE_QUERY = Object.freeze({ FOLLOW_UP: 'followup', FROM: 'from', REQUEST: 'request' });
export const CAL_FROM = 'calendar';
/* a record's Follow Up sheet opening the Calendar on one of its tasks (prototype task-ui "Open in Calendar": ?task=<id>&from=<host>) */
export const CAL_FROM_INVOICE = 'invoice';
export const CAL_FROM_JOB_OFFER = 'job-offer';
export const CAL_FROM_WORKER = 'worker';
export const CAL_FROM_EMPLOYER = 'employer';
export const CAL_FROM_INSURANCE = 'insurance';

/* HRMS calendar list params (services/calendar.js getCalendar): one inclusive date range for one staff member */
export const CAL_LIST_PARAMS = Object.freeze({ FROM: 'from', TO: 'to', USER: 'search_user_id' });
export const CAL_STAFF_LIST_PARAMS = Object.freeze({ module: 'calendar' });
/* U-0181 / backend 312: the Non-Reportees key — legacy `y` means every active internal staff member; the coming staff
   multi-select stores a CSV of user ids (the permitted scope). Direct reports follow `calendar_view_reports_followups`,
   which the server applies to `users-list?module=calendar` itself. */
export const CAL_NON_REPORTEES_KEY = 'calendar_non_reportees';

export const CAL_COPY = copyKeys(Object.freeze({
    title: 'key_calendar',
    tz: 'key_cal_copy_tz',
    day: 'key_day', week: 'key_cal_copy_week', agenda: 'key_cal_copy_agenda',
    today: 'key_today',
    prevDay: 'key_cal_copy_prev_day', nextDay: 'key_cal_copy_next_day', prevWeek: 'key_cal_copy_prev_week', nextWeek: 'key_cal_copy_next_week',
    jumpDate: 'key_cal_copy_jump_date',
    addTask: 'key_cal_copy_add_task',
    overdueBtn: 'key_cal_copy_overdue_lc',
    searchPlaceholder: 'key_cal_copy_search_placeholder',
    staff: 'key_staff', me: 'key_cal_copy_me',
    show: 'key_show', all: 'key_all', interviews: 'key_cal_copy_interviews', tasks: 'key_cal_copy_tasks',
    status: 'key_status', upcoming: 'key_cal_copy_upcoming', overdue: 'key_overdue', completed: 'key_completed', cancelled: 'key_cancelled',
    thisWeek: 'key_cal_copy_this_week', thisDay: 'key_cal_copy_this_day',
    noResults: 'key_cal_copy_no_results',
    noResultsDay: 'key_cal_copy_no_results_day',
    nothingScheduled: 'key_cal_copy_nothing_scheduled',
    item: 'key_cal_copy_item', items: 'key_cal_copy_items',
    interview: 'key_interview', task: 'key_task',
    concurrent: 'key_cal_copy_concurrent',
    personalTask: 'key_cal_copy_personal_task',
    overdueNote: 'key_cal_copy_overdue_note',
    gridNote: 'key_cal_copy_grid_note',
    denied: 'key_cal_copy_denied',
    unavailable: 'key_cal_copy_unavailable',
    loadError: 'key_couldnt_load_this_view',
    retry: 'key_retry',
    noTime: '—',
}));

/* the contextual sheet copy (prototype sheetHTML / task-ui detailHTML) */
export const CAL_SHEET_COPY = copyKeys(Object.freeze({
    interviews: 'key_cal_copy_interviews', interview: 'key_interview', tasks: 'key_cal_copy_tasks', task: 'key_task',
    concurrent: 'key_cal_copy_concurrent',
    clusterNote: 'key_cal_sheet_cluster_note',
    taskClusterNote: 'key_cal_sheet_task_cluster_note',
    ivNote: 'key_cal_sheet_iv_note',
    due: 'key_fu_due', notes: 'key_notes', noNotes: 'key_cal_sheet_no_notes',
    sourceRecord: 'key_fu_source_record', unlinked: 'key_cal_sheet_unlinked',
    back: 'key_back', backToNotifications: 'key_jo_record_back_to_notifications',
    video: 'key_video', inPerson: 'key_in_person_space',
    cancelledBy: 'key_cal_sheet_cancelled_by',
    jobOffer: 'key_cal_task_source_job_offer',
}));

/* task editor + task detail copy (shared/calendar-i18n.js, English only) */
export const CAL_TASK_COPY = copyKeys(Object.freeze({
    newTask: 'key_cal_task_new_task', editTask: 'key_cal_task_edit_task',
    titleLabel: 'key_title', titlePh: 'key_cal_task_title_ph',
    presetsHead: 'key_cal_task_presets_head', customTitle: 'key_cal_task_custom_title',
    noPresetMatch: 'key_cal_task_no_preset_match',
    noManagePerm: 'key_cal_task_no_manage_perm',
    date: 'key_date', time: 'key_time', timeZone: 'key_hkt',
    notesOptional: 'key_cal_task_notes_optional', internalOnly: 'key_cal_task_internal_only',
    noNotesTemplates: 'key_cal_task_no_notes_templates',
    manageTemplate: 'key_cal_task_manage_template',
    useTemplate: 'key_cal_task_use_template', useTemplatePh: 'key_cal_task_use_template_ph',
    replaceNotesAsk: 'key_cal_task_replace_notes_ask', replaceNotes: 'key_cal_task_replace_notes',
    editorInternalOnly: 'key_cal_task_editor_internal_only',
    savedUnlinked: 'key_cal_task_saved_unlinked', savedLinked: 'key_cal_task_saved_linked', updated: 'key_cal_task_updated',
    staleDraft: 'key_cal_task_stale_draft',
    required: 'key_required', titleRequired: 'key_cal_task_title_required',
    outstanding: 'key_cal_task_outstanding', overdue: 'key_overdue', completed: 'key_completed', cancelled: 'key_cancelled',
    createdBy: 'key_created_by', responsibleStaff: 'key_cal_task_responsible_staff', you: 'key_you', viewOnly: 'key_cal_task_view_only',
    reopen: 'key_cal_task_reopen', openIn: 'key_cal_task_open_in', contextLabel: 'key_context',
    onlyResponsible: 'key_cal_task_only_responsible',
    onlyCreator: 'key_cal_task_only_creator',
    unlinkedTask: 'key_cal_task_unlinked_task',
    markDone: 'key_cal_task_mark_done', cancelTask: 'key_cal_task_cancel_task', transfer: 'key_cal_task_transfer',
    sendTemplate: 'key_send_template', noSendPerm: 'key_cal_task_no_send_perm',
    cancelConfirmTitle: 'key_cal_task_cancel_confirm_title', cancelConfirmBody: 'key_cal_task_cancel_confirm_body',
    csAssistant: 'key_cal_task_cs_assistant',
    history: 'key_history', noHistory: 'key_cal_task_no_history',
    system: 'key_system',
    transferTo: 'key_cal_task_transfer_to', transferPick: 'key_cal_task_transfer_pick',
    transferNote: 'key_cal_task_transfer_note',
    transferNone: 'key_cal_task_transfer_none',
    transferIneligible: 'key_cal_task_transfer_ineligible',
    transferNoPerm: 'key_cal_task_transfer_no_perm',
    actionFailed: 'key_cal_task_action_failed',
    toast: Object.freeze({
        complete: 'key_cal_task_toast_complete',
        reopen: 'key_cal_task_toast_reopen',
        cancel: 'key_cal_task_toast_cancel',
        transferred: 'key_cal_task_toast_transferred',
    }),
}));

/* the record-hosted Follow Up sheet, its launcher and the editor's source block (prototype shared/followup-panel.js,
   task-editor.js; FIN-F01e): translation keys, EN + zh-HK; zh-CN / id fall back to EN until LCC supplies them (OP-S10-08) */
export const FU_COPY_KEY = Object.freeze({
    followUp: 'key_fu_follow_up',
    invoice: 'key_fu_invoice',
    newFollowUp: 'key_fu_new_follow_up',
    addFollowUp: 'key_fu_add_follow_up',
    allFollowUps: 'key_fu_all_follow_ups',
    due: 'key_fu_due',
    noOpenFollowUps: 'key_fu_no_open_follow_ups',
    openInCalendar: 'key_fu_open_in_calendar',
    sourceRecord: 'key_fu_source_record',
    sourceType: 'key_fu_source_type',
    sourceWorker: 'key_fu_source_worker',
    sourceEmployer: 'key_fu_source_employer',
    notAvailableTitle: 'key_fu_not_available_title',
    notAvailable: 'key_fu_not_available',
    transferPermission: 'key_fu_permission_transfer',
});

/* the source facts a task may carry (HRMS §2.5 `source_facts`; prototype task-ui per-kind rows) — a row renders only when
   the record supplies the value; never an amount or a payment state */
export const CAL_SOURCE_FACT_ROWS = Object.freeze([
    ['type', 'key_fu_source_type'], ['worker_name', 'key_fu_source_worker'], ['employer_name', 'key_fu_source_employer'],
    ['status', 'key_status'], ['location', 'key_location'], ['plan', 'key_cal_fact_plan'],
]);

/* task history event → label (HRMS API spec §2.2 `event`; prototype task-ui evLabel) */
export const CAL_TASK_EVENT_LABEL = copyKeys(Object.freeze({
    created: 'key_created',
    edited: 'key_cal_task_event_edited',
    rescheduled: 'key_cal_task_event_rescheduled',
    completed: 'key_cal_task_event_completed',
    completed_before_due: 'key_cal_task_event_completed_before_due',
    reopened: 'key_cal_task_toast_reopen',
    cancelled: 'key_cancelled',
    cancelled_before_due: 'key_cal_task_event_cancelled_before_due',
    transferred: 'key_cal_task_event_transferred',
    alert_sent: 'key_cal_task_event_alert_sent',
}));
export const CAL_TASK_EVENT = Object.freeze({ RESCHEDULED: 'rescheduled', TRANSFERRED: 'transferred', ALERT_SENT: 'alert_sent' });
export const CAL_TASK_EVENT_ALERT_TO = 'key_cal_task_event_alert_to';
/* the checkbox glyph per task status */
export const CAL_TASK_CHECK_MARK = Object.freeze({ completed: '✓', cancelled: '–' });
