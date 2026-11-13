import dayjs from "../../../../utils/dayjsConfig";
import translation from "../../../../utils/translation";
import { getPermissionValue, hasPermission } from "../../../../services/commonService";
import { headingCase } from "../../../../utils/utils";
import { CONTRACT_STATUS } from "../../ProcessingPage/processingConstants";
import {
    CD_STAGE, CD_STAGE_LABEL_KEYS, CD_STATUS, CD_TOKEN, CD_TONE, CR_EXPECTED_END_YEARS, CR_FINISHED_REASON_ID, CR_OWNER_ROLE, CR_OWNER_ROLE_LABEL_KEYS, CR_PERMISSION, CR_PHASE_TARGETS,
    CR_REOPEN_EXCLUDED_STAGES, CR_STAGE_TERMINAL_TOKEN, CR_STATUS_KEY_BY_ID, CR_STATUS_TOKEN, CR_SUB_TOKEN,
} from "../contractConstants";
import { stageToken } from "../../../../components/Processing/StageTitle";

export const ISO = "YYYY-MM-DD";
export const EM_DASH = "—";
/* the server's message for a failed call: field errors, then message, then a plain error string, then the generic line */
export const apiErrorMessage = (e) => {
    const d = e?.response?.data;
    const fieldErrors = d?.errors && typeof d.errors === "object" ? Object.values(d.errors).flat().join(" ") : "";
    const plain = typeof d?.error === "string" ? d.error : "";
    return fieldErrors || d?.message || plain || (e?.response?.status ? `${ translation("key_something_went_wrong") } (HTTP ${ e.response.status })` : translation("key_something_went_wrong"));
};
export const byName = (a, b) => String(a?.name || "").localeCompare(String(b?.name || ""));

/* ---- dates ---- */
export const isoOf = (value) => {
    if (!value) return "";
    const d = dayjs(String(value).slice(0, 10), ISO, true);
    return d.isValid() ? d.format(ISO) : (dayjs(value).isValid() ? dayjs(value).format(ISO) : "");
};
export const todayIso = () => dayjs().format(ISO);
export const addYears = (iso, years) => (iso ? dayjs(iso).add(years, "year").format(ISO) : "");
export const daysBetween = (fromIso, toIso) => dayjs(toIso).startOf("day").diff(dayjs(fromIso).startOf("day"), "day");
export const formatDate = (value) => (value && dayjs(value).isValid() ? dayjs(value).format("DD/MM/YYYY") : "");
export const formatTime = (value) => (value && dayjs(value).isValid() ? dayjs(value).format("HH:mm") : "");
export const dateOrDash = (value) => formatDate(value) || EM_DASH;
export const money = (value) => (value == null || value === "" ? EM_DASH : `HK$${ Number(value).toLocaleString("en-HK", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }`);
export const initialsOf = (name) => String(name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

/* ---- phase ---- */
export const statusKeyOf = (statusId) => CR_STATUS_KEY_BY_ID[Number(statusId)] || CD_STATUS.PROCESSING;
export const isProcessing = (row) => Number(row?.contract_status) === CONTRACT_STATUS.PROCESSING;
export const isActive = (row) => Number(row?.contract_status) === CONTRACT_STATUS.ACTIVE;
export const isClosed = (row) => [CONTRACT_STATUS.COMPLETED, CONTRACT_STATUS.CANCELLED].includes(Number(row?.contract_status));
/* workbook #8 / backend 322: the client offers only the phase targets the server's status list carries with `enable: true` —
   never adds one, and offers nothing until the list has loaded (Cancel was offered on an already-cancelled record) */
export const phaseTargets = (statusId, serverList) => {
    const allowed = CR_PHASE_TARGETS[Number(statusId)] || [];
    const byId = new Map((serverList || []).map((s) => [Number(s.id), s]));
    return allowed
        .filter((id) => byId.has(id) && byId.get(id).enable !== false && byId.get(id).enable !== 0)
        .map((id) => ({ id, name: headingCase(byId.get(id)?.name || byId.get(id)?.name_en || byId.get(id)?.label || translation(`key_${ statusKeyOf(id) }`)) }));
};
export const reopenableStages = (stages) => (stages || []).filter((stage) => !CR_REOPEN_EXCLUDED_STAGES.includes(stage));

/* ---- completion ---- */
export const expectedEndOf = (startIso, recordedEndIso) => recordedEndIso || (startIso ? addYears(startIso, CR_EXPECTED_END_YEARS) : "");
export const fullTermAllowed = (expectedEndIso) => Boolean(expectedEndIso) && todayIso() >= expectedEndIso;
export const isFinishedReason = (option) => Number(option?.id) === CR_FINISHED_REASON_ID || /finish/i.test(String(option?.admin_panel_status || option?.name || ""));
/* Contract Start must be strictly earlier than a recorded Visa Expiry; a blank expiry never blocks */
export const startVisaConflict = (startIso, visaExpiryIso) => Boolean(startIso && visaExpiryIso && startIso >= visaExpiryIso);

/* ---- the Delay card (prototype delayText): Processing → relative to today; Active / Completed → frozen Contract Start − Requested Start ---- */
export const delayOf = (row) => {
    const requested = isoOf(row?.requested_start_date);
    if (!requested) return null;
    const start = isoOf(row?.contract_start);
    if (isProcessing(row) || !start) {
        if (!isProcessing(row)) return null;
        const n = daysBetween(todayIso(), requested);
        if (n > 0) return { kind: "starts_in", days: n, warn: false };
        if (n === 0) return { kind: "due_today", days: 0, warn: false };
        return { kind: "late", days: -n, warn: true };
    }
    const f = daysBetween(requested, start);
    if (f > 0) return { kind: "late", days: f, warn: true };
    if (f === 0) return { kind: "on_requested_date", days: 0, warn: false };
    return { kind: "early", days: -f, warn: false };
};
export const delayLabel = (delay) => {
    if (!delay) return EM_DASH;
    const unit = (n) => translation(n === 1 ? "key_day" : "key_days").toLowerCase();
    switch (delay.kind) {
        case "starts_in": return `${ translation("key_starts_in") } ${ delay.days } ${ unit(delay.days) }`;
        case "due_today": return translation("key_due_today");
        case "on_requested_date": return translation("key_started_on_requested_date");
        case "early": return `${ translation("key_started") } ${ delay.days } ${ unit(delay.days) } ${ translation("key_early") }`;
        default: return `${ delay.days } ${ unit(delay.days) }`;
    }
};

/* ---- owners (header pill, popover): an empty register reads Unassigned with the neutral avatar ---- */
/* the four registers of a record: id · name · the Inactive flag (`*_is_active === false` on the CS pair, `*_active !== 1` on Prepared / Ready) */
const flagInactive = (name, value) => Boolean(name) && value !== undefined && value !== null && Number(value) !== 1 && value !== true;
export const ownerRows = (row) => [
    { role: CR_OWNER_ROLE.CS, id: row?.cs_owner_id ?? null, name: row?.cs_owner_name || "", labelKey: CR_OWNER_ROLE_LABEL_KEYS[CR_OWNER_ROLE.CS], inactive: flagInactive(row?.cs_owner_name, row?.cs_owner_is_active) },
    { role: CR_OWNER_ROLE.ASSISTANT, id: row?.cs_assistant_id ?? null, name: row?.cs_assistant_name || "", labelKey: CR_OWNER_ROLE_LABEL_KEYS[CR_OWNER_ROLE.ASSISTANT], inactive: flagInactive(row?.cs_assistant_name, row?.cs_assistant_is_active) },
    { role: CR_OWNER_ROLE.PREPARED, id: row?.prepared_owner_id ?? row?.prepared_owner_staff_id ?? null, name: row?.prepared_owner_name || "", labelKey: CR_OWNER_ROLE_LABEL_KEYS[CR_OWNER_ROLE.PREPARED], inactive: flagInactive(row?.prepared_owner_name, row?.prepared_owner_active) },
    { role: CR_OWNER_ROLE.READY, id: row?.ready_owner_id ?? row?.ready_owner_staff_id ?? null, name: row?.ready_owner_name || "", labelKey: CR_OWNER_ROLE_LABEL_KEYS[CR_OWNER_ROLE.READY], inactive: flagInactive(row?.ready_owner_name, row?.ready_owner_active) },
];

/* ---- permissions the record reads beyond processingPermissionsUtils ---- */
export const canOpenWorker = (perms, isPartner) => hasPermission(perms,
    isPartner ? CR_PERMISSION.PARTNER_WORKER_MODULE : CR_PERMISSION.WORKER_MODULE,
    isPartner ? CR_PERMISSION.PARTNER_WORKER_ACCESS : CR_PERMISSION.WORKER_ACCESS);
export const canOpenEmployer = (perms) => hasPermission(perms, CR_PERMISSION.EMPLOYER_MODULE, CR_PERMISSION.EMPLOYER_ACCESS);
/* owner / non-owner rail toggles (Remarks, Chat History) — the Follow Up and chat toggles come from processingPermissionsUtils */
export const railToggle = (perms, isOwner, key) => {
    const prefix = isOwner ? CR_PERMISSION.OWNER_PREFIX : CR_PERMISSION.NON_OWNER_PREFIX;
    return getPermissionValue(perms, prefix, `${ prefix }_${ key }`) === "y";
};

/* ---- activity ---- */
/* prototype logEv: a status change carries the tone of the NEW status (toneName of the stage + status); every other
   event is gray. The log entry has no stage field, so the stage is the entry `type` when it is a stage / sub-stage key,
   else the stage named in the server message ("Changed Consulate status from … to …"). */
const STATUS_CHANGE_RE = /\bstatus\b.*\bto\b|\bset to\b/i;
const STAGE_IN_MESSAGE_RE = /changed\s+(.+?)\s+status\s+from/i;
const NEW_STATUS_IN_MESSAGE_RE = /\b(?:to|set to)\s+([^.·(]+?)\s*$/i;
const ALL_TOKENS = [...Object.values(CD_TOKEN), ...Object.values(CR_SUB_TOKEN)];
export const activityStage = (entry) => {
    const t = String(entry?.type || "").toLowerCase();
    if (Object.values(CD_STAGE).includes(t) || CR_STAGE_TERMINAL_TOKEN[t] !== undefined) return t;
    const m = STAGE_IN_MESSAGE_RE.exec(String(entry?.message || entry?.heading || ""));
    if (!m) return "";
    const label = m[1].trim().toLowerCase();
    const hit = Object.entries(CD_STAGE_LABEL_KEYS).find(([stage, key]) => (
        [translation(key), stage, stage.replace(/_/g, " "), stage.replace(/_/g, "-")].some((c) => String(c).toLowerCase() === label)
    ));
    return hit ? hit[0] : "";
};
export const activityDotTone = (entry) => {
    const message = String(entry?.message || entry?.heading || "");
    if (!STATUS_CHANGE_RE.test(message)) return CD_TONE.GRAY;
    const slug = String(entry?.current_status || "").toLowerCase();
    let label = CR_STATUS_TOKEN[slug] || "";
    if (!label) {
        const m = NEW_STATUS_IN_MESSAGE_RE.exec(message);
        const tail = m ? m[1].trim().toLowerCase() : "";
        label = ALL_TOKENS.find((tok) => tok.toLowerCase() === tail) || "";
    }
    return label ? stageToken(activityStage(entry), null, label).tone : CD_TONE.GRAY;
};
export const groupByDay = (entries) => {
    const sorted = [...(entries || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const groups = []; const seen = {};
    sorted.forEach((entry) => {
        const day = String(entry.created_at || "").slice(0, 10);
        if (!seen[day]) { seen[day] = { day, items: [] }; groups.push(seen[day]); }
        seen[day].items.push(entry);
    });
    return groups;
};

/* backend 377 (v21 §W): one Uploaded flag for one requirement row — `<requirementKey>_uploaded: 1 | 0`; keys not sent stay as stored */
export const uploadedFlagPayload = (type, contractId, requirementKey, value) => ({ type, contract_id: contractId, [`${ requirementKey }_uploaded`]: value === "Yes" ? 1 : 0 });
