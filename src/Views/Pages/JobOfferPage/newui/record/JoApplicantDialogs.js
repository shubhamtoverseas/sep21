import React, { lazy, Suspense, useCallback } from "react";
import PropTypes from "prop-types";
import "../../../Conversaction/newui/global-chat.css";
import ConfirmModal from "../../../../../components/ui/ConfirmModal";
import translation from "../../../../../utils/translation";
import { JO_ACTION_CONFIRM, JO_ACTION_LABEL_KEY } from "../../jobOfferConstants";

const GcScheduleInterview = lazy(() => import("../../../Conversaction/newui/GcScheduleInterview"));
const GcInterviewReport = lazy(() => import("../../../Conversaction/newui/GcInterviewReport"));
const GcInstantStatus = lazy(() => import("../../../Conversaction/newui/GcInstantStatus"));
const InstantInterviewGenerated = lazy(() => import("../../../../../components/popups/InstantInterviewGenerated"));
const JoChangeInterpreterDialog = lazy(() => import("./JoChangeInterpreterDialog"));

const interviewIdOf = (row) => row?.interview?.id || row?.interview_id;

const JoApplicantDialogs = ({ actions, onRefresh }) => {
    const { confirm, schedule, report, instant, busy, confirmAction, closeConfirm, closeSchedule, closeReport, editReport, closeInstant, interpreterRow, closeInterpreter } = actions;

    const closeInstantNoRefresh = useCallback(() => closeInstant(false), [closeInstant]);
    const closeInstantWithRefresh = useCallback(() => closeInstant(true), [closeInstant]);
    const closeInterpreterRefresh = useCallback(() => { closeInterpreter(); onRefresh?.(); }, [closeInterpreter, onRefresh]);

    const confirmMeta = confirm ? (JO_ACTION_CONFIRM[confirm.actionId] || {}) : null;
    const confirmLabel = confirm ? translation(JO_ACTION_LABEL_KEY[confirm.actionId] || confirm.confirmKey) : '';

    return (
        <>
            { confirm && (
                <ConfirmModal
                    title={ confirmMeta.titleKey ? translation(confirmMeta.titleKey) : confirmLabel }
                    body={ confirmMeta.bodyKey ? translation(confirmMeta.bodyKey) : (confirm.row?.name || '') }
                    confirmLabel={ confirmMeta.confirmKey ? translation(confirmMeta.confirmKey) : confirmLabel }
                    danger={ Boolean(confirmMeta.danger || confirm.danger) }
                    busy={ busy }
                    onConfirm={ confirmAction }
                    onClose={ closeConfirm }
                />
            ) }
            <Suspense fallback={ null }>
                { schedule && (
                    <GcScheduleInterview
                        handleOnClose={ () => closeSchedule(true) }
                        jobId={ schedule.jobId }
                        selectedjobWorkerObj={ schedule.selectedjobWorkerObj }
                        interviewType={ schedule.interviewType }
                        scheduleInterviewFrom={ schedule.scheduleInterviewFrom }
                    />
                ) }
                { instant?.mode === 'generate' && (
                    <div className="gc-skin">
                        <InstantInterviewGenerated
                            interviewId={ interviewIdOf(instant.row) }
                            selectedjobWorkerObj={ instant.row }
                            onClose={ closeInstantNoRefresh }
                            onRefreshJobWorkerList={ onRefresh }
                        />
                    </div>
                ) }
                { instant?.mode === 'status' && (
                    <GcInstantStatus
                        jobId={ Number(instant.ctx?.jobId) }
                        selectedjobWorkerObj={ instant.row }
                        interviewId={ Number(interviewIdOf(instant.row)) }
                        onClose={ closeInstantWithRefresh }
                    />
                ) }
                { report && (
                    <GcInterviewReport
                        mode={ report.mode }
                        interviewId={ interviewIdOf(report.row) }
                        jobStageStatusName={ report.row?.job_stage_status_name || '' }
                        onClose={ () => closeReport(false) }
                        onEdit={ editReport }
                        onSubmitted={ () => closeReport(true) }
                    />
                ) }
                { interpreterRow && (
                    <JoChangeInterpreterDialog row={ interpreterRow } onClose={ closeInterpreterRefresh } />
                ) }
            </Suspense>
        </>
    );
};

JoApplicantDialogs.propTypes = {
    actions: PropTypes.object.isRequired,
    onRefresh: PropTypes.func,
};

export default JoApplicantDialogs;
