import React, { useCallback, useState } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import t from "../../../../utils/translation";
import Icon from "../../../../components/Icon/Icon";
import configData from "../../../../components/ReusableComponents/app-configs";
import { formatHK } from "../../../../utils/utils";
import { PAY_REMAINING_BALANCE, buildPayload } from "./PaymentMethodSelector";
import { PaymentEntryActions, PaymentEntryFields, usePaymentEntry } from "./PaymentEntry";
import "../InvoiceDetail.css";
import "./paymentMethodSelector.css";

/* Pay Remaining Balance (v4 B-8; INV §7.1): a blue action on the invoice detail that opens this modal (reference
   invoice-detail.html · ActionMenu `record_payment` + RecordPaymentModal). The Invoice API decides whether it is offered
   (invoiceData.payRemainingBalance: Balance Due > HK$0, the caller's permission, never on a refund child, Void, Exchanged or
   an expired Reservation Fee) and locks the amount; the form is the shared payment entry (PaymentEntry). */

const STATUS_PAID = 1;
const STATUS_PENDING_PAID = 2;
const STATUS_UNSETTLED = 5;
const STATUS_BAD_DEBT = 7;

const PayRemainingBalanceModal = ({ invoiceData, statusLabel = "", submitAction, onSuccess = null, onClose }) => {
    const entry = usePaymentEntry();
    const { method, loading } = entry;
    const amount = Number(invoiceData?.payRemainingBalance?.amount || 0);

    const submit = useCallback(() => entry.submit({
        buildRequest: (chosen, formData) => buildPayload(invoiceData, chosen, formData, PAY_REMAINING_BALANCE),
        submitAction,
        onDone: (res) => {
            if (onSuccess) onSuccess(res?.payload?.data?.contract_invoices_id || invoiceData?.id, res);
            onClose();
        },
    }), [entry, invoiceData, submitAction, onSuccess, onClose]);

    /* Impact preview: the rows that change (reference ImpactPreview). The method decides the status: card and wallet
       methods Paid, every other method Pending Paid (Invoice API domain, pay_remaining_balance); the collected value
       clears the Unsettled / Bad Debt amount, which the detail screens show as the Balance Due of an Unsettled (5) or
       Bad Debt (7) invoice. */
    const paidBefore = Number(invoiceData?.paid_amount || 0);
    const unsettled = Number(invoiceData?.status) === STATUS_UNSETTLED ? amount : 0;
    const badDebt = Number(invoiceData?.status) === STATUS_BAD_DEBT ? amount : 0;
    const statusAfter = method ? (method.tier === 1 ? STATUS_PAID : STATUS_PENDING_PAID) : null;
    const statusChanges = statusAfter !== null && Number(invoiceData?.status) !== statusAfter;
    /* the payment review state (reference ImpactPreview): card and wallet payments are Confirmed on save, the others
       wait in Pending review; a Pending Paid invoice is already in review, any other has no review state (—) */
    const reviewBefore = Number(invoiceData?.status) === STATUS_PENDING_PAID ? t("key_pending_review") : "—";
    const reviewAfter = method ? t(method.tier === 1 ? "key_confirmed" : "key_pending_review") : null;
    const reviewChanges = reviewAfter !== null && reviewBefore !== reviewAfter;

    return ReactDOM.createPortal(
        <div className="invd">
            <div className="modal-veil" onClick={ (e) => e.target === e.currentTarget && !loading && onClose() }>
                <div className="modal-card action-modal-card prb-modal" onClick={ (e) => e.stopPropagation() } role="dialog" aria-modal="true">
                    <div className="head">
                        <span className="ico" style={ { background: "var(--accent-bg)", color: "var(--accent)" } }>
                            <Icon name="receipt" size={ 18 } />
                        </span>
                        <div style={ { flex: 1 } }>
                            <h2>{ t("key_pay_remaining_balance") }</h2>
                            <div className="msub">{ t("key_pay_remaining_balance_subtitle") }</div>
                        </div>
                    </div>

                    <div className="body">
                        <PaymentEntryFields entry={ entry } amount={ amount } amountLabel={ t("key_amount_due_now") }>
                            <div className="appr-impact">
                                <div className="hd">{ t("key_impact_preview") }</div>
                                <table className="impact-tbl">
                                    <thead>
                                        <tr>
                                            <th>{ t("key_field") }</th>
                                            <th>{ t("key_before") }</th>
                                            <th className="arw">→</th>
                                            <th>{ t("key_after") }</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        { statusChanges && (
                                            <tr>
                                                <td>{ t("key_status") }</td>
                                                <td className="b txt">{ statusLabel }</td>
                                                <td className="arw">→</td>
                                                <td className="a txt">{ configData.invoiceStatusIdMapping[statusAfter]?.label }</td>
                                            </tr>
                                        ) }
                                        { reviewChanges && (
                                            <tr>
                                                <td>{ t("key_payment_review") }</td>
                                                <td className="b txt">{ reviewBefore }</td>
                                                <td className="arw">→</td>
                                                <td className="a txt">{ reviewAfter }</td>
                                            </tr>
                                        ) }
                                        <tr>
                                            <td>{ t("key_paid") }</td>
                                            <td className="b">{ formatHK(paidBefore) }</td>
                                            <td className="arw">→</td>
                                            <td className="a">{ formatHK(paidBefore + amount) }</td>
                                        </tr>
                                        <tr>
                                            <td>{ t("key_balance_due") }</td>
                                            <td className="b">{ formatHK(amount) }</td>
                                            <td className="arw">→</td>
                                            <td className="a">{ formatHK(0) }</td>
                                        </tr>
                                        { unsettled > 0 && (
                                            <tr>
                                                <td>{ t("key_unsettled") }</td>
                                                <td className="b">{ formatHK(unsettled) }</td>
                                                <td className="arw">→</td>
                                                <td className="a">{ formatHK(0) }</td>
                                            </tr>
                                        ) }
                                        { badDebt > 0 && (
                                            <tr>
                                                <td>{ t("key_bad_debt") }</td>
                                                <td className="b">{ formatHK(badDebt) }</td>
                                                <td className="arw">→</td>
                                                <td className="a">{ formatHK(0) }</td>
                                            </tr>
                                        ) }
                                    </tbody>
                                </table>
                                <p className="note">{ t("key_balance_due_footnote") }</p>
                            </div>
                        </PaymentEntryFields>
                    </div>

                    <div className="foot">
                        <PaymentEntryActions entry={ entry } onSubmit={ submit } onCancel={ onClose } />
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

PayRemainingBalanceModal.propTypes = {
    invoiceData: PropTypes.object.isRequired,
    statusLabel: PropTypes.string,
    submitAction: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
    onClose: PropTypes.func.isRequired,
};

/**
 * The blue "Pay Remaining Balance" action of the detail screens' action panel (reference ActionMenu, Payment actions):
 * shown only when the Invoice API offers it; the modal opens when it is pressed.
 */
export const PayRemainingBalanceAction = ({ invoiceData = null, statusLabel = "", submitAction, onSuccess = null }) => {
    const [open, setOpen] = useState(false);
    const close = useCallback(() => setOpen(false), []);
    if (!invoiceData?.payRemainingBalance) return null;
    return (
        <>
            <button type="button" className="action-btn primary" data-mc-action="record_payment" onClick={ () => setOpen(true) }>
                <Icon name="receipt" size={ 14 } className="ico" /><span className="label">{ t("key_pay_remaining_balance") }</span>
            </button>
            { open && (
                <PayRemainingBalanceModal invoiceData={ invoiceData } statusLabel={ statusLabel } submitAction={ submitAction }
                    onSuccess={ onSuccess } onClose={ close } />
            ) }
        </>
    );
};

PayRemainingBalanceAction.propTypes = {
    invoiceData: PropTypes.object,
    statusLabel: PropTypes.string,
    submitAction: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
};

export default PayRemainingBalanceModal;
