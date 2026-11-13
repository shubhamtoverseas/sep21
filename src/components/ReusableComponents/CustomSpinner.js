import React from 'react';
import PropTypes from 'prop-types';
import '../../assets/css/listLoader.css';
import translation from '../../utils/translation';

// Global loader — the new-UI 20px ring (same as .invd .spinner / .wkd .ctx-spinner).
// variant "inline" (opt-in): the ring alone and smaller, inside a button, a field or a text line.
const ListLoadingLoader = ({ variant = 'block' }) => {
  if (variant === 'inline') return <span className="nu-spinner nu-spinner--inline" role="status" aria-label={ translation('key_loading') } />;
  return (
    <div className="chat-loader-center" role="status" aria-live="polite">
      <span className="nu-spinner" aria-hidden="true" />
    </div>
  );
};

ListLoadingLoader.propTypes = {
  variant: PropTypes.oneOf(['block', 'inline']),
};

export default ListLoadingLoader;


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