import React from "react";
import PropTypes from "prop-types";
import Btn from "../../../../../../components/ui/Btn";
import Modal from "../../../../../../components/ui/Modal";
import translation from "../../../../../../utils/translation";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import styles from "../Hrms.module.css";
import { formatHoursMinutes, timeRequestStatus } from "../hrmsConfig";

/* U-0440: the house empty treatment is the em dash, never "N/A" or blank */
const Detail = ({ label, value, full = false }) => (
    <div className={full ? styles.detailFull : undefined}>
        <p className={styles.detailLabel}>{label}</p>
        <p className={`${styles.detailValue} ${value ? "" : styles.detailValueMuted}`}>{value || "—"}</p>
    </div>
);
Detail.propTypes = { label: PropTypes.node.isRequired, value: PropTypes.node, full: PropTypes.bool };

/** Ports ViewRequestPopup.js (read-only). bug log #96 (fixed 2026-10-18): the legacy "Show current hours" button had no handler — removed. */
const ViewTimeRequestModal = ({ data, onClose }) => {
    const status = timeRequestStatus(data?.status);
    return (
        <Modal
            title={(
                <span className={styles.modalTitleRow}>
                    {translation("key_view_request")}
                    <span className={listStyles.statusTag} data-tone={status.tone}>{status.label}</span>
                </span>
            )}
            width={560}
            onClose={onClose}
            closeLabel={translation("key_close")}
            footer={(
                <Btn variant="primary" type="button" onClick={onClose}>{translation("key_close")}</Btn>
            )}
        >
            <div className={styles.detailGrid}>
                {/* backend 353: `actioned_by` is the approver or the rejecter (`approved_by` was empty on every rejected row) */}
                <Detail label={translation("key_actioned_by")} value={data?.actioned_by ? `${data.actioned_by}${data?.actioned_by_email ? ` (${data.actioned_by_email})` : ""}` : ""} full />
                <Detail label={translation("key_asked_time")} value={formatHoursMinutes(data?.time_asked_hours, data?.time_asked_minutes)} />
                <Detail label={translation("key_alloted_time")} value={formatHoursMinutes(data?.time_approved_hours, data?.time_approved_minutes)} />
                <Detail label={translation("key_employee_comment")} value={data?.comment} full />
                <Detail label={translation("key_approver_comment")} value={data?.admin_comment} full />
            </div>
        </Modal>
    );
};

ViewTimeRequestModal.propTypes = {
    data: PropTypes.object,
    onClose: PropTypes.func.isRequired,
};

export default ViewTimeRequestModal;
