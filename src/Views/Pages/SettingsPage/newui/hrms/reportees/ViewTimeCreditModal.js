import React from "react";
import PropTypes from "prop-types";
import Btn from "../../../../../../components/ui/Btn";
import Modal from "../../../../../../components/ui/Modal";
import translation from "../../../../../../utils/translation";
import styles from "../Hrms.module.css";
import { headingCase } from "../../../../../../utils/utils";

const Detail = ({ label, value, full = false }) => (
    <div className={full ? styles.detailFull : undefined}>
        <p className={styles.detailLabel}>{label}</p>
        <p className={`${styles.detailValue} ${value ? "" : styles.detailValueMuted}`}>{value || translation("key_na")}</p>
    </div>
);
Detail.propTypes = { label: PropTypes.node.isRequired, value: PropTypes.node, full: PropTypes.bool };

/** Ports ViewTimeCreditPopup.js (read-only). */
const ViewTimeCreditModal = ({ timeEntry, onClose }) => (
    <Modal
        title={`${headingCase(translation("key_view_time_credit"))} (${translation("key_id")}: ${timeEntry?.request_id ?? ""})`}
        width={560}
        onClose={onClose}
        closeLabel={translation("key_close")}
        footer={<Btn variant="primary" type="button" onClick={onClose}>{translation("key_close")}</Btn>}
    >
        {timeEntry ? (
            <div className={styles.detailGrid}>
                <Detail label={translation("key_employee")} value={timeEntry.employee} full />
                <Detail label={translation("key_date")} value={timeEntry.created_for} />
                <Detail label={translation("key_duration")} value={timeEntry.duration} />
                <Detail label={translation("key_from_time")} value={timeEntry.from_time} />
                <Detail label={translation("key_to_time")} value={timeEntry.to_time} />
                <Detail label={translation("key_comment")} value={timeEntry.comment} full />
            </div>
        ) : (
            <p className={styles.detailValueMuted}>{translation("key_no_data_available")}</p>
        )}
    </Modal>
);

ViewTimeCreditModal.propTypes = {
    timeEntry: PropTypes.object,
    onClose: PropTypes.func.isRequired,
};

export default ViewTimeCreditModal;
