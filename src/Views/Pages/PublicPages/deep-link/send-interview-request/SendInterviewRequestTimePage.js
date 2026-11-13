import React, { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

import backIconPage from "../../../../../assets/img/deep-link/back-page-icon.svg";
import '../worker-detail-deeplink.css';
import TimeSlotSelector from "../../../../../components/Layout/schedule-interview/TimeSlotSelector";
import { APP_URL } from "../../../../../services/apiPath";
import CustomSpinner from "../../../../../components/ReusableComponents/CustomSpinner";
import { deepLinkAPIHeader } from "../../../../../services/commonService";

const SendInterviewRequestTimePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get data from previous screen
  const { selectedDate } = location.state || {};
  const workerId = new URLSearchParams(window.location.search).get('worker_id');
  const token = new URLSearchParams(window.location.search).get('token');
  const jobId = new URLSearchParams(window.location.search).get('job_id');
  const employerId = new URLSearchParams(window.location.search).get('employer_id');
  

  const fetchTimeSlots = useCallback(async (date) => {
    if (!date) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const requestPayload = {
        type: "employer",
        worker_id: workerId,
        employer_id: employerId,
        interview_date: date,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const response = await axios.post(`${APP_URL}/get-deeplink-interview-slots`, requestPayload, {
        headers: deepLinkAPIHeader()
      });
      setTimeSlots(response?.data?.data || []);
    } catch (err) {
      console.error('Error fetching time slots:', err);
      setError('Failed to fetch available time slots. Please try again.');
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  }, [workerId, employerId]);

  useEffect(() => {
    if (selectedDate) {
      fetchTimeSlots(selectedDate);
    }
  }, [selectedDate, fetchTimeSlots]);

  const handleSlotSelection = (slot) => {
    setSelectedTimeSlot(slot);
  };

  const handleNext = () => {
    if (!selectedTimeSlot) {
      alert("Please select a time slot");
      return;
    }

    // Extract time from selected slot and format it properly
    let formattedTime;
    if (typeof selectedTimeSlot === 'object') {
      // Handle different possible object structures
      formattedTime = selectedTimeSlot.slot || selectedTimeSlot.time || selectedTimeSlot.start_time || selectedTimeSlot.label;
      
      // If it's still an object, try to extract a readable format
      if (typeof formattedTime === 'object') {
        formattedTime = Object.values(selectedTimeSlot)[0] || 'Selected Time';
      }
    } else {
      formattedTime = selectedTimeSlot;
    }
    
    // Navigate to location page with accumulated data
    navigate(`/job-stage-details/send-interview-request-location?worker_id=${workerId}&job_id=${jobId}&employer_id=${employerId}&token=${token}`, {
      state: {
        selectedDate,
        selectedTime: formattedTime,
        selectedTimeSlot: selectedTimeSlot, 
      }
    });
  };

  const handleBack = () => {
    navigate(`/job-stage-details/send-interview-request-date?worker_id=${workerId}&job_id=${jobId}&employer_id=${employerId}&token=${token}`);
  };

  const handleRetry = () => {
    fetchTimeSlots(selectedDate);
  };

  if (!selectedDate) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <p>No date selected. Please go back and select a date.</p>
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
              
              {loading && (
                <CustomSpinner />
              )}

              {error && (
                <div className="alert alert-danger" role="alert">
                  <p className="mb-2">{error}</p>
                  <button 
                    className="btn btn-sm btn-outline-danger"
                    onClick={handleRetry}
                  >
                    Retry
                  </button>
                </div>
              )}

              {!loading && !error && (
                <TimeSlotSelector 
                  selectedDate={new Date(selectedDate)} 
                  interviewTimeSlots={timeSlots}
                  handleSelectedTimeSlot={handleSlotSelection}
                />
              )}

              <hr className="my-3" />
            </div>
            
            <div className="mobile-footer sticky-page-footer deeplink-button position-absolute">
              <button 
                className="btn filled-btn w-100 font-cooper-bt fz16 fw-500"
                onClick={handleNext}
                disabled={loading || !selectedTimeSlot}
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

export default SendInterviewRequestTimePage;