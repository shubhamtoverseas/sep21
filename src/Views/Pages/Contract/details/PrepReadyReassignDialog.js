import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import { Field, TextArea } from "../../../../components/ui/FormControls";
import translation from "../../../../utils/translation";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { changePrepReadyOwnerAPI, getPrepReadyEligibleAPI } from "../../../../services/processings";
import { CD_OWNER_UNASSIGNED, CR_OWNER_ROLE, CR_PREP_READY } from "../contractConstants";
import { apiErrorMessage as apiError, byName } from "./contractRecordUtils";

/**
 * Change Prepared owner / Change Ready owner (prototype B14-47 / B14-48; OWNERS "Prepared and Ready"): the register's
 * eligible staff from GET /processing/global/prep-ready-owners/eligible — every row rendered, a non-selectable row
 * disabled with its reason (the other register's holder: maker ≠ checker; the current holder), Unassigned always
 * offered — an optional reason (≤ 500) and POST /processing/global/change-prep-ready-owner { contract_id, register,
 * staff_id | null, reason }. Nothing else changes: not the other register, the CS Owner, the branch, invoices,
 * Insurance, nor the Prepared / Ready marks on the Immigration tab.
 *
 * Extend Visa case (backend 378, EXTEND §11.3): the same picker with `submit` (the case page's call to
 * POST /processing/global/extend-visa/owner) and `holder` (the case's own holder, since the eligible list's
 * `is_current` is the parent contract's): assign or reassign only — no Unassigned entry, no reason.
 */

const Pick = ({ on, disabled, label, em, onPick }) => (
    <button type="button" className={ `ctx-pick${ on ? " on" : "" }` } role="radio" aria-checked={ on } aria-disabled={ disabled ? "true" : undefined } onClick={ () => { if (!disabled) onPick(); } }>
        <span className="ctx-pick-dot" aria-hidden="true" />{ label }{ em ? <em>{ em }</em> : null }
    </button>
);
Pick.propTypes = { on: PropTypes.bool, disabled: PropTypes.bool, label: PropTypes.node, em: PropTypes.node, onPick: PropTypes.func };

const PrepReadyReassignDialog = ({ role, contractId, row, onClose, onChanged, submit, holder }) => {
    const forCase = typeof submit === "function";
    const isPrepared = role === CR_OWNER_ROLE.PREPARED;
    const register = CR_PREP_READY.REGISTER_BY_ROLE[role];
    const label = translation(isPrepared ? "key_prepared_owner" : "key_ready_owner");
    const [eligible, setEligible] = useState(null);      /* the server's answer — null while loading */
    const [loadError, setLoadError] = useState("");
    const [pick, setPick] = useState(null);              /* staff id · CD_OWNER_UNASSIGNED */
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const inFlight = useRef(false);

    useEffect(() => {
        let alive = true;
        setEligible(null); setLoadError("");
        getPrepReadyEligibleAPI({ contract_id: Number(contractId), register })
            .then((res) => { if (!alive) return; const d = res?.data?.data; if (!res?.data?.status || !d) { setEligible({ staff: [], current: null }); setLoadError(res?.data?.message || translation("key_something_went_wrong")); } else setEligible(d); })
            .catch((e) => { if (!alive) return; setEligible({ staff: [], current: null }); setLoadError(apiError(e)); });
        return () => { alive = false; };
    }, [contractId, register]);

    const current = useMemo(() => (forCase ? (holder?.id != null ? { id: Number(holder.id), name: holder.name || "" } : null) : (eligible?.current || null)), [forCase, holder, eligible]);
    const picks = useMemo(() => {
        const rows = Array.isArray(eligible?.staff) ? eligible.staff : [];
        /* backend 298 (U-0367): the other register's holder is selectable — the same person may be Prepared AND Ready owner;
           `is_other_register_holder` is display-only and no longer annotated */
        const isCurrent = (s) => (forCase ? current != null && Number(s.id) === current.id : Boolean(s.is_current));
        const out = rows.map((s) => ({
            id: Number(s.id), name: s.name || "", disabled: s.selectable === false || isCurrent(s),
            em: isCurrent(s) ? translation("key_current").toLowerCase() : null,
        })).sort(byName);
        if (!forCase) out.push({ id: CD_OWNER_UNASSIGNED, name: translation("key_unassigned"), disabled: !current, em: translation("key_clears_the_register") });
        return out;
    }, [eligible, current, forCase]);

    const ok = pick !== null && !busy && eligible !== null && !(current && pick === current.id);
    const confirm = useCallback(async () => {
        if (!ok || inFlight.current) return;
        inFlight.current = true; setBusy(true); setError("");
        const reasonText = reason.trim();
        try {
            if (forCase) {
                const res = await submit({ register, staff_id: Number(pick) });
                if (!res?.ok) {
                    if (res?.status === 403) { ShowToast("error", res.message || translation("key_something_went_wrong")); onClose(); return; }
                    /* a 409 other than "already assigned" is a stale case: the page reloads it */
                    if (res?.status === 409 && res?.code !== CR_PREP_READY.ALREADY_ASSIGNED_CODE) { ShowToast("error", translation("key_cr_xv_changed_reload")); if (onChanged) await onChanged(); onClose(); return; }
                    setError(res?.message || translation("key_something_went_wrong")); return;
                }
                ShowToast("success", res.message || translation("key_success"));
                if (onChanged) await onChanged();
                onClose();
                return;
            }
            const res = await changePrepReadyOwnerAPI({ contract_id: Number(contractId), register, staff_id: pick === CD_OWNER_UNASSIGNED ? null : Number(pick), ...(reasonText ? { reason: reasonText } : {}) });
            if (!res?.data?.status) { setError(res?.data?.message || translation("key_something_went_wrong")); return; }
            ShowToast("success", res.data.message || translation("key_success"));
            if (onChanged) await onChanged();
            onClose();
        } catch (e) {
            /* 403 = no permission: the standard toast and the dialog closes; 400 / 422 stay inline */
            if (e?.response?.status === 403) { ShowToast("error", apiError(e)); onClose(); return; }
            setError(apiError(e));
        } finally { inFlight.current = false; setBusy(false); }
    }, [ok, contractId, register, pick, reason, onChanged, onClose, forCase, submit]);

    const intro = [row.worker_name, row.worker_code || row.contract_number, row.group ? `${ translation("key_group") } ${ row.group }` : null, row.branch_name].filter(Boolean).join(" · ");
    const action = translation(forCase && !current ? "key_assign" : "key_change");
    const verb = pick === CD_OWNER_UNASSIGNED ? translation(isPrepared ? "key_cr_set_prepared_unassigned" : "key_cr_set_ready_unassigned") : `${ action } ${ label }`;
    return (
        <Modal title={ `${ action } ${ label }` } width={ 560 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="mcdt-dlg"
            footer={ (
                <>
                    <span className="grow" />
                    <Btn variant="secondary" type="button" disabled={ busy } onClick={ onClose }>{ translation("key_cancel") }</Btn>
                    <Btn variant="primary" type="button" disabled={ !ok } onClick={ confirm }>{ busy ? `${ translation("key_loading") }…` : verb }</Btn>
                </>
            ) }>
            <p className="intro">{ intro }{ intro ? ". " : "" }{ translation("key_current") } { label }: <b>{ current ? current.name : translation("key_unassigned") }</b>.</p>
            { eligible === null && <div className="ctx-empty">{ translation("key_loading") }…</div> }
            { eligible !== null && picks.length === 1 && <div className="ctx-empty">{ translation("key_nobody_eligible_for_role") }</div> }
            { eligible !== null && (
                <div className="ctx-picks" role="radiogroup" aria-label={ `${ translation("key_new") } ${ label }` }>
                    { picks.map((p) => <Pick key={ String(p.id) } on={ pick === p.id } disabled={ p.disabled || busy } label={ p.name } em={ p.em } onPick={ () => setPick(p.id) } />) }
                </div>
            ) }
            { loadError && <div className="note danger" role="alert">{ loadError }</div> }
            { !forCase && (
                <Field label={ translation("key_bulk_reason_label") } htmlFor="cr-prepready-reason" full className="f-full" hint={ `${ reason.length } / ${ CR_PREP_READY.REASON_MAX }` }>
                    <TextArea id="cr-prepready-reason" rows={ 2 } value={ reason } maxLength={ CR_PREP_READY.REASON_MAX } disabled={ busy } placeholder={ translation("key_optional") } onChange={ (e) => setReason(e.target.value) } />
                </Field>
            ) }
            <div className="note">{ translation(isPrepared ? "key_cr_prepared_owner_note" : "key_cr_ready_owner_note") }</div>
            { error && <div className="note danger" role="alert">{ error }</div> }
        </Modal>
    );
};

PrepReadyReassignDialog.propTypes = {
    role: PropTypes.oneOf([CR_OWNER_ROLE.PREPARED, CR_OWNER_ROLE.READY]).isRequired,
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    row: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onChanged: PropTypes.func,
    submit: PropTypes.func,
    holder: PropTypes.shape({ id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), name: PropTypes.string }),
};

export default PrepReadyReassignDialog;
