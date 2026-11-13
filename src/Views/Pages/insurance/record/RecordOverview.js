import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import Btn from "../../../../components/ui/Btn";
import Icon from "../../../../components/Icon/Icon";
import routes from "../../routes/routesConfig";
import listStyles from "../../Invoice/InvoiceList.module.css";
import styles from "./InsuranceRecord.module.css";
import RecordRequestRow from "./RecordRequestRow";
import { WarningNote } from "../shared/InsuranceWorkTags";
import {
    coverageDetail, endsDate, fmtDateLong, fmtDateShort, fmtDateTime, translation,
} from "../dashboard/insuranceDashboardConfig";
import {
    PERIOD_TONE, actionLabel, periodLabel, scopeLabel, who,
} from "./insuranceRecordConfig";

const Pill = ({ tone, children, title, legacy }) => (
    <span className={`${listStyles.statusTag} ${legacy ? styles.pillLegacy : ""}`} data-tone={tone} title={title}>{children}</span>
);
Pill.propTypes = { tone: PropTypes.string, children: PropTypes.node, title: PropTypes.string, legacy: PropTypes.bool };

const Panel = ({ title, count, extra, tight, children, name }) => (
    <section className={styles.panel} data-panel={name}>
        <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>{title}</h3>
            {count != null && <span className={styles.panelCount}>{count}</span>}
            <span className={styles.spacer} />
            {extra}
        </div>
        <div className={tight ? styles.panelBodyTight : styles.panelBody}>{children}</div>
    </section>
);
Panel.propTypes = {
    title: PropTypes.node, count: PropTypes.node, extra: PropTypes.node, tight: PropTypes.bool, children: PropTypes.node, name: PropTypes.string,
};

const invoiceText = (invoice) => (invoice ? invoice.ref : "");
const workerPath = (id) => routes.workerDetails.replace(":worker_id", id).replace("/:tab?", "");

/* details.js periodRow. A migrated (legacy) cancellation keeps its raw status as evidence, marked with the hatched edge
   and the legacy pill (ACT #40, INS #54); the value is never relabelled. */
const PeriodRow = ({ period: p, legacyRaw, onAction }) => {
    const tone = PERIOD_TONE[p.status] || "neutral";
    const c = p.cancellation;
    const legacy = !!c?.legacy;
    const line1 = [`${fmtDateLong(p.effective)} – ${fmtDateLong(p.expiry)}`, p.plan || "—", p.provider];
    if (p.requestedEffective && p.requestedEffective !== p.effective) line1.push(translation("key_ins_requested_date", { date: fmtDateLong(p.requestedEffective) }));
    if (p.invoice) line1.push(invoiceText(p.invoice));
    return (
        <>
            {p.gapBefore?.days && (
                <div className={styles.gap}>
                    {`${translation("key_ins_gap_days", { n: p.gapBefore.days })} · ${fmtDateShort(p.gapBefore.from)} – ${fmtDateShort(p.gapBefore.to)}`}
                </div>
            )}
            {p.gapBefore?.overlapDays && (
                <div className={`${styles.gap} ${styles.gapNeutral}`}>{translation("key_ins_overlap_days", { n: p.gapBefore.overlapDays })}</div>
            )}
            <div className={`${styles.period} ${legacy ? styles.legacy : ""}`} data-period={p.id} data-status={p.status}>
                <span className={styles.bar} data-tone={tone} />
                <div className={styles.itemMain}>
                    <div className={styles.itemTitle}>
                        {translation(p.kind === "renewal" ? "key_ins_period_renewal" : "key_ins_period_initial")}
                        <Pill tone={tone} legacy={legacy}>{periodLabel(p)}</Pill>
                        <span className={`${styles.mono} ${styles.muted}`}>{p.carrierRef}</span>
                    </div>
                    <div className={styles.itemLine}>{line1.join(" · ")}</div>
                    <div className={styles.itemLine}>
                        {translation("key_ins_recorded_by_who", { who: who(p.recordedBy) || "—" })}
                        {p.carrierAcceptanceNote ? ` · ${p.carrierAcceptanceNote}` : ""}
                    </div>
                    {p.openCancellation && (
                        <div className={styles.itemLine}>
                            <b>{translation("key_ins_cxl_requested")}</b>
                            {` · ${translation("key_ins_requested_effective_lc", { date: fmtDateLong(p.openCancellation.requestedEffective) })} · ${p.openCancellation.reason || ""}. ${translation("key_ins_cxl_current_cover_unchanged")}`}
                        </div>
                    )}
                    {p.amendments.map((a) => (
                        <div key={a.at} className={styles.itemLine}>
                            {translation("key_ins_amended", { at: fmtDateTime(a.at) })}
                            {a.old?.effective && a.old.effective !== a.new?.effective ? ` ${fmtDateLong(a.old.effective)} → ${fmtDateLong(a.new.effective)}` : ""}
                            {a.old?.expiry !== a.new?.expiry ? ` ${fmtDateLong(a.old?.expiry)} → ${fmtDateLong(a.new?.expiry)}` : ""}.
                        </div>
                    ))}
                    {c && (
                        <div className={styles.itemLine}>
                            <b>
                                {c.fromInception ? translation("key_ins_fact_cancelled_inception")
                                    : p.status === "future" || p.status === "ending" ? translation("key_ins_detail_cxl_accepted_ends", { date: fmtDateShort(endsDate(c.effective)) })
                                        : translation("key_ins_fact_cancelled")}
                            </b>
                            {` · ${translation("key_ins_effective_date", { date: fmtDateLong(c.effective) })}`}
                            {c.requestedEffective && c.requestedEffective !== c.effective ? ` (${translation("key_ins_requested_date", { date: fmtDateLong(c.requestedEffective) })})` : ""}
                            {` · ${c.reason || ""} · ${translation("key_ins_recorded_by_lc", { who: who(c.recordedBy) })}`}
                            {c.carrierRef
                                ? <> · <span className={styles.mono}>{c.carrierRef}</span></>
                                : c.addReference
                                    ? <> · <Btn variant="ghost" className={styles.btnSm} onClick={() => onAction("addCancellationRef", p)}>{translation("key_ins_add_qbe_reference")}</Btn></>
                                    : null}
                            {legacy && legacyRaw && <> <span className={styles.synTag}>{translation("key_ins_detail_legacy", { raw: legacyRaw })}</span></>}
                        </div>
                    )}
                    {p.withdrawnCancellation && (
                        <div className={styles.itemLine}>
                            {translation("key_ins_cxl_recorded_in_error", { date: fmtDateLong(p.withdrawnCancellation.effective), at: fmtDateTime(p.withdrawnCancellation.at) })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
PeriodRow.propTypes = { period: PropTypes.object.isRequired, legacyRaw: PropTypes.string, onAction: PropTypes.func.isRequired };

/* A Contract number links only when the viewer can open that Contract (the Contract page's own check, P6A-3) */
export const ContractRef = ({ contract, canOpenContract }) => (canOpenContract?.(contract.id)
    ? <Link className={styles.codeLink} to={routes.processingDetails.replace(":contract_id", contract.id)} title={`${translation("key_contract")} ${contract.number}`}>{contract.number}</Link>
    : <span className={styles.code} data-contract-link="none">{contract.number}</span>);
ContractRef.propTypes = { contract: PropTypes.object.isRequired, canOpenContract: PropTypes.func };

const PartiesPanel = ({ record, canOpenContract }) => {
    const { worker, employer, contract, previously } = record.parties;
    return (
        <Panel name="parties" title={translation("key_ins_parties")}>
            <div className={styles.kv}>
                <div className={styles.k}>{translation("key_worker")}</div>
                <div className={styles.v}>
                    <b>{worker.name}</b>
                    <div className={styles.small}>
                        {worker.code && (worker.id ? <Link className={styles.codeLink} to={workerPath(worker.id)}>{worker.code}</Link> : <span className={styles.code}>{worker.code}</span>)}
                        {worker.insuranceOnly && <> · <span className={styles.tag}>{translation("key_ins_insurance_only")}</span></>}
                    </div>
                </div>
                <div className={styles.k}>{translation("key_employer")}</div>
                <div className={styles.v}>
                    <b>{employer.name}</b>{employer.zh ? ` · ${employer.zh}` : ""}
                    <div className={styles.small}>
                        {employer.code && (employer.id
                            ? <Link className={styles.codeLink} to={routes.employerDetails.replace(":employer_id", employer.id)}>{employer.code}</Link>
                            : <span className={styles.code}>{employer.code}</span>)}
                    </div>
                </div>
                <div className={styles.k}>{translation("key_ins_address_on_policy")}</div>
                <div className={`${styles.v} ${styles.small}`}>{record.parties.addressOnPolicy || <span className={styles.muted}>—</span>}</div>
                <div className={styles.k}>{translation("key_contract")}</div>
                <div className={styles.v}>
                    {contract ? <ContractRef contract={contract} canOpenContract={canOpenContract} /> : translation("key_ins_standalone")}
                </div>
                {previously.length > 0 && (
                    <>
                        <div className={styles.k}>{translation("key_ins_previously")}</div>
                        <div className={`${styles.v} ${styles.small}`}>
                            {previously.map((a) => (
                                <div key={`${a.workerCode}-${a.until}`}>
                                    {`${a.workerName} (${a.workerCode || "—"})${a.contractNumber ? ` · ${a.contractNumber}` : ""} · ${translation("key_ins_until", { at: fmtDateTime(a.until) })}`}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </Panel>
    );
};
PartiesPanel.propTypes = { record: PropTypes.object.isRequired, canOpenContract: PropTypes.func };

/* Overview (details.js overview): open requests first, then Needs attention, Policy periods, Additional coverage and riders;
   Parties beside them. General Remarks and record Follow Up are in Context (INS08; C4). */
const RecordOverview = ({ record, canCloseIssue, canFollowUp, canOpenContract, onAction }) => {
    const cv = record.header.coverage;
    const detail = coverageDetail(cv);
    const pending = record.requests.filter((r) => r.state === "pending");
    return (
        <div className={styles.grid2}>
            <div className={styles.stack}>
                {pending.length > 0 && (
                    <Panel name="pending" tight title={translation("key_ins_work_requests")} count={String(pending.length)}>
                        <div className={styles.list}>
                            {pending.map((rq) => <RecordRequestRow key={rq.id} request={rq} onAction={onAction} canFollowUp={canFollowUp} />)}
                        </div>
                    </Panel>
                )}

                {record.issues.length > 0 && (
                    <Panel
                        name="review"
                        tight
                        title={translation("key_ins_work_attention")}
                        count={translation("key_ins_n_open", { n: record.issues.length })}
                    >
                        <div className={styles.list}>
                            {record.issues.map((issue) => (
                                <div key={issue.id} className={styles.item} data-issue={issue.id}>
                                    <div className={styles.itemMain}>
                                        {/* the issue as warning text, not a coloured tag (INS08; details.js review panel) */}
                                        <div className={`${styles.itemTitle} ${styles.issueTitle}`}><Icon name="alert" size={13} strokeWidth={1.8} />{issue.issue}</div>
                                        <div className={styles.itemLine}>{`${scopeLabel(record, issue.scope)} · ${translation("key_ins_opened", { at: fmtDateTime(issue.openedAt) })}`}</div>
                                    </div>
                                    <div className={`${styles.itemRight} ${styles.muted} ${styles.small}`}>
                                        {translation(issue.blocksRecord ? "key_ins_blocks_record" : "key_ins_coverage_continues")}
                                        {/* Close issue beside the selected issue (INS05; gap matrix INS05-9): this issue only; others stay open */}
                                        {canCloseIssue && (
                                            <Btn variant="secondary" className={styles.btnSm} onClick={() => onAction("dismissReview", issue)}>{actionLabel("dismissReview")}</Btn>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>
                )}

                <Panel name="policy" title={translation("key_ins_policy_periods")} extra={detail ? <span className={styles.panelCount}>{detail}</span> : null}>
                    {record.periods.map((p) => <PeriodRow key={p.id} period={p} legacyRaw={cv.legacy || null} onAction={onAction} />)}
                    {record.voidedPeriods.map((p) => (
                        <div key={p.id} className={`${styles.period} ${styles.voided}`} data-period={p.id} data-status="voided">
                            <span className={styles.bar} />
                            <div className={styles.itemMain}>
                                <div className={styles.itemTitle}>
                                    {translation("key_ins_recorded_in_error")}<Pill tone="neutral">{translation("key_ins_voided")}</Pill>
                                    <span className={`${styles.mono} ${styles.muted}`}>{p.carrierRef}</span>
                                </div>
                                <div className={styles.itemLine}>
                                    {`${fmtDateLong(p.effective)} – ${fmtDateLong(p.expiry)} · ${translation("key_ins_voided_at", { at: fmtDateTime(p.voided.at) })}: ${p.voided.reason || ""}`}
                                </div>
                            </div>
                        </div>
                    ))}
                    {!record.periods.length && !record.voidedPeriods.length && (
                        <div className={`${styles.muted} ${styles.small}`}>
                            {translation(cv.code === "awaiting" ? "key_ins_empty_not_issued" : "key_ins_empty_no_period")}
                        </div>
                    )}
                </Panel>

                {(record.coverages.length > 0 || record.riders.length > 0) && (
                    <Panel name="coverage" title={translation("key_ins_additional_coverage_panel")}>
                        {record.coverages.map((c) => (
                            <div key={`c${c.id}`} className={styles.period}>
                                <span className={styles.bar} data-tone={PERIOD_TONE[c.status]} />
                                <div className={styles.itemMain}>
                                    <div className={styles.itemTitle}>
                                        {c.item}
                                        <Pill tone={PERIOD_TONE[c.status] || "neutral"}>{periodLabel({ ...c, cancellation: null })}</Pill>
                                        {c.attention && <WarningNote data-note="attention">{translation("key_ins_work_attention")}</WarningNote>}
                                        <span className={`${styles.mono} ${styles.muted}`}>{c.carrierRef}</span>
                                    </div>
                                    <div className={styles.itemLine}>
                                        <b>{`${fmtDateLong(c.effective)} – ${fmtDateLong(c.expiry)}`}</b>
                                        {c.requestedEffective && c.requestedEffective !== c.effective ? ` · ${translation("key_ins_requested_date", { date: fmtDateLong(c.requestedEffective) })}` : ""}
                                        {c.invoice ? ` · ${invoiceText(c.invoice)}` : ""}
                                    </div>
                                    <div className={styles.itemLine}>{translation("key_ins_recorded_by_who", { who: who(c.recordedBy) || "—" })}</div>
                                </div>
                            </div>
                        ))}
                        {record.riders.map((r) => (
                            <div key={`r${r.id}`} className={styles.period}>
                                <span className={styles.bar} data-tone="green" />
                                <div className={styles.itemMain}>
                                    <div className={styles.itemTitle}>
                                        {translation("key_ins_rider")}
                                        {r.attention && <WarningNote data-note="attention">{translation("key_ins_work_attention")}</WarningNote>}
                                        <span className={`${styles.mono} ${styles.muted}`}>{r.carrierRef}</span>
                                    </div>
                                    <div className={styles.itemLine}>{[r.text, invoiceText(r.invoice)].filter(Boolean).join(" · ")}</div>
                                    <div className={styles.itemLine}>{translation("key_ins_recorded_by_who", { who: who(r.recordedBy) || "—" })}</div>
                                </div>
                            </div>
                        ))}
                    </Panel>
                )}
            </div>
            <div className={styles.stack}>
                <PartiesPanel record={record} canOpenContract={canOpenContract} />
            </div>
        </div>
    );
};

RecordOverview.propTypes = {
    record: PropTypes.object.isRequired,
    canCloseIssue: PropTypes.bool,
    canFollowUp: PropTypes.bool,
    canOpenContract: PropTypes.func,
    onAction: PropTypes.func.isRequired,
};

export default React.memo(RecordOverview);
