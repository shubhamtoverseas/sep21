import React, { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import DatePicker from 'react-datepicker';

import backIconPage from "../../../../../assets/img/deep-link/back-page-icon.svg";
import starCalendarIcon from "../../../../../assets/img/deep-link/star-calendar.svg";
import arrowRight from "../../../../../assets/img/svg/arrow-right.svg";
import '../worker-detail-deeplink.css';
import { APP_URL } from "../../../../../services/apiPath";
import axios from "axios";
import NotFoundMessage from "../../../../../components/ReusableComponents/NotFoundMessage";
import CustomSpinner from "../../../../../components/ReusableComponents/CustomSpinner";
import { deepLinkAPIHeader } from "../../../../../services/commonService";
import InterviewDatePickerDay from "../../../../../components/Layout/schedule-interview/InterviewDatePickerDay";
import dayjs from "dayjs";

const SendInterviewRequestDatePage = () => {
  const navigate = useNavigate();
  // const [scheduledDates, setScheduledDates] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [holidayDates, setHolidayDates] = useState({});
  const [loading, setLoading] = useState(false);
  const [dateSlotsLoading, setDateSlotsLoading] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(new Date());

  const workerId = new URLSearchParams(window.location.search).get('worker_id');
  const token = new URLSearchParams(window.location.search).get('token');
  const jobId = new URLSearchParams(window.location.search).get('job_id');
  const employerId = new URLSearchParams(window.location.search).get('employer_id');

  // Function to convert holiday dates to Date objects
  const getHolidayDateObjects = useCallback(() => {
    const allHolidays = [
      ...(holidayDates.cs_holidays || []),
      ...(holidayDates.interpreter_holidays || [])
    ];
    
    return allHolidays.map(dateStr => new Date(dateStr));
  }, [holidayDates]);

  useEffect(() => {
    const fetchUpcomingInterviews = async () => {
      try {
        setLoading(true);
        const response = await axios.post(
          `${APP_URL}/get-deeplink-upcoming-interviews`,
          { job_id: jobId },
          {
            headers: deepLinkAPIHeader()
          }
        );
        setUpcomingInterviews(response?.data?.data || {});
      } catch (err) {
        console.error("Error fetching worker details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchUpcomingInterviews();
    }
  }, [jobId]);

  // Date slots are month-scoped on the backend (month is required), so refetch
  // whenever the visible calendar month changes
  useEffect(() => {
    const fetchInterviewDateSlots = async () => {
      try {
        setDateSlotsLoading(true);
        const response = await axios.post(
          `${APP_URL}/get-deeplink-interview-date-slots`,
          {
            worker_id: workerId,
            employer_id: employerId,
            job_id: jobId,
            month: visibleMonth.getMonth() + 1,
            year: visibleMonth.getFullYear()
          },
          {
            headers: deepLinkAPIHeader()
          }
        );
        if (response?.data?.data) {
          setHolidayDates(response.data.data);
        }
      } catch (err) {
        console.error("Error fetching date slots:", err);
      } finally {
        setDateSlotsLoading(false);
      }
    };

    if (workerId && employerId && jobId) {
      fetchInterviewDateSlots();
    }
  }, [jobId, workerId, employerId, visibleMonth]);

  const onChange = (date) => {
    const holidayDateObjects = getHolidayDateObjects();
    const isHoliday = holidayDateObjects.some(holidayDate => 
      holidayDate.toDateString() === date.toDateString()
    );
    
    const isPastDate = date < new Date().setHours(0, 0, 0, 0);
    
    if (!isHoliday && !isPastDate) {
      setStartDate(date);
    }
  }

  const handleNext = () => {
    if (!startDate) {
      alert("Please select a date");
      return;
    }

    // Check if selected date is a holiday
    const holidayDateObjects = getHolidayDateObjects();
    const isHoliday = holidayDateObjects.some(holidayDate => 
      holidayDate.toDateString() === startDate.toDateString()
    );
    
    if (isHoliday) {
      alert("Cannot schedule interview on a holiday. Please select another date.");
      return;
    }

    const formattedDate = dayjs(startDate).format("YYYY-MM-DD");

    navigate(`/job-stage-details/send-interview-request-time?worker_id=${workerId}&job_id=${jobId}&&employer_id=${employerId}&&token=${token}`, {
      state: {
        selectedDate: formattedDate
      }
    });
  };

  const handleBack = () => {
    window.history.back();
  };

  // Extract scheduled dates from upcoming interviews
  const scheduledInterviewDates = upcomingInterviews && upcomingInterviews.length > 0 
    ? upcomingInterviews.map(interview => new Date(interview.date))
    : [];

  return (
    <>
      <Helmet>
        <title>Send Interview Request - MaidMatch</title>
        <meta name="description" content="" />
      </Helmet>
      {loading || dateSlotsLoading ? <CustomSpinner /> :
        <div className="d-flex justify-content-center vh-100">
          <div className="mobile-banner-deeplink position-relative bg-white no-global-style">
            <div className="text-center interview_datecalandar vh-100 position-relative">
              <header className="text-center fw-500 d-flex justify-content-between font-cooper-bt fz20 mb-2">
                <img
                  src={backIconPage}
                  alt="back icon"
                  className="cursor-pointer"
                  onClick={handleBack}
                />
                <span>Send Interview Request</span>
                <span></span>
              </header>

              <div className="mobile-body-content">
                <DatePicker
                  selected={startDate}
                  onChange={onChange}
                  onMonthChange={(date) => setVisibleMonth(date)}
                  highlightDates={scheduledInterviewDates}
                  minDate={new Date()}
                  inline
                  renderDayContents={(day, date) => (
                    <InterviewDatePickerDay 
                      date={date} 
                      highlightDates={scheduledInterviewDates}
                      holidayDates={getHolidayDateObjects()}
                      minDate={new Date()}
                    />
                  )}
                />
                <hr className="my-3" />

                <div className="text-left">
                  <h3 className="fz19 font-cooper-bt">Upcoming Interviews</h3>
                </div>

                {upcomingInterviews.length === 0 ?
                  <NotFoundMessage message='Upcoming Interview' paddingClass={'p-3'} />
                  :
                  upcomingInterviews?.map((interview, index) => {
                    return <div key={index} className="interview-info d-flex py-2 cursor-pointer mb-3 border-0">
                      <img src={starCalendarIcon} alt="calendar icon" />
                      <div className="text-left ml-3">
                        <h6 className="mb-0 fz14 fw-500 grey89 font-mabry-pro">{dayjs(interview?.date).format("ddd, D MMM YYYY")}</h6>
                        <p className="mb-0 font-mabry-pro fz16 fw-400">
                          {interview?.booking_count} {interview?.booking_count > 1 ? 'interviews' : 'interview'} scheduled
                        </p>
                      </div>
                      <div className="right-arrow">
                        <img src={arrowRight} alt="arrow right icon" />
                      </div>
                    </div>
                  })
                }

                <hr className="my-3" />
              </div>

              <div className="mobile-footer sticky-page-footer deeplink-button position-absolute">
                <button
                  className="btn filled-btn w-100 font-cooper-bt fz16 fw-500"
                  onClick={handleNext}
                  disabled={!startDate}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </>
  );
};

export default SendInterviewRequestDatePage;