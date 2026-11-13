import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import Icon from "../../../../components/Icon/Icon";
import { Field, FormGrid, SelectBox, TextArea } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { changeInsuranceOwners, fetchInsuranceMeta, fetchInsuranceOwnerRecipients } from "../../../../redux/Slices/insurance/InsuranceSlice";
import routes from "../../routes/routesConfig";
import { translation } from "../dashboard/insuranceDashboardConfig";
import { isBlank, refusalOf, refusalText, requiredErrors } from "../shared/insuranceFormsConfig";
import styles from "../shared/InsuranceForms.module.css";
import { ownerPreview, recipientLabel } from "./ownershipConfig";

/* D14 · Change CS Owner (ownership.js openChangeOwner, M14): one record, the selected records or a complete
   portfolio. Standalone records only; the Branch is kept. Every record is validated against the recipient
   before applying (the server re-checks each one); a bulk or portfolio change ends on the Handover result. */
const ChangeOwnerDialog = ({ mode, targets, portfolioOwnerId, onClose, onDone }) => {
    const dispatch = useDispatch();
    const meta = useSelector((state) => state.insurance.meta);
    const canOpen = !!meta?.caps?.detailsView;
    const [recipients, setRecipients] = useState(null);
    const [recipientId, setRecipientId] = useState("");
    const [reason, setReason] = useState("");
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    /* the preview's open-record rule follows R5; it waits until R5 is loaded (record pages opened directly) */
    useEffect(() => { if (!meta) dispatch(fetchInsuranceMeta()); }, [dispatch, meta]);

    useEffect(() => {
        dispatch(fetchInsuranceOwnerRecipients()).then((res) => {
            if (res.error) { ShowToast("error", refusalOf(res).message); setRecipients([]); return; }
            setRecipients(res.payload?.data?.recipients || []);
        });
    }, [dispatch]);

    // the current owner is not offered in single mode (ownership.js recipientOptions)
    const exclude = mode === "single" ? targets[0]?.owner?.id : null;
    const options = useMemo(() => (recipients || []).filter((r) => r.id !== exclude), [recipients, exclude]);
    const recipient = options.find((r) => String(r.id) === recipientId) || null;
    const linked = targets.filter((t) => t.contract);
    const preview = useMemo(() => (recipient && meta ? targets.map((t) => ({ target: t, ...ownerPreview(t, recipient, canOpen) })) : []), [canOpen, meta, recipient, targets]);
    const okCount = preview.filter((p) => p.ok).length;

    const submit = useCallback(() => {
        if (busy) return;
        // required fields first (same rules and copy as the server guard); nothing is sent while one is missing
        const missing = requiredErrors([
            ["recipientId", !recipientId, "key_ins_err_select_the_recipient"],
            ["reason", isBlank(reason), "key_ins_err_enter_reason"],
        ]);
        if (Object.keys(missing).length) { setErrors(missing); return; }
        setBusy(true);
        const payload = { recipientId: recipientId ? Number(recipientId) : null, reason };
        if (mode === "portfolio") payload.portfolioOwnerId = portfolioOwnerId;
        else payload.refs = targets.map((t) => t.ref);
        dispatch(changeInsuranceOwners(payload)).then((res) => {
            setBusy(false);
            if (!res.error) {
                ShowToast("success", res.payload?.message);
                onDone(mode === "single" ? null : res.payload?.data);
                return;
            }
            const r = refusalOf(res);
            setErrors(r.errors);
            ShowToast("error", refusalText(r, ["recipientId", "reason"]));
        });
    }, [busy, dispatch, mode, onDone, portfolioOwnerId, reason, recipientId, targets]);

    const title = mode === "single" ? translation("key_ins_change_cs_owner")
        : mode === "bulk" ? translation("key_ins_change_cs_owner_n", { n: targets.length })
            : translation("key_ins_complete_portfolio_handover");

    return (
        <Modal
            busy={busy}
            title={title}
            subtitle={translation("key_ins_change_owner_sub")}
            width={860}
            onClose={onClose}
            footer={(
                <>
                    <span className={styles.spacer} />
                    <Btn variant="secondary" onClick={onClose}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" onClick={submit} disabled={busy}>
                        {busy ? translation("key_saving") : translation(mode === "single" ? "key_ins_change_cs_owner" : "key_ins_apply_to_eligible")}
                    </Btn>
                </>
            )}
        >
            <div className={styles.form}>
                {linked.length > 0 && (
                    <div className={styles.notice} data-tone="warn">
                        {translation("key_ins_n_follow_contract", { n: linked.length })}{" "}
                        {linked.map((t, i) => (
                            <React.Fragment key={t.ref}>
                                {i ? ", " : ""}
                                <Link className={styles.code} to={routes.processingDetails.replace(":contract_id", t.contract.id)}>{t.contract.number}</Link>
                            </React.Fragment>
                        ))}
                    </div>
                )}
                {!recipients || !meta ? <CustomSpinner /> : (
                    <FormGrid columns={2}>
                        <Field label={translation("key_ins_recipient")} required htmlFor="ins-owner-recipient" hint={translation("key_ins_recipient_hint")} error={errors.recipientId}>
                            <SelectBox id="ins-owner-recipient" value={recipientId} invalid={!!errors.recipientId} onChange={(e) => { setRecipientId(e.target.value); setErrors((p) => ({ ...p, recipientId: undefined })); }}>
                                <option value="">{translation("key_ins_select_recipient")}</option>
                                {options.map((r) => <option key={r.id} value={r.id}>{recipientLabel(r)}</option>)}
                            </SelectBox>
                        </Field>
                        <Field label={translation("key_ins_reason")} required htmlFor="ins-owner-reason" error={errors.reason}>
                            <TextArea id="ins-owner-reason" maxLength={500} rows={2} value={reason} invalid={!!errors.reason} onChange={(e) => { setReason(e.target.value); setErrors((p) => ({ ...p, reason: undefined })); }} />
                        </Field>
                    </FormGrid>
                )}
                <div className={styles.picklist}>
                    {!recipient ? <div className={styles.empty}>{translation("key_ins_select_recipient_to_validate")}</div> : (
                        <>
                            <div className={styles.pickerHead}>
                                <b>{translation("key_ins_records")}</b>
                                <span className={styles.muted}>{translation("key_ins_n_will_update", { ok: okCount, no: preview.length - okCount })}</span>
                            </div>
                            {preview.map((p) => (
                                <div key={p.target.ref} className={`${styles.prow} ${p.ok ? "" : styles.prowIneligible}`}>
                                    <Icon name={p.ok ? "check" : "x"} size={14} />
                                    <div className={styles.prowMain}>
                                        <div className={styles.l1}>
                                            <span className={styles.code}>{p.target.ref}</span> {p.target.worker}{" "}
                                            <span className={`${styles.muted} ${styles.small}`}>
                                                {translation("key_ins_owner_branch_line", { owner: p.target.owner?.name || "—", branch: p.target.branch?.name || "—" })}
                                            </span>
                                        </div>
                                        <div className={styles.l2}>{p.why}</div>
                                    </div>
                                    <div className={`${styles.why} ${p.ok ? styles.whyOk : ""}`}>{p.ok ? translation("key_ins_ok") : translation("key_ins_cannot_update")}</div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
};

ChangeOwnerDialog.propTypes = {
    mode: PropTypes.oneOf(["single", "bulk", "portfolio"]).isRequired,
    targets: PropTypes.arrayOf(PropTypes.object).isRequired,
    portfolioOwnerId: PropTypes.number,
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default ChangeOwnerDialog;
