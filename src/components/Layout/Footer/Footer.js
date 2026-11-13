import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import routes from "../../../Views/Pages/routes/routesConfig";
const Footer = ({ footerBgClass }) => {
  const { t } = useTranslation(); 
  const savedLang = localStorage.getItem('i18nextLng') || "en";

  return (
    <footer className={`${footerBgClass} border-top float-left w-100`}>
      <div className="container-fluid">
        <div className="d-flex justify-content-center">
          <a href={routes.termAndCondition+'?language='+savedLang} target="_blank" 
          rel="noopener noreferrer"
          className="py-2 grey2 footer-link fz12 fw-400 text-underline lh-normal mr6">
            { t('key_terms_and_conditions')}
          </a>
          <span className="py-2 grey2 footer-link fz12 fw-400 lh-normal mr6">|</span>
          <a href={routes.privacyPolicy+'?language='+savedLang} target="_blank" rel="noopener noreferrer" className="py-2 grey2 footer-link fz12 fw-400 text-underline lh-normal mr6">
            { t('key_privacy_policy') }
          </a>
          {/* <span className="py-2 grey2 footer-link fz12 fw-400 lh-normal mr6">|</span>

          <span className="py-2 grey2 fz12 fw-400 lh-normal mr6">
          Copyright &copy;2025 Overseas Group Inc. All rights reserved.
          </span> */}
        </div>
      </div>
    </footer>
  );
};
Footer.propTypes = {
  footerBgClass: PropTypes.string,
}
export default Footer;
