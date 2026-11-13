import React, { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import FilterSelect from "../../../../components/ui/FilterSelect";
import translation from "../../../../utils/translation";
import listStyles from "../../Invoice/InvoiceList.module.css";
import shared from "./settings-newui.module.css";
import { STATUS_FILTER_OPTIONS } from "./settingsListConfig";

/** Search + Status (Active / Inactive / All) + Clear — the settings listing filter bar. */
const SettingsListFilters = ({ id, filters, searchInput, isFiltered, searchPlaceholder, onSearchChange, onFilterChange, onClear, children }) => {
    const statusOptions = useMemo(() => STATUS_FILTER_OPTIONS(), []);

    const handleSearch = useCallback((event) => onSearchChange(event.target.value), [onSearchChange]);
    const handleStatus = useCallback((value) => onFilterChange("status", value), [onFilterChange]);

    return (
        <div className={listStyles.filterBar}>
            <div className={`${listStyles.controlsRow} ${shared.filtersRow}`}>
                <div className={listStyles.controlsSearch}>
                    <Icon name="search" size={14} />
                    <input
                        id={`${id}-search`}
                        type="search"
                        className={listStyles.controlsSearchInput}
                        placeholder={searchPlaceholder || translation("key_search")}
                        value={searchInput}
                        onChange={handleSearch}
                        aria-label={translation("key_search")}
                        autoComplete="off"
                    />
                </div>

                <FilterSelect
                    id={`${id}-filter-status`}
                    label={translation("key_status")}
                    value={filters.status}
                    options={statusOptions}
                    menuWidth={160}
                    onChange={handleStatus}
                />

                {children}

                <button type="button" className={shared.clearBtn} onClick={onClear} disabled={!isFiltered}>
                    {translation("key_clear")}
                </button>
            </div>
        </div>
    );
};

SettingsListFilters.propTypes = {
    id: PropTypes.string.isRequired,
    filters: PropTypes.shape({
        status: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    }).isRequired,
    searchInput: PropTypes.string.isRequired,
    isFiltered: PropTypes.bool,
    searchPlaceholder: PropTypes.string,
    onSearchChange: PropTypes.func.isRequired,
    onFilterChange: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    children: PropTypes.node,
};

export default React.memo(SettingsListFilters);
