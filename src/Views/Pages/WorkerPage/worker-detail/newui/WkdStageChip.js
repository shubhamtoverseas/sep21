import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../../utils/translation";
import { toTitleCase } from "../../../../../utils/utils";
import { STAGE_TONE_NEUTRAL, STAGE_LABEL_KEYS, WKD_STAGE_TONE_BY_ID, WKD_STAGE_TITLE_CASE_KEYS } from "../../workerModuleConstants";

export const wkdStageLabel = (row) => {
    const key = STAGE_LABEL_KEYS[row?.job_stage_status];
    if (!key) return row?.job_stage_status_name;
    const label = translation(key);
    return WKD_STAGE_TITLE_CASE_KEYS.includes(key) ? toTitleCase(label) : label;
};

/* tone follows the stage id (SR-07) so every locale colours the chip the same way */
export const wkdStageTone = (row) => WKD_STAGE_TONE_BY_ID[row?.job_stage_status] || STAGE_TONE_NEUTRAL;

const WkdStageChip = ({ label, tone = STAGE_TONE_NEUTRAL, compact, variant }) => {
    if (!label) return null;
    if (variant === 'tag') {
        return (
            <span className="wkd-stage-tag" data-stage-tag={ label } data-tone={ tone }>
                <span className="wkd-stage-tag-dot" />
                { label }
            </span>
        );
    }
    return (
        <span className={ `wkd-stage-chip${ compact ? ' compact' : '' }` } data-stage-tag={ label } data-tone={ tone }>
            { label }
        </span>
    );
};

WkdStageChip.propTypes = {
    label: PropTypes.string,
    tone: PropTypes.string,
    compact: PropTypes.bool,
    variant: PropTypes.oneOf(['chip', 'tag']),
};

export default React.memo(WkdStageChip);
