/* eslint-disable react/prop-types */
import React from "react";
import { useTranslation } from "react-i18next";
import { formatHK } from "../../../../utils/utils";
import { savedCreditsOf } from "../add-contract-invoice/SavedInvoiceLines";
import { SETTLEMENT_KINDS } from "../add-contract-invoice/contractSetup";
import { balanceDueOf } from "../invoiceBalance";

/*
 * Customer output of a saved invoice (QA-27-033; requirements 13, 17: it reconciles with the saved figures): each line's
 * original amount, each deduction as its own row, the subtotal after deductions, each credit, and the amount due, read from
 * the frozen record the detail answer carries (pricing_record). Nothing is recomputed. Paid, refunds, later adjustments and
 * the balance are live; the balance is the invoice's stored balance_due, which an Unsettled or Bad Debt invoice keeps current
 * (its remaining_balance is not: QA-27-040). Reasons and staff details stay off this output: the record's steps
 * carry none, and an adjustment prints without its reason. The preview's customer pane, the PDF and the Print all use this.
 * An A2 (INV-X1; OP-27-118) prints its settlement lines with their signed totals and the A1 they name, then its HK$0 total;
 * `linesOnly` prints the replacement's lines alone, for the preview whose exchange rows follow them.
 */

/** The frozen record a printout reads; a voided invoice keeps its own output, as on the Financial Summary. */
export const savedPrintoutRecord = (invoice) => (invoice?.status === 6 ? null : invoice?.pricing_record?.summary ? invoice.pricing_record : null);

const signed = (n) => (Number(n) < 0 ? `−${ formatHK(Math.abs(Number(n))) }` : formatHK(n));
/* an A2's Remaining Credit disposition (register #74): the record the exchange left (the Invoice API's
   remainingCreditAdjustment) prints as the outcome with the Remaining Credit, as the exchange printout did — not as a later
   adjustment */
const DISPOSITION_REASONS = Object.freeze({ "Balance adjustment to zero": "key_outcome_written_off", "Credit balance saved": "key_outcome_saved_as_credit" });

const SavedPrintoutRows = ({ invoice, columns = 3, balanceLabel, linesOnly = false }) => {
    const { t } = useTranslation();
    const record = invoice.pricing_record;
    const { summary } = record;
    const lines = (record.lines || []).filter((l) => !l.removed && l.role !== "credit" && !(linesOnly && SETTLEMENT_KINDS.includes(l.role)));
    const paid = Number(invoice.paid_amount || 0);
    const refunded = Number(invoice.refund_amount || 0);
    const balance = balanceDueOf(invoice);
    const preview = columns === 2;
    const amountClass = preview ? "right" : undefined;
    /* a row across the description columns, the amount last */
    const row = (key, label, amount, { cls, td, indent } = {}) => (
        <tr key={ key } className={ cls }>
            <td colSpan={ columns - 1 } className={ td } style={ indent ? { paddingLeft: 16 } : undefined }>{ label }</td>
            <td className={ [amountClass, td].filter(Boolean).join(" ") || undefined }>{ amount }</td>
        </tr>
    );
    return (
        <>
            { lines.map((l) => (SETTLEMENT_KINDS.includes(l.role) ? (
                preview
                    ? row(l.key, <>{ l.description }<div style={{ fontSize: 11, color: 'var(--text-3)' }}>{ l.detail || l.item_type }</div></>, signed(l.net))
                    : <tr key={ l.key }><td>{ l.item_type }</td><td>{ l.description }{ l.detail ? ` · ${ l.detail }` : "" }</td><td>{ signed(l.net) }</td></tr>
            ) : (
                <React.Fragment key={ l.key }>
                    { preview
                        ? row(`${ l.key }:o`, <>{ l.description }<div style={{ fontSize: 11, color: 'var(--text-3)' }}>{ l.item_type }</div></>, formatHK(l.original))
                        : <tr><td>{ l.item_type }</td><td>{ l.description }</td><td>{ formatHK(l.original) }</td></tr> }
                    { (l.steps || []).map((s) => row(`${ l.key }:${ s.kind }:${ s.label }`, s.label, `−${ formatHK(s.amount) }`, { indent: true })) }
                    { (l.steps || []).length > 0 && row(`${ l.key }:n`, t("key_inv_line_net"), formatHK(l.net), { indent: true }) }
                </React.Fragment>
            ))) }
            { !linesOnly && <>
            { row("subtotal", t(record.settlement ? "key_inv_a2_total" : "key_subtotal_after_discounts_and_promo"), formatHK(summary.invoiceTotal), { cls: "border-top border-dark", td: preview ? undefined : "subtotal-after" }) }
            { savedCreditsOf(record).map((c) => row(`credit:${ c.key }`, `${ c.itemType } · ${ c.description }`, `−${ formatHK(c.applied) }`)) }
            { row("due", t("key_amount_due"), formatHK(summary.amountDue), { td: preview ? undefined : "subtotal-after" }) }
            { (invoice.adjusted_amouts || []).map((a, i) => (record.settlement && DISPOSITION_REASONS[a.reason]
                ? row(`adjust:${ i }`, `${ t("key_remaining_credit") } · ${ t(DISPOSITION_REASONS[a.reason]) }`, formatHK(Math.abs(Number(a.total_amount))))
                : a.adjustment_type === "plus"
                ? row(`adjust:${ i }`, t("key_positive_adjustment"), formatHK(Math.abs(Number(a.adjusted_amount))))
                : row(`adjust:${ i }`, t(a.type === "adjust_amount" ? "key_negative_adjustment" : "key_write_off"), `−${ formatHK(Math.abs(Number(a.adjusted_amount))) }`))) }
            { paid > 0 && row("paid", t("key_paid"), `−${ formatHK(paid) }`) }
            { refunded > 0 && row("refunded", t("key_refunded"), `(${ formatHK(refunded) })`) }
            { row("balance", balanceLabel ? balanceLabel(balance) : t("key_balance_due"), formatHK(balance), { cls: "total", td: preview ? undefined : "total" }) }
            </> }
        </>
    );
};

export default SavedPrintoutRows;
