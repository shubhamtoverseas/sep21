import React, { useMemo } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import FilterSelect from "../../../../components/ui/FilterSelect";
import translation from "../../../../utils/translation";
import { CAL_COPY, CAL_SHOW, CAL_STATUS } from "./calendarConstants";

/* prototype .cal-filters: search · Staff · Show · Status · "N interviews · M tasks this week / this day".
   The three selectors are the kit filter popover (FilterSelect), as on the Employer / Worker toolbars (3 Nov). */
const CalendarFilters = ({ search, staff, staffOptions, show, status, counts, isDay, onSearch, onStaff, onShow, onStatus }) => {
    const staffList = useMemo(() => staffOptions.map((option) => ({
        value: option.value,
        label: option.value === 'me' ? `${ CAL_COPY.me }${ option.label ? ` (${ option.label })` : '' }` : option.label,
    })), [staffOptions]);
    const showList = useMemo(() => [
        { value: CAL_SHOW.ALL, label: translation('key_all') },
        { value: CAL_SHOW.INTERVIEWS, label: CAL_COPY.interviews },
        { value: CAL_SHOW.TASKS, label: CAL_COPY.tasks },
    ], []);
    const statusList = useMemo(() => [
        { value: CAL_STATUS.ALL, label: translation('key_all') },
        { value: CAL_STATUS.UPCOMING, label: CAL_COPY.upcoming },
        { value: CAL_STATUS.OVERDUE, label: translation('key_overdue') },
        { value: CAL_STATUS.COMPLETED, label: translation('key_completed') },
        { value: CAL_STATUS.CANCELLED, label: translation('key_cancelled') },
    ], []);
    return (
        <div className="cal-filters">
            <label className="cal-search">
                <Icon name="search" size={ 14 } strokeWidth={ 1.7 } />
                <input type="search" value={ search } placeholder={ CAL_COPY.searchPlaceholder } aria-label={ translation('key_search') } onChange={ (event) => onSearch(event.target.value) } />
            </label>
            <FilterSelect id="cal-filter-staff" className="cal-select" label={ translation('key_staff') } value={ staff } options={ staffList } onChange={ onStaff } menuWidth={ 200 } />
            <FilterSelect id="cal-filter-show" className="cal-select" label={ translation('key_show') } value={ show } options={ showList } onChange={ onShow } menuWidth={ 160 } />
            <FilterSelect id="cal-filter-status" className="cal-select" label={ translation('key_status') } value={ status } options={ statusList } onChange={ onStatus } menuWidth={ 160 } />
            <span className="cal-count" role="status">{ counts.interviews } { CAL_COPY.interviews.toLowerCase() } · { counts.tasks } { CAL_COPY.tasks.toLowerCase() } { isDay ? CAL_COPY.thisDay : CAL_COPY.thisWeek }</span>
        </div>
    );
};

CalendarFilters.propTypes = {
    search: PropTypes.string.isRequired,
    staff: PropTypes.string.isRequired,
    staffOptions: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })).isRequired,
    show: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    counts: PropTypes.shape({ interviews: PropTypes.number, tasks: PropTypes.number }).isRequired,
    isDay: PropTypes.bool.isRequired,
    onSearch: PropTypes.func.isRequired,
    onStaff: PropTypes.func.isRequired,
    onShow: PropTypes.func.isRequired,
    onStatus: PropTypes.func.isRequired,
};

export default React.memo(CalendarFilters);
