import React, { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";
import dayjs from "../../../../../utils/dayjsConfig";
import translation from "../../../../../utils/translation";
import Modal from "../../../../../components/ui/Modal";
import Btn from "../../../../../components/ui/Btn";
import { Field, RadioGroup, TextArea } from "../../../../../components/ui/FormControls";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { updateImmigrationApplicabilityAPI } from "../../../../../services/processings";
import { Cell, Listing, ListingRow } from "../../../../../components/Processing/newui/StagePanel";
import { ImmigrationRows, IMM_COLUMNS } from "./ImmigrationListing";
import { IMMIGRATION_APPLICABILITY } from "../../processingConstants";

/**
 * Immigration → "Additional requirements" (prototype Contract_Details.html v210ImmPanel): the conditional sections in force
 * as one compact listing with the attributable applicability assessment per section (Excel Contract No. 13). Vocabulary per
 * U-0304 Revised (21 Oct package): "Unknown" (no record yet, amber, Review button), "Needs review" (a stored assessment —
 * examined but unresolved, amber), "Applies" (green; the section's requirement rows follow, indented) or "Does not apply"
 * (grey), the stored three each with "who · when" and a Change button. Review / Change opens the assessment dialog —
 * Applies / Does not apply / Needs review + a required reason — and saves through the same API as before:
 * POST /update-immigration-applicability { contract_id, section_key, assessment: applies | does_not_apply | needs_review, reason }.
 * An unassessed or needs-review section is never treated as inapplicable by default — both block Ready to Submit (server
 * blocked_by). A section the server answered itself (`derived`, e.g. the Helper's HKID from the Master Form — B-1) shows
 * its `question`, the answer and "Master Form" with no Review / Change.
 *
 * `sections`: [{ key, title, current: immigration_applicability[key], rows, onOpen }] — the sections in force come from the
 * server's `immigration_checklist.sections` (contract 22 Oct 2026); the rows render beneath an applicable section through the
 * stage's own row renderer and are addressed by their stable key (`onTick(row, field, value)`).
 */
const { APPLIES, NOT_APPLIES, NEEDS_REVIEW, UNKNOWN } = IMMIGRATION_APPLICABILITY;
const STORABLE = [APPLIES, NOT_APPLIES, NEEDS_REVIEW];
const stateOf = (current) => (STORABLE.includes(current?.assessment) ? current.assessment : UNKNOWN);
const assessmentLabel = (a) => (a === APPLIES ? translation("key_applies") : a === NOT_APPLIES ? translation("key_does_not_apply") : translation("key_needs_review"));
const when = (at) => { if (!at) return ""; const d = dayjs(String(at).replace("T", " ").slice(0, 19), ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"], true); return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : String(at); };
const meta = (current) => [typeof current?.assessed_by_name === "string" ? current.assessed_by_name : "", when(current?.assessed_at)].filter(Boolean).join(" · ");
const plural = (n, one, many) => `${ n } ${ n === 1 ? one : many }`;

/* ---------------- the assessment dialog (prototype dialogHTML k:'evApplic') ---------------- */
const ApplicabilityDialog = ({ contractId, section, onClose, onSaved }) => {
    const prev = STORABLE.includes(section.current?.assessment) ? section.current : null;
    const [value, setValue] = useState(prev ? prev.assessment : "");
    const [reason, setReason] = useState("");
    const [tried, setTried] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const inFlight = useRef(false);
    const errs = tried ? { v: !value ? translation("key_ar_select_assessment") : "", reason: !reason.trim() ? translation("key_ar_reason_required") : "" } : { v: "", reason: "" };
    const confirm = useCallback(async () => {
        setTried(true);
        if (!value || !reason.trim() || inFlight.current) return;
        inFlight.current = true; setBusy(true); setError("");
        try {
            const response = await updateImmigrationApplicabilityAPI({ contract_id: Number(contractId), section_key: section.key, assessment: value, reason: reason.trim() });
            if (!response?.data?.status) { setError(response?.data?.message || translation("key_something_went_wrong")); return; }
            ShowToast("success", response.data.message);
            if (onSaved) await onSaved();
            onClose();
        } catch (e) {
            setError(e?.response?.data?.message || translation("key_something_went_wrong"));
        } finally { inFlight.current = false; setBusy(false); }
    }, [value, reason, contractId, section.key, onSaved, onClose]);
    const title = `${ prev ? translation("key_ar_change_applicability") : translation("key_ar_record_applicability") } — ${ section.title }`;
    return (
        <Modal title={ title } width={ 520 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="mcdt-dlg"
            footer={ (
                <>
                    <span className="grow" />
                    <Btn variant="secondary" type="button" disabled={ busy } onClick={ onClose }>{ translation("key_cancel") }</Btn>
                    <Btn variant="primary" type="button" disabled={ busy } onClick={ confirm }>{ busy ? `${ translation("key_loading") }…` : (prev ? translation("key_ar_change_assessment") : translation("key_ar_record_assessment")) }</Btn>
                </>
            ) }>
            <Field label={ translation("key_ar_assessment") } required error={ errs.v } full>
                <RadioGroup name="mcca-ar-v" value={ value } disabled={ busy } ariaLabel={ translation("key_ar_assessment") } onChange={ (v) => setValue(v) }
                    options={ STORABLE.map((a) => ({ value: a, label: assessmentLabel(a) })) } />
            </Field>
            <Field label={ translation("key_reason") } htmlFor="mcca-ar-reason" required error={ errs.reason } hint={ translation("key_ar_reason_help") } full>
                <TextArea id="mcca-ar-reason" rows={ 3 } value={ reason } disabled={ busy } invalid={ Boolean(errs.reason) } aria-required="true" onChange={ (e) => setReason(e.target.value) } />
            </Field>
            { prev && <div className="g1-note">{ translation("key_ar_previous_assessment") }: { assessmentLabel(prev.assessment) }{ meta(prev) ? ` — ${ meta(prev) }` : "" } { translation("key_ar_kept_in_history") }</div> }
            { error && <div className="g1-err" role="alert">{ error }</div> }
        </Modal>
    );
};
ApplicabilityDialog.propTypes = { contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, section: PropTypes.object.isRequired, onClose: PropTypes.func.isRequired, onSaved: PropTypes.func };

/* ---------------- the listing ---------------- */
const AdditionalRequirements = ({ contractId, sections, canEdit = false, canTick = false, canPrepared, canReady, onTick, onSaved }) => {
    const [open, setOpen] = useState(null);   /* the section being assessed */
    const states = sections.map((s) => stateOf(s.current));
    const nUnk = states.filter((s) => s === UNKNOWN).length;
    const nRev = states.filter((s) => s === NEEDS_REVIEW).length;
    const nApp = states.filter((s) => s === APPLIES).length;
    const nNo = states.filter((s) => s === NOT_APPLIES).length;
    const summary = [
        nUnk ? plural(nUnk, translation("key_ar_not_assessed_one"), translation("key_ar_not_assessed_many")) : "",
        nRev ? plural(nRev, translation("key_ar_needs_review_one"), translation("key_ar_needs_review_many")) : "",
        nApp ? plural(nApp, translation("key_ar_applies_one"), translation("key_ar_applies_many")) : "",
        nNo ? plural(nNo, translation("key_ar_not_apply_one"), translation("key_ar_not_apply_many")) : "",
    ].filter(Boolean).join(" · ");
    const openSection = sections.find((s) => s.key === open) || null;
    return (
        <div data-additional-requirements="">
            <Listing title={ <>{ translation("key_additional_requirements") }<i className="g1-listing-sum">{ summary }</i></> } columns={ nApp > 0 ? IMM_COLUMNS : [] }>
                { sections.map((s, i) => {
                    const state = states[i];
                    const m = meta(s.current);
                    return (
                        <React.Fragment key={ s.key }>
                            <ListingRow name={ s.title } sub={ s.current?.question || undefined }>
                                <Cell>
                                    <div className="g1-cell-auto" data-section={ s.key } data-state={ state }>
                                        { state === UNKNOWN && <span className={ `g1-st ${ canEdit ? "review" : "none" }` }>{ translation("key_unknown") }</span> }
                                        { state === NEEDS_REVIEW && <span className="g1-st review" title={ s.current?.reason || "" }>{ translation("key_needs_review") }</span> }
                                        { state === APPLIES && <span className="g1-st applies" title={ s.current?.reason || "" }>{ translation("key_applies") }</span> }
                                        { state === NOT_APPLIES && <span className="g1-st no" title={ s.current?.reason || "" }>{ translation("key_does_not_apply") }</span> }
                                        { state !== UNKNOWN && (s.current?.derived ? <span className="g1-rmeta" data-derived="">{ translation("key_master_form") }</span> : (m && <span className="g1-rmeta">{ m }</span>)) }
                                        { canEdit && !s.current?.derived && <button type="button" className="g1-btn sm" onClick={ () => setOpen(s.key) }>{ state === UNKNOWN ? translation("key_review") : translation("key_change") }</button> }
                                    </div>
                                </Cell>
                            </ListingRow>
                            { state === APPLIES && Array.isArray(s.rows) && s.rows.length > 0 && (
                                <div className="g1-subrows"><ImmigrationRows rows={ s.rows } canTick={ canTick } canPrepared={ canPrepared } canReady={ canReady } onTick={ onTick } onOpen={ s.onOpen } /></div>
                            ) }
                        </React.Fragment>
                    );
                }) }
            </Listing>
            { openSection && <ApplicabilityDialog contractId={ contractId } section={ openSection } onClose={ () => setOpen(null) } onSaved={ onSaved } /> }
        </div>
    );
};
AdditionalRequirements.propTypes = {
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    sections: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string.isRequired, title: PropTypes.string.isRequired, current: PropTypes.object, rows: PropTypes.array, onOpen: PropTypes.func })).isRequired,
    canEdit: PropTypes.bool,     /* may assess a section */
    canTick: PropTypes.bool,     /* legacy single gate for Prepared / Ready on an applicable section's rows */
    canPrepared: PropTypes.bool, /* sign-off: may mark Prepared (register owner) */
    canReady: PropTypes.bool,    /* sign-off: may mark Ready (register owner) */
    onTick: PropTypes.func.isRequired,
    onSaved: PropTypes.func,
};

export default AdditionalRequirements;
