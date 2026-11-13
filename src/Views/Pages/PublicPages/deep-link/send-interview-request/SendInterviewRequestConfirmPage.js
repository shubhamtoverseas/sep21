import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";

import backIconPage from "../../../../../assets/img/deep-link/back-page-icon.svg";
import starCalendarIcon from "../../../../../assets/img/deep-link/star-calendar.svg";
import agencyLogoVector from "../../../../../assets/img/deep-link/agency-logo-vector.svg";
import officeInterviewLocation from "../../../../../assets/img/deep-link/office-interview-icon.svg";
import videoInterviewLocation from "../../../../../assets/img/deep-link/video-interview-icon.svg";
import profile from "../../../../../assets/img/nouser.jpeg";
import '../worker-detail-deeplink.css';
import { APP_URL } from "../../../../../services/apiPath";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { deepLinkAPIHeader } from "../../../../../services/commonService";
import CustomSpinner from "../../../../../components/ReusableComponents/CustomSpinner";

const SendInterviewRequestConfirmPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [jobStageDetail, setJobStageDetail] = useState({});
  const [workerDetail, setWorkerDetail] = useState({});
  const [loading, setLoading] = useState(true);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get data from previous screens
  const { selectedDate, selectedTime, interviewType } = location.state || {};

  const workerId = new URLSearchParams(window.location.search).get('worker_id');
  const token = new URLSearchParams(window.location.search).get('token');
  const jobId = new URLSearchParams(window.location.search).get('job_id');
  const employerId = new URLSearchParams(window.location.search).get('employer_id');

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

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "Date not selected";

    const date = new Date(dateString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const day = days[date.getDay()];
    const month = months[date.getMonth()];
    const dayNum = date.getDate();

    return `${day}, ${dayNum} ${month}`;
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime || !interviewType || !jobStageDetail.id) {
      alert("Missing required information. Please go back and complete all steps.");
      return;
    }

    setConfirmLoading(true);

    try {
      const payload = {
        job_stage_id: jobStageDetail.id,
        status: "schedule_interview",
        interview_date: selectedDate,
        interview_time: selectedTime,
        interview_type: interviewType
      };

      const response = await axios.post(
        `${APP_URL}/change-job-stage-status`,
        payload,
        {
          headers: deepLinkAPIHeader()
        }
      );

      // Handle successful response
      if (response?.data?.status) {
        ShowToast('success', response?.data?.message || 'Operation successful');
        navigate(`/job-stage-details?worker_id=${workerId}&job_id=${jobId}&employer_id=${employerId}&token=${token}`);
      } else {
        ShowToast('error', "Failed to send interview request. Please try again.");
      }
    } catch (err) {
      console.error("Error sending interview request:", err);
      ShowToast('error', "Failed to send interview request. Please try again.");
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCancel = () => {
    // Navigate back to job details or ask for confirmation
    navigate(`/job-stage-details?worker_id=${workerId}&job_id=${jobId}&employer_id=${employerId}&token=${token}`);
  };

  const handleBack = () => {
    navigate(`/job-stage-details/send-interview-request-location?worker_id=${workerId}&job_id=${jobId}&employer_id=${employerId}&token=${token}`, {
      state: {
        selectedDate,
        selectedTime,
        workerId: workerId,
        jobId: jobId,
        employerId: employerId
      }
    });
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

  if (!selectedDate || (!selectedTime) || !interviewType) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <p>Missing interview information. Please start from the beginning.</p>
          <button className="btn btn-primary" onClick={() => navigate(`/job-stage-details/send-interview-request-date?worker_id=${workerId}&job_id=${jobId}&token=${token}`)}>
            Start Over
          </button>
        </div>
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
            <header className="text-center fw-500 d-flex justify-content-between align-items-center font-cooper-bt fz20 mb-3">
              <img
                src={backIconPage}
                alt="back icon"
                className="cursor-pointer"
                onClick={handleBack}
              />
              <span>Send Interview Request</span>
              <span style={{ width: '24px' }}></span>
            </header>

            <div className="mobile-body-content px-3">
              {/* Worker Profile Section */}
              <div className="userprofile_content d-flex grey9b text-left align-items-center">
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
                  <Link to={'/job-stage-details'+'?worker_id=' + workerId + '&&job_id=' + jobId + '&&page_type=internal' + '&&token=' + token} className="fz14 fw-600 font-mabry-pro blue cursor-pointer">See Profile</Link>
                </div>
              </div>

              <hr className="mt32 mb32" />

              {/* Interview Date and Time */}
              <div className="interview-info d-flex cursor-pointer mb30 align-items-start border-0">
                <img src={starCalendarIcon} alt="calendar icon" width={30} className="mt-1" />
                <div className="text-left ml-3">
                  <h6 className="mb-1 fz14 fw-500 grey89 font-mabry-pro">Date and Time</h6>
                  <p className="mb-0 font-mabry-pro fz16 fw-400 black">
                    {formatDateForDisplay(selectedDate)}, {selectedTime}
                  </p>
                </div>
              </div>

              {/* Interview Location/Type */}
              <div className="interview-info d-flex cursor-pointer mb30 align-items-start border-0">
                <img
                  src={interviewType === 1 ? videoInterviewLocation : officeInterviewLocation}
                  alt="interview type icon"
                  width={30}
                  className="mt-1"
                />
                <div className="text-left ml-3">
                  <h6 className="mb-1 fz14 fw-500 grey89 font-mabry-pro">
                    Location
                  </h6>
                  <p className="mb-0 font-mabry-pro fz16 fw-400 black">
                    {interviewType === 1 ? "Video Interview" : jobStageDetail?.agency?.branch_address}
                  </p>
                  {interviewType === 2 && (
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
            </div>

            {/* Footer with buttons */}
            <div className="mobile-footer d-flex sticky-page-footer deeplink-button position-absolute bottom-0 left-0 right-0 p-3 bg-white border-top">
              <button
                className="btn btn-outline-primary font-cooper-bt fz16 fw-500 mr-2"
                style={{ flex: 1 }}
                onClick={handleCancel}
                disabled={confirmLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-outline-primary font-cooper-bt fz16 fw-500"
                style={{ flex: 1 }}
                onClick={handleConfirm}
                disabled={confirmLoading}
              >
                {confirmLoading ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SendInterviewRequestConfirmPage;