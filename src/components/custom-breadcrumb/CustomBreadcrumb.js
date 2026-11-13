import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import breadcrumbArrow from '../../assets/img/svg/breadcrumb-arrow.svg'
import './breadcrumb.css';

const CustomBreadcrumb = ({ items, className = 'mb24' }) => {
  return (
    <nav className={`breadcrumb-row align-items-center d-flex ${className}`}>
      {items.map((item, index) => (
        <span key={index} className="breadcrumb-cutom-item">
          {item.link ? (
            <Link to={item.link} className="breadcrumb-cutom-link">
              {item.label}
            </Link>
          ) : (
            <span className="black">{item.label}</span>
          )}
          {index < items.length - 1 && (
            <span className="breadcrumb-cutom-separator">
                <img src={breadcrumbArrow} width={20} height={20}  />
            </span>
          )}
        </span>
      ))}
    </nav>
  );
};

CustomBreadcrumb.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      link: PropTypes.string, 
    })
  ).isRequired,
  className: PropTypes.string, 
};

export default CustomBreadcrumb;
