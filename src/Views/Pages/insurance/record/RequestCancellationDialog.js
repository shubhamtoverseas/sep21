import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import { Field, FormGrid, SelectBox, TextArea } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { fetchInsuranceMeta, requestInsuranceCancellation } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { endsDate, fmtDateLong, fmtDateShort, translation } from "../dashboard/insuranceDashboardConfig";
import { isBlank, mustReload, newSubmissionKey, refusalOf, refusalText, requiredErrors } from "../shared/insuranceFormsConfig";
import useKeptDraft from "../shared/useKeptDraft";
import styles from "../shared/InsuranceForms.module.css";
import { CANCELLATION_REASON_KEYS, actionLabel } from "./insuranceRecordConfig";

/* rules.cancellableperiods: in force or confirmed to start, without an accepted cancellation result */
const cancellable = (p) => (p.status === "active" || p.status === "future") && !p.cancellation;

/* D8 · Request cancellation (forms.openRequestCancellation, M9). Records the requested cancellation; coverage, dates and
   the Contract step do not change until the outcome is recorded. MaidMatch claims no provider submission: there is no
   "sent to QBE" confirmation. An explanation is required for Other only. Captures the period version when it opens. */
const RequestCancellationDialog = ({ record, onClose, onDone }) => {
    const dispatch = useDispatch();
    const meta = useSelector((state) => state.insurance.meta);
    const today = meta?.today || "";
    const periods = useMemo(() => record.periods.filter(cancellable), [record]);
    const submissionKey = useRef(newSubmissionKey());
    const versions = useRef(Object.fromEntries(periods.map((p) => [p.id, p.version])));
    const [periodId, setPeriodId] = useState(() => String(periods.find((p) => !p.openCancellation)?.id ?? ""));
    const [requestedEffective, setRequestedEffective] = useState(today);
    const [reason, setReason] = useState("");
    const [remarks, setRemarks] = useState("");
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const kept = useKeptDraft(onClose, onDone);

    useEffect(() => { if (!meta) dispatch(fetchInsuranceMeta()); }, [dispatch, meta]);
    /* the requested date defaults to today (Hong Kong coverage clock) once the meta arrives */
    useEffect(() => { if (meta?.today) setRequestedEffective((v) => v || meta.today); }, [meta]);

    const clear = useCallback((field) => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev)), []);
    const per = periods.find((p) => String(p.id) === periodId) || null;

    /* live hint (ENUMS §K3) */
    const hint = useMemo(() => {
        if (!per || !requestedEffective) return [translation("key_ins_cxl_hint_enter_date")];
        const range = `${fmtDateLong(per.effective)} – ${fmtDateLong(per.expiry)}`;
        const lines = [
            requestedEffective <= per.effective
                ? <><b>{translation("key_ins_cxl_hint_from_inception")}</b>{` — ${translation("key_ins_cxl_hint_from_inception_text", { period: range })}`}</>
                : requestedEffective > today
                    ? <><b>{translation("key_ins_cxl_hint_later")}</b>{` — ${translation("key_ins_cxl_hint_later_text", { ends: translation("key_ins_fact_ends", { date: fmtDateShort(endsDate(requestedEffective)) }) })}`}</>
                    : <><b>{translation("key_ins_cxl_hint_now")}</b>{` — ${translation("key_ins_cxl_hint_now_text")}`}</>,
        ];
        const later = record.periods.find((p) => p.id !== per.id && p.status === "future");
        if (later) lines.push(translation("key_ins_cxl_hint_period_not_affected", { date: fmtDateLong(later.effective) }));
        const open = record.requests.filter((q) => q.state === "pending" && q.type !== "Cancellation" && q.targetPeriodId === per.id).length;
        if (open) lines.push(translation("key_ins_cxl_hint_open_requests", { n: open }));
        return lines;
    }, [per, record, requestedEffective, today]);

    const submit = useCallback(() => {
        if (busy) return;
        // required fields first (same rules and copy as the server guard); nothing is sent while one is missing
        const missing = requiredErrors([
            ["periodId", !periodId, "key_ins_err_select_affected_period"],
            ["requestedEffective", !requestedEffective, "key_ins_err_requested_effective"],
            ["reason", !reason, "key_ins_err_select_the_reason"],
            ["remarks", reason === "Other" && isBlank(remarks), "key_ins_err_enter_remarks"],
        ]);
        if (Object.keys(missing).length) { setErrors(missing); return; }
        setBusy(true);
        kept.reset();
        dispatch(requestInsuranceCancellation({
            ref: record.ref,
            submissionKey: submissionKey.current,
            periodId: per ? per.id : null,
            periodVersion: per ? versions.current[per.id] : undefined,
            requestedEffective: requestedEffective || null,
            reason,
            remarks,
        })).then((res) => {
            setBusy(false);
            if (!res.error) {
                ShowToast("success", res.payload?.message || translation("key_ins_cxl_requested"));
                onDone();
                onClose();
                return;
            }
            const r = refusalOf(res);
            if (mustReload(res)) { ShowToast("error", r.message); onClose(); onDone(); return; }
            if (kept.keep(res)) return;
            setErrors(r.errors);
            ShowToast("error", refusalText(r, ["periodId", "requestedEffective", "reason", "remarks"]));
        });
    }, [busy, dispatch, kept, onClose, onDone, per, periodId, reason, record.ref, remarks, requestedEffective]);

    return (
        <Modal
            busy={busy}
            title={actionLabel("requestCancel")}
            subtitle={translation("key_ins_request_cxl_sub", { ref: record.ref })}
            width={860}
            onClose={kept.close}
            footer={(
                <>
                    <span className={styles.spacer} />
                    <Btn variant="secondary" onClick={kept.close}>{translation("key_cancel")}</Btn>
                    <Btn variant="danger" onClick={submit} disabled={busy}>{busy ? translation("key_saving") : translation("key_ins_create_cxl_request")}</Btn>
                </>
            )}
        >
            <div className={styles.form}>
                {kept.note}
                <div className={styles.notice}>{translation("key_ins_coverage_changes_on_outcome")}</div>
                <Field label={translation("key_ins_period")} required htmlFor="ins-cxl-period" error={errors.periodId}>
                    <SelectBox id="ins-cxl-period" value={periodId} invalid={!!errors.periodId} onChange={(e) => { setPeriodId(e.target.value); clear("periodId"); }}>
                        {periods.map((p) => (
                            <option key={p.id} value={p.id} disabled={!!p.openCancellation}>
                                {`${fmtDateLong(p.effective)} – ${fmtDateLong(p.expiry)} · ${p.carrierRef}${p.openCancellation ? ` · ${translation("key_ins_cxl_request_already_open")}` : ""}`}
                            </option>
                        ))}
                    </SelectBox>
                </Field>
                <FormGrid columns={2}>
                    <Field label={translation("key_ins_requested_effective_date")} required htmlFor="ins-cxl-date" hint={translation("key_ins_cxl_requested_date_hint")} error={errors.requestedEffective}>
                        <DateInput id="ins-cxl-date" value={requestedEffective} invalid={!!errors.requestedEffective} onChange={(v) => { setRequestedEffective(v); clear("requestedEffective"); }} />
                    </Field>
                    <Field label={translation("key_ins_reason")} required htmlFor="ins-cxl-reason" error={errors.reason}>
                        <SelectBox id="ins-cxl-reason" value={reason} invalid={!!errors.reason} onChange={(e) => { setReason(e.target.value); clear("reason"); }}>
                            <option value="">{translation("key_ins_select_reason")}</option>
                            {(meta?.cancellationReasons || []).map((v) => <option key={v} value={v}>{translation(CANCELLATION_REASON_KEYS[v]) || v}</option>)}
                        </SelectBox>
                    </Field>
                </FormGrid>
                <div className={styles.notice}>{hint.map((line, i) => <div key={i}>{line}</div>)}</div>
                <Field label={translation("key_ins_explanation")} required={reason === "Other"} htmlFor="ins-cxl-remarks" hint={translation("key_ins_cxl_explanation_hint")} error={errors.remarks}>
                    <TextArea id="ins-cxl-remarks" maxLength={2000} rows={3} value={remarks} invalid={!!errors.remarks} onChange={(e) => { setRemarks(e.target.value); clear("remarks"); }} />
                </Field>
            </div>
        </Modal>
    );
};

RequestCancellationDialog.propTypes = {
    record: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default RequestCancellationDialog;
