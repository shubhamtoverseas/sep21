import React, { useCallback, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import "@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css";
import "react-calendar/dist/Calendar.css";
import "../../../../../components/date-range-picker/date-range-picker-theme.css";
import DateRangePicker from "@wojtekmaj/react-daterange-picker";
import Icon from "../../../../../components/Icon/Icon";
import FilterSelect from "../../../../../components/ui/FilterSelect";
import ColumnsChooser from "../../../../../components/ui/ColumnsChooser";
import useOutsideClick from "../../../../../hooks/useOutsideClick";
import translation from "../../../../../utils/translation";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import empStyles from "../../../Employer/newui/EmployerDashboard.module.css";
import styles from "./JobOfferDashboard.module.css";
import { JO_DASH_API_DATE, JO_DASH_COLUMN_ORDER, JO_DASH_COPY, JO_DASH_MANDATORY_COLUMNS } from "../../jobOfferConstants";
import { createdOptions, isMacauLocation, sortOptions, statusOptions, typeOptions } from "./jobOfferDashboardConfig";

const DISPLAY_DATE = 'DD/MM/YYYY';
const toApiDate = (date) => dayjs(date).format(JO_DASH_API_DATE);

const JobOfferDashboardFilters = ({ filters, searchInput, searchEnabled = true, searchDisabledTitle, isFiltered, options, columnKeys, columnLabels, showColumns, onSearchChange, onFilterChange, onSortChange, onCustomRange, onClear, onToggleColumn }) => {
    const [showCalendar, setShowCalendar] = useState(false);
    const created = useMemo(() => {
        const presets = createdOptions();
        if (filters.created !== 'custom' || !filters.from_date || !filters.to_date) return presets;
        const label = `${ dayjs(filters.from_date).format(DISPLAY_DATE) } – ${ dayjs(filters.to_date).format(DISPLAY_DATE) }`;
        return presets.map((o) => (o.value === 'custom' ? { ...o, label } : o));
    }, [filters.created, filters.from_date, filters.to_date]);
    const statuses = useMemo(() => statusOptions(options.allowedStatusIds, options.isAdmin), [options.allowedStatusIds, options.isAdmin]);
    const types = useMemo(() => typeOptions(), []);
    const sorts = useMemo(() => sortOptions(), []);

    const [helpPeek, setHelpPeek] = useState(false);
    const [helpPinned, setHelpPinned] = useState(false);
    const helpWrapRef = useRef(null);
    const helpBtnRef = useRef(null);
    const helpOpen = helpPeek || helpPinned;
    const closeHelp = useCallback(() => { setHelpPinned(false); setHelpPeek(false); }, []);
    useOutsideClick(helpWrapRef, closeHelp, helpPinned);
    const onHelpKey = useCallback((event) => {
        if (event.key !== 'Escape' || !helpOpen) return;
        event.preventDefault(); closeHelp(); helpBtnRef.current?.focus();
    }, [helpOpen, closeHelp]);

    const handleCreated = useCallback((value) => { onFilterChange('created', value); setShowCalendar(value === 'custom'); }, [onFilterChange]);
    const handleRange = useCallback((range) => {
        if (Array.isArray(range) && range[0] && range[1]) { onCustomRange(toApiDate(range[0]), toApiDate(range[1])); setShowCalendar(false); }
    }, [onCustomRange]);
    const calendarValue = useMemo(() => [filters.from_date ? new Date(filters.from_date) : null, filters.to_date ? new Date(filters.to_date) : null], [filters.from_date, filters.to_date]);

    const statusValue = filters.status.length === 1 ? String(filters.status[0]) : '';
    const statusDisplay = useMemo(() => (filters.status.length > 1 ? [{ value: '', label: `${ filters.status.length } ${ translation('key_selected') }` }, ...statuses.slice(1)] : statuses), [filters.status.length, statuses]);

    return (
        <div className={ `${ listStyles.filterBar } ${ empStyles.card10 } ${ empStyles.filterCard }` }>
            <div className={ `${ listStyles.controlsRow } ${ empStyles.filtersRow }` }>
                <div className={ `${ listStyles.controlsSearch } ${ styles.search }` }>
                    <Icon name="search" size={ 14 } />
                    <input
                        id="jo-search"
                        type="text"
                        className={ listStyles.controlsSearchInput }
                        placeholder={ JO_DASH_COPY.searchPlaceholder }
                        value={ searchEnabled ? searchInput : '' }
                        disabled={ !searchEnabled }
                        aria-disabled={ !searchEnabled }
                        title={ searchEnabled ? undefined : searchDisabledTitle }
                        onChange={ (event) => onSearchChange(event.target.value) }
                        aria-label={ JO_DASH_COPY.searchPlaceholder.replace(/…$/, '') }
                        aria-describedby="jo-search-help"
                        autoComplete="off"
                    />
                    <span ref={ helpWrapRef } className={ `${ empStyles.searchHelpWrap } ${ helpOpen ? empStyles.searchHelpOpen : '' } ${ searchEnabled ? '' : empStyles.searchHelpOff }` } onMouseEnter={ () => setHelpPeek(true) } onMouseLeave={ () => setHelpPeek(false) } onKeyDown={ onHelpKey }>
                        <button ref={ helpBtnRef } type="button" className={ empStyles.searchHelpBtn } aria-label={ JO_DASH_COPY.searchHelpLabel } aria-expanded={ helpOpen } aria-pressed={ helpPinned } onClick={ () => setHelpPinned((p) => !p) } onFocus={ () => setHelpPeek(true) } onBlur={ () => setHelpPeek(false) }>
                            { /* prototype search-help uses the ?-in-circle icon, not the i glyph */ }
                            <Icon name="help" size={ 13 } strokeWidth={ 1.8 } />
                        </button>
                        <span id="jo-search-help" className={ empStyles.searchHelpPop } role="tooltip">{ JO_DASH_COPY.searchHelp }</span>
                    </span>
                </div>

                <div className={ `date-range-container ${ empStyles.createdWrap }` }>
                    <FilterSelect id="jo-filter-created" label={ JO_DASH_COPY.created } value={ filters.created } options={ created } menuWidth={ 200 } onChange={ handleCreated } />
                    { showCalendar && (
                        <div className={ empStyles.createdPop }>
                            <DateRangePicker onChange={ handleRange } value={ calendarValue } isOpen onCalendarClose={ () => setShowCalendar(false) } />
                        </div>
                    ) }
                </div>
                <FilterSelect id="jo-filter-status" label={ JO_DASH_COPY.status } value={ statusValue } options={ statusDisplay } menuWidth={ 190 } onChange={ (value) => onFilterChange('status', value ? [value] : []) } />
                <FilterSelect id="jo-filter-type" label={ JO_DASH_COPY.type } value={ filters.current_engagement } options={ types } onChange={ (value) => onFilterChange('current_engagement', value) } />
                { options.locationOptions.length > 0 && (
                    <FilterSelect id="jo-filter-location" label={ JO_DASH_COPY.location } value={ filters.location } options={ options.locationOptions } onChange={ (value) => onFilterChange('location', value) } />
                ) }
                { !isMacauLocation(filters.location) && options.branchOptions.length > 0 && (
                    <FilterSelect id="jo-filter-branch" label={ JO_DASH_COPY.branch } value={ filters.branch_location } multiple options={ [{ value: '', label: translation('key_all') }, ...options.branchOptions] } onChange={ (value) => onFilterChange('branch_location', value) } />
                ) }
                <FilterSelect id="jo-filter-sort" label={ JO_DASH_COPY.sort } value={ filters.sort_by } options={ sorts } menuWidth={ 200 } onChange={ onSortChange } />

                { isFiltered && (
                    <button type="button" className={ empStyles.clearBtn } onClick={ onClear }>{ JO_DASH_COPY.clearFilters }</button>
                ) }
                { showColumns && <span className={ styles.grow } /> }
                { showColumns && <ColumnsChooser order={ JO_DASH_COLUMN_ORDER } mandatory={ JO_DASH_MANDATORY_COLUMNS } selected={ columnKeys } labels={ columnLabels } label={ JO_DASH_COPY.columns } title={ JO_DASH_COPY.columnsTitle } onToggle={ onToggleColumn } /> }
            </div>
        </div>
    );
};

const optionShape = PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), label: PropTypes.string }));
JobOfferDashboardFilters.propTypes = {
    filters: PropTypes.object.isRequired,
    searchInput: PropTypes.string.isRequired,
    searchEnabled: PropTypes.bool,
    searchDisabledTitle: PropTypes.string,
    isFiltered: PropTypes.bool,
    options: PropTypes.shape({ locationOptions: optionShape, branchOptions: optionShape, allowedStatusIds: PropTypes.array, isAdmin: PropTypes.bool }).isRequired,
    columnKeys: PropTypes.array.isRequired,
    columnLabels: PropTypes.object.isRequired,
    showColumns: PropTypes.bool,
    onSearchChange: PropTypes.func.isRequired,
    onFilterChange: PropTypes.func.isRequired,
    onSortChange: PropTypes.func.isRequired,
    onCustomRange: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    onToggleColumn: PropTypes.func.isRequired,
};

export default React.memo(JobOfferDashboardFilters);
