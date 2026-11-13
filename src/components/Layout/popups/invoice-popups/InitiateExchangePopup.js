import React from 'react';
import { formatHK } from "../../../../utils/utils";
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Icon from '../../../Icon/Icon';
import { balanceDueOf } from "../../../../Views/Pages/Invoice/invoiceBalance";
import '../../../../Views/Pages/Invoice/new-ui-shared.css';
import '../../../../Views/Pages/Invoice/InvoiceDetail.css';

// ─── Source-invoice (A1) row ──────────────────────────────────────────────────
function SrcRow({ k, v, highlight, sans }) {
    return (
        <div className="src-row">
            <span className="k">{ k }</span>
            <span className={ 'v' + (sans ? '' : ' mono') + (highlight ? ' ' + highlight : '') }>{ v }</span>
        </div>
    );
}
SrcRow.propTypes = { k: PropTypes.string, v: PropTypes.node, highlight: PropTypes.string, sans: PropTypes.bool };

function InitiateExchangePopup({ onClose, onSelectWorker, invoiceData, hasPendingRefund }) {
    const { t } = useTranslation();
    const data = invoiceData || {};

    const paid = Number(data.paid_amount || 0);
    const balanceDue = balanceDueOf(data);
    const refunded = Number(data.refund_amount || 0);
    const credit = Math.max(0, paid - balanceDue - refunded);

    const employer = data.chinese_name
        ? `${ data.employer_name } · ${ data.chinese_name }`
        : (data.employer_name || '—');
    const worker = data.worker_name || '—';

    return (
        <div className="invd modal-veil" role="dialog" aria-modal="true" onClick={ (e) => e.target === e.currentTarget && onClose() }>
            <div className="modal-card action-modal-card">
                <div className="head">
                    <span className="ico attention"><Icon name="refresh" size={ 18 } /></span>
                    <div style={ { flex: 1 } }>
                        <h2>{ t('key_initiate_exchange_title') }</h2>
                        <div className="msub">{ t('key_initiate_exchange_subtitle') }</div>
                    </div>
                    <button type="button" className="btn-icon" onClick={ onClose } aria-label="Close"><Icon name="x" size={ 16 } /></button>
                </div>

                <div className="body">
                    { hasPendingRefund && (
                        <div className="exch-blocked">{ t('key_exchange_blocked_pending_refund') }</div>
                    ) }

                    <p>{ t('key_initiate_exchange_body') }</p>

                    <div className="exch-src">
                        <div className="src-head">{ t('key_source_invoice_a1') }</div>
                        <SrcRow k={ t('key_reference') } v={ data.invoice_number || '—' } />
                        <SrcRow k={ t('key_employer') } v={ employer } sans />
                        <SrcRow k={ t('key_current_worker') } v={ worker } sans />
                        <SrcRow k={ t('key_paid') } v={ formatHK(paid) } />
                        <SrcRow k={ t('key_balance_due') } v={ formatHK(balanceDue) } />
                        <SrcRow k={ t('key_refunds_issued') } v={ formatHK(refunded) } />
                        <SrcRow k={ t('key_available_exchange_credit') } v={ formatHK(credit) } highlight="success" />
                    </div>
                </div>

                <div className="foot">
                    <button type="button" className="btn btn-ghost md" onClick={ onClose }>{ t('key_cancel') }</button>
                    <button type="button" className="btn btn-primary md" onClick={ onSelectWorker } disabled={ hasPendingRefund }>
                        <Icon name="chev_right" size={ 13 } />{ t('key_select_replacement_worker') }
                    </button>
                </div>
            </div>
        </div>
    );
}

InitiateExchangePopup.propTypes = {
    onClose: PropTypes.func.isRequired,
    onSelectWorker: PropTypes.func.isRequired,
    invoiceData: PropTypes.object,
    hasPendingRefund: PropTypes.bool
};

export default InitiateExchangePopup;
