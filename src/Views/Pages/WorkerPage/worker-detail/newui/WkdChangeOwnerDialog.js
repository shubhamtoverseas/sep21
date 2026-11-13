import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import Modal from "../../../../../components/ui/Modal";
import Btn from "../../../../../components/ui/Btn";
import { Field, TextInput } from "../../../../../components/ui/FormControls";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import translation from "../../../../../utils/translation";
import { headingCase } from "../../../../../utils/utils";
import { fetchWorkerOnboarding, updateWorkerOnboarding } from "../../../../../redux/Slices/worker/WorkerSlice";
import { fill } from "../../../../../components/mc-dialog/McDialog";
import { ONBOARDING_TYPE_PARAM, WKD_OWNER_DIALOG_COPY, WKD_OWNER_SEARCH_DEBOUNCE_MS } from "../../workerModuleConstants";
import "./wkd-dialogs.css";

/**
 * Change Onboarding 1 / Change Onboarding 2 (prototype Worker_Details.html reassign-confirm; PERM §2.9 "Change
 * Onboarding Owner"): the worker line, the current owner, the eligible staff as radio picks (the server's list for this
 * worker and role — a typed name narrows it), the eligibility note, Cancel + the action:
 * `updateWorkerOnboarding { type: one | two, worker_id, onboarding_id }`. The record is re-read by the caller (`onChanged`).
 * Changing Onboarding 2 sends no message: it is not the Partner assignment event (10 Nov 2026 package X-06 / TC08, ruling Q6).
 */
const Pick = ({ on, disabled, label, em, onPick }) => (
    <button type="button" className={ `ctx-pick${ on ? " on" : "" }` } role="radio" aria-checked={ on } aria-disabled={ disabled ? "true" : undefined } onClick={ () => { if (!disabled) onPick(); } }>
        <span className="ctx-pick-dot" aria-hidden="true" /><span className="lbl">{ label }</span>{ em ? <em>{ em }</em> : null }
    </button>
);
Pick.propTypes = { on: PropTypes.bool, disabled: PropTypes.bool, label: PropTypes.node, em: PropTypes.node, onPick: PropTypes.func };

const WkdChangeOwnerDialog = ({ type, worker, onClose, onChanged }) => {
    const dispatch = useDispatch();
    const title = `${ translation("key_change_onboarding") } ${ type }`;
    const current = type === 2 ? worker?.onboarding2 : worker?.onboarding1;
    const [query, setQuery] = useState("");
    const [staff, setStaff] = useState(null);          /* the server's list — null while loading */
    const [pick, setPick] = useState(null);
    const [busy, setBusy] = useState(false);
    const requestSeq = useRef(0);

    /* the eligible staff for this worker and role; the search text narrows the server's answer (debounced) */
    useEffect(() => {
        const seq = ++requestSeq.current;
        const timer = setTimeout(() => {
            dispatch(fetchWorkerOnboarding({ type: ONBOARDING_TYPE_PARAM[type], worker_id: worker?.worker_id, search_text: query.trim() })).then((res) => {
                if (seq !== requestSeq.current) return;
                const rows = res?.payload?.data;
                setStaff(Array.isArray(rows) ? rows : []);
            });
        }, query ? WKD_OWNER_SEARCH_DEBOUNCE_MS : 0);
        return () => clearTimeout(timer);
    }, [dispatch, type, worker?.worker_id, query]);

    const picks = useMemo(() => (staff || []).map((s) => ({
        id: s.id, userId: s.user_id, name: s.name || "",
        isCurrent: Boolean(current) && s.name === current,
        count: s.worker_count && !s.worker_count.error ? s.worker_count : 0,
    })), [staff, current]);
    const selected = picks.find((p) => String(p.id) === String(pick)) || null;

    const confirm = useCallback(() => {
        if (!selected || busy) return;
        setBusy(true);
        dispatch(updateWorkerOnboarding({ type: ONBOARDING_TYPE_PARAM[type], worker_id: worker?.worker_id, onboarding_id: selected.id })).then((res) => {
            setBusy(false);
            if (res?.payload?.status) {
                ShowToast("success", res?.payload?.message);
                onChanged?.();
                onClose();
            } else {
                ShowToast("error", res?.payload?.message);
            }
        });
    }, [dispatch, type, worker?.worker_id, selected, busy, onChanged, onClose]);

    const vars = { type: worker?.type || "", nat: worker?.nationality || "" };
    const roleLabel = `${ translation("key_onboarding") } ${ type } ${ translation("key_owner").toLowerCase() }`;
    const footer = (
        <>
            <span className="grow" />
            <Btn variant="secondary" type="button" disabled={ busy } onClick={ onClose }>{ translation("key_cancel") }</Btn>
            <Btn variant="primary" type="button" disabled={ !selected || selected.isCurrent || busy } onClick={ confirm }>{ busy ? `${ translation("key_loading") }…` : title }</Btn>
        </>
    );
    return (
        <Modal title={ headingCase(title) } width={ 468 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="wkd-dlg" footer={ footer }>
            <p className="intro">
                { [worker?.name, worker?.type, worker?.nationality].filter(Boolean).join(" · ") }. { translation("key_current") } { roleLabel }: <b>{ current || translation("key_not_assigned") }</b>.
            </p>
            <Field label={ translation("key_search") } htmlFor={ `wkd-onb${ type }-search` } className="wkd-dlg-search">
                <TextInput id={ `wkd-onb${ type }-search` } type="search" value={ query } autoComplete="off" disabled={ busy } onChange={ (e) => setQuery(e.target.value) } />
            </Field>
            { staff === null && <div className="ctx-empty">{ translation("key_loading") }…</div> }
            { staff !== null && picks.length === 0 && <div className="ctx-empty">{ fill(WKD_OWNER_DIALOG_COPY.empty, vars) }</div> }
            { picks.length > 0 && (
                <div className="ctx-picks" role="radiogroup" aria-label={ `${ translation("key_new") } ${ roleLabel }` }>
                    { picks.map((p) => (
                        <Pick key={ String(p.id) } on={ String(pick) === String(p.id) } disabled={ p.isCurrent || busy } label={ p.name }
                            em={ p.isCurrent ? translation("key_current").toLowerCase() : `${ p.count } ${ translation("key_workers").toLowerCase() }` } onPick={ () => setPick(p.id) } />
                    )) }
                </div>
            ) }
            <p className="note">{ fill(WKD_OWNER_DIALOG_COPY.note, vars) }</p>
        </Modal>
    );
};

WkdChangeOwnerDialog.propTypes = {
    /* 1 · 2 — which Onboarding owner changes */
    type: PropTypes.oneOf([1, 2]).isRequired,
    /* the header's worker (WorkerDetail currentWorker): worker_id, name, type, nationality, onboarding1 / onboarding2 */
    worker: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onChanged: PropTypes.func,
};

export default WkdChangeOwnerDialog;
