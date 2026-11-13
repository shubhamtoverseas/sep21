import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import DatePicker from "react-datepicker";
import "../invoice.css";
import "../new-ui-shared.css";
import "../new-ui-review.css";
import "../new-ui-create.css";
import {
    addContractInvoice,
    clearCurrentInvoiceExchange,
    clearInvoiceContractItemsList,
    fetchReservationFee,
    loadInvoiceCancellationReasons,
    saveInvoiceExchange,
} from "../../../../redux/Slices/invoices/InvoicesSlice";
import { clearCurrentEmployer, clearInvoiceCurrentJobInfo } from "../../../../redux/Slices/employer/EmployerSlice";
import { clearWorkerDetail, fetchInterviewCounts } from "../../../../redux/Slices/worker/WorkerSlice";
import { fetchWorkerStatuses } from "../../../../redux/Slices/common/workerStatuses/WorkerStatusesSlice";
import DateInput from "../../../../components/ui/DateInput";
import { interpolate } from "../../../../i18n/interpolate";
import { CREDIT_TYPES } from "../../../../components/ReusableComponents/constants";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { appliedCreditsProblem, buildApplyCreditsPayload, useCreditRequestKey } from "../AppliedCreditsRows";
import { reservationDueTooSoon, reservationMinDate, reservationTimeAllowed } from "../reservationDueDate";
import ContractContextStrip from "./ContractContextStrip";
import InvoiceItemsTable from "./InvoiceItemsTable";
import useContractPricing from "./useContractPricing";
import { EXCHANGE, STANDALONE, hk } from "./contractSetup";
import { choicesOf, itemsInput } from "./invoiceItems";
const PaymentMethodSelector = lazy(() => import("../payment-method-selector/PaymentMethodSelector"));
const PaymentConfirmedModal = lazy(() => import("../payment-method-selector/PaymentConfirmedModal"));
const InitiateRefund = lazy(() => import("../../../../components/initiate-refund/InitiateRefund"));
const ConfirmActionModal = lazy(() => import("../general/ConfirmActionModal"));

/*
 * Contract Invoice · Invoice Review (27 Oct package, INV-C4; requirements "Items and review", "Final submission",
 * "Payment confirmation"; pack R-T1, R-P1, R-F1). The invoice Invoice items prepared — its lines and the saved credit
 * applied there (package requirements :544) — priced again by the engine and shown read-only (:546): the same lines in
 * the same table (removed lines struck through) with the applied credit after the invoice total, the financial summary
 * (Charges · Discounts · Invoice total · Credit applied · Amount due now: the engine's figures, never recomputed; the
 * credit is deducted once, :436), then Payment BELOW the table: Payment option (Full Payment, or the Reservation Fee where
 * the engine allows it), the existing payment-method component unchanged, Amount due now locked, no invoice reference
 * before creation. A credit is changed on Invoice items (Back). Submission sends the priced input and the record shown
 * (record_key): the server prices again and saves nothing unless it is the same record.
 *
 * Standalone mode (INV-G4, /invoices/general/invoice-review): the same table and summary; saved credit for an employer
 * party only (OP-27-69); Full Payment only — the Reservation Fee is not rendered at all (R-P1); no Job Offer; the
 * zero-payable path reused (OP-27-72); submission goes to the same POST /invoices/add with pricing.route "standalone"
 * (INV-G1): the party in `pricing`, the creator the CS Owner (#80), no contract fields.
 *
 * Exchange mode (INV-X4, /invoices/exchange/exchange-invoice-review; register #61, #72 – #75): the same table, then the
 * Exchange Settlement Summary in place of the financial summary — Replacement value, Exchange Credit, Balance Adjustment or
 * Shortfall, A2 total HK$0 — and no payment block (#72: an A2 never collects). A shortfall announces the Underpayment
 * invoice (collected on that child once the A2 is approved, #75); a Remaining Credit is resolved here before submission —
 * Refund Remaining Credit (the refund route of A1's payment), Write-Off or Save as Credit (#74). The original worker's
 * handling (cancellation date, reason, remarks, profile status) as before. Submission sends the priced input and the
 * record shown to POST /invoices/add-exchange (INV-X1); the server prices again and saves nothing unless it is the same
 * record. No saved credit is applied (OP-27-108).
 */
const DISPOSITIONS = [
    { id: "refund", label: "key_refund_overpayment", desc: "key_refund_remaining_credit_desc" },
    { id: "write_off", label: "key_inv_disposition_write_off", desc: "key_write_off_remaining_credit_desc" },
    { id: "save_credit", label: "key_inv_disposition_save_credit", desc: "key_save_as_credit_desc" },
];
const EMPTY_HANDLING = { cancellation_date: "", cancellation_reason: "", remarks: "", worker_status: "" };
/* the original worker's profile status after the exchange: the two the old Exchange offered.
   @migration-unspecified(invoice): the register names only the cancellation reasons (#23); the handling fields (date, reason,
   remarks, profile status) and these two statuses are retained from the old Exchange review. Confirm with product before
   release (OP-27-125). */
const HANDLING_STATUSES = ["Available", "Suspended"];

const round2 = (n) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;

const InvoiceReview = ({ mode }) => {
    const standalone = mode === STANDALONE;
    const exchangeMode = mode === EXCHANGE;
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const contractFormInfo = location.state?.contractFormInfo;
    const setupInput = location.state?.setupInput;
    const storedJobInfo = useSelector((state) => state.employer.invoiceCurrentJobInfo);
    /* a Standalone Invoice and an Exchange have no Job Offer behind them (none is taken from an earlier draft) */
    const invoiceCurrentJobInfo = standalone || exchangeMode ? null : (storedJobInfo || location.state?.invoiceCurrentJobInfo || null);
    const detailPath = standalone ? "/invoices/general/payment-type-invoice" : "/invoices/add-contract-invoice/payment-type-invoice";
    const totalInterviewCounts = useSelector((state) => state.worker.totalInterviewCounts);
    const reservationFee = useSelector((state) => state.invoices.reservationFee);
    const feeValue = Number(reservationFee?.value || 0);

    /* whose saved credit can be applied: the Contract Invoice's employer, or a Standalone employer party (a worker party has
       none, OP-27-69; an Exchange none, OP-27-108) */
    const employerId = exchangeMode || (standalone && contractFormInfo?.party_type !== "employer") ? null : contractFormInfo?.currentInvoiceEmployerDetail?.employer_id;
    /* the draft's items: the item choices and the credit, both chosen on Invoice items (read-only here) */
    const draft = useSelector((state) => state.invoices.invoiceContractItemsList);
    const stored = useMemo(() => (Array.isArray(draft) ? {} : (draft || {})), [draft]);
    const choices = useMemo(() => choicesOf(stored.choices), [stored]);
    const appliedCredits = useMemo(() => (employerId ? stored.appliedCredits || [] : []), [employerId, stored]);
    const creditRequestKey = useCreditRequestKey(stored.creditRequestKey);

    const [payType, setPayType] = useState("full");
    const [resDate, setResDate] = useState("");
    const [resTime, setResTime] = useState("");
    const [resNote, setResNote] = useState("");
    const [autoCancelInterviews, setAutoCancelInterviews] = useState(false);
    const [payStarted, setPayStarted] = useState(false);
    const [successInfo, setSuccessInfo] = useState(null);

    /* this stage needs the application Invoice items priced: without it (a direct link), start at setup (Standalone: its
       first party, Employer) */
    useEffect(() => {
        if (!setupInput && !successInfo) navigate(standalone ? "/invoices/general/add-contract-invoice/employer" : exchangeMode ? "/invoices" : "/invoices/add-contract-invoice", { replace: true });
    }, [setupInput, successInfo, navigate, standalone, exchangeMode]);
    useEffect(() => {
        // the Reservation Fee is not offered on a Standalone Invoice nor on an Exchange, so its amount is not read; an
        // Exchange reads the cancellation reasons and worker statuses of its original worker's handling
        if (exchangeMode) {
            dispatch(loadInvoiceCancellationReasons());
            dispatch(fetchWorkerStatuses());
        } else if (!standalone) dispatch(fetchReservationFee());
        if (invoiceCurrentJobInfo?.job_id) dispatch(fetchInterviewCounts({ job_id: invoiceCurrentJobInfo.job_id }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]);

    const creditProblem = appliedCreditsProblem(appliedCredits);
    /* the engine prices the credit with the invoice (:436): what each takes, never more than it has or the invoice owes */
    const pricingArgs = useMemo(() => (!setupInput ? null : exchangeMode ? itemsInput(setupInput, choices) : {
        ...itemsInput(setupInput, choices),
        employer_id: employerId ? Number(employerId) : null,
        credits: creditProblem ? [] : appliedCredits.map((c) => ({ id: Number(c.id), amount: round2(c.amount) })),
    }), [setupInput, exchangeMode, choices, employerId, appliedCredits, creditProblem]);
    const pricing = useContractPricing(successInfo ? null : pricingArgs);
    const result = pricing.status === "ready" ? pricing.result : null;
    const summary = result?.ok ? result.summary : null;

    /* R-P1: the Reservation Fee only where the engine allows it; otherwise shown disabled with its reason */
    const rfAllowed = Boolean(result?.reservationFee?.allowed);
    useEffect(() => { if (!rfAllowed && payType === "reservation_fee") setPayType("full"); }, [rfAllowed, payType]);
    const reservation = payType === "reservation_fee";

    const creditRows = useMemo(() => (result?.credits || []).map((c, i) => {
        const applied = appliedCredits[i];
        const meta = CREDIT_TYPES[applied?.credit_type] || {};
        // the row reads as the frozen record does ("Credit · <type>"); the "settles this invoice" note keeps the type's name
        return { key: `${ applied?.credit_type }:${ applied?.id }`, itemType: `${ t("key_credit") } · ${ t(meta.badgeLabel) }`, typeName: t(meta.itemTypeLabel), description: `${ t("key_inv_from") } ${ c.source }`, applied: c.applied };
    }).filter((c) => c.applied > 0), [result, appliedCredits, t]);

    /* what the existing payment-method component submits: the priced input and the record shown, the payment path and
       the credit; the line rows and totals are built on the server. A Standalone Invoice names its party in `pricing` and
       has no contract fields; its CS Owner is the creator, set on the server (#80) */
    const invoiceData = useMemo(() => {
        if (!summary) return null;
        const due = resDate && resTime && !reservationDueTooSoon(resDate, resTime) ? `${ resDate } ${ resTime }:00` : "";
        return {
            ...(standalone ? {} : {
                employer_id: employerId,
                worker_id: contractFormInfo?.currentInvoiceWorkerDetail?.id,
                contract_type: contractFormInfo?.contract_type_internal,
                staff_id: contractFormInfo?.csId,
                is_auto_cancel_interviews: autoCancelInterviews,
            }),
            invoices_date: contractFormInfo?.invoice_date,
            branch_id: contractFormInfo?.branchId,
            branch_name: contractFormInfo?.branch_name,
            cs_name: contractFormInfo?.cs_name,
            total_amount: summary.charges,
            total_discount: summary.discounts,
            final_amount: summary.invoiceTotal,
            payment_type: payType,
            paid_amount: reservation ? feeValue : summary.invoiceTotal,
            remaining_balance: reservation ? round2(summary.invoiceTotal - feeValue) : 0,
            ...(reservation ? { due_date: due, follow_up_note: resNote } : {}),
            card_type: "", card_number: "", bank_name: "", bank_in_reference: "", cheque_number: "", time_code: "", payment_method: "credit_card",
            apply_credits: buildApplyCreditsPayload(appliedCredits),
            ...(appliedCredits.length ? { credit_request_key: creditRequestKey } : {}),
            pricing: itemsInput(setupInput, choices),
            record_key: result.record_key,
        };
    }, [summary, standalone, employerId, contractFormInfo, payType, reservation, feeValue, resDate, resTime, resNote, appliedCredits, creditRequestKey,
        autoCancelInterviews, setupInput, choices, result]);

    /* a refused submission (prices changed, a credit no longer usable, a rule broken at commit) shows the record as it is
       now: the engine is asked again, and staff review it before submitting again */
    const { retry } = pricing;
    const submitAction = useCallback((payload) => async (innerDispatch) => {
        const res = await innerDispatch(addContractInvoice(payload));
        // the record as it is now: this one read goes past the snapshot cache, as the submission's did (QA-27 ruling 9)
        if (res?.meta?.requestStatus === "rejected") retry({ fresh: true });
        return res;
    }, [retry]);

    const handleSuccess = useCallback((invoiceId, res) => {
        const inv = res?.payload?.data?.invoice || {};
        setSuccessInfo({ invoiceId: inv.id ?? invoiceId, invoiceNumber: inv.invoice_number, status: inv.status, paymentType: inv.payment_type || payType, methodValue: inv.payment_method });
        dispatch(clearInvoiceContractItemsList());
        dispatch(clearCurrentEmployer());
        dispatch(clearWorkerDetail());
        dispatch(clearInvoiceCurrentJobInfo());
    }, [dispatch, payType]);

    const goBack = useCallback(() => window.history.back(), []);

    /* Exchange (INV-X4): the engine's settlement, the original worker's handling and the Remaining Credit's disposition */
    const settlement = exchangeMode && result?.ok ? result.settlement : null;
    const a1 = contractFormInfo?.currentInvoiceExchange || null;
    const remainingCredit = Number(settlement?.remainingCredit || 0);
    const shortfall = Number(settlement?.shortfall || 0);
    const [handling, setHandling] = useState(EMPTY_HANDLING);
    const [disposition, setDisposition] = useState("");
    const [confirming, setConfirming] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const cancellationReasons = useSelector((state) => state.invoices.invoiceCacellationReason);
    const allWorkerStatuses = useSelector((state) => state.workerStatuses?.allWorkerStatuses);
    const handlingStatuses = useMemo(() => (allWorkerStatuses || []).filter((s) => HANDLING_STATUSES.includes(s.name)), [allWorkerStatuses]);
    const handlingValid = Boolean(handling.cancellation_date && handling.cancellation_reason && handling.remarks.trim() && handling.worker_status !== "");
    const exchangeBody = useMemo(() => (settlement ? {
        invoice_id: Number(a1?.id),
        pricing: itemsInput(setupInput, choices),
        record_key: result.record_key,
        staff_id: Number(contractFormInfo?.csId),
        cancellation_date: handling.cancellation_date,
        cancellation_reason: handling.cancellation_reason,
        remarks: handling.remarks,
        ...(handling.worker_status !== "" ? { worker_status: Number(handling.worker_status) } : {}),
        ...(remainingCredit > 0 && disposition ? { remaining_credit: disposition } : {}),
    } : null), [settlement, a1, setupInput, choices, result, contractFormInfo, handling, remainingCredit, disposition]);
    /* a refused submission (prices changed, A1 or the worker refused at commit) reads the record again past the cache */
    const submitExchange = useCallback((payload) => async (innerDispatch) => {
        const res = await innerDispatch(saveInvoiceExchange(payload));
        if (res?.meta?.requestStatus === "rejected") retry({ fresh: true });
        return res;
    }, [retry]);
    /* created: the A2 opens on its detail (Exchange Unapproved); a refusal keeps the review with the server's words */
    const exchangeDone = useCallback((res) => {
        const id = res?.payload?.data?.invoice?.id;
        if (res?.meta?.requestStatus === "rejected" || !id) {
            const data = res?.payload?.data;
            ShowToast("error", [data?.message, data?.error, data?.data].find((m) => typeof m === "string" && m.trim()) || t("key_something_went_wrong"));
            return;
        }
        ShowToast("success", res?.payload?.message);
        dispatch(clearInvoiceContractItemsList());
        dispatch(clearCurrentEmployer());
        dispatch(clearWorkerDetail());
        dispatch(clearCurrentInvoiceExchange());
        navigate(`/invoices/add-contract-invoice/exchange-payment-review/${ id }`, { replace: true });
    }, [dispatch, navigate, t]);
    const confirmExchange = useCallback(() => {
        if (!exchangeBody || !handlingValid || submitting) return;
        setSubmitting(true);
        dispatch(submitExchange(exchangeBody)).then((res) => { setSubmitting(false); setConfirming(false); exchangeDone(res); });
    }, [exchangeBody, handlingValid, submitting, dispatch, submitExchange, exchangeDone]);
    const onHandling = useCallback((name, value) => setHandling((prev) => ({ ...prev, [name]: value })), []);

    const amountDue = reservation ? feeValue : summary?.amountDue;
    /* R-P2 (OP-27-54, decided 29 Oct 2026): Amount due now = 0 (zero charges, full discounts or saved credit) collects
       nothing. No payment option or method: the package's "No payment required" note (with the credit that settles it, when
       one does) and "Create invoice — no payment required". The server prices again and saves it Paid with zero collected;
       there is no Payment confirmation step, so a created invoice opens on its detail. */
    const noPaymentRequired = !exchangeMode && Boolean(summary) && Number(summary.amountDue) === 0;
    const settlingCredit = noPaymentRequired && creditRows.length ? creditRows[0] : null;
    const settlingSource = settlingCredit ? (result?.credits || []).find((c) => c.applied > 0)?.source : null;
    const [creating, setCreating] = useState(false);
    const createWithoutPayment = useCallback(() => {
        if (!invoiceData || creating) return;
        // eslint-disable-next-line no-unused-vars
        const { payment_method, card_type, card_number, bank_name, bank_in_reference, cheque_number, time_code, ...rest } = invoiceData;
        const jobId = invoiceCurrentJobInfo?.job_id;
        const payload = {
            ...rest, payment_type: "full", paid_amount: 0, remaining_balance: 0, invoice_items: [], itemData: [],
            ...(standalone ? {} : { cancel_pending_upcoming_interviews: jobId && invoiceData.is_auto_cancel_interviews ? 1 : 0, ...(jobId ? { job_id: jobId } : {}) }),
        };
        setCreating(true);
        dispatch(submitAction(payload)).then((res) => {
            setCreating(false);
            const status = res?.payload?.status;
            const invoiceId = res?.payload?.data?.invoice?.id;
            if (res?.meta?.requestStatus === "rejected" || status === 400 || (status === undefined && !res?.payload?.data?.status) || !invoiceId) {
                const data = res?.payload?.data;
                ShowToast("error", [data?.error, data?.message, data?.data].find((m) => typeof m === "string" && m.trim()));
                return;
            }
            ShowToast("success", res?.payload?.message);
            dispatch(clearInvoiceContractItemsList());
            dispatch(clearCurrentEmployer());
            dispatch(clearWorkerDetail());
            dispatch(clearInvoiceCurrentJobInfo());
            navigate(`${ detailPath }/${ invoiceId }`, { replace: true });
        });
    }, [invoiceData, creating, standalone, invoiceCurrentJobInfo, dispatch, submitAction, navigate, detailPath]);

    return (
        <>
            <div className="invd review-page review-stage">
                <div className="review-breadcrumb">
                    <span className="step done">{ t(standalone ? "key_invoice_setup" : "key_contract_setup") }</span>
                    <span className="sep">›</span>
                    <span className="step done">{ t("key_pricing_items") }</span>
                    <span className="sep">›</span>
                    <span className={ "step " + (payStarted ? "done" : "here") }>{ t(exchangeMode ? "key_inv_exchange_settlement_review" : "key_invoice_review") }</span>
                    { !noPaymentRequired && !exchangeMode && <>
                        <span className="sep">›</span>
                        <span className={ "step" + (payStarted ? " here" : "") }>{ t("key_payment_confirmation") }</span>
                    </> }
                </div>
                <div className="review-head">
                    <div className="left">
                        <button type="button" className="btn-icon outlined" onClick={ goBack } aria-label={ t("key_back") }><i className="ri-arrow-left-s-line" /></button>
                        <h1>{ t(standalone ? "key_add_general_invoice" : exchangeMode ? "key_exchange_contract_invoice" : "key_add_contract_invoice") }</h1>
                        <span className="badge info">{ `${ t("key_step") } 3 ${ t("key_of") } 3` }</span>
                        { exchangeMode && <span className="hdr-context" data-context>{ interpolate(t("key_inv_exchange_of"), a1?.invoice_number || "") }</span> }
                    </div>
                    <div className="meta">
                        <div className="item"><div className="k">{ t("key_inv_invoice_reference") }</div><div className="v" data-reference>{ t("key_inv_not_issued_yet") }</div></div>
                    </div>
                </div>

                <ContractContextStrip contractFormInfo={ contractFormInfo } predecessor={ result?.predecessor } standalone={ standalone } />

                { pricing.status === "error" && (
                    <div className="callout danger" role="alert">
                        <span className="ico"><i className="ri-error-warning-line" /></span>
                        <span>{ pricing.error || t("key_inv_pricing_not_read") }</span>
                        <button type="button" className="btn btn-secondary sm svc-retry" onClick={ pricing.retry }>{ t("key_retry") }</button>
                        {/* a credit the server no longer takes is changed on Invoice items (:546: Review is read-only) */}
                        { appliedCredits.length > 0 && <button type="button" className="btn btn-secondary sm svc-retry" onClick={ goBack }>{ t("key_inv_back_to_items") }</button> }
                    </div>
                ) }
                { creditProblem && (
                    <div className="callout danger" role="alert" data-credit-problem>
                        <span className="ico"><i className="ri-error-warning-line" /></span>
                        <span>{ t(creditProblem) }</span>
                        <button type="button" className="btn btn-secondary sm svc-retry" onClick={ goBack }>{ t("key_inv_back_to_items") }</button>
                    </div>
                ) }
                { result && !result.ok && (
                    <div className="callout danger" role="alert">
                        <span className="ico"><i className="ri-error-warning-line" /></span>
                        <span>
                            <b>{ t("key_inv_cannot_create_yet") }</b>
                            { result.problems.map((p, i) => <span key={ i } className="svc-problem">{ p.text }</span>) }
                            <span className="svc-problem"><button type="button" className="btn btn-secondary sm" onClick={ goBack }>{ t("key_inv_back_to_items") }</button></span>
                        </span>
                    </div>
                ) }

                <section className="review-card items-card">
                    <div className="sec-head">
                        <h3>{ t("key_invoice_items") }</h3>
                        { pricing.status === "loading" && <CustomSpinner /> }
                    </div>
                    <InvoiceItemsTable result={ pricing.result } mode="ro" credits={ creditRows } />
                </section>

                {/* #61: an exchange invoice's summary is the Exchange Settlement Summary; the A2 total is always HK$0 (#72) */}
                { settlement && (
                    <section className="review-card" data-settlement-summary>
                        <div className="sec-head"><h3>{ t("key_exchange_settlement_summary") }</h3></div>
                        <div className="fin-summary">
                            <div className="fs-box"><span className="k">{ t("key_inv_replacement_value") }</span><span className="v">{ hk(settlement.replacementValue) }</span></div>
                            <div className="fs-box"><span className="k">{ t("key_exchange_credit") }</span><span className="v">−{ hk(settlement.exchangeCredit) }</span></div>
                            { shortfall > 0
                                ? <div className="fs-box"><span className="k">{ t("key_inv_shortfall") }</span><span className="v">{ hk(shortfall) }</span></div>
                                : <div className="fs-box"><span className="k">{ t("key_inv_balance_adjustment") }</span><span className="v">{ hk(remainingCredit) }</span></div> }
                            <div className="fs-box due"><span className="k">{ t("key_inv_a2_total") }</span><span className="v" data-a2-total>{ hk(0) }</span></div>
                        </div>
                        { shortfall > 0 && (
                            <div className="callout info" role="note" data-underpayment>
                                <span className="ico"><i className="ri-information-line" /></span>
                                <span>{ interpolate(t("key_inv_underpayment_announce"), hk(shortfall)) }</span>
                            </div>
                        ) }
                    </section>
                ) }
                { settlement && (
                    <section className="review-card" data-worker-handling>
                        <div className="sec-head"><h3>{ t("key_original_worker_handling") }</h3><span className="helper">{ t("key_original_worker_cancelled_note") } { a1?.worker_name }</span></div>
                        <div className="ne-grid px-4">
                            <div className="field">
                                <label>{ t("key_cancellation_date") }<span className="req-star">*</span></label>
                                <DateInput name="cancellation_date" value={ handling.cancellation_date } onChange={ (v) => onHandling("cancellation_date", v) } />
                            </div>
                            <div className="field">
                                <label htmlFor="cancellation_reason">{ t("key_reason_for_cancellation") }<span className="req-star">*</span></label>
                                <div className="select"><select id="cancellation_reason" className="input md" name="cancellation_reason" value={ handling.cancellation_reason } onChange={ (e) => onHandling("cancellation_reason", e.target.value) }>
                                    <option value="">{ t("key_please_select") }</option>
                                    { (cancellationReasons || []).map((r) => <option key={ r.id } value={ r.id }>{ r.name }</option>) }
                                </select></div>
                            </div>
                            <div className="field span2">
                                <label htmlFor="handling_remarks">{ t("key_remarks") }<span className="req-star">*</span></label>
                                <textarea id="handling_remarks" className="input" rows={ 3 } name="remarks" value={ handling.remarks } onChange={ (e) => onHandling("remarks", e.target.value) } />
                            </div>
                            <div className="field">
                                <label htmlFor="worker_status">{ t("key_worker_profile_status") }<span className="req-star">*</span></label>
                                <div className="select"><select id="worker_status" className="input md" name="worker_status" value={ handling.worker_status } onChange={ (e) => onHandling("worker_status", e.target.value) }>
                                    <option value="">{ t("key_please_select") }</option>
                                    { handlingStatuses.map((s) => <option key={ s.id } value={ s.id }>{ s.name }</option>) }
                                </select></div>
                            </div>
                        </div>
                        <div className="callout warn" role="note"><span className="ico"><i className="ri-shield-line" /></span><span>{ t("key_insurance_review_triggered_note") }</span></div>
                    </section>
                ) }
                {/* #74: a Remaining Credit is resolved before the exchange is created; there is no pending disposition */}
                { settlement && remainingCredit > 0 && (
                    <section className="review-card" data-disposition>
                        <div className="sec-head"><h3>{ t("key_remaining_credit") } · { hk(remainingCredit) }</h3></div>
                        <p className="sec-help">{ t("key_resolve_remaining_credit_instruction") }</p>
                        <div className="path-seg px-4">
                            { DISPOSITIONS.map((d) => (
                                <button key={ d.id } type="button" className={ "path-card " + (disposition === d.id ? "active" : "") } aria-pressed={ disposition === d.id } onClick={ () => setDisposition(d.id) }>
                                    <div className="pt">{ t(d.label) }</div>
                                    <div className="pd">{ t(d.desc) }</div>
                                </button>
                            )) }
                        </div>
                        { disposition === "refund" && (handlingValid ? (
                            <div className="pms-host">
                                <Suspense fallback={ <CustomSpinner /> }>
                                    <InitiateRefund
                                        invoiceData={ { ...exchangeBody, final_amount: remainingCredit, invoices_date: a1?.invoices_date } }
                                        selectionType="overpayment_refund"
                                        submitAction={ submitExchange }
                                        onSuccess={ (id, res) => exchangeDone(res) }
                                        contractFormInfo={ contractFormInfo }
                                        handleCancelSelection={ () => setDisposition("") }
                                    />
                                </Suspense>
                            </div>
                        ) : (
                            <div className="callout warn" role="note" data-handling-first><span className="ico"><i className="ri-information-line" /></span><span>{ t("key_inv_complete_worker_handling_first") }</span></div>
                        )) }
                    </section>
                ) }
                { settlement && (remainingCredit === 0 || (disposition && disposition !== "refund")) && (
                    <div className="review-foot exchange-submit">
                        { !handlingValid && <span className="why">{ t("key_inv_complete_worker_handling_first") }</span> }
                        <button type="button" className="btn btn-primary md" disabled={ !handlingValid || submitting }
                            onClick={ () => (disposition ? setConfirming(true) : confirmExchange()) }>
                            <i className="ri-check-line" />{ t("key_confirm_exchange") }
                        </button>
                    </div>
                ) }
                { confirming && (
                    <Suspense fallback={ null }>
                        <ConfirmActionModal
                            title={ t(disposition === "write_off" ? "key_inv_disposition_write_off" : "key_inv_disposition_save_credit") }
                            message={ interpolate(t(disposition === "write_off" ? "key_inv_confirm_write_off_remaining" : "key_inv_confirm_save_remaining"), hk(remainingCredit)) }
                            confirmLabel={ t("key_confirm_exchange") }
                            loading={ submitting }
                            onClose={ () => setConfirming(false) }
                            onConfirm={ confirmExchange }
                        />
                    </Suspense>
                ) }

                { summary && !exchangeMode && (
                    <section className="review-card fin-summary" aria-label={ t("key_inv_financial_summary") }>
                        <div className="fs-box"><span className="k">{ t("key_inv_charges") }</span><span className="v">{ hk(summary.charges) }</span></div>
                        <div className="fs-box"><span className="k">{ t("key_inv_discounts") }</span><span className="v">{ summary.discounts ? `−${ hk(summary.discounts) }` : hk(0) }</span></div>
                        <div className="fs-box"><span className="k">{ t("key_invoice_total") }</span><span className="v">{ hk(summary.invoiceTotal) }</span></div>
                        { summary.creditApplied > 0 && <div className="fs-box"><span className="k">{ t("key_inv_credit_applied") }</span><span className="v">−{ hk(summary.creditApplied) }</span></div> }
                        <div className="fs-box due"><span className="k">{ t("key_amount_due_now") }</span><span className="v">{ hk(summary.amountDue) }</span></div>
                    </section>
                ) }

                { invoiceCurrentJobInfo?.job_id && (
                    <div className="interviews-card">
                        <label className="iv-label">
                            <input type="checkbox" checked={ autoCancelInterviews } onChange={ (e) => setAutoCancelInterviews(e.target.checked) } />
                            <span>{ t("key_cancel_all_upcoming_pending_interviews") } { invoiceCurrentJobInfo.reference_id }</span>
                        </label>
                        <span className="pill"><strong>{ t("key_pending") }:</strong> { totalInterviewCounts?.pending_count }</span>
                        <span className="pill"><strong>{ t("key_upcoming") }:</strong> { totalInterviewCounts?.upcoming_count }</span>
                    </div>
                ) }

                {/* Payment, below the table (requirements "Items and review"); Amount due now = 0: no payment (R-P2) */}
                { noPaymentRequired && (
                    <section className="review-card pay-block" data-no-payment>
                        <div className="head"><h2>{ t("key_payment") }</h2></div>
                        <div className="pay-grid">
                            <div className="nopay">
                                <span className="t">{ t("key_inv_no_payment_required") }</span>
                                { settlingCredit && settlingSource && <span className="d">{ t("key_inv_credit_settles_invoice", { type: settlingCredit.typeName, ref: settlingSource }) }</span> }
                            </div>
                            <div className="paydue">
                                <span className="fl">{ t("key_amount_due_now") }</span>
                                <span className="dueamt" data-due-now>{ hk(0) }</span>
                                <span className="duesub">{ t("key_invoice_total") } <b>{ hk(summary.invoiceTotal) }</b></span>
                            </div>
                        </div>
                        { !creditProblem && invoiceData && (
                            <div className="pay-foot">
                                <button type="button" className="btn btn-primary md" disabled={ creating } onClick={ createWithoutPayment }>
                                    <i className="ri-check-line" />{ t("key_inv_create_no_payment_required") }
                                </button>
                            </div>
                        ) }
                    </section>
                ) }
                { summary && !noPaymentRequired && !exchangeMode && (
                    <section className="review-card pay-block">
                        <div className="head">
                            <h2>{ t("key_payment") }</h2>
                            <div className="sub">{ t("key_choose_payment_path_method_payable_locked") }</div>
                        </div>
                        <div className="pay-grid">
                            <div>
                                <span className="fl">{ t("key_inv_payment_option") }</span>
                                <div className="path-seg">
                                    <button type="button" className={ "path-card " + (reservation ? "" : "active") } aria-pressed={ !reservation } onClick={ () => setPayType("full") }>
                                        <div className="pt">{ t("key_full_payment") }</div>
                                        <div className="pd">{ hk(summary.amountDue) }</div>
                                    </button>
                                    {/* a Standalone Invoice is paid in full: no Reservation Fee, not even disabled (R-P1) */}
                                    { !standalone && (
                                        <button type="button" className={ "path-card " + (reservation ? "active" : "") + (rfAllowed ? "" : " dis") } aria-pressed={ reservation } disabled={ !rfAllowed }
                                            onClick={ () => setPayType("reservation_fee") }>
                                            <div className="pt">{ t("key_reservation_fee") }</div>
                                            <div className="pd">{ rfAllowed ? `${ t("key_hold_contract_for") } ${ hk(feeValue) }; ${ t("key_balance_due_later") }` : result.reservationFee.why }</div>
                                        </button>
                                    ) }
                                </div>
                            </div>
                            <div className="paydue">
                                <span className="fl">{ t("key_amount_due_now") }</span>
                                <span className="dueamt" data-due-now>{ hk(amountDue) }</span>
                                <span className="duesub">{ t("key_invoice_total") } <b>{ hk(summary.invoiceTotal) }</b></span>
                                { reservation && <span className="duesub">{ t("key_remaining_balance") } <b>{ hk(summary.invoiceTotal - feeValue) }</b></span> }
                            </div>
                        </div>

                        { reservation && (
                            <div className="ne-grid res-grid px-4">
                                <div className="field">
                                    <label>{ t("key_date") }<span className="req-star">*</span></label>
                                    <DatePicker selected={ resDate ? new Date(`${ resDate }T00:00:00`) : null } onChange={ (d) => setResDate(d ? dayjs(d).format("YYYY-MM-DD") : "") }
                                        minDate={ reservationMinDate() } dateFormat="dd/MM/yyyy" placeholderText="dd/mm/yyyy" className="input" />
                                </div>
                                <div className="field">
                                    <label>{ t("key_time") }<span className="req-star">*</span></label>
                                    <DatePicker selected={ resTime ? new Date(`1970-01-01T${ resTime }:00`) : null } onChange={ (d) => setResTime(d ? dayjs(d).format("HH:mm") : "") }
                                        showTimeSelect showTimeSelectOnly timeIntervals={ 15 } filterTime={ (slot) => reservationTimeAllowed(resDate, slot) }
                                        timeCaption={ t("key_time") } dateFormat="HH:mm" timeFormat="HH:mm" placeholderText="--:--" className="input" />
                                </div>
                                { reservationDueTooSoon(resDate, resTime) && <div className="err span2" role="alert">{ t("key_reservation_due_min_48_hours") }</div> }
                                <div className="field span2">
                                    <label>{ t("key_follow_up_notes") }<span className="req-star">*</span></label>
                                    <textarea className="input" rows="3" value={ resNote } onChange={ (e) => setResNote(e.target.value) } />
                                </div>
                            </div>
                        ) }

                        { !creditProblem && invoiceData && (
                            <div className="pms-host">
                                <Suspense fallback={ null }>
                                    <PaymentMethodSelector
                                        invoiceData={ invoiceData }
                                        selectionType={ standalone ? STANDALONE : "contract" }
                                        submitAction={ submitAction }
                                        onSuccess={ handleSuccess }
                                        invoiceCurrentJobInfo={ invoiceCurrentJobInfo }
                                        onDetailsEntered={ setPayStarted }
                                    />
                                </Suspense>
                            </div>
                        ) }
                    </section>
                ) }

                <div className="review-foot">
                    <button type="button" className="btn btn-secondary md" onClick={ goBack }><i className="ri-arrow-left-s-line" />{ t("key_back") }</button>
                </div>
            </div>
            { successInfo && (
                <Suspense fallback={ null }>
                    <div className="invd">
                        <PaymentConfirmedModal
                            info={ successInfo }
                            typeLabel={ standalone ? t("key_standalone") : (t("key_contract") || "Contract") }
                            onClose={ () => navigate("/invoices", { replace: true }) }
                            onViewDetail={ () => navigate(successInfo.invoiceId ? `${ detailPath }/${ successInfo.invoiceId }` : "/invoices", { replace: true }) }
                        />
                    </div>
                </Suspense>
            ) }
        </>
    );
};

InvoiceReview.propTypes = {
    /** "standalone": the Standalone Invoice review and submission (INV-G4); "exchange": an Exchange's settlement review and
        submission (INV-X4) */
    mode: PropTypes.oneOf([STANDALONE, EXCHANGE]),
};

export default InvoiceReview;
