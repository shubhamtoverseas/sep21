import React, { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import t from "../../../../utils/translation";
import { PaymentEntryActions, PaymentEntryFields, usePaymentEntry } from "./PaymentEntry";
import "./paymentMethodSelector.css";

/* Pay Remaining Balance (v4 B-8): the one collection action on an invoice detail, collected in its own modal
   (PayRemainingBalanceModal), which builds its payload here. The Invoice API decides whether it is offered and locks the
   amount (invoiceData.payRemainingBalance); there is no Full Payment or Reservation Fee choice in it */
export const PAY_REMAINING_BALANCE = "pay_remaining_balance";

// ── Build API payload ────────────────────────────────────────────────────────
export function buildPayload(invoiceData, resolvedMethod, formData, selectionType, extraPayload) {
    // eslint-disable-next-line no-unused-vars
    const { final_items, itemData, invoice_items, ...rest } = invoiceData;
    let payload = {};
    if (selectionType === PAY_REMAINING_BALANCE) {
        /* the amount and version the Invoice API locked when the invoice was read; it re-checks both at commit */
        const { amount, version } = invoiceData?.payRemainingBalance || {};
        payload = {
            ...payload,
            invoice_id: invoiceData?.id,
            amount,
            ...(version ? { version } : {}),
            payment_method: resolvedMethod.value,
        };
    } else {
        payload = {
            ...rest,
            invoice_items: final_items ?? [],
            itemData: itemData ?? [],
            payment_method: resolvedMethod.value,
        };
    }

    const { type, value, apple } = resolvedMethod;
    if (type === "card") {
        // Map to legacy API payment_method for card methods
        if (value === "visa" || value === "mastercard" || value === "apple_pay") {
            payload.payment_method = "credit_card";
            if (value === "apple_pay" && formData.card_type === "union_pay") {
                payload.payment_method = "union_pay";
            }
        }
        // Resolve card_type: payments.card_type holds a card network only (visa / master_card / american_express).
        // UnionPay is the payment method itself (payment_method union_pay; payment_options keeps the pick), so its
        // card_type is empty — "union_pay" there failed the insert ("Data truncated for column 'card_type'").
        if (apple) {
            payload.card_type = formData.card_type === "union_pay" ? "" : formData.card_type;
        } else if (value === "union_pay") {
            payload.card_type = "";
        } else {
            payload.card_type = value === "mastercard" ? "master_card" : value;
        }
        payload.card_number = formData.card_number;
        payload.approval_code = formData.approval_code;
        payload.transaction_reference = formData.transaction_reference;
    } else if (type === "qr") {
        payload.transaction_reference = formData.transaction_reference;
    } else if (type === "off") {
        if (value === "bank_transfer") {
            payload.bank_name = formData.bank_name;
            payload.bank_in_reference = formData.bank_in_reference;
        } else if (value === "cheque") {
            payload.bank_name = formData.bank_name;
            payload.cheque_number = formData.cheque_number;
            if (formData.cheque_date) payload.cheque_date = formData.cheque_date;
        } else if (value === "fps" || value === "payme") {
            payload.transaction_reference = formData.transaction_reference;
        } else if (value === "cash") {
            /* optional at record time (v4 A; INV §5.2): sent only when entered */
            ["receipt_number", "received_by"].forEach((field) => {
                const entered = String(formData[field] ?? "").trim();
                if (entered) payload[field] = entered;
            });
        }
    }

    if (selectionType === "employer") delete payload.worker_id;
    if (selectionType === "worker") delete payload.employer_id;

    payload.payment_options = value;

    if (extraPayload) payload = { ...payload, ...extraPayload };

    return payload;
}

// ── Component ────────────────────────────────────────────────────────────────
/* The payment panel of invoice creation (Contract, Standalone): the shared payment entry form in the panel, not a popup
   (user 14 Oct, "CONFIRM PANEL"; reference RecordPaymentModal). An exchange takes no payment (#72; its shortfall is collected
   on the Underpayment child, #75, INV-X4). Its rules
   are the ones it always had: a new Reservation Fee's methods, the Reservation Fee details, the amount
   shown net of applied credits, the request per invoice type. */
const PaymentMethodSelector = ({
    invoiceData = null,
    selectionType = "",
    submitAction,
    onSuccess = null,
    disabledValues = [],
    extraPayload = null,
    invoiceCurrentJobInfo,
    onDetailsEntered
}) => {
    // ── Disabled logic ───────────────────────────────────────────────────────
    /* A new Reservation Fee (its first payment) is payable by Visa, Mastercard or UnionPay only — the catalogue's
       Reservation Fee methods (v4 C-7: Cash blocked; C-9 Apple Pay open, not allowed as today). Every other method
       is disabled with its reason (ruling 2026-10-12). */
    const rfBlocked = useCallback((method) => invoiceData?.payment_type === "reservation_fee" && invoiceData?.status === undefined
        && !method?.reservationFee, [invoiceData?.payment_type, invoiceData?.status]);
    /* there is no Partial Payment (conflicts sheet U-0235): a new invoice is paid in full or by its Reservation Fee */
    const isDisabled = useCallback((method) => {
        const value = method?.value;
        if (rfBlocked(method)) return true;
        if (disabledValues && disabledValues.includes(value)) return true;
        return false;
    }, [disabledValues, rfBlocked]);
    const disabledReason = useCallback((method) => (rfBlocked(method) ? t('key_not_available_for_reservation_fee') : ""), [rfBlocked]);

    /* a method the path no longer allows (switched to a Reservation Fee) goes back to the form's default */
    const entry = usePaymentEntry({ isDisabled, onDetailsEntered });

    const reservationIncomplete = invoiceData?.payment_type === "reservation_fee" &&
        invoiceData?.status === undefined &&
        (!invoiceData?.due_date || !String(invoiceData?.follow_up_note || "").trim());

    const displayAmount = useMemo(() => {
        const pt = invoiceData?.payment_type;
        /* Applied employer credits — display only. The payload keeps the full
           final_amount; the backend deducts the credit. Here we only lower the
           amount shown to staff so the panel matches the net Total. */
        const creditsTotal = (invoiceData?.apply_credits || []).reduce((s, c) => s + (Number(c.amount) || 0), 0);
        if (pt === 'reservation_fee') return Number(invoiceData?.paid_amount || 0);
        return Math.max(0, Number(invoiceData?.final_amount || 0) - creditsTotal);
    }, [invoiceData]);

    const submit = useCallback(() => entry.submit({
        buildRequest: (method, formData) => {
            const payload = buildPayload(invoiceData, method, formData, selectionType, extraPayload);
            if (selectionType === "contract") {
                payload.cancel_pending_upcoming_interviews = 0;
                if (invoiceCurrentJobInfo?.job_id) {
                    payload.job_id = invoiceCurrentJobInfo.job_id;
                    payload.cancel_pending_upcoming_interviews = invoiceData?.is_auto_cancel_interviews ? 1 : 0;
                }
            }
            return payload;
        },
        submitAction,
        onDone: (res) => {
            let invoiceId = res?.payload?.data?.invoice?.id;
            // Some responses nest the id as an object — normalize to a scalar
            // so navigation URLs and follow-up API calls receive a plain id.
            if (invoiceId && typeof invoiceId === 'object') {
                invoiceId = invoiceId.id ?? invoiceId.invoice_id ?? invoiceId.contract_invoices_id ?? null;
            }
            if (invoiceId && onSuccess) onSuccess(invoiceId, res);
        },
    }), [entry, invoiceData, selectionType, extraPayload, invoiceCurrentJobInfo?.job_id, submitAction, onSuccess]);

    const reservation = invoiceData?.payment_type === 'reservation_fee';

    return (
        <div className="pms-wrap">
            <PaymentEntryFields entry={ entry } amount={ displayAmount } disabledReason={ disabledReason }
                amountLabel={ reservation ? t('key_reservation_fee_due_now') : t('key_amount_due_now') } />
            <div className="pe-panel-foot">
                <PaymentEntryActions entry={ entry } onSubmit={ submit } ready={ !reservationIncomplete }
                    blockingNote={ reservationIncomplete && entry.method ? (t('key_complete_reservation_fee_details') || "Complete Reservation Fee details") : "" } />
            </div>
        </div>
    );
};

PaymentMethodSelector.propTypes = {
    invoiceData: PropTypes.object,
    selectionType: PropTypes.string,
    submitAction: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
    disabledValues: PropTypes.arrayOf(PropTypes.string),
    extraPayload: PropTypes.object,
    invoiceCurrentJobInfo: PropTypes.any,
    onDetailsEntered: PropTypes.func,
};

export default React.memo(PaymentMethodSelector);
