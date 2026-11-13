import React from "react";
import maidmatchLogo from "../../../assets/img/svg/maidmatch-logo.svg";
import Footer from "../../../components/Layout/Footer/Footer";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
const LoginLayout = ({title, children}) => {
 const { t } = useTranslation();
  return (
    <>
      <div className="account-page login-bg d-flex align-items-center justify-content-center">
        <div
          className="account-form-box"
        >
          <div className="card-body p-0">
            <div className="text-center">
              <span>
                <img src={maidmatchLogo} alt="MaidMatch" />
              </span>
              <h3 className="fz28 fw-700 black lh-normal mt32 mb32 font-roboto">{title}</h3>
            </div>

            {children}
          </div>
        </div>
      </div>
      <Footer footerBgClass={'bg-f5'} trans={t} />
    </>
  );
};
LoginLayout.propTypes = {
    title: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
}
export default LoginLayout;
