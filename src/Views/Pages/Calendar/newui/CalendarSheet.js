import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchInterviewDetails } from "../../../../redux/Slices/common/interview/InterviewSlice";
import { viewalendarTask } from "../../../../redux/Slices/calendar/CalendarSlice";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import ConfirmModal from "../../../../components/ui/ConfirmModal";
import translation from "../../../../utils/translation";
import routes from "../../routes/routesConfig";
import {
    CAL_COPY, CAL_HOUR_PX, CAL_INTERVIEW_METHOD, CAL_INTERVIEW_TONE_CLASS, CAL_PIN_HEIGHT_PX, CAL_SHEET_COPY as SHEET_COPY, CAL_SOURCE_FACT_ROWS, CAL_TASK_ACTION, CAL_TASK_CHECK_MARK, CAL_TASK_COPY,
    CAL_TASK_EVENT, CAL_TASK_EVENT_ALERT_TO, CAL_TASK_EVENT_LABEL, CAL_TASK_SOURCE, CAL_TASK_SOURCE_LABEL, CAL_TASK_STATE, FU_COPY_KEY,
} from "./calendarConstants";
import { formatShortDate, formatShortDateDow, formatStamp, timeToMinutes } from "./calendarTime";
import { taskContextText, taskDisplayState, taskFromRecord } from "./calendarEvents";
import { taskSourcePath } from "./calendarSourceLinks";
import { canToggleTask } from "./useCalendarTaskActions";
import { useProcessingPermissions } from "../../../../utils/permissions/processingPermissionsUtils";
import { CR_FOLLOW_UP_QUERY, CR_FOLLOW_UP_SEND_ON } from "../../Contract/contractConstants";
import TaskEditorModal from "./TaskEditorModal";
import TaskTransferDialog from "./TaskTransferDialog";

const isUrl = (value) => /^https?:\/\//i.test(String(value || ''));

/* "task-12" | "12" → 12 */
const hrmsTaskId = (id) => {
    const m = /^(?:task-)?(\d+)$/.exec(String(id || ''));
    return m ? Number(m[1]) : null;
};

const InterviewSheet = ({ row, listStatus }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { interviewDetail, status } = useSelector((state) => state.interview);
    useEffect(() => { if (row?.interviewId) dispatch(fetchInterviewDetails(row.interviewId)); }, [dispatch, row?.interviewId]);
    const loaded = interviewDetail && String(interviewDetail?.interview_id ?? interviewDetail?.id ?? '') === String(row?.interviewId) ? interviewDetail : null;
    const loading = status === 'loading' && !loaded;
    const detail = loaded || {};
    const listMethod = row.method === CAL_INTERVIEW_METHOD.VIDEO ? SHEET_COPY.video : (row.method === CAL_INTERVIEW_METHOD.IN_PERSON ? (row.branchName || SHEET_COPY.inPerson) : '—');
    const methodLabel = detail.office_location === 1 ? SHEET_COPY.video : (detail.office_location_info?.branch_name ? `${ detail.office_location_info.branch_name }` : (detail.office_location != null ? SHEET_COPY.inPerson : listMethod));
    const meet = detail.google_meet_link || row.meetLink || null;
    const workerName = detail.worker_fullname || row.workerName || '—';
    const workerCode = detail.worker_reference_id || row.workerCode || '';
    return (
        <>
            <div className="kicker">{ SHEET_COPY.interview } · { formatShortDateDow(row.date) } { row.start }–{ row.end }</div>
            <h3>{ loaded ? `${ detail.employer_fullname || '—' } × ${ detail.worker_fullname || '—' }` : (row.title || SHEET_COPY.interview) }</h3>
            { loading ? <div className="cal-state"><CustomSpinner /></div> : (
                <div className="grid2">
                    { /* the Job Offer reference opens its delivered record when the row carries its id (prototype joLinkHTML) */ }
                    <div><div className="lb">{ SHEET_COPY.jobOffer }</div>
                        { row.jobOfferId
                            ? <button type="button" className="link mono" onClick={ () => navigate(routes.jobOfferDetails.replace(':jobId', String(row.jobOfferId))) }>{ detail.job_reference_id || detail.job_offer_reference_id || row.jobOfferRef || '—' }</button>
                            : <div className="mono">{ detail.job_reference_id || detail.job_offer_reference_id || row.jobOfferRef || '—' }</div> }
                    </div>
                    <div><div className="lb">{ translation('key_status') }</div><div className={ `stv ${ CAL_INTERVIEW_TONE_CLASS[listStatus] || '' }` }>{ listStatus }{ listStatus === 'Cancelled' && row.cancelledBy ? ` · ${ SHEET_COPY.cancelledBy } ${ row.cancelledBy }` : '' }</div></div>
                    <div><div className="lb">{ translation('key_cs') }</div><div>{ detail.cs_name || row.csOwner?.name || '—' }</div></div>
                    {/* the three saved owners are displayed, never changed here (conflict sheet U-0004 / U-0016) */}
                    <div><div className="lb">{ CAL_TASK_COPY.csAssistant }</div><div>{ row.csAssistant?.name || '—' }</div></div>
                    <div><div className="lb">{ translation('key_interpreter') }</div><div>{ detail.interpreter_name || row.interpreter?.name || '—' }</div></div>
                    <div><div className="lb">{ translation('key_worker') }</div><div>{ workerName }{ workerCode ? <> <span className="mono">{ workerCode }</span></> : null }</div></div>
                    <div className="span2">
                        <div className="lb">{ translation('key_method') }</div>
                        <div>{ methodLabel }</div>
                        { meet && (isUrl(meet)
                            ? <a className="mono meet" href={ meet } target="_blank" rel="noopener noreferrer">{ meet }</a>
                            : <span className="mono">{ meet }</span>) }
                        { !meet && detail.office_location === 1 && <span className="mono muted">—</span> }
                    </div>
                </div>
            ) }
            <div className="note divider">{ SHEET_COPY.ivNote }</div>
        </>
    );
};
InterviewSheet.propTypes = { row: PropTypes.object.isRequired, listStatus: PropTypes.string };

/* same-start interviews: "CS X · CS Assistant Y · Interpreter Z · schedule entries only…" over one card per interview (prototype clusterHTML + the saved team) */
const ClusterSheet = ({ rows, onSelect }) => {
    const first = rows[0];
    const people = [
        first.csOwner?.name ? `${ translation('key_cs') } ${ first.csOwner.name }` : '',
        first.csAssistant?.name ? `${ CAL_TASK_COPY.csAssistant } ${ first.csAssistant.name }` : '',
        first.interpreter?.name ? `${ translation('key_interpreter') } ${ first.interpreter.name }` : '',
    ].filter(Boolean);
    const method = (row) => (row.method === CAL_INTERVIEW_METHOD.VIDEO ? SHEET_COPY.video : (row.method === CAL_INTERVIEW_METHOD.IN_PERSON ? (row.branchName || SHEET_COPY.inPerson) : ''));
    return (
        <>
            <div className="kicker">{ SHEET_COPY.interviews } · { formatShortDateDow(first.date) } { first.start }</div>
            <h3>{ rows.length } { SHEET_COPY.concurrent }</h3>
            <div className="note gap">{ [...people, SHEET_COPY.clusterNote].join(' · ') }</div>
            <div className="cards">
                { rows.map((row) => (
                    <button key={ row.id } type="button" className="card" onClick={ () => onSelect({ kind: 'interview', id: row.id }) }>
                        <span className="card-title">{ row.title || SHEET_COPY.interview }</span>
                        <span className="note">{ [row.jobOfferRef, row.workerCode].filter(Boolean).map((code) => <span key={ code } className="mono">{ code } </span>) }{ row.start }–{ row.end }{ method(row) ? ` · ${ method(row) }` : '' } · { row.status }</span>
                    </button>
                )) }
            </div>
        </>
    );
};
ClusterSheet.propTypes = { rows: PropTypes.array.isRequired, onSelect: PropTypes.func.isRequired };

/* tasks within one marker height of the anchor (the same rule that built the cluster pin): checkbox, title, time · source · state */
const TaskClusterSheet = ({ rows, onSelect, canToggle, onToggle, busyTaskId }) => (
    <>
        <div className="kicker">{ SHEET_COPY.tasks } · { formatShortDateDow(rows[0].date) }</div>
        <h3>{ rows.length } { SHEET_COPY.tasks.toLowerCase() } · { rows[0].time || CAL_COPY.noTime }</h3>
        <div className="note gap">{ SHEET_COPY.taskClusterNote }</div>
        <div className="cards">
            { rows.map((row) => (
                <div key={ row.id } className={ `card task-${ taskDisplayState(row) }` }>
                    <div className="card-row">
                        <button
                            type="button"
                            className="cal-check lg"
                            disabled={ !canToggle(row) || busyTaskId !== null }
                            aria-label={ `${ row.state === CAL_TASK_STATE.COMPLETED ? CAL_TASK_COPY.reopen : CAL_TASK_COPY.markDone }: ${ row.title }` }
                            onClick={ () => onToggle(row) }
                        >
                            { CAL_TASK_CHECK_MARK[row.state] || '' }
                        </button>
                        <button type="button" className="card-title link" onClick={ () => onSelect({ kind: 'task', id: row.id }) }>{ row.title }</button>
                    </div>
                    <span className="note"><span className="mono">{ row.time || CAL_COPY.noTime }</span> · { row.sourceLabel } · { CAL_TASK_COPY[taskDisplayState(row)] || CAL_TASK_COPY.outstanding }</span>
                </div>
            )) }
        </div>
    </>
);
TaskClusterSheet.propTypes = { rows: PropTypes.array.isRequired, onSelect: PropTypes.func.isRequired, canToggle: PropTypes.func.isRequired, onToggle: PropTypes.func.isRequired, busyTaskId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };

/* "Rescheduled → 6 Oct 2026 16:23" · "Responsibility transferred · Linda Wong → Stella Ng" · "Due alert delivered to Linda Wong" */
const historyLabel = (entry) => {
    const base = CAL_TASK_EVENT_LABEL[entry?.event] || entry?.event || '';
    const details = entry?.details || {};
    if (entry?.event === CAL_TASK_EVENT.RESCHEDULED && details.to) return `${ base } → ${ formatStamp(details.to) }`;
    if (entry?.event === CAL_TASK_EVENT.TRANSFERRED && details.from && details.to) return `${ base } · ${ details.from.name || details.from.id } → ${ details.to.name || details.to.id }`;
    if (entry?.event === CAL_TASK_EVENT.ALERT_SENT && details.to?.name) return `${ translation(CAL_TASK_EVENT_ALERT_TO) } ${ details.to.name }`;
    return base;
};


const sameId = (a, b) => a !== null && a !== undefined && String(a) === String(b);

/*
 * The task detail (prototype shared/task-ui.js detailHTML) on the HRMS task record (API spec §2.5 / A2): state checkbox +
 * title, the due line in HKT, Responsible staff (linked) and Created by, the source block or the unlinked note, Notes,
 * the actions the server allows this caller (`can_edit` → Edit / Mark done / Cancel task, `can_transfer` → Transfer),
 * Open in <source>, and the append-only History. Cancel task asks first (conflict sheet U-0008).
 * Hosted on a record's Follow Up sheet (S10, prototype detailHTML { hostSource, calendarLink }): the own record's reference is
 * dark text and there is no "Open in <source>"; "Open in Calendar" is offered instead.
 */
const isHostSource = (task, hostSource) => Boolean(hostSource && task?.source === hostSource.type && sameId(task?.sourceId, hostSource.id));

/* the facts line after the reference ("Standalone · Analyn Bautista"): the HRMS label without its leading reference */
const sourceSub = (task) => {
    const label = String(task?.sourceLabel || '');
    const ref = String(task?.sourceRef || '');
    return ref && label.startsWith(`${ ref } · `) ? label.slice(ref.length + 3) : (label === ref ? '' : label);
};

export const TaskSheet = ({ row, taskId, meUserId, revision, actions, onChanged, onAnchorDate, hostSource, onOpenCalendar, onOpenHost, onMissing, onLoaded, onCommitFocus, onTransferred, onSendTemplate }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const taskDetail = useSelector((state) => state.calendar.taskDetail);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const [isMissing, setIsMissing] = useState(false);
    const numericId = hrmsTaskId(taskId);
    const onMissingRef = useRef(onMissing); onMissingRef.current = onMissing;
    useEffect(() => {
        if (!numericId) return;
        setIsMissing(false);
        dispatch(viewalendarTask(numericId)).then((res) => { if (res?.error) { setIsMissing(true); onMissingRef.current?.(); } });
    }, [dispatch, numericId, revision]);
    const detail = numericId && !isMissing && taskDetail && String(taskDetail?.id ?? '') === String(numericId) ? taskDetail : null;
    const task = useMemo(() => (detail ? taskFromRecord(detail) : row), [detail, row]);
    /* the host learns the loaded task once (an arrival may switch Staff to the task's owner) */
    const onLoadedRef = useRef(onLoaded); onLoadedRef.current = onLoaded;
    const loadedFor = useRef(null);
    useEffect(() => {
        if (!detail || loadedFor.current === detail.id) return;
        loadedFor.current = detail.id;
        onLoadedRef.current?.(taskFromRecord(detail));
    }, [detail]);
    /* a commit unmounts the row of controls that had focus: the host moves focus to a local control (ACCEPTANCE) */
    const commit = (promise) => promise.then((ok) => { if (ok) onCommitFocus?.(); return ok; });
    /* a task named in the address but outside the visible days: anchor the date to its due */
    useEffect(() => { if (!row && task?.date && onAnchorDate) onAnchorDate(task.date); }, [row, task?.date, onAnchorDate]);
    const history = useMemo(() => (Array.isArray(detail?.history) ? [...detail.history].reverse() : []), [detail]);
    const onHost = isHostSource(task, hostSource);
    const sourcePath = useMemo(() => (onHost ? null : taskSourcePath(task)), [task, onHost]);
    /* Send Template from a Contract task (U-0013; prototype taskDetailHTML sendPerm): Stage Actions — Send Template in the
       contract's owner / non-owner context; the host composer when the Contract record hosts the sheet, else the record itself
       opens with &send=1 (prototype ACT.send) */
    const { permissionList, ownerOnboardingList } = useSelector((state) => state.users);
    const isContractTask = task?.source === CAL_TASK_SOURCE.CONTRACT;
    const contractPerms = useProcessingPermissions(permissionList, ownerOnboardingList, isContractTask ? task.sourceId : null);
    const canSendTemplate = isContractTask && contractPerms.stageActionPermissions.includes('send_template');
    const sendTemplate = useCallback(() => {
        if (onSendTemplate) { onSendTemplate(task); return; }
        if (sourcePath) navigate(`${ sourcePath }&${ CR_FOLLOW_UP_QUERY.SEND }=${ CR_FOLLOW_UP_SEND_ON }`);
    }, [onSendTemplate, task, sourcePath, navigate]);
    const openSource = useCallback(() => { if (sourcePath) navigate(sourcePath); }, [navigate, sourcePath]);

    if (!task) return isMissing ? <div className="note">{ CAL_COPY.unavailable }</div> : <div className="cal-state"><CustomSpinner /></div>;

    const display = taskDisplayState(task);
    const linked = Boolean(task.source);
    const open = task.state === CAL_TASK_STATE.OUTSTANDING;
    const busy = actions.busyTaskId !== null && sameId(actions.busyTaskId, task.taskId);
    const togglable = canToggleTask(task, meUserId);
    const kindLabel = CAL_TASK_SOURCE_LABEL[task.source] || '';
    const responsibleIsMe = sameId(meUserId, task.responsible?.id);
    const creatorIsMe = sameId(meUserId, task.createdBy?.id);
    const context = taskContextText(task.context);
    return (
        <>
            { !hostSource && <div className="kicker">{ SHEET_COPY.task }</div> }
            <div className={ `cal-task-detail task-${ display }` } data-cal-task-detail={ taskId } data-task-source={ linked ? `${ task.source }:${ task.sourceId ?? '' }` : 'none' }>
                <div className="hd">
                    <button
                        type="button"
                        className="cal-check xl"
                        disabled={ !togglable || busy }
                        aria-label={ `${ task.state === CAL_TASK_STATE.COMPLETED ? CAL_TASK_COPY.reopen : CAL_TASK_COPY.markDone }: ${ task.title || '—' }` }
                        onClick={ () => actions.toggle(task) }
                    >
                        { CAL_TASK_CHECK_MARK[task.state] || '' }
                    </button>
                    <h3>{ task.title || '—' }</h3>
                </div>
                <div className="due">
                    <span>{ SHEET_COPY.due } <b className="mono">{ task.date ? `${ formatShortDate(task.date) } ${ task.date.slice(0, 4) } ${ task.time || CAL_COPY.noTime }` : '—' }</b> { CAL_TASK_COPY.timeZone }</span>
                    <span className="stl">{ CAL_TASK_COPY[display] || CAL_TASK_COPY.outstanding }</span>
                </div>
                <div className="grid2">
                    { linked && (
                        <div data-task-responsible={ task.responsible?.id ?? '' }>
                            <div className="lb">{ CAL_TASK_COPY.responsibleStaff }</div>
                            <div className="who">{ task.responsible?.name || '—' } <span className="soft">· { responsibleIsMe ? CAL_TASK_COPY.you : CAL_TASK_COPY.viewOnly }</span></div>
                        </div>
                    ) }
                    <div data-task-creator={ task.createdBy?.id ?? '' }>
                            <div className="lb">{ CAL_TASK_COPY.createdBy }</div>
                            <div className={ linked ? undefined : 'who' }>{ task.createdBy?.name || '—' }{ !linked && <span className="soft"> · { creatorIsMe ? CAL_TASK_COPY.you : CAL_TASK_COPY.viewOnly }</span> }</div>
                        </div>
                    { linked ? (
                        <>
                            <div className="span2">
                                <div className="lb">{ SHEET_COPY.sourceRecord }{ kindLabel ? ` · ${ kindLabel }` : '' }</div>
                                { sourcePath && task.sourceRef
                                    ? <button type="button" className="link" onClick={ openSource }>{ task.sourceRef }</button>
                                    : (onHost && task.sourceRef
                                        /* its own record: the reference returns to it (prototype task-ui data-source-self → close the sheet) */
                                        ? (onOpenHost ? <button type="button" className="link" data-source-self="1" onClick={ onOpenHost }>{ task.sourceRef }</button> : <div className="mono">{ task.sourceRef }</div>)
                                        : null) }
                                { !task.sourceFacts && <div>{ task.sourceLabel }</div> }
                            </div>
                            { task.sourceFacts && CAL_SOURCE_FACT_ROWS.filter(([key]) => task.sourceFacts[key]).map(([key, label]) => (
                                <div key={ key } data-task-fact={ key }><div className="lb">{ translation(label) }</div><div>{ task.sourceFacts[key] }</div></div>
                            )) }
                            { context && <div className="span2"><div className="lb">{ CAL_TASK_COPY.contextLabel }</div><div data-task-context="1">{ context }</div></div> }
                        </>
                    ) : (
                        <div className="span2 note">{ SHEET_COPY.unlinked }</div>
                    ) }
                </div>
                <div className="notes">
                    <div className="lb">{ SHEET_COPY.notes } <span>· { CAL_TASK_COPY.internalOnly }</span></div>
                    <div className={ task.notes ? 'txt' : 'note' }>{ task.notes || SHEET_COPY.noNotes }</div>
                </div>
                { open && task.canEdit && (
                    <div className="acts">
                        <button type="button" className="act" disabled={ busy } onClick={ () => setIsEditOpen(true) }>{ translation('key_edit') }</button>
                        <button type="button" className="act" disabled={ busy } onClick={ () => commit(actions.changeStatus(task.taskId, CAL_TASK_ACTION.COMPLETE)) }>{ CAL_TASK_COPY.markDone }</button>
                        <button type="button" className="act danger" disabled={ busy } onClick={ () => setIsCancelOpen(true) }>{ CAL_TASK_COPY.cancelTask }</button>
                    </div>
                ) }
                { open && !task.canEdit && (
                    <div className="note box restricted" data-cal-restricted="1">{ linked ? CAL_TASK_COPY.onlyResponsible : CAL_TASK_COPY.onlyCreator }</div>
                ) }
                { ((open && task.canTransfer) || (open && canSendTemplate && (onSendTemplate || sourcePath)) || sourcePath || (onOpenCalendar && task.taskId)) && (
                    <div className="acts second">
                        { open && task.canTransfer && <button type="button" className="act" disabled={ busy } onClick={ () => setIsTransferOpen(true) }>{ CAL_TASK_COPY.transfer }</button> }
                        { open && canSendTemplate && (onSendTemplate || sourcePath) && <button type="button" className="act" data-task-send="1" disabled={ busy } onClick={ sendTemplate }>{ CAL_TASK_COPY.sendTemplate }</button> }
                        { sourcePath && <button type="button" className="act" onClick={ openSource }>{ CAL_TASK_COPY.openIn } { kindLabel }</button> }
                        { onOpenCalendar && task.taskId && <button type="button" className="act" onClick={ () => onOpenCalendar(task) }>{ translation(FU_COPY_KEY.openInCalendar) }</button> }
                    </div>
                ) }
                { open && isContractTask && !canSendTemplate && <div className="note" data-cal-nosend="1">{ CAL_TASK_COPY.noSendPerm }</div> }
                <div className="hist">
                    <div className="kicker">{ CAL_TASK_COPY.history }</div>
                    { history.length === 0 && <div className="note">{ CAL_TASK_COPY.noHistory }</div> }
                    { history.map((entry, index) => (
                        <div key={ `${ entry.event }-${ entry.created_at }-${ index }` } className="hist-row">
                            <div>{ historyLabel(entry) }</div>
                            <div className="who">{ entry.actor_name || CAL_TASK_COPY.system } · { formatStamp(entry.created_at) }</div>
                        </div>
                    )) }
                </div>
            </div>
            { isCancelOpen && (
                <ConfirmModal
                    title={ CAL_TASK_COPY.cancelConfirmTitle }
                    body={ CAL_TASK_COPY.cancelConfirmBody }
                    confirmLabel={ CAL_TASK_COPY.cancelTask }
                    danger
                    busy={ busy }
                    onConfirm={ () => commit(actions.changeStatus(task.taskId, CAL_TASK_ACTION.CANCEL)).then(() => setIsCancelOpen(false)) }
                    onClose={ () => setIsCancelOpen(false) }
                />
            ) }
            { isEditOpen && (
                <TaskEditorModal
                    task={ { id: task.taskId, title: task.title, date: task.date, time: task.time || '', notes: task.notes, version: task.version, responsible: task.responsible, createdBy: task.createdBy } }
                    source={ linked ? { type: task.source, id: task.sourceId, ref: task.sourceRef, kindLabel, sub: sourceSub(task), label: task.sourceLabel, facts: task.sourceFacts } : null }
                    onClose={ () => setIsEditOpen(false) }
                    onSaved={ onChanged }
                    onStale={ onChanged }
                />
            ) }
            { isTransferOpen && (
                <TaskTransferDialog task={ task } onClose={ () => setIsTransferOpen(false) } onDone={ (target) => { onChanged(); onTransferred?.(target); } } />
            ) }
        </>
    );
};
TaskSheet.propTypes = {
    row: PropTypes.object,
    taskId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    meUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    revision: PropTypes.number,
    actions: PropTypes.shape({ busyTaskId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), toggle: PropTypes.func, changeStatus: PropTypes.func }).isRequired,
    onChanged: PropTypes.func.isRequired,
    onAnchorDate: PropTypes.func,
    hostSource: PropTypes.shape({ type: PropTypes.string, id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) }),
    onOpenCalendar: PropTypes.func,
    onOpenHost: PropTypes.func,
    /* the task behind `taskId` is gone or not visible to this caller */
    onMissing: PropTypes.func,
    /* (task) once the detail is loaded */
    onLoaded: PropTypes.func,
    /* after Mark done / Cancel task committed: move focus to a local control */
    onCommitFocus: PropTypes.func,
    /* (target staff) after a transfer committed */
    onTransferred: PropTypes.func,
    /* (task) the host's Send Template composer for a Contract task; without it the Contract record opens with &send=1 */
    onSendTemplate: PropTypes.func,
};

/*
 * The contextual sheet (prototype sheetHTML): one 360px aside over the body for interview / cluster / task-cluster / task.
 * × closes; Escape is handled by the page; a back link appears when the arrival carried `from=`.
 */
const CalendarSheet = ({ selected, interviews, tasks, from, meUserId, revision, actions, staffIsMe = true, onClose, onBack, onSelect, onChanged, onAnchorDate, onRendered, onMissing, onLoaded, canToggle, onToggle }) => {
    const closeRef = useRef(null);
    useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, [selected?.kind, selected?.id]);
    const focusClose = useCallback(() => closeRef.current?.focus({ preventScroll: true }), []);
    /* a transfer on the "Me" calendar moves the task off this calendar: the sheet closes and focus returns to a local control */
    const handleTransferred = useCallback(() => { if (staffIsMe) onClose(); else focusClose(); }, [staffIsMe, onClose, focusClose]);

    const content = useMemo(() => {
        if (!selected) return null;
        if (selected.kind === 'interview') {
            const row = interviews.find((item) => item.id === selected.id);
            return row ? { aria: SHEET_COPY.interview, node: <InterviewSheet row={ row } listStatus={ row.status } /> } : null;
        }
        if (selected.kind === 'cluster') {
            const [date, start] = String(selected.id).split(' ');
            const rows = interviews.filter((item) => item.date === date && item.start === start);
            return rows.length ? { aria: SHEET_COPY.interviews, node: <ClusterSheet rows={ rows } onSelect={ onSelect } /> } : null;
        }
        if (selected.kind === 'taskcluster') {
            const [date, time] = String(selected.id).split(' ');
            const anchor = timeToMinutes(time) || 0;
            const within = (item) => { const gap = ((timeToMinutes(item.time) || 0) - anchor) / 60 * CAL_HOUR_PX; return gap >= 0 && gap < CAL_PIN_HEIGHT_PX; };
            const rows = tasks.filter((item) => item.date === date && within(item)).sort((a, b) => ((a.time || '') < (b.time || '') ? -1 : 1));
            return rows.length ? { aria: SHEET_COPY.tasks, node: <TaskClusterSheet rows={ rows } onSelect={ onSelect } canToggle={ canToggle } onToggle={ onToggle } busyTaskId={ actions.busyTaskId } /> } : null;
        }
        if (selected.kind === 'task') {
            const row = tasks.find((item) => item.id === selected.id || item.id === `task-${ selected.id }`) || null;
            return { aria: SHEET_COPY.task, node: <TaskSheet key={ selected.id } row={ row } taskId={ selected.id } meUserId={ meUserId } revision={ revision } actions={ actions } onChanged={ onChanged } onAnchorDate={ onAnchorDate } onMissing={ onMissing } onLoaded={ onLoaded } onCommitFocus={ focusClose } onTransferred={ handleTransferred } /> };
        }
        return null;
    }, [selected, interviews, tasks, meUserId, revision, actions, onSelect, onChanged, onAnchorDate, onMissing, onLoaded, focusClose, handleTransferred, canToggle, onToggle]);

    /* the host shifts the grid only while a sheet is really on screen */
    const shown = Boolean(content);
    useEffect(() => { onRendered?.(shown); }, [shown, onRendered]);

    if (!content) return null;
    return (
        <aside className="cal-sheet" data-cal-sheet={ selected.kind } aria-label={ content.aria }>
            <div className="top">
                { from && <button type="button" className="back" onClick={ onBack }>‹ { from === 'notifications' ? SHEET_COPY.backToNotifications : SHEET_COPY.back }</button> }
                <button ref={ closeRef } type="button" className="x" aria-label={ translation('key_close') } onClick={ onClose }>×</button>
            </div>
            { content.node }
        </aside>
    );
};

CalendarSheet.propTypes = {
    selected: PropTypes.shape({ kind: PropTypes.string, id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) }),
    interviews: PropTypes.array.isRequired,
    tasks: PropTypes.array.isRequired,
    from: PropTypes.string,
    meUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    revision: PropTypes.number,
    actions: PropTypes.object.isRequired,
    staffIsMe: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onBack: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    onChanged: PropTypes.func.isRequired,
    onAnchorDate: PropTypes.func.isRequired,
    onRendered: PropTypes.func,
    onMissing: PropTypes.func,
    onLoaded: PropTypes.func,
    canToggle: PropTypes.func,
    onToggle: PropTypes.func,
};

export default React.memo(CalendarSheet);
