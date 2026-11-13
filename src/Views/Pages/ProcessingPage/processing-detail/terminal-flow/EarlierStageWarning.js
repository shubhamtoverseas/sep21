import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import styles from "./StageLockNote.module.css";

/* Deployment sub-stages that come before HKID / Pick Up, and their complete statuses. */
const EARLIER_STAGES = Object.freeze([
    { statusField: "dhl_contract_status", done: ["received_by_helper", "not_required"], labelKey: "key_dhl_contract" },
    { statusField: "flight_details_status", done: ["flight_booked", "not_required"], labelKey: "key_flight_details" },
]);

/**
 * Excel Contract No. 4 / 19: later-stage work is WARNED, never locked, when an earlier stage is incomplete.
 * Saving here never activates the contract or marks a stage Ready. Shown only while Processing.
 */
const EarlierStageWarning = ({ deploymentDocument, isProcessing }) => {
    if (!isProcessing || !deploymentDocument) return null;
    const outstanding = EARLIER_STAGES.filter(({ statusField, done }) => !done.includes(deploymentDocument?.[statusField]));
    if (!outstanding.length) return null;
    return (
        <div className={ `${ styles.note } mb-3` } role="status">
            <Icon name="info" size={ 13 } className={ styles.icon } />
            <span>
                { translation("key_earlier_stage_incomplete_warning") }{ " " }
                { outstanding.map(({ labelKey }) => translation(labelKey)).join(", ") }
            </span>
        </div>
    );
};

EarlierStageWarning.propTypes = {
    deploymentDocument: PropTypes.object,
    isProcessing: PropTypes.bool,
};

export default React.memo(EarlierStageWarning);
