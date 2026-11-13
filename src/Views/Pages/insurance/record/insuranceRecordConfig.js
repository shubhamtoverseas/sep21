import configData from "../../../../components/ReusableComponents/app-configs";
import { endsDate, fmtDateLong, fmtDateShort, fmtDateTime, requestTypeLabel, translation } from "../dashboard/insuranceDashboardConfig";

/* Record page vocabulary (INDEX §3.2, §5; ENUMS §D, §I, §J, §O). The server decides availability and
   reasons (R2 actions); this file only names, orders and formats. */

export const ACTION_LABEL_KEYS = {
    renew: "key_ins_action_renew",
    newPolicy: "key_ins_action_new_policy",
    addCoverage: "key_ins_action_add_coverage",
    change: "key_ins_action_change",
    requestCancel: "key_ins_action_request_cancel",
    editRequest: "key_ins_action_edit_request",
    cancelRequest: "key_ins_action_withdraw_request",
    reject: "key_ins_action_reject_request",
    dismissReview: "key_ins_action_close_issue",
    correctStatus: "key_ins_action_correct_record",
    changeCsOwner: "key_ins_change_cs_owner",
    changeBranch: "key_ins_action_change_branch",
};
export const actionLabel = (key) => translation(ACTION_LABEL_KEYS[key]);

/* The result action beside each open request, by request type (rules.js CONFIRM_LABEL; Insurance.txt INS02). There is no
   record-level "Record QBE result". */
export const CONFIRM_LABEL_KEYS = {
    New: "key_ins_confirm_policy",
    Renew: "key_ins_confirm_renewal",
    Coverage: "key_ins_confirm_additional_coverage",
    Endorsement: "key_ins_confirm_changes",
    Cancellation: "key_ins_record_cancellation_outcome",
};
export const confirmLabel = (type) => translation(CONFIRM_LABEL_KEYS[type]);

/* What a confirmation says when it succeeds (Insurance.html forms.openConfirm / openCancellationResult; owner decision P6C-1,
   11 Nov 2026). The server sends the same words; these show only when its reply carries no message. */
export const CONFIRMED_DONE_KEYS = {
    New: "key_ins_confirmed_policy",
    Renew: "key_ins_confirmed_renewal",
    Coverage: "key_ins_confirmed_additional_coverage",
    Endorsement: "key_ins_confirmed_change_applied",
    Cancellation: "key_ins_cancellation_outcome_recorded",
};

/* The record Actions menu holds record-level work only, at most these eight, in three groups split by a separator
   (PROMPT 6; Insurance.html details.js actionList GROUPS Policy · Record · Ownership; UI Correction C1). Request actions
   (Confirm, Edit, Withdraw, Reject, Follow Up) sit on their request row, Close issue beside its issue, record Follow Up in
   Context. A key the server sends that is not listed here is never shown in the menu. */
export const MENU_ACTION_GROUPS = [
    ["renew", "newPolicy", "addCoverage", "change", "requestCancel"],
    ["correctStatus"],
    ["changeCsOwner", "changeBranch"],
];
export const menuActionGroups = (items) => MENU_ACTION_GROUPS
    .map((keys) => keys.map((key) => (items || []).find((i) => i.key === key)).filter(Boolean))
    .filter((group) => group.length > 0);

const WHY_KEYS = {
    noOpenRequest: "key_ins_why_no_open_request",
    noOpenRequestYouCanProcess: "key_ins_why_no_open_request_you_can_process",
    policyCancelled: "key_ins_why_policy_cancelled",
    needsConfirmedPeriod: "key_ins_why_needs_confirmed_period",
    continuedBy: "key_ins_why_continued_by",
    laterRecordContinues: "key_ins_why_later_record_continues",
    newOrRenewalPending: "key_ins_why_new_or_renewal_pending",
    onlyAfterExpiredOrCancelled: "key_ins_why_only_after_expired_or_cancelled",
    needsActivePolicy: "key_ins_why_needs_active_policy",
    needsConfirmedPolicy: "key_ins_why_needs_confirmed_policy",
    cancellationRequestOpen: "key_ins_why_cancellation_request_open",
    cancellationResultRecorded: "key_ins_why_cancellation_result_recorded",
    noPeriodInForce: "key_ins_why_no_period_in_force",
    noOpenRequestToEdit: "key_ins_why_no_open_request_to_edit",
    noOpenRequestToReject: "key_ins_why_no_open_request_to_reject",
    noOpenIssue: "key_ins_why_no_open_issue",
    nothingToCorrect: "key_ins_why_nothing_to_correct",
    followsContract: "key_ins_follows_contract",
};
export const whyText = (code, ref) => (WHY_KEYS[code] ? translation(WHY_KEYS[code], { ref }) : "");
/* A disabled menu entry's reason; a Contract-linked record's owner / branch entries name the Contract they follow
   (details.js: "Follows Contract <number>") */
export const actionReason = (item, contractNumber) => (item.why === "followsContract" && contractNumber
    ? `${translation("key_ins_follows_contract_number")} ${contractNumber}`
    : whyText(item.why, item.whyRef));

/* Period status → label and tone (rules.periodStatus, details.js periodRow; rules.js TONE: future teal) */
export const PERIOD_TONE = { active: "green", ending: "orange", future: "teal", expired: "red", cancelled: "neutral", voided: "neutral" };
export const periodLabel = (period) => {
    switch (period.status) {
        case "active": return translation("key_ins_fact_active");
        case "future": return translation("key_ins_fact_starts", { date: fmtDateShort(period.effective) });
        case "expired": return translation("key_ins_fact_expired");
        case "ending": return translation("key_ins_fact_ends", { date: fmtDateShort(endsDate(period.cancellation?.effective)) });
        default: return translation(period.cancellation?.fromInception ? "key_ins_fact_cancelled_inception" : "key_ins_fact_cancelled");
    }
};

/* Request state → label and tone (details.js STATE, terms reqstate.*) */
export const REQUEST_STATE = {
    pending: { key: "key_ins_reqstate_open", tone: "blue-1" },
    confirmed: { key: "key_ins_reqstate_recorded", tone: "green" },
    accepted: { key: "key_ins_reqstate_accepted", tone: "green" },
    declined: { key: "key_ins_reqstate_declined", tone: "red" },
    rejected: { key: "key_ins_reqstate_rejected", tone: "red" },
    withdrawn: { key: "key_ins_reqstate_withdrawn", tone: "neutral" },
};

const ENDORSEMENT_LABEL_KEYS = {
    address: "key_ins_change_type_address",
    reassign: "key_ins_change_type_reassign",
    extension: "key_ins_change_type_extension",
    rider: "key_ins_change_type_rider",
    name: "key_ins_change_type_name",
    dates: "key_ins_change_type_dates",
};

export const changeTypeLabel = (id) => (ENDORSEMENT_LABEL_KEYS[id] ? translation(ENDORSEMENT_LABEL_KEYS[id]) : "");

/* "Additional charge" choices (forms.openEndorsement / openEdit / openConfirm) */
export const CHARGE_OPTIONS = [
    { value: "unknown", key: "key_ins_charge_option_tbc" },
    { value: "no", key: "key_ins_charge_option_no" },
    { value: "yes", key: "key_ins_charge_option_yes" },
];

/* Cancellation reasons (Insurance.txt INS01; forms.openRequestCancellation): stored as the value, shown with these labels in
   Request cancellation. "Cancelled from inception" is an outcome only, never a reason; older requests keep their stored text. */
export const CANCELLATION_REASON_KEYS = {
    "Cover not required": "key_ins_cxl_reason_cover_not_required",
    "Employment terminated": "key_ins_cxl_reason_employment_terminated",
    "Worker departed": "key_ins_cxl_reason_worker_departed",
    "Replaced by another policy": "key_ins_cxl_reason_replaced",
    Other: "key_ins_cxl_reason_other",
};

/* Request row description (details.js requestRow) */
export const requestDescription = (rq) => {
    switch (rq.type) {
        case "New": return rq.plan || "";
        case "Renew": return [rq.plan, rq.targetPeriodStart ? translation("key_ins_from_date", { date: fmtDateLong(rq.targetPeriodStart) }) : ""].filter(Boolean).join(" · ");
        case "Coverage": return rq.coverageItem || "";
        case "Cancellation": return [
            rq.cancellationPeriod
                ? translation("key_ins_period_range_ref", { from: fmtDateLong(rq.cancellationPeriod.effective), to: fmtDateLong(rq.cancellationPeriod.expiry), ref: rq.cancellationPeriod.carrierRef })
                : "",
            rq.reason,
        ].filter(Boolean).join(" · ");
        case "Endorsement": {
            /* store.describeEndorsement, computed by the server; legacy requests carry the type only */
            const label = changeTypeLabel(rq.endorsement?.type);
            const d = rq.endorsement?.description || "";
            return d ? `${label} — ${d}` : label;
        }
        default: return "";
    }
};

export const requestTypeText = (type) => requestTypeLabel(type);

/* "Name · dd/mm/yy hh:mm" attribution, "System" when there is no actor */
export const who = (person) => {
    if (!person) return "";
    const name = person.name || translation("key_ins_system");
    return person.at ? `${name} · ${fmtDateTime(person.at)}` : name;
};

/* Invoice status label from the existing invoice vocabulary */
export const invoiceStatusLabel = (status) => configData.invoiceStatusIdMapping?.[status]?.label || "";

export const chargeText = (value) => translation(value === "yes" ? "key_ins_charge_yes" : value === "no" ? "key_ins_charge_no" : "key_ins_charge_tbc");

export const scopeLabel = (record, scope) => {
    if (scope.kind === "request") {
        const q = record.requests.find((x) => x.id === scope.id);
        return q ? translation("key_ins_scope_request", { type: requestTypeText(q.type) }) : translation("key_ins_scope_request_plain");
    }
    if (scope.kind === "period") {
        const p = [...record.periods, ...record.voidedPeriods].find((x) => x.id === scope.id);
        return translation("key_ins_scope_period", { ref: p?.carrierRef || "" }).trim();
    }
    if (scope.kind === "coverage") {
        const c = record.coverages.find((x) => x.id === scope.id);
        return translation("key_ins_scope_coverage", { name: c?.item || "" }).trim();
    }
    if (scope.kind === "rider") {
        const r = record.riders.find((x) => x.id === scope.id);
        return translation("key_ins_scope_rider", { text: r?.text || "" }).trim();
    }
    return scope.kind;
};

/* Main tabs: Overview, Requests and Activity only (Insurance.txt INS08; UI Correction C4). Activity is the record's history
   (R3); ownership events are part of it, so there is no Ownership tab. Older ?tab=history and ?tab=ownership links open
   Activity (details.js; gap matrix INS08-3). */
export const RECORD_TABS = [
    { key: "overview", labelKey: "key_ins_tab_overview" },
    { key: "requests", labelKey: "key_ins_tab_requests" },
    { key: "activity", labelKey: "key_activity" },
];
const OLD_TABS = { history: "activity", ownership: "activity" };
/* An older shared Remarks link (?tab=remarks) opens the record on Overview with its Remarks drawer open (details.js; owner
   decision P6B-2, 11 Nov 2026) */
export const REMARKS_LINK_TAB = "remarks";
export const recordTabFromQuery = (value) => {
    if (OLD_TABS[value]) return OLD_TABS[value];
    return RECORD_TABS.some((t) => t.key === value) ? value : "overview";
};
