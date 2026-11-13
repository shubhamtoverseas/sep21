import React from "react";
import logoAppIcon from "../../../assets/img/logo-appicon.png";
import logoMaidMatch from "../../../assets/img/maidmatch-logo.svg";
import appStore from "../../../assets/img/app-store.svg";
import playStore from "../../../assets/img/play-store.svg";
import './home-page-footer.css';
import routes from "../../../Views/Pages/routes/routesConfig";

const HomePageFooter = () => {
  return (
    <footer className="footer-section h-100 wrap-div">
      <div className="d-sm-flex align-items-center justify-content-end mb-3">
        <div className="app-download-buttons">
          <div className="d-sm-flex">
            <img src={appStore} alt="Icon" className="mr12" />
            <img src={playStore} alt="Icon" />
          </div>
        </div>
      </div>
      <div className="row align-items-center">
        <div className="mb-3 mb-sm-0 col-3">
          <img src={logoAppIcon} alt="App Logo" className="mr8" />
          <img src={logoMaidMatch} alt="App icon logo" />
        </div>
        <div className="policy-term-links mb-3 mb-sm-0 col-6 text-center">
          <a href={routes.termAndCondition} target="_blank" rel="noreferrer" className="fz16 mr-lg-4 mr-3">Terms and Conditions</a>
          <a href={routes.privacyPolicy} target="_blank" rel="noreferrer" className="fz16">Privacy Policy</a>
        </div>
        <div className="reserved-text col-3 text-right">
          <p className="mb-0">© 2025 MaidMatch. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default HomePageFooter;