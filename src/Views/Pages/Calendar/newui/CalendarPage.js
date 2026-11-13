import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import "./calendar.css";
import Btn from "../../../../components/ui/Btn";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import translation from "../../../../utils/translation";
import { headingCase } from "../../../../utils/utils";
import { isAdminUser } from "../../../../services/permissionService";
import { hasCalendarAccess } from "../../../../utils/permissions/followUpPermissionUtils";
import useCalendarState from "./useCalendarState";
import useCalendarData from "./useCalendarData";
import useCalendarTaskActions, { canToggleTask } from "./useCalendarTaskActions";
import CalendarToolbar from "./CalendarToolbar";
import CalendarFilters from "./CalendarFilters";
import CalendarGrid from "./CalendarGrid";
import CalendarAgenda from "./CalendarAgenda";
import CalendarSheet from "./CalendarSheet";
import TaskEditorModal from "./TaskEditorModal";
import { filterEvents } from "./calendarEvents";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { CAL_COPY, CAL_STAFF_ME, CAL_VIEWS } from "./calendarConstants";
import { todayHK } from "./calendarTime";


/*
 * Calendar (handoff modules/calendar; CR "Calendar and Follow Up"; Settings #23): Day / Week / Agenda over one selected
 * Hong Kong date, Monday-first, HKT. Gate = the Calendar module's own Access key or any Follow Up grant (the HRMS leave-calendar toggles gate the
 * HRMS pages only — PERM §15.2). Interviews and tasks come from the range-scoped HRMS list (HRMS API spec A4); a task is
 * completed, reopened, cancelled, edited and transferred through the shared task API, and every change re-reads the lists.
 */
const CalendarPage = () => {
    const permissionList = useSelector((state) => state.users.permissionList);
    const isAdmin = useMemo(() => isAdminUser(), []);
    const hasAccess = isAdmin || hasCalendarAccess(permissionList?.data);

    const navigate = useNavigate();
    const cal = useCalendarState();
    const data = useCalendarData({ days: cal.days, staff: cal.staff });
    const [selected, setSelected] = useState(null);
    const [sheetShown, setSheetShown] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const today = todayHK();

    /* a task named in the address is the selection; when the address drops it (Staff change, "N overdue") the sheet goes too */
    useEffect(() => {
        if (cal.task) setSelected({ kind: 'task', id: cal.task });
        else setSelected((current) => (current?.kind === 'task' ? null : current));
    }, [cal.task]);

    const filtered = useMemo(() => filterEvents(data.events, { search: cal.search, show: cal.show, status: cal.status }), [data.events, cal.search, cal.show, cal.status]);
    const inRange = useCallback((date) => date >= cal.days[0] && date <= cal.days[cal.days.length - 1], [cal.days]);
    const counts = useMemo(() => ({
        interviews: filtered.interviews.filter((row) => inRange(row.date)).length,
        tasks: filtered.tasks.filter((row) => inRange(row.date)).length,
    }), [filtered, inRange]);
    /* the sheet finds a task among the visible days and the overdue ones (an overdue task may sit outside the range) */
    const sheetTasks = useMemo(() => {
        const inView = new Set(filtered.tasks.map((row) => row.id));
        return [...filtered.tasks, ...filtered.overdueTasks.filter((row) => !inView.has(row.id))];
    }, [filtered]);

    /* any task change (status, edit, transfer) re-reads the lists and the open task */
    const [revision, setRevision] = useState(0);
    const refreshData = data.refresh;
    const handleChanged = useCallback(() => { refreshData(); setRevision((n) => n + 1); }, [refreshData]);
    const actions = useCalendarTaskActions({ onChanged: handleChanged });
    const meUserId = data.meUserId;
    const canToggle = useCallback((row) => canToggleTask(row, meUserId), [meUserId]);

    const handleSelect = useCallback((sel) => {
        setSelected(sel);
        if (sel.kind === 'task') cal.selectTask(sel.id);
        else if (cal.task) cal.selectTask(null);
    }, [cal]);
    const closeSheet = useCallback(() => {
        setSelected(null);
        if (cal.task) cal.selectTask(null);
    }, [cal]);
    /* an unknown or inaccessible ?task=: say so and show nothing (prototype applyRoute) */
    const handleMissing = useCallback(() => { ShowToast('error', CAL_COPY.unavailable); closeSheet(); }, [closeSheet]);
    /* an arrival on another staff member's task: Staff switches to that owner when the selector offers them (prototype applyRoute) */
    const staffOptions = data.staffOptions;
    const handleLoaded = useCallback((task) => {
        if (!cal.task || cal.staff !== CAL_STAFF_ME) return;
        const ownerId = task?.source ? task?.responsible?.id : task?.createdBy?.id;
        if (ownerId == null || String(ownerId) === String(meUserId)) return;
        if (staffOptions.some((option) => option.value === String(ownerId))) cal.setStaffKeepTask(String(ownerId));
    }, [cal, meUserId, staffOptions]);
    /* a new task from "+ Add task": its date becomes the anchor and it is the selection (prototype ACT.add onSaved) */
    const handleAdded = useCallback((saved) => {
        handleChanged();
        if (saved?.task_date) cal.setDate(String(saved.task_date).slice(0, 10));
        if (saved?.id != null) { setSelected({ kind: 'task', id: String(saved.id) }); cal.selectTask(String(saved.id)); }
    }, [handleChanged, cal]);
    /* a return to where the arrival came from (notifications, a source record); the Calendar never replays that query */
    const goBack = useCallback(() => { navigate(-1); }, [navigate]);

    useEffect(() => {
        /* an open dialog (task editor) owns Escape; the sheet closes only when nothing is above it */
        const onKey = (event) => { if (event.key === 'Escape' && selected && !isAddOpen && !document.querySelector('[role="dialog"][aria-modal="true"]')) { setSelected(null); if (cal.task) cal.selectTask(null); } };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [selected, isAddOpen, cal]);

    if (!hasAccess) {
        return (
            <div className="cal-root">
                <div className="cal-denied" role="status">
                    <strong>{ headingCase(translation('key_calendar')) }</strong>
                    <div>{ CAL_COPY.denied }</div>
                </div>
            </div>
        );
    }

    return (
        <div className="cal-root">
            <CalendarToolbar
                view={ cal.view }
                date={ cal.date }
                days={ cal.days }
                isDay={ cal.isDay }
                overdueCount={ data.events.overdueTasks.length }
                onView={ cal.setView }
                onToday={ cal.goToday }
                onStep={ cal.step }
                onJump={ cal.setDate }
                onOverdue={ cal.showOverdue }
                onAdd={ () => setIsAddOpen(true) }
            />
            <CalendarFilters
                search={ cal.search }
                staff={ data.selectedStaff?.value || cal.staff }
                staffOptions={ data.staffOptions }
                show={ cal.show }
                status={ cal.status }
                counts={ counts }
                isDay={ cal.isDay }
                onSearch={ cal.setSearch }
                onStaff={ cal.setStaff }
                onShow={ cal.setShow }
                onStatus={ cal.setStatus }
            />
            <div className={ `cal-body${ sheetShown ? ' has-sheet' : '' }` } aria-busy={ data.isLoading }>
                { data.error ? (
                    <div className="cal-state">
                        <span>{ CAL_COPY.loadError }</span>
                        <Btn variant="secondary" onClick={ data.refresh }>{ translation('key_retry') }</Btn>
                    </div>
                ) : data.isLoading && data.events.interviews.length === 0 && data.events.tasks.length === 0 && data.events.overdueTasks.length === 0 ? (
                    <div className="cal-state"><CustomSpinner /></div>
                ) : cal.view === CAL_VIEWS.AGENDA ? (
                    <CalendarAgenda days={ cal.days } today={ today } interviews={ filtered.interviews } tasks={ filtered.tasks } overdueTasks={ filtered.overdueTasks } selected={ selected } onSelect={ handleSelect } canToggle={ canToggle } onToggle={ actions.toggle } busyTaskId={ actions.busyTaskId } />
                ) : (
                    <CalendarGrid days={ cal.days } today={ today } interviews={ filtered.interviews } tasks={ filtered.tasks } selected={ selected } onSelect={ handleSelect } canToggle={ canToggle } onToggle={ actions.toggle } busyTaskId={ actions.busyTaskId } />
                ) }
                <CalendarSheet
                    selected={ selected }
                    interviews={ filtered.interviews }
                    tasks={ sheetTasks }
                    from={ cal.from }
                    meUserId={ meUserId }
                    revision={ revision }
                    actions={ actions }
                    staffIsMe={ cal.staff === CAL_STAFF_ME }
                    onClose={ closeSheet }
                    onBack={ goBack }
                    onSelect={ handleSelect }
                    onChanged={ handleChanged }
                    onAnchorDate={ cal.setDate }
                    onRendered={ setSheetShown }
                    onMissing={ handleMissing }
                    onLoaded={ handleLoaded }
                    canToggle={ canToggle }
                    onToggle={ actions.toggle }
                />
            </div>
            { isAddOpen && <TaskEditorModal onClose={ () => setIsAddOpen(false) } onSaved={ handleAdded } /> }
        </div>
    );
};

export default CalendarPage;
