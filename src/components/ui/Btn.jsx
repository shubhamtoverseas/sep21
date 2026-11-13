import React from "react";
import PropTypes from "prop-types";
import styles from "./Btn.module.css";

const Btn = ({ variant = "secondary", children = null, className = "", as: Tag = null, to, href, ...rest }) => {
  const variantClass = styles[variant] || styles.secondary;
  const cls = [styles.btn, variantClass, className].filter(Boolean).join(" ");

  if (Tag) {
    return <Tag className={cls} to={to} href={href} {...rest}>{children}</Tag>;
  }

  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
};

Btn.propTypes = {
  variant:   PropTypes.oneOf(["primary", "secondary", "ghost", "danger", "dangerOutline"]),
  children:  PropTypes.node,
  className: PropTypes.string,
  as:        PropTypes.elementType,
  to:        PropTypes.string,
  href:      PropTypes.string,
};

export default React.memo(Btn);
