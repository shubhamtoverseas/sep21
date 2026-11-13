import React from 'react';
import PropTypes from 'prop-types';

const CustomFormGroup = ({ children, classNames = '' }) => {
  return (
    <div className={ `col ${ classNames }` }>
      { children }
    </div>
  );
};

CustomFormGroup.propTypes = {
  children: PropTypes.node,
  classNames: PropTypes.string,
};



export default CustomFormGroup;
