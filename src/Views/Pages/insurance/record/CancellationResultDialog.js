import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import { Field, FormGrid, TextArea, TextInput } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { fetchInsuranceMeta, recordInsuranceCancellationResult } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { endsDate, fmtDateLong, fmtDateShort, fmtDateTime, translation } from "../dashboard/insuranceDashboardConfig";
import { isBlank, mustReload, newSubmissionKey, refusalOf, refusalText, requiredErrors } from "../shared/insuranceFormsConfig";
import useKeptDraft from "../shared/useKeptDraft";
import styles from "../shared/InsuranceForms.module.css";
import { CONFIRMED_DONE_KEYS, confirmLabel } from "./insuranceRecordConfig";

/* D9 · Record cancellation outcome (forms.openCancellationResult, M10). Accepted puts the
   QBE-confirmed cancellation on the period; declined closes the request and leaves the period as it is.
   Captures the request and period versions when it opens; the server refuses a stale form. */
const CancellationResultDialog = ({ record, request: rq, onClose, onDone }) => {
    const dispatch = useDispatch();
    const meta = useSelector((state) => state.insurance.meta);
    const today = meta?.today || "";
    const per = rq.cancellationPeriod;
    const opened = useRef({ submissionKey: newSubmissionKey(), requestVersion: rq.version, periodVersion: per?.version });
    const [outcome, setOutcome] = useState("");
    const [effective, setEffective] = useState(rq.requestedEffective || "");
    const [carrierRef, setCarrierRef] = useState("");
    const [reason, setReason] = useState(rq.reason || "");
    const [remarks, setRemarks] = useState("");
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const kept = useKeptDraft(onClose, onDone);

    useEffect(() => { if (!meta) dispatch(fetchInsuranceMeta()); }, [dispatch, meta]);

    const clear = useCallback((field) => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev)), []);
    const range = per ? `${fmtDateLong(per.effective)} – ${fmtDateLong(per.expiry)}` : "—";

    /* live hint (ENUMS §K3) */
    const hint = useMemo(() => {
        if (outcome === "declined") return [<><b>{translation("key_ins_cxl_declined")}</b>{` — ${translation("key_ins_cxl_result_hint_declined")}`}</>];
        if (outcome !== "accepted" || !per) return [translation("key_ins_cxl_result_hint_select")];
        if (!effective) return [translation("key_ins_cxl_result_hint_enter_date")];
        const none = translation("key_ins_coverage_none");
        const lines = [
            effective <= per.effective
                ? <><b>{translation("key_ins_fact_cancelled_inception")}</b>{` — ${translation("key_ins_cxl_result_hint_inception", { period: range, none })}`}</>
                : effective > today
                    ? <><b>{translation("key_ins_cxl_accepted")}</b>{` — ${translation("key_ins_cxl_result_hint_scheduled", { active: translation("key_ins_coverage_active"), ends: translation("key_ins_fact_ends", { date: fmtDateShort(endsDate(effective)) }) })}`}</>
                    : <><b>{translation("key_ins_fact_cancelled")}</b>{` ${translation("key_ins_cxl_result_hint_now", { date: fmtDateLong(effective), none })}`}</>,
        ];
        const later = record.periods.find((p) => p.id !== per.id && p.status === "future");
        if (later) lines.push(translation("key_ins_cxl_hint_period_not_affected", { date: fmtDateLong(later.effective) }));
        return lines;
    }, [effective, outcome, per, range, record, today]);

    const submit = useCallback(() => {
        if (busy) return;
        // required fields first (same rules and copy as the server guard); nothing is sent while one is missing
        const missing = requiredErrors([
            ["outcome", outcome !== "accepted" && outcome !== "declined", "key_ins_err_select_qbe_outcome"],
            ["effective", outcome === "accepted" && !effective, "key_ins_err_qbe_confirmed_effective_required"],
            ["reason", isBlank(reason), outcome === "declined" ? "key_ins_err_enter_reason_qbe_gave" : "key_ins_err_enter_confirmed_reason"],
        ]);
        if (Object.keys(missing).length) { setErrors(missing); return; }
        setBusy(true);
        kept.reset();
        const payload = { ref: record.ref, requestId: rq.id, ...opened.current, outcome: outcome || null, reason, carrierRef, remarks };
        if (outcome === "accepted") payload.effective = effective || null;
        dispatch(recordInsuranceCancellationResult(payload)).then((res) => {
            setBusy(false);
            if (!res.error) {
                ShowToast("success", res.payload?.message || translation(CONFIRMED_DONE_KEYS.Cancellation));
                onDone();
                onClose();
                return;
            }
            const r = refusalOf(res);
            if (mustReload(res)) { ShowToast("error", r.message); onClose(); onDone(); return; }
            if (kept.keep(res)) return;
            setErrors(r.errors);
            ShowToast("error", refusalText(r, ["outcome", "effective", "carrierRef", "reason", "remarks"]));
        });
    }, [busy, carrierRef, dispatch, effective, kept, onClose, onDone, outcome, reason, record.ref, remarks, rq.id]);

    return (
        <Modal
            busy={busy}
            title={confirmLabel("Cancellation")}
            subtitle={translation("key_ins_cxl_result_sub", {
                ref: record.ref,
                period: per ? `${range} (${per.carrierRef})` : "—",
                at: rq.submittedBy?.at ? fmtDateTime(rq.submittedBy.at) : "—",
            })}
            width={860}
            onClose={kept.close}
            footer={(
                <>
                    <span className={styles.spacer} />
                    <Btn variant="secondary" onClick={kept.close}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? translation("key_saving") : confirmLabel("Cancellation")}</Btn>
                </>
            )}
        >
            <div className={styles.form}>
                {kept.note}
                <div className={styles.ro}>
                    <span className={styles.roK}>{translation("key_ins_requested")}</span>
                    <span className={styles.roV}>
                        {[translation("key_ins_effective_date", { date: fmtDateLong(rq.requestedEffective) }), rq.reason, rq.remarks].filter(Boolean).join(" · ")}
                    </span>
                </div>
                <div data-field="outcome" role="radiogroup" aria-labelledby="ins-cxl-outcome-label" aria-required="true">
                    <div className={styles.roK} id="ins-cxl-outcome-label">{translation("key_ins_qbe_outcome_label")}<span className={styles.err}> *</span></div>
                    {["accepted", "declined"].map((v) => (
                        <div key={v}>
                            <label className={styles.check}>
                                <input type="radio" name="ins-cxl-outcome" value={v} checked={outcome === v} onChange={() => { setOutcome(v); clear("outcome"); }} />
                                <span>{translation(v === "accepted" ? "key_ins_cxl_outcome_accepted" : "key_ins_cxl_outcome_declined")}</span>
                            </label>
                        </div>
                    ))}
                    {errors.outcome && <div className={styles.err} role="alert">{errors.outcome}</div>}
                </div>
                <div className={styles.notice}>{hint.map((line, i) => <div key={i}>{line}</div>)}</div>
                <FormGrid columns={2}>
                    {outcome === "accepted" ? (
                        <Field label={translation("key_ins_qbe_confirmed_effective_date")} required htmlFor="ins-cxl-eff" error={errors.effective}>
                            <DateInput id="ins-cxl-eff" value={effective} invalid={!!errors.effective} onChange={(v) => { setEffective(v); clear("effective"); }} />
                        </Field>
                    ) : <div />}
                    <Field label={translation("key_ins_qbe_reference")} htmlFor="ins-cxl-ref" hint={translation("key_ins_optional_add_later")} error={errors.carrierRef}>
                        <TextInput id="ins-cxl-ref" maxLength={100} value={carrierRef} onChange={(e) => { setCarrierRef(e.target.value); clear("carrierRef"); }} />
                    </Field>
                </FormGrid>
                <Field label={translation(outcome === "declined" ? "key_ins_reason_qbe_gave" : "key_ins_confirmed_reason")} required htmlFor="ins-cxl-reason" error={errors.reason}>
                    <TextInput id="ins-cxl-reason" maxLength={500} value={reason} invalid={!!errors.reason} onChange={(e) => { setReason(e.target.value); clear("reason"); }} />
                </Field>
                <Field label={translation("key_ins_outcome_details")} htmlFor="ins-cxl-remarks" error={errors.remarks}>
                    <TextArea id="ins-cxl-remarks" maxLength={2000} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </Field>
            </div>
        </Modal>
    );
};

CancellationResultDialog.propTypes = {
    record: PropTypes.object.isRequired,
    request: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default CancellationResultDialog;
