import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import { Field, FormGrid, SelectBox } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { fetchInsuranceMeta, renewInsuranceRecord } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { fmtDateLong, translation } from "../dashboard/insuranceDashboardConfig";
import { graceNotice, mustReload, newSubmissionKey, reasonsText, refusalOf, refusalText, requiredErrors } from "../shared/insuranceFormsConfig";
import InvoicePicker from "../shared/InvoicePicker";
import useKeptDraft from "../shared/useKeptDraft";
import styles from "../shared/InsuranceForms.module.css";

/* the fields this dialog shows: a server error for any other field is listed in the toast */
const RENDERED = ["planId", "requestedEffective", "invoiceId"];

/* D1 · Renew policy (forms.openRenew, M2). The current period keeps running; the request targets the next
   period start. Captures the record version when it opens; the server refuses a stale form. */
const RenewPolicyDialog = ({ record, onClose, onDone }) => {
    const dispatch = useDispatch();
    const meta = useSelector((state) => state.insurance.meta);
    const renewal = record.renewal || {};
    const opened = useRef({ factsVersion: record.factsVersion, submissionKey: newSubmissionKey() });
    const [planId, setPlanId] = useState(renewal.planId ? String(renewal.planId) : "");
    const [requestedEffective, setRequestedEffective] = useState(renewal.targetStart || "");
    const [invoice, setInvoice] = useState({ invoiceId: null, invoiceOverrideReason: null });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const kept = useKeptDraft(onClose, onDone);

    useEffect(() => { if (!meta) dispatch(fetchInsuranceMeta()); }, [dispatch, meta]);

    const clear = useCallback((field) => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev)), []);

    const onInvoice = useCallback(({ invoiceId, invoiceOverrideReason, invoice: row }) => {
        setInvoice({ invoiceId, invoiceOverrideReason, row: row || null });
        clear("invoiceId");
    }, [clear]);

    const submit = useCallback(() => {
        if (busy) return;
        // required fields first (same rules and copy as the server guard); nothing is sent while one is missing
        const missing = requiredErrors([
            ["planId", !planId, "key_ins_err_select_plan"],
            ["requestedEffective", !requestedEffective, "key_ins_err_requested_effective"],
            ["invoiceId", !invoice.invoiceId, "key_ins_err_select_invoice"],
            ["invoiceId", !!invoice.row && !invoice.row.eligible, "key_ins_invoice_cannot_be_used", { ref: invoice.row?.ref, reasons: reasonsText(invoice.row?.reasons) }],
        ]);
        if (Object.keys(missing).length) { setErrors(missing); return; }
        setBusy(true);
        kept.reset();
        const payload = {
            ref: record.ref,
            ...opened.current,
            planId: planId ? Number(planId) : null,
            requestedEffective: requestedEffective || null,
            invoiceId: invoice.invoiceId || null,
        };
        if (invoice.invoiceOverrideReason) payload.invoiceOverrideReason = invoice.invoiceOverrideReason;
        dispatch(renewInsuranceRecord(payload)).then((res) => {
            setBusy(false);
            if (!res.error) {
                ShowToast("success", res.payload?.message || translation("key_ins_renewal_requested"));
                onDone();
                onClose();
                return;
            }
            const r = refusalOf(res);
            if (mustReload(res)) { ShowToast("error", r.message); onClose(); onDone(); return; }
            if (kept.keep(res)) return;
            setErrors(r.errors);
            ShowToast("error", refusalText(r, RENDERED));
        });
    }, [busy, dispatch, invoice, kept, onClose, onDone, planId, record.ref, requestedEffective]);

    const grace = graceNotice(renewal.grace);

    return (
        <Modal
            busy={busy}
            title={translation("key_ins_renew_policy")}
            subtitle={translation("key_ins_renew_sub", { ref: record.ref, date: fmtDateLong(renewal.targetStart) || "—" })}
            width={860}
            onClose={kept.close}
            footer={(
                <>
                    <span className={styles.spacer} />
                    <Btn variant="secondary" onClick={kept.close}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? translation("key_saving") : translation("key_ins_submit_renewal")}</Btn>
                </>
            )}
        >
            <div className={styles.form}>
                {kept.note}
                {grace && <div className={styles.notice} data-tone={grace.tone}>{grace.text}</div>}
                {renewal.nextConfirmed && (
                    <div className={styles.notice}>{translation("key_ins_period_starting_confirmed", { date: fmtDateLong(renewal.nextConfirmed) })}</div>
                )}
                <FormGrid columns={2}>
                    <Field label={translation("key_ins_plan")} required htmlFor="ins-renew-plan" error={errors.planId}>
                        <SelectBox id="ins-renew-plan" value={planId} invalid={!!errors.planId} onChange={(e) => { setPlanId(e.target.value); clear("planId"); }}>
                            <option value="">{translation("key_ins_select_plan")}</option>
                            {(meta?.plans || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </SelectBox>
                    </Field>
                    <Field label={translation("key_ins_requested_effective_date")} required htmlFor="ins-renew-date" hint={translation("key_ins_issued_dates_hint")} error={errors.requestedEffective}>
                        <DateInput id="ins-renew-date" value={requestedEffective} invalid={!!errors.requestedEffective} onChange={(v) => { setRequestedEffective(v); clear("requestedEffective"); }} />
                    </Field>
                </FormGrid>
                <InvoicePicker
                    purpose="renew"
                    title={translation("key_ins_renewal_invoice")}
                    employerId={record.parties?.employer?.id || undefined}
                    workerId={record.parties?.worker?.id || undefined}
                    selectedId={invoice.invoiceId || undefined}
                    overrideReason={invoice.invoiceOverrideReason || ""}
                    error={errors.invoiceId}
                    onChange={onInvoice}
                />
            </div>
        </Modal>
    );
};

RenewPolicyDialog.propTypes = {
    record: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default RenewPolicyDialog;
