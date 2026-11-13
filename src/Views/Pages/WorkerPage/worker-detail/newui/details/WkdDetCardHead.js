import React from "react";
import PropTypes from "prop-types";
import WkdStatusChip from "../WkdStatusChip";
import translation from "../../../../../../utils/translation";

const WkdDetCardHead = ({ title, status, children }) => (
    <div className="wkd-det-head">
        <h3 className="g2-title">{ title }</h3>
        { /* a completed section reads Verified (ClickUp 'New UI worker details - UI Issues'; prototype l10n v211 'Verified', no Complete chip) */ }
        { status === 'completed' && <WkdStatusChip label={ translation('key_verified') } tone="cmp" /> }
        { status === 'incomplete' && <WkdStatusChip label={ translation('key_incomplete') } tone="inc" /> }
        <span className="wkd-grow" />
        { children }
    </div>
);

WkdDetCardHead.propTypes = {
    title: PropTypes.string.isRequired,
    status: PropTypes.string,
    children: PropTypes.node,
};

export default React.memo(WkdDetCardHead);
