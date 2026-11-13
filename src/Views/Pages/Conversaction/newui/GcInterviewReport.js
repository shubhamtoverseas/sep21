import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs from "dayjs";
import "./global-chat.css";
import GcModal from "./GcModal";
import GcIcon from "./gcIcons";
import translation from "../../../../utils/translation";
import { showSuccessOrError } from "../../../../services/commonService";
import { fetchInterviewDetails, interviewCompleted } from "../../../../redux/Slices/common/interview/InterviewSlice";
import { OUTCOME_LABELS } from "./gcConstants";

/* Same validation rules as the shared InterviewReportPopup. */
const validationSchema = yup.object().shape({
    type: yup.string().required("Report status is required"),
    comment: yup
        .string()
        .required(translation("key_comment_is_required"))
        .min(10, "Comment must be at least 10 characters"),
});


const locationLabel = (detail) => (
    `${ detail?.office_location === 1 ? translation("key_video_interview") : translation("key_office_interview") } (${ translation("key_employer") })`
);

const recordedBy = (detail) => {
    if (detail?.interview_report_marked_by_system) {
        return `${ translation("key_interview_marked_by_system") } · ${ detail?.interview_report_marked_at
            ? dayjs(detail.interview_report_marked_at).format("D MMM, h:mm A") : "" }`;
    }
    if (detail?.interview_report_marked_name && detail?.interview_report_marked_at) {
        return `${ detail.interview_report_marked_name } · ${ dayjs(detail.interview_report_marked_at).format("D MMM, h:mm A") }`;
    }
    return "";
};

/**
 * Interview Report modal (view + mark/edit) matching the Global Chat design
 * bundle. Data flow is identical to the shared InterviewReportPopup /
 * InterviewReportCompletedViewPopup (fetchInterviewDetails + the
 * interviewCompleted submit with the same validation); those shared
 * components remain untouched for the Jobs and Worker modules.
 */
const GcInterviewReport = ({ mode, interviewId, jobStageStatusName, onClose, onEdit, onSubmitted }) => {
    const dispatch = useDispatch();
    const { interviewDetail, status } = useSelector((state) => ({
        interviewDetail: state.interview.interviewDetail,
        status: state.interview.status,
    }), shallowEqual);

    const { handleSubmit, control, watch, formState: { errors }, reset } = useForm({
        defaultValues: { type: "", comment: "" },
        resolver: yupResolver(validationSchema),
    });
    const selectedType = watch("type");

    useEffect(() => {
        dispatch(fetchInterviewDetails(interviewId));
    }, [interviewId, dispatch]);

    useEffect(() => {
        if (interviewDetail?.comment) {
            reset({ type: interviewDetail?.type || "", comment: interviewDetail.comment });
        }
    }, [interviewDetail, reset]);

    const onSubmit = (data) => {
        dispatch(interviewCompleted({ ...data, interview_id: interviewId })).then((res) => {
            showSuccessOrError(res);
            if (!res?.error) onSubmitted();
        });
    };

    if (mode === "view") {
        const outcome = OUTCOME_LABELS[interviewDetail?.type]
            ? translation(OUTCOME_LABELS[interviewDetail?.type])
            : (jobStageStatusName === "Completed" ? translation("key_interview_completed") : jobStageStatusName);
        return (
            <GcModal
                title={ `${ translation("key_interview_report") } : ${ jobStageStatusName }` }
                size="sm"
                onClose={ onClose }
                footer={ (
                    <>
                        <span className="gc-spacer" />
                        <button type="button" className="gc-btn gc-btn-secondary inline" onClick={ onEdit }>
                            { translation("key_edit") }
                        </button>
                        <button type="button" className="gc-btn gc-btn-primary inline" onClick={ onClose }>
                            { translation("key_ok") }
                        </button>
                    </>
                ) }
            >
                <div className="gc-report-view">
                    <b>{ interviewDetail?.worker_fullname }</b>
                    { (interviewDetail?.age || interviewDetail?.worker_nationality_info)
                        && <> · { [interviewDetail?.age, interviewDetail?.worker_nationality_info].filter(Boolean).join(", ") }</> }
                    <div className="gc-rk">{ translation("key_date_and_time") }</div>
                    { interviewDetail?.interview_date
                        ? dayjs(`${ interviewDetail.interview_date } ${ interviewDetail.interview_time }`).format("D MMM · h:mm A")
                        : "—" }
                    <div className="gc-rk">{ translation("key_location") }</div>
                    { locationLabel(interviewDetail) }
                    <div className="gc-rk">{ translation("key_outcome") }</div>
                    { outcome || "—" }
                    <div className="gc-rk">{ translation("key_comment") }</div>
                    { interviewDetail?.comment || "—" }
                    { recordedBy(interviewDetail) && (
                        <>
                            <div className="gc-rk">{ translation("key_recorded_by") }</div>
                            { recordedBy(interviewDetail) }
                        </>
                    ) }
                    { interviewDetail?.cancelled_by_fullname && (
                        <>
                            <div className="gc-rk">{ translation("key_cancelled_by") }</div>
                            { interviewDetail.cancelled_by_fullname }
                        </>
                    ) }
                </div>
            </GcModal>
        );
    }

    return (
        <GcModal
            title={ translation("key_interview_report") }
            size="sm"
            onClose={ onClose }
            footer={ (
                <>
                    <span className="gc-spacer" />
                    <button type="button" className="gc-btn gc-btn-secondary inline" onClick={ onClose }>
                        { translation("key_cancel") }
                    </button>
                    <button
                        type="button"
                        className="gc-btn gc-btn-primary inline"
                        disabled={ !selectedType || status === "loading" }
                        onClick={ handleSubmit(onSubmit) }
                    >
                        { translation("key_submit") }
                    </button>
                </>
            ) }
        >
            <div className="gc-banner-accent">
                { translation("key_please_select_one_report_status_for") } { interviewDetail?.worker_fullname }&lsquo;s { translation("key_interview_with_employer") } { interviewDetail?.employer_fullname }
            </div>
            <div>
                <Controller
                    control={ control }
                    name="type"
                    render={ ({ field }) => (
                        <>
                            { Object.entries(OUTCOME_LABELS).map(([value, labelKey]) => (
                                <label className="gc-radio-row" key={ value }>
                                    <input
                                        type="radio"
                                        name="reportStatus"
                                        value={ value }
                                        checked={ field.value === value }
                                        onChange={ () => field.onChange(value) }
                                    />
                                    { translation(labelKey) }
                                </label>
                            )) }
                        </>
                    ) }
                />
                { errors.type && (
                    <div className="gc-warn-line danger"><GcIcon name="warn" /><span>{ errors.type.message }</span></div>
                ) }
            </div>
            <div className="gc-ff full">
                <label>{ translation("key_comment") }</label>
                <Controller
                    name="comment"
                    control={ control }
                    render={ ({ field }) => (
                        <textarea { ...field } className="gc-tpl-body-edit" rows={ 3 } />
                    ) }
                />
                { errors.comment && (
                    <div className="gc-warn-line danger"><GcIcon name="warn" /><span>{ errors.comment.message }</span></div>
                ) }
            </div>
            <div className="gc-left-note">{ translation("key_report_mandatory_note") }</div>
            { recordedBy(interviewDetail) && (
                <div className="gc-left-note">{ recordedBy(interviewDetail) }</div>
            ) }
            { interviewDetail?.cancelled_by_fullname && (
                <div className="gc-left-note">{ translation("key_cancelled_by") }: { interviewDetail.cancelled_by_fullname }</div>
            ) }
        </GcModal>
    );
};

GcInterviewReport.propTypes = {
    mode: PropTypes.oneOf(["view", "mark"]).isRequired,
    interviewId: PropTypes.any,
    jobStageStatusName: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onEdit: PropTypes.func,
    onSubmitted: PropTypes.func.isRequired,
};

export default GcInterviewReport;
