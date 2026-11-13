import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation } from "react-router-dom";

import backIconPage from "../../../../../assets/img/deep-link/back-page-icon.svg";
import videoInterviewIcon from "../../../../../assets/img/deep-link/video-interview-icon.svg";
import officeInterviewIcon from "../../../../../assets/img/deep-link/office-interview-icon.svg";
import '../worker-detail-deeplink.css';

const SendInterviewRequestLocationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [interviewType, setInterviewType] = useState(null);

  const { selectedDate, selectedTime } = location.state || {};
  const workerId = new URLSearchParams(window.location.search).get('worker_id');
  const token = new URLSearchParams(window.location.search).get('token');
  const jobId = new URLSearchParams(window.location.search).get('job_id');
  const employerId = new URLSearchParams(window.location.search).get('employer_id');
  

  const handleInterviewTypeChange = (type) => {
    setInterviewType(type);
  };

  const handleNext = () => {
    if (!interviewType) {
      alert("Please select an interview type");
      return;
    }

    // Navigate to confirm page with all accumulated data
    navigate(`/job-stage-details/send-interview-request-confirm?worker_id=${workerId}&job_id=${jobId}&employer_id=${employerId}&token=${token}`, {
      state: {
        selectedDate,
        selectedTime,
        interviewType,
      }
    });
  };

  const handleBack = () => {
    navigate(`/job-stage-details/send-interview-request-time?worker_id=${workerId}&job_id=${jobId}&employer_id=${employerId}&token=${token}`, {
      state: {
        selectedDate,
        selectedTime,
        workerId: workerId,
        jobId: jobId,
        employerId: employerId
      }
    });
  };

  if (!selectedDate || !selectedTime) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <p>Missing date or time information. Please start from the beginning.</p>
          <button className="btn btn-primary" onClick={handleBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Send Interview Request - MaidMatch</title>
        <meta name="description" content="" />
      </Helmet>
      <div className="d-flex justify-content-center vh-100">
        <div className="mobile-banner-deeplink position-relative bg-white no-global-style">
          <div className="text-center interview_datecalandar vh-100 position-relative">
            <header className="text-center fw-500 d-flex justify-content-between font-cooper-bt fz20 mb-2">
              <img 
                src={backIconPage} 
                alt="Back Icon" width={12} height={20}
                className="cursor-pointer" 
                onClick={handleBack}
              />
              <span>Send Interview Request</span>
              <span></span>
            </header>
            
            <div className="mobile-body-content">
              {/* <div className="mb-3">
                <p className="text-left font-mabry-pro fz16 grey89">
                  Selected Date: <strong>{selectedDate}</strong>
                </p>
                <p className="text-left font-mabry-pro fz16 grey89">
                  Selected Time: <strong>{selectedTime}</strong>
                </p>
              </div> */}

              <div className="interview-question-wrapper mt20">
                <div className="form-check w-100 mb20 percent_radio p-0">
                  <input
                    className="form-check-input d-none"
                    type="radio"
                    name="interviewType"
                    id="videoInterview"
                    value="1"
                    checked={interviewType === 1}
                    onChange={() => handleInterviewTypeChange(1)}
                  />
                  <label className="form-check-label" htmlFor="videoInterview">
                    <img src={videoInterviewIcon} className="mr10" />
                    <div className="text-left">
                      <span className="d-block w-100 fz20 lh-26 font-cooper-bt medium mb10">
                        Video Interview
                      </span>
                      <span className="fz16 regular d-block w-100 grey89 font-mabry-pro" style={{ maxWidth: '205px' }}>
                        Interview remotely by video or phone
                      </span>
                    </div>
                  </label>
                </div>
                
                <div className="form-check w-100 mb20 percent_radio p-0">
                  <input
                    className="form-check-input d-none"
                    type="radio"
                    name="interviewType"
                    id="officeInterview"
                    value="2"
                    checked={interviewType === 2}
                    onChange={() => handleInterviewTypeChange(2)}
                  />
                  <label className="form-check-label" htmlFor="officeInterview">
                    <img src={officeInterviewIcon} className="mr10" />
                    <div className="text-left">
                      <span className="d-block w-100 fz20 lh-26 font-cooper-bt medium mb10">
                        Office Interview
                      </span>
                      <span className="fz16 regular d-block w-100 grey89 font-mabry-pro" style={{ maxWidth: '205px' }}>
                        Interview at one of our office locations
                      </span>
                    </div>
                  </label>
                </div>
              </div>
              <hr className="my-3" />
            </div>
            
            <div className="mobile-footer sticky-page-footer deeplink-button position-absolute">
              <button 
                className="btn filled-btn w-100 font-cooper-bt fz16 fw-500"
                onClick={handleNext}
                disabled={!interviewType}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SendInterviewRequestLocationPage;