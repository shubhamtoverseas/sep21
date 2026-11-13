import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { createCalendarTask } from "../../../../redux/Slices/calendar/CalendarSlice";
import { showErrorMessage } from "../../../../services/commonService";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { isAdminUser } from "../../../../services/permissionService";
import { getConfigurationPermissions } from "../../../../utils/permissions/configurationPermissionUtils";
import useDialogFocus from "../../../../hooks/useDialogFocus";
import dayjs from "dayjs";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import TimeInput from "../../../../components/ui/TimeInput";
import translation from "../../../../utils/translation";
import { CAL_HTTP, CAL_SOURCE_FACT_ROWS, CAL_TASK_COPY, FU_COPY_KEY } from "./calendarConstants";
import { taskContextRows } from "./calendarEvents";
import "./taskEditorSource.css";
import useTaskTemplates from "./useTaskTemplates";
import { saveTaskTemplateFlow } from "../../SettingsPage/newui/task-templates/useTaskTemplateManager";
import { TASK_TEMPLATE_STATUS } from "../../SettingsPage/newui/settingsNewUiConstants";

const TaskTemplateFormModal = lazy(() => import("../../SettingsPage/newui/task-templates/TaskTemplateFormModal"));

/*
 * The one task editor (prototype shared/task-editor.js): NEW TASK / EDIT TASK, a title combobox over the agency-shared
 * presets (GET /hrms/task/templates; typed text stays a one-off title), Date * and Time (HKT) *, Notes (optional). Save
 * posts the HRMS task record (API spec A1): a picked preset travels as `template_id` + `title_lang`, an edit carries the
 * `version` it was opened on, and a stale edit (409) keeps the draft and says so. The Notes chooser offers every agency
 * template that carries notes, independently of the title (CR "Calendar and Follow Up"); a non-empty draft asks
 * Replace notes / Cancel before anything is replaced. Create/edit template (managers, U-0260) opens the Task Template
 * Manager's own form over the editor — the same manager flow, not a second library; a library Save writes a new version and
 * refreshes the choices while the task draft stays untouched and nothing is sent.
 * Linked mode (S10, prototype task-editor sourceBlock): opened from a record's Follow Up sheet, the heading reads NEW FOLLOW-UP,
 * the source record is shown read-only (it can never be reassigned) and a create carries `source_type` + `source_id`.
 * Esc closes the open preset list first, then the dialog; Cancel, × and the backdrop never commit.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^\d{2}:\d{2}/;
const norm = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const toApiTime = (hhmm) => (hhmm ? `${ String(hhmm).slice(0, 5) }:00` : null);

const TaskEditorModal = ({ task, source, onClose, onSaved, onStale }) => {
    const dispatch = useDispatch();
    const { templates, refresh: refreshTemplates } = useTaskTemplates();
    const permissionList = useSelector((state) => state.users.permissionList);
    const canManageTemplates = useMemo(() => {
        const grants = getConfigurationPermissions(permissionList);
        return isAdminUser() || Boolean(grants?.canTaskTemplateManager);
    }, [permissionList]);

    const mode = task ? 'edit' : 'add';
    const [title, setTitle] = useState(task?.title || '');
    const [date, setDate] = useState(task?.date || '');
    const [time, setTime] = useState(task?.time || '');
    const [notes, setNotes] = useState(task?.notes || '');
    /* the notes-template snapshot sent as `notes_from` (backend ask #1): set by Use template, dropped when the notes are cleared */
    const [notesFrom, setNotesFrom] = useState(task?.notesFrom || null);
    /* a pending Use template choice while the draft is non-empty (Replace notes / Cancel) */
    const [notesPending, setNotesPending] = useState(null);
    const [listOpen, setListOpen] = useState(mode === 'add');
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const cardRef = useRef(null);
    const titleRef = useRef(null);
    const notesRef = useRef(null);
    const replaceRef = useRef(null);
    const listOpenRef = useRef(listOpen);
    listOpenRef.current = listOpen;

    const close = useCallback(() => { if (!saving) onClose(); }, [onClose, saving]);
    useDialogFocus(cardRef, () => { if (listOpenRef.current) setListOpen(false); else close(); });
    useEffect(() => { titleRef.current?.focus(); }, []);

    const presets = useMemo(() => {
        const q = norm(title);
        return templates.filter((preset) => !q || norm(preset.en).includes(q) || norm(preset.zh).includes(q));
    }, [title, templates]);
    const exact = useMemo(() => {
        const q = norm(title);
        return (q && templates.find((preset) => norm(preset.en) === q || norm(preset.zh) === q)) || null;
    }, [title, templates]);
    /* every preset that carries notes, independently of the selected title (CR; prototype notesChoices): the EN variant,
       else the ZH one, marked "(zh)" */
    const notesChoices = useMemo(() => templates.filter((preset) => preset.hasNotes).map((preset) => ({
        id: preset.id, version: preset.version, name: preset.en || preset.zh, lang: preset.notesEn ? 'en' : 'zh', notes: preset.notesEn || preset.notesZh,
    })), [templates]);
    const insertNotes = (choice) => { setNotes(choice.notes); setNotesFrom({ template_id: choice.id, version: choice.version, lang: choice.lang }); setNotesPending(null); notesRef.current?.focus(); };
    const pickNotes = (id) => {
        const choice = notesChoices.find((item) => String(item.id) === String(id));
        if (!choice) return;
        /* a non-empty draft asks Replace notes / Cancel — never a silent replacement */
        if (notes.trim()) { setNotesPending(choice); return; }
        insertNotes(choice);
    };
    useEffect(() => { if (notesPending) replaceRef.current?.focus(); }, [notesPending]);
    /* U-0260 (21 Oct): Create/edit template opens the Task Template Manager's own form (the same manager flow, not a second
       library) over the editor, prefilled with the exact matching preset or the typed title: a library Save creates a new
       version and refreshes the Use template / preset choices at once; the task draft is untouched and nothing is sent; the
       grant is re-checked by the server at commit (403 shown in the form) */
    const [managerOpen, setManagerOpen] = useState(false);
    const [managerBusy, setManagerBusy] = useState(false);
    const [managerError, setManagerError] = useState('');
    const managerRow = useMemo(() => (exact
        ? { id: exact.id, title_en: exact.en, title_zh: exact.zh, notes_en: exact.notesEn, notes_zh: exact.notesZh, status: TASK_TEMPLATE_STATUS.ACTIVE }
        : { title_en: title.trim() }), [exact, title]);
    const libraryRows = useMemo(() => templates.map((preset) => ({ id: preset.id, title_en: preset.en, title_zh: preset.zh })), [templates]);
    const openManager = () => { setManagerError(''); setManagerOpen(true); };
    const closeManager = () => { if (!managerBusy) { setManagerOpen(false); setManagerError(''); } };
    const saveManager = (values) => {
        setManagerBusy(true); setManagerError('');
        saveTaskTemplateFlow(managerRow, libraryRows, values)
            .then(() => { setManagerOpen(false); refreshTemplates(); })
            .catch((err) => setManagerError(err?.message || ''))
            .finally(() => setManagerBusy(false));
    };
    const typed = title.trim().length > 0;
    const meta = !typed ? '' : (exact ? CAL_TASK_COPY.presetsHead : CAL_TASK_COPY.customTitle);

    const clearError = (key) => setErrors((current) => (current[key] ? { ...current, [key]: '' } : current));
    const pick = (preset) => {
        setTitle(preset.en || preset.zh);
        setListOpen(false);
        clearError('title');
        titleRef.current?.focus();
    };

    const save = () => {
        const next = {};
        if (!title.trim()) next.title = CAL_TASK_COPY.titleRequired;
        if (!ISO_DATE.test(date)) next.date = CAL_TASK_COPY.required;
        if (!HHMM.test(time)) next.time = CAL_TASK_COPY.required;
        setErrors(next);
        if (Object.keys(next).length) {
            setListOpen(false);
            (next.title ? titleRef.current : document.getElementById(next.date ? 'cal-te-date' : 'cal-te-time'))?.focus();
            return;
        }
        setSaving(true);
        const payload = {
            ...(task?.id ? { id: task.id, version: task.version } : {}),
            task_name: title.trim(),
            task_description: notes,
            notes_from: notes.trim() && notesFrom ? notesFrom : null,
            task_date: date,
            task_time: toApiTime(time),
            /* a new follow-up is linked to its record; an edit never re-sends the source (it is immutable) */
            ...(!task?.id && source?.id ? { source_type: source.type, source_id: source.id } : {}),
            /* the sub-record a follow-up was launched from (an Insurance request row, I-16); immutable once saved */
            ...(!task?.id && source?.id && source.context ? { context: source.context } : {}),
            /* a title that is a shared preset keeps its identity and the language variant it was saved in */
            ...(exact ? { template_id: exact.id, title_lang: norm(exact.en) === norm(title) ? 'en' : 'zh' } : {}),
        };
        dispatch(createCalendarTask(payload)).then((res) => {
            setSaving(false);
            /* a stale edit writes nothing: the draft stays, the task behind it is re-read for the next Save */
            if (res?.error && res?.payload?.data?.status === CAL_HTTP.CONFLICT) {
                setErrors({ form: CAL_TASK_COPY.staleDraft });
                if (onStale) onStale();
                return;
            }
            /* a 422 names its fields ({ message, errors: { task_name | task_date | task_time | …: [text] } }): each one
               shows at its field, the rest under the form, instead of the generic toast */
            if (res?.error && res?.payload?.data?.status === CAL_HTTP.UNPROCESSABLE) {
                const body = res.payload.data.data || {};
                const fieldOf = { task_name: 'title', task_date: 'date', task_time: 'time' };
                const next = {};
                Object.entries(body.errors || {}).forEach(([key, value]) => {
                    const text = Array.isArray(value) ? value.join(' ') : String(value || '');
                    if (fieldOf[key]) next[fieldOf[key]] = text; else next.form = [next.form, `${ key }: ${ text }`].filter(Boolean).join(' ');
                });
                if (!Object.keys(next).length) next.form = body.message || CAL_TASK_COPY.required;
                setErrors(next);
                (next.title ? titleRef.current : (next.date || next.time ? document.getElementById(next.date ? 'cal-te-date' : 'cal-te-time') : null))?.focus();
                return;
            }
            /* access withdrawn while the editor was open: the neutral notice, and the editor closes (prototype task-editor) */
            if (res?.error && res?.payload?.data?.status === CAL_HTTP.FORBIDDEN) {
                ShowToast('error', `${ translation(FU_COPY_KEY.notAvailableTitle) } · ${ translation(FU_COPY_KEY.notAvailable) }`);
                onClose();
                return;
            }
            if (res?.error || res?.payload?.status === false) { showErrorMessage(res); return; }
            /* prototype save toasts: where the task now shows */
            ShowToast('success', mode === 'edit' ? CAL_TASK_COPY.updated : (source?.id ? `${ CAL_TASK_COPY.savedLinked } ${ source.kindLabel || '' }`.trim() : CAL_TASK_COPY.savedUnlinked));
            if (onSaved) onSaved(res?.payload?.data);
            onClose();
        });
    };

    /* portaled to body: the dialog sits above the Follow Up sheet and any menu layer (prototype z 9040) */
    return createPortal(
        <div className="cal-task-editor" role="presentation" onClick={ (event) => { if (event.target === event.currentTarget) close(); } }>
            <div ref={ cardRef } className="dlg" role="dialog" aria-modal="true" aria-labelledby="cal-te-heading" data-cal-task-editor={ mode }>
                <div className="hd">
                    <h3 id="cal-te-heading">{ mode === 'edit' ? CAL_TASK_COPY.editTask : (source ? translation(FU_COPY_KEY.newFollowUp) : CAL_TASK_COPY.newTask) }</h3>
                    <button type="button" className="x" aria-label={ translation('key_close') } onClick={ close }>×</button>
                </div>
                <div className="bd">
                    <div className="titlewrap">
                        <label htmlFor="cal-te-title" className="sr">{ CAL_TASK_COPY.titleLabel }</label>
                        <div className={ `titlebox${ errors.title ? ' bad' : (listOpen ? ' open' : '') }` }>
                            <input
                                id="cal-te-title"
                                ref={ titleRef }
                                role="combobox"
                                aria-expanded={ listOpen }
                                aria-controls="cal-te-list"
                                aria-autocomplete="list"
                                aria-invalid={ Boolean(errors.title) }
                                aria-describedby={ errors.title ? 'cal-te-title-err' : undefined }
                                autoComplete="off"
                                placeholder={ CAL_TASK_COPY.titlePh }
                                value={ title }
                                onChange={ (event) => { setTitle(event.target.value); setListOpen(true); clearError('title'); } }
                                onFocus={ () => setListOpen(true) }
                            />
                            <button type="button" className="tog" aria-label={ CAL_TASK_COPY.presetsHead } aria-expanded={ listOpen } onClick={ () => setListOpen((open) => !open) }>
                                { listOpen ? '⌃' : '⌄' }
                            </button>
                        </div>
                        { errors.title && <div id="cal-te-title-err" className="err" role="alert">{ errors.title }</div> }
                        <div className="meta">{ meta }</div>
                        { listOpen && (
                            <div id="cal-te-list" className="list" role="listbox" aria-label={ CAL_TASK_COPY.presetsHead }>
                                <div className="lh"><span>{ CAL_TASK_COPY.presetsHead }</span><span className="n">{ presets.length }/{ templates.length }</span></div>
                                { presets.map((preset) => (
                                    <button key={ preset.id } type="button" role="option" aria-selected={ exact?.id === preset.id } className={ `opt${ exact?.id === preset.id ? ' on' : '' }` } onClick={ () => pick(preset) }>
                                        <span>{ preset.en }</span>
                                        <span className="zh" lang="zh-HK">{ preset.zh }</span>
                                    </button>
                                )) }
                                { typed && presets.length === 0 && <div className="foot">{ CAL_TASK_COPY.noPresetMatch }</div> }
                                { typed && !exact && !canManageTemplates && <div className="foot soft">{ CAL_TASK_COPY.noManagePerm }</div> }
                            </div>
                        ) }
                    </div>
                    <div className="grid2">
                        <div className="fld">
                            <label htmlFor="cal-te-date">{ CAL_TASK_COPY.date } <span className="req">*</span></label>
                            <DateInput id="cal-te-date" value={ date } invalid={ Boolean(errors.date) } onChange={ (value) => { setDate(value); clearError('date'); } } />
                            { errors.date && <div id="cal-te-date-err" className="err" role="alert">{ errors.date }</div> }
                        </div>
                        <div className="fld">
                            <label htmlFor="cal-te-time">{ CAL_TASK_COPY.time } ({ CAL_TASK_COPY.timeZone }) <span className="req">*</span></label>
                            <TimeInput id="cal-te-time" value={ time ? dayjs(`2000-01-01 ${ time }`).toDate() : null } invalid={ Boolean(errors.time) } intervalMinutes={ 5 } onChange={ (picked) => { setTime(picked ? dayjs(picked).format('HH:mm') : ''); clearError('time'); } } />
                            { errors.time && <div id="cal-te-time-err" className="err" role="alert">{ errors.time }</div> }
                        </div>
                    </div>
                    <div className="fld">
                        <label htmlFor="cal-te-notes">{ CAL_TASK_COPY.notesOptional }</label>
                        <div className="tools">
                            { notesChoices.length
                                ? (
                                    <select className="sm notes-pick" aria-label={ CAL_TASK_COPY.useTemplate } value="" onChange={ (event) => pickNotes(event.target.value) }>
                                        <option value="">{ CAL_TASK_COPY.useTemplatePh }</option>
                                        { notesChoices.map((choice) => <option key={ choice.id } value={ choice.id }>{ choice.name }{ choice.lang === 'zh' ? ' (zh)' : '' }</option>) }
                                    </select>
                                )
                                : <span className="soft">{ CAL_TASK_COPY.noNotesTemplates }</span> }
                            { canManageTemplates && (
                                <button type="button" className="sm" onClick={ openManager }>{ CAL_TASK_COPY.manageTemplate }</button>
                            ) }
                            <span>{ CAL_TASK_COPY.editorInternalOnly }</span>
                        </div>
                        { managerOpen && canManageTemplates && (
                            <Suspense fallback={ null }>
                                <TaskTemplateFormModal template={ managerRow } onSave={ saveManager } onClose={ closeManager } isSaving={ managerBusy } formError={ managerError } />
                            </Suspense>
                        ) }
                        { notesPending && (
                            <div className="notes-confirm" role="group" aria-label={ CAL_TASK_COPY.replaceNotes }>
                                <span>{ CAL_TASK_COPY.replaceNotesAsk }</span>
                                <button ref={ replaceRef } type="button" className="sm" onClick={ () => insertNotes(notesPending) }>{ CAL_TASK_COPY.replaceNotes }</button>
                                <button type="button" className="sm" onClick={ () => { setNotesPending(null); notesRef.current?.focus(); } }>{ translation('key_cancel') }</button>
                            </div>
                        ) }
                        <textarea id="cal-te-notes" ref={ notesRef } rows={ 3 } value={ notes } onChange={ (event) => setNotes(event.target.value) } />
                    </div>
                    { mode === 'edit' && source && (
                        <div className="who-line" data-cal-te-people="1">
                            <span>{ CAL_TASK_COPY.responsibleStaff }</span> { task?.responsible?.name || '—' } <span>· { CAL_TASK_COPY.createdBy } { task?.createdBy?.name || '—' }</span>
                        </div>
                    ) }
                    { source && (
                        /* prototype task-editor sourceHTML: a read-only two-column block after Notes */
                        <div className="src" data-cal-te-source={ `${ source.type }:${ source.id ?? '' }` }>
                            { source.contract ? (
                                /* a contract (prototype sourceHTML src.contract): "<ref> · <status>" · Employer · Worker <code> */
                                <>
                                    <span className="lb">{ translation(FU_COPY_KEY.sourceRecord) }</span>
                                    <span><span className="mono">{ source.contract.ref }</span>{ source.contract.status && <span className="soft"> · { source.contract.status }</span> }</span>
                                    <span className="lb">{ translation(FU_COPY_KEY.sourceEmployer) }</span>
                                    <span className="val">{ source.contract.employer || '—' }</span>
                                    <span className="lb">{ translation(FU_COPY_KEY.sourceWorker) }</span>
                                    <span className="val">{ source.contract.worker || '—' }{ source.contract.wcode && <> <span className="mono wcode">{ source.contract.wcode }</span></> }</span>
                                </>
                            ) : (
                                <>
                                    <span className="lb">{ translation(FU_COPY_KEY.sourceRecord) }</span>
                                    <span>
                                        { source.kindLabel && <span className="soft">{ source.kindLabel } · </span> }
                                        <span className="mono">{ source.ref }</span>
                                        { (source.sub ?? source.label) && <span className="val"> · { source.sub ?? source.label }</span> }
                                    </span>
                                    { source.facts && CAL_SOURCE_FACT_ROWS.filter(([key]) => source.facts[key]).map(([key, label]) => (
                                        <React.Fragment key={ key }>
                                            <span className="lb">{ translation(label) }</span>
                                            <span className="val">{ source.facts[key] }</span>
                                        </React.Fragment>
                                    )) }
                                </>
                            ) }
                            { mode !== 'edit' && taskContextRows(source.context).map((row) => (
                                <React.Fragment key={ row.key }>
                                    <span className="lb">{ row.label }</span>
                                    <span className="val" data-cal-te-context={ row.key }>{ row.text }</span>
                                </React.Fragment>
                            )) }
                        </div>
                    ) }
                    { errors.form && <div className="formerr" role="alert">{ errors.form }</div> }
                </div>
                <div className="ft">
                    <Btn variant="secondary" onClick={ close } disabled={ saving }>{ translation('key_cancel') }</Btn>
                    <Btn variant="primary" onClick={ save } disabled={ saving }>{ saving ? translation('key_loading') : translation('key_save') }</Btn>
                </div>
            </div>
        </div>,
        document.body
    );
};

TaskEditorModal.propTypes = {
    task: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        title: PropTypes.string,
        date: PropTypes.string,
        time: PropTypes.string,
        notes: PropTypes.string,
        version: PropTypes.number,
        responsible: PropTypes.object,
        createdBy: PropTypes.object,
    }),
    /* the linked record (S10): { type, id, ref, kindLabel, sub, label, facts, context } */
    source: PropTypes.shape({
        type: PropTypes.string,
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        ref: PropTypes.string,
        kindLabel: PropTypes.string,
        sub: PropTypes.string,
        label: PropTypes.string,
        facts: PropTypes.object,
        context: PropTypes.object,
        /* a contract source (prototype sourceHTML src.contract): { ref, status, employer, worker, wcode } */
        contract: PropTypes.shape({ ref: PropTypes.string, status: PropTypes.string, employer: PropTypes.string, worker: PropTypes.string, wcode: PropTypes.string }),
    }),
    onClose: PropTypes.func.isRequired,
    onSaved: PropTypes.func,
    onStale: PropTypes.func,
};

export default TaskEditorModal;
