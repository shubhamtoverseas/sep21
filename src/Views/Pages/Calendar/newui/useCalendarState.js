import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { CAL_ROUTE_QUERY, CAL_SHOW, CAL_STAFF_ME, CAL_STATE_KEY, CAL_STATUS, CAL_VIEWS, CAL_VIEW_ORDER } from "./calendarConstants";
import { addDays, isIsoDate, todayHK, weekStart } from "./calendarTime";

/*
 * One selected Hong Kong date is the anchor; the Monday week start is derived, never stored, so Day → Week → Day keeps
 * the chosen date and a date jump is never snapped to its Monday (Settings #23, CR 290). The route query carries the
 * state (?view&date&search&staff&show&status&task); the latest choices are also kept in sessionStorage so a reload or
 * an interface-language change comes back to them. A fresh Calendar opens Week on today's Hong Kong date.
 * U-0009 (21 Oct, approved correction): Today sets the current Hong Kong date AND opens Day view — it does not preserve
 * Week or Agenda.
 */
const readSaved = () => {
    try { return JSON.parse(sessionStorage.getItem(CAL_STATE_KEY) || 'null'); } catch { return null; }
};
const persist = (state) => {
    try { sessionStorage.setItem(CAL_STATE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
};

const parse = (params) => {
    const view = params.get(CAL_ROUTE_QUERY.VIEW);
    const date = params.get(CAL_ROUTE_QUERY.DATE);
    const week = params.get(CAL_ROUTE_QUERY.WEEK);           /* delivered week links stay compatible */
    const show = params.get(CAL_ROUTE_QUERY.SHOW);
    const status = params.get(CAL_ROUTE_QUERY.STATUS);
    const task = params.get(CAL_ROUTE_QUERY.TASK) || null;
    /* a task arrival lands on Agenda unless the address names Week or Day (prototype applyRoute) */
    const defaultView = task ? CAL_VIEWS.AGENDA : CAL_VIEWS.WEEK;
    return {
        view: CAL_VIEW_ORDER.includes(view) ? view : defaultView,
        date: isIsoDate(date) ? date : (isIsoDate(week) ? weekStart(week) : todayHK()),
        search: params.get(CAL_ROUTE_QUERY.SEARCH) || '',
        staff: params.get(CAL_ROUTE_QUERY.STAFF) || CAL_STAFF_ME,
        show: Object.values(CAL_SHOW).includes(show) ? show : CAL_SHOW.ALL,
        status: Object.values(CAL_STATUS).includes(status) ? status : CAL_STATUS.ALL,
        task,
        from: params.get(CAL_ROUTE_QUERY.FROM) || null,
    };
};

const DEFAULTS = { view: CAL_VIEWS.WEEK, search: '', staff: CAL_STAFF_ME, show: CAL_SHOW.ALL, status: CAL_STATUS.ALL, task: null, from: null };

/* the view parse() would infer for this address when `view` is absent (a task arrival lands on Agenda) */
const inferredView = (state) => (state.task ? CAL_VIEWS.AGENDA : DEFAULTS.view);

const toParams = (state) => {
    const next = {};
    /* handoff 29 Oct §K: write `view` whenever it differs from the inferred one, so Week survives with a task open */
    if (state.view !== inferredView(state)) next[CAL_ROUTE_QUERY.VIEW] = state.view;
    if (state.date) next[CAL_ROUTE_QUERY.DATE] = state.date;
    if (state.search) next[CAL_ROUTE_QUERY.SEARCH] = state.search;
    if (state.staff && state.staff !== CAL_STAFF_ME) next[CAL_ROUTE_QUERY.STAFF] = state.staff;
    if (state.show !== DEFAULTS.show) next[CAL_ROUTE_QUERY.SHOW] = state.show;
    if (state.status !== DEFAULTS.status) next[CAL_ROUTE_QUERY.STATUS] = state.status;
    if (state.task) next[CAL_ROUTE_QUERY.TASK] = state.task;
    if (state.from) next[CAL_ROUTE_QUERY.FROM] = state.from;
    return next;
};

const useCalendarState = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const restored = useRef(false);

    /* initial mount with no query: the latest saved choices, if any */
    useEffect(() => {
        if (restored.current) return;
        restored.current = true;
        if (Array.from(searchParams.keys()).length > 0) return;
        const saved = readSaved();
        if (saved && typeof saved === 'object') setSearchParams(toParams({ ...DEFAULTS, ...saved, task: null, from: null }), { replace: true });
    }, [searchParams, setSearchParams]);

    const state = useMemo(() => parse(searchParams), [searchParams]);
    useEffect(() => { persist({ view: state.view, date: state.date, search: state.search, staff: state.staff, show: state.show, status: state.status }); }, [state]);

    const patch = useCallback((changes) => {
        setSearchParams((current) => toParams({ ...parse(current), ...changes }), { replace: true });
    }, [setSearchParams]);

    const isDay = state.view === CAL_VIEWS.DAY;
    const days = useMemo(() => {
        if (isDay) return [state.date];
        const start = weekStart(state.date);
        return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }, [isDay, state.date]);

    return {
        ...state,
        isDay,
        days,
        setView: (view) => patch({ view }),
        setDate: (date) => { if (isIsoDate(date)) patch({ date }); },
        goToday: () => patch({ date: todayHK(), view: CAL_VIEWS.DAY }),            /* U-0009: today's date in Day view */
        step: (direction) => patch({ date: addDays(state.date, (isDay ? 1 : 7) * direction) }),
        setSearch: (search) => patch({ search, task: state.task }),
        setStaff: (staff) => patch({ staff, task: null }),
        /* an arrival (?task=) on another staff member's task switches Staff to the owner without dropping the task (prototype applyRoute) */
        setStaffKeepTask: (staff) => patch({ staff }),
        setShow: (show) => patch({ show }),
        setStatus: (status) => patch({ status }),
        selectTask: (task) => patch({ task }),
        showOverdue: () => patch({ view: CAL_VIEWS.AGENDA, status: CAL_STATUS.ALL, show: CAL_SHOW.ALL, task: null }),
    };
};

export default useCalendarState;
