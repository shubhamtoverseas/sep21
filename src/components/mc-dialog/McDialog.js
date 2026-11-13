import React, { useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import dayjs from "../../utils/dayjsConfig";
import translation from "../../utils/translation";
import useDialogFocus from "../../hooks/useDialogFocus";
import "../Layout/popups/bulk-ownership/bulk-ownership.css";
import "./mc-dialog.css";

/**
 * The prototype's overlay dialog (Contract_Details.html dlgFrame and its field helpers: dlgField / dlgRow / mcDate /
 * dlgTextarea / dlgErr / dlgHelp / g1-yesno) for the new UI — one frame for every record-level dialog (contract status
 * changes, owner reassignment, applicability assessments, …). The frame is the bulk-ownership `.mcbo` frame with the
 * `.mcca` additions in mc-dialog.css; it renders through a portal and traps focus (useDialogFocus).
 *   tr(key, fallback)   — translation() with an English fallback when the key has no string yet
 *   DialogFrame         — kind "form" (560px) | "confirm" (440px); title, × / Escape / backdrop close, foot buttons
 *   AlertDialog         — the short confirmation (prototype .ctx-confirm, role alertdialog): heading, copy, Cancel + the action
 *   Field / McDate / YesNo / Foot / ServerError — the field pieces; dateError / fill / isoToDisp / parseDMY / todayIso helpers
 */
export const tr = (key, fallback) => { const v = translation(key); return !v || v === key ? fallback : v; };
const ISO = "YYYY-MM-DD";
const DMY = "DD/MM/YYYY";
export const isoToDisp = (iso) => { if (!iso) return ""; const d = dayjs(String(iso).slice(0, 10), ISO, true); return d.isValid() ? d.format(DMY) : ""; };
export const parseDMY = (text) => { const d = dayjs(String(text || "").trim(), DMY, true); return d.isValid() ? d.format(ISO) : ""; };
export const todayIso = () => dayjs().format(ISO);
export const isoDate = (v) => (v ? String(v).slice(0, 10) : "");
export const dateValue = (iso) => ({ iso: iso || "", text: iso ? isoToDisp(iso) : "" });
export const fill = (s, vars) => Object.keys(vars || {}).reduce((out, k) => out.split(`{${k}}`).join(vars[k]), s);

const X = <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /></svg>;
const CAL = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>;

/* ---------------- the overlay frame (prototype dlgFrame: mc-ov mc-ov--form | mc-ov--confirm) ---------------- */
let dialogSeq = 0;
export const DialogFrame = ({ kind = "form", className = "", title, onClose, busy = false, foot, children }) => {
  const ref = useRef(null);
  const idRef = useRef(null);
  if (!idRef.current) { dialogSeq += 1; idRef.current = `mcca-dlg-${dialogSeq}`; }
  const close = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  useDialogFocus(ref, close);
  return createPortal(
    <>
      <div className="mcbo-backdrop" role="presentation" onClick={ close } />
      <div ref={ ref } className={ `mcbo mcca mc-ov--${kind}${className ? ` ${className}` : ""}` } role="dialog" aria-modal="true" aria-labelledby={ idRef.current } tabIndex={ -1 }>
        <div className="mc-ov-head">
          <h3 id={ idRef.current } className="mc-ov-title">{ title }</h3>
          <button type="button" className="ctx-icon-btn" aria-label={ tr("key_close", "Close") } onClick={ close }>{ X }</button>
        </div>
        <div className="mc-ov-body">{ children }</div>
        <div className="mc-ov-foot">{ foot }</div>
      </div>
    </>,
    document.body,
  );
};
DialogFrame.propTypes = { kind: PropTypes.oneOf(["form", "confirm"]), className: PropTypes.string, title: PropTypes.node, onClose: PropTypes.func.isRequired, busy: PropTypes.bool, foot: PropTypes.node, children: PropTypes.node };
/* a field: label, control, then a stable slot for help / error copy (the layout does not move when validation appears) */
export const Field = ({ label, htmlFor, width, error, help, children }) => (
  <div className={ `mc-f${width ? ` mc-w-${width}` : ""}` }>
    <label htmlFor={ htmlFor }>{ label }</label>
    { children }
    <div className="mc-slot">{ error ? <div role="alert" className="mc-err">{ error }</div> : (help ? <div className="mc-help">{ help }</div> : null) }</div>
  </div>
);
Field.propTypes = { label: PropTypes.node, htmlFor: PropTypes.string, width: PropTypes.string, error: PropTypes.node, help: PropTypes.node, children: PropTypes.node };
/* DD/MM/YYYY text field with the calendar button opening the native picker (prototype mcDate) */
export const McDate = ({ id, value, onChange, disabled = false, required = true }) => {
  const nativeRef = useRef(null);
  const invalid = Boolean((value.text || "").trim()) && !value.iso;   /* prototype mcDate: only unparseable text is marked invalid */
  const pick = () => { const n = nativeRef.current; if (!n) return; try { n.showPicker(); } catch (e) { n.click(); } };
  return (
    <span className={ `fx-datewrap mc-date${disabled ? " fx-na" : ""}` }>
      <input id={ id } className="fx-in fx-date g1-in" type="text" inputMode="numeric" placeholder={ DMY } maxLength={ 10 } value={ value.text } disabled={ disabled } aria-required={ required ? "true" : "false" } aria-invalid={ invalid ? "true" : undefined }
        onChange={ (e) => onChange({ text: e.target.value, iso: parseDMY(e.target.value) }) } />
      <button type="button" className="fx-cal" aria-label={ tr("key_choose_a_date", "Choose a date") } disabled={ disabled } onClick={ pick }>{ CAL }</button>
      <input ref={ nativeRef } type="date" className="fx-native" value={ value.iso || "" } tabIndex={ -1 } aria-hidden="true" disabled={ disabled } onChange={ (e) => onChange(dateValue(e.target.value)) } />
    </span>
  );
};
McDate.propTypes = { id: PropTypes.string, value: PropTypes.shape({ iso: PropTypes.string, text: PropTypes.string }).isRequired, onChange: PropTypes.func.isRequired, disabled: PropTypes.bool, required: PropTypes.bool };

/* error copy for a date field, '' when fine (prototype mcDateError) */
export const dateError = (v, labelLower, rules = {}) => {
  const text = (v.text || "").trim();
  if (!text) return rules.required === false ? "" : fill(tr("key_cc_enter_the_date", "Enter the {label}."), { label: labelLower });
  if (!v.iso) return tr("key_cc_enter_valid_date", "Enter a valid date (DD/MM/YYYY).");
  if (rules.after && v.iso <= rules.after) return fill(tr("key_cc_must_be_after", "Must be after {label}."), { label: rules.afterLabel || tr("key_contract_start", "Contract Start") });
  if (rules.notFuture && v.iso > todayIso()) return fill(tr("key_cc_cannot_be_after_today", "Cannot be after today ({date})."), { date: isoToDisp(todayIso()) });
  if (rules.notPast && v.iso < todayIso()) return fill(tr("key_cc_cannot_be_before_today", "Cannot be before today ({date})."), { date: isoToDisp(todayIso()) });
  return "";
};
export const serverError = (res) => res?.payload?.message || res?.payload?.data?.data?.message || res?.error?.message || tr("key_something_went_wrong", "Something went wrong");

export const ServerError = ({ text }) => (text ? <div className="mc-note mc-note--danger" role="alert">{ text }</div> : null);
ServerError.propTypes = { text: PropTypes.string };
export const Foot = ({ onClose, busy, primary, primaryLabel, primaryClass = "primary", primaryDisabled = false, cancelLabel }) => (
  <>
    { onClose && <button type="button" className="ctx-btn secondary" disabled={ busy } onClick={ onClose }>{ cancelLabel || tr("key_cancel", "Cancel") }</button> }
    <button type="button" className={ `ctx-btn ${primaryClass}` } aria-disabled={ busy || primaryDisabled ? "true" : undefined } onClick={ () => { if (!busy && !primaryDisabled) primary(); } }>{ busy ? `${tr("key_loading", "Loading")}…` : primaryLabel }</button>
  </>
);
Foot.propTypes = { onClose: PropTypes.func, busy: PropTypes.bool, primary: PropTypes.func.isRequired, primaryLabel: PropTypes.node, primaryClass: PropTypes.string, primaryDisabled: PropTypes.bool, cancelLabel: PropTypes.node };

/* a short confirmation (prototype .ctx-confirm, role alertdialog): heading, one paragraph, Cancel + the action.
   The backdrop does not close it (prototype); Escape and Cancel do. */
export const AlertDialog = ({ title, copy, onCancel, onConfirm, confirmLabel, confirmClass = "danger", busy = false, cancelLabel }) => {
  const ref = useRef(null);
  const idRef = useRef(null);
  if (!idRef.current) { dialogSeq += 1; idRef.current = `mcca-alert-${dialogSeq}`; }
  const cancel = useCallback(() => { if (!busy) onCancel(); }, [busy, onCancel]);
  useDialogFocus(ref, cancel);
  return createPortal(
    <>
      <div className="mcca-alert-backdrop" role="presentation" />
      <div ref={ ref } className="mcca-alert" role="alertdialog" aria-modal="true" aria-labelledby={ `${idRef.current}-t` } aria-describedby={ `${idRef.current}-c` } tabIndex={ -1 }>
        <h3 id={ `${idRef.current}-t` }>{ title }</h3>
        <p id={ `${idRef.current}-c` }>{ copy }</p>
        <div className="bt">
          <button type="button" className="ctx-btn secondary" disabled={ busy } onClick={ cancel }>{ cancelLabel || tr("key_cancel", "Cancel") }</button>
          <button type="button" className={ `ctx-btn ${confirmClass}` } aria-disabled={ busy ? "true" : undefined } onClick={ () => { if (!busy) onConfirm(); } }>{ busy ? `${tr("key_loading", "Loading")}…` : confirmLabel }</button>
        </div>
      </div>
    </>,
    document.body,
  );
};
AlertDialog.propTypes = { title: PropTypes.node.isRequired, copy: PropTypes.node, onCancel: PropTypes.func.isRequired, onConfirm: PropTypes.func.isRequired, confirmLabel: PropTypes.node.isRequired, confirmClass: PropTypes.string, busy: PropTypes.bool, cancelLabel: PropTypes.node };

/* two-way choice (prototype g1-yesno): a pressed button is the value */
export const YesNo = ({ value, options, onChange, disabled = false, ariaLabel }) => (
  <div className="g1-yesno" role="group" aria-label={ ariaLabel }>
    { options.map((o) => <button key={ o.value } type="button" aria-pressed={ value === o.value ? "true" : "false" } disabled={ disabled } onClick={ () => onChange(o.value) }>{ o.label }</button>) }
  </div>
);
YesNo.propTypes = { value: PropTypes.string, options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string, label: PropTypes.node })).isRequired, onChange: PropTypes.func.isRequired, disabled: PropTypes.bool, ariaLabel: PropTypes.string };
