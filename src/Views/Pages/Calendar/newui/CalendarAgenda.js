import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../utils/translation";
import { CAL_COPY, CAL_INTERVIEW_METHOD, CAL_INTERVIEW_TONE_CLASS, CAL_SHEET_COPY, CAL_TASK_CHECK_MARK, CAL_TASK_COPY, CAL_TASK_STATE } from "./calendarConstants";
import { taskDisplayState } from "./calendarEvents";
import { formatShortDateDow } from "./calendarTime";

const methodLabel = (row) => (row.method === CAL_INTERVIEW_METHOD.VIDEO ? CAL_SHEET_COPY.video : (row.method === CAL_INTERVIEW_METHOD.IN_PERSON ? (row.branchName || CAL_SHEET_COPY.inPerson) : ''));

/*
 * Agenda (prototype agendaHTML): an Overdue section first — not limited to the week — then one section per day of the
 * selected span with interview and task rows sorted by time. The Overdue section lists every outstanding task past its
 * due time (the list's `overdue_task_data`); a day section never repeats a task already shown there.
 */
const TaskRow = ({ row, overdue, selected, onSelect, canToggle, onToggle, busyTaskId }) => (
    <div className={ `cal-row task-${ taskDisplayState(row) }${ overdue ? ' ov' : '' }${ selected ? ' sel' : '' }` } data-cal-row="task">
        <button
            type="button"
            className="cal-check lg"
            disabled={ !canToggle(row) || busyTaskId !== null }
            aria-label={ `${ row.state === CAL_TASK_STATE.COMPLETED ? CAL_TASK_COPY.reopen : CAL_TASK_COPY.markDone }: ${ row.title }` }
            onClick={ () => onToggle(row) }
        >
            { CAL_TASK_CHECK_MARK[row.state] || '' }
        </button>
        <span className="when">{ overdue ? `${ formatShortDateDow(row.date) } ${ row.time || CAL_COPY.noTime }` : (row.time || CAL_COPY.noTime) }</span>
        <button type="button" className="ttl" onClick={ () => onSelect({ kind: 'task', id: row.id }) }>
            <b>{ row.title }</b> <span>{ row.sourceLabel }</span>
        </button>
        { /* the task's own state, coloured by it (prototype stLabel) */ }
        { !overdue && <span className={ `st st-${ taskDisplayState(row) }` }>{ CAL_TASK_COPY[taskDisplayState(row)] || CAL_TASK_COPY.outstanding }</span> }
        <span className="code">{ row.sourceRef || '' }</span>
    </div>
);
TaskRow.propTypes = {
    row: PropTypes.object.isRequired,
    overdue: PropTypes.bool,
    selected: PropTypes.bool,
    onSelect: PropTypes.func.isRequired,
    canToggle: PropTypes.func.isRequired,
    onToggle: PropTypes.func.isRequired,
    busyTaskId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

const InterviewRow = ({ row, selected, onSelect }) => (
    <div className={ `cal-row ${ CAL_INTERVIEW_TONE_CLASS[row.status] || CAL_INTERVIEW_TONE_CLASS.Upcoming }${ selected ? ' sel' : '' }` } data-cal-row="interview">
        <span className="ivmark" aria-hidden="true" />
        <span className="when">{ row.start }–{ row.end }</span>
        <button type="button" className="ttl" onClick={ () => onSelect({ kind: 'interview', id: row.id }) }>
            { row.employerName || row.workerName
                ? <><b>{ row.employerName || '—' }</b> × { row.workerName || '—' }{ methodLabel(row) ? ` · ${ methodLabel(row) }` : '' }</>
                : <b>{ row.title || CAL_COPY.interview }</b> }
        </button>
        <span className="st">{ row.status }</span>
        <span className="code">{ row.jobOfferRef || '' }</span>
    </div>
);
InterviewRow.propTypes = { row: PropTypes.object.isRequired, selected: PropTypes.bool, onSelect: PropTypes.func.isRequired };

const CalendarAgenda = ({ days, today, interviews, tasks, overdueTasks, selected, onSelect, canToggle, onToggle, busyTaskId = null }) => {
    const isSelected = (kind, id) => Boolean(selected && selected.kind === kind && selected.id === id);
    const overdueIds = new Set(overdueTasks.map((row) => row.id));
    const toggleProps = { canToggle, onToggle, busyTaskId };
    let any = overdueTasks.length > 0;
    const sections = days.map((iso) => {
        const rows = [
            ...tasks.filter((row) => row.date === iso && !overdueIds.has(row.id)).map((row) => ({ key: `${ iso }T${ row.time || '00:00' }-t`, node: <TaskRow key={ row.id } row={ row } selected={ isSelected('task', row.id) } onSelect={ onSelect } { ...toggleProps } /> })),
            ...interviews.filter((row) => row.date === iso).map((row) => ({ key: `${ iso }T${ row.start }-i`, node: <InterviewRow key={ row.id } row={ row } selected={ isSelected('interview', row.id) } onSelect={ onSelect } /> })),
        ].sort((a, b) => (a.key < b.key ? -1 : 1));
        if (rows.length) any = true;
        return { iso, rows };
    });

    return (
        <div className="cal-agenda" data-cal-days={ days.length }>
            { overdueTasks.length > 0 && (
                <section className="sec" aria-label={ translation('key_overdue') }>
                    <div className="ovh">
                        <h2>{ translation('key_overdue') }</h2>
                        <span className="n">{ CAL_COPY.overdueNote }</span>
                    </div>
                    <div className="cal-rows">
                        { [...overdueTasks].sort((a, b) => (`${ a.date }T${ a.time || '' }` < `${ b.date }T${ b.time || '' }` ? -1 : 1)).map((row) => (
                            <TaskRow key={ row.id } row={ row } overdue selected={ isSelected('task', row.id) } onSelect={ onSelect } { ...toggleProps } />
                        )) }
                    </div>
                </section>
            ) }
            { sections.map(({ iso, rows }) => (
                <section key={ iso } className="sec" data-cal-agenda-day={ iso }>
                    <div className="sechead">
                        <h2 className={ iso === today ? 'is-today' : '' }>{ formatShortDateDow(iso) }{ iso === today ? ` · ${ translation('key_today') }` : '' }</h2>
                        <span className="n">{ rows.length ? `${ rows.length } ${ rows.length > 1 ? CAL_COPY.items : CAL_COPY.item }` : CAL_COPY.nothingScheduled }</span>
                    </div>
                    <div className="cal-rows">{ rows.map((row) => row.node) }</div>
                </section>
            )) }
            { !any && <div className="cal-empty">{ days.length === 1 ? CAL_COPY.noResultsDay : CAL_COPY.noResults }</div> }
        </div>
    );
};

CalendarAgenda.propTypes = {
    days: PropTypes.arrayOf(PropTypes.string).isRequired,
    today: PropTypes.string.isRequired,
    interviews: PropTypes.array.isRequired,
    tasks: PropTypes.array.isRequired,
    overdueTasks: PropTypes.array.isRequired,
    selected: PropTypes.object,
    onSelect: PropTypes.func.isRequired,
    canToggle: PropTypes.func.isRequired,
    onToggle: PropTypes.func.isRequired,
    busyTaskId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default React.memo(CalendarAgenda);
