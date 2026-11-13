import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import { Field, FormGrid, SelectBox, TextArea, TextInput } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { getContracts } from "../../../../services/contracts";
import { changeInsurancePolicy, fetchInsuranceMeta } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { fmtDateLong, translation } from "../dashboard/insuranceDashboardConfig";
import { isBlank, mustReload, newSubmissionKey, refusalOf, refusalText, requiredErrors } from "../shared/insuranceFormsConfig";
import InvoicePicker from "../shared/InvoicePicker";
import useKeptDraft from "../shared/useKeptDraft";
import styles from "../shared/InsuranceForms.module.css";
import { CHARGE_OPTIONS, actionLabel, changeTypeLabel } from "./insuranceRecordConfig";

const WorkerSearchDialog = lazy(() => import("../new/WorkerSearchDialog"));

/* the fields this dialog can show: a server error for any other field is listed in the toast */
const RENDERED = ["endorsementType", "newAddress", "person", "newName", "newExpiry", "riderText", "newEffective", "newWorkerId", "newContractId",
    "chargeApplies", "invoiceId", "remarks"];

/* D3 · Change policy (forms.openEndorsement, M4). MaidMatch records the request; Confirm changes, beside the request,
   applies it. Fields follow the change type (ENUMS §J); Additional charge is always shown (a rider is always charged). The
   formal explanation is "Request details" (INS01). Worker reassignment names the replacement worker and, for holders of
   insurance_change_governing_contract only, the governing Contract (the replacement worker's Contract with this Employer). The
   server refuses a request naming one without that key (owner decision P6C-6, 11 Nov 2026); removing or setting a governing
   Contract also needs it when the change is confirmed (Insurance.txt INS01; the confirm dialog says so). */
const ChangePolicyDialog = ({ record, onClose, onDone }) => {
    const dispatch = useDispatch();
    const meta = useSelector((state) => state.insurance.meta);
    const canGovern = Boolean(meta?.caps?.changeGoverningContract);
    const period = record.summary?.period;
    const opened = useRef({ factsVersion: record.factsVersion, submissionKey: newSubmissionKey() });
    const [type, setType] = useState("");
    const [fields, setFields] = useState({});
    const [charge, setCharge] = useState("unknown");
    const [invoice, setInvoice] = useState({ invoiceId: null, invoiceOverrideReason: null });
    const [remarks, setRemarks] = useState("");
    const [worker, setWorker] = useState(null);
    const [contracts, setContracts] = useState([]);
    /* how the Contract list read ended: "refused" (the Contract module's own access said no; its message is shown) or "failed"
       (shown with Retry). Neither is ever shown as an empty list (U-0107; PROMPT 9 F-7c). */
    const [contractsRead, setContractsRead] = useState({ state: "idle", message: "" });
    const [contractsAttempt, setContractsAttempt] = useState(0);
    const [picking, setPicking] = useState(false);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const kept = useKeptDraft(onClose, onDone);

    useEffect(() => { if (!meta) dispatch(fetchInsuranceMeta()); }, [dispatch, meta]);

    const changeType = useMemo(() => (meta?.changeTypes || []).find((t) => t.id === type) || null, [meta, type]);
    const chargeValue = changeType?.invoice === "required" ? "yes" : charge;
    const invoiceShown = Boolean(changeType && (changeType.invoice === "required" || chargeValue === "yes"));

    const clear = useCallback((field) => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev)), []);
    const setField = useCallback((key, value) => { setFields((prev) => ({ ...prev, [key]: value })); clear(key); }, [clear]);

    const pickType = useCallback((value) => {
        setType(value);
        // a name correction names its person; the first choice, the worker, is selected (forms.openEndorsement)
        setFields(value === "name" ? { person: "worker" } : {});
        setWorker(null);
        setContracts([]);
        setContractsRead({ state: "idle", message: "" });
        setInvoice({ invoiceId: null, invoiceOverrideReason: null });
        clear("endorsementType");
    }, [clear]);

    /* the replacement worker's Contracts with the record's Employer (the Contract module's own list and access); read only for
       a holder, who is the only one offered the field */
    useEffect(() => {
        if (!worker?.id || !canGovern) return undefined;
        let alive = true;
        setContractsRead({ state: "loading", message: "" });
        getContracts({ worker_id: worker.id, employer_id: record.parties?.employer?.id, page: 1, limit: 50 })
            .then((res) => {
                if (!alive) return;
                setContracts(res?.data?.data?.data || []);
                setContractsRead({ state: "loaded", message: "" });
            })
            .catch((e) => {
                if (!alive) return;
                setContracts([]);
                const status = e?.response?.status;
                // the Contract module refuses its list with 401 / 403 and its own message (check.permission.middleware)
                if (status === 401 || status === 403) setContractsRead({ state: "refused", message: e?.response?.data?.message || "" });
                else setContractsRead({ state: "failed", message: "" });
            });
        return () => { alive = false; };
    }, [worker, record.parties, canGovern, contractsAttempt]);

    const submit = useCallback(() => {
        if (busy) return;
        // required fields first (same rules and copy as the server guard); nothing is sent while one is missing
        const missing = requiredErrors([
            ["endorsementType", !type, "key_ins_err_select_the_change_type"],
            ["newAddress", type === "address" && isBlank(fields.newAddress), "key_ins_err_enter_new_address"],
            ["person", type === "name" && fields.person !== "worker" && fields.person !== "employer", "key_ins_err_select_the_person"],
            ["newName", type === "name" && isBlank(fields.newName), "key_ins_err_enter_corrected_name"],
            ["newExpiry", type === "extension" && !fields.newExpiry, "key_ins_err_proposed_expiry_required"],
            ["riderText", type === "rider" && isBlank(fields.riderText), "key_ins_err_enter_rider_wording"],
            ["newEffective", type === "dates" && !fields.newEffective && !fields.newExpiry, "key_ins_err_enter_corrected_date"],
            ["newWorkerId", type === "reassign" && !fields.newWorkerId, "key_ins_err_select_replacement_worker"],
            ["invoiceId", !!type && chargeValue === "yes" && !invoice.invoiceId, "key_ins_err_select_invoice"],
            ["remarks", isBlank(remarks), "key_ins_err_remarks_required"],
        ]);
        if (Object.keys(missing).length) { setErrors(missing); return; }
        setBusy(true);
        kept.reset();
        const payload = {
            ref: record.ref,
            ...opened.current,
            changeType: type,
            fields: Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== "" && v != null)),
            chargeApplies: chargeValue,
            remarks,
        };
        if (invoiceShown && invoice.invoiceId) payload.invoiceId = invoice.invoiceId;
        if (invoiceShown && invoice.invoiceOverrideReason) payload.invoiceOverrideReason = invoice.invoiceOverrideReason;
        dispatch(changeInsurancePolicy(payload)).then((res) => {
            setBusy(false);
            if (!res.error) {
                ShowToast("success", res.payload?.message || translation("key_ins_change_requested"));
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
    }, [busy, chargeValue, dispatch, fields, invoice, invoiceShown, kept, onClose, onDone, record.ref, remarks, type]);

    const workerName = record.parties?.worker?.name || "";
    const employerName = record.parties?.employer?.name || "";

    return (
        <>
            <Modal
                busy={busy}
                title={actionLabel("change")}
                subtitle={translation("key_ins_change_policy_sub", { ref: record.ref })}
                width={860}
                onClose={kept.close}
                footer={(
                    <>
                        <span className={styles.spacer} />
                        <Btn variant="secondary" onClick={kept.close}>{translation("key_cancel")}</Btn>
                        <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? translation("key_saving") : translation("key_ins_submit_change_request")}</Btn>
                    </>
                )}
            >
                <div className={styles.form}>
                    {kept.note}
                    <Field label={translation("key_ins_change_type")} required htmlFor="ins-chg-type" error={errors.endorsementType}>
                        <SelectBox id="ins-chg-type" value={type} invalid={!!errors.endorsementType} onChange={(e) => pickType(e.target.value)}>
                            <option value="">{translation("key_ins_select_type")}</option>
                            {(meta?.changeTypes || []).map((t) => <option key={t.id} value={t.id}>{changeTypeLabel(t.id)}</option>)}
                        </SelectBox>
                    </Field>

                    {type === "address" && (
                        <>
                            <div className={styles.ro}><span className={styles.roK}>{translation("key_ins_current_address_on_policy")}</span><span className={styles.roV}>{record.parties?.addressOnPolicy || "—"}</span></div>
                            <Field label={translation("key_ins_new_address_on_policy")} required htmlFor="ins-chg-address" error={errors.newAddress}>
                                <TextArea id="ins-chg-address" maxLength={500} rows={2} value={fields.newAddress || ""} onChange={(e) => setField("newAddress", e.target.value)} />
                            </Field>
                        </>
                    )}
                    {type === "name" && (
                        <FormGrid columns={2}>
                            <Field label={translation("key_ins_person")} required htmlFor="ins-chg-person" error={errors.person}>
                                <SelectBox id="ins-chg-person" value={fields.person || "worker"} invalid={!!errors.person} onChange={(e) => setField("person", e.target.value)}>
                                    <option value="worker">{translation("key_ins_person_worker", { name: workerName })}</option>
                                    <option value="employer">{translation("key_ins_person_employer", { name: employerName })}</option>
                                </SelectBox>
                            </Field>
                            <Field label={translation("key_ins_corrected_name")} required htmlFor="ins-chg-name" error={errors.newName}>
                                <TextInput id="ins-chg-name" maxLength={255} value={fields.newName || ""} invalid={!!errors.newName} onChange={(e) => setField("newName", e.target.value)} />
                            </Field>
                        </FormGrid>
                    )}
                    {type === "extension" && (
                        <FormGrid columns={2}>
                            <div className={styles.ro}><span className={styles.roK}>{translation("key_ins_current_expiry")}</span><span className={styles.roV}>{fmtDateLong(period?.expiry) || "—"}</span></div>
                            <Field label={translation("key_ins_proposed_expiry")} required htmlFor="ins-chg-expiry" error={errors.newExpiry}>
                                <DateInput id="ins-chg-expiry" value={fields.newExpiry || ""} invalid={!!errors.newExpiry} onChange={(v) => setField("newExpiry", v)} />
                            </Field>
                        </FormGrid>
                    )}
                    {type === "rider" && (
                        <Field label={translation("key_ins_rider")} required htmlFor="ins-chg-rider" error={errors.riderText}>
                            <TextArea id="ins-chg-rider" maxLength={2000} rows={2} value={fields.riderText || ""} onChange={(e) => setField("riderText", e.target.value)} />
                        </Field>
                    )}
                    {type === "dates" && (
                        <>
                            <div className={styles.ro}><span className={styles.roK}>{translation("key_ins_current_period")}</span><span className={styles.roV}>{period ? `${fmtDateLong(period.effective)} – ${fmtDateLong(period.expiry)}` : "—"}</span></div>
                            <FormGrid columns={2}>
                                <Field label={translation("key_ins_corrected_effective")} htmlFor="ins-chg-eff" hint={translation("key_ins_blank_if_unchanged")} error={errors.newEffective}>
                                    <DateInput id="ins-chg-eff" value={fields.newEffective || ""} invalid={!!errors.newEffective} onChange={(v) => setField("newEffective", v)} />
                                </Field>
                                <Field label={translation("key_ins_corrected_expiry")} htmlFor="ins-chg-exp" hint={translation("key_ins_blank_if_unchanged")} error={errors.newExpiry}>
                                    <DateInput id="ins-chg-exp" value={fields.newExpiry || ""} invalid={!!errors.newExpiry} onChange={(v) => setField("newExpiry", v)} />
                                </Field>
                            </FormGrid>
                        </>
                    )}
                    {type === "reassign" && (
                        <FormGrid columns={2}>
                            <Field label={translation("key_ins_replacement_worker")} required htmlFor="ins-chg-worker" error={errors.newWorkerId}>
                                <div>
                                    {worker && <div className={styles.v}><b>{worker.name}</b>{worker.code ? <span className={styles.code}>{` ${worker.code}`}</span> : null}</div>}
                                    <Btn id="ins-chg-worker" variant="secondary" onClick={() => setPicking(true)}>{translation(worker ? "key_ins_change" : "key_ins_select_worker")}</Btn>
                                </div>
                            </Field>
                            {canGovern && (
                                <Field label={translation("key_ins_governing_contract")} htmlFor="ins-chg-contract" hint={translation("key_ins_governing_contract_hint")} error={errors.newContractId}>
                                    <div>
                                        <SelectBox id="ins-chg-contract" value={fields.newContractId || ""} invalid={!!errors.newContractId} disabled={!worker} onChange={(e) => setField("newContractId", e.target.value ? Number(e.target.value) : "")}>
                                            <option value="">{translation("key_ins_standalone")}</option>
                                            {contracts.map((c) => <option key={c.id} value={c.id}>{c.contract_number}</option>)}
                                        </SelectBox>
                                        {contractsRead.state === "refused" && (
                                            <div className={styles.hint} role="status" data-contracts="refused">{contractsRead.message || translation("key_couldnt_load_this_view")}</div>
                                        )}
                                        {contractsRead.state === "failed" && (
                                            <div className={styles.loadError} role="alert" data-contracts="failed">
                                                <span>{translation("key_couldnt_load_this_view")}</span>
                                                <Btn variant="secondary" type="button" onClick={() => setContractsAttempt((n) => n + 1)}>{translation("key_retry")}</Btn>
                                            </div>
                                        )}
                                    </div>
                                </Field>
                            )}
                        </FormGrid>
                    )}

                    <FormGrid columns={2}>
                        <Field label={translation("key_ins_additional_charge")} htmlFor="ins-chg-charge" error={errors.chargeApplies}>
                            <SelectBox id="ins-chg-charge" value={chargeValue} disabled={changeType?.invoice === "required"} onChange={(e) => { setCharge(e.target.value); clear("chargeApplies"); }}>
                                {CHARGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{translation(o.key)}</option>)}
                            </SelectBox>
                        </Field>
                    </FormGrid>
                    {invoiceShown && (
                        <InvoicePicker
                            purpose="charge"
                            title={translation("key_ins_invoice_for_charge")}
                            employerId={record.parties?.employer?.id || undefined}
                            workerId={record.parties?.worker?.id || undefined}
                            selectedId={invoice.invoiceId || undefined}
                            overrideReason={invoice.invoiceOverrideReason || ""}
                            error={errors.invoiceId}
                            onChange={({ invoiceId, invoiceOverrideReason }) => { setInvoice({ invoiceId, invoiceOverrideReason }); clear("invoiceId"); }}
                        />
                    )}
                    <Field label={translation("key_ins_request_details")} required htmlFor="ins-chg-remarks" hint={translation("key_ins_request_details_hint")} error={errors.remarks}>
                        <TextArea id="ins-chg-remarks" maxLength={2000} rows={3} value={remarks} onChange={(e) => { setRemarks(e.target.value); clear("remarks"); }} />
                    </Field>
                </div>
            </Modal>
            <Suspense fallback={null}>
                {picking && (
                    <WorkerSearchDialog
                        caps={meta?.caps}
                        onClose={() => setPicking(false)}
                        onPick={(w) => { setWorker(w); setField("newWorkerId", w.id); setField("newContractId", ""); setContracts([]); }}
                    />
                )}
            </Suspense>
        </>
    );
};

ChangePolicyDialog.propTypes = {
    record: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default ChangePolicyDialog;
