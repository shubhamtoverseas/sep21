import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import "../../Views/Pages/Calendar/newui/calendar.css";
import "./follow-up.css";
import CustomSpinner from "../ReusableComponents/CustomSpinner";
import useDialogFocus from "../../hooks/useDialogFocus";
import translation from "../../utils/translation";
import routes from "../../Views/Pages/routes/routesConfig";
import { getSourceTasksAPI } from "../../services/calendar";
import { getCurrentUser } from "../../services/commonService";
import {
    CAL_HTTP, CAL_ROUTE_QUERY, CAL_TASK_CHECK_MARK, CAL_TASK_COPY, CAL_TASK_STATE, FU_COPY_KEY,
} from "../../Views/Pages/Calendar/newui/calendarConstants";
import { taskContextText, taskDisplayState, taskFromRecord } from "../../Views/Pages/Calendar/newui/calendarEvents";
import { formatStamp } from "../../Views/Pages/Calendar/newui/calendarTime";
import useCalendarTaskActions, { canToggleTask } from "../../Views/Pages/Calendar/newui/useCalendarTaskActions";
import { TaskSheet } from "../../Views/Pages/Calendar/newui/CalendarSheet";
import TaskEditorModal from "../../Views/Pages/Calendar/newui/TaskEditorModal";

/*
 * The record-hosted Follow Up sheet (prototype shared/followup-panel.js panelHTML; FIN-F01e; CR "Calendar and Follow Up"): a
 * 440px right sheet over the page. Head row: ‹ (closes the sheet) · FOLLOW UP over "<ref> · <facts>" · Add Follow Up (list
 * view only). List: the outstanding follow-ups this actor can see (due ascending), then HISTORY (completed / cancelled, due
 * descending, read-only rows); a selected task shows "‹ All follow-ups" and the shared task detail in a card, with Open in
 * Calendar; its own reference returns to the record (closes the sheet). A new follow-up opens on its detail once saved.
 * The tasks are the HRMS task records of this source (API A5 GET /hrms/task/list); the server decides access, edit and
 * transfer. A Follow Up carries the record reference alone: no amount, payment state, picker, attachment or payment panel.
 * Esc / backdrop / ‹ close it unless a dialog above it is open; focus returns to the launcher.
 * `inline` (Contract Details → Context panel, prototype Contract_Details.html): rendered in place with the panel's own
 * one-line head (.fu-inline-head) — no backdrop, no dialog.
 */
const due = (task) => (task.date ? formatStamp(`${task.date} ${task.time || '00:00'}`) : '—');
const STATE_LABEL = (task) => CAL_TASK_COPY[taskDisplayState(task)] || CAL_TASK_COPY.outstanding;

/** `inline` (Contract Details → Context panel, prototype Contract_Details.html): rendered in place, no backdrop / dialog.
 *  `embedded` (Job Offer Details profile column, prototype v211 renderProfile → #jod-profile): the drawer's own head and
 *  list, rendered in place of the host's rail content — no backdrop, no dialog, ‹ returns the rail to its host. */
const FollowUpSheet = ({ source, initialTaskId, createContext = null, onClose, onCount, onDenied, inline = false, embedded = false, onSendTemplate }) => {
    const navigate = useNavigate();
    const cardRef = useRef(null);
    const meUserId = useMemo(() => getCurrentUser()?.data?.id ?? null, []);
    const [tasks, setTasks] = useState(null);          /* null = loading */
    const [selectedId, setSelectedId] = useState(null);
    /* a request row opens the editor at once, carrying its launch context (I-16) */
    const [isAddOpen, setIsAddOpen] = useState(Boolean(createContext));
    const [revision, setRevision] = useState(0);
    const arrivalTaskRef = useRef(initialTaskId ? String(initialTaskId) : null);

    const load = useCallback(() => {
        getSourceTasksAPI({ source_type: source.type, source_id: source.id })
            .then((res) => {
                const data = res?.data?.data || {};
                const rows = (Array.isArray(data.tasks) ? data.tasks : []).map(taskFromRecord);
                setTasks(rows);
                onCount?.(Number(data.outstanding_count) || 0);
                /* an arrival (?followup=<id>) selects its task once, only when it belongs to this record and is visible now */
                if (arrivalTaskRef.current) {
                    const hit = rows.find((row) => String(row.taskId) === arrivalTaskRef.current);
                    if (hit) setSelectedId(hit.taskId);
                    arrivalTaskRef.current = null;
                }
            })
            .catch((err) => {
                const status = err?.response?.status;
                if (status === CAL_HTTP.FORBIDDEN || status === 404) { onDenied?.(); return; }
                setTasks((current) => current || []);
            });
    }, [source.type, source.id, onCount, onDenied]);

    useEffect(() => { load(); }, [load, revision]);
    const handleChanged = useCallback(() => setRevision((n) => n + 1), []);
    /* a saved follow-up opens on its own detail (prototype openEditor onSaved → st.sel = t.id) */
    const handleCreated = useCallback((saved) => { if (saved?.id != null) setSelectedId(saved.id); handleChanged(); }, [handleChanged]);
    const actions = useCalendarTaskActions({ onChanged: handleChanged });

    /* the editor / transfer dialogs are portaled to body; the confirm stays inside the card */
    const anyDialogOpen = () => Boolean(cardRef.current?.querySelector('[role="dialog"][aria-modal="true"]') || document.querySelector('.cal-task-editor [role="dialog"]'));
    const close = useCallback(() => { if (!anyDialogOpen()) onClose(); }, [onClose]);
    /* the drawer is a dialog (focus trap, Escape, everything outside inert); the inline / embedded panes are part of the record and must leave it live */
    useDialogFocus(cardRef, close, !inline && !embedded);
    /* after a commit (done / cancel / transfer) the control that had focus is gone: the first present local control takes it
       (prototype followup-panel focusTarget: "‹ All follow-ups" → ‹ back) */
    const focusLocal = useCallback(() => {
        window.requestAnimationFrame(() => (cardRef.current?.querySelector('.fu-to-list') || cardRef.current?.querySelector('.fu-back, .fu-inline-back'))?.focus());
    }, []);

    const dueKey = (row) => `${row.date || ''} ${row.time || ''}`;
    const outstanding = useMemo(() => (tasks || []).filter((row) => row.state === CAL_TASK_STATE.OUTSTANDING).sort((a, b) => (dueKey(a) < dueKey(b) ? -1 : 1)), [tasks]);
    const closed = useMemo(() => (tasks || []).filter((row) => row.state !== CAL_TASK_STATE.OUTSTANDING).sort((a, b) => (dueKey(a) < dueKey(b) ? 1 : -1)), [tasks]);
    const selected = useMemo(() => (tasks || []).find((row) => String(row.taskId) === String(selectedId)) || null, [tasks, selectedId]);

    const openCalendar = useCallback((task) => {
        navigate(`${routes.calendar}?${CAL_ROUTE_QUERY.TASK}=${task.taskId}&${CAL_ROUTE_QUERY.FROM}=${source.from}`);
    }, [navigate, source.from]);

    const renderRow = (task, isHistory) => {
        const display = taskDisplayState(task);
        const busy = actions.busyTaskId !== null && String(actions.busyTaskId) === String(task.taskId);
        const togglable = canToggleTask(task, meUserId) && task.state !== CAL_TASK_STATE.CANCELLED;
        return (
            <div key={task.id} className={`fu-row task-${display}`} data-fu-task={task.taskId}>
                {isHistory ? (
                    <span className="cal-check lg" aria-hidden="true">{CAL_TASK_CHECK_MARK[task.state] || ''}</span>
                ) : (
                    <button
                        type="button"
                        className="cal-check lg"
                        disabled={!togglable || busy}
                        aria-label={`${task.state === CAL_TASK_STATE.COMPLETED ? CAL_TASK_COPY.reopen : CAL_TASK_COPY.markDone}: ${task.title || '—'}`}
                        onClick={() => actions.toggle(task)}
                    >
                        {CAL_TASK_CHECK_MARK[task.state] || ''}
                    </button>
                ) }
                <button type="button" className="fu-main" onClick={ () => setSelectedId(task.taskId) }>
                    <span className="fu-title">{ task.title || '—' }</span>
                    <span className="fu-meta">
                        { !inline && <>{ translation(FU_COPY_KEY.due) } </> }<span className="mono">{ due(task) }</span> · { STATE_LABEL(task) } · { task.responsible?.name || '—' }
                        { taskContextText(task.context) ? ` · ${ taskContextText(task.context) }` : '' }
                    </span>
                </button>
            </div>
        );
    };

    return (
        <Shell inline={inline} embedded={embedded} cardRef={cardRef} close={close} label={translation(FU_COPY_KEY.followUp)} sheetAttr={source.type}>
            {inline ? (
                /* prototype Contract_Details.html v29 pane head: ‹ (closes the pane) · Follow Up over the reference · + Add Follow Up */
                <div className="fu-inline-head">
                    <button type="button" className="fu-inline-back" aria-label={translation('key_back')} onClick={onClose}>‹</button>
                    <div className="fu-inline-title">
                        <div className="t">{translation(FU_COPY_KEY.followUp)}</div>
                        <div className="r mono">{source.ref}</div>
                    </div>
                    {tasks !== null && (
                        <button type="button" className="fu-inline-add" onClick={() => setIsAddOpen(true)}>+ {translation(FU_COPY_KEY.addFollowUp)}</button>
                    )}
                </div>
            ) : (
                <div className="fu-head">
                    <button type="button" className="fu-back" aria-label={translation('key_close')} onClick={onClose}>‹</button>
                    <div className="fu-headtext">
                        <div className="fu-kicker">{translation(FU_COPY_KEY.followUp)}</div>
                        <div className="fu-sub"><span className="mono">{source.ref}</span>{source.sub ? ` · ${source.sub}` : ''}</div>
                    </div>
                    {!selected && tasks !== null && (
                        <button type="button" className="fu-add" onClick={() => setIsAddOpen(true)}>{translation(FU_COPY_KEY.addFollowUp)}</button>
                    )}
                </div>
            )}

                { tasks === null ? <div className="cal-state"><CustomSpinner /></div> : selected ? (
                    <>
                        <button type="button" className="fu-to-list" onClick={ () => setSelectedId(null) }>‹ { translation(FU_COPY_KEY.allFollowUps) }</button>
                        <div className="fu-detail" data-fu-detail={ selected.taskId }>
                            <TaskSheet
                                key={ selected.taskId }
                                row={ selected }
                                taskId={ selected.taskId }
                                meUserId={ meUserId }
                                revision={ revision }
                                actions={ actions }
                                onChanged={ handleChanged }
                                hostSource={ { type: source.type, id: source.id } }
                                onOpenCalendar={ openCalendar }
                                onOpenHost={ onClose }
                                onCommitFocus={ focusLocal }
                                onTransferred={ focusLocal }
                                onSendTemplate={ onSendTemplate }
                            />
                        </div>
                    </>
                ) : (
                    <>
                        { inline && <div className="fu-inline-kicker">{ CAL_TASK_COPY.outstanding } · { outstanding.length }</div> }
                        { outstanding.length === 0
                            ? <div className="fu-empty" data-fu-empty="1">{ translation(FU_COPY_KEY.noOpenFollowUps) }</div>
                            : <div className="fu-list" data-fu-open={ outstanding.length }>{ outstanding.map((task) => renderRow(task, false)) }</div> }
                        { closed.length > 0 && (
                            <>
                                <div className={ inline ? 'fu-inline-kicker' : 'fu-hist-head' }>{ CAL_TASK_COPY.history }{ inline ? ` · ${ closed.length }` : '' }</div>
                                <div className="fu-list" data-fu-hist={ closed.length }>{ closed.map((task) => renderRow(task, true)) }</div>
                            </>
                        ) }
                    </>
                ) }

            {isAddOpen && (
                <TaskEditorModal
                    source={{ type: source.type, id: source.id, ref: source.ref, kindLabel: source.kindLabel, sub: source.sub, label: [source.kindLabel, source.ref, source.sub].filter(Boolean).join(' · '), facts: source.facts, contract: source.contract || null, context: createContext || null }}
                    onClose={() => setIsAddOpen(false)}
                    onSaved={handleCreated}
                />
            )}
        </Shell>
    );
};

/* drawer (backdrop + aside dialog) by default; a plain in-place panel when `inline` / `embedded` */
const Shell = ({ inline, embedded, cardRef, close, label, sheetAttr, children }) => inline
    ? <div ref={cardRef} className="cal-sheet fu-sheet fu-inline" data-fu-sheet={sheetAttr}>{children}</div>
    : embedded
        ? <div ref={cardRef} className="cal-sheet fu-sheet fu-embedded" aria-label={label} data-fu-sheet={sheetAttr}>{children}</div>
        : (
            <div className="fu-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
                <aside ref={cardRef} className="cal-sheet fu-sheet" role="dialog" aria-modal="true" aria-label={label} data-fu-sheet={sheetAttr}>{children}</aside>
            </div>
        );
Shell.propTypes = { inline: PropTypes.bool, embedded: PropTypes.bool, cardRef: PropTypes.object, close: PropTypes.func, label: PropTypes.string, sheetAttr: PropTypes.string, children: PropTypes.node };

FollowUpSheet.propTypes = {
    inline: PropTypes.bool,
    embedded: PropTypes.bool,
    /* the record: { type: HRMS source_type, id, ref, sub: "<type> · <worker>", kindLabel, facts, from: Calendar `from` value } */
    source: PropTypes.shape({
        type: PropTypes.string.isRequired,
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
        ref: PropTypes.string,
        sub: PropTypes.string,
        kindLabel: PropTypes.string,
        facts: PropTypes.object,
        contract: PropTypes.object,
        from: PropTypes.string,
    }).isRequired,
    initialTaskId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    /* the launch context of a sub-record (an Insurance request row): opens the editor at once and is saved on the task */
    createContext: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onCount: PropTypes.func,
    onDenied: PropTypes.func,
    /* (task) the host's Send Template composer (Contract record) */
    onSendTemplate: PropTypes.func,
};

export default FollowUpSheet;
