import React from "react";
import PropTypes from "prop-types";
import Modal from "../../../../../components/ui/Modal";
import Btn from "../../../../../components/ui/Btn";
import translation from "../../../../../utils/translation";
import styles from "./PickupGuardDialog.module.css";

/** Shown instead of End of Deployment while required stages are outstanding. Writes nothing. */
const PickupGuardDialog = ({ outstandingLabelKeys, titleKey = "key_pickup_cannot_be_completed_yet", onClose }) => (
    <Modal
        title={ translation(titleKey) }
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
        <p className={ styles.intro }>{ translation("key_pickup_guard_intro") }</p>
        <ul className={ styles.outstandingList }>
            { outstandingLabelKeys.map((labelKey) => <li key={ labelKey }>{ translation(labelKey) }</li>) }
        </ul>
        <p className={ styles.note }>{ translation("key_pickup_guard_unchanged_note") }</p>
    </Modal>
);

PickupGuardDialog.propTypes = {
    outstandingLabelKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
    /* "Pick Up cannot be completed yet" or "… marked Not Required yet" (prototype pickupGuard title by target) */
    titleKey: PropTypes.string,
    onClose: PropTypes.func.isRequired,
};

export default React.memo(PickupGuardDialog);
