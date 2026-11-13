import React, { useState, useCallback, useEffect, useMemo } from "react";
import PropTypes from 'prop-types';
import '../../../components/common-table/common-table.css';
import '../../../components/ui/listing-tracks.css';
import translation from "../../../utils/translation";
import { listingTableWidth, listingTrackStyle } from "../../../services/commonService";
import constData from "../../../components/ReusableComponents/constants";
import styles from './InvoiceList.module.css';
import Icon from "../../../components/Icon/Icon";

/* Sort indicator — matches reference: light double-chevron when unsorted (muted),
   light single-chevron in accent when sorted. Uses the new-UI Lucide sort glyphs. */
function SortIcon({ direction }) {
  const wrap = { display: 'inline-flex', verticalAlign: '-1px', flexShrink: 0 };
  const name = direction === 'asc' ? 'sort_asc' : direction === 'desc' ? 'sort_desc' : 'sort';
  const color = direction === 'none' ? 'var(--text-4)' : 'var(--accent)';
  return <span style={{ ...wrap, color }}><Icon name={name} size={10} strokeWidth={1.8} /></span>;
}
SortIcon.propTypes = { direction: PropTypes.oneOf(['none', 'asc', 'desc']) };

function CheckBox({ checked, mixed, disabled, onToggle, ariaLabel }) {
  return (
    <button
      type="button"
      className={`${styles.cb} ${checked ? styles.cbOn : ''}`}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-checked={mixed ? 'mixed' : checked}
      role="checkbox"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
    >
      {checked ? <Icon name="check" size={11} strokeWidth={2.4} /> : mixed ? <span className={styles.cbMixedBar} /> : null}
    </button>
  );
}
CheckBox.propTypes = {
  checked: PropTypes.bool,
  mixed: PropTypes.bool,
  disabled: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string,
};

const InvoiceTable = ({ columns, data = [], sortTable, tableHeaderfilter, entityClick, showCheckbox, onChangeFunc,
    roundedTable = true, isTableShadow = true, setCheckedItems, isMultiCheck, selectedItems }) => {
    const [allChecked, setAllChecked] = useState(false);
    /* SR-06: the table stops at the sum of its tracks (plus the selection track) */
    const trackedWidth = useMemo(
        () => listingTableWidth(columns, undefined, showCheckbox ? constData.LISTING_TRACK_BOUNDS.full.select[1] : 0),
        [columns, showCheckbox]
    );
    const tableStyle = trackedWidth ? { width: trackedWidth, minWidth: trackedWidth } : undefined;
    const [checkedItems, setLocalCheckedItems] = useState([]);

    useEffect(() => {
        if (Array.isArray(selectedItems) && selectedItems.length === 0 && checkedItems.length > 0) {
            setLocalCheckedItems([]);
            setAllChecked(false);
        }
    }, [selectedItems]); // eslint-disable-line react-hooks/exhaustive-deps
    // Handle individual checkbox change
    const handleCheckboxChange = useCallback((e, row) => {
        e.stopPropagation();
        let isSelected = { status: row.status, id: row.id, branch_name: row.branch_name, staff_name: row.staff_name };
        const isChecked = e.target.checked;
        let updatedCheckedItems;
        if (isMultiCheck != undefined && !isMultiCheck) {
            // Single-check logic
            updatedCheckedItems = isChecked ? [row?.id] : [];
        } else {
            if (checkedItems && checkedItems.length > 0) {
                const isSameStatus = checkedItems.some(item => item.status === row?.status);
                if (isSameStatus) {
                    const isAlreadyChecked = checkedItems.some(item => item.id === row?.id);
                    if (isAlreadyChecked) {
                        updatedCheckedItems = checkedItems.filter(item => item.id !== row?.id);
                    } else {
                        updatedCheckedItems = [...checkedItems, isSelected];
                    }
                    setLocalCheckedItems(updatedCheckedItems);
                    setCheckedItems(updatedCheckedItems);
                    onChangeFunc(e, row?.id);
                }
            } else {
                updatedCheckedItems = [...checkedItems, isSelected];
                setLocalCheckedItems(updatedCheckedItems);
                setCheckedItems(updatedCheckedItems);
                onChangeFunc(e, row?.id);
            }
        }
    }, [checkedItems, isMultiCheck, setCheckedItems, setLocalCheckedItems, onChangeFunc]);

    // Handle header checkbox change (select/deselect all)
    const handleHeaderCheckboxChange = useCallback((e) => {
        const isChecked = e.target.checked;
        setAllChecked(isChecked);

        if (isChecked && checkedItems && checkedItems.length > 0) {
            const isCurrentStatus = checkedItems[0]?.status;
            const isSameStatusData = data
                .filter(row => row?.status === isCurrentStatus)
                .map(row => ({ status: row.status, id: row.id }));

            if (isSameStatusData) {
                setLocalCheckedItems(isSameStatusData);
                setCheckedItems(isSameStatusData);
            }

        } else {
            let selectDatas = [];
            if (isChecked && data && data.length > 0) {
                // Find the first status in data that is not 6
                const firstStatus = data.find(row => row.status !== 6)?.status;
                selectDatas = data
                    .filter(row => row?.status === firstStatus && row?.status !== 6)
                    .map(row => ({ status: row.status, id: row.id }));
            }
            setLocalCheckedItems(selectDatas);
            setCheckedItems(selectDatas);
        }
    }, [checkedItems, data, setAllChecked, setLocalCheckedItems, setCheckedItems]);

    const someChecked = Array.isArray(checkedItems) && checkedItems.length > 0;

    return (
        <div className={ `${ roundedTable && 'br12' } ${ isTableShadow && 'table-shadow' } ${styles.tableCard}` }>
            <div className={ `${ roundedTable && 'br12' } commonTable table-responsive ordinary-table` }>
                <div id="customTable_wrapper" className={ `dataTables_wrapper dt-bootstrap4 no-footer` }>
                    <table id="customTable" className={ `${ roundedTable && 'br20' } table dataTable no-footer text-center ${ trackedWidth ? 'mc-tracks' : '' }` } style={ tableStyle } aria-describedby="customTable_info">
                        <thead>
                            <tr>
                                { showCheckbox && (
                                    <th scope="col" className={ `w30 ${styles.stickyCol}` }>
                                        <CheckBox
                                            checked={ allChecked }
                                            mixed={ someChecked && !allChecked }
                                            disabled={ isMultiCheck != undefined && !isMultiCheck }
                                            onToggle={ () => handleHeaderCheckboxChange({ target: { checked: !allChecked } }) }
                                            ariaLabel="Select all rows"
                                        />
                                    </th>
                                ) }
                                { columns.map((col, index) => {
                                    const sorted = col.sortKey && tableHeaderfilter.sort === col.sortKey ? tableHeaderfilter.order : '';
                                    const nextSort = !col.sortKey ? undefined
                                        : sorted === 'ASC' ? `Sort by ${ col.header }, descending`
                                            : sorted === 'DESC' ? `Clear sort on ${ col.header }, restore the default order`
                                                : `Sort by ${ col.header }, ascending`;
                                    return (
                                    <React.Fragment key={ index }>
                                        <th
                                            scope="col"
                                            className={ `${ col?.leftAlign ? 'text-left' : col?.rightAlign ? 'text-right' : '' } ${ col?.customClass || '' } ${ col.sortKey ? styles.thSortable : '' } ${ sorted ? styles.thSorted : '' }` }
                                            onClick={ col.sortKey ? () => sortTable(col.sortKey) : null }
                                            onKeyDown={ col.sortKey ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sortTable(col.sortKey); } } : undefined }
                                            name={ col.sortKey }
                                            tabIndex={ col.sortKey ? 0 : undefined }
                                            aria-controls={ col.sortKey ? "customTable" : undefined }
                                            rowSpan={ 1 }
                                            colSpan={ 1 }
                                            aria-label={ nextSort }
                                            title={ nextSort }
                                            style={ listingTrackStyle(col) }
                                        >
                                            <div className={ `d-flex align-items-center ${styles.thInner} ${ col?.rightAlign ? styles.thInnerRight : '' }` }>
                                                <span>{ col.header }</span>
                                                { col.sortKey && (
                                                    <SortIcon
                                                        direction={
                                                            tableHeaderfilter.sort === col.sortKey
                                                                ? tableHeaderfilter.order === 'ASC' ? 'asc' : 'desc'
                                                                : 'none'
                                                        }
                                                    />
                                                ) }
                                            </div>
                                        </th>
                                    </React.Fragment>
                                    );
                                }) }
                            </tr>
                        </thead>
                        <tbody>
                            { Array.isArray(data) && data.length > 0 ? (
                                data.map((row, rowIndex) => {
                                    const isRowChecked = Array.isArray(checkedItems) && checkedItems.some(item => (item && item.id) === row?.id);
                                    // the hovered row's highlight is the listing sheet's `tbody tr:hover td` rule, not page state
                                    return (
                                        <tr
                                            style={ { cursor: 'pointer' } }
                                            key={ row?.id ?? rowIndex }
                                            className={ isRowChecked ? styles.rowSelected : undefined }
                                            tabIndex={ 0 }
                                            onKeyDown={ (e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); entityClick(row); } } }
                                        >
                                            { showCheckbox && (
                                                <td className={ styles.stickyCol } onClick={ (e) => e.stopPropagation() }>
                                                    <CheckBox
                                                        checked={ isRowChecked }
                                                        disabled={ row.status === 6 }
                                                        onToggle={ () => handleCheckboxChange({ target: { checked: !isRowChecked }, stopPropagation: () => {} }, row) }
                                                        ariaLabel={ `Select row ${ rowIndex + 1 }` }
                                                    />
                                                </td>
                                            ) }
                                            { columns.map((col, colIndex) => (
                                                <React.Fragment key={ colIndex }>
                                                    <td className={ col?.leftAlign ? 'text-left' : col?.rightAlign ? 'text-right' : '' } style={ col?.trackRole ? listingTrackStyle(col) : undefined } onClick={ () => entityClick(row, col) }>
                                                        { col.render ? col.render(row) : row[col.accessor] }
                                                    </td>
                                                </React.Fragment>
                                            )) }
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={ columns.length + (showCheckbox ? 1 : 0) } className={ `text-center ${styles.emptyStateCell}` }>
                                        { translation('key_no_invoices_match_filters') }
                                    </td>
                                </tr>
                            ) }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

InvoiceTable.propTypes = {
    columns: PropTypes.arrayOf(
        PropTypes.shape({
            header: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
            accessor: PropTypes.string,
            sortKey: PropTypes.string,
            width: PropTypes.string,
            className: PropTypes.string,
            render: PropTypes.func,
        })
    ).isRequired,
    roundedTable: PropTypes.bool,
    isTableShadow: PropTypes.bool,
    setCheckedItems: PropTypes.func,
    data: PropTypes.any,
    sortTable: PropTypes.func.isRequired,
    tableHeaderfilter: PropTypes.object.isRequired,
    entityClick: PropTypes.func,
    onChangeFunc: PropTypes.func,
    showCheckbox: PropTypes.bool,
    isMultiCheck: PropTypes.bool,
    selectedItems: PropTypes.array,
};

export default React.memo(InvoiceTable);
