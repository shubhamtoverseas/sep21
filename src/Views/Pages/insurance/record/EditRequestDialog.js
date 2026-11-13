import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import { Field, FormGrid, SelectBox, TextArea } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { editInsuranceRequest, fetchInsuranceMeta } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { translation } from "../dashboard/insuranceDashboardConfig";
import { isBlank, mustReload, refusalOf, refusalText, requiredErrors } from "../shared/insuranceFormsConfig";
import InvoicePicker from "../shared/InvoicePicker";
import useKeptDraft from "../shared/useKeptDraft";
import styles from "../shared/InsuranceForms.module.css";
import { CHARGE_OPTIONS, actionLabel, requestTypeText } from "./insuranceRecordConfig";

/* D5 · Edit request (forms.openEdit, M5). An open request only; every edit needs a reason and the server
   refuses a stale form ("Reopen it to see the current values."). */
const EditRequestDialog = ({ record, request: rq, onClose, onDone }) => {
    const dispatch = useDispatch();
    const meta = useSelector((state) => state.insurance.meta);
    const requestVersion = useRef(rq.version);
    const hasPlan = rq.type === "New" || rq.type === "Renew";
    const isChange = rq.type === "Endorsement";
    const isRider = isChange && rq.endorsement?.type === "rider";
    const [planId, setPlanId] = useState(rq.planId ? String(rq.planId) : "");
    const [requestedEffective, setRequestedEffective] = useState(rq.requestedEffective || "");
    const [charge, setCharge] = useState(isRider ? "yes" : (rq.chargeApplies || "unknown"));
    const [invoice, setInvoice] = useState({ invoiceId: rq.invoice?.id ?? null, invoiceOverrideReason: rq.invoiceOverrideReason ?? null });
    const [reason, setReason] = useState("");
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const kept = useKeptDraft(onClose, onDone);

    useEffect(() => { if (!meta && hasPlan) dispatch(fetchInsuranceMeta()); }, [dispatch, hasPlan, meta]);

    const clear = useCallback((field) => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev)), []);

    const submit = useCallback(() => {
        if (busy) return;
        // required fields first (same rules and copy as the server guard); nothing is sent while one is missing
        const missing = requiredErrors([
            ["planId", hasPlan && !!rq.planId && !planId, "key_ins_err_select_a_plan"],
            ["requestedEffective", !!rq.requestedEffective && !requestedEffective, "key_ins_err_requested_effective"],
            ["invoiceId", !!rq.invoice && !invoice.invoiceId && (rq.type !== "Endorsement" || charge === "yes"), "key_ins_err_eligible_invoice_required"],
            ["reason", isBlank(reason), "key_ins_err_enter_reason"],
        ]);
        if (Object.keys(missing).length) { setErrors(missing); return; }
        setBusy(true);
        kept.reset();
        const payload = { ref: record.ref, requestId: rq.id, requestVersion: requestVersion.current, reason };
        if (hasPlan) payload.planId = planId ? Number(planId) : null;
        if (rq.requestedEffective) payload.requestedEffective = requestedEffective || null;
        if (isChange) payload.chargeApplies = charge;
        /* the invoice is sent only when the actor can see it in the picker (Invoice permission family) */
        if (rq.invoice || !rq.hasInvoice) {
            payload.invoiceId = invoice.invoiceId || null;
            payload.invoiceOverrideReason = invoice.invoiceOverrideReason || null;
        }
        dispatch(editInsuranceRequest(payload)).then((res) => {
            setBusy(false);
            if (!res.error) {
                ShowToast("success", res.payload?.message || translation("key_ins_request_updated"));
                onDone();
                onClose();
                return;
            }
            const r = refusalOf(res);
            if (mustReload(res)) { ShowToast("error", r.message); onClose(); onDone(); return; }
            if (kept.keep(res)) return;
            setErrors(r.errors);
            ShowToast("error", refusalText(r, ["planId", "requestedEffective", "chargeApplies", "invoiceId", "reason"]));
        });
    }, [busy, charge, dispatch, hasPlan, invoice, isChange, kept, onClose, onDone, planId, reason, record.ref, requestedEffective, rq]);

    return (
        <Modal
            busy={busy}
            title={actionLabel("editRequest")}
            subtitle={translation("key_ins_edit_request_sub", { ref: record.ref, type: requestTypeText(rq.type) })}
            width={860}
            onClose={kept.close}
            footer={(
                <>
                    <span className={styles.spacer} />
                    <Btn variant="secondary" onClick={kept.close}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? translation("key_saving") : translation("key_save")}</Btn>
                </>
            )}
        >
            <div className={styles.form}>
                {kept.note}
                <FormGrid columns={2}>
                    {hasPlan && (
                        <Field label={translation("key_ins_requested_plan")} htmlFor="ins-edit-plan" error={errors.planId}>
                            <SelectBox id="ins-edit-plan" value={planId} invalid={!!errors.planId} onChange={(e) => { setPlanId(e.target.value); clear("planId"); }}>
                                {(meta?.plans || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </SelectBox>
                        </Field>
                    )}
                    {rq.requestedEffective && (
                        <Field label={translation("key_ins_requested_effective_date")} required htmlFor="ins-edit-date" hint={translation("key_ins_issued_dates_hint")} error={errors.requestedEffective}>
                            <DateInput id="ins-edit-date" value={requestedEffective} invalid={!!errors.requestedEffective} onChange={(v) => { setRequestedEffective(v); clear("requestedEffective"); }} />
                        </Field>
                    )}
                    {isChange && (
                        <Field label={translation("key_ins_additional_charge")} htmlFor="ins-edit-charge" error={errors.chargeApplies}>
                            <SelectBox id="ins-edit-charge" value={charge} disabled={isRider} onChange={(e) => { setCharge(e.target.value); clear("chargeApplies"); }}>
                                {CHARGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{translation(o.key)}</option>)}
                            </SelectBox>
                        </Field>
                    )}
                </FormGrid>
                {(rq.invoice || !rq.hasInvoice) && (
                    <InvoicePicker
                        purpose="edit"
                        title={translation("key_invoice")}
                        employerId={record.parties?.employer?.id || undefined}
                        workerId={record.parties?.worker?.id || undefined}
                        selectedId={invoice.invoiceId || undefined}
                        overrideReason={invoice.invoiceOverrideReason || ""}
                        error={errors.invoiceId}
                        onChange={({ invoiceId, invoiceOverrideReason }) => { setInvoice({ invoiceId, invoiceOverrideReason }); clear("invoiceId"); }}
                    />
                )}
                <Field label={translation("key_ins_reason")} required htmlFor="ins-edit-reason" error={errors.reason}>
                    <TextArea id="ins-edit-reason" maxLength={500} rows={2} value={reason} onChange={(e) => { setReason(e.target.value); clear("reason"); }} />
                </Field>
            </div>
        </Modal>
    );
};

EditRequestDialog.propTypes = {
    record: PropTypes.object.isRequired,
    request: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default EditRequestDialog;
