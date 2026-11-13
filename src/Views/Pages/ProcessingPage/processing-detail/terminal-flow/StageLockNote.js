import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import { CONTRACT_STATUS } from "../../processingConstants";
import styles from "./StageLockNote.module.css";

const LOCK_NOTE_KEYS = Object.freeze({
    [CONTRACT_STATUS.ACTIVE]: "key_stage_lock_note_active",
    [CONTRACT_STATUS.COMPLETED]: "key_stage_lock_note_completed",
    [CONTRACT_STATUS.CANCELLED]: "key_stage_lock_note_cancelled",
});

/** Outside Processing, stage fields and statuses are read-only (TERMINAL.md §1). */
const StageLockNote = ({ contractStatus }) => {
    const noteKey = LOCK_NOTE_KEYS[contractStatus];
    if (!noteKey) return null;
    return (
        <div className={ styles.note } role="status">
            <Icon name="info" size={ 13 } className={ styles.icon } />
            <span>{ translation(noteKey) }</span>
        </div>
    );
};

StageLockNote.propTypes = {
    contractStatus: PropTypes.number,
};

export default React.memo(StageLockNote);
