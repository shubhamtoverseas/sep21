import React from "react";
import PropTypes from "prop-types";
import Modal from "./Modal";
import Btn from "./Btn";
import translation from "../../utils/translation";
import styles from "./ConfirmModal.module.css";

/** Small confirm dialog on the new-UI Modal shell. */
const ConfirmModal = ({ title, body, confirmLabel, cancelLabel, danger = false, busy = false, onConfirm, onClose }) => (
    <Modal
        title={title}
        width={420}
        onClose={onClose}
        footer={(
            <>
                <span className={styles.spacer} />
                <Btn variant="secondary" onClick={onClose} disabled={busy}>{cancelLabel || translation("key_cancel")}</Btn>
                <Btn variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
                    {busy ? translation("key_loading") : confirmLabel || translation("key_yes")}
                </Btn>
            </>
        )}
    >
        <p className={styles.body}>{body}</p>
    </Modal>
);

ConfirmModal.propTypes = {
    title: PropTypes.node.isRequired,
    body: PropTypes.node,
    confirmLabel: PropTypes.node,
    cancelLabel: PropTypes.node,
    danger: PropTypes.bool,
    busy: PropTypes.bool,
    onConfirm: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default React.memo(ConfirmModal);
