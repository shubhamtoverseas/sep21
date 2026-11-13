import React, { useCallback, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import Btn from "../../../../components/ui/Btn";
import PaginationBar from "../../../../components/Layout/pagination/PaginationBar";
import { hasActiveTextSelection, isRowControlTarget } from "../../../../services/commonService";
import listStyles from "../../Invoice/InvoiceList.module.css";
import styles from "./InsuranceDashboard.module.css";
import { translation } from "./insuranceDashboardConfig";
import { insuranceRowLabel } from "./insuranceDashboardColumns";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";

const sortIconName = (active, dir) => (!active ? "sort" : dir === "desc" ? "sort_desc" : "sort_asc");
const ariaSort = (active, dir) => (!active ? undefined : dir === "desc" ? "descending" : "ascending");

const HeaderCell = ({ column, sort, onSort }) => {
    const className = column.divider ? styles.dividerLeft : undefined;
    if (!column.sortKey) return <th scope="col" className={className}>{column.label}</th>;
    const active = sort?.key === column.sortKey;
    return (
        <th scope="col" className={className} aria-sort={ariaSort(active, sort?.dir)}>
            <button
                type="button"
                className={`${styles.thSortBtn} ${active ? styles.thSortActive : ""}`}
                onClick={() => onSort(column.sortKey)}
                aria-label={`${translation("key_sort_by")} ${column.label}`}
            >
                <span>{column.label}</span>
                <Icon name={sortIconName(active, sort?.dir)} size={11} strokeWidth={1.8} />
            </button>
        </th>
    );
};

HeaderCell.propTypes = {
    column: PropTypes.object.isRequired,
    sort: PropTypes.object,
    onSort: PropTypes.func.isRequired,
};

const countText = (records) => {
    if (records.capped) return null;
    const n = records.restricted ? records.rows.length : Number(records.total) || 0;
    if (records.restricted) return translation(n === 1 ? "key_ins_showing_record_one" : "key_ins_showing_record_other", { n });
    return translation(n === 1 ? "key_ins_record_count_one" : "key_ins_record_count_other", { n });
};

/* Records table (dashboard.js renderTable). With Bulk Change Owner, standalone rows can be selected for
   Change CS Owner; contract-linked rows follow the Contract. */
const InsuranceRecordsTable = ({
    columns, records, isLoading, error, sort, pageInfo, selectable, selectedRefs,
    onSort, onRowOpen, onSelect, onChangeOwner, onPrev, onNext, onLimitChange, onRetry, returnTo, onReturned,
}) => {
    const rows = records.rows || [];
    const bodyRef = useRef(null);

    /* back from a record: once its page has loaded, the scroll it was opened at and focus on its row (dashboard.js renderTable) */
    useEffect(() => {
        if (!returnTo || isLoading) return;
        const tr = Array.from(bodyRef.current?.querySelectorAll("tr[data-ref]") || []).find((el) => el.dataset.ref === returnTo.ref);
        if (tr) {
            window.scrollTo(0, returnTo.scrollY || 0);
            tr.focus();
        }
        onReturned?.();
    }, [returnTo, isLoading, records.rows, onReturned]);
    const colSpan = columns.length + (selectable ? 1 : 0);
    const showLoader = isLoading && rows.length === 0;
    const showError = !isLoading && Boolean(error) && rows.length === 0;
    const showEmpty = !isLoading && !error && rows.length === 0;

    const handleRowClick = useCallback((event, row) => {
        if (isRowControlTarget(event.target) || hasActiveTextSelection(event.currentTarget)) return;
        onRowOpen(row);
    }, [onRowOpen]);

    const handleRowKey = useCallback((event, row) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter") { event.preventDefault(); onRowOpen(row); }
        if (event.key === " " && selectable && row.bulkSelectable) {
            event.preventDefault();
            onSelect([row], !selectedRefs.includes(row.ref));
        }
    }, [onRowOpen, onSelect, selectable, selectedRefs]);

    const text = countText(records);
    const pageSelectable = rows.filter((r) => r.bulkSelectable);
    const allOnPage = pageSelectable.length > 0 && pageSelectable.every((r) => selectedRefs.includes(r.ref));

    return (
        <div className={`${listStyles.tableCard} ${styles.filterCard}`}>
            <div className={styles.tableScroll} aria-busy={isLoading}>
                <table className={`${styles.table} ${isLoading && rows.length ? styles.tableRefreshing : ""}`} aria-label={translation("key_ins_records_aria")}>
                    <thead>
                        <tr>
                            {selectable && (
                                <th scope="col" className={styles.chkCell}>
                                    <input
                                        type="checkbox"
                                        checked={allOnPage}
                                        disabled={!pageSelectable.length}
                                        aria-label={translation("key_ins_select_all")}
                                        onChange={(event) => onSelect(pageSelectable, event.target.checked)}
                                    />
                                </th>
                            )}
                            {columns.map((column) => <HeaderCell key={column.key} column={column} sort={sort} onSort={onSort} />)}
                        </tr>
                    </thead>
                    <tbody ref={bodyRef}>
                        {showLoader && (
                            <tr>
                                <td colSpan={colSpan} className={`${listStyles.emptyStateCell} ${styles.stateCell}`}><CustomSpinner /></td>
                            </tr>
                        )}
                        {showError && (
                            <tr>
                                <td colSpan={colSpan} className={`${listStyles.emptyStateCell} ${styles.stateCell}`}>
                                    <div className={styles.stateBody}>
                                        <span>{translation("key_couldnt_load_this_view")}</span>
                                        <Btn variant="secondary" onClick={onRetry}><Icon name="refresh" size={13} /> {translation("key_retry")}</Btn>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {showEmpty && (
                            <tr>
                                <td colSpan={colSpan} className={`${listStyles.emptyStateCell} ${styles.stateCell}`}>
                                    {translation("key_ins_no_records_match")}
                                </td>
                            </tr>
                        )}
                        {rows.map((row) => {
                            const selected = selectedRefs.includes(row.ref);
                            return (
                                <tr
                                    key={row.id}
                                    data-ref={row.ref}
                                    className={`${styles.row} ${selected ? styles.rowSelected : ""}`}
                                    tabIndex={0}
                                    aria-label={insuranceRowLabel(row)}
                                    onClick={(event) => handleRowClick(event, row)}
                                    onKeyDown={(event) => handleRowKey(event, row)}
                                >
                                    {selectable && (
                                        <td className={styles.chkCell}>
                                            {row.bulkSelectable ? (
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    aria-label={translation("key_ins_select_ref", { ref: row.ref })}
                                                    onChange={(event) => onSelect([row], event.target.checked)}
                                                />
                                            ) : (
                                                <span className={styles.muted} title={translation("key_ins_follows_contract")}>—</span>
                                            )}
                                        </td>
                                    )}
                                    {columns.map((column) => (
                                        <td key={column.key} className={column.divider ? styles.dividerLeft : undefined}>{column.render(row)}</td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className={listStyles.tableFoot}>
                <div className={styles.foot}>
                    {records.capped ? (
                        <>
                            <span className={styles.footWarn}>{translation("key_ins_capped_first")}</span>
                            <span>{translation("key_ins_capped_refine")}</span>
                        </>
                    ) : <span>{text}</span>}
                    {selectable && selectedRefs.length > 0 && (
                        <span className={styles.footSelected}>
                            <span>{translation("key_ins_n_selected", { n: selectedRefs.length })}</span>
                            <Btn variant="secondary" onClick={onChangeOwner}>{translation("key_ins_change_cs_owner")}</Btn>
                        </span>
                    )}
                </div>
                {!records.restricted && (
                    <PaginationBar
                        entity={{ total: pageInfo.total, current_page: pageInfo.currentPage, last_page: pageInfo.lastPage, per_page: pageInfo.limit }}
                        handlePrevClick={onPrev}
                        handleNextClick={onNext}
                        handlePerPageChange={onLimitChange}
                        status={isLoading ? "loading" : "idle"}
                    />
                )}
            </div>
        </div>
    );
};

InsuranceRecordsTable.propTypes = {
    columns: PropTypes.arrayOf(PropTypes.object).isRequired,
    records: PropTypes.object.isRequired,
    isLoading: PropTypes.bool,
    error: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    sort: PropTypes.object,
    pageInfo: PropTypes.object.isRequired,
    selectable: PropTypes.bool,
    selectedRefs: PropTypes.arrayOf(PropTypes.string),
    onSort: PropTypes.func.isRequired,
    onRowOpen: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    onChangeOwner: PropTypes.func.isRequired,
    onPrev: PropTypes.func.isRequired,
    onNext: PropTypes.func.isRequired,
    onLimitChange: PropTypes.func.isRequired,
    onRetry: PropTypes.func.isRequired,
    returnTo: PropTypes.shape({ ref: PropTypes.string, page: PropTypes.number, scrollY: PropTypes.number }),
    onReturned: PropTypes.func,
};

export default React.memo(InsuranceRecordsTable);
