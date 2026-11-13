import React from "react";
import PropTypes from "prop-types";
import './helping-step.css';

const HelpingStep = ({ image, stepNumber, title, description }) => {
  return (
    <div className="col-md-4 px-5 mb-5 mb-sm-0">
      <img src={image} alt="Icon" className="mb28" height={130} />
      <h2 className="step-title1 mb-3">Step {stepNumber}:</h2>
      <h2 className="step-title2 mb-3">{title}</h2>
      <p className="step-description mb-0">{description}</p>
    </div>
  );
};

HelpingStep.propTypes = {
  image: PropTypes.string.isRequired,
  stepNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};

export default HelpingStep;
