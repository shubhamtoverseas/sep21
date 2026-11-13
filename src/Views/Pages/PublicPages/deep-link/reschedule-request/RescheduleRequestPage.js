import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import axios from "axios";

import starCalendarIcon from "../../../../../assets/img/deep-link/star-calendar.svg";
import officeInterviewLocation from "../../../../../assets/img/deep-link/office-interview-icon.svg";
import videoInterviewLocation from "../../../../../assets/img/deep-link/video-interview-icon.svg";
import agencyLogoVector from "../../../../../assets/img/deep-link/agency-logo-vector.svg";
import accountManager from "../../../../../assets/img/deep-link/account-manager.svg";
import { APP_URL, HOST_TYPE, REACT_APP_X_API_KEY } from "../../../../../services/apiPath";
import RemoveApplicantPopup from "../RemoveApplicantPopup";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { deepLinkAPIHeader } from "../../../../../services/commonService";
import CustomSpinner from "../../../../../components/ReusableComponents/CustomSpinner";
import profile from "../../../../../assets/img/nouser.jpeg";
import '../worker-detail-deeplink.css';
import dayjs from "dayjs";

const RescheduleRequestPage = () => {
  const [jobStageDetail, setJobStageDetail] = useState({});
  const [workerDetail, setWorkerDetail] = useState({});
  const [interviewDetail, setInterviewDetail] = useState({});
  const [isRemoveApplicantPopupOpen, setIsRemoveApplicantPopupOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const workerId = new URLSearchParams(window.location.search).get('worker_id');
  const token = new URLSearchParams(window.location.search).get('token');
  const jobId = new URLSearchParams(window.location.search).get('job_id');

  useEffect(() => {
    const fetchWorkerDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${APP_URL}/job-stage-detail?token=${token}`,
          {
            headers: deepLinkAPIHeader()
          }
        );

        if (response.data && response.data.data) {
          setJobStageDetail(response.data.data.job_stage_details || {});
          setWorkerDetail(response.data.data.worker_details || {});
          setInterviewDetail(response.data.data.interview_details || {});
        }
      } catch (err) {
        setError(err.message);
        console.error("Error fetching worker details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (jobId && workerId) {
      fetchWorkerDetails();
    } else {
      setError("Worker ID or Job ID is missing from URL parameters");
      setLoading(false);
    }
  }, [jobId, workerId]);

  console.log(jobStageDetail);

  const onChangeStageStatus = async () => {
    setLoading(true);

    let payload = {
      job_stage_id: jobStageDetail?.id,
      status: 'accept',
    };

    try {
      const response = await axios.post(
        `${APP_URL}/change-job-stage-status`,
        payload,
        {
          headers: {
            'x-api-key': REACT_APP_X_API_KEY,
            'hosttype': HOST_TYPE,
            'device': navigator.userAgent,
            'Content-Type': 'application/json',
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        }
      );
      if (response?.data?.status) {
        console.log('Job stage status changed successfully');
        ShowToast('Success', response?.data?.message || 'Operation successful');
      } else {
        console.error('Failed to change job stage status');
      }
    } catch (err) {
      console.error('Error changing job stage status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <CustomSpinner />
  }

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center text-danger">Error: {error}</div>
      </div>
    );
  }


  return (
    <>
      <Helmet>
        <title>Send Interview Request - MaidMatch</title>
        <meta name="description" content="Schedule an interview with a potential helper" />
      </Helmet>
      <div className="d-flex justify-content-center bg-blue vh-100 align-items-center">
        <div className="mobile-banner-deeplink position-relative no-global-style">
          <div className="m-3 bg-white reschedule-request-box text-center">


            {
              isRemoveApplicantPopupOpen && <RemoveApplicantPopup
                title="Remove Applicant"
                description="Once removed, they will no longer appear as a potential match."
                jobStageId={jobStageDetail?.id}
                onClose={() => setIsRemoveApplicantPopupOpen(false)}
                handleConfirmation={() => {
                  setIsRemoveApplicantPopupOpen(false);
                }}
              />
            }

            <h3 className="font-cooper-bt fz22 fw-500 mb16">Reschedule Request</h3>

            {jobStageDetail?.stage_key === 'reschedule_request_by_employer' && 
              <div className="blue-info-badge text-center mb20 font-mabry-pro">
                Your reschedule request is pending for the worker to accept
              </div>
            }

            <div className="mobile-body-content p-0">
              {/* Worker Profile Section */}
              <div className="userprofile_content d-flex grey9b text-left align-items-center">
                <figure
                  className="worker-profile-img img-compact mb-0"
                  style={{
                    backgroundImage: `url(${workerDetail.image || profile})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <div className="contentWrap d-flex justify-content-center flex-column">
                  <p className="mb-1 fz22 fw-500 regular black mb-1 font-cooper-bt mw150 text-truncate">
                    {workerDetail.fullname || "No name provided"}
                  </p>
                  <span className="grey fz16 fw-400 regular user-address font-mabry-pro mb-1">
                    {workerDetail.age ? `${workerDetail.age}, ` : ""}
                    {workerDetail.nationality?.name_en || "Nationality not specified"}
                  </span>
                  <Link to={'/job-stage-details'+'?worker_id=' + workerId + '&&job_id=' + jobId + '&&page_type=internal' + '&&token=' + token} className="fz14 fw-600 font-mabry-pro blue cursor-pointer">See Profile</Link>
                </div>
              </div>

              <hr className="mt20 mb20" />

              {/* Interview Date and Time */}
              <div className="interview-info d-flex cursor-pointer mb30 align-items-start border-0">
                <img src={starCalendarIcon} alt="calendar icon" width={30} className="mt-1" />
                <div className="text-left ml-3">
                  <h6 className="mb-1 fz14 fw-500 grey89 font-mabry-pro">Suggested Date and Time</h6>
                  <p className="mb-0 font-mabry-pro fz16 fw-400 black">
                    {dayjs(`${interviewDetail?.interview_date} ${interviewDetail?.interview_time}`).format('ddd, D MMM, h:mm A')}
                  </p>
                </div>
              </div>

              {/* Interview Location/Type */}
              <div className="interview-info d-flex cursor-pointer mb30 align-items-start border-0">
                <img
                  src={interviewDetail?.office_location === 1 ? videoInterviewLocation : officeInterviewLocation}
                  alt="interview type icon"
                  width={30}
                  className="mt-1"
                />
                <div className="text-left ml-3">
                  <h6 className="mb-1 fz14 fw-500 grey89 font-mabry-pro">
                    Location
                  </h6>
                  <p className="mb-0 font-mabry-pro fz16 fw-400 black">
                    {interviewDetail?.office_location === 1 ? "Video Interview" : jobStageDetail?.agency?.branch_address}
                  </p>
                  {interviewDetail?.office_location === 2 && (
                    <Link to={jobStageDetail?.agency?.branch_google_map_link} className="fz14 fw-500 font-mabry-pro blue-link mt-1 cursor-pointer">Get Directions</Link>
                  )}
                </div>
              </div>

              {/* Agency Information */}
              <div className="interview-info d-flex py-2 cursor-pointer mb-3 align-items-start border-0">
                <img src={agencyLogoVector} alt="agency icon" width={30} className="mt-1" />
                <div className="text-left ml-3">
                  <h6 className="mb-1 fz14 fw-500 grey89 font-mabry-pro">Agency</h6>
                  <p className="mb-0 font-mabry-pro fz16 fw-400 black">
                    {jobStageDetail?.agency?.agency_name}
                  </p>
                  <span className="fz12 font-mabry-pro grey">
                    License No.: {jobStageDetail?.agency?.agency_license}
                  </span>
                </div>
              </div>

              {/* Account Manager */}
              <div className="interview-info d-flex cursor-pointer align-items-start mb16 border-0">
                <img src={accountManager} alt="agency icon" width={30} className="mt-1" />
                <div className="text-left ml-3">
                  <h6 className="mb-1 fz14 fw-500 grey89 font-mabry-pro">Account Manager</h6>
                  <p className="mb-0 font-mabry-pro fz16 fw-400 black">
                    {interviewDetail?.cs_name}
                  </p>
                  <span className="fz12 font-mabry-pro grey">
                    #{interviewDetail?.job_reference_id}
                  </span>
                </div>
              </div>

              {interviewDetail?.new_interview_date && interviewDetail?.new_interview_time && <>
                <p className="grey89 font-mabry-pro text-left mb-0">
                  {dayjs(`${interviewDetail?.new_interview_date} ${interviewDetail?.new_interview_time}`).format('ddd, D MMM, h:mm A')}
                </p>
              </>
              }

              {jobStageDetail?.stage_key === 'reschedule_request_by_worker' &&
                <>
                  <div className="d-flex deeplink-button bottom-0 left-0 right-0 mb10 bg-white">
                    <button
                      className="btn btn-outline-primary font-cooper-bt fz16 fw-500 mr-2"
                      style={{ flex: 1 }}
                      onClick={() => setIsRemoveApplicantPopupOpen(true)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary font-cooper-bt fz16 fw-500 text-white"
                      style={{ flex: 1 }}
                      onClick={onChangeStageStatus}
                    >
                      Accept
                    </button>
                  </div>
                  <div className="deeplink-button">
                    <a href={'/'}
                      rel="noopener noreferrer"
                      target="_blank" className="btn light-btn font-cooper-bt fw-600 justify-content-center w-100">
                      Suggest another Date and Time
                    </a>
                  </div>
                </>
              }

            </div>
          </div>
        </div>
      </div >
    </>
  );
};

export default RescheduleRequestPage;