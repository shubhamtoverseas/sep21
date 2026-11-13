import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import listStyles from "../../Invoice/InvoiceList.module.css";
import { REQUEST_TONE, requestTypeLabel, translation } from "../dashboard/insuranceDashboardConfig";
import styles from "./InsuranceWorkTags.module.css";

/* Open requests and Needs attention, one component for the dashboard, the Worker / Employer Insurance lists and the
   Contract Insurance step (Insurance.txt INS08; UI Correction C4; Insurance.html dashboard.js case 'work').
   One coloured text tag per open request, oldest first, in its own tone (REQUEST_TONE); Needs attention is a warning icon
   and plain text with the issue count — never a coloured tag, never a sixth request category. No "Open" badge. */

export const RequestTag = ({ type }) => (
    <span className={listStyles.statusTag} data-tone={REQUEST_TONE[type] || "neutral"} data-request-type={type}>
        {requestTypeLabel(type)}
    </span>
);
RequestTag.propTypes = { type: PropTypes.string.isRequired };

/* a warning fact as text: the warning icon and plain words, never a coloured tag (prototype pill kind 'review') */
export const WarningNote = ({ children, ...rest }) => (
    <span className={styles.attention} {...rest}>
        <Icon name="alert" size={13} strokeWidth={1.8} />
        <span>{children}</span>
    </span>
);
WarningNote.propTypes = { children: PropTypes.node };

export const AttentionNote = ({ count }) => (count > 0 ? (
    <WarningNote data-attention={count}>{`${translation("key_ins_work_attention")} (${count})`}</WarningNote>
) : null);
AttentionNote.propTypes = { count: PropTypes.number };

/* the requests wrap inside their column (they never run into the next one); Needs attention sits on its own line below */
const InsuranceWorkTags = ({ openRequests = [], attention = 0, empty = null, className = "" }) => {
    if (!openRequests.length && !(attention > 0)) return empty;
    return (
        <span className={`${styles.work} ${className}`} data-requests={openRequests.length}>
            {openRequests.length > 0 && (
                <span className={styles.tags}>
                    {openRequests.map((type, i) => <RequestTag key={`${type}-${i}`} type={type} />)}
                </span>
            )}
            <AttentionNote count={attention} />
        </span>
    );
};

InsuranceWorkTags.propTypes = {
    openRequests: PropTypes.arrayOf(PropTypes.string),
    attention: PropTypes.number,
    empty: PropTypes.node,
    className: PropTypes.string,
};

export default React.memo(InsuranceWorkTags);
