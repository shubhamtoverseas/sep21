import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import { headingCase } from "../../../../utils/utils";
import translation from "../../../../utils/translation";
import { CAL_COPY, CAL_VIEWS, CAL_VIEW_ORDER } from "./calendarConstants";
import { formatDayLabel, formatRangeLabel } from "./calendarTime";
import DateInput from "../../../../components/ui/DateInput";

const VIEW_LABELS = { [CAL_VIEWS.DAY]: CAL_COPY.day, [CAL_VIEWS.WEEK]: CAL_COPY.week, [CAL_VIEWS.AGENDA]: CAL_COPY.agenda };

/* prototype .cal-toolbar: title · HKT pill · Day / Week / Agenda · Today · ‹ › · range · Jump to date · spacer · N overdue · + Add task */
const CalendarToolbar = ({ view, date, days, isDay, overdueCount, onView, onToday, onStep, onJump, onOverdue, onAdd }) => (
    <div className="cal-toolbar">
        <h1>{ headingCase(translation('key_calendar')) }</h1>
        <span className="cal-tz">{ CAL_COPY.tz }</span>
        <div className="cal-seg" role="group" aria-label={ CAL_COPY.title }>
            { CAL_VIEW_ORDER.map((key) => (
                <button key={ key } type="button" aria-pressed={ view === key } onClick={ () => onView(key) }>{ VIEW_LABELS[key] }</button>
            )) }
        </div>
        <div className="cal-nav">
            <button type="button" className="cal-btn" onClick={ onToday }>{ translation('key_today') }</button>
            <button type="button" className="cal-btn icon" onClick={ () => onStep(-1) } aria-label={ isDay ? CAL_COPY.prevDay : CAL_COPY.prevWeek }>
                <Icon name="chev_left" size={ 14 } />
            </button>
            <button type="button" className="cal-btn icon" onClick={ () => onStep(1) } aria-label={ isDay ? CAL_COPY.nextDay : CAL_COPY.nextWeek }>
                <Icon name="chev_right" size={ 14 } />
            </button>
            <span className="cal-weeklabel" data-cal-range={ isDay ? 'day' : 'week' }>
                { isDay ? formatDayLabel(date) : formatRangeLabel(days[0], days[days.length - 1]) }
            </span>
            <label className="cal-jump">
                <span>{ CAL_COPY.jumpDate }</span>
                <DateInput className="cal-jump-field" value={ date } onChange={ (value) => { if (value) onJump(value); } } />
            </label>
        </div>
        <span className="cal-spacer" />
        { overdueCount > 0 && (
            <button type="button" className="cal-btn overdue" onClick={ onOverdue }>{ overdueCount } { CAL_COPY.overdueBtn }</button>
        ) }
        <button type="button" className="cal-btn primary" onClick={ onAdd }>
            <Icon name="plus" size={ 14 } strokeWidth={ 2 } /> { CAL_COPY.addTask }
        </button>
    </div>
);

CalendarToolbar.propTypes = {
    view: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    days: PropTypes.arrayOf(PropTypes.string).isRequired,
    isDay: PropTypes.bool.isRequired,
    overdueCount: PropTypes.number,
    onView: PropTypes.func.isRequired,
    onToday: PropTypes.func.isRequired,
    onStep: PropTypes.func.isRequired,
    onJump: PropTypes.func.isRequired,
    onOverdue: PropTypes.func.isRequired,
    onAdd: PropTypes.func.isRequired,
};

export default React.memo(CalendarToolbar);
