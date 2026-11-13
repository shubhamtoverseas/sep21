import dayjs from "dayjs";
import routes from "../../routes/routesConfig";
import { CONTRACT_RECORD_QUERY } from "../../ProcessingPage/processingConstants";
import { hasCalendarAccess } from "../../../../utils/permissions/followUpPermissionUtils";
import { JO_FROM, jobOfferDetailsPath } from "../../JobOfferPage/jobOfferConstants";
import { invoiceRecordPath } from "../../Invoice/invoiceRecordPath";
import { CAL_TASK_SOURCE, CAL_TASK_SOURCE_LABEL } from "../../Calendar/newui/calendarConstants";
import { sourceRecordPath } from "../../Calendar/newui/calendarSourceLinks";
import { workerDetailsPath as workerRecordPath } from "../../WorkerPage/workerModuleConstants";
import {
    NOTIFICATION_CATEGORY, NOTIFICATION_COPY, NOTIFICATION_FAMILIES, NOTIFICATION_FROM, NOTIFICATION_QUERY, NOTIFICATION_STAMP_FORMAT,
    NOTIFICATION_TARGET,
} from "../notificationConstants";

const has = (v) => v !== undefined && v !== null && v !== '';
const workerDetailsPath = (workerId, params) => workerRecordPath(workerId, { ...(params || {}), [NOTIFICATION_QUERY.FROM]: NOTIFICATION_FROM });

export const familyOf = (item) => NOTIFICATION_FAMILIES[item?.type] || null;
export const categoryOf = (item) => NOTIFICATION_CATEGORY[familyOf(item)?.category] || null;

/*
 * Destination resolution (NOTIFICATION-MAP; prototype targetOf): a fresh access check at open time; `null` means the
 * neutral unavailable treatment. Returns { path } for a route.
 */
export const resolveTarget = (item, permissionList) => {
    const family = familyOf(item);
    if (!family) return null;
    /* a delivered legacy row (L-3): the server says whether the viewer may open its record today */
    if (family.legacy && item?.can_open === false) return null;
    /* the worker the alert names: `worker_id` (hrms carries it on the interview families since batch C / W-22), else the row's `rel_id` */
    const workerId = has(item?.worker_id) ? item.worker_id : item?.rel_id;
    switch (family.target) {
        case NOTIFICATION_TARGET.JOB_OFFER:
            return has(item?.job_id) ? { path: jobOfferDetailsPath(item.job_id, JO_FROM.NOTIFICATIONS) } : null;
        case NOTIFICATION_TARGET.WORKER:
            return has(workerId) ? { path: workerDetailsPath(workerId, family.action ? { action: family.action } : null) } : null;
        case NOTIFICATION_TARGET.PROCESSING:
            /* the Contract record, on the stage the family concerns (one record route; the Processing detail is retired) */
            return has(item?.contract_id) ? { path: `${ routes.contractDetails.replace(':contract_id', String(item.contract_id)) }?${ CONTRACT_RECORD_QUERY.STAGE }=${ family.tab }&${ NOTIFICATION_QUERY.FROM }=${ NOTIFICATION_FROM }` } : null;
        case NOTIFICATION_TARGET.INVOICE_PAYMENT: {
            /* the invoice record, by reference when the alert carries it, else by id (the resolver accepts both) */
            const ref = item?.invoice_number || item?.rel_id;
            return has(ref) ? { path: invoiceRecordPath(ref, { [NOTIFICATION_QUERY.FROM]: NOTIFICATION_FROM }) } : null;
        }
        case NOTIFICATION_TARGET.CALENDAR_TASK: {
            if (!has(item?.rel_id)) return null;
            /* a linked task's due alert lands on its source record with the Follow Up sheet open on the task (prototype
               notifications-bell.js L139-150); the server sets source_id / source_ref only when the reader may open the record */
            if (Object.values(CAL_TASK_SOURCE).includes(item?.source_type) && item?.source_type) {
                const path = sourceRecordPath({ sourceType: item.source_type, sourceId: item.source_id, sourceRef: item.source_ref, taskId: item.rel_id, from: NOTIFICATION_FROM });
                if (path) return { path };
            }
            /* an unlinked task (or a record the reader may not open) opens the Calendar on the task; without Calendar access the item is unavailable */
            return hasCalendarAccess(permissionList?.data) ? { path: `${ routes.calendar }?task=${ item.rel_id }&${ NOTIFICATION_QUERY.FROM }=${ NOTIFICATION_FROM }` } : null;
        }
        default:
            return null;
    }
};

/* what the row opens, as the API names it (contract number today; the other references are backend ask D-N4) */
export const linkLabelOf = (item) => {
    const family = familyOf(item);
    if (!family) return '';
    if (family.category === 'contract') return item?.contract_number || item?.contract_reference_id || '';
    /* a linked task: "<Kind> <reference>"; an unlinked one: Open in Calendar — the task title is the message, never the link */
    if (family.category === 'task') return item?.source_ref ? `${ CAL_TASK_SOURCE_LABEL[item?.source_type] || '' } ${ item.source_ref }`.trim() : NOTIFICATION_COPY.openInCalendar;
    if (family.category === 'invoice') return item?.invoice_number || item?.reference_id || '';
    if (family.category === 'worker') return item?.worker_reference_id || item?.reference_id || '';
    return item?.job_reference_id || item?.reference_id || '';
};

/* relative time (prototype rel): minutes → hours → yesterday → days → date */
export const relativeTime = (iso, now = dayjs()) => {
    const at = dayjs(iso);
    if (!at.isValid()) return '';
    const minutes = Math.round(now.diff(at, 'minute', true));
    if (minutes < 60) return `${ Math.max(minutes, 1) } ${ NOTIFICATION_COPY.minAgo }`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${ hours } ${ NOTIFICATION_COPY.hAgo }`;
    const days = Math.round(hours / 24);
    if (days === 1) return NOTIFICATION_COPY.yesterday;
    if (days < 30) return `${ days } ${ NOTIFICATION_COPY.daysAgo }`;
    return at.format('D MMM YYYY');
};
export const stampOf = (iso) => (dayjs(iso).isValid() ? `${ dayjs(iso).format(NOTIFICATION_STAMP_FORMAT) } ${ NOTIFICATION_COPY.hkt }` : '');

export const isUnread = (item) => !item?.is_read;
export const isReadOnly = (item) => Boolean(item?.read_only || familyOf(item)?.legacy);
