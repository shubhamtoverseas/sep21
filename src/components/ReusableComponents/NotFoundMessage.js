import React from "react";
import PropTypes from "prop-types";
import translation from "../../utils/translation";
const NotFoundMessage = ({message, paddingClass = 'p50'}) => {
  return (
    <div className={`not-found-msg ${paddingClass} text-center`}>
      <div className="mw232 d-inline-block"
      >
        {translation('key_no')}<span className="text-lowercase"> {message} {translation('key_found')}</span>
      </div>
    </div>
  );
};
NotFoundMessage.propTypes = {
  message: PropTypes.string,
  paddingClass: PropTypes.string,
};
export default NotFoundMessage;
