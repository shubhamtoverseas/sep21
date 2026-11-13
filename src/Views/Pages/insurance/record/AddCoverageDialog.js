import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import { Field, FormGrid, SelectBox } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { addInsuranceCoverage, fetchInsuranceMeta } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { fmtDateLong, translation } from "../dashboard/insuranceDashboardConfig";
import { mustReload, newSubmissionKey, reasonsText, refusalOf, refusalText, requiredErrors } from "../shared/insuranceFormsConfig";
import InvoicePicker from "../shared/InvoicePicker";
import useKeptDraft from "../shared/useKeptDraft";
import styles from "../shared/InsuranceForms.module.css";
import { actionLabel } from "./insuranceRecordConfig";

/* the fields this dialog shows: a server error for any other field is listed in the toast */
const RENDERED = ["coverageItemId", "requestedEffective", "invoiceId"];

/* D2 · Add coverage (forms.openCoverage, M3). An Additional coverage request on the period in force; the
   QBE result adds a coverage item to that period. Captures the record version when it opens. */
const AddCoverageDialog = ({ record, onClose, onDone }) => {
    const dispatch = useDispatch();
    const meta = useSelector((state) => state.insurance.meta);
    const period = record.summary?.period;
    const opened = useRef({ factsVersion: record.factsVersion, submissionKey: newSubmissionKey() });
    const [coverageItemId, setCoverageItemId] = useState("");
    const [requestedEffective, setRequestedEffective] = useState(meta?.today || "");
    const [invoice, setInvoice] = useState({ invoiceId: null, invoiceOverrideReason: null });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const kept = useKeptDraft(onClose, onDone);

    useEffect(() => { if (!meta) dispatch(fetchInsuranceMeta()); }, [dispatch, meta]);
    /* the requested date defaults to today (Hong Kong coverage clock) once the meta arrives */
    useEffect(() => { if (meta?.today) setRequestedEffective((v) => v || meta.today); }, [meta]);

    const clear = useCallback((field) => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev)), []);

    const onInvoice = useCallback(({ invoiceId, invoiceOverrideReason, invoice: row }) => {
        setInvoice({ invoiceId, invoiceOverrideReason, row: row || null });
        clear("invoiceId");
    }, [clear]);

    const submit = useCallback(() => {
        if (busy) return;
        // required fields first (same rules and copy as the server guard); nothing is sent while one is missing
        const missing = requiredErrors([
            ["coverageItemId", !coverageItemId, "key_ins_err_select_the_coverage"],
            ["requestedEffective", !requestedEffective, "key_ins_err_requested_effective"],
            ["invoiceId", !invoice.invoiceId, "key_ins_err_select_invoice"],
            ["invoiceId", !!invoice.row && !invoice.row.eligible, "key_ins_invoice_cannot_be_used", { ref: invoice.row?.ref, reasons: reasonsText(invoice.row?.reasons) }],
        ]);
        if (Object.keys(missing).length) { setErrors(missing); return; }
        setBusy(true);
        kept.reset();
        const payload = {
            ref: record.ref,
            ...opened.current,
            coverageItemId: coverageItemId ? Number(coverageItemId) : null,
            requestedEffective: requestedEffective || null,
            invoiceId: invoice.invoiceId || null,
        };
        if (invoice.invoiceOverrideReason) payload.invoiceOverrideReason = invoice.invoiceOverrideReason;
        dispatch(addInsuranceCoverage(payload)).then((res) => {
            setBusy(false);
            if (!res.error) {
                ShowToast("success", res.payload?.message || translation("key_ins_coverage_requested"));
                onDone();
                onClose();
                return;
            }
            const r = refusalOf(res);
            if (mustReload(res)) { ShowToast("error", r.message); onClose(); onDone(); return; }
            if (kept.keep(res)) return;
            setErrors(r.errors);
            ShowToast("error", refusalText(r, RENDERED));
        });
    }, [busy, coverageItemId, dispatch, invoice, kept, onClose, onDone, record.ref, requestedEffective]);

    return (
        <Modal
            busy={busy}
            title={actionLabel("addCoverage")}
            subtitle={translation("key_ins_add_coverage_sub", {
                ref: record.ref,
                from: fmtDateLong(period?.effective) || "—",
                to: fmtDateLong(period?.expiry) || "—",
            })}
            width={860}
            onClose={kept.close}
            footer={(
                <>
                    <span className={styles.spacer} />
                    <Btn variant="secondary" onClick={kept.close}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? translation("key_saving") : translation("key_ins_submit_coverage_request")}</Btn>
                </>
            )}
        >
            <div className={styles.form}>
                {kept.note}
                <FormGrid columns={2}>
                    <Field label={translation("key_ins_coverage_item")} required htmlFor="ins-cov-item" error={errors.coverageItemId}>
                        <SelectBox id="ins-cov-item" value={coverageItemId} invalid={!!errors.coverageItemId} onChange={(e) => { setCoverageItemId(e.target.value); clear("coverageItemId"); }}>
                            <option value="">{translation("key_ins_select_coverage")}</option>
                            {(meta?.coverageItems || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </SelectBox>
                    </Field>
                    <Field label={translation("key_ins_requested_effective_date")} required htmlFor="ins-cov-date" hint={translation("key_ins_issued_dates_hint")} error={errors.requestedEffective}>
                        <DateInput id="ins-cov-date" value={requestedEffective} invalid={!!errors.requestedEffective} onChange={(v) => { setRequestedEffective(v); clear("requestedEffective"); }} />
                    </Field>
                </FormGrid>
                <InvoicePicker
                    purpose="coverage"
                    title={translation("key_ins_coverage_invoice")}
                    employerId={record.parties?.employer?.id || undefined}
                    workerId={record.parties?.worker?.id || undefined}
                    selectedId={invoice.invoiceId || undefined}
                    overrideReason={invoice.invoiceOverrideReason || ""}
                    error={errors.invoiceId}
                    onChange={onInvoice}
                />
            </div>
        </Modal>
    );
};

AddCoverageDialog.propTypes = {
    record: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default AddCoverageDialog;
