import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import Icon from "../../../../components/Icon/Icon";
import { Checkbox, Field, TextInput } from "../../../../components/ui/FormControls";
import useDialogFocus from "../../../../hooks/useDialogFocus";
import translation from "../../../../utils/translation";
import { chagneProcessingCs } from "../../../../redux/Slices/processing/ProcessingSlice";
import { getOtherCsStaff } from "../../../../services/cs";
import { changeProcessingCsAssistantAPI } from "../../../../services/processings";
import { showSuccessOrError } from "../../../../services/commonService";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { Avatar } from "./OwnersPill";
import { isProcessing, ownerRows, apiErrorMessage as apiError, byName } from "./contractRecordUtils";
import PrepReadyReassignDialog from "./PrepReadyReassignDialog";
import { CD_ASSISTANT_UNASSIGNED, CR_OWNER_ROLE } from "../contractConstants";
import "./contract-actions.css";

/**
 * Contract record → Actions → Manage owners: the prototype's right-hand drawer (Contract_Details.html ownersDrawerHTML)
 * and its per-register reassign dialog (reassignDialogHTML) on the kit Modal:
 *   Processing CS Owner — recipients from POST /settings/employer/search-other-cs-staff (the record's branch, its owner
 *     left out); POST /processing/global/change-processing-cs { staff_id, reason, send_email: 0, cs_assistant_action
 *     "remove" when the recipient is the record's CS Assistant — the explicit collision resolution }. The Branch is
 *     preserved and linked invoice ownership follows the new owner (U-0158).
 *   CS Assistant — the same recipient search; POST /processing/global/change-processing-cs-assistant
 *     { staff_id | null = Unassigned, reason }.
 *   Prepared owner / Ready owner: the sign-off registers (PrepReadyReassignDialog); Change needs
 *     processing_change_prep_ready_owner (admin always) and a Processing contract.
 * An assigned person the server marks inactive carries the Inactive badge.
 */
const REASON_MAX = 500;

const Pick = ({ on, disabled, label, em, onPick }) => (
    <button type="button" className={ `ctx-pick${ on ? " on" : "" }` } role="radio" aria-checked={ on } aria-disabled={ disabled ? "true" : undefined } onClick={ () => { if (!disabled) onPick(); } }>
        <span className="ctx-pick-dot" aria-hidden="true" />{ label }{ em ? <em>{ em }</em> : null }
    </button>
);
Pick.propTypes = { on: PropTypes.bool, disabled: PropTypes.bool, label: PropTypes.node, em: PropTypes.node, onPick: PropTypes.func };

/* ---------------- the reassign dialog (one register) ---------------- */
const ReassignDialog = ({ role, contractId, row, canChangeAssistant, onClose, onChanged }) => {
    const dispatch = useDispatch();
    const isCs = role === CR_OWNER_ROLE.CS;
    const label = translation(isCs ? "key_processing_cs_owner" : "key_cs_assistant");
    const current = useMemo(() => (isCs
        ? (row.cs_owner_id ? { id: Number(row.cs_owner_id), name: row.cs_owner_name || "" } : null)
        : (row.cs_assistant_id ? { id: Number(row.cs_assistant_id), name: row.cs_assistant_name || "" } : null)), [isCs, row.cs_owner_id, row.cs_owner_name, row.cs_assistant_id, row.cs_assistant_name]);
    const assistantId = row.cs_assistant_id ? Number(row.cs_assistant_id) : null;
    const ownerId = row.cs_owner_id ? Number(row.cs_owner_id) : null;
    const [staff, setStaff] = useState(null);           /* recipients — null while loading */
    const [staffError, setStaffError] = useState("");
    const [pick, setPick] = useState(null);             /* staff id · CD_ASSISTANT_UNASSIGNED */
    const [clearAssistant, setClearAssistant] = useState(false);
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const inFlight = useRef(false);

    useEffect(() => {
        let alive = true;
        setStaff(null); setStaffError("");
        getOtherCsStaff({ type: "contract", rel_id: Number(contractId), search_text: "", employer_id: row.employer_id ?? null })
            .then((res) => { if (!alive) return; const list = Array.isArray(res?.data?.data) ? res.data.data : []; setStaff(list.map((s) => ({ id: Number(s.id), name: s.name || "", inactive: s.is_active === false })).filter((s) => s.id > 0).sort(byName)); })
            .catch((e) => { if (!alive) return; setStaff([]); setStaffError(apiError(e)); });
        return () => { alive = false; };
    }, [contractId, row.employer_id]);

    /* the current holder stays visible (disabled, "current") even when the search leaves it out */
    const picks = useMemo(() => {
        const list = (staff || []).filter((s) => !s.inactive && !(isCs && current && s.id === current.id) && !(!isCs && assistantId && s.id === assistantId) && !(!isCs && ownerId && s.id === ownerId));
        const out = list.map((s) => ({ id: s.id, name: s.name, disabled: false, em: isCs && assistantId && s.id === assistantId ? translation("key_cs_assistant") : null }));
        if (current) out.push({ id: current.id, name: current.name, disabled: true, em: translation("key_current").toLowerCase() });
        out.sort(byName);
        if (!isCs && current) out.push({ id: CD_ASSISTANT_UNASSIGNED, name: translation("key_unassigned"), disabled: false, em: translation("key_clears_the_register") });
        return out;
    }, [staff, current, isCs, assistantId, ownerId]);

    const collide = isCs && pick !== null && assistantId !== null && pick === assistantId;
    const okPick = pick !== null && (pick === CD_ASSISTANT_UNASSIGNED ? Boolean(current) : !(current && pick === current.id));
    const ok = okPick && (!collide || (canChangeAssistant && clearAssistant)) && !busy && staff !== null;
    const pickName = pick === CD_ASSISTANT_UNASSIGNED ? translation("key_unassigned") : (picks.find((p) => p.id === pick)?.name || "");
    const verb = pick === CD_ASSISTANT_UNASSIGNED ? translation("key_set_cs_assistant_unassigned") : `${ translation("key_change") } ${ label }`;

    const confirm = useCallback(async () => {
        if (!ok || inFlight.current) return;
        inFlight.current = true; setBusy(true); setError("");
        const reasonText = reason.trim();
        try {
            if (isCs) {
                /* the audit reason replaces the retired notification e-mail (workbook #114); the Branch is never sent */
                const payload = { contract_id: Number(contractId), staff_id: Number(pick), send_email: 0, ...(reasonText ? { reason: reasonText } : {}), ...(collide ? { cs_assistant_action: "remove" } : {}) };
                const res = await dispatch(chagneProcessingCs(payload));
                showSuccessOrError(res);
                if (res.error || !res.payload?.status) { setError(res.payload?.message || translation("key_something_went_wrong")); return; }
            } else {
                const response = await changeProcessingCsAssistantAPI({ contract_id: Number(contractId), staff_id: pick === CD_ASSISTANT_UNASSIGNED ? null : Number(pick), ...(reasonText ? { reason: reasonText } : {}) });
                if (!response?.data?.status) { setError(response?.data?.message || translation("key_something_went_wrong")); return; }
                ShowToast("success", response.data.message);
            }
            if (onChanged) await onChanged();
            onClose();
        } catch (e) {
            setError(apiError(e));
        } finally { inFlight.current = false; setBusy(false); }
    }, [ok, isCs, contractId, pick, collide, reason, dispatch, onChanged, onClose]);

    const intro = [row.worker_name, row.worker_code || row.contract_number, row.group ? `${ translation("key_group") } ${ row.group }` : null, row.branch_name].filter(Boolean).join(" · ");
    return (
        <Modal title={ `${ translation("key_change") } ${ label }` } width={ 560 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="mcdt-dlg"
            footer={ (
                <>
                    <span className="grow" />
                    <Btn variant="secondary" type="button" disabled={ busy } onClick={ onClose }>{ translation("key_cancel") }</Btn>
                    <Btn variant="primary" type="button" disabled={ !ok } onClick={ confirm }>{ busy ? `${ translation("key_loading") }…` : verb }</Btn>
                </>
            ) }>
            <p className="intro">{ intro }{ intro ? ". " : "" }{ translation("key_current") } { label }: <b>{ current ? current.name : translation("key_unassigned") }</b>.</p>
            { staff === null && <div className="ctx-empty">{ translation("key_loading") }…</div> }
            { staff !== null && picks.length === 0 && <div className="ctx-empty">{ translation("key_nobody_eligible_for_role") }</div> }
            { staff !== null && picks.length > 0 && (
                <div className="ctx-picks" role="radiogroup" aria-label={ `${ translation("key_new") } ${ label }` }>
                    { picks.map((p) => <Pick key={ String(p.id) } on={ pick === p.id } disabled={ p.disabled || busy } label={ p.name } em={ p.em } onPick={ () => setPick(p.id) } />) }
                </div>
            ) }
            { staffError && <div className="note danger" role="alert">{ staffError }</div> }
            { collide && (
                <div className="note collide">
                    <b>{ pickName } { translation("key_is_this_records_cs_assistant") }</b> { translation("key_owner_assistant_collision_note") }
                    { canChangeAssistant
                        ? <Checkbox className="chk" label={ translation("key_also_set_cs_assistant_unassigned") } checked={ clearAssistant } disabled={ busy } onChange={ (e) => setClearAssistant(e.target.checked) } />
                        : <div className="err" role="alert">{ translation("key_owner_is_assistant_no_permission") }</div> }
                </div>
            ) }
            <Field label={ translation("key_bulk_reason_label") } htmlFor="cr-reassign-reason" full className="f-full">
                <TextInput id="cr-reassign-reason" value={ reason } maxLength={ REASON_MAX } disabled={ busy } placeholder={ translation("key_optional") } onChange={ (e) => setReason(e.target.value) } />
            </Field>
            <div className="note">{ translation(isCs ? "key_reassign_cs_owner_note" : "key_reassign_cs_assistant_note") }</div>
            { error && <div className="note danger" role="alert">{ error }</div> }
        </Modal>
    );
};
ReassignDialog.propTypes = { role: PropTypes.oneOf([CR_OWNER_ROLE.CS, CR_OWNER_ROLE.ASSISTANT]).isRequired, contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, row: PropTypes.object.isRequired, canChangeAssistant: PropTypes.bool, onClose: PropTypes.func.isRequired, onChanged: PropTypes.func };

/* ---------------- the drawer ---------------- */
const ManageOwnersDrawer = ({ contractId, row, canChangeOwner = false, canChangeAssistant = false, canChangePrepReady = false, onClose, onChanged }) => {
    const ref = useRef(null);
    const [reassign, setReassign] = useState(null);   /* a CR_OWNER_ROLE */
    useDialogFocus(ref, onClose);
    const prepReady = canChangePrepReady && isProcessing(row);
    const canOf = { [CR_OWNER_ROLE.CS]: canChangeOwner, [CR_OWNER_ROLE.ASSISTANT]: canChangeAssistant, [CR_OWNER_ROLE.PREPARED]: prepReady, [CR_OWNER_ROLE.READY]: prepReady };
    const isPrepReadyRole = (role) => role === CR_OWNER_ROLE.PREPARED || role === CR_OWNER_ROLE.READY;
    return createPortal(
        <>
            <div className="mcca-backdrop" role="presentation" onClick={ onClose } />
            <aside ref={ ref } className="mcca-drawer" role="dialog" aria-modal="true" aria-labelledby="mcca-od-title" tabIndex={ -1 }>
                <header className="hd">
                    <div><h2 id="mcca-od-title">{ translation("key_manage_owners") }</h2><div className="sub">{ [row.worker_code || row.contract_number, row.worker_name].filter(Boolean).join(" · ") }</div></div>
                    <button type="button" className="ctx-icon-btn" aria-label={ translation("key_close") } onClick={ onClose }><Icon name="x" size={ 14 } strokeWidth={ 1.8 } /></button>
                </header>
                <div className="bd">
                    { ownerRows(row).map((r) => (
                        <div key={ r.role } className="orow" data-owner-row={ r.role }>
                            <Avatar name={ r.name } role={ r.role } size="lg" />
                            <div className="b">
                                <div className={ `nm${ r.name ? "" : " unassigned" }` }>{ r.name || translation("key_unassigned") }{ r.inactive && <span className="inactive">{ translation("key_inactive") }</span> }</div>
                                <div className="rl">{ translation(r.role === CR_OWNER_ROLE.CS ? "key_processing_cs_owner" : r.labelKey) }</div>
                            </div>
                            { canOf[r.role] && <Btn variant="secondary" type="button" className="ctx-sm" onClick={ () => setReassign(r.role) }>{ translation(r.role === CR_OWNER_ROLE.CS ? "key_change" : "key_reassign") }</Btn> }
                        </div>
                    )) }
                </div>
            </aside>
            { reassign && isPrepReadyRole(reassign) && <PrepReadyReassignDialog role={ reassign } contractId={ contractId } row={ row } onClose={ () => setReassign(null) } onChanged={ onChanged } /> }
            { reassign && !isPrepReadyRole(reassign) && <ReassignDialog role={ reassign } contractId={ contractId } row={ row } canChangeAssistant={ canChangeAssistant } onClose={ () => setReassign(null) } onChanged={ onChanged } /> }
        </>,
        document.body,
    );
};
ManageOwnersDrawer.propTypes = { contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, row: PropTypes.object.isRequired, canChangeOwner: PropTypes.bool, canChangeAssistant: PropTypes.bool, canChangePrepReady: PropTypes.bool, onClose: PropTypes.func.isRequired, onChanged: PropTypes.func };

export default ManageOwnersDrawer;
