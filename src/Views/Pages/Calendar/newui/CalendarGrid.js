import React, { useMemo } from "react";
import PropTypes from "prop-types";
import {
    CAL_BLOCK_SUBTITLE_MIN_PX, CAL_COPY, CAL_DEFAULT_HOURS, CAL_HOUR_PX, CAL_INTERVIEW_TONE_CLASS, CAL_PIN_HEIGHT_PX, CAL_SHEET_COPY, CAL_TASK_CHECK_MARK, CAL_TASK_COPY,
    CAL_TASK_OVERDUE, CAL_TASK_STATE,
} from "./calendarConstants";
import { taskDisplayState } from "./calendarEvents";
import { dayNumber, dayOfWeekLabel, pad, timeToMinutes } from "./calendarTime";

/*
 * The timed grid renders ONE day or SEVEN from the same filtered population (prototype weekHTML). Hours 08–20 extend to
 * include every accepted time. Same-start interviews are one cluster block; staggered overlaps sit side by side in lanes;
 * task markers within one marker height collapse into one cluster pin. Positions are data-driven, so they are set as
 * inline geometry; colours and shapes come from calendar.css.
 */
const hourRange = (days, interviews, tasks) => {
    let start = CAL_DEFAULT_HOURS.start, end = CAL_DEFAULT_HOURS.end;
    const inRange = (date) => date >= days[0] && date <= days[days.length - 1];
    interviews.filter((row) => inRange(row.date)).forEach((row) => {
        start = Math.min(start, Math.floor(timeToMinutes(row.start) / 60));
        end = Math.max(end, Math.floor(timeToMinutes(row.end) / 60) + 1);
    });
    tasks.filter((row) => inRange(row.date) && row.time).forEach((row) => {
        const h = Math.floor(timeToMinutes(row.time) / 60);
        start = Math.min(start, h);
        end = Math.max(end, h + 1);
    });
    return { start: Math.max(0, start), end: Math.min(24, end) };
};

const packLanes = (blocks) => {
    const sorted = [...blocks].sort((a, b) => a.top - b.top);
    const groups = [];
    let current = null;
    sorted.forEach((block) => {
        if (!current || block.top >= current.bottom) { current = { items: [], bottom: 0 }; groups.push(current); }
        current.items.push(block);
        current.bottom = Math.max(current.bottom, block.top + block.height);
    });
    groups.forEach((group) => {
        const laneEnd = [];
        group.items.forEach((block) => {
            let lane = 0;
            while (laneEnd[lane] != null && laneEnd[lane] > block.top) lane += 1;
            laneEnd[lane] = block.top + block.height;
            block.lane = lane;
        });
        group.items.forEach((block) => { block.lanes = laneEnd.length; });
    });
};

const DayColumn = ({ iso, isToday, interviews, tasks, hours, topOf, gridHeight, selected, onSelect, canToggle, onToggle, busyTaskId }) => {
    const groups = new Map();
    interviews.filter((row) => row.date === iso).forEach((row) => {
        if (!groups.has(row.start)) groups.set(row.start, []);
        groups.get(row.start).push(row);
    });
    const blocks = Array.from(groups.keys()).sort().map((start) => {
        const arr = groups.get(start);
        const multi = arr.length > 1;
        const status = multi ? (arr.every((row) => row.status === arr[0].status) ? arr[0].status : 'Upcoming') : arr[0].status;
        const sel = multi ? { kind: 'cluster', id: `${ iso } ${ start }` } : { kind: 'interview', id: arr[0].id };
        const top = topOf(start);
        const height = topOf(arr[0].end) - top - 2;
        return { arr, multi, status, sel, start, top, height, lane: 0, lanes: 1 };
    });
    packLanes(blocks);

    const dayTasks = tasks.filter((row) => row.date === iso).sort((a, b) => (a.time || '') < (b.time || '') ? -1 : 1);
    const pins = [];
    let k = 0;
    while (k < dayTasks.length) {
        const group = [dayTasks[k]];
        const anchorTop = dayTasks[k].time ? topOf(dayTasks[k].time) : 0;
        let j = k + 1;
        while (j < dayTasks.length && (dayTasks[j].time ? topOf(dayTasks[j].time) : 0) - anchorTop < CAL_PIN_HEIGHT_PX) { group.push(dayTasks[j]); j += 1; }
        const collides = blocks.some((block) => anchorTop >= block.top - 11 && anchorTop <= block.top + block.height);
        pins.push({ group, top: Math.max(0, anchorTop - 11), collides });
        k = j;
    }

    const isSelected = (sel) => selected && selected.kind === sel.kind && selected.id === sel.id;

    return (
        <div className={ `cal-col${ isToday ? ' today' : '' }` } data-cal-day={ iso } style={ { height: gridHeight } }>
            { hours.map((hour) => <div key={ hour.label } className="hl" style={ { top: hour.top } } />) }
            { blocks.map((block) => {
                /* prototype blockHTML: "HH:MM Employer" (✓ when Completed) over "Worker · status"; a cluster lists the workers' first names */
                const one = block.arr[0];
                const label = block.multi
                    ? `${ block.arr.length } ${ CAL_COPY.interviews.toLowerCase() } · ${ block.start }`
                    : `${ block.status === 'Completed' ? '✓ ' : '' }${ block.start } ${ one.employerName || one.title || CAL_COPY.interview }`;
                const subtitle = block.height < CAL_BLOCK_SUBTITLE_MIN_PX ? '' : (block.multi
                    ? block.arr.map((row) => (row.workerName || row.title || '').split(' ')[0]).filter(Boolean).join(', ')
                    : [one.workerName, block.status].filter(Boolean).join(' · '));
                const aria = block.multi ? `${ block.arr.length } ${ CAL_COPY.concurrent } ${ block.start }` : `${ CAL_COPY.interview } ${ block.arr[0].title } ${ block.start } · ${ block.status }`;
                return (
                    <button
                        key={ block.sel.id }
                        type="button"
                        className={ `cal-block ${ CAL_INTERVIEW_TONE_CLASS[block.status] || CAL_INTERVIEW_TONE_CLASS.Upcoming }${ isSelected(block.sel) ? ' sel' : '' }` }
                        data-cal-block={ block.multi ? 'cluster' : 'interview' }
                        data-cal-count={ block.arr.length }
                        aria-label={ aria }
                        title={ aria }
                        style={ { top: block.top, height: block.height, left: `calc(3px + ${ (100 * block.lane) / block.lanes }%)`, width: `calc(${ 100 / block.lanes }% - 6px)` } }
                        onClick={ () => onSelect(block.sel) }
                    >
                        <span className="t">{ label }</span>
                        { subtitle && <span className="s">{ subtitle }</span> }
                    </button>
                );
            }) }
            { pins.map((pin) => {
                const left = pin.collides ? '45%' : '3px';
                if (pin.group.length === 1) {
                    const row = pin.group[0];
                    const sel = { kind: 'task', id: row.id };
                    const text = `${ row.title } · ${ row.sourceLabel } · ${ CAL_SHEET_COPY.due } ${ row.time || CAL_COPY.noTime } · ${ CAL_TASK_COPY[taskDisplayState(row)] || CAL_TASK_COPY.outstanding }`;
                    return (
                        <div key={ row.id } className={ `cal-pin task-${ taskDisplayState(row) }${ isSelected(sel) ? ' sel' : '' }` } data-cal-pin="task" style={ { left, top: pin.top } }>
                            <button
                                type="button"
                                className="cal-check"
                                disabled={ !canToggle(row) || busyTaskId !== null }
                                aria-label={ `${ row.state === CAL_TASK_STATE.COMPLETED ? CAL_TASK_COPY.reopen : CAL_TASK_COPY.markDone }: ${ row.title }` }
                                onClick={ () => onToggle(row) }
                            >
                                { CAL_TASK_CHECK_MARK[row.state] || '' }
                            </button>
                            <button type="button" className="lbl" title={ text } onClick={ () => onSelect(sel) }>
                                <span className="tm">{ row.time || CAL_COPY.noTime }</span> { row.title }
                            </button>
                        </div>
                    );
                }
                const first = pin.group[0], last = pin.group[pin.group.length - 1];
                const id = `${ iso } ${ first.time || '' }`;
                const sel = { kind: 'taskcluster', id };
                const text = `${ pin.group.length } ${ CAL_COPY.tasks.toLowerCase() } · ${ first.time || CAL_COPY.noTime }${ last.time !== first.time ? `–${ last.time || CAL_COPY.noTime }` : '' }`;
                const anyOverdue = pin.group.some((row) => taskDisplayState(row) === CAL_TASK_OVERDUE);
                return (
                    <div key={ id } className={ `cal-pin cluster${ anyOverdue ? ' task-overdue' : '' }${ isSelected(sel) ? ' sel' : '' }` } data-cal-pin="taskcluster" data-cal-count={ pin.group.length } style={ { left, top: pin.top } }>
                        <button type="button" className="lbl" title={ pin.group.map((row) => `${ row.time || CAL_COPY.noTime } ${ row.title }`).join(' · ') } onClick={ () => onSelect(sel) }>
                            <span className="tm">{ text }</span>
                        </button>
                    </div>
                );
            }) }
        </div>
    );
};

DayColumn.propTypes = {
    iso: PropTypes.string.isRequired,
    isToday: PropTypes.bool,
    interviews: PropTypes.array.isRequired,
    tasks: PropTypes.array.isRequired,
    hours: PropTypes.array.isRequired,
    topOf: PropTypes.func.isRequired,
    gridHeight: PropTypes.number.isRequired,
    selected: PropTypes.object,
    onSelect: PropTypes.func.isRequired,
    canToggle: PropTypes.func.isRequired,
    onToggle: PropTypes.func.isRequired,
    busyTaskId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

const CalendarGrid = ({ days, today, interviews, tasks, selected, onSelect, canToggle, onToggle, busyTaskId = null }) => {
    const range = useMemo(() => hourRange(days, interviews, tasks), [days, interviews, tasks]);
    const topOf = (hhmm) => ((timeToMinutes(hhmm) || 0) / 60 - range.start) * CAL_HOUR_PX;
    const gridHeight = (range.end - range.start) * CAL_HOUR_PX + 1;
    const hours = Array.from({ length: range.end - range.start + 1 }, (_, i) => ({ label: `${ pad(range.start + i) }:00`, top: i * CAL_HOUR_PX }));
    const isDay = days.length === 1;

    return (
        <div className="cal-week" data-cal-days={ days.length } data-cal-view={ isDay ? 'day' : 'week' } data-cal-hours={ `${ range.start }-${ range.end }` }>
            <div className="cal-head">
                <div />
                { days.map((iso) => (
                    <div key={ iso } className="d">
                        <div className="dow">{ dayOfWeekLabel(iso) }</div>
                        <div className={ `num${ iso === today ? ' today' : '' }` }>{ dayNumber(iso) }</div>
                    </div>
                )) }
            </div>
            <div className="cal-grid">
                <div className="cal-hours" style={ { height: gridHeight } }>
                    { hours.map((hour) => <div key={ hour.label } className="h" style={ { top: hour.top } }>{ hour.label }</div>) }
                </div>
                { days.map((iso) => (
                    <DayColumn key={ iso } iso={ iso } isToday={ iso === today } interviews={ interviews } tasks={ tasks } hours={ hours } topOf={ topOf } gridHeight={ gridHeight } selected={ selected } onSelect={ onSelect } canToggle={ canToggle } onToggle={ onToggle } busyTaskId={ busyTaskId } />
                )) }
            </div>
            { /* the hour range is data-driven, never branch hours (CR "Calendar and Follow Up"; prototype gridNote) */ }
            <div className="cal-gridnote">{ CAL_COPY.gridNote }</div>
        </div>
    );
};

CalendarGrid.propTypes = {
    days: PropTypes.arrayOf(PropTypes.string).isRequired,
    today: PropTypes.string.isRequired,
    interviews: PropTypes.array.isRequired,
    tasks: PropTypes.array.isRequired,
    selected: PropTypes.object,
    onSelect: PropTypes.func.isRequired,
    canToggle: PropTypes.func.isRequired,
    onToggle: PropTypes.func.isRequired,
    busyTaskId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default React.memo(CalendarGrid);
