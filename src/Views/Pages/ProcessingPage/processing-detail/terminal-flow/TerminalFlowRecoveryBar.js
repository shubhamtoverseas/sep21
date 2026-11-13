import React from "react";
import PropTypes from "prop-types";
import Btn from "../../../../../components/ui/Btn";
import translation from "../../../../../utils/translation";
import styles from "./TerminalFlowRecoveryBar.module.css";

/** Reopens a terminal flow after Cancel, or when the page loads with every required stage already terminal. */
const TerminalFlowRecoveryBar = ({ actionLabel, onOpen }) => (
    <div className={ styles.bar } role="status">
        <span className={ styles.message }>{ translation("key_every_required_stage_is_terminal") }</span>
        <Btn variant="primary" type="button" onClick={ onOpen }>{ actionLabel }</Btn>
    </div>
);

TerminalFlowRecoveryBar.propTypes = {
    actionLabel: PropTypes.node.isRequired,
    onOpen: PropTypes.func.isRequired,
};

export default React.memo(TerminalFlowRecoveryBar);
