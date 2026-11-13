import dayjs from "dayjs";
import { getCurrentUser, isAdminUser } from "../../../../../services/commonService";
import translation from "../../../../../utils/translation";
import { JO_ACTION, JO_ACTION_LABEL_KEY, JO_INTERVIEW_CELL_FORMAT, JO_INTERVIEW_KEY, JO_INTERVIEW_METHOD, JO_STAGE_ID } from "../../jobOfferConstants";

const interviewIdOf = (row) => row?.interview?.id || row?.interview_id || null;

export const reportOwnershipForRow = (row, reportFlags) => {
    const staff = getCurrentUser()?.data?.staff;
    if (staff?.staff_type !== 'internal' || isAdminUser()) return false;
    if (staff?.is_cs) {
        if (staff.id === row?.cs_owner_id) return true;
        if (reportFlags?.csNonOwner === 'y') return true;
    }
    if (staff?.is_interpreter) {
        if (staff.id === row?.existing_interpreter?.staff_id) return true;
        if (reportFlags?.interpreterNonOwner === 'y') return true;
    }
    return false;
};

const item = (id, extra = {}) => ({ id, labelKey: JO_ACTION_LABEL_KEY[id], ...extra });

/* the exact context a row Follow Up is launched with (FIN-F01c; CR "Placement and source identity"): the applicant's
   numeric id + worker code + name, and the interview's id + "23 Aug · 11:00 AM · In person · <branch>" label */
export const followUpContextOf = (row) => {
    const iv = row?.interview;
    const method = JO_INTERVIEW_METHOD[Number(row?.worker_interview_type ?? iv?.interview_type)];
    const when = iv?.interview_date ? dayjs(`${ iv.interview_date } ${ iv.interview_time || '00:00' }`).format(iv.interview_time ? JO_INTERVIEW_CELL_FORMAT : 'D MMM') : '';
    const label = [when, method ? translation(method.key) : '', row?.branch_display_name || iv?.branch_display_name || ''].filter(Boolean).join(' · ');
    return {
        applicant: { id: row?.id, code: row?.reference_id || '', name: row?.name || '' },
        ...(iv?.id ? { interview: { id: iv.id, label: label || String(iv.id) } } : {}),
    };
};

/*
 * Row Action menu by stage (prototype module.js actionItems / ACTION_KEY; PERM §4.12): a denied item is hidden.
 * Follow Up is the last item on every row (CR "row-action Follow Up keeps its targets"; prototype appends it with the
 * applicant + interview context). Items beyond the prototype (Change Interpreter, New Contract Invoice, Unarchive)
 * keep their delivered flows (@migration-unspecified placement). Invited / Suggested rows never reach this list.
 * U-0389 (21 Oct): a decline keeps the pair suppressed — a Declined row offers no Undo (no suppression-lift grant exists).
 * U-0240: Applied = Mark as Not Suitable + Schedule Interview (JO.md §3.5 / §4.1). U-0241: Reschedule reads the Worker-module
 * Reschedule grant (PERM §5.9.2); Cancel interview has no grant yet and is absent until product names one. U-0242: Start
 * Group Chat = the grant + a Completed interview, no team gate.
 */
export const applicantActions = (row, perms, reportFlags) => {
    const stage = Number(row?.job_stage_status_id);
    const hasInterview = Boolean(interviewIdOf(row));
    const reportOk = perms.canViewInterviewReport && hasInterview && reportOwnershipForRow(row, reportFlags);
    const canReschedule = typeof perms.canRescheduleFor === 'function' ? perms.canRescheduleFor(row) : false;
    const items = [];

    switch (stage) {
        case JO_STAGE_ID.APPLIED:
            if (perms.canScheduleInterview) items.push(item(JO_ACTION.SCHEDULE));
            if (perms.canMarkAsNotInterested) items.push(item(JO_ACTION.REMOVE_APPLICANT, { danger: true }));
            break;
        case JO_STAGE_ID.MATCHED:
            if (perms.canScheduleInterview) items.push(item(JO_ACTION.SCHEDULE));
            if (row?.interview_key === JO_INTERVIEW_KEY.INSTANT_STATUS) items.push(item(JO_ACTION.INSTANT_STATUS));
            else if (perms.canDoInstantInterview) items.push(item(JO_ACTION.INSTANT));
            if (perms.canMarkAsNotInterested) items.push(item(JO_ACTION.NOT_INTERESTED, { danger: true }));
            break;
        case JO_STAGE_ID.PENDING:
            if (canReschedule) items.push(item(JO_ACTION.RESCHEDULE_PENDING));
            break;
        case JO_STAGE_ID.UPCOMING:
            if (canReschedule) items.push(item(JO_ACTION.RESCHEDULE_UPCOMING));
            if (reportOk) items.push(item(JO_ACTION.MARK_REPORT));
            break;
        case JO_STAGE_ID.COMPLETED:
            if (reportOk) items.push(item(JO_ACTION.VIEW_REPORT));
            if (perms.canInterviewAgain && !JO_INTERVIEW_KEY.AGAIN_DONE.includes(row?.interview_key)) items.push(item(JO_ACTION.INTERVIEW_AGAIN));
            if (perms.canExtendInterview && !JO_INTERVIEW_KEY.OFFER_DONE.includes(row?.interview_key)) items.push(item(JO_ACTION.EXTEND_OFFER));
            if (perms.canStartGroupChat) items.push(item(JO_ACTION.START_GROUP_CHAT));
            if (perms.canAddNewContract) items.push(item(JO_ACTION.NEW_CONTRACT_INVOICE));
            break;
        case JO_STAGE_ID.CANCELLED:
            if (reportOk) items.push(item(JO_ACTION.VIEW_REPORT));
            if (perms.canInterviewAgain && row?.interview_key !== JO_INTERVIEW_KEY.RESCHEDULE_AFTER_CANCEL_DONE) items.push(item(JO_ACTION.RESCHEDULE_CANCELLED));
            break;
        default:
            break;
    }

    if ([JO_STAGE_ID.MATCHED, JO_STAGE_ID.PENDING, JO_STAGE_ID.UPCOMING, JO_STAGE_ID.COMPLETED, JO_STAGE_ID.CANCELLED].includes(stage)) {
        items.push(item(JO_ACTION.CHANGE_INTERPRETER));
    }
    if (row?.is_archived === 1) items.push(item(JO_ACTION.UNARCHIVE));
    if (perms.canFollowUp) items.push(item(JO_ACTION.FOLLOW_UP));
    return items;
};
