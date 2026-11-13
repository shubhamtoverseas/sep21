import React from "react";
import './home-page-banner.css';

const HomePageBanner = () => {
  return (
    <section className="banner-section d-flex align-items-center">
      <div className="custom-container">
        <div className="row">
          <div className="col-md-8 col-lg-6 col-xl-5">
            <div className="mb80 banner-text-wrapper">
              <h1 className="banner-title mb20">Let us find your match</h1>
              <p className="mb-0">
                <span className="banner-description mabry-pro">
                  <span className="fw-500">Dedicated experts</span>
                  <span className="fw-300">&nbsp;&&nbsp;</span>
                  <span className="fw-500">AI-powered</span>
                </span>
                <br />
                <span className="banner-description mabry-pro fw-300">matchmaking to find household help  <br />you can trust.</span>
              </p>
            </div>

            <button className="rounded-filled-btn-maidmatch">
              Get The App
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomePageBanner;