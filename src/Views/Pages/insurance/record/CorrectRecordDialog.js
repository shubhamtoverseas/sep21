import React, { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import { Field, FormGrid, SelectBox, TextArea } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { correctInsuranceRecord } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { fmtDateLong, fmtDateTime, translation } from "../dashboard/insuranceDashboardConfig";
import { isBlank, mustReload, refusalOf, refusalText, requiredErrors } from "../shared/insuranceFormsConfig";
import useKeptDraft from "../shared/useKeptDraft";
import styles from "../shared/InsuranceForms.module.css";
import { REQUEST_STATE, actionLabel, requestTypeText } from "./insuranceRecordConfig";

/* Correction kinds (ENUMS §L) in the dialog's order */
const KINDS = [
    { value: "cancellation", key: "key_ins_correction_cancellation" },
    { value: "confirmation", key: "key_ins_correction_confirmation" },
    { value: "dates", key: "key_ins_correction_dates" },
    { value: "request", key: "key_ins_correction_request" },
];
const CLOSED = ["rejected", "withdrawn", "declined"];

/* D13 · Correct record (forms.openCorrect, M13). One of the four supported corrections with the QBE facts; on
   success the Activity tab opens. Captures the record version when it opens. */
const CorrectRecordDialog = ({ record, onClose, onDone }) => {
    const dispatch = useDispatch();
    const factsVersion = useRef(record.factsVersion);
    const [kind, setKind] = useState("");
    const [periodId, setPeriodId] = useState("");
    const [requestId, setRequestId] = useState("");
    const [effective, setEffective] = useState("");
    const [expiry, setExpiry] = useState("");
    const [facts, setFacts] = useState("");
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const kept = useKeptDraft(onClose, onDone);

    const clear = useCallback((field) => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev)), []);
    const periods = [...record.periods, ...record.voidedPeriods];
    const closed = record.requests.filter((q) => CLOSED.includes(q.state));

    const submit = useCallback(() => {
        if (busy) return;
        // required fields first (same rules and copy as the server guard); nothing is sent while one is missing
        const missing = requiredErrors([
            ["kind", !kind, "key_ins_err_select_what_recorded_in_error"],
            ["requestId", kind === "request" && !requestId, "key_ins_err_select_the_request"],
            ["periodId", !!kind && kind !== "request" && !periodId, "key_ins_err_select_affected_period"],
            ["effective", kind === "dates" && !effective, "key_ins_err_corrected_effective_required"],
            ["expiry", kind === "dates" && !expiry, "key_ins_err_corrected_expiry_required"],
            ["carrierFacts", isBlank(facts), "key_ins_err_enter_carrier_facts"],
        ]);
        if (Object.keys(missing).length) { setErrors(missing); return; }
        setBusy(true);
        kept.reset();
        const payload = { ref: record.ref, factsVersion: factsVersion.current, kind, carrierFacts: facts };
        if (kind === "request") payload.requestId = requestId ? Number(requestId) : null;
        else if (kind) payload.periodId = periodId ? Number(periodId) : null;
        if (kind === "dates") { payload.effective = effective || null; payload.expiry = expiry || null; }
        dispatch(correctInsuranceRecord(payload)).then((res) => {
            setBusy(false);
            if (!res.error) {
                ShowToast("success", res.payload?.message || translation("key_ins_correction_recorded"));
                onDone("activity");
                onClose();
                return;
            }
            const r = refusalOf(res);
            if (mustReload(res)) { ShowToast("error", r.message); onClose(); onDone(); return; }
            if (kept.keep(res)) return;
            setErrors(r.errors);
            ShowToast("error", refusalText(r, ["kind", "requestId", "periodId", "effective", "expiry", "carrierFacts"]));
        });
    }, [busy, dispatch, effective, expiry, facts, kept, kind, onClose, onDone, periodId, record.ref, requestId]);

    return (
        <Modal
            busy={busy}
            title={actionLabel("correctStatus")}
            subtitle={record.ref}
            width={860}
            onClose={kept.close}
            footer={(
                <>
                    <span className={styles.spacer} />
                    <Btn variant="secondary" onClick={kept.close}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? translation("key_saving") : translation("key_ins_record_correction")}</Btn>
                </>
            )}
        >
            <div className={styles.form}>
                {kept.note}
                <Field label={translation("key_ins_correction")} required htmlFor="ins-fix-kind" error={errors.kind}>
                    <SelectBox id="ins-fix-kind" value={kind} invalid={!!errors.kind} onChange={(e) => { setKind(e.target.value); setErrors({}); }}>
                        <option value="">{translation("key_ins_select")}</option>
                        {KINDS.map((k) => <option key={k.value} value={k.value}>{translation(k.key)}</option>)}
                    </SelectBox>
                </Field>
                {kind === "request" && (
                    <Field label={translation("key_ins_request")} required htmlFor="ins-fix-request" error={errors.requestId}>
                        <SelectBox id="ins-fix-request" value={requestId} invalid={!!errors.requestId} onChange={(e) => { setRequestId(e.target.value); clear("requestId"); }}>
                            <option value="">{translation("key_ins_select_request")}</option>
                            {closed.map((q) => (
                                <option key={q.id} value={q.id}>
                                    {[requestTypeText(q.type), translation(REQUEST_STATE[q.state].key), fmtDateTime(q.closed?.by?.at || q.outcome?.recordedAt || q.submittedBy?.at)].join(" · ")}
                                </option>
                            ))}
                        </SelectBox>
                    </Field>
                )}
                {kind && kind !== "request" && (
                    <Field label={translation("key_ins_period")} required htmlFor="ins-fix-period" error={errors.periodId}>
                        <SelectBox id="ins-fix-period" value={periodId} invalid={!!errors.periodId} onChange={(e) => { setPeriodId(e.target.value); clear("periodId"); }}>
                            <option value="">{translation("key_ins_select_period")}</option>
                            {/* forms.openCorrect shows the internal period status (PACKAGE_INDEX §5A) */}
                            {periods.map((p) => (
                                <option key={p.id} value={p.id}>{`${fmtDateLong(p.effective)} – ${fmtDateLong(p.expiry)} · ${p.carrierRef} · ${p.voided ? "voided" : p.status}`}</option>
                            ))}
                        </SelectBox>
                    </Field>
                )}
                {kind === "dates" && (
                    <FormGrid columns={2}>
                        <Field label={translation("key_ins_corrected_effective")} required htmlFor="ins-fix-eff" error={errors.effective}>
                            <DateInput id="ins-fix-eff" value={effective} invalid={!!errors.effective} onChange={(v) => { setEffective(v); clear("effective"); }} />
                        </Field>
                        <Field label={translation("key_ins_corrected_expiry")} required htmlFor="ins-fix-exp" error={errors.expiry}>
                            <DateInput id="ins-fix-exp" value={expiry} invalid={!!errors.expiry} onChange={(v) => { setExpiry(v); clear("expiry"); }} />
                        </Field>
                    </FormGrid>
                )}
                <Field label={translation("key_ins_qbe_facts")} required htmlFor="ins-fix-facts" error={errors.carrierFacts}>
                    <TextArea id="ins-fix-facts" maxLength={2000} rows={3} value={facts} invalid={!!errors.carrierFacts} onChange={(e) => { setFacts(e.target.value); clear("carrierFacts"); }} />
                </Field>
            </div>
        </Modal>
    );
};

CorrectRecordDialog.propTypes = {
    record: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default CorrectRecordDialog;
