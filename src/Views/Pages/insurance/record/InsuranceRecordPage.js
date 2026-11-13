import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector, useStore } from "react-redux";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import "../../WorkerPage/worker-detail/newui/worker-details.css";
import Btn from "../../../../components/ui/Btn";
import Icon from "../../../../components/Icon/Icon";
import StaffAccountCue from "../../../../components/ui/StaffAccountCue";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { ensureInsuranceMeta, fetchInsuranceRecord, fetchInsuranceRecordView, recordSeedUsed } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { getInitials } from "../../../../utils/utils";
import routes from "../../routes/routesConfig";
import listStyles from "../../Invoice/InvoiceList.module.css";
import styles from "./InsuranceRecord.module.css";
import menuStyles from "../dashboard/InsuranceDashboard.module.css";
import InsuranceMenu, { MenuItem } from "../dashboard/InsuranceMenu";
import RecordOverview, { ContractRef } from "./RecordOverview";
import RecordRequestRow from "./RecordRequestRow";
import RecordActivityTab from "./RecordActivityTab";
import InsuranceContextRail from "./InsuranceContextRail";
import useInsuranceFollowUp from "./useInsuranceFollowUp";
import { seedInsuranceRemarks } from "./insuranceRecordRemarks";
import {
    COVERAGE_TONE, coverageDetail, coverageLabel, factText, fmtDateLong, translation,
} from "../dashboard/insuranceDashboardConfig";
import { RECORD_TABS, REMARKS_LINK_TAB, actionLabel, actionReason, menuActionGroups, recordTabFromQuery } from "./insuranceRecordConfig";
import { successorUrl } from "../shared/insuranceFormsConfig";
import { AttentionNote, RequestTag } from "../shared/InsuranceWorkTags";
import copyText from "../shared/copyText";
import useCanOpenContract from "../shared/useCanOpenContract";
import { targetFromRecord } from "../ownership/ownershipConfig";
import { CAL_SOURCE_QUERY } from "../../Calendar/newui/calendarConstants";

const RecordQbeResultDialog = lazy(() => import("./RecordQbeResultDialog"));
const RenewPolicyDialog = lazy(() => import("./RenewPolicyDialog"));
const AddCoverageDialog = lazy(() => import("./AddCoverageDialog"));
const ChangePolicyDialog = lazy(() => import("./ChangePolicyDialog"));
const EditRequestDialog = lazy(() => import("./EditRequestDialog"));
const CloseRequestDialog = lazy(() => import("./CloseRequestDialog"));
const RequestCancellationDialog = lazy(() => import("./RequestCancellationDialog"));
const CancellationResultDialog = lazy(() => import("./CancellationResultDialog"));
const CancellationReferenceDialog = lazy(() => import("./CancellationReferenceDialog"));
const CloseIssueDialog = lazy(() => import("./CloseIssueDialog"));
const ChangeOwnerDialog = lazy(() => import("../ownership/ChangeOwnerDialog"));
const ChangeBranchDialog = lazy(() => import("../ownership/ChangeBranchDialog"));
const CorrectRecordDialog = lazy(() => import("./CorrectRecordDialog"));

const Crumbs = ({ current }) => (
    <nav className={styles.crumbs} aria-label={translation("key_ins_breadcrumbs")}>
        <Link to={routes.insurance}>{translation("key_insurance")}</Link>
        {current && <><span>/</span><span>{current}</span></>}
    </nav>
);
Crumbs.propTypes = { current: PropTypes.string };

/* Manual activation (C30): arrows / Home / End move focus; Enter, Space or click activates */
const RecordTabs = ({ active, onChange }) => {
    const refs = useRef([]);
    const onKey = (event, index) => {
        const last = RECORD_TABS.length - 1;
        const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
        if (next !== undefined) { event.preventDefault(); refs.current[next]?.focus(); }
    };
    return (
        <div className={styles.tabs} role="tablist" aria-label={translation("key_ins_record_sections")}>
            {RECORD_TABS.map((tab, index) => {
                const on = tab.key === active;
                return (
                    <button
                        key={tab.key}
                        ref={(el) => { refs.current[index] = el; }}
                        type="button"
                        role="tab"
                        id={`ins-tab-${tab.key}`}
                        aria-selected={on}
                        aria-controls="ins-tabpanel"
                        tabIndex={on ? 0 : -1}
                        className={`${styles.tab} ${on ? styles.tabOn : ""}`}
                        onClick={() => onChange(tab.key)}
                        onKeyDown={(event) => onKey(event, index)}
                    >
                        {translation(tab.labelKey)}
                    </button>
                );
            })}
        </div>
    );
};
RecordTabs.propTypes = { active: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired };

const Fact = ({ label, children, mono, name }) => (
    <div className={styles.fact} data-fact={name}>
        <div className={styles.factK}>{label}</div>
        <div className={`${styles.factV} ${mono ? styles.mono : ""}`}>{children}</div>
    </div>
);
Fact.propTypes = { label: PropTypes.node, children: PropTypes.node, mono: PropTypes.bool, name: PropTypes.string };

/* Insurance record page — route /insurance/:ref (INDEX §3.2; Insurance.html details.js; Insurance.txt INS08; UI Correction
   C1–C4). Context rail (Remarks, Follow Up) · header (name, Insurance Ref, Copy, one Coverage status tag, Back, Actions) · work
   strip (Open requests, Needs attention) · summary strip (Plan, Coverage status, QBE policy number, policy period, Contract,
   CS Owner, Branch) · Continues from / Followed by · Overview / Requests / Activity. */
const InsuranceRecordPage = () => {
    const dispatch = useDispatch();
    const store = useStore();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { ref } = useParams();
    const [params, setParams] = useSearchParams();
    const tab = recordTabFromQuery(params.get("tab"));
    /* ?tab=requests&request=<id>: a follow-up's source link back to the request it was launched from (calendarSourceLinks) */
    const arrivedRequest = params.get(CAL_SOURCE_QUERY.REQUEST);
    const record = useSelector((state) => state.insurance.record);
    const refusal = useSelector((state) => state.insurance.recordRefusal);
    const recordStatus = useSelector((state) => state.insurance.recordStatus);
    const meta = useSelector((state) => state.insurance.meta);
    const canOpenContract = useCanOpenContract();
    const [qbeRequest, setQbeRequest] = useState(null);
    const [renewOpen, setRenewOpen] = useState(false);
    const [coverageOpen, setCoverageOpen] = useState(false);
    const [changeOpen, setChangeOpen] = useState(false);
    const [editRequest, setEditRequest] = useState(null);
    const [closing, setClosing] = useState(null);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cxlRequest, setCxlRequest] = useState(null);
    const [cxlPeriod, setCxlPeriod] = useState(null);
    /* Close issue: false, or { issueId } of the issue whose row opened it (null = let the dialog pre-select) */
    const [issuesOpen, setIssuesOpen] = useState(false);
    const [ownerOpen, setOwnerOpen] = useState(false);
    const [branchOpen, setBranchOpen] = useState(false);
    const [correctOpen, setCorrectOpen] = useState(false);
    /* loadKey reads the record again; tabsKey reloads Activity */
    const [loadKey, setLoadKey] = useState(0);
    const [tabsKey, setTabsKey] = useState(0);

    /* the server's grants for this actor (R5): Add remark follows Insurance Remarks (Q-05) */
    useEffect(() => { dispatch(ensureInsuranceMeta()); }, [dispatch]);

    /* A record not yet on screen is read with its remarks list in one call (INS-2); a reload of the record on screen reads
       R2, as before. A view the legacy link or the wizard has just read is used as it is. */
    useEffect(() => {
        const { record: shown, recordSeed } = store.getState().insurance;
        if (recordSeed === ref && shown?.ref === ref) { dispatch(recordSeedUsed()); return; }
        if (shown?.ref === ref) { dispatch(fetchInsuranceRecord(ref)); return; }
        dispatch(fetchInsuranceRecordView(ref)).unwrap()
            .then((view) => seedInsuranceRemarks(queryClient, dispatch, view?.record, view?.remarks))
            .catch(() => { /* the page shows the refusal (slice) */ });
    }, [dispatch, queryClient, ref, loadKey, store]);

    /* After an action: when the action's reply has already put the fresh record view on screen, only Activity reloads;
       otherwise (a refused or stale form, an action without a view) the record is read again, as before. */
    const seenViewSeq = useRef(store.getState().insurance.recordViewSeq);
    const reload = useCallback(() => {
        setTabsKey((n) => n + 1);
        const seq = store.getState().insurance.recordViewSeq;
        if (seq !== seenViewSeq.current) { seenViewSeq.current = seq; return; }
        setLoadKey((n) => n + 1);
    }, [store]);
    const setTab = useCallback((key) => setParams(key === "overview" ? {} : { tab: key }, { replace: true }), [setParams]);

    /* a reload that fails while the record is on screen keeps it there and says so (the slice keeps the record) */
    const lastStatus = useRef(recordStatus);
    useEffect(() => {
        if (lastStatus.current !== "failed" && recordStatus === "failed" && record) ShowToast("error", translation("key_couldnt_load_this_view"));
        lastStatus.current = recordStatus;
    }, [recordStatus, record]);

    const items = useMemo(() => record?.actions || [], [record]);
    const held = useMemo(() => new Set(items.map((a) => a.key)), [items]);
    /* the Actions menu: record-level work only, at most eight entries in three groups (insuranceRecordConfig MENU_ACTION_GROUPS) */
    const menuGroups = useMemo(() => menuActionGroups(items), [items]);
    /* I-16: Follow Up on this record (Context) and on its request rows; absent without the grant */
    const followUp = useInsuranceFollowUp(record && record.ref === ref ? record : null);

    /* The result action of one open request (its row button); a cancellation outcome has its own dialog
       (details.js openRecordResult). There is no record-level result action (INS02). */
    const recordRequest = useCallback((rq) => {
        if (rq.type === "Cancellation") setCxlRequest(rq);
        else setQbeRequest(rq);
    }, []);

    /* one entry point for menu items, row buttons and panel buttons; the second argument is the row's request, the issue
       for Close issue, or the period for Add QBE reference. Request actions always come from their own row. */
    const runAction = useCallback((key, rq) => {
        if (key === "addCancellationRef") { setCxlPeriod(rq); return; }
        if (key === "followUp") { if (rq) followUp.openRow(rq); else followUp.openList(); return; }
        if (key === "record") { if (rq) recordRequest(rq); return; }
        if (key === "editRequest") { if (rq) setEditRequest(rq); return; }
        if (key === "cancelRequest" || key === "reject") { if (rq) setClosing({ mode: key === "reject" ? "reject" : "withdraw", request: rq }); return; }
        const item = items.find((i) => i.key === key);
        if (key === "renew" && item?.enabled) { setRenewOpen(true); return; }
        if (key === "addCoverage" && item?.enabled) { setCoverageOpen(true); return; }
        if (key === "change" && item?.enabled) { setChangeOpen(true); return; }
        if (key === "requestCancel" && item?.enabled) { setCancelOpen(true); return; }
        if (key === "dismissReview" && item?.enabled) { setIssuesOpen({ issueId: rq?.id ?? null }); return; }
        if (key === "changeCsOwner" && item?.enabled) { setOwnerOpen(true); return; }
        if (key === "changeBranch" && item?.enabled) { setBranchOpen(true); return; }
        if (key === "correctStatus" && item?.enabled) { setCorrectOpen(true); return; }
        /* New policy after an expired or cancelled policy: the wizard creates a NEW record continuing from this one
           (C1, M1b); the URL carries the reference (C37) and, for a Contract-linked record, its Contract (details.js) */
        if (key === "newPolicy" && item?.enabled) navigate(successorUrl(record.ref, record.summary?.contract?.number));
    }, [followUp, items, navigate, record, recordRequest]);

    /* Withdraw / Reject open the Requests tab when they succeed (forms.handle(…, 'requests')) */
    const closedRequest = useCallback((tabKey) => { reload(); if (tabKey) setTab(tabKey); }, [reload, setTab]);

    /* C2: copies only the reference, says what really happened, never navigates */
    const copyRef = useCallback(() => {
        copyText(record.ref).then((ok) => (ok
            ? ShowToast("success", translation("key_ins_reference_copied"))
            : ShowToast("error", translation("key_ins_copy_not_allowed"))));
    }, [record]);

    if (refusal === "ACCESS" || refusal === "ERROR") {
        return (
            <div className={`${listStyles.pageWrap} ${styles.page}`}>
                <Crumbs />
                <div className={styles.head}><h1 className={styles.title}>{translation("key_insurance")}</h1></div>
                <div className={styles.notice} role="status">
                    {translation(refusal === "ACCESS" ? "key_ins_record_not_available" : "key_couldnt_load_this_view")}
                    {refusal === "ERROR" && (
                        <div className={styles.noticeAction}>
                            <Btn variant="secondary" onClick={reload}><Icon name="refresh" size={13} /> {translation("key_retry")}</Btn>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    if (refusal === "PERMISSION") {
        return (
            <div className={`${listStyles.pageWrap} ${styles.page}`}>
                <Crumbs />
                <div className={styles.head}><h1 className={styles.title}>{ref}</h1></div>
                <div className={styles.notice} role="status">{translation("key_ins_record_cannot_open")}</div>
            </div>
        );
    }
    if (!record || record.ref !== ref) return <div className={`${listStyles.pageWrap} ${styles.page}`}><Crumbs current={ref} /><CustomSpinner /></div>;

    const cv = record.header.coverage;
    const sub = factText(cv.fact, cv.factDate);
    const detail = coverageDetail(cv);
    const s = record.summary;
    const work = record.work;
    const periodKey = { current: "key_ins_current_policy_period", next: "key_ins_next_policy_period", last: "key_ins_last_policy_period" }[s.periodKind];
    const openable = (rel) => (rel.openable
        ? <Link key={rel.ref} className={styles.codeLink} to={routes.insuranceRecord.replace(":ref", rel.ref)}>{rel.ref}</Link>
        : <span key={rel.ref} className={styles.code}>{rel.ref}</span>);

    return (
        <section className={`wkd wkd-page ${styles.shell}`} data-mc-module="insurance-record">
            <div className="wkd-body">
                <aside className={`wkd-rail ${styles.rail}`} aria-label={translation("key_context")}>
                    <InsuranceContextRail record={record} canWriteRemarks={Boolean(meta?.caps?.writeRemarks)} followUp={followUp}
                        openRemarksOnArrival={params.get("tab") === REMARKS_LINK_TAB} />
                </aside>
                <div className="wkd-main-col">
                    <div className={`wkd-main ${styles.main}`}>
                        <Crumbs current={record.ref} />
                        <div className={styles.head}>
                            <div className={styles.identity}>
                                <h1 className={styles.title}>{record.header.workerName}</h1>
                                <span className={styles.ref}>{record.ref}</span>
                                {/* C2: the small Copy control beside the reference, a specific accessible name, no "Copy ref" wording */}
                                <button type="button" className={styles.copy} aria-label={translation("key_ins_copy_insurance_reference")} onClick={copyRef}>{translation("key_copy")}</button>
                                {/* one Coverage status tag; its fact and detail are the title */}
                                <span
                                    className={`${listStyles.statusTag} ${styles.pillLg} ${cv.legacy ? styles.pillLegacy : ""}`}
                                    data-tone={COVERAGE_TONE[cv.label] || "neutral"}
                                    data-coverage={cv.label}
                                    title={[sub, detail].filter(Boolean).join(" · ") || undefined}
                                >
                                    {coverageLabel(cv.label)}
                                </span>
                            </div>
                            <div className={styles.headActions}>
                                <Btn variant="ghost" as={Link} to={routes.insurance} className={styles.back}><Icon name="chev_left" size={12} /> {translation("key_insurance")}</Btn>
                                {menuGroups.length > 0 && (
                                    <InsuranceMenu id="ins-record-actions" align="right" trigger={<span>{translation("key_ins_actions")}</span>}>
                                        {(close) => menuGroups.map((group, gi) => (
                                            <React.Fragment key={group[0].key}>
                                                {gi > 0 && <div className={menuStyles.menuSep} data-sep="" />}
                                                {group.map((i) => {
                                                    const reason = i.enabled ? "" : actionReason(i, s.contract?.number);
                                                    return (
                                                        <MenuItem
                                                            key={i.key}
                                                            disabled={!i.enabled}
                                                            danger={i.danger}
                                                            onSelect={() => { close(); runAction(i.key); }}
                                                            onRefused={() => ShowToast("error", `${actionLabel(i.key)}: ${reason}`)}
                                                            sub={!i.enabled ? reason : null}
                                                        >
                                                            {actionLabel(i.key)}
                                                        </MenuItem>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </InsuranceMenu>
                                )}
                            </div>
                        </div>

                        {/* details.js workStrip: Open requests — one tag per open request, "None" without one; Needs attention apart */}
                        <div className={styles.workStrip} data-work="summary">
                            <span className={styles.stripLabel}>{translation("key_ins_work_requests")}</span>
                            {work.openRequests.map((type, i) => <RequestTag key={`${type}-${i}`} type={type} />)}
                            {!work.openRequests.length && <span className={styles.muted}>{translation("key_none")}</span>}
                            {work.attention > 0 && <span className={styles.workAttention}><AttentionNote count={work.attention} /></span>}
                        </div>

                        {/* C1: CS Owner and Branch are two separately labelled facts; no combined owner / Branch control */}
                        <div className={styles.summary}>
                            <Fact name="plan" label={translation("key_ins_plan")}>
                                {s.plan || "—"}{s.planRequested && <span className={`${styles.muted} ${styles.small}`}>{` ${translation("key_ins_requested_paren")}`}</span>}
                            </Fact>
                            <Fact name="coverage" label={translation("key_ins_col_coverage_status")}>
                                {coverageLabel(cv.label)}
                                {sub && sub !== coverageLabel(cv.label) && <span className={styles.factSub}>{sub}</span>}
                            </Fact>
                            <Fact name="carrierRef" label={translation("key_ins_col_qbe_policy_number")} mono>{s.carrierRef || "—"}</Fact>
                            <Fact name="period" label={translation(periodKey)}>{s.period ? `${fmtDateLong(s.period.effective)} – ${fmtDateLong(s.period.expiry)}` : "—"}</Fact>
                            <Fact name="contract" label={translation("key_contract")}>
                                {s.contract ? <ContractRef contract={s.contract} canOpenContract={canOpenContract} /> : translation("key_ins_standalone")}
                            </Fact>
                            <Fact name="owner" label={translation("key_ins_col_cs_owner")}>
                                {s.owner?.name ? (
                                    <span className={styles.owner}>
                                        <span className={styles.ownerAvatar} aria-hidden="true">{getInitials(s.owner.name)}</span>
                                        <StaffAccountCue active={s.owner.active} />
                                        <span>{s.owner.name}</span>
                                    </span>
                                ) : "—"}
                            </Fact>
                            <Fact name="branch" label={translation("key_branch")}>{s.branch?.name || "—"}</Fact>
                        </div>

                        {(record.relationship.continuesFrom || record.relationship.followedBy.length > 0) && (
                            <div className={styles.relStrip} data-rel="">
                                {record.relationship.continuesFrom && <span>{translation("key_ins_continues_from")} {openable(record.relationship.continuesFrom)}</span>}
                                {record.relationship.followedBy.length > 0 && (
                                    <span>
                                        {translation("key_ins_followed_by")}{" "}
                                        {record.relationship.followedBy.map((rel, i) => <React.Fragment key={rel.ref}>{i ? ", " : ""}{openable(rel)}</React.Fragment>)}
                                    </span>
                                )}
                            </div>
                        )}

                        <RecordTabs active={tab} onChange={setTab} />
                        <div id="ins-tabpanel" role="tabpanel" aria-labelledby={`ins-tab-${tab}`} tabIndex={0}>
                            {tab === "overview" && (
                                <RecordOverview
                                    record={record}
                                    canCloseIssue={held.has("dismissReview")}
                                    canFollowUp={followUp.allowed}
                                    canOpenContract={canOpenContract}
                                    onAction={runAction}
                                />
                            )}
                            {tab === "requests" && (
                                <section className={styles.panel} data-panel="requests">
                                    <div className={styles.panelHead}><h3 className={styles.panelTitle}>{translation("key_ins_tab_requests")}</h3></div>
                                    <div className={`${styles.panelBodyTight} ${styles.list}`}>
                                        {record.requests.length
                                            ? record.requests.map((rq) => <RecordRequestRow key={rq.id} request={rq} onAction={runAction} canFollowUp={followUp.allowed} arrived={arrivedRequest === String(rq.id)} />)
                                            : <div className={`${styles.item} ${styles.muted}`}>{translation("key_ins_no_requests")}</div>}
                                    </div>
                                </section>
                            )}
                            {tab === "activity" && <RecordActivityTab key={`${record.ref}-${tabsKey}`} recordRef={record.ref} />}
                        </div>
                    </div>
                </div>
            </div>

            <Suspense fallback={null}>
                {qbeRequest && (
                    <RecordQbeResultDialog record={record} request={qbeRequest} onClose={() => setQbeRequest(null)} onDone={reload} />
                )}
                {renewOpen && <RenewPolicyDialog record={record} onClose={() => setRenewOpen(false)} onDone={reload} />}
                {coverageOpen && <AddCoverageDialog record={record} onClose={() => setCoverageOpen(false)} onDone={reload} />}
                {changeOpen && <ChangePolicyDialog record={record} onClose={() => setChangeOpen(false)} onDone={reload} />}
                {editRequest && <EditRequestDialog record={record} request={editRequest} onClose={() => setEditRequest(null)} onDone={reload} />}
                {closing && (
                    <CloseRequestDialog mode={closing.mode} record={record} request={closing.request} onClose={() => setClosing(null)} onDone={closedRequest} />
                )}
                {cancelOpen && <RequestCancellationDialog record={record} onClose={() => setCancelOpen(false)} onDone={reload} />}
                {cxlRequest && <CancellationResultDialog record={record} request={cxlRequest} onClose={() => setCxlRequest(null)} onDone={reload} />}
                {cxlPeriod && <CancellationReferenceDialog record={record} period={cxlPeriod} onClose={() => setCxlPeriod(null)} onDone={reload} />}
                {issuesOpen && <CloseIssueDialog record={record} issueId={issuesOpen.issueId} onClose={() => setIssuesOpen(false)} onDone={reload} />}
                {ownerOpen && (
                    <ChangeOwnerDialog mode="single" targets={[targetFromRecord(record)]} onClose={() => setOwnerOpen(false)} onDone={() => { setOwnerOpen(false); reload(); }} />
                )}
                {branchOpen && <ChangeBranchDialog record={record} onClose={() => setBranchOpen(false)} onDone={reload} />}
                {correctOpen && <CorrectRecordDialog record={record} onClose={() => setCorrectOpen(false)} onDone={closedRequest} />}
            </Suspense>
            {followUp.sheetElement}
        </section>
    );
};

export default InsuranceRecordPage;
