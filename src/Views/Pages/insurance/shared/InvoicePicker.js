import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import Btn from "../../../../components/ui/Btn";
import { Field, TextArea } from "../../../../components/ui/FormControls";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import listStyles from "../../Invoice/InvoiceList.module.css";
import { fetchEligibleInsuranceInvoices } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { fmtDateLong, translation } from "../dashboard/insuranceDashboardConfig";
import {
    invoiceNoteText, invoiceStatusText, invoiceStatusTone, invoiceTypeLabel, reasonsText,
} from "./insuranceFormsConfig";
import styles from "./InsuranceForms.module.css";

const SEARCH_DEBOUNCE_MS = 250;
/* the override reason is checked by the server with the list: it is sent once typing pauses, or when the box loses focus */
const REASON_DEBOUNCE_MS = 400;

/* Invoice picker (forms.invoicePicker, R6): a titled box with eligible invoices by default, ineligible on request, concise
   feedback for a searched invoice. Only invoices the Invoice permission family discloses are listed. */
const InvoicePicker = ({ purpose, title, employerId, workerId, selectedId, overrideReason, onChange, error }) => {
    const dispatch = useDispatch();
    const [q, setQ] = useState("");
    const [query, setQuery] = useState("");
    const [showAll, setShowAll] = useState(false);
    const [data, setData] = useState({ invoices: [], ineligibleCount: 0, searchable: false, available: false });
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState("");
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const reasonRef = useRef(overrideReason || "");
    const [reason, setReason] = useState(overrideReason || "");
    const [reasonSent, setReasonSent] = useState((overrideReason || "").trim());

    useEffect(() => {
        const timer = setTimeout(() => setQuery(q.trim()), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [q]);

    useEffect(() => {
        const timer = setTimeout(() => setReasonSent(reason.trim()), REASON_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [reason]);

    useEffect(() => {
        const payload = { purpose, showIneligible: showAll };
        if (query) payload.q = query;
        if (selectedId) payload.selectedId = selectedId;
        if (employerId) payload.employerId = employerId;
        if (workerId) payload.workerId = workerId;
        if (reasonSent) payload.invoiceOverrideReason = reasonSent;
        let alive = true;
        setLoading(true);
        setFailed(false);
        dispatch(fetchEligibleInsuranceInvoices(payload)).then((res) => {
            if (!alive) return;
            setLoading(false);
            /* a list that could not be read says so, with Retry, never "No invoice is available to you" (UI verification X08) */
            if (res.error) setFailed(true);
            else setData(res.payload);
        });
        return () => { alive = false; };
    }, [dispatch, purpose, query, showAll, selectedId, employerId, workerId, reasonSent, attempt]);

    const selected = data.invoices.find((inv) => inv.id === selectedId) || null;
    const overrideShown = Boolean(selected && (selected.overridable || selected.overrideApplied));

    /* the picked row is re-checked with every list refresh (e.g. once an override reason is entered): hand the
       current facts back so the form's own check never runs on a stale row */
    const sentRow = useRef(null);
    useEffect(() => {
        if (!selected || selected === sentRow.current || loading) return;
        sentRow.current = selected;
        onChange({ invoiceId: selected.id, invoiceOverrideReason: reasonRef.current || null, invoice: selected });
    }, [selected, loading, onChange]);

    /* a search with no usable match names its only match and why it cannot be used (the server sends it whether or not
       ineligible invoices are shown), else counts them (UI verification X07) */
    useEffect(() => {
        if (!query) { setFeedback(""); return; }
        const eligible = data.invoices.filter((inv) => inv.eligible || inv.overridable || inv.id === selectedId);
        if (eligible.length || !data.ineligibleCount) { setFeedback(""); return; }
        const one = data.ineligibleMatch;
        setFeedback(one
            ? translation("key_ins_invoice_cannot_be_used", { ref: one.ref, reasons: reasonsText(one.reasons) })
            : translation("key_ins_invoices_cannot_be_used", { n: data.ineligibleCount }));
    }, [data, query, selectedId]);

    const pick = useCallback((inv) => {
        if (!inv.eligible && !inv.overridable) {
            setFeedback(translation("key_ins_invoice_cannot_be_used", { ref: inv.ref, reasons: reasonsText(inv.reasons) }));
            return;
        }
        setFeedback("");
        onChange({ invoiceId: inv.id, invoiceOverrideReason: inv.overridable || inv.overrideApplied ? reasonRef.current || null : null, invoice: inv });
    }, [onChange]);

    const onReason = useCallback((event) => {
        reasonRef.current = event.target.value;
        setReason(event.target.value);
        if (selected) onChange({ invoiceId: selected.id, invoiceOverrideReason: event.target.value || null, invoice: selected });
    }, [onChange, selected]);
    const onReasonBlur = useCallback(() => setReasonSent(reasonRef.current.trim()), []);

    const onKey = useCallback((event, inv) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); pick(inv); }
    }, [pick]);

    const empty = !data.available
        ? translation("key_ins_no_invoice_available_to_you")
        : query ? translation("key_ins_no_eligible_invoice_matches") : translation("key_ins_no_eligible_invoice");

    return (
        <div className={styles.pickerSet} data-field="invoiceId">
            {title && <div className={styles.fsTitle}>{title}</div>}
            <div className={styles.pickerHead}>
                <input
                    type="search"
                    className={styles.search}
                    value={q}
                    maxLength={100}
                    onChange={(event) => setQ(event.target.value)}
                    disabled={!data.searchable}
                    aria-disabled={!data.searchable}
                    aria-label={translation("key_ins_search_invoices")}
                    placeholder={translation(data.searchable ? "key_ins_invoice_search_placeholder" : "key_ins_invoice_search_unavailable")}
                />
                {data.ineligibleCount > 0 && (
                    <Btn variant="ghost" type="button" onClick={() => setShowAll((v) => !v)}>
                        {translation(showAll ? "key_ins_hide_ineligible" : "key_ins_show_ineligible", { n: data.ineligibleCount })}
                    </Btn>
                )}
            </div>
            {feedback && <div className={styles.hint} role="status">{feedback}</div>}
            {failed ? (
                <div className={styles.loadError} role="alert">
                    <span>{translation("key_couldnt_load_this_view")}</span>
                    <Btn variant="secondary" type="button" onClick={() => setAttempt((n) => n + 1)}>{translation("key_retry")}</Btn>
                </div>
            ) : (
                <div className={styles.picklist} role="listbox" aria-label={translation("key_ins_invoices_aria")} aria-busy={loading}>
                    {data.invoices.map((inv) => {
                        const on = inv.id === selectedId;
                        const notes = inv.notes.map(invoiceNoteText).filter(Boolean);
                        const parties = `${inv.parties.employer || "—"} / ${inv.parties.worker || "—"}`;
                        return (
                            <div
                                key={inv.id}
                                role="option"
                                aria-selected={on}
                                tabIndex={0}
                                className={`${styles.prow} ${on ? styles.prowOn : ""} ${!inv.eligible && !inv.overridable ? styles.prowIneligible : ""}`}
                                onClick={() => pick(inv)}
                                onKeyDown={(event) => onKey(event, inv)}
                            >
                                <input type="radio" checked={on} disabled={!inv.eligible} readOnly tabIndex={-1} aria-label={inv.ref} />
                                <div className={styles.prowMain}>
                                    <div className={styles.l1}>
                                        <span className={styles.code}>{inv.ref}</span>
                                        <span className={styles.muted}>{invoiceTypeLabel(inv.type)}</span>
                                        <span className={listStyles.statusTag} data-tone={invoiceStatusTone(inv.status)}>{invoiceStatusText(inv.status, inv.statusName)}</span>
                                        <span className={`${styles.muted} ${styles.small}`}>{fmtDateLong(inv.date)}</span>
                                    </div>
                                    <div className={styles.l2}>{[parties, inv.lines.join(", "), ...notes].filter(Boolean).join(" · ")}</div>
                                </div>
                                <div className={`${styles.why} ${inv.eligible ? (notes.length ? styles.whyWarn : styles.whyOk) : ""}`}>
                                    {inv.eligible ? translation(inv.overrideApplied ? "key_ins_with_override" : "key_ins_eligible") : reasonsText(inv.reasons)}
                                </div>
                            </div>
                        );
                    })}
                    {loading && !data.invoices.length && <CustomSpinner />}
                    {!loading && !data.invoices.length && !feedback && <div className={styles.empty}>{empty}</div>}
                </div>
            )}
            {/* Invoice Search access Restricted: the server sends at most ten and says when more exist; the listing's own two lines
                (InsuranceRecordsTable) say so here too (PROMPT 9 F-7d) */}
            {!failed && data.capped && (
                <div className={styles.hint} role="status" data-invoices="capped">
                    {`${translation("key_ins_capped_first")} ${translation("key_ins_capped_refine")}`}
                </div>
            )}
            {error && <div className={styles.err} role="alert">{error}</div>}
            {overrideShown && (
                <Field label={translation("key_ins_override_reason")} required htmlFor="ins-invoice-override">
                    <TextArea id="ins-invoice-override" maxLength={500} rows={2} value={reason} onChange={onReason} onBlur={onReasonBlur} />
                </Field>
            )}
        </div>
    );
};

InvoicePicker.propTypes = {
    purpose: PropTypes.oneOf(["new", "renew", "coverage", "charge", "edit"]).isRequired,
    title: PropTypes.string,
    employerId: PropTypes.number,
    workerId: PropTypes.number,
    selectedId: PropTypes.number,
    overrideReason: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    error: PropTypes.string,
};

export default React.memo(InvoicePicker);
