
import copyKeys from "../../../utils/copyKeys";
/* Notifications module constants (NOTIFICATION-MAP.md; CR § Notifications; prototype shared/notifications-bell.js + modules/notifications) */

export const NOTIFICATION_PAGE_LIMIT = 20;      /* full view page */
export const NOTIFICATION_PANEL_LIMIT = 6;      /* the bell shows the recent items and hands over to the view */
export const NOTIFICATION_FILTER = Object.freeze({ ALL: 'all', UNREAD: 'unread' });
export const NOTIFICATION_QUERY = Object.freeze({ FILTER: 'filter', CATEGORY: 'cat', NOTICE: 'notice', FROM: 'from' });
export const NOTIFICATION_FROM = 'notifications';
export const NOTIFICATION_NOTICE = Object.freeze({ UNAVAILABLE: 'unavailable', FAIL: 'fail' });
export const NOTIFICATION_STAMP_FORMAT = 'DD/MM/YYYY HH:mm';

/* one category per family (prototype CT); the css tone class follows the id */
export const NOTIFICATION_CATEGORY = copyKeys(Object.freeze({
    interview: { id: 'interview', label: 'key_interview' },
    job_offer: { id: 'job_offer', label: 'key_cal_task_source_job_offer' },
    contract: { id: 'contract', label: 'key_contract' },
    invoice: { id: 'invoice', label: 'key_invoice' },
    task: { id: 'task', label: 'key_task' },
    worker: { id: 'worker', label: 'key_worker' },
}));
export const NOTIFICATION_CATEGORY_ORDER = Object.freeze(['interview', 'job_offer', 'contract', 'invoice', 'task', 'worker']);

/* destination kinds the resolver can return */
export const NOTIFICATION_TARGET = Object.freeze({
    JOB_OFFER: 'job_offer',            /* /job-offers/<job_id> */
    WORKER: 'worker',                  /* /workers/details/<worker id> (+ ?action=) */
    PROCESSING: 'processing',          /* /contracts/details/<contract_id>?stage=<stage>&from=notifications */
    INVOICE_PAYMENT: 'invoice_payment',/* /invoices/<invoice_number | rel_id>?from=notifications (S10 deep-link entry) */
    CALENDAR_TASK: 'calendar_task',    /* invoice task: /invoices/<ref>?followup=<rel_id>&from=notifications; else /calendar?task=<rel_id>&from=notifications */
});

/*
 * Family registry: type → category + destination (NOTIFICATION-MAP rows). The `_to_interpreter` variants of the
 * interview families go to Worker Details; the `_to_cs` variants to Job Offer Details; the four families whose
 * recipient the type does not name stay on Job Offer Details (MIGRATION_OPEN_POINTS Notifications 13).
 * Families without a spec row are retained as delivered (open points 14, 15).
 */
export const NOTIFICATION_FAMILIES = Object.freeze({
    /* Job Offer */
    assign_employer_cs: { category: 'job_offer', target: NOTIFICATION_TARGET.JOB_OFFER },
    change_employer_cs: { category: 'job_offer', target: NOTIFICATION_TARGET.JOB_OFFER },
    jo_owner_transferred: { category: 'job_offer', target: NOTIFICATION_TARGET.JOB_OFFER }, /* the previous owner of a transferred Job Offer (backend 189) */
    jo_expiring: { category: 'job_offer', target: NOTIFICATION_TARGET.JOB_OFFER },
    jo_expired: { category: 'job_offer', target: NOTIFICATION_TARGET.JOB_OFFER },
    job_matched: { category: 'job_offer', target: NOTIFICATION_TARGET.JOB_OFFER },
    interview_rescheduled_by_worker_to_cs: { category: 'interview', target: NOTIFICATION_TARGET.JOB_OFFER },
    interview_cancelled_by_employer_to_cs: { category: 'interview', target: NOTIFICATION_TARGET.JOB_OFFER },
    /* U-0154 (21 Oct): the four dual-target interview families — upcoming_interview_instant, upcoming_interview (backend 200),
       worker_no_show, interview_cancelled_by_worker — have no routing table yet (CS → Job Offer, Interpreter → Worker is Mike's
       call). An unresolved event stays DISABLED: no registry row, so the item shows the neutral unavailable treatment instead of
       a substituted destination. Re-add the rows with their targets when the table lands. */
    /* interpreter-facing → Worker Details */
    /* U-0154: `_to_interpreter` → Worker Details, `_to_cs` → Job Offer Details; the shared families above wait for product's routing table */
    interview_cancelled_by_employer_to_interpreter: { category: 'interview', target: NOTIFICATION_TARGET.WORKER },
    interview_rescheduled_by_employer_to_interpreter: { category: 'interview', target: NOTIFICATION_TARGET.WORKER },
    interview_cancelled_by_admin_to_cs: { category: 'interview', target: NOTIFICATION_TARGET.JOB_OFFER },
    interview_cancelled_by_admin_to_interpreter: { category: 'interview', target: NOTIFICATION_TARGET.WORKER },
    /* Worker — NOTIFICATION-MAP L10 / L22: both land on Worker Details (no tab action: the Interpreter is a Job Offer
       pairing, not the Assign PT section). L34 `notification_to_worker_for_not_uploading_photo` is "Not enabled" — no row. */
    change_worker_interpreter: { category: 'worker', target: NOTIFICATION_TARGET.WORKER },
    assign_worker_interpreter: { category: 'worker', target: NOTIFICATION_TARGET.WORKER },
    /* Contract — one record route (/contracts/details/:id). Off per the conflict sheet: update_visa_reference_no_notification_to_cs
       (U-0184), submit_policy_request and insurance_effective_date_updated (U-0163) — no registry row, the neutral unavailable
       treatment. processing_follow_up (U-0266, backend L-3): nothing new is created; the delivered rows stay visible read-only
       (`legacy`, `read_only`, `can_open`) and open the Contract record only when the server names it (the legacy popup is retired). */
    processing_follow_up: { category: 'contract', target: NOTIFICATION_TARGET.PROCESSING, tab: 'contract', legacy: true },
    assign_contract_cs: { category: 'contract', target: NOTIFICATION_TARGET.PROCESSING, tab: 'contract' },
    change_contract_cs: { category: 'contract', target: NOTIFICATION_TARGET.PROCESSING, tab: 'contract' },
    one_month_before_contract_visa_expiry_notification_to_cs: { category: 'contract', target: NOTIFICATION_TARGET.PROCESSING, tab: 'visa' },
    processing_medical_file_uploaded: { category: 'contract', target: NOTIFICATION_TARGET.PROCESSING, tab: 'medical' },
    /* Invoice — every family lands on the invoice record with a link only, no amount or status (NOTIFICATION-MAP L30-L36) */
    payment_follow_up_to_cs: { category: 'invoice', target: NOTIFICATION_TARGET.INVOICE_PAYMENT },
    for_uploading_invoice_payment_attachment_after_24_hours: { category: 'invoice', target: NOTIFICATION_TARGET.INVOICE_PAYMENT },
    assign_invoice_cs: { category: 'invoice', target: NOTIFICATION_TARGET.INVOICE_PAYMENT },
    change_invoice_cs: { category: 'invoice', target: NOTIFICATION_TARGET.INVOICE_PAYMENT },
    /* Task */
    task: { category: 'task', target: NOTIFICATION_TARGET.CALENDAR_TASK },
});

/* English copy (prototype l10n HK02-S-102…134; ask before adding keys) */
export const NOTIFICATION_COPY = copyKeys(Object.freeze({
    unreadN: 'key_nf_unread_lc',
    category: 'key_category',
    markAllRead: 'key_nf_notification_mark_all_read', markRead: 'key_nf_notification_mark_read', markUnread: 'key_nf_notification_mark_unread',
    viewAll: 'key_nf_notification_view_all',
    panelNote: 'key_nf_notification_panel_note',
    nothingUnread: 'key_nf_notification_nothing_unread',
    noMatch: 'key_nf_notification_no_match',
    unavailable: 'key_cal_copy_unavailable',
    failTitle: 'key_nf_notification_fail_title',
    dismiss: 'key_dismiss',
    markAllDone: 'key_nf_notification_mark_all_done',
    openInCalendar: 'key_fu_open_in_calendar',
    hkt: 'key_hkt',
    minAgo: 'key_nf_notification_min_ago', hAgo: 'key_nf_notification_h_ago', yesterday: 'key_nf_yesterday_lc', daysAgo: 'key_nf_notification_days_ago',
    read: 'key_read',
    readOnly: 'key_read_only',
}));
