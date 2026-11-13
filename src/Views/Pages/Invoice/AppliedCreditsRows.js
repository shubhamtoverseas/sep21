import React, { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import { fetchEmployerCreditList } from "../../../redux/Slices/invoices/InvoicesSlice";
import { CREDIT_TYPES } from "../../../components/ReusableComponents/constants";
import { getPermissionValue } from "../../../services/commonService";
import { formatHK } from "../../../utils/utils";
import "./new-ui-review.css";

/* Saved credit (Saved Credit rules, 22 Oct 2026): a saved Exchange credit or an expired Reservation Fee's credit is
   applied in full or in part while the invoice is created — on Invoice items, beside Add Item and Add Custom Item
   (package requirements :434, :544; Invoice Review shows it read-only, :546) — what stays is kept for later invoices (the
   default) or, with the Write Off key, a reason and a confirmation showing the exact amount, written off. The server
   checks it all again when the invoice is saved. */

const creditKey = (credit) => `${ credit.credit_type }:${ credit.id }`;

const creditRef = (item) =>
  item?.invoice_number ?? item?.invoice_reference_id ?? item?.reference ?? "";

const creditName = (item) => {
  const first = item?.["workersModel.name"] ?? item?.worker?.name ?? item?.worker_name ?? item?.name ?? "";
  const last = item?.["workersModel.surname"] ?? item?.worker?.surname ?? "";
  return [first, last].filter(Boolean).join(" ").trim();
};

const round2 = (value) => Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

/* what the credit offers now: the server's available amount (older responses: the whole amount) */
const availableOf = (item) => round2(item?.available_amount ?? item?.amount ?? 0);

const optionLabel = (item) =>
  [creditRef(item), creditName(item), formatHK(availableOf(item))]
    .filter(Boolean)
    .join(" · ");

/* what stays on the credit after this invoice takes its amount */
export const creditRemainder = (credit) => Math.max(0, round2((Number(credit.available) || 0) - (Number(credit.amount) || 0)));

/**
 * One key per invoice being created, sent with the applied credits: the server stores it as the invoice's retry key, so
 * a retry replays the saved invoice and never applies or writes off the credit twice. Kept with the draft.
 */
export const useCreditRequestKey = (savedKey) => {
  const ref = useRef(savedKey || uuidv4());
  return ref.current;
};

/* The confirmation of a remainder write-off: the exact amount, and the reason it needs */
const WriteOffConfirm = ({ credit, onCancel, onConfirm }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const remainder = creditRemainder(credit);
  return createPortal(
    <div className="invd modal-veil" role="dialog" aria-modal="true" onClick={ (e) => e.target === e.currentTarget && onCancel() }>
      <div className="modal-card action-modal-card">
        <div className="head">
          <span className="ico danger"><i className="ri-error-warning-line" /></span>
          <h2>{ t("key_write_off_remaining_credit") }</h2>
        </div>
        <div className="body">
          <p>
            { t("key_write_off_remaining_credit_confirm", {
              amount: formatHK(remainder), ref: credit._reference, applied: formatHK(credit.amount),
            }) }
          </p>
          <label className="credit-reason-lbl" htmlFor="credit-write-off-reason">{ t("key_reason_required") }</label>
          <textarea id="credit-write-off-reason" className="input credit-reason" rows={ 2 } maxLength={ 255 } value={ reason }
            onChange={ (e) => setReason(e.target.value) } />
        </div>
        <div className="foot">
          <button type="button" className="btn btn-secondary md" onClick={ onCancel }>{ t("key_cancel") }</button>
          <button type="button" className="btn btn-primary md" disabled={ !reason.trim() }
            onClick={ () => onConfirm({ remainder: "write_off", write_off_amount: remainder, write_off_reason: reason.trim() }) }>
            { t("key_write_off_credit_button", { amount: formatHK(remainder) }) }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

WriteOffConfirm.propTypes = {
  credit: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

/**
 * The applied credit rows on Invoice items, below the charged lines and the invoice total (package requirements :436,
 * :544): "Credit · <type>", "From <source>", no amount or deduction of its own, the amount this invoice takes (all or
 * part of what is available, editable) and the cross; when something stays, Keep (default) or Write off for the
 * remainder. Display only — never mutates the invoice item total; the engine prices the credit after every line.
 */
export const CreditRows = ({ appliedCredits = [], onRemove, onChange }) => {
  const { t } = useTranslation();
  const { permissionList } = useSelector((state) => state.users);
  const mayWriteOff = getPermissionValue(permissionList?.data, "invoice", "invoice_write_off") === "y";
  const [confirming, setConfirming] = useState(null);

  const setAmount = (credit, value) => {
    // a new amount changes the remainder: a write-off confirmed for the old one no longer holds
    onChange(credit, { amount: value === "" ? "" : Number(value), remainder: "keep", write_off_amount: null, write_off_reason: "" });
  };

  return (
    <>
      { appliedCredits.map((credit) => {
        const meta = CREDIT_TYPES[credit.credit_type] || {};
        const remainder = creditRemainder(credit);
        const writtenOff = credit.remainder === "write_off" ? remainder : 0;
        return (
          <React.Fragment key={ creditKey(credit) }>
            <tr className="credit-line" data-credit-row={ creditKey(credit) }>
              <td className="it">{ `${ t("key_credit") } · ${ t(meta.badgeLabel) }` }</td>
              <td>
                <div className="ds">{ `${ t("key_inv_from") } ${ credit._reference }` }</div>
                <div className="credit-avail">{ t("key_available") } { formatHK(credit.available) }</div>
              </td>
              <td className="amt">—</td>
              <td className="amt">—</td>
              <td className="amt final" style={ { color: "var(--st-success)" } }>
                <span className="amt-inline">
                  <span>−$</span>
                  <input type="number" className="input sm right" min={ 0.01 } max={ credit.available } step="0.01"
                    aria-label={ t("key_saved_credit_applied") } value={ credit.amount }
                    onChange={ (e) => setAmount(credit, e.target.value) } />
                </span>
              </td>
              <td className="td-action">
                <button type="button" className="btn-icon" onClick={ () => onRemove(credit) } aria-label="Remove credit">
                  <i className="ri-close-line" />
                </button>
              </td>
            </tr>
            { remainder > 0 && (
              <tr className="credit-line credit-remainder">
                <td colSpan={ 6 }>
                  <div className="credit-choice">
                    <label>
                      <input type="radio" name={ `remainder-${ creditKey(credit) }` } checked={ credit.remainder !== "write_off" }
                        onChange={ () => onChange(credit, { remainder: "keep", write_off_amount: null, write_off_reason: "" }) } />
                      { t("key_keep_for_future_invoices") } <span className="credit-tag">{ t("key_default") }</span>
                    </label>
                    <label title={ mayWriteOff ? undefined : t("key_write_off_credit_not_permitted") }>
                      <input type="radio" name={ `remainder-${ creditKey(credit) }` } disabled={ !mayWriteOff }
                        checked={ credit.remainder === "write_off" } onChange={ () => setConfirming(credit) } />
                      { t("key_write_off_remaining_credit") }
                    </label>
                  </div>
                  <div className="credit-split">
                    { t("key_saved_credit_applied") } { formatHK(credit.amount) }
                    { " · " }{ t("key_saved_credit_written_off") } { formatHK(writtenOff) }
                    { " · " }{ t("key_available") } { formatHK(remainder - writtenOff) }
                    { writtenOff > 0 && credit.write_off_reason ? ` · ${ t("key_reason") }: ${ credit.write_off_reason }` : "" }
                  </div>
                </td>
              </tr>
            ) }
          </React.Fragment>
        );
      }) }
      { confirming && (
        <WriteOffConfirm credit={ confirming } onCancel={ () => setConfirming(null) }
          onConfirm={ (patch) => { onChange(confirming, patch); setConfirming(null); } } />
      ) }
    </>
  );
};

CreditRows.propTypes = {
  appliedCredits: PropTypes.array,
  onRemove: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The two "apply credit" dropdowns (Reservation Fee Expired / Saved Exchange Credit), rendered in Invoice items' action
 * row after + Add Item and + Add Custom Item (the 21 Sept items screen's footer; product, 3 Nov 2026: inline, no popup —
 * OP-27-140). Fetches both credit lists for the employer (only credits usable now, with their available amount) and
 * filters out already-applied credits; an empty list leaves its dropdown greyed with its "No …" text. A credit is added
 * for what is available, never more than the invoice still takes (`capacity`, the engine's total less the credits
 * already applied); the amount can then be lowered on its row. `disabled` while the invoice cannot be created.
 */
export const CreditControls = ({ employerId = null, appliedCredits = [], capacity = null, onApply, disabled = false }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const employerCreditList = useSelector((state) => state.invoices.employerCreditList);

  useEffect(() => {
    if (employerId) {
      Object.keys(CREDIT_TYPES).forEach((credit_type) => {
        dispatch(fetchEmployerCreditList({ credit_type, employer_id: employerId }));
      });
    }
  }, [dispatch, employerId]);

  const usedKeys = useMemo(
    () => new Set(appliedCredits.map(creditKey)),
    [appliedCredits]
  );

  const availableFor = useCallback(
    (creditType) =>
      (employerCreditList?.[creditType] || []).filter(
        (item) => !usedKeys.has(`${ creditType }:${ item.id }`) && availableOf(item) > 0
      ),
    [employerCreditList, usedKeys]
  );

  const handleApply = useCallback(
    (creditType, e) => {
      const id = e.target.value;
      if (!id) return;
      const item = (employerCreditList?.[creditType] || []).find(
        (c) => String(c.id) === String(id)
      );
      if (!item) return;
      const available = availableOf(item);
      const room = capacity === null ? available : round2(capacity);
      onApply({
        id: item.id,
        amount: room > 0 ? Math.min(available, room) : available,
        // The credit belongs to the employer the list was fetched for; the list
        // response itself does not carry employer_id, so source it from there.
        employer_id: employerId ?? item.employer_id,
        credit_type: creditType,
        available,
        remainder: "keep",
        write_off_amount: null,
        write_off_reason: "",
        // display-only fields (stripped before building the api payload)
        _reference: creditRef(item),
        _name: creditName(item),
      });
      e.target.value = "";
    },
    [employerCreditList, employerId, capacity, onApply]
  );

  if (!employerId) return null;

  return (
    <>
      { Object.values(CREDIT_TYPES).map((meta) => {
        const available = availableFor(meta.key);
        return (
          <div className="select sm" key={ meta.key } style={ { minWidth: "240px" } }>
            <select
              className="input"
              value=""
              aria-label={ t(meta.applyLabel) }
              data-credit-picker={ meta.key }
              disabled={ disabled || available.length === 0 }
              onChange={ (e) => handleApply(meta.key, e) }
            >
              <option value="">
                { available.length ? `${ t(meta.applyLabel) }…` : t(meta.emptyLabel) }
              </option>
              { available.map((item) => (
                <option key={ item.id } value={ item.id }>{ optionLabel(item) }</option>
              )) }
            </select>
          </div>
        );
      }) }
    </>
  );
};

CreditControls.propTypes = {
  employerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  appliedCredits: PropTypes.array,
  capacity: PropTypes.number,
  onApply: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * The first applied credit the invoice no longer takes in full, with what it can take now, or null: the credits are
 * taken in the order applied, after every charge and deduction, each no more than what the invoice still owes after the
 * ones before it (package requirements :436). A later discount or removal that lowers the total below an applied credit
 * blocks the invoice until staff lower or remove it — never re-capped silently (product, 3 Nov 2026; as QA-27 ruling 5).
 */
export const creditOverCap = (appliedCredits = [], invoiceTotal = 0) => {
  let room = round2(invoiceTotal);
  for (const credit of appliedCredits) {
    const amount = round2(credit.amount);
    const max = Math.max(0, room);
    if (amount - max > 0.005) return { credit, max };
    room = round2(room - amount);
  }
  return null;
};

/**
 * Why the applied credits cannot be sent yet (a translation key), or null: each amount above HK$0 and within what the
 * credit has; a write-off confirmed for the remainder as it stands, with its reason.
 */
export const appliedCreditsProblem = (appliedCredits = []) => {
  for (const credit of appliedCredits) {
    const amount = Number(credit.amount);
    if (!(amount > 0) || amount - (Number(credit.available) || 0) > 0.005) return "key_saved_credit_amount_invalid";
    if (credit.remainder === "write_off"
      && (!String(credit.write_off_reason || "").trim() || Math.abs((Number(credit.write_off_amount) || 0) - creditRemainder(credit)) >= 0.005)) {
      return "key_write_off_remaining_credit_unconfirmed";
    }
  }
  return null;
};

/**
 * Strip the display-only fields, returning the exact `apply_credits` payload the backend expects:
 * { amount, id, employer_id, credit_type, remainder } plus, for a write-off, its confirmed amount and reason.
 */
export const buildApplyCreditsPayload = (appliedCredits = []) =>
  appliedCredits.map(({ amount, id, employer_id, credit_type, remainder, write_off_amount, write_off_reason }) => ({
    amount: round2(amount),
    id,
    employer_id,
    credit_type,
    remainder: remainder === "write_off" ? "write_off" : "keep",
    ...(remainder === "write_off" ? { write_off_amount: round2(write_off_amount), write_off_reason: String(write_off_reason || "").trim() } : {}),
  }));

export const sumAppliedCredits = (appliedCredits = []) =>
  appliedCredits.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
