import React from "react";
import { Spinner } from "react-bootstrap";
import PropTypes from 'prop-types';
import translation from "../../utils/translation";

const SubmitSpinnerButton = ({submitText=`${translation('key_save')}`, loadingText=`${translation('key_saving')}...`, status='', buttonClass = 'btn filled-btn'}) => {
  return (
    <div className="d-inline-block">
      <button type="submit" className={`${buttonClass}`} disabled={status === 'loading'} >
        {status !== 'loading' ? submitText: 
        <>
          <Spinner animation="border" role="status"  className="h18 w18 mr-2" /> 
          <span>{loadingText}</span>
        </>
        }
      </button>
    </div>
  );
};

SubmitSpinnerButton.propTypes = {
  loadingText: PropTypes.string,
  submitText: PropTypes.string,
  status: PropTypes.string,
  buttonClass: PropTypes.string,
};
export default SubmitSpinnerButton;
