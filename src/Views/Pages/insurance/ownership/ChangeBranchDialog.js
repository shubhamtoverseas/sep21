import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import { Field, SelectBox, TextArea } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { changeInsuranceBranch, fetchInsuranceMeta } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { translation } from "../dashboard/insuranceDashboardConfig";
import { isBlank, mustReload, refusalOf, refusalText, requiredErrors } from "../shared/insuranceFormsConfig";
import useKeptDraft from "../shared/useKeptDraft";
import styles from "../shared/InsuranceForms.module.css";

/* D17 · Change Branch (ownership.js openChangeBranch, M15). Standalone records only; the CS Owner must have
   ownership scope for the new Branch and the reference never changes. Captures the record version when it opens. */
const ChangeBranchDialog = ({ record, onClose, onDone }) => {
    const dispatch = useDispatch();
    const meta = useSelector((state) => state.insurance.meta);
    const factsVersion = useRef(record.factsVersion);
    const current = record.summary?.branch;
    const owner = record.summary?.owner;
    const [branch, setBranch] = useState("");
    const [reason, setReason] = useState("");
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const kept = useKeptDraft(onClose, onDone);

    useEffect(() => { if (!meta) dispatch(fetchInsuranceMeta()); }, [dispatch, meta]);

    const submit = useCallback(() => {
        if (busy) return;
        // required fields first (same rules and copy as the server guard); nothing is sent while one is missing
        const missing = requiredErrors([
            ["branch", !branch, "key_ins_err_select_the_branch"],
            ["reason", isBlank(reason), "key_ins_err_enter_reason"],
        ]);
        if (Object.keys(missing).length) { setErrors(missing); return; }
        setBusy(true);
        kept.reset();
        dispatch(changeInsuranceBranch({ ref: record.ref, factsVersion: factsVersion.current, branch: branch ? Number(branch) : null, reason })).then((res) => {
            setBusy(false);
            if (!res.error) {
                ShowToast("success", res.payload?.message || translation("key_ins_branch_changed"));
                onDone();
                onClose();
                return;
            }
            const r = refusalOf(res);
            if (mustReload(res)) { ShowToast("error", r.message); onClose(); onDone(); return; }
            if (kept.keep(res)) return;
            setErrors(r.errors);
            ShowToast("error", refusalText(r, ["branch", "reason"]));
        });
    }, [branch, busy, dispatch, kept, onClose, onDone, reason, record.ref]);

    return (
        <Modal
            busy={busy}
            title={translation("key_ins_action_change_branch")}
            subtitle={record.ref}
            onClose={kept.close}
            footer={(
                <>
                    <span className={styles.spacer} />
                    <Btn variant="secondary" onClick={kept.close}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? translation("key_saving") : translation("key_ins_action_change_branch")}</Btn>
                </>
            )}
        >
            <div className={styles.form}>
                {kept.note}
                <div className={styles.ro}>
                    <span className={styles.roK}>{translation("key_ins_current_branch")}</span>
                    <span className={styles.roV}>{current ? `${current.name} (${current.code})` : "—"}</span>
                </div>
                <Field
                    label={translation("key_ins_new_branch")}
                    required
                    htmlFor="ins-branch-new"
                    hint={translation("key_ins_new_branch_hint", { owner: owner?.name || "—" })}
                    error={errors.branch}
                >
                    <SelectBox id="ins-branch-new" value={branch} invalid={!!errors.branch} onChange={(e) => { setBranch(e.target.value); setErrors((p) => ({ ...p, branch: undefined })); }}>
                        <option value="">{translation("key_ins_select_branch_option")}</option>
                        {(meta?.allBranches || []).filter((b) => b.id !== current?.id).map((b) => <option key={b.id} value={b.id}>{`${b.name} (${b.code})`}</option>)}
                    </SelectBox>
                </Field>
                <Field label={translation("key_ins_reason")} required htmlFor="ins-branch-reason" error={errors.reason}>
                    <TextArea id="ins-branch-reason" maxLength={500} rows={2} value={reason} invalid={!!errors.reason} onChange={(e) => { setReason(e.target.value); setErrors((p) => ({ ...p, reason: undefined })); }} />
                </Field>
            </div>
        </Modal>
    );
};

ChangeBranchDialog.propTypes = {
    record: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default ChangeBranchDialog;
