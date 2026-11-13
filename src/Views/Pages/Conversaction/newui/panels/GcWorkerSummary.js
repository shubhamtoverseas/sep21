import React from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import GcIcon from "../gcIcons";
import translation from "../../../../../utils/translation";
import configData from "../../../../../components/ReusableComponents/app-configs";
import GcEntityCodeLink from "../GcEntityCodeLink";
import { STATUS_CHIP_BY_ID, WORKER_STATUS_AVAILABLE } from "../gcConstants";


const GcWorkerSummary = ({ onPush }) => {
    const workerProfileInfo = useSelector((state) => state.worker.workerProfileInfo);
    /* the Profile Status only — a Job Offer stage (`job_status_info`) is never shown in its place; an unknown id renders "—" */
    const statusName = configData.workerStatusLabel(workerProfileInfo?.status, '');
    const isAvailable = workerProfileInfo?.status === WORKER_STATUS_AVAILABLE;

    return (
        <div className="gc-panel-pad">
            <div className="gc-pid">
                <span className="gc-pid-name">{ workerProfileInfo?.fullname }</span>
                <GcEntityCodeLink kind="worker" id={ workerProfileInfo?.id } code={ workerProfileInfo?.reference_id } titleKey="key_worker_details" />
                <span className="gc-pid-ter">{ workerProfileInfo?.current_location?.name || "" }</span>
            </div>
            <div className="gc-lv-block">
                <div className="gc-lv-row">
                    <span className="gc-lk">{ translation("key_profile_status") }</span>
                    <span className="gc-lv">
                        { statusName
                            ? <span className={ `gc-status-chip ${ STATUS_CHIP_BY_ID[workerProfileInfo?.status] || "gc-st-neutral" }` }><span className="gc-sdot" />{ statusName }</span>
                            : "—" }
                    </span>
                </div>
            </div>
            { isAvailable && (
                <div className="gc-btn-stack">
                    <button type="button" className="gc-btn gc-btn-primary full" onClick={ () => onPush({ view: "invited" }) }>
                        <GcIcon name="job" />{ translation("key_invited_applied") }
                    </button>
                </div>
            ) }
        </div>
    );
};

GcWorkerSummary.propTypes = {
    onPush: PropTypes.func.isRequired,
};

export default React.memo(GcWorkerSummary);
