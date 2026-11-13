import React, { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import Btn from "../../../components/ui/Btn";
import Badge from "../../../components/ui/Badge";
import FilterSelect from "../../../components/ui/FilterSelect";
import Icon from "../../../components/Icon/Icon";
import DateRangePickerComponent from "../../../components/date-range-picker/DateRangePicker";
import translation from "../../../utils/translation";
import { absoluteRoute, headingCase } from "../../../utils/utils";
import routes from "../routes/routesConfig";
import { listingTrackStyle } from "../../../services/commonService";
import listStyles from "../Invoice/InvoiceList.module.css";
import empStyles from "../Employer/newui/EmployerDashboard.module.css";
import shared from "../SettingsPage/newui/settings-newui.module.css";
import "../../../components/ui/listing-tracks.css";
import "./reports-page.css";

const ALL = "";

/** Status chip on a report row: the kit Badge, as the Invoice list uses it (dot + text, tone by variant). */
export const ReportStatusChip = ({ variant, children }) => <Badge variant={variant}>{children}</Badge>;
ReportStatusChip.propTypes = { variant: PropTypes.string, children: PropTypes.node };

/** Plain value tag on a report row (a time, a half-day): the neutral list tag the HRMS pages use next to a date. */
export const ReportTag = ({ children }) => <span className={listStyles.statusTag} data-tone="neutral">{children}</span>;
ReportTag.propTypes = { children: PropTypes.node };

/** Date + tag pair in one cell. */
export const ReportDateCell = ({ children }) => <span className="rpt-date-cell">{children}</span>;
ReportDateCell.propTypes = { children: PropTypes.node };

/** Long free text in a cell: clipped to one line with the full value as the native title, as the dashboard tables do
 *  (no bootstrap OverlayTrigger in the new UI). */
export const ReportClamp = ({ children, title }) => <span className="rpt-clamp" title={title || undefined}>{children}</span>;
ReportClamp.propTypes = { children: PropTypes.node, title: PropTypes.string };

/** Page frame shared by every report: the Settings-style breadcrumb (Reports › <title>, not on the Reports home;
 *  Shubham 1 Nov), then the list-page header (title + actions) over the page body. */
export const ReportPage = ({ title, actions = null, className = "", home = false, children }) => (
    <div className={`${listStyles.pageWrap} rpt ${className}`}>
        {!home && (
            <nav className={shared.breadcrumb} aria-label={translation("key_reports")}>
                <Link to={absoluteRoute(routes.reports)}>{headingCase(translation("key_reports"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{headingCase(title)}</span>
            </nav>
        )}
        <div className={listStyles.pageHeader}>
            <div className={listStyles.pageHeaderBody}>
                <h1 className={listStyles.pageTitle}>{headingCase(title)}</h1>
            </div>
            {actions && <div className={listStyles.pageHeaderActions}>{actions}</div>}
        </div>
        {children}
    </div>
);

ReportPage.propTypes = {
    title: PropTypes.string.isRequired,
    actions: PropTypes.node,
    className: PropTypes.string,
    home: PropTypes.bool,
    children: PropTypes.node,
};

/** The kit search pill. */
export const ReportSearchField = ({ id, value, onChange, placeholder }) => (
    <div className={`${listStyles.controlsSearch} rpt-search`}>
        <Icon name="search" size={14} />
        <input
            id={id}
            type="search"
            className={listStyles.controlsSearchInput}
            placeholder={placeholder || translation("key_search")}
            value={value}
            onChange={onChange}
            aria-label={translation("key_search")}
            autoComplete="off"
        />
    </div>
);

ReportSearchField.propTypes = {
    id: PropTypes.string.isRequired,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
};

/**
 * Kit "Label · Value" chip speaking the react-select contract the report filters already use:
 * `options` are `{ value, label }`, `value` is the selected option object(s), `onChange` receives option object(s).
 */
export const ReportChip = ({ id, label, options, value, onChange, multiple = false, menuWidth }) => {
    const chipOptions = useMemo(() => [{ value: ALL, label: translation("key_all") }, ...(options || [])], [options]);
    const chipValue = useMemo(() => (
        multiple ? (Array.isArray(value) ? value.map((item) => String(item.value)) : []) : (value ? String(value.value) : ALL)
    ), [multiple, value]);
    const handleChange = useCallback((next) => {
        const byValue = (key) => (options || []).find((item) => String(item.value) === String(key)) || null;
        onChange(multiple ? next.map(byValue).filter(Boolean) : byValue(next));
    }, [multiple, onChange, options]);

    return <FilterSelect id={id} label={label} options={chipOptions} value={chipValue} onChange={handleChange} multiple={multiple} menuWidth={menuWidth} />;
};

ReportChip.propTypes = {
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    options: PropTypes.array,
    value: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
    onChange: PropTypes.func.isRequired,
    multiple: PropTypes.bool,
    menuWidth: PropTypes.number,
};

/* The date-range select drawn borderless inside the chip pill; menu portaled above the bar. */
const dateSelectStyles = {
    control: (base) => ({ ...base, minHeight: 34, maxHeight: 34, border: 0, boxShadow: "none", background: "transparent", cursor: "pointer", fontFamily: "var(--sans)", fontSize: "12.5px", color: "#3d4552" }),
    valueContainer: (base) => ({ ...base, padding: "0 0 0 4px", flexWrap: "nowrap" }),
    singleValue: (base) => ({ ...base, color: "#3d4552" }),
    placeholder: (base) => ({ ...base, color: "#3d4552" }),
    input: (base) => ({ ...base, margin: 0, padding: 0 }),
    indicatorSeparator: () => ({ display: "none" }),
    indicatorsContainer: (base) => ({ ...base, height: 34 }),
    dropdownIndicator: (base) => ({ ...base, padding: "0 6px 0 2px", color: "var(--text-4)" }),
    clearIndicator: (base) => ({ ...base, padding: "0 2px", color: "var(--text-4)" }),
    menu: (base) => ({ ...base, borderRadius: 8, fontFamily: "var(--sans)", fontSize: "12.5px" }),
    menuPortal: (base) => ({ ...base, zIndex: 1100 }),
    option: (base) => ({ ...base, padding: "7px 10px" }),
};

/** "Label · <preset range>" pill around the legacy date-range picker (same onChange contract). */
export const ReportDateChip = ({ label, ...pickerProps }) => (
    <div className="rpt-date">
        <span className="rpt-date-label">{label} ·</span>
        <DateRangePickerComponent selectStyles={dateSelectStyles} {...pickerProps} />
    </div>
);

ReportDateChip.propTypes = {
    label: PropTypes.string.isRequired,
};

/** Header action: Export (busy label while the file is building). */
export const ReportExportButton = ({ onClick, disabled = false, busy = false }) => (
    <Btn variant="secondary" onClick={onClick} disabled={disabled || busy}>
        <Icon name="download" size={14} /> {busy ? translation("key_loading") : translation("key_export")}
    </Btn>
);

ReportExportButton.propTypes = {
    onClick: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    busy: PropTypes.bool,
};

/** The filter bar: one wrapping row of chips, then Go / Clear at the end. */
export const ReportFilters = ({ onGo, onClear, children }) => (
    <div className={listStyles.filterBar}>
        <div className={`${listStyles.controlsRow} ${shared.filtersRow}`}>
            {children}
            <div className="rpt-actions">
                {onGo && <Btn variant="primary" className="rpt-btn" onClick={onGo}>{translation("key_go")}</Btn>}
                {onClear && <button type="button" className={shared.clearBtn} onClick={onClear}>{translation("key_clear")}</button>}
            </div>
        </div>
    </div>
);

ReportFilters.propTypes = {
    onGo: PropTypes.func,
    onClear: PropTypes.func,
    children: PropTypes.node,
};

const sortIconName = (active, order) => (!active ? "sort" : order === "DESC" ? "sort_desc" : "sort_asc");
const ariaSort = (active, order) => (!active ? "none" : order === "DESC" ? "descending" : "ascending");
const stickyClass = `${listStyles.stickyCol} ${empStyles.stickyName}`;

/* header cell: the legacy column contract (`header`, `sortKey`) on the dashboard header (sort button + glyph, aria-sort) */
const ReportHeaderCell = ({ column, first, sortBy, sortOrder, onSort }) => {
    const active = Boolean(column.sortKey) && column.sortKey === sortBy;
    const style = listingTrackStyle(column);
    const className = first ? stickyClass : undefined;
    if (!column.sortKey || !onSort) return <th scope="col" style={style} className={className}>{column.header}</th>;
    return (
        <th scope="col" style={style} className={className} aria-sort={ariaSort(active, sortOrder)}>
            <button type="button" className={`${empStyles.thSortBtn} ${active ? empStyles.thSortActive : ""}`} onClick={() => onSort(column.sortKey)}>
                <span>{column.header}</span>
                <Icon name={sortIconName(active, sortOrder)} size={11} strokeWidth={1.8} />
            </button>
        </th>
    );
};

ReportHeaderCell.propTypes = {
    column: PropTypes.object.isRequired,
    first: PropTypes.bool,
    sortBy: PropTypes.string,
    sortOrder: PropTypes.string,
    onSort: PropTypes.func,
};

/**
 * Report listing on the shared dashboard table (Job Offer / Employer dashboards): card, sticky first column with its divider,
 * horizontally scrolling body, 38px uppercase header, 44px rows. Takes the legacy report column definitions as they are
 * (`header`, `sortKey`, `render` / `accessor`) and the page's `{ sort, order }` header filter; `children` sit in the table foot.
 */
export const ReportTable = ({ columns, rows, sortBy, sortOrder, onSort, onCell, children }) => {
    const list = Array.isArray(rows) ? rows : [];
    return (
    <div className={`${listStyles.tableCard} rpt-table`}>
        <div className={empStyles.tableScroll}>
            <table className={empStyles.table}>
                <thead>
                    <tr>{columns.map((column, index) => <ReportHeaderCell key={column.sortKey || column.header || index} column={column} first={index === 0} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />)}</tr>
                </thead>
                <tbody>
                    {list.length === 0 ? (
                        <tr><td colSpan={columns.length} className={`${listStyles.emptyStateCell} ${empStyles.stateCell}`}>{translation("key_no_records_found")}</td></tr>
                    ) : list.map((row, rowIndex) => (
                        <tr key={row?.id ?? rowIndex} className={empStyles.row}>
                            {columns.map((column, index) => (
                                <td key={column.sortKey || column.header || index} className={index === 0 ? stickyClass : undefined} style={listingTrackStyle(column)} onClick={onCell ? () => onCell(row, column) : undefined}>
                                    {column.render ? column.render(row) : row?.[column.accessor]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {/* reports have no left-side count cluster, so the lone pager keeps the prototype's bottom-right place */}
        {children && <div className={`${listStyles.tableFoot} rpt-foot`}>{children}</div>}
    </div>
    );
};

ReportTable.propTypes = {
    columns: PropTypes.array.isRequired,
    rows: PropTypes.array.isRequired,
    sortBy: PropTypes.string,
    sortOrder: PropTypes.string,
    onSort: PropTypes.func,
    onCell: PropTypes.func,
    children: PropTypes.node,
};

/** Row of summary figures above a table (label eyebrow + mono value). */
export const ReportStats = ({ items }) => (
    <div className="rpt-stats">
        {items.map((item) => (
            <div key={item.key} className="rpt-stat">
                <span className="rpt-stat-label">{item.label}</span>
                <span className={`rpt-stat-value ${item.colorClass || ""}`}>{item.value}</span>
            </div>
        ))}
    </div>
);

ReportStats.propTypes = {
    items: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        label: PropTypes.string,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        colorClass: PropTypes.string,
    })).isRequired,
};

/** Toolbar between a filter bar and its table (search on the left, actions on the right). */
export const ReportToolbar = ({ children, actions = null }) => (
    <div className="rpt-toolbar">
        <div className="rpt-toolbar-main">{children}</div>
        {actions && <div className="rpt-actions">{actions}</div>}
    </div>
);

ReportToolbar.propTypes = {
    children: PropTypes.node,
    actions: PropTypes.node,
};
