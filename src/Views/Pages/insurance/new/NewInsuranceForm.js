import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import { Field, SelectBox, TextArea } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { getCurrentUser } from "../../../../services/permissionService";
import { createInsuranceRecord, createInsuranceSuccessor, fetchInsuranceMeta, searchInsuranceEmployers, searchInsuranceWorkers } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { getInsuranceRecordAPI, lookupInsuranceContractAPI } from "../../../../services/insurance";
import { getInitials } from "../../../../utils/utils";
import routes from "../../routes/routesConfig";
import listStyles from "../../Invoice/InvoiceList.module.css";
import recordStyles from "../record/InsuranceRecord.module.css";
import { fmtDateLong, translation } from "../dashboard/insuranceDashboardConfig";
import {
    contractEntryStepNoticeKey, focusFirstInvalid, isBlank, newSubmissionKey, reasonsText, refusalOf, refusalText, requiredErrors, successorUrl,
} from "../shared/insuranceFormsConfig";
import InvoicePicker from "../shared/InvoicePicker";
import styles from "../shared/InsuranceForms.module.css";

const WorkerSearchDialog = lazy(() => import("./WorkerSearchDialog"));
const EmployerSearchDialog = lazy(() => import("./EmployerSearchDialog"));

const EVISA = "E-Visa payment date";
/* the form's fields in screen order: the first one with an error takes focus (newflow.js focusFirstInvalid) */
const FIELD_ORDER = ["employerId", "workerId", "branch", "referenceBranch", "referenceBranchReason", "planId", "requestedEffective", "invoiceId", "invoiceOverrideReason"];

const Notice = ({ tone, children }) => <div className={styles.notice} data-tone={tone} role="status">{children}</div>;
Notice.propTypes = { tone: PropTypes.string, children: PropTypes.node };

/* The field rules of guardNewRequest (rules.ts newRequestFieldErrors, createRecord), with the server's copy; the server runs
   them again. Parties and Branch are picked only for a standalone record; a Contract or a prior record fixes them. */
const formErrors = (model, fixed, override) => requiredErrors([
    ["employerId", !fixed && !model.employer, "key_ins_err_select_employer"],
    ["workerId", !fixed && !model.worker, "key_ins_err_select_worker"],
    ["branch", !fixed && !model.branch, "key_ins_err_select_branch"],
    ["referenceBranch", override && !model.referenceBranch, "key_ins_err_select_reference_branch"],
    ["referenceBranchReason", override && isBlank(model.referenceBranchReason), "key_ins_err_enter_reason"],
    ["planId", !model.planId, "key_ins_err_select_plan"],
    ["requestedEffective", !model.requestedEffective, "key_ins_err_requested_effective"],
    ["invoiceId", !model.invoiceId, "key_ins_err_select_invoice"],
    ["invoiceId", !!model.invoice && !model.invoice.eligible, "key_ins_invoice_cannot_be_used", { ref: model.invoice?.ref, reasons: reasonsText(model.invoice?.reasons) }],
]);

/* New Insurance — route /insurance/new: ONE request form (Insurance.html newflow.js; Insurance.txt INS01 "New policy"). Parties,
   Plan and requested date, Invoice, then Create request; the policy number and the issued dates are recorded later by Confirm
   policy. Contract entry arrives from the Contract Insurance step as ?contract=<number>&entry=contract with the Contract's facts
   in the navigation state; a link opened without them (pasted, reloaded) looks the Contract up by number. A new policy after an
   expired or cancelled policy arrives as ?prior=<ref> (C1, M1b): a NEW record continuing from that one, with its parties,
   Contract, Branch and CS Owner; a Contract-linked prior also brings ?contract=<number>&entry=contract. Only a New request is
   created here; Renew is an action on the record.
   A standalone record may be issued its Insurance Ref for another registry branch by a holder of
   insurance_reference_branch_override (Insurance.txt INS06; REF-PERM "Override new Insurance reference branch"; PROMPT 5): the
   control and its reason show only with that grant, and only for a new standalone record (a Contract-linked reference follows
   the Contract; a new policy after a record keeps that record's facts). */
const NewInsuranceForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const [params] = useSearchParams();
    const meta = useSelector((state) => state.insurance.meta);
    const entry = params.get("entry") === "contract" ? "contract" : "insurance";
    const contractRef = params.get("contract");
    const stateContract = contractRef && location.state?.contract?.number === contractRef ? location.state.contract : null;
    /* a permitted deep link always opens (INS-R-A03): without the page state the Contract is looked up (conflicts sheet U-0106) */
    const [looked, setLooked] = useState(null);
    useEffect(() => {
        if (!contractRef || stateContract) return;
        setLooked({ status: "loading" });
        lookupInsuranceContractAPI(contractRef)
            .then((res) => setLooked(res.data?.data ? { status: "ok", contract: res.data.data } : { status: "refused" }))
            .catch(() => setLooked({ status: "refused" }));
    }, [contractRef, stateContract]);
    const contract = stateContract || (looked?.status === "ok" ? looked.contract : null);
    const priorRef = params.get("prior");
    const [prior, setPrior] = useState(priorRef ? { status: "loading" } : null);
    const [existing, setExisting] = useState(null);
    const me = useMemo(() => getCurrentUser()?.data?.staff, []);
    const submissionKey = useRef(newSubmissionKey());
    const formRef = useRef(null);

    const [errors, setErrors] = useState({});
    const [focusTick, setFocusTick] = useState(0);
    const [busy, setBusy] = useState(false);
    const [picker, setPicker] = useState(null);
    const [model, setModel] = useState({
        employer: null, worker: null, branch: "", planId: "", requestedEffective: "", dateSource: "entered",
        invoiceId: null, invoiceOverrideReason: null, invoice: null,
        overrideReference: false, referenceBranch: "", referenceBranchReason: "",
    });

    useEffect(() => { if (!meta) dispatch(fetchInsuranceMeta()); }, [dispatch, meta]);
    useEffect(() => {
        if (!contract && !priorRef && meta?.ownership?.branches?.length && !model.branch) {
            setModel((m) => ({ ...m, branch: String(meta.ownership.branches[0].id) }));
        }
    }, [contract, priorRef, meta, model.branch]);

    /* a new policy after terminal cover: the prior must offer New policy (the server re-checks everything at submit) */
    useEffect(() => {
        if (!priorRef) return;
        getInsuranceRecordAPI(priorRef)
            .then((res) => {
                const rec = res.data?.data;
                setPrior(rec?.actions?.find((a) => a.key === "newPolicy")?.enabled ? { status: "ok", record: rec } : { status: "refused" });
            })
            .catch(() => setPrior({ status: "refused" }));
    }, [priorRef]);

    /* Contract entry on a Contract whose record is in use (the lookup and the Contract step name only that one): New policy
       is offered once that record's cover has ended; a record the user cannot open is not named (UI verification W17) */
    const existingRef = !priorRef ? contract?.insuranceRef : null;
    useEffect(() => {
        if (!existingRef) return;
        getInsuranceRecordAPI(existingRef)
            .then((res) => setExisting({ openable: true, canStart: !!res.data?.data?.actions?.find((a) => a.key === "newPolicy")?.enabled }))
            .catch(() => setExisting({ openable: false, canStart: false }));
    }, [existingRef]);

    /* parties that are fixed rather than picked: the Contract's, or the prior record's */
    const priorRecord = prior?.status === "ok" ? prior.record : null;
    const fixed = useMemo(() => contract || (priorRecord ? {
        id: priorRecord.summary?.contract?.id, number: priorRecord.summary?.contract?.number,
        employerId: priorRecord.parties.employer.id, employerName: priorRecord.parties.employer.name, employerZh: priorRecord.parties.employer.zh,
        workerId: priorRecord.parties.worker.id, workerName: priorRecord.parties.worker.name, workerCode: priorRecord.parties.worker.code,
        ownerName: priorRecord.summary?.owner?.name, branchName: priorRecord.summary?.branch?.name, branchCode: priorRecord.summary?.branch?.code,
    } : null), [contract, priorRecord]);

    /* the reference branch override: its grant, a new standalone record, and a registry branch other than the record Branch */
    const referenceOptions = useMemo(
        () => (meta?.referenceBranches || []).filter((b) => String(b.id) !== String(model.branch)),
        [meta, model.branch],
    );
    const canOverrideReference = Boolean(meta?.caps?.referenceBranchOverride) && !fixed && !priorRef && referenceOptions.length > 0;
    const override = canOverrideReference && model.overrideReference;

    const update = useCallback((patch) => {
        setModel((m) => {
            const next = { ...m, ...patch };
            // a different party can change which invoices are eligible: the pick is made again (newflow.js)
            if (("employer" in patch && patch.employer?.id !== m.employer?.id) || ("worker" in patch && patch.worker?.id !== m.worker?.id)) {
                next.invoiceId = null; next.invoiceOverrideReason = null; next.invoice = null;
            }
            // the record Branch is never its own override
            if ("branch" in patch && String(patch.branch) === String(m.referenceBranch)) next.referenceBranch = "";
            return next;
        });
        setErrors((prev) => {
            const next = { ...prev };
            Object.keys(patch).forEach((k) => { delete next[k === "employer" ? "employerId" : k === "worker" ? "workerId" : k]; });
            return next;
        });
    }, []);

    /* the first field with an error takes focus, after the errors are on screen */
    useEffect(() => {
        if (focusTick) focusFirstInvalid(formRef.current, FIELD_ORDER, errors);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusTick]);
    const showErrors = useCallback((e) => { setErrors(e); setFocusTick((n) => n + 1); }, []);

    /* Entry from a Worker / Employer record ("New" on its Insurance tab) brings `location.state.party` = { worker?: { id, name },
       employer?: { id, name } }. Each party is resolved through the same search the picker dialogs use and matched by id,
       so the form shows the same facts as a picked row (EmployerSearchDialog.chooseById). Never applied over a Contract /
       prior entry, whose parties are fixed. */
    const party = location.state?.party;
    useEffect(() => {
        if (!party || contractRef || priorRef) return undefined;
        let cancelled = false;
        const resolve = (thunk, wanted, key) => {
            if (!wanted?.id || !wanted?.name) return;
            dispatch(thunk(wanted.name)).then((res) => {
                if (cancelled) return;
                const hit = (Array.isArray(res?.payload) ? res.payload : []).find((row) => Number(row.id) === Number(wanted.id));
                if (hit) update({ [key]: hit });
            });
        };
        resolve(searchInsuranceEmployers, party.employer, "employer");
        resolve(searchInsuranceWorkers, party.worker, "worker");
        return () => { cancelled = true; };
    }, [party, contractRef, priorRef, dispatch, update]);

    const submit = useCallback(() => {
        if (busy) return;
        // every required check before anything is sent (the server runs them again)
        const missing = formErrors(model, fixed, override);
        if (Object.keys(missing).length) { showErrors(missing); return; }
        setBusy(true);
        const payload = {
            submissionKey: submissionKey.current,
            entry,
            planId: Number(model.planId),
            requestedEffective: model.requestedEffective,
            invoiceId: model.invoiceId,
        };
        if (model.invoiceOverrideReason) payload.invoiceOverrideReason = model.invoiceOverrideReason;
        if (priorRecord) {
            // the server takes every party fact, and the Contract, from the prior record
            payload.ref = priorRecord.ref;
            if (contract) payload.useEvisaDate = model.dateSource === EVISA;
        } else if (contract) {
            payload.contractId = contract.id;
            payload.useEvisaDate = model.dateSource === EVISA;
        } else {
            payload.employerId = model.employer.id;
            payload.workerId = model.worker.id;
            payload.branch = Number(model.branch);
            if (override) {
                payload.referenceBranch = Number(model.referenceBranch);
                payload.referenceBranchReason = model.referenceBranchReason.trim();
            }
        }
        dispatch(priorRecord ? createInsuranceSuccessor(payload) : createInsuranceRecord(payload)).then((res) => {
            setBusy(false);
            if (!res.error) {
                const ref = res.payload?.data?.ref;
                ShowToast("success", res.payload?.message || translation("key_ins_request_created", { ref }));
                navigate(routes.insuranceRecord.replace(":ref", ref));
                return;
            }
            const r = refusalOf(res);
            // One key per form (newflow.js): a refused submission rolled back, so the same key is reused; when this
            // key was already recorded (e.g. a lost response), the server names the record and it opens instead.
            const recordedRef = res.payload?.data?.ref;
            if (r.code === "DUPLICATE" && recordedRef) {
                ShowToast("error", r.message);
                navigate(routes.insuranceRecord.replace(":ref", recordedRef));
                return;
            }
            // server field errors sit beside their fields; any error this form has no field for is listed in the toast
            if (Object.keys(r.errors).length) showErrors(r.errors);
            const rendered = FIELD_ORDER.filter((f) => (f === "referenceBranch" || f === "referenceBranchReason" ? override
                : f === "employerId" || f === "workerId" || f === "branch" ? !fixed : true));
            ShowToast("error", refusalText(r, rendered));
        });
    }, [busy, contract, dispatch, entry, fixed, model, navigate, override, priorRecord, showErrors]);

    const crumbs = (
        <nav className={recordStyles.crumbs} aria-label={translation("key_ins_breadcrumbs")}>
            {contract
                ? <Link to={routes.processingDetails.replace(":contract_id", contract.id)}>{contract.number}</Link>
                : <Link to={routes.insurance}>{translation("key_insurance")}</Link>}
            <span>/</span><span>{translation("key_ins_new_insurance")}</span>
        </nav>
    );
    const page = (children, title = translation("key_ins_new_insurance"), sub = null) => (
        <div className={`${listStyles.pageWrap} ${recordStyles.page}`}>
            {crumbs}
            <div className={recordStyles.head}>
                <div>
                    <h1 className={recordStyles.title}>{title}</h1>
                    {sub && <div className={styles.pageSub}>{sub}</div>}
                </div>
            </div>
            {children}
        </div>
    );

    if (!meta || prior?.status === "loading" || looked?.status === "loading") return page(<CustomSpinner />);
    const cap = (contractRef || priorRef) && entry === "contract" ? "contractEntryNew" : "addNewInsurance";
    if (!meta.access || !meta.caps?.[cap]) return page(<Notice>{translation("key_ins_new_not_available")}</Notice>);
    /* a standalone record is created in the actor's ownership scope: without ownership eligibility the refusal shows before
       the form, not at submit (rules.guardNewRequest copy; the server refuses the same). User ruling 16 Oct (UI verification W08) */
    if (!contractRef && !priorRef && !meta.ownership?.eligible) return page(<Notice>{translation("key_ins_standalone_needs_ownership")}</Notice>);
    if (prior?.status === "refused") {
        return page(
            <>
                <Notice>{translation("key_ins_record_cannot_start_new_policy")}</Notice>
                <div className={styles.navrow}><Btn variant="secondary" onClick={() => navigate(routes.insurance)}>{translation("key_ins_back_to_insurance")}</Btn></div>
            </>,
        );
    }
    /* a successor whose Contract cannot be looked up still opens: the server takes the Contract from the prior record */
    if (contractRef && !contract && !priorRecord) return page(<Notice>{translation("key_ins_contract_not_found")}</Notice>);
    if (existingRef) {
        if (!existing) return page(<CustomSpinner />);
        const link = <Link className={recordStyles.codeLink} to={routes.insuranceRecord.replace(":ref", existingRef)}>{existingRef}</Link>;
        return page(existing.canStart ? (
            <Notice>
                {translation("key_ins_contract_already_has", { ct: contract.number })} {link}. {translation("key_ins_cover_ended_new_record")}{" "}
                <Btn variant="primary" onClick={() => navigate(successorUrl(existingRef, contract.number), { state: { contract } })}>
                    {translation("key_ins_action_new_policy")}
                </Btn>
            </Notice>
        ) : <Notice tone="warn">{translation("key_ins_contract_already_has", { ct: contract.number })} {existing.openable ? link : translation("key_ins_another_policy")}.</Notice>);
    }
    const stepNotice = contract ? contractEntryStepNoticeKey(contract.stage, !!priorRef) : null;
    if (stepNotice) return page(<Notice>{translation(stepNotice)}</Notice>);

    const ownerName = fixed ? fixed.ownerName : [me?.first_name, me?.last_name].filter(Boolean).join(" ");
    const err = (field) => (errors[field] ? <div className={styles.err} role="alert">{errors[field]}</div> : null);

    /* identity search needs Search Access; without it the Parties panel refuses rather than offering an empty search (C12) */
    const canSearch = !!meta.search?.enabled;
    const parties = (
        <section className={`${recordStyles.panel} ${styles.newPanel}`} data-panel="parties">
            <div className={recordStyles.panelHead}><h3 className={recordStyles.panelTitle}>{translation("key_ins_parties")}</h3></div>
            <div className={recordStyles.panelBody}>
                {!fixed && !canSearch && <div className={styles.noticeGap}><Notice tone="warn">{translation("key_ins_requires_search_access")}</Notice></div>}
                <div className={styles.kv}>
                    <div className={styles.k}>{translation("key_employer")}</div>
                    <div className={styles.v} data-field="employerId">
                        {fixed
                            ? <span><b>{fixed.employerName}</b>{fixed.employerZh ? ` · ${fixed.employerZh}` : ""}</span>
                            : model.employer
                                ? (
                                    <span>
                                        <b>{model.employer.name}</b>{model.employer.zh ? ` · ${model.employer.zh}` : ""}
                                        <div className={styles.small}><span className={styles.code}>{model.employer.code}</span>{model.employer.phone ? ` · ${model.employer.phone}` : ""}</div>
                                    </span>
                                )
                                : <span className={styles.muted}>{translation("key_ins_not_selected")}</span>}
                        {!fixed && canSearch && (
                            <div className={styles.pickBtn}>
                                <Btn variant="secondary" onClick={() => setPicker("employer")}>{translation(model.employer ? "key_ins_change" : "key_ins_search_employer")}</Btn>
                            </div>
                        )}
                        {err("employerId")}
                    </div>
                    <div className={styles.k}>{translation("key_worker")}</div>
                    <div className={styles.v} data-field="workerId">
                        {fixed
                            ? <span><b>{fixed.workerName}</b>{fixed.workerCode ? <div className={styles.small}><span className={styles.code}>{fixed.workerCode}</span></div> : null}</span>
                            : model.worker
                                ? (
                                    <span>
                                        <b>{model.worker.name}</b>
                                        <div className={styles.small}>
                                            <span className={styles.code}>{model.worker.code}</span>{` · ${translation("key_ins_dob_date", { date: fmtDateLong(model.worker.dob) })}`}
                                            {model.worker.insuranceOnly && <> · <span className={listStyles.statusTag} data-tone="neutral">{translation("key_ins_insurance_only")}</span></>}
                                        </div>
                                    </span>
                                )
                                : <span className={styles.muted}>{translation("key_ins_not_selected")}</span>}
                        {!fixed && canSearch && (
                            <div className={styles.pickBtn}>
                                <Btn variant="secondary" onClick={() => setPicker("worker")}>{translation(model.worker ? "key_ins_change" : "key_ins_search_worker")}</Btn>
                            </div>
                        )}
                        {err("workerId")}
                    </div>
                    <div className={styles.k}>{translation("key_ins_col_cs_owner")}</div>
                    <div className={styles.v}>
                        {ownerName ? (
                            <span className={recordStyles.owner}>
                                <span className={recordStyles.ownerAvatar} aria-hidden="true">{getInitials(ownerName)}</span>
                                <span>{ownerName}</span>
                                {contract && <span className={`${styles.muted} ${styles.small}`}>{` · ${translation("key_ins_from_contract", { number: contract.number })}`}</span>}
                            </span>
                        ) : "—"}
                    </div>
                    <div className={styles.k}>{translation("key_branch")}</div>
                    <div className={styles.v} data-field="branch">
                        {fixed
                            ? [fixed.branchName, fixed.branchCode ? `(${fixed.branchCode})` : null].filter(Boolean).join(" ")
                            : (
                                <div className={styles.kvControl}>
                                    <SelectBox value={model.branch} onChange={(e) => update({ branch: e.target.value })} aria-label={translation("key_branch")} invalid={!!errors.branch}>
                                        {(meta.ownership?.branches || []).map((b) => <option key={b.id} value={b.id}>{`${b.name} (${b.code})`}</option>)}
                                    </SelectBox>
                                </div>
                            )}
                        {err("branch")}
                    </div>
                    {canOverrideReference && (
                        <>
                            <div className={styles.k} aria-hidden="true" />
                            <div className={styles.v} data-field="referenceBranchOverride">
                                <label className={styles.check}>
                                    <input
                                        type="checkbox"
                                        checked={model.overrideReference}
                                        onChange={(e) => update({ overrideReference: e.target.checked, referenceBranch: "", referenceBranchReason: "" })}
                                    />
                                    <span>{translation("key_ins_override_reference_branch")}</span>
                                </label>
                                {override && (
                                    <div className={styles.overrideFields}>
                                        <div data-field="referenceBranch">
                                            <Field label={translation("key_ins_reference_branch")} required htmlFor="ins-new-ref-branch" hint={translation("key_ins_reference_branch_hint")} error={errors.referenceBranch}>
                                                <SelectBox id="ins-new-ref-branch" value={model.referenceBranch} invalid={!!errors.referenceBranch} onChange={(e) => update({ referenceBranch: e.target.value })}>
                                                    <option value="">{translation("key_ins_select_branch_option")}</option>
                                                    {referenceOptions.map((b) => <option key={b.id} value={b.id}>{`${b.name} (${b.code})`}</option>)}
                                                </SelectBox>
                                            </Field>
                                        </div>
                                        <div data-field="referenceBranchReason">
                                            <Field label={translation("key_ins_reason")} required htmlFor="ins-new-ref-reason" error={errors.referenceBranchReason}>
                                                <TextArea id="ins-new-ref-reason" maxLength={500} rows={2} value={model.referenceBranchReason} invalid={!!errors.referenceBranchReason}
                                                    onChange={(e) => update({ referenceBranchReason: e.target.value })} />
                                            </Field>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );

    const planDate = (
        <section className={`${recordStyles.panel} ${styles.newPanel}`} data-panel="plan">
            <div className={recordStyles.panelHead}><h3 className={recordStyles.panelTitle}>{translation("key_ins_plan_and_requested_date")}</h3></div>
            <div className={`${recordStyles.panelBody} ${styles.form}`}>
                <div data-field="planId">
                    <Field label={translation("key_ins_plan")} required htmlFor="ins-new-plan" error={errors.planId}>
                        <SelectBox id="ins-new-plan" value={model.planId} invalid={!!errors.planId} onChange={(e) => update({ planId: e.target.value })}>
                            <option value="">{translation("key_ins_select_plan")}</option>
                            {(meta.plans || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </SelectBox>
                    </Field>
                </div>
                <div data-field="requestedEffective">
                    <Field label={translation("key_ins_requested_effective_date")} required htmlFor="ins-new-date" hint={translation("key_ins_issued_dates_hint")} error={errors.requestedEffective}>
                        <DateInput
                            id="ins-new-date"
                            value={model.requestedEffective}
                            invalid={!!errors.requestedEffective}
                            onChange={(v) => update({ requestedEffective: v, dateSource: model.dateSource === EVISA ? "edited" : model.dateSource })}
                        />
                    </Field>
                </div>
                {contract && (
                    <label className={styles.check}>
                        <input
                            type="checkbox"
                            disabled={!contract.evisaDate}
                            checked={model.dateSource === EVISA}
                            onChange={(e) => update(e.target.checked
                                ? { requestedEffective: contract.evisaDate, dateSource: EVISA }
                                : { dateSource: "entered" })}
                        />
                        <span>
                            {translation("key_ins_use_evisa_date")}
                            <span className={`${styles.muted} ${styles.small}`}>
                                {contract.evisaDate ? ` (${fmtDateLong(contract.evisaDate)})` : ` ${translation("key_ins_no_evisa_date")}`}
                            </span>
                        </span>
                    </label>
                )}
            </div>
        </section>
    );

    const invoice = (
        <section className={`${recordStyles.panel} ${styles.newPanel}`} data-panel="invoice">
            <div className={recordStyles.panelHead}><h3 className={recordStyles.panelTitle}>{translation("key_invoice")}</h3></div>
            <div className={`${recordStyles.panelBody} ${styles.form}`}>
                <InvoicePicker
                    purpose="new"
                    title={translation("key_invoice")}
                    employerId={fixed ? fixed.employerId : model.employer?.id}
                    workerId={fixed ? fixed.workerId : model.worker?.id}
                    selectedId={model.invoiceId || undefined}
                    overrideReason={model.invoiceOverrideReason || ""}
                    error={errors.invoiceId}
                    onChange={({ invoiceId, invoiceOverrideReason, invoice: row }) => update({ invoiceId, invoiceOverrideReason, invoice: row })}
                />
                {errors.invoiceOverrideReason && <div className={styles.err} role="alert" data-field="invoiceOverrideReason">{errors.invoiceOverrideReason}</div>}
            </div>
        </section>
    );

    const title = priorRecord ? translation("key_ins_new_after", { ref: priorRecord.ref })
        : contract ? translation("key_ins_new_from_contract") : translation("key_ins_new_insurance");
    const sub = contract ? (
        <>
            <Link className={recordStyles.codeLink} to={routes.processingDetails.replace(":contract_id", contract.id)}>{contract.number}</Link>
            {` · ${contract.workerName} · ${contract.employerName}`}
        </>
    ) : null;
    /* Cancel: Contract entry returns to the Contract the person came from (owner decision P6C-3, 11 Nov 2026 — Insurance.html
       newflow.js returns to Insurance; recorded in OPEN_QUESTIONS for the product owner). A new policy opened from its record
       (no Contract in the page state) returns to that record; anything else to Insurance. */
    const fromContract = Boolean(contract) && (!priorRef || Boolean(stateContract));
    const cancelTo = fromContract ? routes.processingDetails.replace(":contract_id", contract.id)
        : priorRecord ? routes.insuranceRecord.replace(":ref", priorRecord.ref) : routes.insurance;

    return page(
        <div className={styles.newForm} data-form="new" ref={formRef}>
            <div className={styles.newTop}>
                {parties}
                {planDate}
            </div>
            {invoice}
            <div className={styles.submitBar}>
                <span className={`${styles.muted} ${styles.small}`}>{translation("key_ins_create_request_note")}</span>
                <div className={styles.submitActions}>
                    <Btn variant="secondary" onClick={() => navigate(cancelTo)} disabled={busy}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" onClick={submit} disabled={busy} data-action="submit">{busy ? translation("key_saving") : translation("key_ins_create_request")}</Btn>
                </div>
            </div>
            <Suspense fallback={null}>
                {picker === "worker" && <WorkerSearchDialog caps={meta.caps} onClose={() => setPicker(null)} onPick={(w) => update({ worker: w })} />}
                {picker === "employer" && <EmployerSearchDialog onClose={() => setPicker(null)} onPick={(e) => update({ employer: e })} />}
            </Suspense>
        </div>,
        title,
        sub,
    );
};

export default NewInsuranceForm;
