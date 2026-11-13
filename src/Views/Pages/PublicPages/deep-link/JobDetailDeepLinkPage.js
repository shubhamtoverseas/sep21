import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import axios from "axios";

import jobDetailBgYellow from "../../../../assets/img/deep-link/job-detail-bg-yellow.svg";
import profile from "../../../../assets/img/nouser.jpeg";
import { deepLinkAPIHeader } from "../../../../services/commonService";
import './worker-detail-deeplink.css';
import { APP_URL } from "../../../../services/apiPath";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";

const JobDetailDeepLinkPage = () => {
  const [jobDetail, setJobDetail] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const jobId = new URLSearchParams(window.location.search).get('job_id');

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${APP_URL}/job-detail/${jobId}`,
          {
            headers: deepLinkAPIHeader()
          }
        );
        setJobDetail(response?.data?.data || {});
      } catch (err) {
        setError(err.message);
        console.error("Error fetching job details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const formatStartDate = () => {
    if (jobDetail.asap === 1) return "ASAP";
    if (jobDetail.start_date) {
      const date = new Date(jobDetail.start_date);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
    }
    if (jobDetail.flexible_start_date) {
      return `Flexible (${jobDetail.flexible_start_date.name})`;
    }
    return "To be discussed";
  };

  // Helper function to format languages
  const formatLanguages = () => {
    if (jobDetail.spoken_language_info && jobDetail.spoken_language_info.length > 0) {
      return jobDetail.spoken_language_info.map(lang => lang.name).join(', ');
    }
    return "Not specified";
  };

  const formatSalary = () => {
    let salaryText = "";
    let isNegotiable = false;
    
    // Determine base salary text
    if (jobDetail.fixed_salary && jobDetail.fixed_salary > 0) {
      salaryText = `${jobDetail.fixed_salary.toLocaleString()}`;
      isNegotiable = jobDetail.higher_salary === 1;
    } else if (jobDetail.min_salary && jobDetail.max_salary && jobDetail.min_salary > 0 && jobDetail.max_salary > 0) {
      salaryText = `${jobDetail.min_salary.toLocaleString()} - ${jobDetail.max_salary.toLocaleString()}`;
      isNegotiable = jobDetail.higher_salary === 1;
    } else if (jobDetail.expected_salary) {
      return jobDetail.expected_salary.name;
    } else {
      return "To be discussed";
    }
    
    if (isNegotiable) {
      salaryText += " (Negotiable)";
    }
    
    return salaryText;
  };

  const hasPerformanceBonus = () => {
    if (jobDetail.salary_bonus === 0) {
      return false;
    }
    return jobDetail.salary_bonus && jobDetail.salary_bonus > 0;
  };

  if (loading) {
    return <CustomSpinner />
  }

  if (error) {
    return <div className="d-flex justify-content-center">Error: {error}</div>;
  }

  return (
    <>
      <Helmet>
        <title>Job Detail - MaidMatch</title>
        <meta name="description" content={jobDetail.head_line || "Job Detail"} />
      </Helmet>
      <div className="d-flex justify-content-center">
        <div className="mobile-banner-deeplink job-detail-deeplink position-relative bg-white no-global-style">
          <div className="profilecard_Banner">
            <img src={jobDetailBgYellow} className="topBanner w-100 position-absolute" style={{ top: '0', left: '0', right: '0' }} alt="background image" />
            <div className="profile_cardouter position-relative" style={{ top: "88px" }}>
              <div className="profile_card ">
                <div className="text-center pl20 pr20">
                  <figure
                    className="worker-profile-img"
                    style={{
                      backgroundImage: `url(${jobDetail?.skills_info?.[0]?.color_image ? jobDetail.skills_info[0].color_image : (jobDetail?.image ? jobDetail.image : profile)})`
                    }}
                  />
                  <div className="text-center title-desc-wrapper">
                    <h4 className="font-cooper-bt fz24 fw-500 mb-1">
                      {jobDetail?.head_line}
                    </h4>
                    <p className="mb-1 font-mabry-pro">
                      {jobDetail?.employer_details?.nationality_info?.name || "Hong Kong"}, {jobDetail?.employer_details?.location_info?.name || "Hong Kong"}
                    </p>
                    <span className="font-mabry-pro fz16 fw-500 grey89">
                      {jobDetail?.employer_details?.district_info?.name || "District"} 
                      {jobDetail?.employer_details?.house_size && ` ${jobDetail.employer_details.house_size} sq. ft.`}
                    </span>
                  </div>
                </div>
                <hr className="mt24 mb24" />
                <div className="detailRow pl20 pr20 bg-white font-mabry-pro">
                  <div className="jobDescBlock mb24">
                    <h4 className="grey3 fz18 fw-400 mb16">Job Description</h4>
                    <p className="fz16 fw-400 lh-22">
                      {jobDetail?.job_description_english || jobDetail?.detailed_description || ""}
                    </p>
                  </div>
                  {jobDetail?.skills_info && jobDetail.skills_info.length > 0 && (
                    <div className="dutiesBlock mb24">
                      <h4 className="grey3 fz18 fw-400 mb16">Main Duties</h4>
                      <div className="form-row">
                        {jobDetail.skills_info.map((skill) => (
                          <div key={skill.id} className="mb-2 col-auto">
                            <div className="skill-box text-center d-flex align-items-center justify-content-center mr4">
                              <img src={skill.color_image} className="mr-1" width={30} height={30} alt={skill.name} />
                              <p className="fz16 fw-400 mb-0">{skill.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="row mb24">
                    <div className="col-12 col-md-6">
                      <h4 className="grey3 fz20 fw-400">Salary</h4>
                    </div>
                    <div className="col-12 col-md-6">
                      <p className="fz16 fw-400 lh-25 mb-0">
                         {formatSalary()}
                        {hasPerformanceBonus() && (
                          <span className="d-block mt-1">+ Performance Bonus</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="row mb24">
                    <div className="col-12 col-md-6">
                      <h4 className="grey3 fz20 fw-400">Can Start</h4>
                    </div>
                    <div className="col-12 col-md-6">
                      <p className="fz16 fw-400 lh-25 mb-0">{formatStartDate()}</p>
                    </div>
                  </div>
                  <div className="row mb24">
                    <div className="col-12 col-md-6">
                      <h4 className="grey3 fz20 fw-400">Language</h4>
                    </div>
                    <div className="col-12 col-md-6">
                      <p className="fz16 fw-400 lh-25 mb-0">{formatLanguages()}</p>
                    </div>
                  </div>
                  {jobDetail?.responsibilities_info && jobDetail.responsibilities_info.length > 0 && (
                    <div className="dutiesBlock mb24">
                      <h4 className="grey3 fz18 fw-400 mb16">Other Responsibilities</h4>
                      <div className="form-row">
                        {jobDetail.responsibilities_info.map((responsibility) => (
                          <div key={responsibility.id} className="mb-2 col-auto">
                            <div className="skill-box text-center d-flex align-items-center justify-content-center mr4">
                              <p className="fz16 fw-400 mb-0">{responsibility.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="row mb24">
                    <div className="col-12 col-md-6">
                      <h4 className="grey3 fz20 fw-400">Accommodation</h4>
                    </div>
                    <div className="col-12 col-md-6">
                      <p className="fz16 fw-400 lh-25 mb-0">
                        {jobDetail?.helper_accommadation?.name || "To be discussed"}
                      </p>
                    </div>
                  </div>
                  <div className="row mb24">
                    <div className="col-12 col-md-6">
                      <h4 className="grey3 fz20 fw-400">Coworker</h4>
                    </div>
                    <div className="col-12 col-md-6">
                      <p className="fz16 fw-400 lh-25 mb-0">
                        {jobDetail?.coworker_status === 1 ? 
                          `Yes${jobDetail?.co_worker_count > 0 ? ` (${jobDetail.co_worker_count})` : ''}` : 
                          'No'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="row pb24">
                    <div className="col-12 col-md-6">
                      <h4 className="grey3 fz20 fw-400">Day Off</h4>
                    </div>
                    <div className="col-12 col-md-6">
                      <p className="fz16 fw-400 lh-25 mb-0">
                        {jobDetail?.day_off?.name || "To be discussed"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default JobDetailDeepLinkPage;