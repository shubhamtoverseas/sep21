import React from "react";
import PropTypes from "prop-types";
import styles from "./Badge.module.css";

// Maps invoice status strings to badge variant
const STATUS_VARIANT_MAP = {
  // Paid / success
  "paid":           "success",
  "Paid":           "success",

  // Pending / warning
  "pending paid":   "warning",
  "Pending Paid":   "warning",
  "pending":        "warning",
  "draft":          "neutral",
  "Draft":          "neutral",

  // Unsettled / bad debt / danger
  "unsettled":      "danger",
  "Unsettled":      "danger",
  "bad debt":       "danger",
  "Bad Debt":       "danger",

  // Exchange / refunded / info
  "exchange":       "info",
  "Exchange":       "info",
  "refunded":       "info",
  "Refunded":       "info",

  // Void / neutral
  "void":           "neutral",
  "Void":           "neutral",

  // JO status
  "open":           "success",
  "Open":           "success",
  "closed":         "neutral",
  "Closed":         "neutral",
};

const VARIANT_MAP = {
  success:   styles.success,
  warning:   styles.warning,
  danger:    styles.danger,
  info:      styles.info,
  neutral:   styles.neutral,
  attention: styles.attention,
};

const Badge = ({ status, variant, children, className }) => {
  const resolvedVariant =
    variant || STATUS_VARIANT_MAP[status] || STATUS_VARIANT_MAP[String(status).toLowerCase()] || "neutral";

  const variantClass = VARIANT_MAP[resolvedVariant] || styles.neutral;

  return (
    <span className={`${styles.badge} ${variantClass} ${className || ""}`}>
      {children || status}
    </span>
  );
};

Badge.propTypes = {
  status:    PropTypes.string,
  variant:   PropTypes.oneOf(["success", "warning", "danger", "info", "neutral", "attention"]),
  children:  PropTypes.node,
  className: PropTypes.string,
};

export default React.memo(Badge);
