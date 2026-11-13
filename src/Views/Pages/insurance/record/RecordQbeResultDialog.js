import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import { Field, FormGrid, SelectBox, TextArea, TextInput } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { checkInsuranceCarrierRef, fetchInsuranceMeta, recordInsuranceQbeResult } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { fmtDateLong, fmtDateTime, translation } from "../dashboard/insuranceDashboardConfig";
import { graceNotice, invoiceStatusText, invoiceTypeLabel, isBlank, mustReload, needsCarrierAcceptance, newSubmissionKey, reasonsText, refusalOf, refusalText, requiredErrors } from "../shared/insuranceFormsConfig";
import useKeptDraft from "../shared/useKeptDraft";
import styles from "../shared/InsuranceForms.module.css";
import { CHARGE_OPTIONS, CONFIRMED_DONE_KEYS, confirmLabel, requestTypeText } from "./insuranceRecordConfig";

const CHECK_DEBOUNCE_MS = 350;

/* D4 · Confirm policy / renewal / additional coverage / changes (forms.openConfirm, M6 + R8), titled for the request type.
   New, Renewal, Additional coverage and Change policy
   requests: coverage and changes record a QBE reference (required for a rider only), a change shows its
   old → new rows ("Change to confirm") and resolves the charge, a late renewal asks the confirmer to establish carrier
   acceptance and saves its note (Q-10). A worker reassignment shows the CS Owner and Branch it brings from the new governing
   Contract, and says so when Change Governing Contract is not granted. Captures the request and record versions when it
   opens; the server refuses a stale form. */
const RecordQbeResultDialog = ({ record, request: rq, onClose, onDone }) => {
    const dispatch = useDispatch();
    const meta = useSelector((state) => state.insurance.meta);
    const today = meta?.today;
    const canOverride = useSelector((state) => !!state.insurance.meta?.caps?.carrierRefDupOverride);
    const canChangeContract = useSelector((state) => !!state.insurance.meta?.caps?.changeGoverningContract);
    const isChange = rq.type === "Endorsement";
    const change = isChange ? rq.endorsement || {} : null;
    const changeType = change?.type;
    const opened = useRef({ requestVersion: rq.version, factsVersion: record.factsVersion, submissionKey: newSubmissionKey() });
    const [carrierRef, setCarrierRef] = useState("");
    const [effective, setEffective] = useState(rq.requestedEffective || "");
    const [expiry, setExpiry] = useState("");
    const [dup, setDup] = useState(null);
    const [overrideReason, setOverrideReason] = useState("");
    const [acceptance, setAcceptance] = useState(false);
    const [acceptanceNote, setAcceptanceNote] = useState("");
    const [charge, setCharge] = useState(changeType === "rider" ? "yes" : (rq.chargeApplies || "unknown"));
    const [confirmedExpiry, setConfirmedExpiry] = useState(change?.fields?.newExpiry || "");
    const [confirmedEffective, setConfirmedEffective] = useState(change?.fields?.newEffective || "");
    /* the accepted address / name of a correction: pre-filled with the requested value, editable; the server applies it and
       keeps the requested one apart (owner decision P6C-2, 11 Nov 2026; forms.openConfirm confirmedAddress / confirmedName) */
    const [confirmedAddress, setConfirmedAddress] = useState(change?.fields?.newAddress || "");
    const [confirmedName, setConfirmedName] = useState(change?.fields?.newName || "");
    const [errors, setErrors] = useState({});
    const grace = rq.type === "Renew" ? record.renewal?.grace : null;
    const askAcceptance = needsCarrierAcceptance(grace);
    const [busy, setBusy] = useState(false);
    const kept = useKeptDraft(onClose, onDone);

    /* the override, governing-Contract and start-date notices follow R5 (record pages opened directly have none loaded yet) */
    useEffect(() => { if (!meta) dispatch(fetchInsuranceMeta()); }, [dispatch, meta]);

    /* live duplicate check (R8); only the answer for the value still in the field is shown (a late answer for an earlier
       value is dropped) */
    useEffect(() => {
        const value = carrierRef.trim();
        if (!value) { setDup(null); return undefined; }
        let live = true;
        const timer = setTimeout(() => {
            dispatch(checkInsuranceCarrierRef({ ref: record.ref, carrierRef: value })).then((res) => {
                if (!live) return;
                setDup(!res.error && res.payload?.duplicate ? res.payload : null);
            });
        }, CHECK_DEBOUNCE_MS);
        return () => { live = false; clearTimeout(timer); };
    }, [carrierRef, dispatch, record.ref]);

    const clear = useCallback((field) => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev)), []);

    const submit = useCallback(() => {
        if (busy) return;
        // required fields first (same rules and copy as the server guard); nothing is sent while one is missing
        const missing = requiredErrors([
            ["carrierRef", !isChange && isBlank(carrierRef), rq.type === "Coverage" ? "key_ins_err_qbe_reference_required" : "key_ins_err_qbe_policy_number_required"],
            ["carrierRef", changeType === "rider" && isBlank(carrierRef), "key_ins_err_qbe_reference_required"],
            ["effective", !isChange && !effective, "key_ins_err_effective_date_required"],
            ["expiry", !isChange && !expiry, "key_ins_err_expiry_date_required"],
            ["chargeApplies", isChange && charge === "unknown", "key_ins_err_resolve_charge"],
            ["invoiceId", isChange && charge === "yes" && !rq.invoice && !rq.hasInvoice, "key_ins_err_link_invoice_first"],
            ["newExpiry", changeType === "extension" && !confirmedExpiry, "key_ins_err_confirmed_new_expiry_required"],
            ["confirmedAddress", changeType === "address" && isBlank(confirmedAddress), "key_ins_err_enter_confirmed_address"],
            ["confirmedName", changeType === "name" && isBlank(confirmedName), "key_ins_err_enter_confirmed_name"],
            ["carrierAcceptance", askAcceptance && !acceptance, "key_ins_err_confirm_carrier_acceptance"],
        ]);
        if (Object.keys(missing).length) { setErrors(missing); if (missing.invoiceId && !rq.invoice) ShowToast("error", missing.invoiceId); return; }
        setBusy(true);
        kept.reset();
        const payload = { ref: record.ref, requestId: rq.id, ...opened.current, carrierRef: carrierRef.trim() };
        if (isChange) {
            payload.change = { chargeApplies: charge };
            if (changeType === "extension" || changeType === "dates") payload.change.confirmedExpiry = confirmedExpiry || undefined;
            if (changeType === "dates") payload.change.confirmedEffective = confirmedEffective || undefined;
            if (changeType === "address") payload.change.confirmedAddress = confirmedAddress.trim();
            if (changeType === "name") payload.change.confirmedName = confirmedName.trim();
        } else {
            payload.effective = effective || null;
            payload.expiry = expiry || null;
        }
        if (dup && canOverride && overrideReason.trim()) payload.dupOverrideReason = overrideReason.trim();
        if (askAcceptance) {
            payload.carrierAcceptance = acceptance;
            if (acceptanceNote.trim()) payload.acceptanceNote = acceptanceNote.trim();
        }
        dispatch(recordInsuranceQbeResult(payload)).then((res) => {
            setBusy(false);
            if (!res.error) {
                ShowToast("success", res.payload?.message || translation(CONFIRMED_DONE_KEYS[rq.type]));
                onDone();
                onClose();
                return;
            }
            const r = refusalOf(res);
            if (mustReload(res)) { ShowToast("error", r.message); onClose(); onDone(); return; }
            if (kept.keep(res)) return;
            setErrors(r.errors);
            // the fields this form shows (same conditions as below); any other field error is listed in the toast
            const rendered = ["carrierRef", ...(isChange ? ["chargeApplies"] : ["effective", "expiry"]),
                ...(changeType === "extension" ? ["newExpiry"] : []), ...(changeType === "dates" ? ["newEffective", "newExpiry"] : []),
                ...(changeType === "reassign" ? ["newWorkerId", "newContractId"] : []),
                ...(changeType === "address" ? ["confirmedAddress"] : []), ...(changeType === "name" ? ["confirmedName"] : []),
                ...(rq.invoice ? ["invoiceId"] : []), ...(askAcceptance ? ["carrierAcceptance"] : [])];
            ShowToast("error", refusalText(r, rendered));
        });
    }, [acceptance, acceptanceNote, askAcceptance, busy, canOverride, carrierRef, changeType, charge, confirmedAddress, confirmedEffective, confirmedExpiry, confirmedName, dispatch, dup, effective, expiry, isChange, kept, onClose, onDone, overrideReason, record.ref, rq.hasInvoice, rq.id, rq.invoice, rq.type]);

    const openIssues = (record.issues || []).filter((i) => i.scope.kind === "request" && i.scope.id === rq.id);
    const changed = effective && rq.requestedEffective && effective !== rq.requestedEffective;
    const graceNote = graceNotice(grace);
    // the server's Record QBE result invoice check (R2 `invoice.eligible`), shown before saving (conflicts sheet U-0108)
    const invoiceBlocked = rq.invoice && rq.invoice.eligible === false
        ? translation("key_ins_invoice_cannot_be_used", { ref: rq.invoice.ref, reasons: reasonsText(rq.invoice.reasons) })
        : "";
    const dupText = dup ? translation("key_ins_carrier_ref_exists", { ref: carrierRef.trim(), label: dup.label === "another policy" ? translation("key_ins_another_policy") : dup.label }) : "";

    return (
        <Modal
            busy={busy}
            title={confirmLabel(rq.type)}
            subtitle={translation("key_ins_record_result_sub", { ref: record.ref, type: requestTypeText(rq.type), who: `${rq.submittedBy?.name || translation("key_ins_system")} ${fmtDateTime(rq.submittedBy?.at)}`.trim() })}
            width={860}
            onClose={kept.close}
            footer={(
                <>
                    <span className={styles.spacer} />
                    <Btn variant="secondary" onClick={kept.close}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? translation("key_saving") : confirmLabel(rq.type)}</Btn>
                </>
            )}
        >
            <div className={styles.form}>
                {kept.note}
                {openIssues.length > 0 && (
                    <div className={styles.notice} data-tone="danger">{`${translation("key_ins_work_attention")}: ${openIssues.map((i) => i.issue).join("; ")}`}</div>
                )}
                {rq.periodEnded && <div className={styles.notice} data-tone="danger">{translation("key_ins_target_period_cancelled")}</div>}
                {rq.invoice && (
                    <div className={styles.notice} data-tone={errors.invoiceId || invoiceBlocked ? "danger" : undefined}>
                        <b>{rq.invoice.ref}</b>{` · ${invoiceTypeLabel(rq.invoice.type)} · ${invoiceStatusText(rq.invoice.status)}`}
                        {(errors.invoiceId || invoiceBlocked) && <div>{errors.invoiceId || invoiceBlocked}</div>}
                    </div>
                )}
                {rq.plan && (
                    <div className={styles.ro}><span className={styles.roK}>{translation("key_ins_requested_plan")}</span><span className={styles.roV}>{rq.plan}</span></div>
                )}
                {graceNote && <div className={styles.notice} data-tone={graceNote.tone}>{graceNote.text}</div>}
                <Field label={translation(rq.type === "Coverage" || isChange ? "key_ins_qbe_reference" : "key_ins_col_qbe_policy_number")} required={!isChange || changeType === "rider"} htmlFor="ins-qbe-ref" hint={translation("key_ins_exactly_as_issued")} error={errors.carrierRef || dupText || undefined}>
                    <TextInput id="ins-qbe-ref" maxLength={100} value={carrierRef} invalid={!!(errors.carrierRef || dup)} onChange={(e) => { setCarrierRef(e.target.value); clear("carrierRef"); }} />
                </Field>
                {!isChange && (<>
                <FormGrid columns={2}>
                    <Field label={translation("key_ins_effective_date_label")} required htmlFor="ins-qbe-eff" error={errors.effective}>
                        <DateInput id="ins-qbe-eff" value={effective} invalid={!!errors.effective} onChange={(v) => { setEffective(v); clear("effective"); }} />
                    </Field>
                    <Field label={translation("key_ins_expiry_date_label")} required htmlFor="ins-qbe-exp" error={errors.expiry}>
                        <DateInput id="ins-qbe-exp" value={expiry} invalid={!!errors.expiry} onChange={(v) => { setExpiry(v); clear("expiry"); }} />
                    </Field>
                </FormGrid>
                <div className={styles.diff}>
                    <div className={styles.box}>
                        <div className={styles.boxT}>{translation("key_ins_requested")}</div>
                        <div className={styles.boxV}>{fmtDateLong(rq.requestedEffective) || "—"}</div>
                    </div>
                    <div className={`${styles.box} ${changed ? styles.boxChanged : ""}`}>
                        <div className={styles.boxT}>{translation("key_ins_qbe_confirmed")}</div>
                        <div className={styles.boxV}>{`${effective ? fmtDateLong(effective) : "—"} – ${expiry ? fmtDateLong(expiry) : "—"}`}</div>
                        {changed && <div className={`${styles.muted} ${styles.small}`}>{translation("key_ins_differs_from_requested")}</div>}
                    </div>
                </div>
                {effective && today && effective > today && (
                    <div className={styles.notice}>{`${translation("key_ins_fact_starts", { date: fmtDateLong(effective) })} — ${translation("key_ins_not_in_force_until_then")}`}</div>
                )}
                </>)}
                {dup && canOverride && (
                    <Field label={translation("key_ins_override_reason")} required htmlFor="ins-qbe-override">
                        <TextArea id="ins-qbe-override" maxLength={500} rows={2} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
                    </Field>
                )}
                {isChange && (
                    <>
                        <div className={styles.fieldset} data-field={changeType === "reassign" ? "newContractId" : undefined}>
                            <div className={styles.fsTitle}>{translation("key_ins_change_to_confirm")}</div>
                            {(change.proposed || []).map((c) => (
                                <div key={c.field} className={styles.ro}>
                                    <span className={styles.roK}>{c.field}</span>
                                    <span className={styles.roV}><s className={styles.muted}>{c.old}</s>{" → "}<b>{c.new}</b></span>
                                </div>
                            ))}
                            {/* the worker / governing-Contract rule is re-run when the change is confirmed: its refusal sits with the change */}
                            {[errors.newWorkerId, errors.newContractId].filter(Boolean).map((m) => <div key={m} className={styles.err} role="alert">{m}</div>)}
                        </div>
                        <Field label={translation("key_ins_additional_charge")} htmlFor="ins-qbe-charge" error={errors.chargeApplies}>
                            <SelectBox id="ins-qbe-charge" value={charge} disabled={changeType === "rider"} onChange={(e) => { setCharge(e.target.value); clear("chargeApplies"); }}>
                                {CHARGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{translation(o.key)}</option>)}
                            </SelectBox>
                        </Field>
                        {changeType === "address" && (
                            <Field label={translation("key_ins_confirmed_address_on_policy")} required htmlFor="ins-qbe-address" error={errors.confirmedAddress}>
                                <TextArea id="ins-qbe-address" maxLength={500} rows={3} value={confirmedAddress} invalid={!!errors.confirmedAddress}
                                    onChange={(e) => { setConfirmedAddress(e.target.value); clear("confirmedAddress"); }} />
                            </Field>
                        )}
                        {changeType === "name" && (
                            <Field label={translation("key_ins_confirmed_name_on_policy")} required htmlFor="ins-qbe-name" error={errors.confirmedName}>
                                <TextInput id="ins-qbe-name" maxLength={255} value={confirmedName} invalid={!!errors.confirmedName}
                                    onChange={(e) => { setConfirmedName(e.target.value); clear("confirmedName"); }} />
                            </Field>
                        )}
                        {changeType === "extension" && (
                            <Field label={translation("key_ins_confirmed_new_expiry")} required htmlFor="ins-qbe-nx" error={errors.newExpiry}>
                                <DateInput id="ins-qbe-nx" value={confirmedExpiry} invalid={!!errors.newExpiry} onChange={(v) => { setConfirmedExpiry(v); clear("newExpiry"); }} />
                            </Field>
                        )}
                        {changeType === "dates" && (
                            <FormGrid columns={2}>
                                <Field label={translation("key_ins_confirmed_effective")} htmlFor="ins-qbe-ne" error={errors.newEffective}>
                                    <DateInput id="ins-qbe-ne" value={confirmedEffective} invalid={!!errors.newEffective} onChange={(v) => { setConfirmedEffective(v); clear("newEffective"); }} />
                                </Field>
                                <Field label={translation("key_ins_confirmed_expiry")} htmlFor="ins-qbe-nx" error={errors.newExpiry}>
                                    <DateInput id="ins-qbe-nx" value={confirmedExpiry} invalid={!!errors.newExpiry} onChange={(v) => { setConfirmedExpiry(v); clear("newExpiry"); }} />
                                </Field>
                            </FormGrid>
                        )}
                        {changeType === "reassign" && change.follows && (
                            <div className={styles.notice}>{translation("key_ins_owner_becomes", { owner: change.follows.owner || "—", branch: change.follows.branch || "—", contract: change.follows.contract })}</div>
                        )}
                        {changeType === "reassign" && (change.follows || record.summary?.contract) && !canChangeContract && (
                            <div className={styles.notice} data-tone="danger">{translation("key_ins_change_contract_unavailable")}</div>
                        )}
                    </>
                )}
                {askAcceptance && (
                    <>
                        <div data-field="carrierAcceptance">
                            <label className={styles.check}>
                                <input type="checkbox" checked={acceptance} onChange={(e) => { setAcceptance(e.target.checked); clear("carrierAcceptance"); }} />
                                <span>{translation("key_ins_carrier_acceptance_established")}</span>
                            </label>
                            {errors.carrierAcceptance && <div className={styles.err} role="alert">{errors.carrierAcceptance}</div>}
                        </div>
                        <Field label={translation("key_ins_acceptance_note")} htmlFor="ins-qbe-acceptance">
                            <TextInput id="ins-qbe-acceptance" maxLength={500} value={acceptanceNote} placeholder={translation("key_ins_acceptance_note_placeholder")} onChange={(e) => setAcceptanceNote(e.target.value)} />
                        </Field>
                    </>
                )}
            </div>
        </Modal>
    );
};

RecordQbeResultDialog.propTypes = {
    record: PropTypes.object.isRequired,
    request: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default RecordQbeResultDialog;
