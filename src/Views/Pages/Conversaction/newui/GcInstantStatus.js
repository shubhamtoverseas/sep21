import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import dayjs from "dayjs";
import GcModal from "./GcModal";
import GcIcon from "./gcIcons";
import translation from "../../../../utils/translation";
import gMeetIcon from "../../../../assets/img/svg/gmeet-icon.svg";
import { fetchInterviewDetails, updateInstantInterviewStatus } from "../../../../redux/Slices/common/interview/InterviewSlice";
import { fetchJobDetail, fetchJobWorkerList } from "../../../../redux/Slices/job-offer/JobOfferSlice";
import { instantInterviewFormState } from "../../../../components/ReusableComponents/form-states";
import { copyToClipboard, showSuccessOrError } from "../../../../services/commonService";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";

function GcInstantStatus({ interviewId, onClose, jobId, selectedjobWorkerObj }) {
    const dispatch = useDispatch();
    const { interviewDetail, status } = useSelector((state) => ({
        interviewDetail: state.interview.interviewDetail,
        status: state.interview.status,
    }), shallowEqual);

    const { register, handleSubmit, setValue, formState: { errors } } = useForm({
        defaultValues: instantInterviewFormState,
    });

    useEffect(() => {
        dispatch(fetchInterviewDetails(interviewId));
    }, [interviewId, dispatch]);

    useEffect(() => {
        const jobStageStatus = selectedjobWorkerObj?.job_stage_status_name.toLowerCase();
        if (jobStageStatus && jobStageStatus !== "pending" && jobStageStatus !== "upcoming") {
            if (jobStageStatus === "cancelled" || jobStageStatus === "completed") {
                setValue("type", "keep_original");
            } else {
                setValue("type", "update_original");
            }
        }
    }, [selectedjobWorkerObj, setValue]);

    const onSubmit = (data) => {
        dispatch(updateInstantInterviewStatus({ interview_id: interviewId, ...data })).then((res) => {
            showSuccessOrError(res);
            if (!res?.error) {
                dispatch(fetchJobWorkerList({
                    job_id: jobId,
                    job_stage: selectedjobWorkerObj?.job_stage_status_id,
                }));
                dispatch(fetchJobDetail(jobId));
                onClose();
            }
        });
    };

    const handleCopyLink = (e) => {
        e.preventDefault();
        copyToClipboard(interviewDetail?.instant_interview_link);
    };

    const showRadioButtons =
        selectedjobWorkerObj?.job_stage_status_name.toLowerCase() === "pending" ||
        selectedjobWorkerObj?.job_stage_status_name.toLowerCase() === "upcoming";

    const fieldError = (err) => err && (
        <div className="gc-warn-line danger"><GcIcon name="warn" /><span>{ err.message }</span></div>
    );

    return (
        <GcModal
            title={ translation("key_update_instant_interview_status") }
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
                        disabled={ status === "loading" }
                        onClick={ handleSubmit(onSubmit) }
                    >
                        { translation("key_done") }
                    </button>
                </>
            ) }
        >
            { status === "loading" ? <CustomSpinner /> : (
                <>
                    <div className="gc-report-view">
                        <b>{ interviewDetail?.worker_fullname }</b>
                        { (interviewDetail?.age || interviewDetail?.worker_nationality_info)
                            && <> · { [interviewDetail?.age, interviewDetail?.worker_nationality_info].filter(Boolean).join(", ") }</> }
                        <div className="gc-rk">{ translation("key_employer") }</div>
                        { interviewDetail?.employer_fullname || "—" }
                        { interviewDetail?.interview_date && (
                            <>
                                <div className="gc-rk">{ translation("key_date_and_time") }</div>
                                { dayjs(`${ interviewDetail.interview_date } ${ interviewDetail.interview_time }`).format("D MMM · h:mm a") }
                                { " – " }
                                { dayjs(`${ interviewDetail.interview_date } ${ interviewDetail.interview_time }`).clone().add(30, "minutes").format("h:mm a") }
                            </>
                        ) }
                        { interviewDetail?.instant_interview_link && (
                            <>
                                <div className="gc-rk">{ translation("key_meet") }</div>
                                <div className="gc-meet-row">
                                    <img src={ gMeetIcon } alt="" width={ 18 } height={ 16 } />
                                    <a href={ interviewDetail.instant_interview_link } target="_blank" rel="noopener noreferrer">
                                        { interviewDetail.instant_interview_link }
                                    </a>
                                </div>
                                <button type="button" className="gc-copy-link" onClick={ handleCopyLink }>
                                    { translation("key_click_to_copy_google_meet_link") }
                                </button>
                            </>
                        ) }
                    </div>
                    <div>
                        <label className="gc-radio-row">
                            <input type="radio" value="6" { ...register("status", { required: translation("key_please_select_a_status") }) } />
                            { translation("key_mark_interview_completed") }
                        </label>
                        <label className="gc-radio-row">
                            <input type="radio" value="10" { ...register("status", { required: translation("key_please_select_a_status") }) } />
                            { translation("key_interview_cancelled") }
                        </label>
                        { fieldError(errors.status) }
                    </div>
                    <div className="gc-ff full">
                        <label>{ translation("key_comment") }</label>
                        <textarea
                            className="gc-tpl-body-edit"
                            rows={ 3 }
                            placeholder={ translation("key_enter_your_comment_here") }
                            { ...register("comment", { required: translation("key_comment_is_required") }) }
                        />
                        { fieldError(errors.comment) }
                    </div>
                    { showRadioButtons && (
                        <div>
                            <label className="gc-radio-row">
                                <input type="radio" value="keep_original" { ...register("type", { required: translation("key_please_select_an_option") }) } />
                                { translation("key_keep_original") }
                            </label>
                            <label className="gc-radio-row">
                                <input type="radio" value="update_original" { ...register("type", { required: translation("key_please_select_an_option") }) } />
                                { translation("key_update_original_interview") }
                            </label>
                            { fieldError(errors.type) }
                        </div>
                    ) }
                </>
            ) }
        </GcModal>
    );
}

GcInstantStatus.propTypes = {
    onClose: PropTypes.func.isRequired,
    interviewId: PropTypes.number.isRequired,
    jobId: PropTypes.number.isRequired,
    selectedjobWorkerObj: PropTypes.object,
};

export default GcInstantStatus;
