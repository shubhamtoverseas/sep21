import React, { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import { Field, TextArea } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { rejectInsuranceRequest, withdrawInsuranceRequest } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { translation } from "../dashboard/insuranceDashboardConfig";
import { isBlank, mustReload, refusalOf, refusalText, requiredErrors } from "../shared/insuranceFormsConfig";
import useKeptDraft from "../shared/useKeptDraft";
import styles from "../shared/InsuranceForms.module.css";
import { actionLabel, requestTypeText } from "./insuranceRecordConfig";

const COPY = {
    withdraw: {
        action: "cancelRequest", sub: "key_ins_withdraw_sub", button: "key_ins_action_withdraw_request", done: "key_ins_request_withdrawn",
        thunk: withdrawInsuranceRequest,
    },
    reject: {
        action: "reject", sub: "key_ins_reject_sub", button: "key_ins_reject", done: "key_ins_request_rejected",
        thunk: rejectInsuranceRequest,
    },
};

/* D6 · Withdraw request (forms.openCancelRequest, M7) and D7 · Reject request (forms.openReject, M8). Both
   close the request in MaidMatch only, with a reason; on success the Requests tab opens. No provider handover is
   confirmed: a withdrawal stays a withdrawal, never an insurer decision. */
const CloseRequestDialog = ({ mode, record, request: rq, onClose, onDone }) => {
    const dispatch = useDispatch();
    const c = COPY[mode];
    const requestVersion = useRef(rq.version);
    const isCxl = rq.type === "Cancellation";
    const [reason, setReason] = useState("");
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const kept = useKeptDraft(onClose, onDone);

    const submit = useCallback(() => {
        if (busy) return;
        // required fields first (same rules and copy as the server guard); nothing is sent while one is missing
        const missing = requiredErrors([
            ["reason", isBlank(reason), "key_ins_err_enter_reason"],
        ]);
        if (Object.keys(missing).length) { setErrors(missing); return; }
        setBusy(true);
        kept.reset();
        const payload = { ref: record.ref, requestId: rq.id, requestVersion: requestVersion.current, reason };
        dispatch(c.thunk(payload)).then((res) => {
            setBusy(false);
            if (!res.error) {
                ShowToast("success", res.payload?.message || translation(c.done));
                onDone("requests");
                onClose();
                return;
            }
            const r = refusalOf(res);
            if (mustReload(res)) { ShowToast("error", r.message); onClose(); onDone(); return; }
            if (kept.keep(res)) return;
            setErrors(r.errors);
            ShowToast("error", refusalText(r, ["reason"]));
        });
    }, [busy, c, dispatch, kept, onClose, onDone, reason, record.ref, rq.id]);

    return (
        <Modal
            busy={busy}
            title={actionLabel(c.action)}
            subtitle={translation(c.sub, { ref: record.ref, type: requestTypeText(rq.type) })}
            onClose={kept.close}
            footer={(
                <>
                    <span className={styles.spacer} />
                    <Btn variant="secondary" onClick={kept.close}>{translation("key_cancel")}</Btn>
                    <Btn variant="danger" onClick={submit} disabled={busy}>{busy ? translation("key_saving") : translation(c.button)}</Btn>
                </>
            )}
        >
            <div className={styles.form}>
                {kept.note}
                {mode === "withdraw" && (
                    <div className={styles.notice}>{translation(isCxl ? "key_ins_withdraw_notice_cancellation" : "key_ins_withdraw_notice")}</div>
                )}
                <Field label={translation("key_ins_reason")} required htmlFor="ins-close-reason" error={errors.reason}>
                    <TextArea id="ins-close-reason" maxLength={500} rows={3} value={reason} onChange={(e) => { setReason(e.target.value); setErrors((p) => ({ ...p, reason: undefined })); }} />
                </Field>
            </div>
        </Modal>
    );
};

CloseRequestDialog.propTypes = {
    mode: PropTypes.oneOf(["withdraw", "reject"]).isRequired,
    record: PropTypes.object.isRequired,
    request: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default CloseRequestDialog;
