/* eslint-disable react/prop-types */
import React, { useCallback } from "react";
import ReactDOM from "react-dom";
import dayjs from "dayjs";
import Icon from "../../../../components/Icon/Icon";
import configData from "../../../../components/ReusableComponents/app-configs";
import "../InvoiceDetail.css";
import translation from "../../../../utils/translation";

import { paymentMethodLabel } from "../payment-method-selector/paymentMethodCatalogue";
import SavedPrintoutRows, { savedPrintoutRecord } from "./SavedPrintoutRows";
import { balanceDueOf } from "../invoiceBalance";
/* Printout preview — internal Financial Summary vs customer-facing printout.
   Markup + classes mirror the new-UI bundle's PrintoutModal verbatim; all
   styling lives in InvoiceDetail.css (.invd .printout-*). */

/* cents are kept when the amount has them (HK$326.40, not HK$326) — the same rule as the Financial Summary's formatHK;
   whole amounts stay whole. The printout prints its own signs, so the absolute value is formatted here. */
function fmtHK(amount) {
    if (amount == null) return 'HK$0';
    const num = Number(amount) || 0;
    const abs = Math.abs(num);
    const hasCents = Math.round(abs * 100) % 100 !== 0;
    return `HK$${abs.toLocaleString('en-HK', { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: hasCents ? 2 : 0 })}`;
}

function fmtDate(dt) {
    if (!dt) return '';
    return dayjs(dt).format('DD MMM YYYY');
}

const PrintoutPreviewModal = ({ invoiceDetails, totalAmount, onClose, onDownloadPDF, onPrint }) => {
    const handleVeilClick = useCallback((e) => {
        if (e.target === e.currentTarget) onClose();
    }, [onClose]);

    if (!invoiceDetails) return null;

    const isVoid     = invoiceDetails.status === 6;
    const isBadDebt  = invoiceDetails.status === 7;
    const isExchange = invoiceDetails.status === 10 || invoiceDetails.status === 11;
    /* R-P2 (OP-27-54): Amount due now was HK$0 when the invoice was created (the server reads it from the frozen record):
       nothing was collected, so neither pane reads it as a confirmed payment or as paid in full */
    const noPaymentRequired = Boolean(invoiceDetails.no_payment_required);
    /* the admin pane names the payment review state (reference doc-sub): Pending Paid awaits review, Paid is confirmed */
    const reviewSuffix = noPaymentRequired ? translation('key_inv_no_payment_required')
        : invoiceDetails.status === 2 ? translation('key_payment_review_pending')
        : invoiceDetails.status === 1 ? translation('key_payment_confirmed') : '';

    /* Computed financial figures */
    const total    = Number(totalAmount || invoiceDetails.final_amount || 0);
    const paid     = Number(invoiceDetails.paid_amount || 0);
    const due      = balanceDueOf(invoiceDetails);
    const refunded = Number(invoiceDetails.refund_amount || 0);
    const adjustments = invoiceDetails.adjusted_amouts?.reduce((sum, a) => {
        return a.adjustment_type === 'plus' ? sum + Number(a.adjusted_amount) : sum - Math.abs(Number(a.adjusted_amount));
    }, 0) || 0;

    /* Exchange settlement figures (A2 zero-net model — reference §12.1); an A2 the pricing engine created (INV-X1) reads its
       frozen settlement and lines, never the item rows (OP-27-118) */
    const xFrozen          = isExchange && !isVoid ? invoiceDetails.pricing_record?.settlement || null : null;
    const parentRef        = invoiceDetails.parentInvoice?.invoice_number || '';
    const a1Credit         = xFrozen ? Number(xFrozen.exchangeCredit) : isExchange ? Number(invoiceDetails.parentInvoice?.final_amount || 0) : 0;
    const xs               = isExchange && a1Credit > 0;
    const xValue           = xFrozen ? Number(xFrozen.replacementValue) : total;
    const creditApplied    = xs ? Math.min(a1Credit, xValue) : 0;
    const remainingCredit  = xFrozen ? Number(xFrozen.remainingCredit) : xs ? Math.max(0, a1Credit - total) : 0;
    const additionalPayment = xFrozen ? Number(xFrozen.shortfall) : xs ? Math.max(0, total - a1Credit) : 0;
    /* the child Underpayment Invoice that collects the additional payment */
    const underpaymentRef = (invoiceDetails.childInvoices || []).find((c) => c.invoice_type === 'underpayment')?.invoice_number || '';
    /* what was done with the Remaining Credit (register #74), named as the A2 detail and the PDF / Print name it (QA-27-042):
       refunded through the refund child, written off, or saved as credit (Save as Credit leaves a write-off record whose
       reason is "Credit balance saved") */
    const refundChild = (invoiceDetails.childInvoices || []).find((c) => (c.invoice_type || '').includes('refund'));
    const writtenOff = (invoiceDetails.adjusted_amouts || []).some((a) => a.type === 'write_off' && a.reason !== 'Credit balance saved');
    const disposition = refundChild ? `${ translation('key_outcome_refunded_via') } ${ refundChild.invoice_number }`
        : writtenOff ? translation('key_outcome_written_off') : translation('key_outcome_saved_as_credit');
    const outcome = additionalPayment > 0
        ? 'Additional payment via Underpayment Invoice'
        : remainingCredit > 0 ? `${ translation('key_remaining_credit') } · ${ disposition }` : 'Same-cost exchange · fully settled by credit';

    /* Payment method label */
    const methodLabel = paymentMethodLabel(invoiceDetails.payment_method)
        || invoiceDetails.payment_method || '';

    const printoutLabel = isVoid     ? 'Voided Printout'
                        : isBadDebt  ? 'Bad Debt Printout'
                        : isExchange ? 'Exchange Replacement Printout'
                        :              'Standard Customer Printout';
    const printoutTitle = isVoid     ? 'Voided Invoice'
                        : isBadDebt  ? 'Statement · Bad Debt'
                        : isExchange ? 'Replacement Invoice · Exchange'
                        :              'Receipt / Invoice';

    const items = invoiceDetails.contractInvoiceItemSelectModel || [];
    /* the customer pane of an invoice with a frozen record reads that record (QA-27-033) */
    const saved = !xs && savedPrintoutRecord(invoiceDetails);

    const itemRows = xFrozen ? <SavedPrintoutRows invoice={ invoiceDetails } columns={ 2 } linesOnly /> : items.map((it, i) => (
        <tr key={ i }>
            <td>
                { it.item_name }
                { it.item_model_name && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{ it.item_model_name }</div> }
            </td>
            <td className="right">{ fmtHK(it.amount) }</td>
        </tr>
    ));

    /* Shared exchange-settlement rows (admin + customer panes); the customer pane's credit label is in the body colour.
       An additional payment names its Underpayment Invoice; Remaining Credit and the Outcome only without one */
    const exchangeRows = (customer) => (
        <>
            <tr>
                <td style={{ color: 'var(--text-3)' }}>Replacement Service Value</td>
                <td className="right">{ fmtHK(xValue) }</td>
            </tr>
            <tr>
                <td style={ customer ? undefined : { color: 'var(--text-3)' } }>Credit from Original Invoice { parentRef }</td>
                <td className="right" style={{ color: 'var(--st-neutral)' }}>−{ fmtHK(creditApplied) }</td>
            </tr>
            { additionalPayment > 0 && (
                <>
                    <tr>
                        <td style={{ color: 'var(--text-3)' }}>Additional Payment</td>
                        <td className="right">{ fmtHK(additionalPayment) }</td>
                    </tr>
                    { underpaymentRef && (
                        <tr>
                            <td colSpan={ 2 } style={{ color: 'var(--text-3)', fontSize: 11.5, paddingTop: 2 }}>Collected via Underpayment Invoice { underpaymentRef }</td>
                        </tr>
                    )}
                </>
            )}
            <tr>
                <td>Net Amount Due</td>
                <td className="right">{ fmtHK(0) }</td>
            </tr>
            { additionalPayment === 0 && (
                <>
                    <tr>
                        <td style={{ color: 'var(--text-3)' }}>Remaining Credit</td>
                        <td className="right">{ fmtHK(remainingCredit) }</td>
                    </tr>
                    <tr>
                        <td colSpan={ 2 } style={{ color: 'var(--text-3)', fontSize: 11.5, paddingTop: 2 }}>Outcome · { outcome }</td>
                    </tr>
                </>
            )}
            <tr className="total">
                <td>Balance Due</td>
                <td className="right">{ fmtHK(0) }</td>
            </tr>
        </>
    );

    return ReactDOM.createPortal(
        <div className="invd">
            <div className="modal-veil" onClick={ handleVeilClick }>
                <div className="modal-card action-modal-card wide" style={{ width: 'min(1180px, 96vw)' }} onClick={ e => e.stopPropagation() } role="dialog" aria-modal="true">

                    {/* Header */ }
                    <div className="head">
                        <span className="ico" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                            <Icon name="receipt" size={ 18 } />
                        </span>
                        <div style={{ flex: 1 }}>
                            <h2>Printout preview · { invoiceDetails.invoice_number }</h2>
                            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                                Internal financial view vs. customer-facing printout. They can differ; original records are kept for audit.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="btn btn-secondary" onClick={ onDownloadPDF }><Icon name="download" size={ 12 } />PDF</button>
                            <button type="button" className="btn btn-secondary" onClick={ onPrint }><Icon name="external" size={ 12 } />Print</button>
                            <button type="button" className="btn-icon" onClick={ onClose } aria-label="Close"><Icon name="x" size={ 14 } /></button>
                        </div>
                    </div>

                    {/* Two-pane body */ }
                    <div className="printout-page" style={{ maxHeight: '78vh', overflowY: 'auto' }}>

                        {/* ── LEFT: Admin Financial Summary ── */ }
                        <div>
                            <div className="printout-pane-label admin">Admin · Financial Summary</div>
                            <div className="printout-doc">
                                <h3>Financial Summary</h3>
                                <div className="doc-title">{ invoiceDetails.invoice_number }</div>
                                <div className="doc-sub">
                                    { configData.invoiceTypeTitle(invoiceDetails.invoice_type, invoiceDetails.payment_type) || invoiceDetails.invoice_type }
                                    { ' · ' }{ configData.invoiceStatusIdMapping[invoiceDetails.status]?.label || '' }
                                    { reviewSuffix ? ` · ${ reviewSuffix }` : '' }
                                </div>

                                { (invoiceDetails.employer_name || invoiceDetails.worker_name) && (
                                    <div className="doc-section">
                                        <div className="label">Parties</div>
                                        <div className="value">
                                            { invoiceDetails.employer_name && (
                                                <div><strong>{ invoiceDetails.employer_name }</strong>{ invoiceDetails.employer_reference_id ? ` · ${ invoiceDetails.employer_reference_id }` : '' }</div>
                                            )}
                                            { invoiceDetails.worker_name && (
                                                <div>
                                                    { invoiceDetails.worker_name }
                                                    { invoiceDetails.worker_reference_id ? ` · ${ invoiceDetails.worker_reference_id }` : '' }
                                                    { invoiceDetails.worker_nationality ? ` · ${ invoiceDetails.worker_nationality }` : '' }
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <table className="doc-items">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th className="right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        { itemRows }
                                        { xs ? exchangeRows(false) : (
                                            <>
                                                <tr>
                                                    <td style={{ color: 'var(--text-3)' }}>Total</td>
                                                    <td className="right">{ fmtHK(total) }</td>
                                                </tr>
                                                { adjustments !== 0 && (
                                                    <tr>
                                                        <td style={{ color: 'var(--text-3)' }}>Adjustment{ adjustments > 0 ? '' : ' (incl. write-off)' }</td>
                                                        <td className="right" style={{ color: adjustments > 0 ? 'var(--st-warning)' : 'var(--st-success)' }}>
                                                            { adjustments > 0 ? '+' : '' }{ fmtHK(adjustments) }
                                                        </td>
                                                    </tr>
                                                )}
                                                <tr>
                                                    <td>Payable amount</td>
                                                    <td className="right">{ fmtHK(Math.max(0, total + adjustments)) }</td>
                                                </tr>
                                                { paid > 0 && (
                                                    <tr>
                                                        <td style={{ color: 'var(--text-3)' }}>{ translation('key_paid') }</td>
                                                        <td className="right" style={{ color: 'var(--st-success)' }}>−{ fmtHK(paid) }</td>
                                                    </tr>
                                                )}
                                                { refunded > 0 && (
                                                    <tr>
                                                        <td style={{ color: 'var(--text-3)' }}>Refunded</td>
                                                        <td className="right" style={{ color: 'var(--st-neutral)' }}>({ fmtHK(refunded) })</td>
                                                    </tr>
                                                )}
                                                <tr className="total">
                                                    <td>Balance Due</td>
                                                    <td className="right">{ fmtHK(isVoid ? 0 : due) }</td>
                                                </tr>
                                                { invoiceDetails.status === 5 && (
                                                    <tr>
                                                        <td style={{ color: 'var(--st-danger)' }}>· of which classified Unsettled</td>
                                                        <td className="right" style={{ color: 'var(--st-danger)' }}>{ fmtHK(due) }</td>
                                                    </tr>
                                                )}
                                                { isBadDebt && (
                                                    <tr>
                                                        <td style={{ color: 'var(--st-danger)' }}>· of which classified Bad Debt</td>
                                                        <td className="right" style={{ color: 'var(--st-danger)' }}>{ fmtHK(due) }</td>
                                                    </tr>
                                                )}
                                            </>
                                        )}
                                    </tbody>
                                </table>

                                { (invoiceDetails.status === 5 || isBadDebt) && (
                                    <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--text-3)', fontStyle: 'italic' }}>
                                        Unsettled and Bad Debt are classifications of unresolved Balance Due — not additional charges.
                                    </div>
                                )}
                                { xs && (
                                    <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--text-3)' }}>
                                        Credit applied from A1 · displayed credit capped at A2 Total.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── RIGHT: Customer Printout ── */ }
                        <div>
                            <div className="printout-pane-label customer">Customer · { printoutLabel }</div>
                            <div className={ 'printout-doc' + (isBadDebt ? ' bad-debt-doc' : '') }>
                                { isVoid && <div className="void-stamp">VOID</div> }
                                <h3>{ printoutTitle }</h3>
                                <div className="doc-title">MaidMatch HK</div>
                                <div className="doc-sub">
                                    { invoiceDetails.invoice_number }
                                    { invoiceDetails.created_at ? ` · ${ fmtDate(invoiceDetails.created_at) }` : '' }
                                    { invoiceDetails.branch_name ? ` · ${ invoiceDetails.branch_name }` : '' }
                                </div>

                                { invoiceDetails.employer_name ? (
                                    <div className="doc-section">
                                        <div className="label">Issued to</div>
                                        <div className="value">
                                            <div>
                                                <strong>{ invoiceDetails.employer_name }</strong>
                                                { invoiceDetails.chinese_name ? ` · ${ invoiceDetails.chinese_name }` : '' }
                                            </div>
                                            { invoiceDetails.worker_name && (
                                                <div style={{ color: 'var(--text-3)', fontSize: 12 }}>Re: { invoiceDetails.worker_name }</div>
                                            )}
                                        </div>
                                    </div>
                                ) : invoiceDetails.worker_name && (
                                    <div className="doc-section">
                                        <div className="label">Issued to</div>
                                        <div className="value">
                                            <div>
                                                <strong>{ invoiceDetails.worker_name }</strong>
                                                { invoiceDetails.worker_reference_id ? ` · ${ invoiceDetails.worker_reference_id }` : '' }
                                            </div>
                                        </div>
                                    </div>
                                )}

                                { isVoid ? (
                                    <div className="doc-section" style={{ color: 'var(--text-3)' }}>
                                        This invoice was voided on { fmtDate(invoiceDetails.updated_at) }.
                                        Original line items are preserved in the admin record for audit purposes.
                                    </div>
                                ) : (
                                    <table className="doc-items">
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th className="right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            { !saved && itemRows }
                                            { xs ? exchangeRows(true) : saved ? (
                                                <SavedPrintoutRows invoice={ invoiceDetails } columns={ 2 }
                                                    balanceLabel={ (balance) => (isBadDebt || invoiceDetails.status === 5 ? 'Balance Due' : noPaymentRequired ? translation('key_inv_no_payment_required') : balance === 0 ? 'Paid in full' : 'Balance Due') } />
                                            ) : isBadDebt ? (
                                                <>
                                                    <tr>
                                                        <td style={{ color: 'var(--text-3)' }}>Subtotal</td>
                                                        <td className="right">{ fmtHK(total) }</td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ color: 'var(--text-3)' }}>{ translation('key_paid') }</td>
                                                        <td className="right" style={{ color: 'var(--st-success)' }}>−{ fmtHK(paid) }</td>
                                                    </tr>
                                                    <tr className="total">
                                                        <td>Balance Due</td>
                                                        <td className="right">{ fmtHK(total - paid) }</td>
                                                    </tr>
                                                </>
                                            ) : (
                                                <>
                                                    <tr>
                                                        <td style={{ color: 'var(--text-3)' }}>Subtotal</td>
                                                        <td className="right">{ fmtHK(total) }</td>
                                                    </tr>
                                                    { paid > 0 && (
                                                        <tr>
                                                            <td style={{ color: 'var(--text-3)' }}>Paid{ methodLabel ? ` · ${ methodLabel }` : '' }</td>
                                                            <td className="right" style={{ color: 'var(--st-success)' }}>−{ fmtHK(paid) }</td>
                                                        </tr>
                                                    )}
                                                    <tr className="total">
                                                        <td>{ noPaymentRequired ? translation('key_inv_no_payment_required') : due === 0 ? 'Paid in full' : 'Balance Due' }</td>
                                                        <td className="right">{ fmtHK(due) }</td>
                                                    </tr>
                                                </>
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                { xs && (
                                    <div className="doc-section" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                                        This is an Exchange Settlement invoice. Net Amount Due is HK$0.
                                        { additionalPayment > 0
                                            ? ` Additional payment ${ fmtHK(additionalPayment) } collected via Underpayment Invoice${ underpaymentRef ? ` ${ underpaymentRef }` : '' }.`
                                            : ` Remaining credit ${ fmtHK(remainingCredit) } · ${ remainingCredit > 0 ? disposition : outcome }.` }
                                    </div>
                                )}
                                { isBadDebt && (
                                    <div className="doc-section" style={{ fontSize: 11.5, color: 'var(--st-danger)' }}>
                                        This statement is for accounting purposes. Outstanding amount remains payable.
                                    </div>
                                )}
                                { !isVoid && !isBadDebt && (
                                    <div className="doc-section" style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 32 }}>
                                        Thank you for your business.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PrintoutPreviewModal;
