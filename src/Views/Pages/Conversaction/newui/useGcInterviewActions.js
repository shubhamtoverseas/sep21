import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { showSuccessOrError } from "../../../../services/commonService";
import {
    workerManageJob, workerManageSuggestedJob, workerJobOfferAcceptInterview,
    workerJobOfferCancelnterview, fetchWorkerJobOfferList,
} from "../../../../redux/Slices/worker/WorkerSlice";
import { extendOffer, cancelSuggestion } from "../../../../redux/Slices/job-offer/JobOfferSlice";
import { cancelInterview, manageInterviewStatus, cancelInvite } from "../../../../redux/Slices/common/interview/InterviewSlice";

const useGcInterviewActions = ({ workerId, employerId, onRefresh }) => {
    const dispatch = useDispatch();
    const [confirm, setConfirm] = useState(null);
    const [schedule, setSchedule] = useState(null);
    const [report, setReport] = useState(null);
    const [instant, setInstant] = useState(null);
    const [busy, setBusy] = useState(false);

    const runThunk = useCallback(async (thunkAction) => {
        setBusy(true);
        try {
            const res = await dispatch(thunkAction);
            showSuccessOrError(res);
            if (!res.error) {
                if (workerId) dispatch(fetchWorkerJobOfferList({ worker_id: workerId }));
                if (onRefresh) onRefresh();
            } else if (onRefresh) {
                onRefresh();
            }
        } finally {
            setBusy(false);
            setConfirm(null);
        }
    }, [dispatch, workerId, onRefresh]);

    const ACTION_DEFS = {
        w_apply: {
            immediate: true,
            thunk: (row) => workerManageJob({ worker_id: workerId, job_id: row.job_id, action: "apply" }),
        },
        w_remove: {
            confirmKey: "key_cancel_application",
            danger: true,
            thunk: (row) => workerManageJob({ worker_id: workerId, job_id: row.job_id, action: "cancel_application" }),
        },
        w_sug_apply: {
            immediate: true,
            thunk: (row) => workerManageSuggestedJob({ job_stage_id: row.job_stage_id, log_type: "worker", status: "accept" }),
        },
        w_sug_decline: {
            confirmKey: "key_decline",
            danger: true,
            thunk: (row) => workerManageSuggestedJob({ job_stage_id: row.job_stage_id, log_type: "worker", status: "decline" }),
        },
        w_accept: {
            immediate: true,
            thunk: (row) => workerJobOfferAcceptInterview({ interview_id: row.interview_id, log_type: "worker", type: "worker" }),
        },
        w_decline: {
            confirmKey: "key_decline",
            danger: true,
            thunk: (row) => workerJobOfferCancelnterview({ interview_id: row.interview_id, log_type: "worker", cancel_flag: "declined" }),
        },
        w_cancel: {
            confirmKey: "key_cancel",
            danger: true,
            thunk: (row) => workerJobOfferCancelnterview({ interview_id: row.interview_id, log_type: "worker", cancel_flag: "cancelled" }),
        },
        e_cancel_invite: {
            confirmKey: "key_cancel_invite",
            danger: true,
            thunk: (row) => cancelInvite({ job_stage_id: row.job_stage_id }),
        },
        /* U-0134 / U-0240: two events — Matched → Not Interested (EMPLOYER_NOT_INTERESTED), Applied → Not Suitable (EMPLOYER_REMOVED_APPLICANT);
           the explicit `action` rides beside job_stage_id (backend ask J-3; the server derives the same code from the stage) */
        e_not_interested: {
            confirmKey: "key_not_interested",
            danger: true,
            thunk: (row) => manageInterviewStatus({ job_stage_id: row.job_stage_id, action: "employer_not_interested" }),
        },
        e_remove_applicant: {
            confirmKey: "key_mark_as_not_suitable",
            danger: true,
            thunk: (row) => manageInterviewStatus({ job_stage_id: row.job_stage_id, action: "employer_removed_applicant" }),
        },
        e_undo_not_interested: {
            confirmKey: "key_undo",
            thunk: (row) => manageInterviewStatus({ job_stage_id: row.job_stage_id }),
        },
        e_cancel_interview: {
            confirmKey: "key_cancel_interview",
            danger: true,
            thunk: (row) => cancelInterview({ interview_id: row.interview_id || row.interview?.id, log_type: "employer" }),
        },
        e_extend_offer: {
            confirmKey: "key_extend_offer",
            thunk: (row, ctx) => extendOffer({ interview_id: row.interview?.id || row.interview_id, job_id: ctx?.jobId }),
        },
        e_cancel_suggestion: {
            confirmKey: "key_cancel_suggestion",
            danger: true,
            thunk: (row, ctx) => cancelSuggestion({ worker_id: row.id, job_id: ctx?.jobId }),
        },
    };

    const SCHEDULE_DEFS = {
        w_reschedule: (row) => ({
            jobId: row.job_id,
            selectedjobWorkerObj: row,
            interviewType: "re-schedule",
            scheduleInterviewFrom: "from-upcoming",
            actionLocation: "worker-job-offer",
        }),
        e_schedule: (row, ctx) => ({
            jobId: ctx?.jobId,
            selectedjobWorkerObj: { ...row, employer_id: employerId },
            interviewType: "schedule",
            scheduleInterviewFrom: "",
            actionLocation: "worker-job-offer",
        }),
        e_reschedule_pending: (row, ctx) => ({
            jobId: ctx?.jobId,
            selectedjobWorkerObj: { ...row, employer_id: employerId },
            interviewType: "re-schedule",
            scheduleInterviewFrom: "from-pending",
            actionLocation: "worker-job-offer",
        }),
        e_reschedule_upcoming: (row, ctx) => ({
            jobId: ctx?.jobId,
            selectedjobWorkerObj: { ...row, employer_id: employerId },
            interviewType: "re-schedule",
            scheduleInterviewFrom: "from-upcoming",
            actionLocation: "worker-job-offer",
        }),
        e_reschedule_cancelled: (row, ctx) => ({
            jobId: ctx?.jobId,
            selectedjobWorkerObj: { ...row, employer_id: employerId },
            interviewType: "schedule",
            scheduleInterviewFrom: "from-cancelled",
            actionLocation: "worker-job-offer",
        }),
        e_interview_again: (row, ctx) => ({
            jobId: ctx?.jobId,
            selectedjobWorkerObj: { ...row, employer_id: employerId },
            interviewType: "interview-again",
            scheduleInterviewFrom: "from-completed",
            actionLocation: "worker-job-offer",
        }),
    };

    const requestAction = useCallback((actionId, row, ctx) => {
        const scheduleDef = SCHEDULE_DEFS[actionId];
        if (scheduleDef) {
            setSchedule(scheduleDef(row, ctx));
            return;
        }
        if (actionId === "e_view_report") { setReport({ mode: "view", row, ctx }); return; }
        if (actionId === "e_mark_report") { setReport({ mode: "mark", row, ctx }); return; }
        if (actionId === "e_instant") {
            setConfirm({ actionId, row, ctx, confirmKey: "key_instant_interview", messageKey: "key_are_you_sure_generate_instant_meeting" });
            return;
        }
        if (actionId === "e_instant_status") { setInstant({ mode: "status", row, ctx }); return; }
        const def = ACTION_DEFS[actionId];
        if (!def) return;
        if (def.immediate) {
            runThunk(def.thunk(row, ctx));
        } else {
            setConfirm({ actionId, row, ctx, confirmKey: def.confirmKey, danger: def.danger });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runThunk, workerId, employerId]);

    const confirmAction = useCallback(() => {
        if (!confirm) return;
        if (confirm.actionId === "e_instant") {
            setInstant({ mode: "generate", row: confirm.row, ctx: confirm.ctx });
            setConfirm(null);
            return;
        }
        const def = ACTION_DEFS[confirm.actionId];
        if (def) runThunk(def.thunk(confirm.row, confirm.ctx));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [confirm, runThunk]);

    const closeConfirm = useCallback(() => setConfirm(null), []);
    const closeSchedule = useCallback((refresh = true) => {
        setSchedule(null);
        if (refresh) {
            if (workerId) dispatch(fetchWorkerJobOfferList({ worker_id: workerId }));
            if (onRefresh) onRefresh();
        }
    }, [dispatch, workerId, onRefresh]);
    const closeReport = useCallback((refresh = false) => {
        setReport(null);
        if (refresh && onRefresh) onRefresh();
    }, [onRefresh]);
    const editReport = useCallback(() => {
        setReport((prev) => (prev ? { ...prev, mode: "mark" } : prev));
    }, []);
    const closeInstant = useCallback((refresh = false) => {
        setInstant(null);
        if (refresh && onRefresh) onRefresh();
    }, [onRefresh]);

    return {
        confirm, schedule, report, instant, busy,
        requestAction, confirmAction, closeConfirm, closeSchedule,
        closeReport, editReport, closeInstant,
    };
};

export default useGcInterviewActions;
