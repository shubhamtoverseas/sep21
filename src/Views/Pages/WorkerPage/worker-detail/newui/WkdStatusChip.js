import React from "react";
import PropTypes from "prop-types";
import { WKD_STATUS_TONES, WORKER_PROFILE_STATUS_TONE, workerStatusIsHollow } from "../../workerModuleConstants";

/* Profile / section status chip. `statusId` resolves tone + treatment from the one WORKER_PROFILE_STATUS
 * registry (prototype domain-tag table); `tone` alone is for section statuses. `hollow` = outlined variant. */
const WkdStatusChip = ({ label, tone, statusId, hollow }) => {
    const resolvedTone = tone || (statusId != null ? WORKER_PROFILE_STATUS_TONE[statusId] : undefined);
    const isHollow = hollow ?? (statusId != null ? workerStatusIsHollow(statusId) : false);
    const c = WKD_STATUS_TONES[resolvedTone] || WKD_STATUS_TONES.up;
    const style = isHollow
        ? { background: 'transparent', border: `1px solid ${ c.fg }`, color: c.fg }
        : { background: c.bg, border: `1px solid ${ c.bd }`, color: c.fg };
    return (
        <span className="wkd-status-chip" data-treatment={ isHollow ? 'hollow' : undefined } style={ style }>
            <span className="wkd-chip-dot" />
            { label }
        </span>
    );
};

WkdStatusChip.propTypes = {
    label: PropTypes.string.isRequired,
    tone: PropTypes.string,
    statusId: PropTypes.number,
    hollow: PropTypes.bool,
};

export default React.memo(WkdStatusChip);
