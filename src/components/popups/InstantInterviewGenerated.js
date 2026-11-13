import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { createInstantInterview } from "../../redux/Slices/common/interview/InterviewSlice";
import dayjs from "dayjs";
import CustomSpinner from "../ReusableComponents/CustomSpinner";
import { copyToClipboard, showSuccessOrError } from "../../services/commonService";
import translation from "../../utils/translation";

function InstantInterviewGenerated({ interviewId, onClose, onRefreshJobWorkerList, selectedjobWorkerObj }) {
    const dispatch = useDispatch();
    const [formattedStartTime, setFormattedStartTime] = useState();
    const [formattedEndTime, setFormattedEndtTime] = useState();
    const { interviewData, status } = useSelector((state) => state.interview);

    useEffect(() => {
        let payload = {};
        if (!interviewId) {
            payload.job_stage_id = selectedjobWorkerObj?.job_stage_id;
        } else {
            payload.interview_id = interviewId;
        }
        dispatch(createInstantInterview(payload)).then(res => {
            showSuccessOrError(res);
            if (res?.error) {
                onClose();
                return false;
            }
            setFormattedStartTime(dayjs(res?.payload?.data?.instant_interview_time, "HH:mm:ss").format("h:mm A"));
            setFormattedEndtTime(dayjs(res?.payload?.data?.instant_interview_time, "HH:mm:ss").add(30, "minutes").format("h:mm A"));
            onRefreshJobWorkerList();
        });
    }, [dispatch, interviewId, onClose, onRefreshJobWorkerList, selectedjobWorkerObj?.job_stage_id]);

     const handleCopyLink = useCallback(() => {
        if (interviewData?.instant_interview_link) {
            copyToClipboard(interviewData.instant_interview_link);
        }
    }, [interviewData?.instant_interview_link]);

    return (
        <div
            className="modal fade modalCustom show"
            tabIndex={-1}
            aria-labelledby="exampleModalCenterTitle"
            style={{
                display: "block",
                background: "rgba(0, 0, 0, 0.7)",
            }}
            aria-modal="true"
            role="dialog"
        >
            <div className="modal-dialog" role="document">
                <div className="modal-content">
                    <div className="modal-header text-center">
                        <h5 className="modal-title black" id="exampleModalLabel">
                            {translation('key_instant_interview_generated')}
                        </h5>
                    </div>
                    <div className="modal-body text-left text-wrap">
                        {status === 'loading' ? <CustomSpinner /> :
                            <>
                                <p className='mb-1'>
                                    <strong>{translation('key_employer_name')}:</strong> {interviewData?.employer_fullname || translation('key_not_available')}
                                </p>
                                <p className='mb-1'>
                                    <strong>{translation('key_worker_name')}:</strong> {interviewData?.worker_fullname || translation('key_not_available')}
                                </p>
                                <p className='mb-1'>
                                    <strong>{translation('key_job_id')}:</strong> {interviewData?.job_reference_id || translation('key_not_available')}
                                </p>

                                <p className='mb-1'>
                                    <strong>{translation('key_interview_schedule')}:</strong>
                                    {" "}
                                    {dayjs(interviewData?.instant_interview_date).format('ddd, Do MMM')}, {' '}
                                    {formattedStartTime} {translation('key_to')} {formattedEndTime}
                                </p>
                                <p className='mb-1'>
                                    <strong>{translation('key_join_now_with_this_link')}:</strong>{" "}
                                    <a href={interviewData?.instant_interview_link} target="_blank" rel="noopener noreferrer">
                                        {interviewData?.instant_interview_link}
                                    </a>
                                </p>
                                <button className="btn btn-link btn-sm" onClick={handleCopyLink}>
                                    {translation('key_copy_link')}
                                </button>
                            </>}
                    </div>
                    <div className="modal-footer justify-content-center">
                        <button
                            type="button"
                            className="btn filled-btn mb-0"
                            onClick={onClose}
                            data-dismiss="modal"
                        >
                            {translation('key_ok')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

InstantInterviewGenerated.propTypes = {
    onClose: PropTypes.func,
    interviewId: PropTypes.number,
    onRefreshJobWorkerList: PropTypes.func,
    selectedjobWorkerObj: PropTypes.object,
};

export default InstantInterviewGenerated;
