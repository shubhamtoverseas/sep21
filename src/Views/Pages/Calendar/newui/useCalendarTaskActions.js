import { useCallback, useState } from "react";
import { setCalendarTaskStatusAPI } from "../../../../services/calendar";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { CAL_TASK_ACTION, CAL_TASK_COPY, CAL_TASK_STATE } from "./calendarConstants";

/*
 * Mark done / Reopen / Cancel task (HRMS API spec A3, POST /hrms/task/status). The server decides; the client only
 * offers the control when the task says the caller may act. Every outcome — success or refusal — re-reads the lists
 * and the open task so the screen never keeps a state the server did not accept.
 */
const sameId = (a, b) => a !== null && a !== undefined && String(a) === String(b);

/* who may complete / reopen: `can_edit` while outstanding; for a completed task the same person (responsible of a
   linked task, creator of an unlinked one) may reopen — `can_edit` is always false once a task is closed (spec §2.5) */
export const canToggleTask = (row, meUserId) => {
    if (!row?.taskId) return false;
    if (row.state === CAL_TASK_STATE.OUTSTANDING) return row.canEdit;
    if (row.state === CAL_TASK_STATE.COMPLETED) return sameId(meUserId, row.source ? row.responsible?.id : row.createdBy?.id);
    return false;
};

const useCalendarTaskActions = ({ onChanged }) => {
    const [busyTaskId, setBusyTaskId] = useState(null);

    const changeStatus = useCallback((taskId, action) => {
        if (!taskId || busyTaskId) return Promise.resolve(false);
        setBusyTaskId(taskId);
        return setCalendarTaskStatusAPI({ task_id: taskId, action })
            .then((res) => {
                if (res?.data?.status === false) { ShowToast('error', res?.data?.message || CAL_TASK_COPY.actionFailed); return false; }
                ShowToast('success', CAL_TASK_COPY.toast[action] || res?.data?.message);
                return true;
            })
            .catch((err) => {
                ShowToast('error', err?.response?.data?.message || CAL_TASK_COPY.actionFailed);
                return false;
            })
            .finally(() => {
                setBusyTaskId(null);
                if (onChanged) onChanged(taskId);
            });
    }, [busyTaskId, onChanged]);

    /* the checkbox: outstanding → done, done → reopened */
    const toggle = useCallback((row) => changeStatus(row.taskId, row.state === CAL_TASK_STATE.COMPLETED ? CAL_TASK_ACTION.REOPEN : CAL_TASK_ACTION.COMPLETE), [changeStatus]);

    return { busyTaskId, changeStatus, toggle };
};

export default useCalendarTaskActions;
