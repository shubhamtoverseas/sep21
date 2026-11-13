import React from "react";
import { Spinner } from "react-bootstrap";
import PropTypes from 'prop-types';

const CircularSpinner = ({ paddingClass = 'p50', loaderColorClass = 'text-dark' }) => {
  return (
    <div className={ `${ paddingClass } text-center` }>
      <Spinner animation="border" role="status" className={ `${ loaderColorClass }` } />
    </div>
  );
};

CircularSpinner.propTypes = {
  paddingClass: PropTypes.string,
  loaderColorClass: PropTypes.string,
};
export default CircularSpinner;