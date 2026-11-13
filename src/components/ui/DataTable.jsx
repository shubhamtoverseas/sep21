import React, { useCallback } from "react";
import PropTypes from "prop-types";
import Icon from "../Icon/Icon";
import Btn from "./Btn";
import PaginationBar from "../Layout/pagination/PaginationBar";
import translation from "../../utils/translation";
import listStyles from "../../Views/Pages/Invoice/InvoiceList.module.css";
import styles from "./DataTable.module.css";

const DEFAULT_SKELETON_ROWS = 6;

const sortIconName = (active, order) => (!active ? "sort" : order === "desc" ? "sort_desc" : "sort_asc");
const ariaSort = (active, order) => (!active ? "none" : order === "desc" ? "descending" : "ascending");
const alignClass = (column) => (column.align === "center" ? styles.alignCenter : column.align === "right" ? styles.alignRight : "");

const cellClass = (column) => [
    column.sticky ? `${listStyles.stickyCol} ${styles.stickyName}` : "",
    alignClass(column),
].filter(Boolean).join(" ");

const cellStyle = (column) => ({ width: column.width, minWidth: column.minWidth || column.width });

const HeaderCell = ({ column, sortBy, sortOrder, onSort }) => {
    const active = Boolean(column.sortKey) && column.sortKey === sortBy;
    if (!column.sortKey || !onSort) {
        return <th scope="col" style={cellStyle(column)} className={cellClass(column)}>{column.label}</th>;
    }
    return (
        <th scope="col" style={cellStyle(column)} className={cellClass(column)} aria-sort={ariaSort(active, sortOrder)}>
            <button
                type="button"
                className={`${styles.thSortBtn} ${active ? styles.thSortActive : ""}`}
                onClick={() => onSort(column.sortKey)}
                title={`${translation("key_sort_by")} ${column.label}`}
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
    onSort: PropTypes.func,
};

const SkeletonRows = ({ columns, count }) => (
    Array.from({ length: count }, (_, index) => (
        <tr key={`sk-${index}`} className={styles.skeletonRow} aria-hidden="true">
            {columns.map((column) => (
                <td key={column.key} className={cellClass(column)}>
                    <span className={styles.skeletonBar} />
                </td>
            ))}
        </tr>
    ))
);

SkeletonRows.propTypes = {
    columns: PropTypes.arrayOf(PropTypes.object).isRequired,
    count: PropTypes.number.isRequired,
};

/**
 * Generic new-UI listing: columns = [{ key, label, sortKey?, width?, minWidth?,
 * sticky?, align?, render(row) }]. Sort order values are lowercase asc|desc.
 */
const DataTable = ({
    columns,
    rows,
    rowKey,
    isLoading,
    error,
    sortBy,
    sortOrder,
    pageInfo,
    unitLabel,
    emptyText,
    skeletonRows = DEFAULT_SKELETON_ROWS,
    onSort,
    onRowClick,
    onPrev,
    onNext,
    onLimitChange,
    onRetry,
}) => {
    const showSkeleton = isLoading && rows.length === 0;
    const showError = !isLoading && Boolean(error) && rows.length === 0;
    const showEmpty = !isLoading && !error && rows.length === 0;
    const clickable = typeof onRowClick === "function";

    const getKey = useCallback(
        (row, index) => (typeof rowKey === "function" ? rowKey(row) : row?.[rowKey]) ?? index,
        [rowKey]
    );

    const handleRowKey = useCallback((event, row) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onRowClick(row);
        }
    }, [onRowClick]);

    const countText = pageInfo?.total
        ? `${pageInfo.from}–${pageInfo.to} ${translation("key_of")} ${pageInfo.total} ${unitLabel}`
        : `0 ${unitLabel}`;

    return (
        <div className={listStyles.tableCard}>
            <div className={styles.tableScroll} aria-busy={isLoading}>
                <table className={`${styles.table} ${isLoading && rows.length ? styles.tableRefreshing : ""} ${clickable ? "" : styles.static}`}>
                    <thead>
                        <tr>
                            {columns.map((column) => (
                                <HeaderCell key={column.key} column={column} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {showSkeleton && <SkeletonRows columns={columns} count={skeletonRows} />}
                        {showError && (
                            <tr>
                                <td colSpan={columns.length} className={`${listStyles.emptyStateCell} ${styles.stateCell}`}>
                                    <div className={styles.stateBody}>
                                        <span>{translation("key_couldnt_load_this_view")}</span>
                                        {onRetry && (
                                            <Btn variant="secondary" onClick={onRetry}>
                                                <Icon name="refresh" size={13} /> {translation("key_retry")}
                                            </Btn>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                        {showEmpty && (
                            <tr>
                                <td colSpan={columns.length} className={`${listStyles.emptyStateCell} ${styles.stateCell}`}>
                                    {emptyText || translation("key_no_results_found")}
                                </td>
                            </tr>
                        )}
                        {rows.map((row, index) => (
                            <tr
                                key={getKey(row, index)}
                                className={styles.row}
                                tabIndex={clickable ? 0 : undefined}
                                onClick={clickable ? () => onRowClick(row) : undefined}
                                onKeyDown={clickable ? (event) => handleRowKey(event, row) : undefined}
                            >
                                {columns.map((column) => (
                                    <td key={column.key} style={cellStyle(column)} className={cellClass(column)}>
                                        {column.render(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pageInfo && (
                <div className={listStyles.tableFoot}>
                    <span className={styles.footCount}>{countText}</span>
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
                        status={isLoading ? "loading" : "idle"}
                    />
                </div>
            )}
        </div>
    );
};

DataTable.propTypes = {
    columns: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        label: PropTypes.node,
        sortKey: PropTypes.string,
        width: PropTypes.number,
        minWidth: PropTypes.number,
        sticky: PropTypes.bool,
        align: PropTypes.oneOf(["left", "center", "right"]),
        render: PropTypes.func.isRequired,
    })).isRequired,
    rows: PropTypes.arrayOf(PropTypes.object).isRequired,
    rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
    isLoading: PropTypes.bool,
    error: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    sortBy: PropTypes.string,
    sortOrder: PropTypes.string,
    pageInfo: PropTypes.shape({
        from: PropTypes.number,
        to: PropTypes.number,
        total: PropTypes.number,
        currentPage: PropTypes.number,
        lastPage: PropTypes.number,
        limit: PropTypes.number,
    }),
    unitLabel: PropTypes.string,
    emptyText: PropTypes.node,
    skeletonRows: PropTypes.number,
    onSort: PropTypes.func,
    onRowClick: PropTypes.func,
    onPrev: PropTypes.func,
    onNext: PropTypes.func,
    onLimitChange: PropTypes.func,
    onRetry: PropTypes.func,
};

DataTable.defaultProps = {
    rowKey: "id",
    unitLabel: "",
};

export default React.memo(DataTable);
