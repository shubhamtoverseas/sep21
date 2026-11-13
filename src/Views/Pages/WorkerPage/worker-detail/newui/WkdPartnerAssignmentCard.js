import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../../utils/translation";
import WkdDetCardHead from "./details/WkdDetCardHead";
import WkdReadField from "./details/WkdReadField";
import { PARTNER_ASSIGNMENT_COPY } from "../../workerModuleConstants";

/* conflict sheet U-0203: a partner-origin worker shows the recorded relationship — agency, branch, Worker Code — read-only.
 * U001 / U003: until the agency confirms the invitation there is no `agency_details` — the card reads Pending, never Assigned. */
const WkdPartnerAssignmentCard = ({ worker }) => {
    const agency = worker?.worker_overseas_detail_info?.agency_details || {};
    const agencyCode = agency.agency_code ?? agency.code;
    const agencyLabel = [agency.agency_name, agencyCode ? `(${ agencyCode })` : ''].filter(Boolean).join(' ');
    const branchLabel = [agency.branch_name, agency.branch_code ? `(${ agency.branch_code })` : ''].filter(Boolean).join(' ');
    const isAssigned = Boolean(agency.agency_name || agencyCode || agency.branch_name);
    return (
        <div className="g2-card wkd-det-card" data-mc-partner-assignment="readonly">
            <WkdDetCardHead title={ PARTNER_ASSIGNMENT_COPY.title }>
                <span className={ `g2-status-tag g2-assignment-state${ isAssigned ? ' assigned' : '' }` }>{ translation(isAssigned ? 'key_assigned' : 'key_pending') }</span>
            </WkdDetCardHead>
            <div className="wkd-det-sec is-last">
                <div className="det-grid">
                    <WkdReadField det label={ PARTNER_ASSIGNMENT_COPY.agency } value={ agencyLabel } />
                    <WkdReadField det label={ PARTNER_ASSIGNMENT_COPY.branch } value={ branchLabel } />
                    {/* §16.3 / OvN 21: no Worker Code yet reads "Not Assigned" (no Copy) */}
                    <WkdReadField det label={ PARTNER_ASSIGNMENT_COPY.code } value={ worker?.reference_id || translation('key_not_assigned') } mono={ Boolean(worker?.reference_id) } />
                </div>
                <div className="ctx-note"><span>{ PARTNER_ASSIGNMENT_COPY.note }</span></div>
            </div>
        </div>
    );
};

WkdPartnerAssignmentCard.propTypes = { worker: PropTypes.object };

export default React.memo(WkdPartnerAssignmentCard);
