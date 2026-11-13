import React, { useCallback, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import "@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css";
import "react-calendar/dist/Calendar.css";
import "../../../../components/date-range-picker/date-range-picker-theme.css";
import DateRangePicker from "@wojtekmaj/react-daterange-picker";
import Icon from "../../../../components/Icon/Icon";
import FilterSelect from "../../../../components/ui/FilterSelect";
import translation from "../../../../utils/translation";
import listStyles from "../../Invoice/InvoiceList.module.css";
import styles from "./EmployerDashboard.module.css";
import { ALL_OPTION_VALUE, CREATED_OPTIONS, SORT_OPTIONS } from "./employerDashboardConfig";
import { DATE_DISPLAY_FORMAT } from "./employerNewUiConstants";
import useOutsideClick from "../../../../hooks/useOutsideClick";
import { EMPLOYER_SEARCH_HELP_TEXT, EMPLOYER_SEARCH_PLACEHOLDER } from "./employerNewUiConstants";

const toApiDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const EmployerDashboardFilters = ({
    filters,
    searchInput,
    formatError = "",
    isFiltered,
    options,
    onSearchChange,
    searchEnabled = true,
    searchDisabledTitle,
    onFilterChange,
    onCustomRange,
    onClear,
}) => {
    const [showCalendar, setShowCalendar] = useState(false);

    const createdOptions = useMemo(() => {
        const presets = CREATED_OPTIONS();
        if (filters.created !== "custom" || !filters.start_date || !filters.end_date) return presets;
        const rangeLabel = `${dayjs(filters.start_date).format(DATE_DISPLAY_FORMAT)} – ${dayjs(filters.end_date).format(DATE_DISPLAY_FORMAT)}`;
        return presets.map((option) => (option.value === "custom" ? { ...option, label: rangeLabel } : option));
    }, [filters.created, filters.start_date, filters.end_date]);
    const sortOptions = useMemo(() => SORT_OPTIONS(), []);

    const handleSearch = useCallback((event) => onSearchChange(event.target.value), [onSearchChange]);

    /* DASH §9 search help: hover or focus shows it, a click pins it, a second click unpins it,
       Escape closes it and returns focus to the button, an outside click closes it */
    const [helpPeek, setHelpPeek] = useState(false);
    const [helpPinned, setHelpPinned] = useState(false);
    const helpWrapRef = useRef(null);
    const helpBtnRef = useRef(null);
    const helpOpen = helpPeek || helpPinned;
    const closeHelp = useCallback(() => { setHelpPinned(false); setHelpPeek(false); }, []);
    useOutsideClick(helpWrapRef, closeHelp, helpPinned);
    const onHelpKeyDown = useCallback((event) => {
        if (event.key !== 'Escape' || !helpOpen) return;
        event.preventDefault();
        closeHelp();
        helpBtnRef.current?.focus();
    }, [helpOpen, closeHelp]);

    const handleCreatedChange = useCallback((value) => {
        onFilterChange("created", value);
        setShowCalendar(value === "custom");
    }, [onFilterChange]);

    const handleRange = useCallback((range) => {
        if (Array.isArray(range) && range[0] && range[1]) {
            onCustomRange(toApiDate(range[0]), toApiDate(range[1]));
            setShowCalendar(false);
        }
    }, [onCustomRange]);

    const calendarValue = useMemo(() => [
        filters.start_date ? new Date(filters.start_date) : null,
        filters.end_date ? new Date(filters.end_date) : null,
    ], [filters.start_date, filters.end_date]);

    return (
        <div className={`${listStyles.filterBar} ${styles.card10} ${styles.filterCard}`}>
            <div className={`${listStyles.controlsRow} ${styles.filtersRow}`}>
                <div className={`${listStyles.controlsSearch} ${styles.search}`}>
                    <Icon name="search" size={14} />
                    <input
                        id="employer-search"
                        type="text"
                        className={listStyles.controlsSearchInput}
                        placeholder={EMPLOYER_SEARCH_PLACEHOLDER}
                        value={searchEnabled ? searchInput : ""}
                        onChange={handleSearch}
                        disabled={!searchEnabled}
                        aria-disabled={!searchEnabled}
                        title={searchEnabled ? undefined : searchDisabledTitle}
                        aria-label={translation("key_search")}
                        aria-invalid={Boolean(formatError)}
                        aria-describedby={[formatError ? "employer-search-error" : null, helpOpen ? "employer-search-help" : null].filter(Boolean).join(" ") || undefined}
                        autoComplete="off"
                    />
                    {formatError && <span id="employer-search-error" className={styles.searchError} role="alert">{formatError}</span>}
                    <span
                        ref={helpWrapRef}
                        className={`${styles.searchHelpWrap} ${helpOpen ? styles.searchHelpOpen : ""} ${searchEnabled ? "" : styles.searchHelpOff}`}
                        onMouseEnter={() => setHelpPeek(true)}
                        onMouseLeave={() => setHelpPeek(false)}
                        onKeyDown={onHelpKeyDown}
                    >
                        <button
                            ref={helpBtnRef}
                            type="button"
                            className={styles.searchHelpBtn}
                            aria-label={ translation('key_jo_dash_search_help_label') }
                            aria-expanded={helpOpen}
                            aria-pressed={helpPinned}
                            onClick={() => setHelpPinned((pinned) => !pinned)}
                            onFocus={() => setHelpPeek(true)}
                            onBlur={() => setHelpPeek(false)}
                        >
                            <Icon name="help" size={13} strokeWidth={1.8} />
                        </button>
                        <span id="employer-search-help" className={styles.searchHelpPop} role="tooltip">{EMPLOYER_SEARCH_HELP_TEXT}</span>
                    </span>
                </div>

                {/* DASH §3 order: Created · Primary Language · District · Location · Branch · Sort */}
                <div className={`date-range-container ${styles.createdWrap}`}>
                    <FilterSelect id="emp-filter-created" label={translation("key_created")} value={filters.created}
                        options={createdOptions} menuWidth={200} onChange={handleCreatedChange} />
                    {showCalendar && (
                        <div className={styles.createdPop}>
                            <DateRangePicker
                                onChange={handleRange}
                                value={calendarValue}
                                isOpen
                                onCalendarClose={() => {
                                    setShowCalendar(false);
                                    /* audit L11: closing the calendar without a committed range reverts Created to All */
                                    if (!filters.start_date || !filters.end_date) onFilterChange("created", ALL_OPTION_VALUE);
                                }}
                            />
                        </div>
                    )}
                </div>
                <FilterSelect id="emp-filter-language" label={translation("key_primary_language")} value={filters.primary_language} multiple
                    options={options.languageOptions} onChange={(value) => onFilterChange("primary_language", value)} />
                {options.showDistrict && (
                    <FilterSelect id="emp-filter-district" label={translation("key_district")} value={filters.district} multiple
                        options={options.districtOptions} onChange={(value) => onFilterChange("district", value)} />
                )}
                {options.showLocation && (
                    <FilterSelect id="emp-filter-location" label={translation("key_location")} value={filters.location} multiple
                        options={options.locationOptions} onChange={(value) => onFilterChange("location", value)} />
                )}
                {options.showBranch && (
                    <FilterSelect id="emp-filter-branch" label={translation("key_branch")} value={filters.branch_id} multiple
                        options={options.branchOptions} onChange={(value) => onFilterChange("branch_id", value)} />
                )}
                <FilterSelect id="emp-filter-sort" label={translation("key_sort_by")} value={filters.sort_by}
                    options={sortOptions} menuWidth={200} onChange={(value) => onFilterChange("sort_by", value)} />

                {isFiltered && (
                    <button type="button" className={styles.clearBtn} onClick={onClear}>
                        {translation("key_clear_filters")}
                    </button>
                )}
            </div>

        </div>
    );
};

const optionShape = PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    label: PropTypes.string,
}));

EmployerDashboardFilters.propTypes = {
    filters: PropTypes.object.isRequired,
    searchInput: PropTypes.string.isRequired,
    formatError: PropTypes.string,
    isFiltered: PropTypes.bool,
    options: PropTypes.shape({
        locationOptions: optionShape,
        branchOptions: optionShape,
        languageOptions: optionShape,
        districtOptions: optionShape,
        showDistrict: PropTypes.bool,
        showLocation: PropTypes.bool,
        showBranch: PropTypes.bool,
    }).isRequired,
    onSearchChange: PropTypes.func.isRequired,
    searchEnabled: PropTypes.bool,
    searchDisabledTitle: PropTypes.string,
    onFilterChange: PropTypes.func.isRequired,
    onCustomRange: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
};

export default React.memo(EmployerDashboardFilters);
