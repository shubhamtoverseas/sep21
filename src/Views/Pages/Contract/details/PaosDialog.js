import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import { Field, SelectBox, TextArea, TextInput } from "../../../../components/ui/FormControls";
import translation from "../../../../utils/translation";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { savePaos } from "./paosApi";
import { formatDate } from "./contractRecordUtils";
import { arrivalIso, emptyDraft, hasArrived, isCertificateStep, isOutcomeStep, paosFacts, paosHistory, paosKey, paosLabel, paosPayload, progressOptions, stampOf, validatePaos } from "./paosRules";
import { CR_PAOS_PROGRESS, CR_PAOS_TRI } from "../contractConstants";

/**
 * "PAOS — <worker>" (prototype v28PaosDialogHTML with the v29 / v211 overrides): Progress along the edge table, the
 * session (date · time · venue · reporting instructions · booking confirmation), the attendance and certificate facts,
 * a note, the appointment history and the prior appointments. `view` shows the recorded facts read-only (Completed).
 * `outcome` is the closed-parent Record outcome: the recorded session is shown, only the outcome steps are open and
 * nothing is booked or rebooked (no session fields on the payload).
 */
const TriSelect = ({ id, value, onChange, disabled, invalid }) => (
    <SelectBox id={ id } value={ value } onChange={ (e) => onChange(e.target.value) } disabled={ disabled } invalid={ invalid }>
        <option value={ CR_PAOS_TRI.NONE }>{ translation("key_cr_paos_not_recorded") }</option>
        <option value={ CR_PAOS_TRI.YES }>{ translation("key_yes") }</option>
        <option value={ CR_PAOS_TRI.NO }>{ translation("key_no") }</option>
    </SelectBox>
);
TriSelect.propTypes = { id: PropTypes.string.isRequired, value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired, disabled: PropTypes.bool, invalid: PropTypes.bool };

const History = ({ info }) => {
    const { prior, events } = paosHistory(info);
    if (!prior.length && !events.length) return null;
    return (
        <>
            { prior.length > 0 && (
                <div className="f-full">
                    <div className="lbl">{ translation("key_cr_paos_prior_appointments") } ({ prior.length })</div>
                    <div className="note hist">
                        { prior.slice().reverse().map((x, i) => (
                            <div key={ x.id || i }>
                                <b>{ translation("key_session") } { formatDate(x.session_date) }{ x.session_time ? ` ${ String(x.session_time).slice(0, 5) }` : "" }</b>
                                { x.venue ? ` · ${ x.venue }` : "" }{ x.booking_ref ? ` · ${ translation("key_cr_paos_booking") } ${ x.booking_ref }` : "" }
                                { ` — ${ translation("key_cr_paos_replaced") }` }{ x.note ? ` — ${ x.note }` : "" }
                                { x.replacedAt ? <span className="soft"> ({ translation("key_cr_paos_replaced") } { stampOf(x.replacedAt) }{ x.replacedBy ? ` · ${ x.replacedBy }` : "" })</span> : null }
                            </div>
                        )) }
                    </div>
                </div>
            ) }
            { events.length > 0 && (
                <div className="f-full">
                    <div className="lbl">{ translation("key_cr_paos_appointment_history") }</div>
                    <div className="note hist">
                        { events.map((h, i) => (
                            <div key={ h.id || i }>
                                <b>{ h.previous_progress ? `${ paosLabel(h.previous_progress) } → ` : "" }{ paosLabel(h.current_progress) }</b>
                                { ` · ${ stampOf(h.created_at) }` }{ h.created_by_name ? ` · ${ h.created_by_name }` : "" }{ h.note ? ` — ${ h.note }` : "" }
                            </div>
                        )) }
                    </div>
                </div>
            ) }
        </>
    );
};
History.propTypes = { info: PropTypes.object };

const PaosDialog = ({ contractId, row, info, mode, onClose, onSaved }) => {
    const c = info?.case || null;
    const current = paosKey(c?.progress);
    const view = mode === "view";
    const outcome = mode === "outcome";
    const arrived = hasArrived(row);
    const arrIso = arrivalIso(row);
    const [draft, setDraft] = useState(() => emptyDraft(c));
    const [tried, setTried] = useState(false);
    const [busy, setBusy] = useState(false);
    const [serverError, setServerError] = useState("");
    const set = (key) => (value) => { setDraft((d) => ({ ...d, [key]: value })); setServerError(""); };
    const setText = (key) => (e) => set(key)(e.target.value);
    const errors = useMemo(() => (tried && !view ? validatePaos(draft, current, row, outcome) : {}), [tried, view, draft, current, row, outcome]);
    const options = progressOptions(current, outcome);
    const next = options.slice(1);
    const lockedStep = (p) => !outcome && !arrived && (p === CR_PAOS_PROGRESS.ATTENDED || p === CR_PAOS_PROGRESS.COMPLETED);
    const ro = view || busy;
    const sessionRo = ro || outcome;
    /* backend 379: attendance is recorded on an outcome step and the certificate on Completed — the controls open with the step */
    const attendanceRo = ro || !isOutcomeStep(draft.progress);
    const certificateRo = ro || !isCertificateStep(draft.progress);
    let progressHelp;
    if (view) progressHelp = translation("key_cr_paos_completed_view_only");
    else if (outcome) progressHelp = `${ translation("key_cr_paos_from") } ${ paosLabel(current) }`;
    else progressHelp = `${ translation("key_cr_paos_from") } ${ paosLabel(current) }: ${ next.length ? next.map(paosLabel).join(" / ") : translation("key_cr_paos_no_further_step") }${ arrived ? "" : ` — ${ translation("key_cr_paos_after_arrival_help") }` }`;

    const save = async () => {
        setTried(true);
        if (Object.keys(validatePaos(draft, current, row, outcome)).length) return;
        setBusy(true);
        const result = await savePaos(paosPayload(draft, contractId, outcome));
        setBusy(false);
        if (!result.ok) { setServerError(result.message || translation("key_something_went_wrong")); return; }
        ShowToast("success", result.message);
        onSaved();
    };

    return (
        <Modal title={ `${ translation("key_stage_paos") } — ${ paosLabel(current) }` } width={ 640 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="mcdt-dlg mcdt-paos"
            footer={ (
                <>
                    <span className="grow" />
                    <Btn variant="secondary" type="button" onClick={ onClose } disabled={ busy }>{ translation(view ? "key_close" : "key_cancel") }</Btn>
                    { !view && <Btn variant="primary" type="button" onClick={ save } disabled={ busy }>{ translation(busy ? "key_loading" : "key_save") }</Btn> }
                </>
            ) }>
            { /* U-0286 (CT-06): the seminar never gates activation; attendance and the certificate are recorded facts */ }
            <p className="intro"><b>{ row?.worker_name || "" }</b>{ row?.worker_name ? " — " : "" }{ translation("key_cr_paos_intro") }</p>
            { outcome && (
                <div className="f-full" data-paos-outcome-session="">
                    <div className="lbl">{ translation("key_cr_paos_recorded_session") }</div>
                    <div className="val">{ paosFacts(c, true) }</div>
                </div>
            ) }
            <div className="row">
                <Field label={ translation("key_progress") } htmlFor="paos-progress" className="f-l" error={ errors.progress } hint={ errors.progress ? undefined : progressHelp }>
                    <SelectBox id="paos-progress" value={ draft.progress } onChange={ setText("progress") } disabled={ ro } invalid={ Boolean(errors.progress) }>
                        { options.map((p) => <option key={ p } value={ p } disabled={ lockedStep(p) }>{ paosLabel(p) }</option>) }
                    </SelectBox>
                </Field>
            </div>
            { !outcome && (
                <>
                    <div className="row">
                        <Field label={ translation("key_session_date") } htmlFor="paos-date" className="f-date" error={ errors.session_date } hint={ errors.session_date ? undefined : "DD/MM/YYYY" }>
                            <DateInput id="paos-date" name="paos-date" value={ draft.session_date } onChange={ set("session_date") } invalid={ Boolean(errors.session_date) } disabled={ sessionRo } />
                        </Field>
                        <Field label={ translation("key_session_time") } htmlFor="paos-time" className="f-xs" hint={ translation("key_cr_paos_reporting_time") }>
                            <TextInput id="paos-time" value={ draft.session_time } onChange={ setText("session_time") } placeholder="HH:MM" maxLength={ 5 } disabled={ sessionRo } />
                        </Field>
                        <Field label={ translation("key_venue") } htmlFor="paos-venue" className="f-l" error={ errors.venue } hint={ errors.venue ? undefined : translation("key_cr_paos_seminar_venue") }>
                            <TextInput id="paos-venue" value={ draft.venue } onChange={ setText("venue") } maxLength={ 255 } disabled={ sessionRo } invalid={ Boolean(errors.venue) } />
                        </Field>
                    </div>
                    <Field label={ translation("key_cr_paos_reporting_instructions") } htmlFor="paos-instr" full className="f-full" hint={ translation("key_cr_paos_instructions_help") }>
                        <TextArea id="paos-instr" rows={ 2 } value={ draft.instructions } onChange={ setText("instructions") } maxLength={ 1000 } disabled={ sessionRo } />
                    </Field>
                    <div className="row">
                        <Field label={ translation("key_cr_paos_booking_confirmation") } htmlFor="paos-ref" className="f-m" error={ errors.booking_ref } hint={ errors.booking_ref ? undefined : translation("key_cr_paos_booking_help") }>
                            <TextInput id="paos-ref" className="mono" value={ draft.booking_ref } onChange={ setText("booking_ref") } maxLength={ 100 } disabled={ sessionRo } invalid={ Boolean(errors.booking_ref) } />
                        </Field>
                    </div>
                </>
            ) }
            <div className="row">
                <Field label={ translation("key_attended") } htmlFor="paos-att" className="f-s" error={ errors.attended } hint={ errors.attended || view ? undefined : (arrived || outcome ? undefined : translation("key_cr_paos_after_arrival")) }>
                    <TriSelect id="paos-att" value={ draft.attended } onChange={ set("attended") } disabled={ attendanceRo } invalid={ Boolean(errors.attended) } />
                </Field>
                <Field label={ translation("key_attendance_date") } htmlFor="paos-attdate" className="f-date" error={ errors.attendance_date } hint={ errors.attendance_date ? undefined : translation("key_cr_paos_on_or_after_arrival") }>
                    <DateInput id="paos-attdate" name="paos-attdate" value={ draft.attendance_date } onChange={ set("attendance_date") } min={ arrIso || undefined } invalid={ Boolean(errors.attendance_date) } disabled={ attendanceRo || (!outcome && !arrived) } />
                </Field>
            </div>
            <div className="row">
                <Field label={ translation("key_certificate_received") } htmlFor="paos-cert" className="f-s" error={ errors.certificate_received } hint={ errors.certificate_received ? undefined : translation("key_cr_paos_required_for_completed") }>
                    <TriSelect id="paos-cert" value={ draft.certificate_received } onChange={ set("certificate_received") } disabled={ certificateRo } invalid={ Boolean(errors.certificate_received) } />
                </Field>
                <Field label={ translation("key_certificate_reference") } htmlFor="paos-certref" className="f-m" error={ errors.certificate_ref }>
                    <TextInput id="paos-certref" className="mono" value={ draft.certificate_ref } onChange={ setText("certificate_ref") } maxLength={ 100 } disabled={ certificateRo } invalid={ Boolean(errors.certificate_ref) } />
                </Field>
            </div>
            { !view && (
                <Field label={ translation("key_note") } htmlFor="paos-note" full className="f-full" error={ errors.note } hint={ errors.note ? undefined : translation(draft.progress === CR_PAOS_PROGRESS.NEEDS_REBOOKING && !outcome ? "key_cr_paos_note_required" : "key_optional") }>
                    <TextArea id="paos-note" rows={ 2 } value={ draft.note } onChange={ setText("note") } maxLength={ 1000 } disabled={ busy } invalid={ Boolean(errors.note) } />
                </Field>
            ) }
            { serverError && <div className="err" role="alert">{ serverError }</div> }
            <History info={ info } />
        </Modal>
    );
};

PaosDialog.propTypes = {
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    row: PropTypes.object.isRequired,
    info: PropTypes.object,
    mode: PropTypes.oneOf(["edit", "view", "outcome"]).isRequired,
    onClose: PropTypes.func.isRequired,
    onSaved: PropTypes.func.isRequired,
};

export default PaosDialog;
