import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

import clappingVector from "../../../../../assets/img/deep-link/clapping-vector.svg";
import '../worker-detail-deeplink.css';

const SendInterviewRequestSuccessPage = () => {
  const workerId = new URLSearchParams(window.location.search).get('worker_id');
  const token = new URLSearchParams(window.location.search).get('token');
  const jobId = new URLSearchParams(window.location.search).get('job_id');
  const employerId = new URLSearchParams(window.location.search).get('employer_id');
  return (
    <>
      <Helmet>
        <title>Worker Detail - MaidMatch</title>
        <meta name="description" content="" />
      </Helmet>
      <div className="d-flex justify-content-center bg-blue vh-100 align-items-center">
        <div className="mobile-banner-deeplink position-relative no-global-style">
          <div className="m-3 bg-white am-interested-box text-center">
            <h4 className="fz22 font-cooper-bt mb-3">
              We’ll notify you once we confirm interview details with the candidate!
            </h4>
            <img src={clappingVector} alt="Clapping" className="mb-3" />
            <div className="deeplink-button">
              <Link to={'/job-stage-details/send-interview-request-detail'+'?worker_id=' + workerId + '&&job_id=' + jobId + '&&employer_id=' + employerId + '&&token=' + token} className="btn filled-btn w-100 mb-3 font-cooper-bt fz16 fw-500">
                Got It
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SendInterviewRequestSuccessPage;