import React from "react";
import PropTypes from "prop-types";
import translation from "../../../utils/translation";

const UserDetailsSection = ({ title, details, marginBottom='mb40' }) => {
  return (
    <div className={`${marginBottom} user-details-section`}>
      <h3 className="grey3 fz20 fw-400 mb16">{title}</h3>
      {details.map((row, rowIndex) => (
        <div className="form-row mb20" key={rowIndex}>
          {row.map((detail, colIndex) => (
            <div className="col-6" key={colIndex}>
              <div className="userdetailinner_content">
                <span className="grey89 fz10 fw-500">{translation(detail.label)}</span>
                <h4 className="fz16 fw-400 black">{detail?.value}</h4>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

UserDetailsSection.propTypes = {
  title: PropTypes.string.isRequired,
  marginBottom: PropTypes.string,
  details: PropTypes.arrayOf(
    PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      })
    )
  ).isRequired,
};

export default UserDetailsSection;
