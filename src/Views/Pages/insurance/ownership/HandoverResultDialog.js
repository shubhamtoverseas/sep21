import React from "react";
import PropTypes from "prop-types";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import Icon from "../../../../components/Icon/Icon";
import { fmtDateTime, translation } from "../dashboard/insuranceDashboardConfig";
import styles from "../shared/InsuranceForms.module.css";

/* D16 · Handover result (ownership.js resultModal), after a bulk or portfolio Change CS Owner */
const HandoverResultDialog = ({ result, onClose }) => (
    <Modal
        title={translation("key_ins_handover_result")}
        subtitle={fmtDateTime(result.at)}
        onClose={onClose}
        footer={<><span className={styles.spacer} /><Btn variant="primary" onClick={onClose}>{translation("key_ins_done")}</Btn></>}
    >
        <div className={styles.picklist}>
            {result.results.map((r) => (
                <div key={r.ref} className={`${styles.prow} ${r.updated ? "" : styles.prowIneligible}`}>
                    <Icon name={r.updated ? "check" : "x"} size={14} />
                    <div className={styles.prowMain}>
                        <div className={styles.l1}><span className={styles.code}>{r.ref}</span> {r.worker}</div>
                        <div className={styles.l2}>{r.reason}</div>
                    </div>
                    <div className={`${styles.why} ${r.updated ? styles.whyOk : ""}`}>
                        {translation(r.updated ? "key_ins_updated" : "key_ins_cannot_update")}
                    </div>
                </div>
            ))}
        </div>
    </Modal>
);

HandoverResultDialog.propTypes = {
    result: PropTypes.shape({ at: PropTypes.string, results: PropTypes.array.isRequired }).isRequired,
    onClose: PropTypes.func.isRequired,
};

export default HandoverResultDialog;
