import React from "react";
import { Helmet } from "react-helmet-async";

import clappingVector from "../../../../assets/img/deep-link/clapping-vector.svg";
import './worker-detail-deeplink.css';
import { Link } from "react-router-dom";

const IAmInterestedPage = () => {
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
      <div className="d-flex justify-content-center bg-blue vh-100 align-items-center z">
        <div className="mobile-banner-deeplink position-relative no-global-style">
          <div className="m-3 bg-white am-interested-box text-center">
            <h4 className="fz22 font-cooper-bt mb-3">
              The good ones go fast! Schedule an interview now. We’ll handle the rest.
            </h4>
            <img src={clappingVector} alt="Clapping" className="mb-3" />
            <div className="deeplink-button">
              <Link to={'/job-stage-details/send-interview-request-date'+'?worker_id=' + workerId + '&&job_id=' + jobId + '&&employer_id=' + employerId + '&&token=' + token} className="btn filled-btn w-100 mb-3 font-cooper-bt fz16 fw-500">
                Schedule Interview
              </Link>
              <Link to={'/job-stage-details'+'?worker_id=' + workerId + '&&job_id=' + jobId + '&&token=' + token} className="btn btn-link w-100 font-cooper-bt fz16 fw-500">Schedule Later</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default IAmInterestedPage;