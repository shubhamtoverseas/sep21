import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import dayjs from "../../../../utils/dayjsConfig";
import useDialogFocus from "../../../../hooks/useDialogFocus";
import { addProcessingRemark, deleteProcessingRemark, fetchProcessingRemarks, updateProcessingRemark } from "../../../../redux/Slices/remarks/RemarkSlice";
import { getCurrentUser } from "../../../../services/commonService";
import { getInitials } from "../../../../utils/utils";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { AlertDialog, serverError, tr } from "../../../../components/mc-dialog/McDialog";
import "./contract-actions.css";

/**
 * Contract Details → Context → Remarks drawer (the handoff's delivered Remarks panel: Worker_Details.html
 * remarksPanelHTML / remarkItemHTML inside the shared .ctx-drawer; Contract_Details.html opens it from the rail card).
 * Composer at the top (Add Remark / Save Remark when editing), then the remark cards: avatar · author · (staff) · time,
 * the text, and "Authored by you · Edit · Delete" or the lock line. Delete asks first (prototype .ctx-confirm).
 *
 * Same data as the Processing screen — the admin API processing remarks:
 *   POST /get-processing-remarks-list { contract_id }           → [{ id, remarks, remarks_by, remarks_by_name, created_at }]
 *   POST /save-processing-remarks     { contract_id, remarks[, remark_id] }   (remarks max 500)
 *   POST /delete-processing-remarks   { remark_id }             (soft delete)
 * Rule (ClickUp "Remark remove 24 hr rule", backend done 25 Sep): the author may edit / delete their own remarks indefinitely
 * while they hold the Remarks grant; anyone else needs the elevated "Update else's Remarks" grant (processing owner /
 * non-owner key, `canUpdateOthers`). No edit window anywhere. The list is re-read after every change.
 */
const REMARK_MAX = 500;
const X = <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /></svg>;
const LOCK = <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="4" y="7" width="8" height="6.5" rx="1.5" /><path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" /></svg>;
const when = (at) => { const d = dayjs(String(at || "").replace("T", " ").slice(0, 19)); return d.isValid() ? d.format("DD MMM YYYY · HH:mm") : ""; };
const authorName = (r) => (typeof r?.remarks_by_name === "string" && r.remarks_by_name.trim()) || (typeof r?.remarksby_info === "string" ? r.remarksby_info : "") || "";

const ContractRemarksDrawer = ({ contractId, row, canAdd = false, canUpdateOthers = false, loaded = false, onClose, onChanged }) => {
  const dispatch = useDispatch();
  const ref = useRef(null);
  const taRef = useRef(null);
  const { processingRemarks } = useSelector((s) => s.remarks || {}, shallowEqual);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(null);     /* the remark being edited in the composer */
  const [confirm, setConfirm] = useState(null);     /* the remark the delete confirmation is about */
  const [busy, setBusy] = useState(false);
  const [load, setLoad] = useState(loaded && Array.isArray(processingRemarks) ? "ok" : "loading");
  const inFlight = useRef(false);
  useDialogFocus(ref, onClose);
  const me = getCurrentUser()?.data?.id;

  const reload = useCallback(async () => {
    const res = await dispatch(fetchProcessingRemarks({ contract_id: Number(contractId) }));
    setLoad(res?.error ? "error" : "ok");
    return res;
  }, [dispatch, contractId]);
  useEffect(() => { reload(); }, [reload]);

  const remarks = useMemo(() => [...(Array.isArray(processingRemarks) ? processingRemarks : [])].sort((a, b) => Number(b.id) - Number(a.id)), [processingRemarks]);
  const isAuthor = (r) => me != null && Number(r?.remarks_by) === Number(me);
  const canMutate = (r) => (canAdd && isAuthor(r)) || canUpdateOthers;

  const finish = useCallback(async (res, okFallback) => {
    if (res?.error || res?.payload?.status === false) { ShowToast("error", serverError(res)); return false; }
    ShowToast("success", res?.payload?.message || okFallback);
    await reload();
    if (onChanged) onChanged();
    return true;
  }, [reload, onChanged]);

  const submit = useCallback(async () => {
    const text = draft.trim();
    if (!text || busy || inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {
      const res = await dispatch(editing
        ? updateProcessingRemark({ contract_id: Number(contractId), remarks: text, remark_id: editing.id })
        : addProcessingRemark({ contract_id: Number(contractId), remarks: text }));
      if (await finish(res, editing ? tr("key_remark_updated", "Remark updated") : tr("key_remark_added", "Remark added"))) { setDraft(""); setEditing(null); }
    } finally { inFlight.current = false; setBusy(false); }
  }, [draft, busy, editing, dispatch, contractId, finish]);

  const startEdit = useCallback((r) => {
    setEditing(r); setDraft(r.remarks || ""); setConfirm(null);
    window.requestAnimationFrame(() => { const el = taRef.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } });
  }, []);
  const cancelEdit = useCallback(() => { setEditing(null); setDraft(""); }, []);

  const doDelete = useCallback(async () => {
    if (!confirm || busy || inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {
      const res = await dispatch(deleteProcessingRemark({ remark_id: confirm.id, contract_id: Number(contractId) }));
      if (await finish(res, tr("key_remark_deleted", "Remark deleted"))) { if (editing && editing.id === confirm.id) cancelEdit(); setConfirm(null); }
    } finally { inFlight.current = false; setBusy(false); }
  }, [confirm, busy, dispatch, contractId, finish, editing, cancelEdit]);

  const sub = [row?.worker_name, row?.worker_code || row?.contract_number].filter(Boolean);
  let body;
  if (load === "loading" && remarks.length === 0) {
    body = <div className="ctx-state" data-context-state="loading"><span className="ctx-spinner" aria-hidden="true" /><strong>{ tr("key_loading_remarks", "Loading Remarks") }</strong><span>{ tr("key_retrieving_record_data", "Retrieving the record’s source data.") }</span></div>;
  } else if (load === "error" && remarks.length === 0) {
    body = <div className="ctx-state" data-context-state="error"><span className="ctx-state-icon" aria-hidden="true">!</span><strong>{ tr("key_remarks_could_not_be_loaded", "Remarks could not be loaded") }</strong><span>{ tr("key_source_data_not_changed", "The source data was not changed.") }</span><button type="button" className="ctx-btn secondary" onClick={ reload }>{ tr("key_retry", "Retry") }</button></div>;
  } else if (remarks.length === 0) {
    body = <div className="ctx-state" data-context-state="empty"><span className="ctx-state-icon" aria-hidden="true">—</span><strong>{ tr("key_no_remarks_yet", "No remarks yet") }</strong>{ canAdd && <span>{ tr("key_add_first_contract_remark", "Add the first Contract remark using the composer above.") }</span> }</div>;
  } else {
    body = (
      <div className="remark-list">
        { remarks.map((r) => {
          const name = authorName(r);
          const mine = isAuthor(r);
          return (
            <article key={ r.id } className={ `remark-item${editing && editing.id === r.id ? " editing" : ""}` } data-remark-id={ r.id }>
              <div className="remark-head">
                <span className="role-avatar" aria-hidden="true">{ getInitials(name) }</span>
                <div className="grow"><strong className="person-name">{ name }</strong><span className="role-suffix">({ tr("key_staff_lower", "staff") })</span></div>
                <time dateTime={ String(r.created_at || "").replace(" ", "T") }>{ when(r.created_at) }</time>
              </div>
              <div className="remark-body">{ r.remarks }</div>
              { canMutate(r) ? (
                <div className="remark-actions">
                  { mine && <span>{ tr("key_authored_by_you", "Authored by you") }</span> }
                  <button type="button" onClick={ () => startEdit(r) }>{ tr("key_edit", "Edit") }</button>
                  <button type="button" className="danger-text" onClick={ () => setConfirm(r) }>{ tr("key_delete", "Delete") }</button>
                </div>
              ) : (
                <div className="remark-lock">{ LOCK } { tr("key_remark_author_only", "Only this remark’s author can edit or delete it.") }</div>
              ) }
            </article>
          );
        }) }
      </div>
    );
  }

  return createPortal(
    <>
      <div className="mcca-backdrop" role="presentation" onClick={ busy ? undefined : onClose } />
      <aside ref={ ref } className="mcca-drawer mcca-remarks" role="dialog" aria-modal="true" aria-labelledby="mcca-rm-title" tabIndex={ -1 } data-remarks-drawer="">
        <header className="hd">
          <div><h2 id="mcca-rm-title">{ tr("key_remarks", "Remarks") }</h2>{ sub.length > 0 && <div className="sub">{ sub[0] }{ sub[1] && <> · <span className="mono">{ sub[1] }</span></> }</div> }</div>
          <button type="button" className="ctx-icon-btn" aria-label={ tr("key_close", "Close") } onClick={ onClose }>{ X }</button>
        </header>
        <div className="bd">
          { canAdd && (
            <div className="remark-composer" data-editing={ editing ? editing.id : undefined }>
              <label htmlFor="mcca-rm-draft">{ tr("key_add_a_contract_remark", "Add a Contract remark") }</label>
              <textarea ref={ taRef } id="mcca-rm-draft" value={ draft } maxLength={ REMARK_MAX } placeholder={ tr("key_add_operational_context", "Add operational context…") } disabled={ busy } onChange={ (e) => setDraft(e.target.value) } />
              <div className="remark-compose-foot">
                <span>{ draft.length }/{ REMARK_MAX }</span>
                { editing && <button type="button" className="ctx-btn secondary" disabled={ busy } onClick={ cancelEdit }>{ tr("key_cancel", "Cancel") }</button> }
                <button type="button" className="ctx-btn primary" disabled={ !draft.trim() || busy } onClick={ submit }>{ editing ? tr("key_remark_save", "Save Remark") : tr("key_add_remark", "Add Remark") }</button>
              </div>
            </div>
          ) }
          { body }
        </div>
      </aside>
      { confirm && (
        <AlertDialog title={ tr("key_delete_this_remark", "Delete this remark?") } busy={ busy }
          copy={ tr("key_delete_remark_copy", "The remark will be soft deleted from the Contract record. Its deleted value and actor metadata remain in the immutable audit record.") }
          confirmLabel={ tr("key_delete_remark", "Delete Remark") } onConfirm={ doDelete } onCancel={ () => setConfirm(null) } />
      ) }
    </>,
    document.body,
  );
};

ContractRemarksDrawer.propTypes = {
  contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  row: PropTypes.object,
  canAdd: PropTypes.bool,
  /* the elevated "Update else's Remarks" grant: Edit / Delete on anyone's remark */
  canUpdateOthers: PropTypes.bool,
  loaded: PropTypes.bool,          /* the store already holds this record's list (the rail fetched it) */
  onClose: PropTypes.func.isRequired,
  onChanged: PropTypes.func,
};

export default ContractRemarksDrawer;
