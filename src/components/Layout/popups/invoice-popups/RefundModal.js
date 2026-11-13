import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { formatHK, headingCase } from "../../../../utils/utils";
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Icon from '../../../Icon/Icon';
import constData from '../../../ReusableComponents/constants';
import { ShowToast } from '../../../show-toast/ShowToast';
import { uploadFile } from '../../../../services/commonService';
import { buildPayload, refundLines } from '../../../initiate-refund/InitiateRefund';
import { PROOF_FILE_ACCEPT, checkPaymentDocumentFile, refundOriginLabel } from '../../../../Views/Pages/Invoice/payment-method-selector/paymentMethodCatalogue';
import { addRefundInvoice, loadInvoiceCancellationReasons } from '../../../../redux/Slices/invoices/InvoicesSlice';
import '../../../../Views/Pages/Invoice/new-ui-shared.css';
import '../../../../Views/Pages/Invoice/InvoiceDetail.css';
import DateInput from "../../../ui/DateInput";

const neg = (n) => '−' + formatHK(Math.abs(Number(n) || 0)).replace('-', '');

// ─── Stepper ────────────────────────────────────────────────────────────────
function RefundStepper({ steps, current }) {
    const idx = steps.findIndex((s) => s.id === current);
    return (
        <div className="refund-stepper">
            { steps.map((s, i) => (
                <React.Fragment key={ s.id }>
                    { i > 0 && <span className="sep">›</span> }
                    <span className={ 'st' + (i === idx ? ' on' : i < idx ? ' done' : '') }>{ s.label }</span>
                </React.Fragment>
            )) }
        </div>
    );
}
RefundStepper.propTypes = { steps: PropTypes.array.isRequired, current: PropTypes.string.isRequired };

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, hint, required, children }) {
    return (
        <div className="rf-field">
            <label className={ 'rf-lbl' + (required ? ' required' : '') }>{ label }</label>
            { children }
            { hint && <div className="rf-hint">{ hint }</div> }
        </div>
    );
}
Field.propTypes = { label: PropTypes.string, hint: PropTypes.string, required: PropTypes.bool, children: PropTypes.node };

// ─── Context stat chip ────────────────────────────────────────────────────────
function ContextStat({ k, v, highlight }) {
    return (
        <div className="rf-stat">
            <div className="k">{ k }</div>
            <div className={ 'v' + (highlight ? ' ' + highlight : '') }>{ v }</div>
        </div>
    );
}
ContextStat.propTypes = { k: PropTypes.string, v: PropTypes.node, highlight: PropTypes.string };

// ─── Main modal ───────────────────────────────────────────────────────────────
const RefundModal = ({ onClose, invoiceData, isContract: isContractProp, onSuccess }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const invoiceCacellationReason = useSelector((state) => state.invoices.invoiceCacellationReason);
    const fileInputRef = useRef(null);

    // Contract refund payload shape applies to any contract invoice, regardless of which detail page opened the modal
    // (prop is a page hint; data is authoritative).
    const isContract = isContractProp || invoiceData?.invoice_type === 'contract';
    // Sheet row 2 (PROCESS §2.6): the cancel / keep question is asked on a full or partial refund of a Contract invoice
    // while its contract is open. The Invoice API decides (refund_contract_prompt); the page prop never forces it.
    const asksContract = invoiceData?.refund_contract_prompt === true;

    // ── what Refund may return, as the Invoice API computes it (10 Oct register #20, #26; prototype transition T8): the
    //    refundable balance — the money paid less every non-voided refund — and per line what it may still return. Nothing
    //    left, or a refund awaiting approval, stops the wizard at its first step; an Underpayment allows a full refund only.
    const offer = invoiceData?.refundable;
    const refundable = Math.max(0, Number(offer?.amount) || 0);
    const refundedBefore = Number(offer?.refunded) || 0;
    const fullRefundOnly = offer?.fullRefundOnly === true;
    const blockedReason = !(refundable > 0)
        ? t('key_blocked_no_refundable_value')
        : (offer?.pending ? t('key_blocked_refund_pending') : null);

    // ── original payment and its refund routes (v4 B-10; the Invoice API's refundOrigin) ─────────────────────
    // Tier 1 payments may return through their original channel or by company cheque (prototype; the 10 Oct register #24
    // keeps card refunds on the card network — OP-PM-39); Tier 2 — or an invoice paid partly by Tier 2 (OP-PM-36) — by
    // company cheque only. Apple Pay names the Card Network that routes its refund.
    const origin = invoiceData?.refundOrigin;
    const tier1Origin = origin?.originalChannel === true;
    const originLabel = refundOriginLabel(origin);
    const originMethods = origin?.methods || [];
    const viaCardNetwork = originMethods.length > 0 && originMethods.every((m) => m.method === 'apple_pay');

    // ── steps ────────────────────────────────────────────────────────────────
    const steps = useMemo(() => ([
        { id: 'type', label: headingCase(t('key_refund_type')) },
        ...(asksContract ? [{ id: 'contract', label: t('key_contract_impact') }] : []),
        { id: 'review', label: t('key_review') },
        { id: 'method', label: t('key_refund_method') },
        { id: 'docs', label: t('key_documentation') },
        { id: 'confirm', label: t('key_confirm') },
    ]), [asksContract, t]);

    const [step, setStep] = useState('type');
    const [refundType, setRefundType] = useState(null);
    const [cancel, setCancel] = useState(null);                  // true | false | null
    const [cancellationDate, setCancellationDate] = useState('');
    const [cancellationReason, setCancellationReason] = useState('');
    const [remarks, setRemarks] = useState('');
    const [refundItems, setRefundItems] = useState([]);
    const [customItems, setCustomItems] = useState([]);
    const [method, setMethod] = useState(tier1Origin ? 'original' : 'cheque'); // 'original' | 'cheque'
    const [docState, setDocState] = useState('uploaded');        // 'uploaded' (upload now) | 'missing' (upload later)
    const [docFile, setDocFile] = useState(null);                // File selected for payment_attachment
    const [loading, setLoading] = useState(false);

    // ── fetch cancellation reasons (contract impact dropdown): once, while the store has none (performance track A-14) ──
    useEffect(() => {
        if (asksContract) dispatch(loadInvoiceCancellationReasons());
    }, [dispatch, asksContract]);

    // ── the invoice's lines, one row each (never merged by price), with what each may still return ──
    const lines = useMemo(() => refundLines(invoiceData), [invoiceData]);

    // ── initialise refundItems (amounts entered each time, capped by what the line still has;
    //    refunds are repeatable while a refundable balance remains — no count cap) ──
    useEffect(() => {
        setRefundItems(lines.map((line) => ({
            refund_item_description: line.description,
            refund_amount: 0,
            type: line.type,
            id: line.id,
            price_id: line.price_id,
        })));
    }, [lines]);

    // ── totals ────────────────────────────────────────────────────────────────
    const partialTotal = useMemo(() => {
        const a = refundItems.reduce((s, it) => s + (Number(it.refund_amount) || 0), 0);
        const c = customItems.reduce((s, it) => s + (Number(it.refund_amount) || 0), 0);
        return a + c;
    }, [refundItems, customItems]);

    const totalRefund = refundType === 'full' ? refundable : partialTotal;
    const overCap = refundType === 'partial' && totalRefund > refundable + 0.001;

    // ── per-item edit (partial) ───────────────────────────────────────────────
    const editItemAmount = useCallback((index, value, cap) => {
        if (!constData.AMOUNT_INPUT_REGEX.test(value)) return;
        const num = Math.min(Number(value) || 0, cap);
        setRefundItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], refund_amount: num };
            return next;
        });
    }, []);

    const addCustomItem = useCallback(() => {
        setCustomItems((prev) => [...prev, { refund_item_description: '', refund_amount: '0', type: 'custom_refund' }]);
    }, []);
    const editCustomItem = useCallback((index, field, value) => {
        if (field === 'refund_amount' && !constData.AMOUNT_INPUT_REGEX.test(value)) return;
        setCustomItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    }, []);
    const removeCustomItem = useCallback((index) => {
        setCustomItems((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // ── documentation file: kept only when it passes the Invoice API's rule (PDF, JPG or PNG up to 5 MB, by content; v4 C-2) ──
    const pickDocFile = useCallback(async (file) => {
        const problem = await checkPaymentDocumentFile(file);
        if (problem) {
            ShowToast('error', problem);
            return;
        }
        setDocFile(file);
        setDocState('uploaded');
    }, []);

    // ── navigation ────────────────────────────────────────────────────────────
    const stepIdx = steps.findIndex((s) => s.id === step);
    const go = (dir) => setStep(steps[Math.min(steps.length - 1, Math.max(0, stepIdx + dir))].id);

    const canNext = (() => {
        if (step === 'type') return !!refundType && !blockedReason;
        if (step === 'contract') return cancel === false || (cancel === true && cancellationDate && cancellationReason);
        if (step === 'review') return totalRefund > 0 && !overCap;
        return true;
    })();

    // ── submit (mirrors InitiateRefund.handleConfirmSubmit + buildPayload) ────
    const handleConfirm = useCallback(async () => {
        setLoading(true);
        const selectionType = (refundType === 'full' ? 'fullRefund' : 'partialRefund') + (isContract ? '' : 'General');

        const contractFormInfo = isContract
            ? {
                cancel_contract: asksContract && cancel ? '1' : '0',
                cancellation_date: cancellationDate,
                cancellation_reason: cancellationReason,
                other_reason: remarks,
                remarks,
            }
            : { cancel_contract: 0, cancellation_date: '', cancellation_reason: '', other_reason: '', remarks: '' };

        if (asksContract) {
            if (cancel === null) {
                ShowToast('error', t('key_please_select_contract_cancellation_option'));
                setLoading(false);
                return;
            }
            if (contractFormInfo.cancel_contract === '1') {
                if (!cancellationDate) { ShowToast('error', t('key_please_select_cancellation_date')); setLoading(false); return; }
                if (!cancellationReason) { ShowToast('error', t('key_please_select_reason_for_cancellation')); setLoading(false); return; }
            }
        }

        const refundedOption = method === 'original' ? 'direct_refund' : 'cheque_refund';
        const validCustom = customItems.filter((it) => {
            const amt = parseFloat(it.refund_amount);
            return !isNaN(amt) && amt !== 0;
        });

        const payload = buildPayload(invoiceData, selectionType, contractFormInfo, totalRefund, refundItems, validCustom, refundedOption, null, 0);

        // Documentation: upload the chosen file first so the refund create payload
        // carries payment_attachment (same pattern as the create flows).
        if (docState === 'uploaded' && docFile) {
            try {
                const up = await uploadFile([{ file: docFile, name: 'invoices/payment' }]);
                if (up?.filename) payload.payment_attachment = up.filename;
            } catch (e) {
                // upload failure is non-blocking; documentation can be added later
            }
        }

        dispatch(addRefundInvoice(payload)).then((res) => {
            const status = res?.payload?.status;
            if (status !== 400) {
                if (status === undefined && !res?.payload?.data?.status) {
                    ShowToast('error', res?.payload?.data?.message);
                    setLoading(false);
                    return;
                }
                ShowToast('success', res?.payload?.message);
                const invoiceId = res?.payload?.data?.id;
                onClose();
                if (invoiceId && onSuccess) onSuccess(invoiceId, res);
            } else {
                const resData = res?.payload?.data;
                const details = resData?.details;
                if (Array.isArray(details) && details.length > 0) {
                    const msgs = details.map((d) => `${ d.instancePath?.replace('/', '') }: ${ d.message }`).join(', ');
                    ShowToast('error', `${ resData?.error ?? t('key_validation_error') } — ${ msgs }`);
                } else {
                    ShowToast('error', resData?.error ?? resData?.data ?? t('key_something_went_wrong'));
                }
                setLoading(false);
            }
        });
    }, [refundType, isContract, asksContract, cancel, cancellationDate, cancellationReason, remarks, method, customItems, invoiceData, totalRefund, refundItems, docState, docFile, dispatch, onClose, onSuccess, t]);

    const employerName = invoiceData?.employer_name;

    return (
        <div className="invd modal-veil" role="dialog" aria-modal="true" onClick={ (e) => e.target === e.currentTarget && !loading && onClose() }>
            <div className="modal-card action-modal-card wide">
                <div className="head">
                    <span className="ico attention"><Icon name="refresh" size={ 18 } /></span>
                    <div style={ { flex: 1 } }>
                        <h2>{ t('key_refund') }</h2>
                        <div className="msub">{ t('key_refund_modal_subtitle') }</div>
                    </div>
                    <button type="button" className="btn-icon" onClick={ onClose } aria-label="Close" disabled={ loading }><Icon name="x" size={ 16 } /></button>
                </div>

                <div className="body">
                    <RefundStepper steps={ steps } current={ step } />

                    {/* ── Step: Refund Type ─────────────────────────────── */ }
                    { step === 'type' && (
                        <div>
                            { fullRefundOnly && (
                                <div className="rf-note danger callout" style={ { display: 'flex', gap: 8, marginBottom: 14, color: 'var(--text-2)' } }>
                                    <Icon name="alert" size={ 14 } style={ { color: 'var(--st-danger)', flexShrink: 0 } } />
                                    <span>{ t('key_underpayment_partial_refund_blocked') }</span>
                                </div>
                            ) }
                            <p className="rf-p">{ t('key_choose_refundable_balance') } <strong className="mono">{ formatHK(refundable) }</strong>.</p>
                            <div className="refund-type-row">
                                <button type="button" className={ 'refund-type-btn' + (refundType === 'full' ? ' active' : '') } disabled={ !!blockedReason } onClick={ () => setRefundType('full') }>
                                    <span className="radio">{ refundType === 'full' && <Icon name="check" size={ 9 } /> }</span>{ t('key_full_refund') }
                                </button>
                                <button type="button" className={ 'refund-type-btn' + (refundType === 'partial' ? ' active' : '') } disabled={ !!blockedReason || fullRefundOnly } onClick={ () => setRefundType('partial') }>
                                    <span className="radio">{ refundType === 'partial' && <Icon name="check" size={ 9 } /> }</span>{ t('key_partial_refund') }
                                </button>
                            </div>
                            { blockedReason && <div className="rf-note danger" style={ { marginTop: 12 } }>{ blockedReason }</div> }
                        </div>
                    ) }

                    {/* ── Step: Contract impact ──────────────────────────── */ }
                    { step === 'contract' && (
                        <div>
                            <p className="rf-p">{ t('key_is_worker_contract_cancelled') }</p>
                            <div className="rf-choice-row">
                                <button type="button" className={ 'btn ' + (cancel === true ? 'btn-primary' : 'btn-secondary') } onClick={ () => setCancel(true) }>{ t('key_yes_cancel_worker_contract') }</button>
                                <button type="button" className={ 'btn ' + (cancel === false ? 'btn-primary' : 'btn-secondary') } onClick={ () => setCancel(false) }>{ t('key_no_retain_contract') }</button>
                            </div>
                            { cancel === true && (
                                <div className="rf-grid2">
                                    <div className="rf-span2">
                                        <Field label={ t('key_cancellation_date') } required>
                                            <DateInput value={ cancellationDate } onChange={ setCancellationDate } />
                                        </Field>
                                    </div>
                                    <div className="rf-span2">
                                        <Field label={ t('key_reason_for_cancellation') } required>
                                            <div className="select"><select className="input" value={ cancellationReason } onChange={ (e) => setCancellationReason(e.target.value) }>
                                                <option value="">{ t('key_select_reason') }</option>
                                                { (invoiceCacellationReason || []).map((r, i) => (
                                                    <option key={ i } value={ r.id }>{ r.name }</option>
                                                )) }
                                            </select></div>
                                        </Field>
                                    </div>
                                    <div className="rf-span2">
                                        <Field label={ t('key_remarks') }>
                                            <textarea className="input" rows={ 2 } style={ { height: 'auto', padding: 8 } } value={ remarks } onChange={ (e) => setRemarks(e.target.value) } placeholder={ t('key_context_for_cancellation') } />
                                        </Field>
                                    </div>
                                    <div className="rf-span2 rf-note warn small">{ t('key_insurance_review_triggered') }</div>
                                </div>
                            ) }
                            { cancel === false && (
                                <div className="rf-note retained">{ t('key_contract_retained_note') }</div>
                            ) }
                        </div>
                    ) }

                    {/* ── Step: Review ───────────────────────────────────── */ }
                    { step === 'review' && (
                        <div>
                            <div className="rf-stat-row">
                                <ContextStat k={ t('key_parent') } v={ invoiceData?.invoice_number || invoiceData?.reference_id } />
                                <ContextStat k={ t('key_paid') } v={ formatHK(offer?.paid) } />
                                <ContextStat k={ t('key_refundable_balance') } v={ formatHK(refundable) } highlight="success" />
                            </div>
                            <table className="refund-items">
                                <thead>
                                    <tr>
                                        <th>{ t('key_item') }</th>
                                        <th>{ t('key_description') }</th>
                                        <th className="right">{ t('key_eligible') }</th>
                                        <th className="right" style={ { width: 150 } }>{ refundType === 'full' ? t('key_refund') : t('key_refund_amount') }</th>
                                        <th className="right">{ t('key_remaining') }</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { lines.map((line, i) => {
                                        const cap = line.remaining;
                                        const val = refundType === 'full' ? line.full : (Number(refundItems[i]?.refund_amount) || 0);
                                        return (
                                            <tr key={ line.id }>
                                                <td className="primary">{ line.item }</td>
                                                <td>{ line.description || <span style={ { color: 'var(--text-4)' } }>—</span> }</td>
                                                <td className="right">{ formatHK(cap) }</td>
                                                <td className="right">
                                                    { refundType === 'full'
                                                        ? <span className="mono" style={ { color: 'var(--st-danger)' } }>{ neg(line.full) }</span>
                                                        : <input className="input mono amount" type="number" min="0" max={ cap } value={ refundItems[i]?.refund_amount || '' } disabled={ cap <= 0 } placeholder="0" onChange={ (e) => editItemAmount(i, e.target.value, cap) } /> }
                                                </td>
                                                <td className="right mono" style={ { color: 'var(--text-3)' } }>{ formatHK(cap - val) }</td>
                                            </tr>
                                        );
                                    }) }
                                    { customItems.map((it, i) => (
                                        <tr key={ 'c' + i }>
                                            <td className="primary">{ t('key_custom_refund') }</td>
                                            <td><input className="input" type="text" value={ it.refund_item_description } placeholder={ t('key_custom_refund') } onChange={ (e) => editCustomItem(i, 'refund_item_description', e.target.value) } /></td>
                                            <td className="right">—</td>
                                            <td className="right"><input className="input mono amount" type="number" min="0" value={ it.refund_amount } placeholder="0" onChange={ (e) => editCustomItem(i, 'refund_amount', e.target.value) } /></td>
                                            <td className="right"><button type="button" className="btn-icon" onClick={ () => removeCustomItem(i) } aria-label="Remove"><Icon name="trash" size={ 13 } /></button></td>
                                        </tr>
                                    )) }
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={ 3 } style={ { textAlign: 'right' } }>{ t('key_refund_total') }</td>
                                        <td className="right" style={ { color: 'var(--st-danger)', fontWeight: 600 } }>{ neg(totalRefund) }</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                            { refundType === 'partial' && (
                                <button type="button" className="btn btn-ghost md" onClick={ addCustomItem }><Icon name="plus" size={ 13 } />{ t('key_add_custom_refund_item') }</button>
                            ) }
                            { overCap && <div className="rf-note danger">{ t('key_refund_exceeds_balance') } { formatHK(refundable) }.</div> }
                            { totalRefund === 0 && <div className="rf-note subtle">{ t('key_refund_must_be_greater') }</div> }
                        </div>
                    ) }

                    {/* ── Step: Refund Method ────────────────────────────── */ }
                    { step === 'method' && (
                        <div>
                            <p className="rf-p">
                                { t('key_original_payment_method') }: <strong>{ originLabel }</strong> · { tier1Origin ? t('key_tier_1') : t('key_tier_2') }.
                                { ' ' }{ tier1Origin ? t('key_refund_original_or_cheque') : t('key_tier2_cheque_only') }
                            </p>
                            <div className="rf-path-col">
                                { tier1Origin && (
                                    <button type="button" className={ 'path-card' + (method === 'original' ? ' active' : '') } onClick={ () => setMethod('original') }>
                                        <div className="pt"><span className="radio">{ method === 'original' && <Icon name="check" size={ 9 } /> }</span>{ t('key_refund_through_original_channel') }</div>
                                        <div className="pd">{ viaCardNetwork ? t('key_refund_via_card_network_not_apple_pay') : t('key_returns_to_original_channel') }</div>
                                    </button>
                                ) }
                                <button type="button" className={ 'path-card' + (method === 'cheque' ? ' active' : '') } onClick={ () => setMethod('cheque') }>
                                    <div className="pt"><span className="radio">{ method === 'cheque' && <Icon name="check" size={ 9 } /> }</span>{ t('key_company_cheque') }</div>
                                    <div className="pd">{ t('key_issue_company_cheque_note') }</div>
                                </button>
                            </div>
                            <div className="rf-grid2" style={ { marginTop: 12 } }>
                                { method === 'cheque' && (
                                    <Field label={ t('key_cheque_payee') }><div className="input rf-locked">{ employerName }</div></Field>
                                ) }
                                <Field label={ t('key_refund_amount') } hint={ t('key_system_calculated_locked') }>
                                    <div className="input mono rf-locked" style={ { color: 'var(--st-danger)' } }><Icon name="shield" size={ 12 } style={ { color: 'var(--text-4)' } } />{ neg(totalRefund) }</div>
                                </Field>
                            </div>
                        </div>
                    ) }

                    {/* ── Step: Documentation (uploads payment_attachment on confirm) ── */ }
                    { step === 'docs' && (
                        <div>
                            <p className="rf-p">{ t('key_refund_doc_required_48h') }</p>
                            <input ref={ fileInputRef } type="file" accept={ PROOF_FILE_ACCEPT } style={ { display: 'none' } }
                                onChange={ (e) => { const f = e.target.files?.[0]; if (f) pickDocFile(f); e.target.value = ''; } } />
                            <div className="rf-choice-row">
                                <button type="button" className={ 'btn ' + (docState === 'uploaded' ? 'btn-primary' : 'btn-secondary') } onClick={ () => { setDocState('uploaded'); if (!docFile) fileInputRef.current?.click(); } }>{ t('key_upload_now') }</button>
                                <button type="button" className={ 'btn btn-secondary' + (docState === 'missing' ? ' rf-later-on' : '') } onClick={ () => setDocState('missing') }>{ t('key_upload_later') }</button>
                            </div>
                            { docState === 'uploaded' ? (
                                docFile ? (
                                    <div className="proof-pill">
                                        <span className="ico"><Icon name="filetext" size={ 14 } /></span>
                                        <div className="meta"><div className="name">{ docFile.name }</div><div className="sub">{ Math.max(1, Math.round(docFile.size / 1024)) } KB · { t('key_ready_to_upload') }</div></div>
                                        <button type="button" className="btn btn-ghost" style={ { height: 26 } } onClick={ () => setDocFile(null) }><Icon name="x" size={ 12 } />{ t('key_remove') }</button>
                                    </div>
                                ) : (
                                    <button type="button" className="rf-dropzone" onClick={ () => fileInputRef.current?.click() }>
                                        <Icon name="upload" size={ 16 } /><span>{ t('key_choose_file') }</span>
                                    </button>
                                )
                            ) : (
                                <div className="rf-note warn">{ t('key_documentation_missing_note') }</div>
                            ) }
                        </div>
                    ) }

                    {/* ── Step: Confirm ──────────────────────────────────── */ }
                    { step === 'confirm' && (
                        <div>
                            <div className="rf-summary">
                                { [
                                    [t('key_parent_invoice'), invoiceData?.invoice_number || invoiceData?.reference_id],
                                    [t('key_refund_type'), refundType === 'full' ? t('key_full_refund') : t('key_partial_refund')],
                                    [t('key_refund_total'), <span key="rt" className="mono" style={ { color: 'var(--st-danger)', fontWeight: 600 } }>{ neg(totalRefund) }</span>],
                                    [t('key_refund_method'), method === 'original' ? `${ t('key_original_channel') } · ${ originLabel }` : t('key_company_cheque')],
                                    ...(asksContract ? [[t('key_contract'), cancel ? t('key_cancelled') : t('key_retained')]] : []),
                                    [t('key_documentation'), docState === 'uploaded' && docFile ? t('key_uploaded') : t('key_due_within_48h')],
                                ].map(([k, v], i) => (
                                    <React.Fragment key={ i }>
                                        <div className="rf-sk">{ k }</div>
                                        <div className="rf-sv">{ v }</div>
                                    </React.Fragment>
                                )) }
                            </div>
                            <div className="rf-note confirm-note">{ t('key_confirm_creates_child_prefix') } <strong>{ neg(totalRefund) }</strong> { t('key_confirm_creates_child_suffix') }</div>
                            <div className="appr-impact">
                                <div className="hd">{ t('key_impact_preview') }</div>
                                <table className="impact-tbl">
                                    <thead>
                                        <tr>
                                            <th>{ t('key_field') }</th>
                                            <th>{ t('key_before') }</th>
                                            <th className="arw">→</th>
                                            <th>{ t('key_after') }</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>{ t('key_refunded') }</td>
                                            <td className="b">{ formatHK(refundedBefore) }</td>
                                            <td className="arw">→</td>
                                            <td className="a">{ formatHK(refundedBefore + totalRefund) }</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <p className="note">{ t('key_balance_due_footnote') }</p>
                            </div>
                        </div>
                    ) }
                </div>

                <div className="foot">
                    { step === 'confirm' ? (
                        <>
                            <button type="button" className="btn btn-ghost md" onClick={ () => go(-1) } disabled={ loading }><Icon name="chev_left" size={ 13 } />{ t('key_back') }</button>
                            <button type="button" className="btn btn-primary md" onClick={ handleConfirm } disabled={ loading }>
                                <Icon name="check" size={ 13 } />{ loading ? `${ t('key_processing') }…` : `${ t('key_confirm_refund') } · ${ neg(totalRefund) }` }
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" className="btn btn-ghost md" onClick={ stepIdx === 0 ? onClose : () => go(-1) }>
                                { stepIdx === 0 ? t('key_cancel') : <><Icon name="chev_left" size={ 13 } />{ t('key_back') }</> }
                            </button>
                            <button type="button" className="btn btn-primary md" disabled={ !canNext } onClick={ () => go(1) }>
                                { t('key_next') }<Icon name="chev_right" size={ 13 } />
                            </button>
                        </>
                    ) }
                </div>
            </div>
        </div>
    );
};

RefundModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    invoiceData: PropTypes.object,
    isContract: PropTypes.bool,
    onSuccess: PropTypes.func,
};

RefundModal.defaultProps = {
    invoiceData: null,
    isContract: false,
    onSuccess: null,
};

export default RefundModal;
