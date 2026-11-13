import React from "react";
import PropTypes from "prop-types";
import Btn from "../../../../../../components/ui/Btn";
import Icon from "../../../../../../components/Icon/Icon";
import Modal from "../../../../../../components/ui/Modal";
import translation from "../../../../../../utils/translation";
import styles from "./ImportShiftRoster.module.css";
import { headingCase } from "../../../../../../utils/utils";

/** Ports ShiftRoasterPopup: success message, counts from response headers, feedback download. */
const ImportResultModal = ({ headers, onClose, onDownloadFeedback }) => (
    <Modal
        title={headingCase(translation("key_shift_roster"))}
        width={520}
        onClose={onClose}
        closeLabel={translation("key_close")}
        footer={(
            <>
                <Btn variant="secondary" type="button" onClick={onDownloadFeedback}>
                    <Icon name="download" size={14} /> {translation("key_download_feedback_file")}
                </Btn>
                <Btn variant="primary" type="button" onClick={onClose}>{translation("key_done")}</Btn>
            </>
        )}
    >
        <div className={styles.result}>
            <span className={styles.resultIcon}><Icon name="check" size={22} strokeWidth={2.4} /></span>
            <p className={styles.resultMessage}>{translation("key_shift_roster_imported_successfully")}</p>
            <div className={styles.resultStats}>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>{translation("key_no_of_days")}</span>
                    <span className={styles.statValue}>{headers?.days_count ?? "—"}</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>{translation("key_no_of_employees")}</span>
                    <span className={styles.statValue}>{headers?.users_count ?? "—"}</span>
                </div>
            </div>
        </div>
    </Modal>
);

ImportResultModal.propTypes = {
    headers: PropTypes.shape({
        days_count: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        users_count: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    onClose: PropTypes.func.isRequired,
    onDownloadFeedback: PropTypes.func.isRequired,
};

export default ImportResultModal;
