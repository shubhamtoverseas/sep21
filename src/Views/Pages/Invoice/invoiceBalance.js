/*
 * Balance Due, read in one place for every screen (QA-27-040; register #61 / #62). The figure is the invoice's
 * balance_due, which the contract's domain transitions keep as Amount Due − Paid, floored at HK$0: a payment rejected,
 * a proof deleted, Mark Unsettled or Mark Bad Debt take the unrecognised amount out of Paid, into that bucket
 * (unsettled_amount / bad_debt_amount) and into Balance Due; Revert and Pay Remaining Balance take it back out. Never the
 * legacy remaining_balance, which no classification updates. A void invoice shows HK$0 (the display rule of the
 * Financial Summary). A row the API sent without balance_due falls back to the same rule on its own figures.
 */

const VOID = 6;
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const amount = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Balance Due = max(0, Amount Due − Paid), as the read model stores it */
export const balanceDueOf = (invoice) => {
    if (!invoice || Number(invoice.status) === VOID) return 0;
    if (invoice.balance_due != null && invoice.balance_due !== "") return Math.max(0, round2(amount(invoice.balance_due)));
    return Math.max(0, round2(amount(invoice.final_amount) - amount(invoice.paid_amount)));
};

/** The classified parts of Balance Due: what is Unsettled and what is Bad Debt (a partial classification leaves the rest
    of Balance Due unclassified) */
export const classifiedOf = (invoice) => (!invoice || Number(invoice.status) === VOID
    ? { unsettled: 0, badDebt: 0 }
    : { unsettled: Math.max(0, round2(amount(invoice.unsettled_amount))), badDebt: Math.max(0, round2(amount(invoice.bad_debt_amount))) });
