import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Icon from "../../../../components/Icon/Icon";
import "../new-ui-create.css";

import { STORED_METHOD_ALIASES, paymentMethodLabel, usePaymentMethodCatalogue } from "./paymentMethodCatalogue";

function PaymentConfirmedModal({ info, typeLabel, onClose, onViewDetail }) {
    const { t } = useTranslation();
    /* Born status from the catalogue (v4 A; C-12): terminal methods Paid; Bank Transfer / FPS / Cheque / PayMe Pending
       Paid · Unapproved; Cash Pending Paid (awaiting its deposit receipt) */
    const { catalogue } = usePaymentMethodCatalogue();
    if (!info) return null;

    const methodLabel = paymentMethodLabel(info.methodValue) || info.methodValue || '';
    const isReservation = info.paymentType === 'reservation_fee';
    const born = catalogue?.methods?.find((m) => m.code === (STORED_METHOD_ALIASES[info.methodValue] || info.methodValue))?.bornStatus;
    const isPending = !isReservation && (info.status === 2 || (info.status == null && Boolean(born) && born !== 'paid'));
    const unapproved = born !== 'pending_paid';

    const title = isReservation
        ? (t('key_reservation_fee_captured') || 'Reservation Fee captured')
        : isPending
            ? (t('key_payment_recorded_pending_paid') || 'Payment recorded · Pending Paid')
            : (t('key_payment_confirmed') || 'Payment confirmed');

    const routeLabel = isReservation
        ? `${ t('key_reservation_fee') || 'Reservation Fee' } · ${ t('key_active') || 'Active' }`
        : isPending
            ? (unapproved ? `${ t('key_pending_paid') || 'Pending Paid' } · ${ t('key_unapproved') || 'Unapproved' } · ${ typeLabel }` : `${ t('key_pending_paid') || 'Pending Paid' } · ${ typeLabel }`)
            : `${ t('key_paid') || 'Paid' } · ${ t('key_approved') || 'Approved' } · ${ typeLabel }`;

    return (
        <div className="takeover-veil" onMouseDown={ (e) => e.target === e.currentTarget && onClose() }>
            <div className="modal-card pay-modal" onMouseDown={ (e) => e.stopPropagation() } role="dialog" aria-modal="true">
                <div className="pm-done">
                    <span className={ 'ring ' + (isPending ? 'pending' : 'paid') }><Icon name={ isPending ? 'receipt' : 'check' } size={ 24 } /></span>
                    <h2>{ title }</h2>
                    <p>
                        { isReservation
                            ? <>{ t('key_reservation_opens_note') || 'Invoice opens in the Reservation Fee · Active state. Remaining balance is due before the deadline.' }</>
                            : isPending
                                ? <>{ t('key_invoice_created_as') || 'Invoice is created as' } <strong>{ unapproved ? (t('key_pending_paid_unapproved') || 'Pending Paid / Unapproved') : t('key_pending_paid') }</strong> { t('key_via') || 'via' } { methodLabel }. { t('key_recorded_amount_visible_review') || 'The recorded amount is visible as Paid while awaiting review.' }</>
                                : <>{ t('key_invoice_created_set_to') || 'Invoice is created and set to' } <strong>{ t('key_paid_approved') || 'Paid / Approved' }</strong>{ methodLabel ? <> { t('key_via') || 'via' } { methodLabel }</> : null }.</> }
                    </p>
                    <div className="reframe">{ info.invoiceNumber || 'I-C…' } → { t('key_opens_as') || 'opens as' } <strong>{ routeLabel }</strong></div>
                    <div style={ { display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14 } }>
                        <button type="button" className="btn btn-ghost md" onClick={ onClose }>{ t('key_close') || 'Close' }</button>
                        <button type="button" className="btn btn-primary md" onClick={ onViewDetail }><Icon name="external" size={ 13 } />{ t('key_open_invoice_detail') || 'Open Invoice Detail' }</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

PaymentConfirmedModal.propTypes = {
    info: PropTypes.shape({
        invoiceId: PropTypes.any,
        invoiceNumber: PropTypes.string,
        status: PropTypes.number,
        paymentType: PropTypes.string,
        methodValue: PropTypes.string,
    }),
    typeLabel: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onViewDetail: PropTypes.func.isRequired,
};

export default PaymentConfirmedModal;
