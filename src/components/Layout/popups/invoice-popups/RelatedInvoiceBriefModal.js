import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import InvoiceStatusTag from '../../../Invoice/InvoiceStatusTag';
import configData from '../../../ReusableComponents/app-configs';
import { getInvoiceDetails } from '../../../../services/invoices';
import { getInvoiceDetailPath } from '../../../../services/commonService';
import { formatHK, changeDynamicDateFormate } from '../../../../utils/utils';
import '../../../../Views/Pages/Invoice/new-ui-shared.css';
import '../../../../Views/Pages/Invoice/InvoiceDetail.css';

/* Related Invoice — read-only brief popup (spec: related-invoice-popup-guideline).
   One shared skeleton; role/status only toggle rows, labels and note copy.
   All values come from the invoice record — nothing is recomputed here. */

const APPROVAL_BY_STATUS = { 1: 'approved', 2: 'unapproved', 8: 'unapproved', 9: 'approved', 10: 'unapproved', 11: 'approved' };
const ROLE_ICON = {
    exchange: 'ri-arrow-left-right-line',
    refund: 'ri-arrow-go-back-line',
    surplus_refund: 'ri-arrow-go-back-line',
    underpayment: 'ri-arrow-down-line',
    parent: 'ri-file-text-line',
};

const RelatedInvoiceBriefModal = ({ invoiceId, seed, onClose }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [targetId, setTargetId] = useState(invoiceId);
    const [inv, setInv] = useState(seed || null);
    const [loading, setLoading] = useState(true);
    const triggerRef = useRef(null);

    useEffect(() => {
        triggerRef.current = document.activeElement;
        return () => { triggerRef.current?.focus?.(); };
    }, []);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        getInvoiceDetails({ invoice_id: targetId })
            .then((res) => { if (alive && res?.data?.data) setInv(res.data.data); })
            .catch(() => {})
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [targetId]);

    // Re-entrant: tapping a counterpart id swaps the popup to that invoice
    const jumpTo = useCallback((counterpart) => {
        if (!counterpart?.id) return;
        setInv({ invoice_number: counterpart.invoice_number, id: counterpart.id, status: counterpart.status, invoice_type: counterpart.invoice_type });
        setTargetId(counterpart.id);
    }, []);

    const brief = useMemo(() => {
        if (!inv) return null;
        const status = Number(inv.status);
        const type = inv.invoice_type || '';
        const isVoid = status === 6;
        const isRefundType = type.includes('refund');
        const isExchange = status === 10 || status === 11 || type === 'exchange';
        const isUnderpayment = type === 'underpayment';
        const isGeneral = type === 'general';
        const children = inv.childInvoices || [];
        const parent = inv.parentInvoice;
        const exchangeChild = children.find((c) => c.status === 10 || c.status === 11);
        const refundChild = children.find((c) => (c.invoice_type || '').includes('refund'));
        const underpayChild = children.find((c) => c.invoice_type === 'underpayment');
        const parentIsExchange = parent && (parent.status === 10 || parent.status === 11 || parent.invoice_type === 'exchange');

        let role = 'parent';
        if (isUnderpayment) role = 'underpayment';
        else if (isExchange) role = 'exchange';
        else if (isRefundType) role = (inv.refund_origin === 'exchange_invoice' || parentIsExchange) ? 'surplus_refund' : 'refund';

        const approval = isVoid ? null : APPROVAL_BY_STATUS[status] || null;
        const unapproved = approval === 'unapproved';

        let title = t('key_invoice');
        let refLabel = t('key_reference');
        if (role === 'parent') {
            const base = isGeneral ? (t('key_standalone_invoice') || 'Standalone invoice') : (t('key_contract_invoice') || 'Contract invoice');
            title = exchangeChild ? (t('key_source_a1_invoice') || 'Source A1 invoice') : base;
            refLabel = exchangeChild ? (t('key_a1_reference') || 'A1 reference') : t('key_reference');
        } else if (role === 'exchange') {
            title = t('key_exchange_invoice') || 'Exchange invoice';
            refLabel = t('key_a2_reference') || 'A2 reference';
        } else if (role === 'refund') {
            title = t('key_refund_child') || 'Refund child';
            refLabel = t('key_refund_reference') || 'Refund reference';
        } else if (role === 'surplus_refund') {
            title = t('key_remaining_credit_refund') || 'Remaining Credit refund';
            refLabel = t('key_refund_reference') || 'Refund reference';
        } else {
            title = t('key_underpayment_child') || 'Underpayment child';
            refLabel = t('key_underpayment_ref') || 'Underpayment ref';
        }

        let typeLabel = configData.invoiceTypeIdMapping[type]?.label || type;
        if (role === 'surplus_refund') typeLabel = `${ typeLabel } · ${ t('key_surplus') || 'surplus' }`;

        // Amount row — the popup shows the stored value; sign decides colour
        let amountRow = null;
        if (isVoid) {
            amountRow = { k: role === 'parent' ? t('key_paid') : t('key_amount'), v: formatHK(0), mono: true };
        } else if (role === 'parent') {
            amountRow = { k: t('key_paid'), v: formatHK(inv.paid_amount), mono: true };
        } else if (role === 'exchange') {
            amountRow = { k: t('key_invoice_total') || 'Invoice total', v: formatHK(inv.final_amount || 0), mono: true };
        } else if (role === 'underpayment') {
            amountRow = { k: t('key_amount_due') || 'Amount due', v: formatHK(Math.abs(Number(inv.final_amount) || 0)), mono: true };
        } else {
            const label = role === 'surplus_refund' ? (t('key_remaining_credit') || 'Remaining Credit') : t('key_refund_amount');
            amountRow = { k: label, v: formatHK(-Math.abs(Number(inv.final_amount) || 0)), neg: true };
        }

        // Relationship (§10) — → points down to a derived invoice, ← up to the source
        const rel = [];
        if (role === 'parent') {
            if (exchangeChild) rel.push({ verb: t('key_exchanged'), dir: 'down', cp: exchangeChild });
            if (refundChild) rel.push({ verb: t('key_refunded'), dir: 'down', cp: refundChild });
        } else if (role === 'exchange') {
            if (parent) rel.push({ verb: t('key_source'), dir: 'up', cp: parent });
            if (refundChild) rel.push({ verb: t('key_refunded'), dir: 'down', cp: refundChild });
            if (underpayChild) rel.push({ verb: t('key_underpayment') || 'Underpayment', dir: 'down', cp: underpayChild });
        } else if (parent) {
            const verb = role === 'refund' ? t('key_parent') : (t('key_exchange') || 'Exchange');
            rel.push({ verb, dir: 'up', cp: parent });
        }
        const relSuffix = role === 'exchange' && inv.contract_number
            ? `${ t('key_new_contract') || 'New contract' } ${ inv.contract_number }` : null;

        const printout = role === 'parent' && exchangeChild ? (t('key_preserved_as_historical_receipt') || 'Preserved as historical receipt') : null;

        let deadline = null;
        if (!isVoid && inv.due_date && (unapproved || status === 2)) {
            const window = role === 'surplus_refund'
                ? (t('key_own_30_day_window') || 'own 30-day window')
                : (t('key_30_day_window') || '30-day window');
            const isApproval = status !== 2;
            let v = changeDynamicDateFormate(inv.due_date, 'DD MMM YYYY') + (isApproval ? ` · ${ window }` : '');
            if (isApproval && (role === 'refund' || role === 'surplus_refund') && (inv.refund_option === 'cheque_refund' || inv.payment_method === 'cheque')) {
                v += ` · ${ t('key_cheque_doc_required_before_approval') || 'cheque documentation required before approval' }`;
            }
            deadline = { k: isApproval ? (t('key_approval_deadline') || 'Approval deadline') : (t('key_payment_deadline') || 'Payment deadline'), v };
        }

        let a2State = null;
        if (role === 'underpayment' && parent) {
            if (parent.status === 11) a2State = t('key_a2_approved_collectible') || 'Approved — collectible';
            else if (parent.status === 10) a2State = t('key_a2_unapproved_child_locked') || 'Unapproved — child locked';
            else a2State = configData.invoiceStatusIdMapping[parent.status]?.label || '';
        }

        let note; let intent;
        if (isVoid) { note = t('key_rib_note_void') || 'Voided — display shows $0; source records preserved for audit.'; intent = 'danger'; }
        else if (role === 'parent' && exchangeChild) { note = t('key_rib_note_source_exchanged') || 'A1 keeps its historical Paid / Approved state after exchange. Refund / Exchange / Void are blocked; Mark Unsettled / Mark Bad Debt / Adjust Amount remain available with warning.'; intent = 'subtle'; }
        else if (role === 'exchange') { note = unapproved ? (t('key_rib_note_exchange_unapproved') || 'Exchange nets to HK$0 by design. Approve within 30 days to move to Exchanged / Approved, otherwise A2 becomes Unsettled. Surplus / shortfall is carried by a linked child invoice.') : (t('key_rib_note_exchange_approved') || 'Exchange nets to HK$0 by design. Approved — settlement is carried by its linked child invoices.'); intent = unapproved ? 'warn' : 'subtle'; }
        else if (role === 'surplus_refund') { note = t('key_rib_note_surplus') || "Surplus returned as Remaining Credit — amount negative. Approved independently of the Exchange (A2); it does not inherit A2's approval and has its own 30-day deadline → Unsettled if missed."; intent = unapproved ? 'warn' : 'subtle'; }
        else if (role === 'refund') { note = unapproved ? (t('key_rib_note_refund_unapproved') || 'Money leaving the company — amount shown negative. Requires management approval within 30 days or the child becomes Unsettled. Pay Remaining Balance is never available on a refund child.') : (t('key_rib_note_refund_approved') || 'Money leaving the company — amount shown negative. Approved and recorded against the parent invoice.'); intent = unapproved ? 'warn' : 'subtle'; }
        else if (role === 'underpayment') { note = t('key_rib_note_underpayment') || 'Shortfall the employer must pay — amount positive. Gated by parent A2: while A2 is Unapproved the child cannot be Approved / Paid, regardless of method. Partial refunds are blocked (Full Refund only).'; intent = ''; }
        else { note = t('key_rib_note_default') || 'Read-only brief — all actions live on the full Invoice Detail page.'; intent = 'subtle'; }

        const statusLabel = configData.invoiceStatusIdMapping[status]?.label || inv.invoice_status || '';

        return { role, title, refLabel, typeLabel, approval, amountRow, rel, relSuffix, printout, deadline, a2State, note, intent, statusLabel, status, isVoid };
    }, [inv, t]);

    const openFull = useCallback(() => {
        if (!inv?.id) return;
        onClose();
        navigate(getInvoiceDetailPath(inv));
    }, [inv, navigate, onClose]);

    return (
        <div className="invd modal-veil" role="dialog" aria-modal="true" onClick={ (e) => e.target === e.currentTarget && onClose() }>
            <div className="modal-card brief-modal-card">
                <div className="head">
                    <span className="ico accent"><i className={ ROLE_ICON[brief?.role] || ROLE_ICON.parent } /></span>
                    <div className="head-col">
                        <h2>{ brief?.title || t('key_invoice') }</h2>
                        <div className="msub mono">{ inv?.invoice_number || '' }</div>
                    </div>
                    <button type="button" className="btn-icon" onClick={ onClose } aria-label="Close"><i className="ri-close-line" /></button>
                </div>

                <div className="body">
                    { (!brief || (loading && !inv?.invoice_type)) ? (
                        <div className="rib-loading">{ t('key_loading') }…</div>
                    ) : (
                        <>
                            <div className="rib-strip">
                                <InvoiceStatusTag status={ brief.status } label={ brief.statusLabel } />
                                { brief.approval && <span className="rib-approval">{ brief.approval === 'approved' ? t('key_approved') : t('key_unapproved') }</span> }
                                <span className="spacer" />
                                <span className="rib-type">{ brief.typeLabel }</span>
                            </div>

                            <div className="rib-grid">
                                <div className="rib-row"><span className="k">{ brief.refLabel }</span><span className="v mono">{ inv.invoice_number }</span></div>
                                { brief.amountRow && (
                                    <div className="rib-row"><span className="k">{ brief.amountRow.k }</span><span className={ 'v' + (brief.amountRow.neg ? ' neg' : ' mono') }>{ brief.amountRow.v }</span></div>
                                ) }
                                <div className="rib-row">
                                    <span className="k">{ t('key_relationship') }</span>
                                    <span className="v">
                                        { brief.rel.length === 0 ? t('key_no_related_invoices') : brief.rel.map((r, i) => (
                                            <span key={ i }>
                                                { i > 0 && ' · ' }
                                                { r.dir === 'up' ? <>← { r.verb } </> : <>{ r.verb } → </> }
                                                { r.cp.can_open
                                                    ? <button type="button" className="rib-link mono" onClick={ () => jumpTo(r.cp) }>{ r.cp.invoice_number }</button>
                                                    : <span className="rib-ref-neutral">{ r.cp.invoice_number }</span> }
                                            </span>
                                        )) }
                                        { brief.rel.length > 0 && brief.relSuffix && <span> · { brief.relSuffix }</span> }
                                    </span>
                                </div>
                                { brief.printout && <div className="rib-row"><span className="k">{ t('key_customer_printout') }</span><span className="v">{ brief.printout }</span></div> }
                                { brief.deadline && <div className="rib-row"><span className="k">{ brief.deadline.k }</span><span className="v">{ brief.deadline.v }</span></div> }
                                { brief.a2State && <div className="rib-row"><span className="k">{ t('key_parent_a2_state') || 'Parent A2 state' }</span><span className="v">{ brief.a2State }</span></div> }
                            </div>

                            <div className={ 'rf-note' + (brief.intent ? ' ' + brief.intent : '') }>{ brief.note }</div>
                        </>
                    ) }
                </div>

                <div className="foot rib-foot">
                    <button type="button" className="btn btn-ghost md rib-open" onClick={ openFull } disabled={ !inv?.id }>
                        { t('key_open_full_invoice') || 'Open full invoice' } <i className="ri-external-link-line" />
                    </button>
                    <button type="button" className="btn btn-secondary md" onClick={ onClose }>{ t('key_close') }</button>
                </div>
            </div>
        </div>
    );
};

RelatedInvoiceBriefModal.propTypes = {
    invoiceId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    seed: PropTypes.object,
    onClose: PropTypes.func.isRequired,
};

export default RelatedInvoiceBriefModal;
