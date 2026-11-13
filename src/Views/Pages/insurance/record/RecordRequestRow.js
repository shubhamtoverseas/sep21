import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import Btn from "../../../../components/ui/Btn";
import listStyles from "../../Invoice/InvoiceList.module.css";
import styles from "./InsuranceRecord.module.css";
import { fmtDateLong, translation } from "../dashboard/insuranceDashboardConfig";
import { FU_COPY_KEY } from "../../Calendar/newui/calendarConstants";
import { RequestTag, WarningNote } from "../shared/InsuranceWorkTags";
import {
    REQUEST_STATE, actionLabel, chargeText, confirmLabel, invoiceStatusLabel, requestDescription, requestTypeText, who,
} from "./insuranceRecordConfig";

/* details.js requestRow: the request's type tag (its own tone, INS08) + its outcome label once closed — an open request
   carries no extra "Open" badge (C4; gap matrix INS08-8) — and the description; request facts; "Request details: …";
   attribution; the row's own buttons on open requests (hidden when the actor does not hold the action), the result action
   named for the request type (INS02), and Follow Up. Needs attention and Period cancelled are warning text, not tags. */
const RecordRequestRow = ({ request: rq, onAction, canFollowUp, arrived = false }) => {
    const pending = rq.state === "pending";
    /* a follow-up's source link returns to the request it was launched from: the row comes into view and takes focus once */
    const rowRef = useRef(null);
    useEffect(() => {
        if (!arrived || !rowRef.current) return;
        rowRef.current.scrollIntoView?.({ block: "center" });
        rowRef.current.focus();
    }, [arrived]);
    const state = REQUEST_STATE[rq.state];
    const b = rq.buttons;
    const line2 = [];
    if (rq.requestedEffective) {
        line2.push(`${translation("key_ins_requested_effective", { date: fmtDateLong(rq.requestedEffective) })}${rq.dateSource === "E-Visa payment date" ? ` ${translation("key_ins_evisa_date")}` : ""}`);
    }
    if (rq.type === "Endorsement") line2.push(chargeText(rq.chargeApplies));
    if (rq.type !== "Cancellation") {
        if (rq.invoice) line2.push(`${rq.invoice.ref} (${invoiceStatusLabel(rq.invoice.status)})`);
        else if (!rq.hasInvoice) line2.push(translation("key_ins_no_invoice"));
    }

    const closedKey = rq.state === "rejected" ? "key_ins_rejected_by" : "key_ins_withdrawn_by";
    const buttons = pending && b ? [
        b.record && <Btn key="record" variant="primary" className={styles.btnSm} data-action="confirm-req" onClick={() => onAction("record", rq)}>{confirmLabel(rq.type)}</Btn>,
        b.edit && <Btn key="edit" variant="secondary" className={styles.btnSm} onClick={() => onAction("editRequest", rq)}>{translation("key_ins_edit")}</Btn>,
        b.withdraw && <Btn key="withdraw" variant="secondary" className={styles.btnSm} onClick={() => onAction("cancelRequest", rq)}>{actionLabel("cancelRequest")}</Btn>,
        b.reject && <Btn key="reject" variant="danger" className={styles.btnSm} onClick={() => onAction("reject", rq)}>{translation("key_ins_reject")}</Btn>,
    ].filter(Boolean) : [];
    return (
        <div ref={rowRef} className={`${styles.item} ${styles.requestItem}${arrived ? ` ${styles.arrived}` : ""}`} data-request={rq.id} data-state={rq.state}
            data-arrived={arrived ? "true" : undefined} tabIndex={arrived ? -1 : undefined}>
            <div className={styles.itemMain}>
                <div className={styles.itemTitle}>
                    <RequestTag type={rq.type} />
                    {!pending && state && <span className={listStyles.statusTag} data-tone={state.tone} data-request-state={rq.state}>{translation(state.key)}</span>}
                    <span>{requestDescription(rq)}</span>
                    {rq.attention && <WarningNote data-note="attention">{translation("key_ins_work_attention")}</WarningNote>}
                    {rq.periodEnded && <WarningNote data-note="period-ended">{translation("key_ins_period_cancelled")}</WarningNote>}
                </div>
                {line2.length > 0 && <div className={styles.itemLine}>{line2.join(" · ")}</div>}
                {rq.grace?.text && <div className={`${styles.itemLine} ${styles.warn}`}>{rq.grace.text}</div>}
                {rq.remarks && (
                    <div className={`${styles.itemLine} ${styles.requestDetails}`}>
                        <span className={styles.requestDetailsLabel}>{`${translation("key_ins_request_details")}: `}</span>{rq.remarks}
                    </div>
                )}
                {rq.outcome && (
                    <div className={styles.itemLine}>
                        {translation("key_ins_qbe_outcome", {
                            result: rq.outcome.result,
                            effective: rq.outcome.effective ? ` ${translation("key_ins_effective_date", { date: fmtDateLong(rq.outcome.effective) })}` : "",
                            reason: rq.outcome.reason || "",
                        })}
                        {rq.outcome.carrierRef ? ` · ${rq.outcome.carrierRef}` : ""}
                        {rq.outcome.remarks ? ` · ${rq.outcome.remarks}` : ""}
                    </div>
                )}
                <div className={styles.itemLine}>
                    {translation("key_ins_submitted_by", { who: who(rq.submittedBy) })}
                    {/* a cancellation result is attributed once, by its outcome (prototype store.recordCancellationResult) */}
                    {rq.recordedBy && !rq.outcome?.recordedBy && ` · ${translation("key_ins_recorded_by_who", { who: who(rq.recordedBy) })}`}
                    {rq.outcome?.recordedBy && ` · ${translation("key_ins_recorded_by_who", { who: who(rq.outcome.recordedBy) })}`}
                    {rq.closed && ` · ${translation(closedKey, { who: who(rq.closed.by) })}: ${rq.closed.reason || ""}`}
                </div>
            </div>
            {(buttons.length > 0 || canFollowUp) && (
                <div className={styles.itemActions}>
                    {buttons}
                    {/* I-16: a follow-up launched from this request (its context is saved on the task) */}
                    {canFollowUp && (
                        <Btn variant="secondary" className={styles.btnSm} aria-label={`${translation(FU_COPY_KEY.followUp)} — ${requestTypeText(rq.type)}`}
                            data-fu-request={rq.id} onClick={() => onAction("followUp", rq)}>{translation(FU_COPY_KEY.followUp)}</Btn>
                    )}
                </div>
            )}
        </div>
    );
};

RecordRequestRow.propTypes = {
    request: PropTypes.object.isRequired,
    onAction: PropTypes.func.isRequired,
    canFollowUp: PropTypes.bool,
    arrived: PropTypes.bool,
};

export default React.memo(RecordRequestRow);
