import React from "react";
import PropTypes from "prop-types";
import Modal from "../../../../../components/ui/Modal";
import Btn from "../../../../../components/ui/Btn";
import translation from "../../../../../utils/translation";
import styles from "./PickupGuardDialog.module.css";

const fill = (text, vars) => Object.keys(vars).reduce((out, k) => out.split(`{${ k }}`).join(vars[k]), text);

/**
 * Pick Up → Not Required while Require Pick Up is still Yes (prototype pickupNotRequiredBlocked): Not Required is valid
 * only when no pick-up is required. Close only; nothing is written.
 */
const PickupNotRequiredDialog = ({ requireLabel, onClose }) => (
    <Modal
        title={ translation("key_cr_pickup_not_required_blocked_title") }
        width={ 440 }
        onClose={ onClose }
        closeLabel={ translation("key_close") }
        trapFocus
        footer={ (
            <>
                <span className={ styles.spacer } />
                <Btn variant="primary" type="button" onClick={ onClose }>{ translation("key_close") }</Btn>
            </>
        ) }
    >
        <p className={ styles.intro }>{ fill(translation("key_cr_pickup_not_required_blocked_intro"), { value: requireLabel }) }</p>
        <p className={ styles.note }>{ translation("key_cr_pickup_not_required_blocked_note") }</p>
        <p className={ styles.note }>{ translation("key_pickup_guard_unchanged_note") }</p>
    </Modal>
);

PickupNotRequiredDialog.propTypes = {
    /* the current Require Pick Up answer, as shown (Yes / No) */
    requireLabel: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default React.memo(PickupNotRequiredDialog);
