import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { interpolate } from "../../../../i18n/interpolate";
import { SETTLEMENT_KINDS, hk } from "./contractSetup";
import { lineAction, lineDetail, removable } from "./invoiceItems";
import "../new-ui-shared.css";
import "../new-ui-create.css";

/*
 * Contract Invoice · the invoice line table (27 Oct package, INV-C3; Part B "Invoice item structure", the Combined doc's
 * line table): Item Type · Description · Amount · Discount / Promo · Total, full width, amounts read-only, rows in the
 * engine's order. The Description carries the line's detail; Discount / Promo the ordered steps ("label −HK$x", a locked
 * step marked "· locked"). A removed automatic line follows the charged lines, struck through. The footer is the invoice
 * total (original · −discount · net), a dash while the invoice can't be created. `edit` adds the actions column: the
 * line's panel and the cross (live only where the line can be removed; required lines keep it disabled). On Invoice
 * Review, applied credit follows the total as source-linked negative entries, counted once, then the amount due now
 * (Part B "Saved credit entries"; R-C1, R-T1: the engine's figures, never recomputed here). `emptyText` is the empty
 * state of a table that opens with no lines (a Standalone Invoice, INV-G3).
 * An exchange invoice (A2; INV-X3, register #71, #72): its settlement lines follow the replacement's lines — the Exchange
 * Credit naming A1, then the Balance Adjustment or the underpayment line — read-only, with no amount, deduction or action of
 * their own; the footer is the A2 total (HK$0) and, beneath it, the settlement figures (Replacement value, Exchange Credit,
 * Shortfall or Remaining Credit): the engine's answer or the frozen record, never recomputed here.
 * `draftRows` (ITEMS-ROW-1): the items stage's empty Add Item / Add Custom Item rows, at the bottom of the charged lines
 * (before an A2's settlement lines and the struck rows); the empty state gives way to them.
 * `creditRows` / `amountDue` (edit mode): the items stage's applied credits, editable, in the place Invoice Review shows
 * them read-only (after the invoice total), then the engine's Amount due now ("—" while it is not priced).
 */

const minus = (n) => `−${ hk(n) }`;

const Steps = ({ line }) => {
    const { t } = useTranslation();
    if (line.original == null || !line.steps.length) return <span className="dash">—</span>;
    return (
        <div className="inv-steps">
            { line.steps.map((s, i) => (
                <div key={ i } className={ `inv-step${ s.locked ? " lock" : "" }` }>
                    <span className="sl">{ s.label }{ s.locked && <span className="lk"> · { t("key_inv_locked") }</span> }</span>
                    <span className="sv">{ minus(s.amount) }</span>
                </div>
            )) }
        </div>
    );
};
Steps.propTypes = { line: PropTypes.object.isRequired };

/* an A2's settlement line: the engine's (or the frozen record's) signed total, nothing else */
const SettlementRow = ({ line, edit }) => (
    <tr data-line={ line.id } data-settlement={ line.kind }>
        <td className="primary">{ line.itemType }</td>
        <td className="de">{ line.label }{ (line.detail || line.savedDetail) && <span className="dt">{ line.detail || line.savedDetail }</span> }</td>
        <td className="right"><span className="dash">—</span></td>
        <td className="right"><span className="dash">—</span></td>
        <td className="right mono">{ Number(line.net) < 0 ? minus(Math.abs(Number(line.net))) : hk(line.net) }</td>
        { edit && <td /> }
    </tr>
);
SettlementRow.propTypes = { line: PropTypes.object.isRequired, edit: PropTypes.bool };

const Detail = ({ line }) => {
    const { t } = useTranslation();
    const d = lineDetail(line);
    if (!d) return null;
    return <span className="dt">{ d.text || (d.amount != null ? interpolate(t(d.key), hk(d.amount)) : t(d.key)) }</span>;
};
Detail.propTypes = { line: PropTypes.object.isRequired };

const InvoiceItemsTable = ({ result, mode, onRemove, onPanel, credits, emptyText, settlement: savedSettlement, draftRows, creditRows, amountDue }) => {
    const { t } = useTranslation();
    const edit = mode === "edit";
    const lines = result?.lines || [];
    const charged = lines.filter((l) => !SETTLEMENT_KINDS.includes(l.kind));
    const settlementLines = lines.filter((l) => SETTLEMENT_KINDS.includes(l.kind));
    const struck = result?.restorable || [];
    const total = result?.ok ? result.total : null;
    const settlement = total ? (savedSettlement || result?.settlement || null) : null;
    return (
        <table className="items-table inv-lines" data-mode={ mode }>
            <thead>
                <tr>
                    <th>{ t("key_item_type") }</th>
                    <th>{ t("key_description") }</th>
                    <th className="right">{ t("key_amount") }</th>
                    <th className="right">{ t("key_inv_discount_promo") }</th>
                    <th className="right">{ t("key_total") }</th>
                    { edit && <th className="right"><span className="sr-only">{ t("key_inv_actions") }</span></th> }
                </tr>
            </thead>
            <tbody>
                { charged.map((line) => {
                    const known = line.original != null;
                    const action = edit ? lineAction(line) : null;
                    const canRemove = removable(line);
                    return (
                        <tr key={ line.id } data-line={ line.id } className={ known ? undefined : "miss-row" }>
                            <td className="primary">{ line.itemType }</td>
                            <td className="de">{ line.label }<Detail line={ line } /></td>
                            <td className="right mono">{ known ? hk(line.original) : <span className="miss-amt">{ t(line.kind === "item" ? "key_inv_no_amount" : "key_inv_no_price") }</span> }</td>
                            <td className="right"><Steps line={ line } /></td>
                            <td className="right mono">{ known && line.net != null ? hk(line.net) : <span className="dash">—</span> }</td>
                            { edit && (
                                <td className="act">
                                    <span className="acts">
                                        { action && (
                                            <button type="button" className="lnk" onClick={ () => onPanel(action, line) }>
                                                <i className={ action === "adjust" ? "ri-pencil-line" : "ri-price-tag-3-line" } />
                                                { t(action === "adjust" ? "key_inv_adjust_supplement" : "key_inv_discount_promo") }
                                            </button>
                                        ) }
                                        <button type="button" className="ibtn" disabled={ !canRemove } onClick={ canRemove ? () => onRemove(line) : undefined }
                                            title={ t(canRemove ? "key_inv_remove_line" : "key_inv_required_cannot_remove") }
                                            aria-label={ canRemove ? `${ t("key_remove") } ${ line.itemType } ${ line.label }` : t("key_inv_required_cannot_remove") }>
                                            <i className="ri-close-line" />
                                        </button>
                                    </span>
                                </td>
                            ) }
                        </tr>
                    );
                }) }
                { edit && draftRows }
                { settlementLines.map((line) => <SettlementRow key={ line.id } line={ line } edit={ edit } />) }
                { struck.map((x) => (
                    <tr key={ `removed:${ x.item }` } className="rm-row" data-removed={ x.item }>
                        <td className="primary">{ x.itemType }</td>
                        <td className="de">{ x.label }<span className="dt">{ t(edit ? "key_inv_removed_by_staff" : "key_inv_removed_by_staff_review") }</span></td>
                        <td className="right mono">{ x.amount != null ? hk(x.amount) : <span className="dash">—</span> }</td>
                        <td className="right"><span className="dash">—</span></td>
                        <td className="right"><span className="zero">{ t("key_inv_not_charged") }</span></td>
                        { edit && <td /> }
                    </tr>
                )) }
                { emptyText && result && !lines.length && !struck.length && !draftRows && (
                    <tr className="empty-row" data-empty><td className="de" colSpan={ edit ? 6 : 5 }><span className="zero">{ emptyText }</span></td></tr>
                ) }
            </tbody>
            <tfoot>
                <tr className="total-row">
                    <td colSpan="2">{ t(settlement ? "key_inv_a2_total" : "key_invoice_total") }</td>
                    <td className="right mono">{ total ? hk(total.original) : "—" }</td>
                    <td className="right mono">{ total && total.discount ? minus(total.discount) : "—" }</td>
                    <td className="right mono" data-total>{ total ? hk(total.net) : "—" }</td>
                    { edit && <td /> }
                </tr>
                { settlement && [
                    ["replacement", "key_inv_replacement_value", hk(settlement.replacementValue)],
                    ["credit", "key_exchange_credit", minus(settlement.exchangeCredit)],
                    ...(Number(settlement.shortfall) > 0 ? [["shortfall", "key_inv_shortfall", hk(settlement.shortfall)]] : []),
                    ...(Number(settlement.remainingCredit) > 0 ? [["remaining", "key_remaining_credit", hk(settlement.remainingCredit)]] : []),
                ].map(([key, label, value]) => (
                    <tr key={ key } className="credit-row" data-settlement-figure={ key }>
                        <td colSpan="4">{ t(label) }</td>
                        <td className="right mono">{ value }</td>
                        { edit && <td /> }
                    </tr>
                )) }
                { total && credits?.length > 0 && credits.map((c) => (
                    <tr key={ c.key } className="credit-row" data-credit={ c.key }>
                        <td className="primary">{ c.itemType }</td>
                        <td className="de">{ c.description }</td>
                        <td className="right"><span className="dash">—</span></td>
                        <td className="right"><span className="dash">—</span></td>
                        <td className="right mono">{ minus(c.applied) }</td>
                        { edit && <td /> }
                    </tr>
                )) }
                { total && credits?.length > 0 && result.summary && (
                    <tr className="total-row due-row">
                        <td colSpan="4">{ t("key_amount_due_now") }</td>
                        <td className="right mono" data-due>{ hk(result.summary.amountDue) }</td>
                        { edit && <td /> }
                    </tr>
                ) }
                {/* applied credits stay listed (and removable) while the invoice is blocked; the amount due is then "—" */}
                { edit && creditRows }
                { edit && creditRows && (
                    <tr className="total-row due-row">
                        <td colSpan="4">{ t("key_amount_due_now") }</td>
                        <td className="right mono" data-due>{ amountDue != null ? hk(amountDue) : "—" }</td>
                        <td />
                    </tr>
                ) }
            </tfoot>
        </table>
    );
};

InvoiceItemsTable.propTypes = {
    result: PropTypes.object,
    mode: PropTypes.oneOf(["edit", "ro"]).isRequired,
    onRemove: PropTypes.func,
    onPanel: PropTypes.func,
    credits: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, itemType: PropTypes.string, description: PropTypes.string, applied: PropTypes.number })),
    emptyText: PropTypes.string,
    /** an A2's frozen settlement (its detail screen); the engine's answer carries its own */
    settlement: PropTypes.shape({ replacementValue: PropTypes.number, exchangeCredit: PropTypes.number, shortfall: PropTypes.number, remainingCredit: PropTypes.number }),
    /** the items stage's empty rows (edit mode only); absent when there are none */
    draftRows: PropTypes.node,
    /** the items stage's applied credit rows (edit mode only); absent when none is applied */
    creditRows: PropTypes.node,
    /** the engine's Amount due now with the applied credits (edit mode); null while it is not priced */
    amountDue: PropTypes.number,
};

export default React.memo(InvoiceItemsTable);
