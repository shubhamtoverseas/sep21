import React, { useState } from 'react';
import PropTypes from "prop-types";
import axios from 'axios';
import { APP_URL } from "../../../../services/apiPath";
import { ShowToast } from '../../../../components/show-toast/ShowToast';
import { deepLinkAPIHeader } from '../../../../services/commonService';

function RemoveApplicantPopup(props) {
    const [loading, setLoading] = useState(false); 

    const onChangeStageStatus = async () => {
        if (!props.jobStageId) {
            console.error("jobStageId is required");
            return;
        }

        setLoading(true);

        let payload = {
            job_stage_id: props.jobStageId, 
            status: 'decline', 
        };

        try {
            const response = await axios.post(
                `${APP_URL}/change-job-stage-status`,
                payload,
                {
                    headers: deepLinkAPIHeader()
                }
            );
            if (response?.data?.status) {
                console.log('Job stage status changed successfully');
                ShowToast('Success', response?.data?.message || 'Operation successful');
                props.onClose(); 
            } else {
                console.error('Failed to change job stage status');
            }
        } catch (err) {
            console.error('Error changing job stage status:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="modal fade modalCustom confirmApproval show d-flex justify-content-center align-items-center"
            id="newRegistrationJO"
            tabIndex={-1}
            aria-labelledby="exampleModalCenterTitle"
            style={{
                display: "block",
                background: "rgba(0, 0, 0, 0.7)",
            }}
            aria-modal="true"
            role="dialog"
        >
            <div className="modal-dialog modal-lg" role="document" style={{ maxWidth: '327px' }}>
                <div className="modal-content br12">
                    <div className="modal-body p32">
                        <h5 className="mb24 text-center font-cooper-bt fz22 fw-500" id="exampleModalLabel">
                            {props.title}
                        </h5>
                        <p className='fz18 font-mabry-pro fw-400 text-center lh-26 mb42' style={{ color: '#444' }}>
                            {props.description}
                        </p>
                        <div className='d-flex deeplink-button'>
                            <button
                                type="button"
                                className="btn light-btn font-cooper-bt mr-2 fw-600 justify-content-center"
                                style={{ flex: 1 }}
                                onClick={props.onClose}
                                data-dismiss="modal"
                            >
                                No
                            </button>
                            <button
                                onClick={onChangeStageStatus}
                                type="button"
                                className="btn light-btn font-cooper-bt fw-600"
                                style={{ flex: 1 }}
                                disabled={loading} 
                            >
                                {loading ? 'Processing...' : 'Yes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

RemoveApplicantPopup.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    jobStageId: PropTypes.number.isRequired,
};

export default RemoveApplicantPopup;
