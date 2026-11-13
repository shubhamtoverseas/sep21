import React, { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import Btn from "../../../../components/ui/Btn";
import PaginationBar from "../../../../components/Layout/pagination/PaginationBar";
import translation from "../../../../utils/translation";
import { hasActiveTextSelection, isRowControlTarget, listingTableWidth, listingTrackStyle } from "../../../../services/commonService";
import "../../../../components/ui/listing-tracks.css";
import listStyles from "../../Invoice/InvoiceList.module.css";
import styles from "./EmployerDashboard.module.css";
import { SKELETON_ROWS, employerFooterMatchKey } from "./employerNewUiConstants";
import { sortNextActionLabel } from "./employerDashboardConfig";

const sortIconName = (active, order) => (!active ? "sort" : order === "DESC" ? "sort_desc" : "sort_asc");
const ariaSort = (active, order) => (!active ? "none" : order === "DESC" ? "descending" : "ascending");

const HeaderCell = ({ column, sortBy, sortOrder, onSort }) => {
    const active = Boolean(column.sortKey) && column.sortKey === sortBy;
    const style = listingTrackStyle(column);
    const className = column.sticky ? `${listStyles.stickyCol} ${styles.stickyName}` : "";
    if (!column.sortKey) {
        return <th scope="col" style={style} className={className}>{column.label}</th>;
    }
    return (
        <th scope="col" style={style} className={className} aria-sort={ariaSort(active, sortOrder)}>
            <button
                type="button"
                className={`${styles.thSortBtn} ${active ? styles.thSortActive : ""}`}
                onClick={() => onSort(column.sortKey)}
                title={sortNextActionLabel(column.label, active, sortOrder)}
                aria-label={sortNextActionLabel(column.label, active, sortOrder)}
            >
                <span>{column.label}</span>
                <Icon name={sortIconName(active, sortOrder)} size={11} strokeWidth={1.8} />
            </button>
        </th>
    );
};

HeaderCell.propTypes = {
    column: PropTypes.object.isRequired,
    sortBy: PropTypes.string,
    sortOrder: PropTypes.string,
    onSort: PropTypes.func.isRequired,
};

const SkeletonRows = ({ columns }) => (
    Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <tr key={`sk-${index}`} className={styles.skeletonRow} aria-hidden="true">
            {columns.map((column) => (
                <td key={column.key} className={column.sticky ? `${listStyles.stickyCol} ${styles.stickyName}` : ""}>
                    <span className={styles.skeletonBar} />
                </td>
            ))}
        </tr>
    ))
);

SkeletonRows.propTypes = {
    columns: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const EmployerDashboardTable = ({
    columns,
    rows,
    isLoading,
    error,
    sortBy,
    sortOrder,
    pageInfo,
    onSort,
    onRowClick,
    rowOpenLabel,
    onPrev,
    onNext,
    onLimitChange,
    hidePerPage = false,
    footNote = "",
    emptyText = "",
    onRetry,
}) => {
    const showSkeleton = isLoading && rows.length === 0;
    /* audit W35 (SR-03 / SR-06): a failed request shows the error state even when an earlier page is still in memory —
       stale rows are never presented as the current result */
    const showError = !isLoading && Boolean(error);
    const showEmpty = !isLoading && !error && rows.length === 0;

    /* Whole-row opening (SR-05): nested controls and text selections never fire the row; keyboard acts on the row itself */
    const handleRowClick = useCallback((event, row) => {
        if (isRowControlTarget(event.target) || hasActiveTextSelection(event.currentTarget)) return;
        onRowClick(row);
    }, [onRowClick]);

    const handleRowKey = useCallback((event, row) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onRowClick(row);
        }
    }, [onRowClick]);

    /* SR-06: the sum of the tracks is the table's minimum width; it fills the card above that (Shubham, 2 Nov). The duplicates page (no roles) keeps its own widths */
    const trackedWidth = useMemo(() => listingTableWidth(columns), [columns]);
    const tableStyle = trackedWidth ? { minWidth: trackedWidth } : undefined;

    /* L-47: with a search or filters and a known accessible total → "X of TOTAL employers match(es) your search / these filters" */
    const scoped = pageInfo.accessible > 0 && (pageInfo.searching || pageInfo.filtered);
    const countText = scoped
        ? `${pageInfo.total} ${translation("key_of")} ${pageInfo.accessible} ${translation("key_employers_lc")} ${translation(employerFooterMatchKey(pageInfo))}`
        : pageInfo.total
            ? `${pageInfo.from}–${pageInfo.to} ${translation("key_of")} ${pageInfo.total} ${translation("key_employers_lc")}`
            : `0 ${translation("key_employers_lc")}`;

    return (
        <div className={`${listStyles.tableCard} ${styles.card10}`}>
            <div className={styles.tableScroll} aria-busy={isLoading}>
                <table className={`${styles.table} ${trackedWidth ? "mc-tracks" : ""} ${isLoading && rows.length ? styles.tableRefreshing : ""}`} style={tableStyle}>
                    <thead>
                        <tr>
                            {columns.map((column) => (
                                <HeaderCell key={column.key} column={column} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {showSkeleton && <SkeletonRows columns={columns} />}
                        {showError && (
                            <tr>
                                <td colSpan={columns.length} className={`${listStyles.emptyStateCell} ${styles.stateCell}`}>
                                    <div className={styles.stateBody}>
                                        <span>{translation("key_couldnt_load_this_view")}</span>
                                        <Btn variant="secondary" onClick={onRetry}>
                                            <Icon name="refresh" size={13} /> {translation("key_retry")}
                                        </Btn>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {showEmpty && (
                            <tr>
                                <td colSpan={columns.length} className={`${listStyles.emptyStateCell} ${styles.stateCell}`}>
                                    {emptyText || translation("key_no_employers_match_search")}
                                </td>
                            </tr>
                        )}
                        {!showError && rows.map((row) => (
                            <tr
                                key={row.employer_id ?? row.id}
                                className={styles.row}
                                data-row-open={row.employer_id ?? row.id}
                                tabIndex={0}
                                aria-label={rowOpenLabel ? rowOpenLabel(row) : undefined}
                                onClick={(event) => handleRowClick(event, row)}
                                onKeyDown={(event) => handleRowKey(event, row)}
                            >
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        style={listingTrackStyle(column)}
                                        className={column.sticky ? `${listStyles.stickyCol} ${styles.stickyName}` : ""}
                                    >
                                        {column.render(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className={listStyles.tableFoot}>
                <span className={styles.footCount}>{countText}</span>
                {footNote && <span className={styles.footCount} role="status">{footNote}</span>}
                <PaginationBar
                    entity={{
                        total: pageInfo.total,
                        current_page: pageInfo.currentPage,
                        last_page: pageInfo.lastPage,
                        per_page: pageInfo.limit,
                    }}
                    handlePrevClick={onPrev}
                    handleNextClick={onNext}
                    handlePerPageChange={onLimitChange}
                    hidePerPage={hidePerPage}
                    status={isLoading ? "loading" : "idle"}
                />
            </div>
        </div>
    );
};

EmployerDashboardTable.propTypes = {
    columns: PropTypes.arrayOf(PropTypes.object).isRequired,
    rows: PropTypes.arrayOf(PropTypes.object).isRequired,
    isLoading: PropTypes.bool,
    error: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    sortBy: PropTypes.string,
    sortOrder: PropTypes.string,
    pageInfo: PropTypes.shape({
        accessible: PropTypes.number,
        searching: PropTypes.bool,
        filtered: PropTypes.bool,
        from: PropTypes.number,
        to: PropTypes.number,
        total: PropTypes.number,
        currentPage: PropTypes.number,
        lastPage: PropTypes.number,
        limit: PropTypes.number,
    }).isRequired,
    onSort: PropTypes.func.isRequired,
    onRowClick: PropTypes.func.isRequired,
    rowOpenLabel: PropTypes.func,
    onPrev: PropTypes.func.isRequired,
    onNext: PropTypes.func.isRequired,
    onLimitChange: PropTypes.func.isRequired,
    hidePerPage: PropTypes.bool,
    footNote: PropTypes.string,
    /* the host page's own empty copy (the duplicates page has no search or filters — audit L15) */
    emptyText: PropTypes.string,
    onRetry: PropTypes.func.isRequired,
};

export default React.memo(EmployerDashboardTable);
