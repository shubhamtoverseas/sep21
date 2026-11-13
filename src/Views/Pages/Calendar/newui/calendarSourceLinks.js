import routes from "../../routes/routesConfig";
import { invoiceRecordPath } from "../../Invoice/invoiceRecordPath";
import { CAL_FROM, CAL_SOURCE_QUERY, CAL_TASK_SOURCE } from "./calendarConstants";

/*
 * A linked task's source record → its page, carrying the task and the arrival (HRMS API spec §4:
 * ?followup=<task id>&from=…). `source_id` is the record's primary key; an unknown source kind opens nothing.
 * An invoice opens through its reference (`/invoices/<ref>`, S10), falling back to the id when no reference came.
 */
const SOURCE_PATH = {
    [CAL_TASK_SOURCE.WORKER]: (id) => `${ routes.workerDetails.split('/:')[0] }/${ id }`,
    [CAL_TASK_SOURCE.EMPLOYER]: (id) => routes.employerDetails.replace(':employer_id', id),
    [CAL_TASK_SOURCE.JOB_OFFER]: (id) => routes.jobOfferDetails.replace(':jobId', id),
    [CAL_TASK_SOURCE.INVOICE]: (id, task) => invoiceRecordPath(task?.sourceRef || id),
    [CAL_TASK_SOURCE.CONTRACT]: (id) => routes.contractDetails.replace(':contract_id', id),
    [CAL_TASK_SOURCE.INSURANCE]: (id) => routes.insuranceDetails.replace(':insurance_id', id),
};

/* A task launched from an Insurance request row (its saved launch context) returns to that request: the record's Requests tab
   with the row in view (Insurance.txt INS09 "retain request/period context and a working source link") */
const SOURCE_QUERY = {
    [CAL_TASK_SOURCE.INSURANCE]: (task) => (task?.context?.request?.id != null
        ? { tab: 'requests', [CAL_SOURCE_QUERY.REQUEST]: String(task.context.request.id) }
        : {}),
};

export const taskSourcePath = (task) => {
    const build = SOURCE_PATH[task?.source];
    if (!build || task?.sourceId === null || task?.sourceId === undefined) return null;
    const query = new URLSearchParams({
        [CAL_SOURCE_QUERY.FOLLOW_UP]: String(task.taskId), [CAL_SOURCE_QUERY.FROM]: CAL_FROM, ...(SOURCE_QUERY[task.source]?.(task) || {}),
    }).toString();
    return `${ build(String(task.sourceId), task) }?${ query }`;
};

/* the same map for a due alert: the source record with its Follow Up sheet open on the task (prototype notifications-bell) */
export const sourceRecordPath = ({ sourceType, sourceId, sourceRef, taskId, from }) => {
    const build = SOURCE_PATH[sourceType];
    const id = sourceId ?? (sourceType === CAL_TASK_SOURCE.INVOICE ? sourceRef : null);
    if (!build || id === null || id === undefined || id === '') return null;
    const query = new URLSearchParams({ [CAL_SOURCE_QUERY.FOLLOW_UP]: String(taskId), [CAL_SOURCE_QUERY.FROM]: from }).toString();
    return `${ build(String(id), { sourceRef }) }?${ query }`;
};
