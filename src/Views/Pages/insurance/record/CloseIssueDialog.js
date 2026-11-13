import React, { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import { Field, TextArea } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { closeInsuranceIssues } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { fmtDateTime, translation } from "../dashboard/insuranceDashboardConfig";
import { isBlank, mustReload, refusalOf, refusalText, requiredErrors } from "../shared/insuranceFormsConfig";
import useKeptDraft from "../shared/useKeptDraft";
import styles from "../shared/InsuranceForms.module.css";
import { actionLabel, scopeLabel } from "./insuranceRecordConfig";

/* D12 · Close issue (forms.openDismiss, M12). Closes ONE open issue with a reason (INS-R-K07: issues are dismissed
   individually; other open issues stay open — conflicts sheet U-0077); coverage and requests are not changed. The
   only open issue is pre-selected, or the issue whose row opened the dialog (PROMPT 5, INS05-9). Captures the record
   version when it opens. */
const CloseIssueDialog = ({ record, issueId = null, onClose, onDone }) => {
    const dispatch = useDispatch();
    const factsVersion = useRef(record.factsVersion);
    const [selected, setSelected] = useState(() => (
        issueId != null && record.issues.some((i) => i.id === issueId) ? issueId : record.issues.length === 1 ? record.issues[0].id : null
    ));
    const [reason, setReason] = useState("");
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const kept = useKeptDraft(onClose, onDone);

    const choose = useCallback((id) => {
        setSelected(id);
        setErrors((prev) => ({ ...prev, issueIds: undefined }));
    }, []);

    const submit = useCallback(() => {
        if (busy) return;
        // required fields first (same rules and copy as the server guard); nothing is sent while one is missing
        const missing = requiredErrors([
            ["issueIds", selected == null, "key_ins_err_select_issues_reviewed"],
            ["reason", isBlank(reason), "key_ins_err_enter_reason"],
        ]);
        if (Object.keys(missing).length) { setErrors(missing); return; }
        setBusy(true);
        kept.reset();
        dispatch(closeInsuranceIssues({ ref: record.ref, factsVersion: factsVersion.current, issueIds: [selected], reason })).then((res) => {
            setBusy(false);
            if (!res.error) {
                ShowToast("success", res.payload?.message || translation("key_ins_review_dismissed"));
                onDone();
                onClose();
                return;
            }
            const r = refusalOf(res);
            if (mustReload(res)) { ShowToast("error", r.message); onClose(); onDone(); return; }
            if (kept.keep(res)) return;
            setErrors(r.errors);
            ShowToast("error", refusalText(r, ["issueIds", "reason"]));
        });
    }, [busy, dispatch, kept, onClose, onDone, reason, record.ref, selected]);

    return (
        <Modal
            busy={busy}
            title={actionLabel("dismissReview")}
            subtitle={translation("key_ins_close_issue_sub", { ref: record.ref })}
            onClose={kept.close}
            footer={(
                <>
                    <span className={styles.spacer} />
                    <Btn variant="secondary" onClick={kept.close}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? translation("key_saving") : actionLabel("dismissReview")}</Btn>
                </>
            )}
        >
            <div className={styles.form}>
                {kept.note}
                {/* C31: the guard requires at least one issue, so the group is marked required */}
                <div data-field="issueIds" role="radiogroup" aria-labelledby="ins-issue-label" aria-required="true">
                    <div className={styles.roK} id="ins-issue-label">{translation("key_ins_issues_reviewed")}<span className={styles.err}> *</span></div>
                    {record.issues.map((issue) => (
                        <div key={issue.id}>
                            <label className={styles.check}>
                                <input type="radio" name="ins-issue" checked={selected === issue.id} onChange={() => choose(issue.id)} />
                                <span>
                                    {issue.issue}
                                    <div className={`${styles.small} ${styles.muted}`}>{`${scopeLabel(record, issue.scope)} · ${fmtDateTime(issue.openedAt)}`}</div>
                                </span>
                            </label>
                        </div>
                    ))}
                    {errors.issueIds && <div className={styles.err} role="alert">{errors.issueIds}</div>}
                </div>
                <Field label={translation("key_ins_reason")} required htmlFor="ins-issue-reason" error={errors.reason}>
                    <TextArea id="ins-issue-reason" maxLength={500} rows={3} value={reason} invalid={!!errors.reason} onChange={(e) => { setReason(e.target.value); setErrors((p) => ({ ...p, reason: undefined })); }} />
                </Field>
            </div>
        </Modal>
    );
};

CloseIssueDialog.propTypes = {
    record: PropTypes.object.isRequired,
    issueId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default CloseIssueDialog;
