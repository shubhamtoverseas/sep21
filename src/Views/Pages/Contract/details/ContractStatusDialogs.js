import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import { Checkbox, Field, SelectBox, TextArea } from "../../../../components/ui/FormControls";
import translation from "../../../../utils/translation";
import { updateProcessingGlobalSatusList } from "../../../../redux/Slices/processing/ProcessingSlice";
import { showSuccessOrError } from "../../../../services/commonService";
import { completionReasonsAPI } from "../../../../services/processings";
import { getRecordedVisaExpiry } from "../../ProcessingPage/processing-detail/terminal-flow/terminalFlowRules";
import { stageLabel } from "../dashboard/contractDashboardUtils";
import { caseLabel } from "../extend-visa/extendVisaUtils";
import { EM_DASH, apiErrorMessage, expectedEndOf, formatDate, fullTermAllowed, isFinishedReason, isoOf, reopenableStages, startVisaConflict, todayIso } from "./contractRecordUtils";
import { CONTRACT_STATUS } from "../../ProcessingPage/processingConstants";
import { CR_CANCEL_REASONS, CR_REVERT_ERROR, CR_REVERT_STEP, CR_SUSPENDING_REASONS, CR_XV } from "../contractConstants";

/**
 * Contract record → Actions → Change Status: the prototype's lifecycle dialogs (Contract_Details.html dialogHTML)
 * on the kit Modal, committed through POST /processing/global/status-update:
 *   Processing → Cancelled   Cancel Contract: Reason (GBO · EBO · Medically Unfit · Other) · Cancellation Date · Remarks
 *   Active → Completed       Complete Contract: Reason (the contract-status list, Finished only from the Expected
 *                            Contract End) · Start Date (editable with Stage Actions Edit; `start_date` on the payload) ·
 *                            Contract End · Remarks; the Contract Start < Visa Expiry invariant on every confirmation
 *   Active → Processing      Revert to Processing: reason + the stages to reopen (never Insurance), then a review step
 *                            (`reason`, `reopen_stages` on the payload — audit B3). A post-hire action (N-2 / B14-22) answers 409
 *                            REVERT_BLOCKED_POST_HIRE with the detected actions: a permitted actor records an override reason
 *                            and resends; anyone else can only close.
 *   Completed → Active       a pure reversal; blocked with both dates when Visa Expiry is not later than Contract Start
 *   Cancelled → Processing   a confirmation; the cancellation and this reversal stay in Activity
 * An open Extend Visa case (EXTEND.md §8.2): the server answers 409 EXTEND_VISA_OPEN_CASE_ACK_REQUIRED with the case
 * summary; the dialog names the case and shows an unchecked acknowledgement; the resend carries
 * `acknowledge_extend_visa_cancel: true` only when it is ticked. Contract and case then change together.
 */
const fill = (text, vars) => Object.keys(vars || {}).reduce((out, k) => out.split(`{${ k }}`).join(vars[k]), text);
/* field errors (422 `data.errors`) first, then the message */
const serverError = (res) => (res?.payload?.data?.data ? apiErrorMessage({ response: res.payload.data }) : (res?.payload?.message || res?.error?.message || translation("key_something_went_wrong")));
/* error copy for a date field, '' when fine (prototype mcDateError) */
const dateRuleError = (iso, labelLower, rules = {}) => {
    if (!iso) return rules.required === false ? "" : fill(translation("key_cc_enter_the_date"), { label: labelLower });
    if (rules.after && iso <= rules.after) return fill(translation("key_cc_must_be_after"), { label: rules.afterLabel || translation("key_contract_start") });
    if (rules.notFuture && iso > todayIso()) return fill(translation("key_cc_cannot_be_after_today"), { date: formatDate(todayIso()) });
    if (rules.notPast && iso < todayIso()) return fill(translation("key_cc_cannot_be_before_today"), { date: formatDate(todayIso()) });
    return "";
};

/* the 409 acknowledgement: `{ data: axiosResponse }` is the thunk's rejection shape */
const conflictBody = (res) => { const http = res?.payload?.data; return http && http.status === 409 ? (http.data || {}) : null; };
/* N-2: the post-hire block — `{ actions: [{ code, text, ref, at }], canOverride }` */
const postHireOf = (res) => {
    const body = conflictBody(res);
    if (!body || (body.code !== CR_REVERT_ERROR.POST_HIRE && body.code !== CR_REVERT_ERROR.OVERRIDE_REASON_REQUIRED)) return null;
    return { actions: Array.isArray(body.data?.post_hire_actions) ? body.data.post_hire_actions : [], canOverride: Boolean(body.data?.can_override), reasonRequired: body.code === CR_REVERT_ERROR.OVERRIDE_REASON_REQUIRED };
};
const openCaseOf = (res) => {
    const body = conflictBody(res);
    if (!body) return null;
    const summary = body.data?.open_extend_visa_case;
    return summary || (body.code === CR_XV.ERROR.ACK_REQUIRED || String(body.message || "").includes(CR_XV.ERROR.ACK_REQUIRED) ? {} : null);
};
const useStatusCommit = (contractId, onDone) => {
    const dispatch = useDispatch();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [openCase, setOpenCase] = useState(null);      /* the open Extend Visa case the server named (409) */
    const [ack, setAck] = useState(false);
    const [postHire, setPostHire] = useState(null);      /* N-2: the post-hire actions that block a reversal (409) */
    const commit = useCallback(async (payload) => {
        if (openCase && !ack) { setError(translation("key_cr_xv_ack_required")); return false; }
        setBusy(true); setError("");
        try {
            const res = await dispatch(updateProcessingGlobalSatusList({ ...payload, contract_id: Number(contractId), ...(openCase && ack ? { [CR_XV.ACK_FIELD]: true } : {}) }));
            if (!res.error && res.payload?.status) { showSuccessOrError(res); onDone(); return true; }
            const named = openCaseOf(res);
            if (named) { setOpenCase(named); setAck(false); return false; }
            const blocked = postHireOf(res);
            if (blocked) { setPostHire(blocked); if (blocked.reasonRequired) setError(translation("key_cr_override_reason_required")); return false; }
            showSuccessOrError(res);
            setError(serverError(res));
        } catch {
            setError(translation("key_something_went_wrong"));
        } finally { setBusy(false); }
        return false;
    }, [dispatch, contractId, onDone, openCase, ack]);
    return { busy, error, commit, openCase, ack, setAck, postHire };
};

/* the acknowledgement block a Complete / Cancel dialog shows once the server named the open case */
const OpenCaseAck = ({ openCase, ack, setAck, busy }) => {
    if (!openCase) return null;
    const label = caseLabel(openCase);
    return (
        <Note tone="warn">
            <div data-xv-ack="">{ fill(translation("key_cr_xv_ack_open"), { case: label }) }</div>
            <div className="checks"><Checkbox label={ fill(translation("key_cr_xv_ack_label"), { case: label }) } checked={ ack } disabled={ busy } onChange={ (e) => setAck(e.target.checked) } /></div>
        </Note>
    );
};
OpenCaseAck.propTypes = { openCase: PropTypes.object, ack: PropTypes.bool, setAck: PropTypes.func.isRequired, busy: PropTypes.bool };

const Foot = ({ onClose, busy, primary, primaryLabel, variant = "primary", cancelLabel, extra }) => (
    <>
        <span className="grow" />
        { extra }
        { onClose && <Btn variant="secondary" type="button" disabled={ busy } onClick={ onClose }>{ cancelLabel || translation("key_cancel") }</Btn> }
        <Btn variant={ variant } type="button" disabled={ busy } onClick={ primary }>{ busy ? `${ translation("key_loading") }…` : primaryLabel }</Btn>
    </>
);
Foot.propTypes = { onClose: PropTypes.func, busy: PropTypes.bool, primary: PropTypes.func.isRequired, primaryLabel: PropTypes.node.isRequired, variant: PropTypes.string, cancelLabel: PropTypes.node, extra: PropTypes.node };

const Note = ({ tone, children }) => <div className={ `note${ tone ? ` ${ tone }` : "" }` }>{ children }</div>;
Note.propTypes = { tone: PropTypes.string, children: PropTypes.node };
const ServerError = ({ text }) => (text ? <Note tone="danger"><span role="alert">{ text }</span></Note> : null);
ServerError.propTypes = { text: PropTypes.string };

/* ---------------- Cancel Contract ---------------- */
const CancelDialog = ({ contractId, onClose, onDone }) => {
    const [reason, setReason] = useState("");
    const [date, setDate] = useState(todayIso());
    const [remarks, setRemarks] = useState("");
    const [tried, setTried] = useState(false);
    const { busy, error, commit, openCase, ack, setAck } = useStatusCommit(contractId, onDone);
    const errs = useMemo(() => {
        if (!tried) return {};
        const e = {};
        if (!reason) e.reason = translation("key_cc_select_a_reason");
        const de = dateRuleError(date, translation("key_cancellation_date").toLowerCase(), { notFuture: true }); if (de) e.date = de;
        if (!remarks.trim()) e.remarks = translation("key_cc_remarks_required");
        return e;
    }, [tried, reason, date, remarks]);
    const confirm = () => {
        setTried(true);
        if (!reason || dateRuleError(date, "", { notFuture: true }) || !remarks.trim()) return;
        commit({ status: CONTRACT_STATUS.CANCELLED, cancellation_reason: reason, cancellation_date: date, remarks: remarks.trim() });
    };
    return (
        <Modal title={ translation("key_cancel_contract") } width={ 560 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="mcdt-dlg"
            footer={ <Foot onClose={ onClose } busy={ busy } primary={ confirm } primaryLabel={ translation("key_confirm_cancellation") } variant="danger" /> }>
            <p className="intro">{ translation("key_cc_cancel_intro") }</p>
            <div className="row">
                <Field label={ translation("key_reason") } htmlFor="cr-cancel-reason" className="f-m" error={ errs.reason }>
                    <SelectBox id="cr-cancel-reason" value={ reason } disabled={ busy } invalid={ Boolean(errs.reason) } onChange={ (e) => setReason(e.target.value) }>
                        <option value="">{ translation("key_select") }</option>
                        { CR_CANCEL_REASONS.map((r) => <option key={ r.value } value={ r.value }>{ translation(r.labelKey) }</option>) }
                    </SelectBox>
                </Field>
                <Field label={ translation("key_cancellation_date") } htmlFor="cr-cancel-date" className="f-date" error={ errs.date } hint={ translation("key_cc_defaults_to_today") }>
                    <DateInput id="cr-cancel-date" name="cr-cancel-date" value={ date } onChange={ setDate } invalid={ Boolean(errs.date) } disabled={ busy } />
                </Field>
            </div>
            { CR_SUSPENDING_REASONS.includes(reason) && <Note tone="warn">{ translation("key_cc_suspend_warning") }</Note> }
            <Field label={ translation("key_remarks") } htmlFor="cr-cancel-remarks" full className="f-full" required error={ errs.remarks } hint={ translation("key_cc_required") }>
                <TextArea id="cr-cancel-remarks" rows={ 3 } value={ remarks } disabled={ busy } invalid={ Boolean(errs.remarks) } onChange={ (e) => setRemarks(e.target.value) } />
            </Field>
            <OpenCaseAck openCase={ openCase } ack={ ack } setAck={ setAck } busy={ busy } />
            <ServerError text={ error } />
        </Modal>
    );
};
CancelDialog.propTypes = { contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, onClose: PropTypes.func.isRequired, onDone: PropTypes.func.isRequired };

/* ---------------- Complete Contract ---------------- */
const CompleteDialog = ({ contractId, row, contractDetails, canEditStart, onClose, onDone }) => {
    /* N-4 / K-17: GET completion-reasons — the "> 2 years" row is `system_only` (the server's auto-completion job) and never offered */
    const [reasonRows, setReasonRows] = useState(null);
    useEffect(() => {
        let alive = true;
        completionReasonsAPI().then((res) => { if (alive) setReasonRows(Array.isArray(res?.data?.data) ? res.data.data : []); }).catch(() => { if (alive) setReasonRows([]); });
        return () => { alive = false; };
    }, []);
    const reasons = useMemo(() => (reasonRows || []).filter((it) => !it.system_only && it.id != null).map((it) => ({ id: String(it.id), label: it.label || it.admin_panel_status || String(it.id), finished: it.is_finished != null ? Boolean(it.is_finished) : isFinishedReason(it), requiresRemarks: Boolean(it.requires_remarks) })), [reasonRows]);
    const savedStart = isoOf(row?.contract_start || contractDetails?.start_date);
    const recordedEnd = isoOf(row?.contract_end || contractDetails?.expiry_date);
    const visaExpiry = getRecordedVisaExpiry(contractDetails);
    const [reason, setReason] = useState("");
    const [start, setStart] = useState(savedStart);
    const [remarks, setRemarks] = useState("");
    const [tried, setTried] = useState(false);
    const { busy, error, commit, openCase, ack, setAck } = useStatusCommit(contractId, onDone);
    const startChanged = canEditStart && Boolean(start) && start !== savedStart;
    const effectiveStart = canEditStart && start ? start : savedStart;
    /* the Expected Contract End: the corrected Start + 2 years while a permitted user edits it, else the recorded end */
    const expectedEnd = startChanged ? expectedEndOf(start, "") : expectedEndOf(savedStart, recordedEnd);
    const full = fullTermAllowed(expectedEnd);
    const [end, setEnd] = useState(() => (full ? expectedEnd : todayIso()));
    const picked = reasons.find((r) => r.id === reason);
    const isFinished = Boolean(picked?.finished);
    const early = Boolean(picked) && (!isFinished || picked.requiresRemarks);
    const expDisp = expectedEnd ? formatDate(expectedEnd) : EM_DASH;

    const validate = () => {
        const e = {};
        if (!reason) e.reason = translation("key_cc_select_a_reason");
        else if (isFinished && expectedEnd && !full) e.reason = fill(translation("key_cc_finished_from_expected_end"), { date: expDisp });
        if (canEditStart) { const se = dateRuleError(start, translation("key_start_date").toLowerCase(), { notFuture: true }); if (se) e.start = se; }
        if (!e.start && startVisaConflict(effectiveStart, visaExpiry)) {
            e.start = canEditStart
                ? fill(translation("key_cr_invariant_editable"), { date: formatDate(visaExpiry) })
                : fill(translation("key_cr_invariant_saved"), { start: formatDate(effectiveStart), visa: formatDate(visaExpiry) });
        }
        const ee = dateRuleError(end, translation("key_contract_end").toLowerCase(), { after: effectiveStart || undefined, notFuture: true }); if (ee) e.end = ee;
        if (early && !remarks.trim()) e.remarks = translation("key_cc_remarks_required_early_ending");
        return e;
    };
    const errs = tried ? validate() : {};
    const confirm = () => {
        setTried(true);
        if (Object.keys(validate()).length) return;
        commit({ status: CONTRACT_STATUS.COMPLETED, completion_reason: reason, expiry_date: end, remarks: remarks.trim(), ...(startChanged ? { start_date: start } : {}) });
    };
    const intro = !expectedEnd
        ? translation("key_cc_complete_intro_generic")
        : fill(translation(full ? "key_cc_complete_intro_full" : "key_cc_complete_intro_early"), { date: expDisp });
    return (
        <Modal title={ translation("key_complete_contract") } width={ 560 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="mcdt-dlg"
            footer={ <Foot onClose={ onClose } busy={ busy } primary={ confirm } primaryLabel={ translation("key_confirm_completion") } /> }>
            <p className="intro">{ intro }</p>
            <div className="row">
                <Field label={ translation("key_reason") } htmlFor="cr-complete-reason" className="f-m" error={ errs.reason } hint={ expectedEnd && !full ? fill(translation("key_cc_finished_from"), { date: expDisp }) : undefined }>
                    <SelectBox id="cr-complete-reason" value={ reason } disabled={ busy } invalid={ Boolean(errs.reason) } onChange={ (e) => setReason(e.target.value) }>
                        <option value="">{ reasonRows === null ? `${ translation("key_loading") }…` : translation("key_select") }</option>
                        { reasons.map((r) => <option key={ r.id } value={ r.id } disabled={ r.finished && Boolean(expectedEnd) && !full }>{ r.label }</option>) }
                    </SelectBox>
                </Field>
            </div>
            <div className="row">
                <Field label={ translation("key_start_date") } htmlFor="cr-complete-start" className="f-date" error={ errs.start } hint={ translation(canEditStart ? "key_cr_start_editable_help" : "key_cr_start_requires_edit") }>
                    <DateInput id="cr-complete-start" name="cr-complete-start" value={ start } onChange={ setStart } invalid={ Boolean(errs.start) } disabled={ busy || !canEditStart } />
                </Field>
                <Field label={ translation("key_contract_end") } htmlFor="cr-complete-end" className="f-date" error={ errs.end } hint={ translation(isFinished ? "key_cc_defaults_to_expected_end" : "key_cc_end_help") }>
                    <DateInput id="cr-complete-end" name="cr-complete-end" value={ end } onChange={ setEnd } invalid={ Boolean(errs.end) } disabled={ busy } />
                </Field>
            </div>
            <Note tone={ startChanged ? "warn" : undefined }>
                { translation("key_expected_contract_end") } <b>{ expDisp }</b> — { translation("key_cc_start_plus_two_years") }{ startChanged ? `. ${ translation("key_cr_start_corrected_note") }` : "." }
            </Note>
            <Field label={ translation("key_remarks") } htmlFor="cr-complete-remarks" full className="f-full" required={ early } error={ errs.remarks } hint={ translation(early ? "key_cc_required_for_early_ending" : "key_optional") }>
                <TextArea id="cr-complete-remarks" rows={ 3 } value={ remarks } disabled={ busy } invalid={ Boolean(errs.remarks) } onChange={ (e) => setRemarks(e.target.value) } />
            </Field>
            <OpenCaseAck openCase={ openCase } ack={ ack } setAck={ setAck } busy={ busy } />
            <ServerError text={ error } />
        </Modal>
    );
};
CompleteDialog.propTypes = { contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, row: PropTypes.object, contractDetails: PropTypes.object, canEditStart: PropTypes.bool, onClose: PropTypes.func.isRequired, onDone: PropTypes.func.isRequired };

/* ---------------- Completed → Active ---------------- */
const ToActiveDialog = ({ contractId, row, contractDetails, onClose, onDone }) => {
    const savedStart = isoOf(row?.contract_start || contractDetails?.start_date);
    const visaExpiry = getRecordedVisaExpiry(contractDetails);
    const blocked = startVisaConflict(savedStart, visaExpiry);
    const { busy, error, commit } = useStatusCommit(contractId, onDone);
    if (blocked) {
        return (
            <Modal title={ translation("key_cannot_return_to_active") } width={ 440 } onClose={ onClose } closeLabel={ translation("key_close") } className="mcdt-dlg"
                footer={ <Foot primary={ onClose } primaryLabel={ translation("key_close") } /> }>
                <div className="err" role="alert">{ translation("key_cannot_return_to_active_visa_expiry") }</div>
                <Note>
                    <div><b>{ translation("key_contract_start") }</b> — { formatDate(savedStart) || EM_DASH }</div>
                    <div><b>{ translation("key_visa_expiry") }</b> — { formatDate(visaExpiry) || EM_DASH }</div>
                </Note>
                <p className="help">{ translation("key_cc_nothing_changed_visa") }</p>
            </Modal>
        );
    }
    /* a pure reversal (U-0275 / PROCESS §2.4.4): the server clears Contract End and the reason; the client sends no date at all */
    const confirm = () => commit({ status: CONTRACT_STATUS.ACTIVE });
    return (
        <Modal title={ translation("key_cc_back_to_active_q") } width={ 440 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="mcdt-dlg"
            footer={ <Foot onClose={ onClose } busy={ busy } primary={ confirm } primaryLabel={ translation("key_confirm") } /> }>
            <p className="intro">{ translation("key_cc_to_active_intro") }</p>
            <ServerError text={ error } />
        </Modal>
    );
};
ToActiveDialog.propTypes = { contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, row: PropTypes.object, contractDetails: PropTypes.object, onClose: PropTypes.func.isRequired, onDone: PropTypes.func.isRequired };

/* ---------------- Cancelled → Processing ---------------- */
const CancelledToProcessingDialog = ({ contractId, onClose, onDone }) => {
    const { busy, error, commit } = useStatusCommit(contractId, onDone);
    return (
        <Modal title={ translation("key_cc_back_to_processing_q") } width={ 440 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="mcdt-dlg"
            footer={ <Foot onClose={ onClose } busy={ busy } primary={ () => commit({ status: CONTRACT_STATUS.PROCESSING }) } primaryLabel={ translation("key_confirm") } /> }>
            <p className="intro">{ translation("key_cc_to_processing_intro") }</p>
            <ServerError text={ error } />
        </Modal>
    );
};
CancelledToProcessingDialog.propTypes = { contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, onClose: PropTypes.func.isRequired, onDone: PropTypes.func.isRequired };

/* ---------------- Active → Processing: the governed reversal (two steps) ---------------- */
const RevertDialog = ({ contractId, stages, onClose, onDone }) => {
    const options = useMemo(() => reopenableStages(stages), [stages]);
    const [step, setStep] = useState(CR_REVERT_STEP.FORM);
    const [reason, setReason] = useState("");
    const [reopen, setReopen] = useState([]);
    const [tried, setTried] = useState(false);
    const [override, setOverride] = useState("");
    const { busy, error, commit, postHire } = useStatusCommit(contractId, onDone);
    const reasonErr = tried && !reason.trim() ? translation("key_cr_reversion_reason_required") : "";
    const stagesErr = tried && !reopen.length ? translation("key_cr_select_stage_to_reopen") : "";
    const toggle = (key) => setReopen((list) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]));
    const review = () => { setTried(true); if (!reason.trim() || !reopen.length) return; setStep(CR_REVERT_STEP.REVIEW); };
    /* N-2: the same body again with `override_reason` once the server named the post-hire actions and the actor may override */
    const confirm = () => commit({ status: CONTRACT_STATUS.PROCESSING, reason: reason.trim(), reopen_stages: options.filter((k) => reopen.includes(k)), ...(postHire?.canOverride && override.trim() ? { override_reason: override.trim() } : {}) });
    const blockedNoOverride = Boolean(postHire) && !postHire.canOverride;
    if (step === CR_REVERT_STEP.REVIEW) {
        return (
            <Modal title={ translation("key_cr_revert_review_title") } width={ 560 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="mcdt-dlg"
                footer={ blockedNoOverride
                    ? <Foot busy={ busy } primary={ onClose } primaryLabel={ translation("key_close") } />
                    : <Foot busy={ busy } primary={ confirm } primaryLabel={ translation("key_cr_confirm_reversion") } variant="danger" extra={ <Btn variant="secondary" type="button" disabled={ busy } onClick={ () => setStep(CR_REVERT_STEP.FORM) }>{ translation("key_back") }</Btn> } /> }>
                <Note>
                    <div><b>{ translation("key_reason") }</b> — { reason.trim() }</div>
                    <div className="gap"><b>{ translation("key_cr_stages_to_reopen") }</b> — { options.filter((k) => reopen.includes(k)).map(stageLabel).join(" · ") }</div>
                    <div className="gap"><b>{ translation("key_cr_cleared") }</b> — { translation("key_cr_revert_cleared_items") }</div>
                    <div><b>{ translation("key_cr_kept") }</b> — { translation("key_cr_revert_kept_items") }</div>
                    <div><b>{ translation("key_cr_result") }</b> — { translation("key_cr_revert_result") }</div>
                </Note>
                { postHire && (
                    <Note tone="warn">
                        <div data-post-hire-block=""><b>{ translation("key_cr_post_hire_blocked") }</b></div>
                        <ul className="plain">{ postHire.actions.map((a, i) => <li key={ a.code ? `${ a.code }-${ i }` : i }>{ a.text }</li>) }</ul>
                        { postHire.canOverride ? (
                            <Field label={ translation("key_ins_override_reason") } htmlFor="cr-revert-override" full className="f-full" required hint={ translation("key_required") }>
                                <TextArea id="cr-revert-override" rows={ 2 } value={ override } disabled={ busy } onChange={ (e) => setOverride(e.target.value) } />
                            </Field>
                        ) : <div className="gap">{ translation("key_cr_post_hire_override_help") }</div> }
                    </Note>
                ) }
                <ServerError text={ error } />
            </Modal>
        );
    }
    return (
        <Modal title={ translation("key_cr_revert_title") } width={ 560 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="mcdt-dlg"
            footer={ <Foot onClose={ onClose } busy={ busy } primary={ review } primaryLabel={ translation("key_review") } /> }>
            <p className="intro">{ translation("key_cr_revert_intro") }</p>
            <Field label={ translation("key_cr_reversion_reason") } htmlFor="cr-revert-reason" full className="f-full" required error={ reasonErr } hint={ translation("key_required") }>
                <TextArea id="cr-revert-reason" rows={ 3 } value={ reason } disabled={ busy } invalid={ Boolean(reasonErr) } onChange={ (e) => setReason(e.target.value) } />
            </Field>
            <Field label={ translation("key_cr_stages_to_reopen") } full className="f-full" required error={ stagesErr } hint={ translation("key_cr_at_least_one") }>
                <div className="checks" role="group" aria-label={ translation("key_cr_stages_to_reopen") }>
                    { options.map((key) => <Checkbox key={ key } label={ stageLabel(key) } checked={ reopen.includes(key) } disabled={ busy } onChange={ () => toggle(key) } />) }
                </div>
            </Field>
            <ServerError text={ error } />
        </Modal>
    );
};
RevertDialog.propTypes = { contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, stages: PropTypes.arrayOf(PropTypes.string).isRequired, onClose: PropTypes.func.isRequired, onDone: PropTypes.func.isRequired };

/** One entry: `target` is the status id picked in the Actions menu; `current` the record's status. */
const ContractStatusDialog = ({ target, current, contractId, row, stages, contractDetails, permissions, onClose, onDone }) => {
    const canEditStart = Boolean(permissions?.stageActionPermission?.includes("edit"));
    if (target === CONTRACT_STATUS.CANCELLED) return <CancelDialog contractId={ contractId } onClose={ onClose } onDone={ onDone } />;
    if (target === CONTRACT_STATUS.COMPLETED) return <CompleteDialog contractId={ contractId } row={ row } contractDetails={ contractDetails } canEditStart={ canEditStart } onClose={ onClose } onDone={ onDone } />;
    if (target === CONTRACT_STATUS.ACTIVE) return <ToActiveDialog contractId={ contractId } row={ row } contractDetails={ contractDetails } onClose={ onClose } onDone={ onDone } />;
    if (target === CONTRACT_STATUS.PROCESSING && current === CONTRACT_STATUS.ACTIVE) return <RevertDialog contractId={ contractId } stages={ stages } onClose={ onClose } onDone={ onDone } />;
    if (target === CONTRACT_STATUS.PROCESSING && current === CONTRACT_STATUS.CANCELLED) return <CancelledToProcessingDialog contractId={ contractId } onClose={ onClose } onDone={ onDone } />;
    return null;
};
ContractStatusDialog.propTypes = {
    target: PropTypes.number.isRequired,
    current: PropTypes.number,
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    row: PropTypes.object,
    stages: PropTypes.arrayOf(PropTypes.string),
    contractDetails: PropTypes.object,
    permissions: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};
ContractStatusDialog.defaultProps = { stages: [] };

export default ContractStatusDialog;
