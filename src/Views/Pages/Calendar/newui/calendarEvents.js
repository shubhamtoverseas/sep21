import { addMinutes, normalizeTime } from './calendarTime';
import { toTitleCase } from '../../../../utils/utils';
import {
    CAL_COPY, CAL_INTERVIEW_MINUTES, CAL_INTERVIEW_STAGE_STATUS, CAL_INTERVIEW_STATUS, CAL_TASK_OVERDUE, CAL_TASK_SOURCE, CAL_TASK_SOURCE_LABEL,
    CAL_TASK_STATE,
} from './calendarConstants';

/*
 * HRMS calendar payload → the Calendar's two event kinds (CR "Calendar and Follow Up": interviews and tasks only).
 * Holidays and HRMS shift markers are not Calendar events (developer decision 2026-10-01, not in the package).
 * Tasks are the standard task object of the HRMS API spec (§2.5); interviews carry the extended fields of A4. The old
 * processing / payment follow-up records are not Calendar items any more (conflict sheet U-0005 / U-0006); absent
 * fields render as em dash.
 */
const isoDate = (value) => String(value || '').slice(0, 10);
const person = (value) => (value && typeof value === 'object' ? { id: value.id ?? null, name: value.name || '' } : null);

const interview = (row, listStatus) => {
    const start = normalizeTime(row?.interview_time) || '00:00';
    const end = normalizeTime(row?.interview_end_time);
    return {
        id: `iv-${ row?.interview_id ?? `${ row?.interview_date }-${ start }` }`,
        kind: 'interview',
        interviewId: row?.interview_id ?? null,
        date: isoDate(row?.interview_date),
        start,
        end: end && end > start ? end : addMinutes(start, CAL_INTERVIEW_MINUTES),
        title: row?.title || [row?.employer_name, row?.worker_name].filter(Boolean).join(' × '),
        status: CAL_INTERVIEW_STAGE_STATUS[row?.stage] || listStatus,     /* the real stage wins over the array it arrived in */
        employerName: row?.employer_name || '',
        employerCode: row?.employer_code || '',
        workerName: row?.worker_name || '',
        workerCode: row?.worker_code || '',
        jobOfferId: row?.job_offer_id ?? null,
        jobOfferRef: row?.job_offer_reference || '',
        method: row?.method || null,
        branchName: row?.branch_name || '',
        meetLink: row?.google_meet_link || '',
        csOwner: person(row?.cs_owner),
        csAssistant: person(row?.cs_assistant),
        interpreter: person(row?.interpreter_owner),
        cancelledBy: row?.cancelled_by || null,
    };
};

/* the standard task object → the Calendar's task row */
export const taskFromRecord = (row) => {
    const state = Object.values(CAL_TASK_STATE).includes(row?.task_status) ? row.task_status : CAL_TASK_STATE.OUTSTANDING;
    const source = Object.values(CAL_TASK_SOURCE).includes(row?.source_type) ? row.source_type : CAL_TASK_SOURCE.NONE;
    return {
        id: `task-${ row?.id }`,
        kind: 'task',
        taskId: row?.id ?? null,
        date: isoDate(row?.task_date),
        time: normalizeTime(row?.task_time),
        title: row?.task_name || '',
        notes: row?.task_description || '',
        /* the template the notes were filled from (backend ask #1, Settings #24) — `{ template_id, version, lang }` or null */
        notesFrom: row?.notes_from || null,
        state,
        overdue: state === CAL_TASK_STATE.OUTSTANDING && Boolean(row?.is_overdue),
        source,
        sourceId: row?.source_id ?? null,
        sourceRef: row?.source_ref || '',
        sourceLabel: source ? (row?.source_label || CAL_TASK_SOURCE_LABEL[source]) : CAL_COPY.personalTask,
        /* invoice tasks: { type, worker_name, employer_name } — never an amount or a payment state (S10) */
        sourceFacts: row?.source_facts && typeof row.source_facts === 'object' ? row.source_facts : null,
        context: row?.context && typeof row.context === 'object' ? row.context : null,
        responsible: person(row?.responsible),
        createdBy: person(row?.created_by),
        canEdit: Boolean(row?.can_edit),
        canTransfer: Boolean(row?.can_transfer),
        version: row?.version ?? null,
        templateId: row?.template_id ?? null,
    };
};

/* "overdue" for an outstanding task past its due time, else the task status — the class modifier and the filter value */
export const taskDisplayState = (row) => (row?.overdue ? CAL_TASK_OVERDUE : row?.state);

const uniqueById = (rows) => {
    const seen = new Set();
    return rows.filter((row) => (seen.has(row.id) ? false : seen.add(row.id)));
};

export const normalizeCalendarPayload = (data) => {
    const interviews = uniqueById([
        ...(data?.pending_interview_data || []).map((row) => interview(row, CAL_INTERVIEW_STATUS.PENDING)),
        ...(data?.upcoming_interview_data || []).map((row) => interview(row, CAL_INTERVIEW_STATUS.UPCOMING)),
        ...(data?.completed_interview_data || []).map((row) => interview(row, CAL_INTERVIEW_STATUS.COMPLETED)),
        ...(data?.cancelled_interview_data || []).map((row) => interview(row, CAL_INTERVIEW_STATUS.CANCELLED)),
    ].filter((row) => row.date));

    const tasks = uniqueById((data?.task_data || []).map(taskFromRecord).filter((row) => row.date));

    /* every outstanding task past its due time, whatever the visible range (the "N overdue" button, Agenda's Overdue section) */
    const overdueTasks = uniqueById((data?.overdue_task_data || []).map((row) => ({ ...taskFromRecord(row), overdue: true })).filter((row) => row.date));

    return { interviews, tasks, overdueTasks };
};

const includes = (haystack, needle) => String(haystack || '').toLowerCase().includes(needle);
const interviewMatches = (row, q) => [row.title, row.employerName, row.employerCode, row.workerName, row.workerCode, row.jobOfferRef].some((value) => includes(value, q));
/* title + source only (prototype app.js): internal notes are never searched */
const taskMatches = (row, q) => [row.title, row.sourceLabel, row.sourceRef].some((value) => includes(value, q));

/* one filtered population for Day, Week and Agenda: search · Show · Status */
export const filterEvents = ({ interviews, tasks, overdueTasks }, { search, show, status }) => {
    const q = String(search || '').trim().toLowerCase();
    const showInterviews = show === 'all' || show === 'interview';
    const showTasks = show === 'all' || show === 'task';
    const passStatus = (value) => {
        if (status === 'all') return true;
        if (status === 'Upcoming') return value === CAL_INTERVIEW_STATUS.UPCOMING || value === CAL_INTERVIEW_STATUS.PENDING || value === CAL_TASK_STATE.OUTSTANDING;
        return String(value).toLowerCase() === String(status).toLowerCase();
    };
    const passTask = (row) => passStatus(taskDisplayState(row)) && (!q || taskMatches(row, q));
    return {
        interviews: showInterviews ? interviews.filter((row) => passStatus(row.status) && (!q || interviewMatches(row, q))) : [],
        tasks: showTasks ? tasks.filter(passTask) : [],
        overdueTasks: showTasks ? (overdueTasks || []).filter(passTask) : [],
    };
};

/* the exact sub-record a task was launched from, as saved — one labelled row per key, an identity as "name · code"
   (prototype task-ui: "Applicant · Maria Lourdes Santos · LPF088311", "Interview · 23 Aug · 11:00 AM · In person · …") */
export const taskContextRows = (context) => (context
    ? Object.keys(context).map((key) => {
        const value = context[key];
        const text = value && typeof value === 'object'
            ? [value.label || value.name || '', value.code || ''].filter(Boolean).join(' · ') || String(value.id ?? '')
            : String(value ?? '');
        return text ? { key, label: toTitleCase(key.replace(/_/g, ' ')), text } : null;
    }).filter(Boolean)
    : []);
export const taskContextText = (context) => taskContextRows(context).map((row) => `${ row.label }: ${ row.text }`).join(' · ');
