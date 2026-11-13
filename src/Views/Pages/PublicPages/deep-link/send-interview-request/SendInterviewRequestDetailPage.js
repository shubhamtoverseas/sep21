import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import axios from "axios";
import PropTypes from "prop-types";

import starCalendarIcon from "../../../../../assets/img/deep-link/star-calendar.svg";
import agencyLogoVector from "../../../../../assets/img/deep-link/agency-logo-vector.svg";
import officeInterviewLocation from "../../../../../assets/img/deep-link/office-interview-icon.svg";
import videoInterviewLocation from "../../../../../assets/img/deep-link/video-interview-icon.svg";
import accountManager from "../../../../../assets/img/deep-link/account-manager.svg";
import profile from "../../../../../assets/img/nouser.jpeg";
import '../worker-detail-deeplink.css';
import { APP_URL } from "../../../../../services/apiPath";
import RemoveApplicantPopup from "../RemoveApplicantPopup";
import configData from "../../../../../components/ReusableComponents/app-configs";
import { deepLinkAPIHeader } from "../../../../../services/commonService";
import CustomSpinner from "../../../../../components/ReusableComponents/CustomSpinner";
import dayjs from "dayjs";

const SendInterviewRequestDetailPage = ({ jobStageDetail: propJobStageDetail, 
  workerDetail: propWorkerDetail, interviewDetail: propInterviewDetail }) => {
  const [jobStageDetail, setJobStageDetail] = useState(propJobStageDetail || {});
  const [workerDetail, setWorkerDetail] = useState(propWorkerDetail || {});
  const [interviewDetail, setInterviewDetail] = useState(propInterviewDetail || {});
  const [isRemoveApplicantPopupOpen, setIsRemoveApplicantPopupOpen] = useState(false);
  const [loading, setLoading] = useState(!propJobStageDetail || !propWorkerDetail);
  const [error, setError] = useState(null);

  const workerId = new URLSearchParams(window.location.search).get('worker_id');
  const token = new URLSearchParams(window.location.search).get('token');
  const jobId = new URLSearchParams(window.location.search).get('job_id');
  const employerId = new URLSearchParams(window.location.search).get('employer_id');

  useEffect(() => {
    // If props are provided, use them and skip API call
    if (propJobStageDetail && propWorkerDetail) {
      setJobStageDetail(propJobStageDetail);
      setWorkerDetail(propWorkerDetail);
      setLoading(false);
      return;
    }

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

    if (jobId) {
      fetchWorkerDetails();
    } else {
      setError("Worker ID or Job ID is missing from URL parameters");
      setLoading(false);
    }
  }, [jobId, propJobStageDetail, propWorkerDetail, workerId]);

  console.log(jobStageDetail);

  if (loading) {
    return <CustomSpinner />;
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
      <div className="d-flex justify-content-center vh-100">
        <div className="mobile-banner-deeplink position-relative bg-white no-global-style">
          <div className="text-center interview_datecalandar vh-100 position-relative">
            <header className="text-center fw-500 d-flex justify-content-between align-items-center font-cooper-bt fz20">
              <span style={{ width: '24px' }}></span>
              <span className="text-capitalize">  {configData.jobStageLabels[jobStageDetail?.status] || "Interview Details"}</span>
              <span style={{ width: '24px' }}></span>
            </header>

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

            <div className="mobile-body-content p-3">
              {/* Worker Profile Section */}
              <div className="userprofile_content d-flex grey9b mb20 text-left align-items-start">
                <figure
                  className="worker-profile-img img-compact mb-0 mr-3"
                  style={{
                    backgroundImage: `url(${workerDetail.image || profile})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <div className="contentWrap d-flex justify-content-center flex-column">
                  <p className="mb-1 fz22 fw-500 regular black mb-1 font-cooper-bt">
                    {workerDetail.fullname || "No name provided"}
                  </p>
                  <span className="grey fz16 fw-400 regular user-address font-mabry-pro mb-1">
                    {workerDetail.age ? `${workerDetail.age}, ` : ""}
                    {workerDetail.nationality?.name_en || "Nationality not specified"}
                  </span>
                  <Link to={'/job-stage-details'+'?worker_id=' + workerId + '&&job_id=' + jobId + '&&page_type=internal' + '&&token=' + token} className="fz14 fw-500 font-mabry-pro blue cursor-pointer">See Profile</Link>
                </div>
              </div>

              <hr className="mt32 mb32" />

              {/* Interview Date and Time */}
              <div className="interview-info d-flex cursor-pointer mb30 align-items-start border-0">
                <img src={starCalendarIcon} alt="calendar icon" width={30} className="mt-1" />
                <div className="text-left ml-3">
                  <h6 className="mb-1 fz14 fw-500 grey89 font-mabry-pro">Date and Time</h6>
                  <p className="mb-0 font-mabry-pro fz16 fw-400 black">
                    {dayjs(`${interviewDetail?.interview_date} ${interviewDetail?.interview_time}`).format('ddd, D MMM, h:mm A')}
                  </p>
                </div>
              </div>

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
              <div className="interview-info d-flex cursor-pointer align-items-start border-0 mb-3">
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
              {jobStageDetail?.stage_key === 'interview_completed' && <div className="blue-info-badge text-center font-mabry-pro flex-column">
                <p className="mb-2 w-75">If you’re interested in extending an offer, let us know.</p>
                <p className="mb-0 w-75">Our staff will reach out promptly to discuss next steps.</p>
              </div>
              }
            </div>


            {jobStageDetail?.stage_key === 'interview_upcoming' && <div className="mobile-footer d-flex flex-column sticky-page-footer deeplink-button bottom-0 left-0 right-0 p-3 bg-white border-top">
              <div className="deeplink-button mb10">
                <a href={interviewDetail?.google_meet_link}
                  rel="noopener noreferrer"
                  target="_blank" className="btn filled-btn font-cooper-bt fw-500 justify-content-center w-100">
                  Join Video Interview
                </a>
              </div>
              <div className="d-flex">
                <button
                  className="btn btn-outline-primary font-cooper-bt fz16 fw-500 mr-2"
                  style={{ flex: 1 }}
                  onClick={() => setIsRemoveApplicantPopupOpen(true)}
                >
                  Cancel
                </button>
                <Link
                  // to={'/job-stage-details/reschedule-request' + '?worker_id=' + workerId + '&&job_id=' + jobId + '&&employer_id=' + employerId}
                  to={'/job-stage-details/send-interview-request-date'+'?worker_id=' + workerId + '&&job_id=' + jobId + '&&employer_id=' + employerId + '&&token=' + token}
                  className="btn btn-outline-primary font-cooper-bt fz16 fw-500 "
                  style={{ flex: 1 }}
                >
                  Reschedule
                </Link>
              </div>
            </div>
            }

            {/* Footer with buttons */}
            {jobStageDetail?.stage_key === 'interview_pending' && <div className="mobile-footer d-flex flex-column sticky-page-footer deeplink-button bottom-0 left-0 right-0 p-3 bg-white border-top">
              <div className="d-flex">
                <button
                  className="btn btn-outline-primary font-cooper-bt fz16 fw-500 mr-2"
                  style={{ flex: 1 }}
                  onClick={() => setIsRemoveApplicantPopupOpen(true)}
                >
                  Cancel
                </button>
                <Link
                  // to={'/job-stage-details/reschedule-request' + '?worker_id=' + workerId + '&&job_id=' + jobId + '&&employer_id=' + employerId}
                  to={'/job-stage-details/send-interview-request-date'+'?worker_id=' + workerId + '&&job_id=' + jobId + '&&employer_id=' + employerId + '&&token=' + token}
                  className="btn btn-outline-primary font-cooper-bt fz16 fw-500 "
                  style={{ flex: 1 }}
                >
                  Reschedule
                </Link>
              </div>
            </div>
            }
          </div>
        </div>
      </div>
    </>
  );
};

SendInterviewRequestDetailPage.propTypes = {
  jobStageDetail: PropTypes.object,
  workerDetail: PropTypes.object,
  interviewDetail: PropTypes.object,
};

SendInterviewRequestDetailPage.defaultProps = {
  jobStageDetail: null,
  workerDetail: null,
  interviewDetail: null,
};

export default SendInterviewRequestDetailPage;