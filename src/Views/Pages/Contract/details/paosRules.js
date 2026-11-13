import translation from "../../../../utils/translation";
import { formatDate, formatTime, isActive, isClosed, isoOf, todayIso } from "./contractRecordUtils";
import { CR_PAOS_ACTION, CR_PAOS_LABEL_KEYS, CR_PAOS_NEXT, CR_PAOS_OUTCOME_FROM, CR_PAOS_PROGRESS, CR_PAOS_TRI } from "../contractConstants";

/**
 * PAOS rules (CT-06, §PAOS boundaries; prototype v28PaosErrors + v29 + v211 overrides). The stored progress keys are the
 * vocabulary (the API sends the key form — backend answer #8, 14 Oct).
 */
export const paosKey = (value) => (value && CR_PAOS_LABEL_KEYS[value] ? value : CR_PAOS_PROGRESS.TO_ARRANGE);
export const paosLabel = (value) => translation(CR_PAOS_LABEL_KEYS[paosKey(value)]);
export const fill = (text, vars) => Object.keys(vars || {}).reduce((out, k) => out.split(`{${ k }}`).join(vars[k]), text);

/* the recorded arrival: the contract start of an Active (or closed) contract */
export const arrivalIso = (row) => ((isActive(row) || isClosed(row)) ? isoOf(row?.contract_start) : "");
export const hasArrived = (row) => isActive(row) && Boolean(isoOf(row?.contract_start));

/* yes / no / not recorded from whatever the API stores (1/0/null, "yes"/"no", true/false) */
export const triOf = (value) => {
    if (value === null || value === undefined || value === "") return CR_PAOS_TRI.NONE;
    if (value === true || Number(value) === 1 || String(value).toLowerCase() === "yes") return CR_PAOS_TRI.YES;
    if (value === false || Number(value) === 0 || String(value).toLowerCase() === "no") return CR_PAOS_TRI.NO;
    return CR_PAOS_TRI.NONE;
};
export const triToApi = (tri) => (tri === CR_PAOS_TRI.YES ? 1 : tri === CR_PAOS_TRI.NO ? 0 : null);

/* the steps on which attendance is a recorded outcome, and the one on which the certificate is (backend 379) */
export const isOutcomeStep = (progress) => progress === CR_PAOS_PROGRESS.ATTENDED || progress === CR_PAOS_PROGRESS.COMPLETED || progress === CR_PAOS_PROGRESS.NEEDS_REBOOKING;
export const isCertificateStep = (progress) => progress === CR_PAOS_PROGRESS.COMPLETED;

/* Arrange PAOS books a session, so the draft opens on Scheduled — the only step after To arrange (backend 379: a
   session sent with `to_arrange` stored a booking on an unbooked case); every later step opens on the stored one */
export const emptyDraft = (c) => ({
    progress: paosKey(c?.progress) === CR_PAOS_PROGRESS.TO_ARRANGE ? CR_PAOS_PROGRESS.SCHEDULED : paosKey(c?.progress),
    session_date: isoOf(c?.session_date),
    session_time: c?.session_time ? String(c.session_time).slice(0, 5) : "",
    venue: c?.venue || "",
    instructions: c?.instructions || "",
    booking_ref: c?.booking_ref || "",
    attended: triOf(c?.attended),
    attendance_date: isoOf(c?.attendance_date),
    certificate_received: triOf(c?.certificate_received),
    certificate_ref: c?.certificate_ref || "",
    note: "",
});

/* the facts line of the band item and the outcome dialog (prototype v211PaosFacts) */
export const paosFacts = (c, bare = false) => {
    if (!c) return translation("key_cr_paos_no_session");
    const session = c.session_date
        ? `${ bare ? "" : `${ translation("key_session") } ` }${ formatDate(c.session_date) }${ c.session_time ? ` ${ String(c.session_time).slice(0, 5) }` : "" }`
        : translation("key_cr_paos_no_session");
    return [
        session,
        c.venue || "",
        c.booking_ref ? `${ translation("key_cr_paos_booking") } ${ c.booking_ref }` : "",
        triOf(c.certificate_received) === CR_PAOS_TRI.YES ? `${ translation("key_certificate") } ${ c.certificate_ref || translation("key_received") }` : "",
    ].filter(Boolean).join(" · ");
};

/* the band item's action (prototype v211: Arrange PAOS → Update PAOS → View; closed parent: Record outcome / View) */
export const paosAction = (info, row, canEdit) => {
    const c = info?.case;
    const progress = paosKey(c?.progress);
    if (isClosed(row)) {
        if (!c) return null;
        if (progress === CR_PAOS_PROGRESS.COMPLETED) return CR_PAOS_ACTION.VIEW;
        return canEdit && CR_PAOS_OUTCOME_FROM.includes(progress) && c.session_date ? CR_PAOS_ACTION.RECORD_OUTCOME : null;
    }
    if (progress === CR_PAOS_PROGRESS.COMPLETED) return CR_PAOS_ACTION.VIEW;
    if (!canEdit) return null;
    return progress === CR_PAOS_PROGRESS.TO_ARRANGE && !c ? CR_PAOS_ACTION.ARRANGE : (c ? CR_PAOS_ACTION.UPDATE : CR_PAOS_ACTION.ARRANGE);
};

/* progress options: the current step and its edges; on a closed parent no booking / rebooking */
export const progressOptions = (current, outcome) => {
    const next = CR_PAOS_NEXT[current] || [];
    return [current, ...(outcome ? next.filter((n) => n !== CR_PAOS_PROGRESS.SCHEDULED && n !== CR_PAOS_PROGRESS.NEEDS_REBOOKING) : next)];
};

/* field-level validation — the prototype messages verbatim (v28PaosErrors, v29 attendance rules, v211 closed-parent limits) */
export const validatePaos = (draft, current, row, outcome) => {
    const e = {};
    const t = translation;
    const arrived = hasArrived(row);
    const arrIso = arrivalIso(row);
    const next = CR_PAOS_NEXT[current] || [];
    const asserted = draft.progress === CR_PAOS_PROGRESS.COMPLETED || draft.progress === CR_PAOS_PROGRESS.ATTENDED;
    if (draft.progress !== current && !next.includes(draft.progress)) {
        e.progress = fill(t("key_cr_paos_err_only_follows"), { next: next.length ? next.map(paosLabel).join(` ${ t("key_or") } `) : t("key_cr_paos_no_further_step"), current: paosLabel(current) });
    }
    /* a session typed while the step is still To arrange is not a booking: Scheduled is the only step that books */
    if (draft.progress === CR_PAOS_PROGRESS.TO_ARRANGE && (draft.session_date || draft.venue.trim() || draft.booking_ref.trim())) {
        e.progress = fill(t("key_cr_paos_err_only_follows"), { next: paosLabel(CR_PAOS_PROGRESS.SCHEDULED), current: paosLabel(CR_PAOS_PROGRESS.TO_ARRANGE) });
    }
    if (draft.progress === CR_PAOS_PROGRESS.SCHEDULED) {
        if (!draft.session_date) e.session_date = t("key_cr_paos_err_date_required");
        if (!draft.venue.trim()) e.venue = t("key_cr_paos_err_venue_required");
        if (!draft.booking_ref.trim()) e.booking_ref = t("key_cr_paos_err_booking_required");
    }
    if (asserted) {
        if (draft.attended === CR_PAOS_TRI.NO) e.attended = fill(t(outcome ? "key_cr_paos_err_attended_no_closed" : "key_cr_paos_err_attended_no"), { state: paosLabel(draft.progress) });
        else if (draft.attended !== CR_PAOS_TRI.YES) e.attended = t("key_cr_paos_err_attended_yes");
        if (!draft.attendance_date) e.attendance_date = t("key_cr_paos_err_attendance_date");
        else if (arrIso && draft.attendance_date < arrIso) e.attendance_date = fill(t("key_cr_paos_err_before_arrival"), { date: formatDate(arrIso) });
        else if (draft.attendance_date > todayIso()) e.attendance_date = t("key_cr_paos_err_after_today");
        if (!outcome && !arrived) e.progress = e.progress || t("key_cr_paos_err_arrival_not_recorded");
        if (outcome && !arrIso) e.progress = e.progress || t("key_cr_paos_err_arrival_not_recorded");
        if (!draft.session_date) e.session_date = e.session_date || t("key_cr_paos_err_session_required");
    }
    if (draft.progress === CR_PAOS_PROGRESS.COMPLETED) {
        if (draft.certificate_received !== CR_PAOS_TRI.YES) e.certificate_received = t("key_cr_paos_err_cert_received");
        if (!draft.certificate_ref.trim()) e.certificate_ref = t("key_cr_paos_err_cert_ref");
    }
    if (draft.certificate_received === CR_PAOS_TRI.YES && draft.attended === CR_PAOS_TRI.NO) e.certificate_received = e.certificate_received || t("key_cr_paos_err_cert_not_attended");
    if (draft.progress === CR_PAOS_PROGRESS.NEEDS_REBOOKING && !draft.note.trim()) e.note = t("key_cr_paos_err_note");
    if (outcome && (draft.progress === CR_PAOS_PROGRESS.SCHEDULED || draft.progress === CR_PAOS_PROGRESS.NEEDS_REBOOKING)) e.progress = t("key_cr_paos_err_outcome_only");
    return e;
};

/* the save body (backend 379): attendance only on an outcome step, the certificate only on Completed, the session
   only when the dialog may book (never on a closed parent's Record outcome) */
export const paosPayload = (draft, contractId, outcome) => {
    const outcomeStep = isOutcomeStep(draft.progress);
    const certificateStep = isCertificateStep(draft.progress);
    const base = {
        contract_id: Number(contractId),
        progress: draft.progress,
        attended: outcomeStep && draft.attended !== CR_PAOS_TRI.NONE ? draft.attended : null,
        attendance_date: outcomeStep ? (draft.attendance_date || null) : null,
        certificate_received: certificateStep ? (triToApi(draft.certificate_received) ?? 0) : 0,   /* N-14: stored 0 / 1 — unrecorded = 0 */
        certificate_ref: certificateStep ? (draft.certificate_ref.trim() || null) : null,
        note: draft.note.trim() || null,
    };
    if (outcome) return base;
    return {
        ...base,
        session_date: draft.session_date || null,
        session_time: draft.session_time || null,
        venue: draft.venue.trim() || null,
        instructions: draft.instructions.trim() || null,
        booking_ref: draft.booking_ref.trim() || null,
    };
};

/* history: progress events and the prior appointments kept on rebooking (server `history[].event === "rescheduled"`) */
const parseSnapshot = (entry) => { try { return typeof entry.snapshot === "string" ? JSON.parse(entry.snapshot || "{}") : (entry.snapshot || {}); } catch { return {}; } };
export const paosHistory = (info) => {
    const history = Array.isArray(info?.history) ? info.history : [];
    const prior = history.filter((h) => h.event === "rescheduled").map((h) => ({ id: h.id, ...parseSnapshot(h), note: h.note, replacedAt: h.created_at, replacedBy: h.created_by_name }));
    const events = history.filter((h) => h.event !== "rescheduled" && (h.current_progress || h.previous_progress));
    return { prior, events };
};
export const stampOf = (iso) => (iso ? `${ formatDate(iso) } ${ formatTime(iso) }`.trim() : "");
