import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import workerProfileBgPink from "../../../../assets/img/svg/worker-profile-bg-pink.svg";
import educationVector from "../../../../assets/img/deep-link/education-vector.svg";
import courseWorkVector from "../../../../assets/img/deep-link/coursework-vector.svg";
import profile from "../../../../assets/img/nouser.jpeg";
import tickOfMobile from "../../../../assets/img/svg/tick-of-mobile.svg";
import crossOfMobile from "../../../../assets/img/svg/cross-of-mobile.svg";
import experienceBagVector from "../../../../assets/img/deep-link/experience-bag.svg";
import startCalendarVector from "../../../../assets/img/deep-link/star-calendar.svg";
import locationVector from "../../../../assets/img/deep-link/location-vector.svg";
import experienceIcon from "../../../../assets/img/experience-bag-icon.png";
import { deepLinkAPIHeader, getExperienceDetails, getFamilyDetails, getUserProfileDetails } from "../../../../services/commonService";
import UserDetailsSection from "../../../../components/Layout/Jobs/UserDetailSection";
import './worker-detail-deeplink.css';
import { APP_URL } from "../../../../services/apiPath";
import WorkerSkillCollapsibleView from "../../../../components/worker/worker-skill-collapsible-view/WorkerSkillCollapsibleView";
import DetailItem from "../../Employer/employer-details/basic-details/DetailItem";
import RemoveApplicantPopup from "./RemoveApplicantPopup";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import SendInterviewRequestDetailPage from "./send-interview-request/SendInterviewRequestDetailPage";
import dayjs from "dayjs";

const WorkerDetailDeepLinkPage = () => {
  const [workerDetail, setWorkerDetail] = useState({});
  const [jobStageDetail, setJobStageDetail] = useState({});
  const [interviewDetail, setInterviewDetail] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [isRemoveApplicantPopupOpen, setIsRemoveApplicantPopupOpen] = useState(false);
  const [error, setError] = useState(null);

  const expandedProfileBabyCare = [
    { label: 'Experienced In', value: workerDetail?.child_care_duty_ids_info?.map((col) => col.name).join(", ") },
    { label: 'Has Cared For', value: workerDetail?.child_care_age_ids_info?.map((col) => col.name).join(", ") },
  ];

  const expandedProfileElderlyCare = [
    { label: 'Experienced In', value: workerDetail?.elderly_care_duty_ids_info?.map((col) => col.name).join(", ") },
    { label: 'Has Cared For', value: workerDetail?.age_of_elder ? workerDetail?.age_of_elder + 'yr old' : '' },
  ];

  const expandedProfileHouseChores = [
    { label: 'Experienced In', value: workerDetail?.household_chores_id_info?.map((col) => col.name).join(", ") },
  ];

  const token = new URLSearchParams(window.location.search).get('token');
  const workerId = new URLSearchParams(window.location.search).get('worker_id');
  const jobId = new URLSearchParams(window.location.search).get('job_id');
  const employerId = new URLSearchParams(window.location.search).get('employer_id');
  const pageType = new URLSearchParams(window.location.search).get('page_type');

  useEffect(() => {
    const fetchWorkerDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${ APP_URL }/job-stage-detail?token=${ token }`,
          {
            headers: deepLinkAPIHeader()
          }
        );
        setWorkerDetail(response?.data?.data?.worker_details || {});
        setJobStageDetail(response?.data?.data?.job_stage_details || {});
        setInterviewDetail(response?.data?.data?.interview_details || {});
      } catch (err) {
        setError(err.message);
        console.error("Error fetching worker details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchWorkerDetails();
    } else {
      setLoading(false);
      setError("This link is missing its access token. Please use the original link you were sent.");
    }
  }, [token]);

  const interviewStages = ['interview_completed', 'interview_pending', 'interview_cancelled', 'interview_upcoming'];
  const shouldShowInterviewPage = interviewStages.includes(jobStageDetail?.stage_key) && !pageType;

  if (loading) {
    return <CustomSpinner />
  }

  if (error) {
    return <div className="d-flex justify-content-center">Error: { error }</div>;
  }

  // Conditionally render SendInterviewRequestDetailPage
  if (shouldShowInterviewPage) {
    return <SendInterviewRequestDetailPage
      jobStageDetail={ jobStageDetail }
      workerDetail={ workerDetail }
      interviewDetail={ interviewDetail }
    />;
  }

  const onChangeStageStatus = async () => {
    setLoading(true);

    let payload = {
      job_stage_id: jobStageDetail?.id,
      status: 'accept',
    };

    try {
      const response = await axios.post(
        `${ APP_URL }/change-job-stage-status`,
        payload,
        {
          headers: deepLinkAPIHeader()
        }
      );
      if (response?.data?.status) {
        console.log('Job stage status changed successfully');
        ShowToast('Success', response?.data?.message || 'Operation successful');
        navigate(`/job-stage-details/worker-interested?worker_id=${ workerId }&&job_id=${ jobId }&&employer_id=${ employerId }&&token=${ token }`);
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
    <>
      <Helmet>
        <title>Worker Detail - MaidMatch</title>
        <meta name="description" content="" />
      </Helmet>
      <div className="d-flex justify-content-center">
        {
          isRemoveApplicantPopupOpen && <RemoveApplicantPopup
            title="Remove Applicant"
            description="Once removed, they will no longer appear as a potential match."
            jobStageId={ jobStageDetail?.id }
            onClose={ () => setIsRemoveApplicantPopupOpen(false) }
            handleConfirmation={ () => {
              setIsRemoveApplicantPopupOpen(false);
            } }
          />
        }

        <div className="mobile-banner-deeplink position-relative bg-white no-global-style">
          <div className="profilecard_Banner">
            <img src={ workerProfileBgPink } className="topBanner w-100 position-absolute" style={ { top: '0', left: '0', right: '0' } } alt="background image" />
            <div className="profile_cardouter position-relative" style={ { top: "88px" } }>
              <div className="profile_card">
                <div className="text-center pl20 pr20">
                  <figure
                    className="worker-profile-img"
                    style={ {
                      backgroundImage: `url(${ workerDetail?.image ? workerDetail?.image : profile
                        })`
                    } }
                  />
                  <div className="text-center title-desc-wrapper">
                    <h4 className="font-cooper-bt fz28 mb-1">{ workerDetail?.fullname }</h4>
                    <p className="mb-0 font-mabry-pro grey89">
                      { workerDetail?.age }, { workerDetail?.nationality?.name }
                    </p>
                  </div>

                  <div className="form-row">
                    <div className="col-4 d-flex flex-column align-items-center font-mabry-pro">
                      <img src={ experienceBagVector } alt="" className="mb-2" />
                      <span className="fz14 grey89">Experience</span>
                      <h4 className="fz16 fw-400 black"> { workerDetail?.work_experience } Years</h4>
                    </div>
                    <div className="col-4 d-flex flex-column align-items-center font-mabry-pro">
                      <img src={ startCalendarVector } alt="" className="mb-2" />
                      <span className="fz14 grey89">Can Start</span>
                      <h4 className="fz16 fw-400 black">
                        { workerDetail?.start_date ? dayjs(workerDetail.start_date).format("DD MMM YYYY") : 'Not specified' }
                      </h4>
                    </div>
                    <div className="col-4 d-flex flex-column align-items-center font-mabry-pro">
                      <img src={ locationVector } alt="" className="mb-2" />
                      <span className="fz14 grey89">Location</span>{ " " }
                      <h4 className="fz16 fw-400 black">
                        { workerDetail?.current_location?.name || 'Not specified' }
                      </h4>
                    </div>
                  </div>
                </div>
              </div>
              <div className="detailRow pl20 pr20 bg-white">
                <hr className="mt-3 mb-4" />
                <UserDetailsSection title="Profile" details={ getUserProfileDetails(workerDetail) } />
                <UserDetailsSection title="Family Background" details={ getFamilyDetails(workerDetail) } />
                <div className="educationBlock mb40">
                  <h4 className="grey89 fz20 fw-400 mb16 font-mabry-pro">
                    Education
                  </h4>
                  <ul className="educationList">
                    <li className="mb-0">
                      <img src={ educationVector } alt="Education" className="mt-1 mr10" />
                      <div className="userdetailinner_content">
                        <span>Education Level</span>{ " " }
                        <h4 className="black">
                          { workerDetail?.education?.name || "Not specified" }
                        </h4>
                      </div>
                    </li>
                    <li>
                      <img src={ courseWorkVector } alt="Special Course" className="mt-1 mr10" />
                      <div className="userdetailinner_content">
                        <span>Special Coursework</span>
                        { workerDetail?.special_course_info && workerDetail.special_course_info.length > 0 ? (
                          <h4 className="black">
                            { workerDetail.special_course_info.map((item) => item?.name).join(", ") }
                          </h4>
                        ) : (
                          <h4 className="black">Not specified</h4>
                        ) }
                      </div>
                    </li>
                  </ul>
                </div>
                <div className="languageBlock mb40">
                  <h4 className="grey89 fz20 fw-400 mb12 font-mabry-pro">
                    Language
                  </h4>
                  { workerDetail?.language_info && workerDetail.language_info.length > 0 ? (
                    workerDetail.language_info.map(item => item.name).join(", ")
                  ) : (
                    "Not specified"
                  ) }
                </div>
                <div className="mainSkills mb40">
                  <h4 className="grey89 fz20 fw-400 mb16 font-mabry-pro">
                    Main Skills
                  </h4>
                  <div className="form-row">
                    { workerDetail?.skills_info && workerDetail.skills_info.length > 0 ? (
                      workerDetail.skills_info.map((skill) => {
                        let name = "";
                        let age = '';

                        if (skill?.name) {
                          const [parsedName, agePart] = skill.name.split("|").map(part => part.trim());
                          name = parsedName;
                          age = agePart || '';
                        }

                        return (
                          <div
                            key={ skill.id }
                            className="mb-2 col-4"
                          >
                            <div className="skill-box text-center d-flex flex-column align-items-center justify-content-center">
                              <img src={ skill?.color_image } className="w42 h42" alt={ name || 'Skill' } />
                              <p className="fz14 fw-400 mb-0">{ name }</p>
                              <span className="fz10 fw-700 grey9b">{ age }</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-12">No skills specified</div>
                    ) }
                  </div>
                </div>

                <div className="cookingBlock mb40">
                  <h4 className="grey89 fz20 fw-400 mb16 font-mabry-pro">
                    Cooking
                  </h4>
                  { workerDetail?.cooking_info && workerDetail.cooking_info.length > 0 ? (
                    workerDetail.cooking_info.map(item => item.name).join(", ")
                  ) : (
                    "Not specified"
                  ) }
                </div>
                <div className="educationBlock workExperience">
                  <h4 className="grey89 fz20 fw-400 mb16 font-mabry-pro">
                    Work Experience
                  </h4>
                  { workerDetail?.experience && workerDetail.experience.length > 0 ? (
                    workerDetail.experience.map((experience) => {
                      const experienceDetails = getExperienceDetails(experience);
                      return (
                        <div className="d-flex" key={ experience.id }>
                          <div className="mr8">
                            <img src={ experienceIcon } alt="Experience Icon" />
                          </div>
                          <div>
                            <h4 className="fz16 fw-500 mb-0">
                              { (experience?.worker_role_info?.name || 'Domestic Helper') },{ " " }
                              { (experience?.work_country_info?.name || 'Unknown Country') }
                            </h4>
                            <p className="grey89 mb-3 fw-500">
                              { experience.start_date
                                ? dayjs(experience.start_date).format("MMMM YYYY")
                                : 'Unknown Start Date' }{ " " }
                              -{ " " }
                              { experience.end_date
                                ? dayjs(experience.end_date).format("MMMM YYYY")
                                : 'Present' }
                            </p>
                            <UserDetailsSection title="" details={ experienceDetails } marginBottom="marginbottom40" />
                            <div className="mb40">
                              <p className="grey89 fz10 fw-500 mb4 text-uppercase">Main Duties</p>
                              <div className="d-flex flex-wrap gap-2 mb-3">
                                { experience.duty && experience.duty.length > 0 ? (
                                  experience.duty.map((duty) => {
                                    let dutyName = "";
                                    let dutyAge = '';
                                    if (duty && duty.duty && duty.duty.name) {
                                      const [parsedName, agePart] = duty.duty.name.split("|").map((part) => part.trim());
                                      dutyName = parsedName;
                                      dutyAge = agePart || '';
                                    }

                                    return (
                                      <div
                                        key={ duty.id }
                                        className="duty-badge bg-light text-dark bg-white mb4 d-flex align-items-center mr-3"
                                      >
                                        <img
                                          src={ duty?.duty?.color_image }
                                          alt={ duty?.duty?.name || 'Duty Icon' }
                                          className="mr10 w30 h30"
                                        />
                                        <span className="fz16 fw-400 black mr10">
                                          { dutyName }
                                        </span>
                                        <span className="fz10 fw-700">{ dutyAge }</span>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="duty-badge bg-light text-dark px-3 py-2 mb4 d-flex align-items-center">
                                    <span className="fw-400 black">No Duties Specified</span>
                                  </div>
                                ) }
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div>No work experience specified</div>
                  ) }
                </div>
                <div className="expectations">
                  <h4 className="grey89 fz20 fw-400 mb16 font-mabry-pro">Expectations</h4>

                  <div className="d-flex justify-content-between mb16">
                    <span className="fw-400 black">Take Care of Newborn Baby</span>
                    <img
                      src={ workerDetail?.care_newborn ? tickOfMobile : crossOfMobile }
                      alt={ workerDetail?.care_newborn ? "Yes" : "No" }
                    />
                  </div>
                  <div className="d-flex justify-content-between mb16">
                    <span className="fw-400 black">Willing to Share Room</span>
                    <img
                      src={ workerDetail?.share_room ? tickOfMobile : crossOfMobile }
                      alt={ workerDetail?.share_room ? "Yes" : "No" }
                    />
                  </div>
                  <div className="d-flex justify-content-between mb16">
                    <span className="fw-400 black">Co-worker</span>
                    <img
                      src={ workerDetail?.share_work ? tickOfMobile : crossOfMobile }
                      alt={ workerDetail?.share_work ? "Yes" : "No" }
                    />
                  </div>
                  <div className="d-flex justify-content-between mb16">
                    <span className="fw-400 black">Saturday Off</span>
                    <img
                      src={ workerDetail?.day_off === 2 ? tickOfMobile : crossOfMobile }
                      alt={ workerDetail?.day_off === 2 ? "Yes" : "No" }
                    />
                  </div>
                </div>
                <hr className="mt20 mb20" />
                <div className="expectations">
                  <h4 className="grey89 fz20 fw-400 mb16 font-mabry-pro">Expanded Profile</h4>

                  <WorkerSkillCollapsibleView
                    isDescCollapsed={ true }
                    heading='Baby Care'
                    headingClasses='fz16 fw-400 black text-uppercase'
                  >
                    <div className="row">
                      { expandedProfileBabyCare && expandedProfileBabyCare.length > 0 ? (
                        expandedProfileBabyCare.map((item, index) => (
                          <DetailItem
                            key={ index }
                            title={ item.label }
                            desc={ item.value || '' }
                            columnSize="col-md-6 col-6 mb24"
                          />
                        ))
                      ) : '' }
                    </div>
                  </WorkerSkillCollapsibleView>
                  <hr className="mt10 mb10" />
                  <WorkerSkillCollapsibleView
                    isDescCollapsed={ true }
                    heading='Elderly Care'
                    headingClasses='fz16 fw-400 black text-uppercase'
                  >
                    <div className="row">
                      { expandedProfileElderlyCare && expandedProfileElderlyCare.length > 0 ? (
                        expandedProfileElderlyCare.map((item, index) => (
                          <DetailItem
                            key={ index }
                            title={ item.label }
                            desc={ item.value || '' }
                            columnSize="col-md-6 col-6 mb24"
                          />
                        ))
                      ) : '' }
                    </div>
                  </WorkerSkillCollapsibleView>

                  <hr className="mt10 mb10" />
                  <WorkerSkillCollapsibleView
                    isDescCollapsed={ true }
                    heading='Household Chores'
                    headingClasses='fz16 fw-400 black text-uppercase'
                  >
                    <div className="row">
                      { expandedProfileHouseChores && expandedProfileHouseChores.length > 0 ? (
                        expandedProfileHouseChores.map((item, index) => (
                          <DetailItem
                            key={ index }
                            title={ item.label }
                            desc={ item.value || '' }
                            columnSize="col-md-6 col-6 mb24"
                          />
                        ))
                      ) : '' }
                    </div>
                  </WorkerSkillCollapsibleView>
                </div>
                <hr className="mt20 mb20" />
                {/* interview_completed, interview_pending, interview_cancelled, interview_upcoming */ }
                <p className="fz15 black medium pb-3">
                  Reference Letter{ " " }
                  { workerDetail?.reference_letter === 1 ? 'Available' : '' }
                </p>

                <div className="deeplink-button pb-3">
                  { jobStageDetail?.stage_key === 'invited' && <div className="blue-info-badge text-center font-mabry-pro">
                    This worker is already invited to apply for the job offer.
                  </div>
                  }

                  { jobStageDetail?.stage_key === 'suggested' && <div className="blue-info-badge text-center font-mabry-pro">
                    This worker is already suggested to apply for the job offer.
                  </div>
                  }

                  { jobStageDetail?.stage_key === 'applied_after_suggested' && <>
                    <button onClick={ onChangeStageStatus } className="btn filled-btn w-100 mb-3 font-cooper-bt fz16 fw-500">
                      I&lsquo;m Interested
                    </button>
                    <button onClick={ () => setIsRemoveApplicantPopupOpen(true) } className="btn btn-outline-primary w-100 font-cooper-bt fz16 fw-500">Decline</button>
                  </>
                  }

                  { jobStageDetail?.stage_key === 'applied' && <>
                    <button onClick={ onChangeStageStatus } className="btn filled-btn w-100 mb-3 font-cooper-bt fz16 fw-500">
                      I&lsquo;m Interested
                    </button>
                    <button onClick={ () => setIsRemoveApplicantPopupOpen(true) } className="btn btn-outline-primary w-100 font-cooper-bt fz16 fw-500">Remove Applicant</button>
                  </>
                  }

                  { jobStageDetail?.stage_key === 'not_interested' && <>
                    <button onClick={ onChangeStageStatus } className="btn filled-btn w-100 mb-3 font-cooper-bt fz16 fw-500">
                      I&lsquo;m Interested
                    </button>
                  </>
                  }

                  { jobStageDetail?.stage_key === 'matched' && <>
                    <Link className="btn filled-btn w-100 mb-3 font-cooper-bt fz16 fw-500"
                      to={ '/job-stage-details/send-interview-request-date' + '?worker_id=' + workerId + '&&job_id=' + jobId + '&&employer_id=' + employerId + '&&token=' + token }>
                      Schedule Interview
                    </Link>
                  </>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WorkerDetailDeepLinkPage;