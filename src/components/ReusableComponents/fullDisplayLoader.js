import React from 'react';
import '../../assets/css/listLoader.css';
import '../../assets/css/fullLoader.css';

// Full-screen blocking loader — new-UI ring over a scrim (spinner rules live in listLoader.css)
const FullDisplayLoader = () => (
    <div className="nu-full-loader" role="status" aria-live="polite">
        <span className="nu-spinner" aria-hidden="true" />
    </div>
);

export default FullDisplayLoader;


/*import React from "react";
import { Spinner } from "react-bootstrap";
import PropTypes from 'prop-types';

const CustomSpinner = ({ paddingClass = 'p50', loaderColorClass = 'text-dark' }) => {
  return (
    <div className={ `${ paddingClass } text-center` }>
      <Spinner animation="border" role="status" className={ `${ loaderColorClass }` } />
    </div>
  );
};

CustomSpinner.propTypes = {
  paddingClass: PropTypes.string,
  loaderColorClass: PropTypes.string,
};
export default CustomSpinner;*/