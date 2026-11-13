import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import PropTypes from 'prop-types';

import './common-table.css';
import ascendingIcon from "../../assets/img/svg/ascending-icon.svg";
import descendingIcon from "../../assets/img/svg/descending-icon.svg";
import translation from "../../utils/translation";
import { hasActiveTextSelection, isRowControlTarget, listingTableWidth, listingTrackStyle } from "../../services/commonService";
import '../ui/listing-tracks.css';
import tableColumnCollapsibleIcon from "../../assets/img/svg/table-column-collapse-icon.svg";

const CommonTableRow = React.memo(function CommonTableRow({ row, flattenedColumns, showCheckbox, isChecked, onCheckboxChange, entityClick, rowOpen, rowOpenLabel }) {
  /* Whole-row opening (SR-05): the row is the single record-opening control; the clicked column still reaches entityClick */
  const handleRowOpen = (e) => {
    if (!entityClick || isRowControlTarget(e.target) || hasActiveTextSelection(e.currentTarget)) return;
    const cell = e.target.closest ? e.target.closest('td') : null;
    const cellIndex = cell ? Array.prototype.indexOf.call(cell.parentNode.children, cell) - (showCheckbox ? 1 : 0) : -1;
    entityClick(row, cellIndex >= 0 ? flattenedColumns[cellIndex] : undefined);
  };
  const handleRowKey = (e) => {
    if (!entityClick || e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      entityClick(row);
    }
  };

  return (
    <tr
      className="ct-row"
      data-row-open={rowOpen ? row?.id : undefined}
      tabIndex={rowOpen ? 0 : undefined}
      aria-label={rowOpen && rowOpenLabel ? rowOpenLabel(row) : undefined}
      onClick={rowOpen ? handleRowOpen : undefined}
      onKeyDown={rowOpen ? handleRowKey : undefined}
    >
      {showCheckbox && (
        <td>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => onCheckboxChange(e, row)}
          />
        </td>
      )}
      {flattenedColumns.map((col, colIndex) => (
        <React.Fragment key={col.key || col.sortKey || `body-${colIndex}`}>
          <td
            className={`${col?.leftAlign ? 'text-left' : ''} ${col.isChildColumn ? 'child-column-cell' : ''}`}
            style={col?.trackRole ? listingTrackStyle(col) : undefined}
            onClick={rowOpen ? undefined : () => entityClick(row, col)}
          >
            {col.isParentColumn && col.render
              ? col.render(row)
              : (col.render ? col.render(row) : row[col.accessor])
            }
          </td>
        </React.Fragment>
      ))}
    </tr>
  );
});

CommonTableRow.propTypes = {
  row: PropTypes.object.isRequired,
  flattenedColumns: PropTypes.array.isRequired,
  showCheckbox: PropTypes.bool,
  isChecked: PropTypes.bool,
  onCheckboxChange: PropTypes.func.isRequired,
  entityClick: PropTypes.func,
  rowOpen: PropTypes.bool,
  rowOpenLabel: PropTypes.func,
};

const CommonTableCollapsible = ({ columns, data = [], sortTable, tableHeaderfilter, entityClick, showCheckbox, onChangeFunc, roundedTable = true,
  isTableShadow = true, setCheckedItems, handleSelectedRows, isMultiCheck, rowOpen = false, rowOpenLabel }) => {
  const [allChecked, setAllChecked] = useState(false);
  const [checkedItems, setLocalCheckedItems] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [collapsedColumns, setCollapsedColumns] = useState({});

  // Latest selection snapshots so handleCheckboxChange stays referentially
  // stable and memoized rows don't all re-render on every selection change
  const checkedItemsRef = useRef(checkedItems);
  checkedItemsRef.current = checkedItems;
  const selectedRowsRef = useRef(selectedRows);
  selectedRowsRef.current = selectedRows;

  const checkedIdSet = useMemo(() => new Set(checkedItems), [checkedItems]);

  // Check if table has hierarchical columns
  const hasHierarchicalColumns = useMemo(() => 
    columns.some(col => col.isParent && col.children), 
  [columns]);

  // Handle column collapse/expand
  const toggleColumnCollapse = useCallback((columnKey) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  }, []);

  // Get columns for header rendering (with parent/child structure) - only for hierarchical tables
  const getHeaderStructure = useCallback(() => {
    if (!hasHierarchicalColumns) {
      return { parentColumns: columns, childColumns: columns };
    }

    const parentColumns = [];
    const childColumns = [];

    columns.forEach(col => {
      if (col.isParent && col.children) {
        // This is a parent column with children
        parentColumns.push(col);
        if (!collapsedColumns[col.key]) {
          // When expanded, add all children
          childColumns.push(...col.children.map(child => ({
            ...child,
            parentKey: col.key
          })));
        }
        // When collapsed, we don't add any placeholder - the parent spans both rows
      } else {
        // This is a regular column (spans both header rows)
        parentColumns.push({
          ...col,
          isRegularColumn: true
        });
        // For regular columns, add empty placeholder for second row
        childColumns.push({
          header: '',
          key: `${col.key}_regular_placeholder`,
          isRegularPlaceholder: true,
          parentKey: col.key
        });
      }
    });

    return { parentColumns, childColumns };
  }, [hasHierarchicalColumns, columns, collapsedColumns]);

  // Get flattened columns for body rendering
  const getFlattenedColumns = useCallback(() => {
    if (!hasHierarchicalColumns) {
      return columns;
    }

    const flattened = [];

    columns.forEach(col => {
      if (col.isParent && col.children) {
        if (!collapsedColumns[col.key]) {
          // When expanded, only add children (not the parent)
          flattened.push(...col.children.map(child => ({
            ...child,
            isChildColumn: true,
            parentKey: col.key
          })));
        } else {
          // When collapsed, add the parent with its original render function
          flattened.push({
            ...col,
            isParentColumn: true
          });
        }
      } else {
        // Regular column
        flattened.push(col);
      }
    });

    return flattened;
  }, [hasHierarchicalColumns, columns, collapsedColumns]);

  const handleCheckboxChange = useCallback((e, row) => {
    e.stopPropagation();
    const isChecked = e.target.checked;
    const currentCheckedItems = checkedItemsRef.current;
    const currentSelectedRows = selectedRowsRef.current;

    let updatedCheckedItems;
    let updatedSelectedRows;

    if (isMultiCheck != undefined && !isMultiCheck) {
      // Single-check logic
      updatedCheckedItems = isChecked ? [row?.id] : [];
      updatedSelectedRows = isChecked ? [row] : [];
    } else {
      // Multi-check logic
      updatedCheckedItems = isChecked
        ? [...currentCheckedItems, row?.id]
        : currentCheckedItems.filter(itemId => itemId !== row?.id);

      updatedSelectedRows = isChecked
        ? [...currentSelectedRows, row]
        : currentSelectedRows.filter(selectedRow => selectedRow.id !== row?.id);
    }

    setLocalCheckedItems(updatedCheckedItems);
    setCheckedItems(updatedCheckedItems);
    onChangeFunc(e, row?.id);
    setSelectedRows(updatedSelectedRows);
    handleSelectedRows(updatedSelectedRows);
  }, [isMultiCheck, setCheckedItems, onChangeFunc, handleSelectedRows]);

  // Handle header checkbox change (select/deselect all)
  const handleHeaderCheckboxChange = useCallback((e) => {
    const isChecked = e.target.checked;
    setAllChecked(isChecked);

    // Update local checked items based on header checkbox state
    const allIds = isChecked ? data?.map(row => row?.id) : [];
    setLocalCheckedItems(allIds);
    setCheckedItems(allIds);

    const updatedSelectedRows = isChecked
      ? data
      : [];
    setSelectedRows(updatedSelectedRows);
    handleSelectedRows(updatedSelectedRows);
  }, [data, setCheckedItems, handleSelectedRows]);

  // Update header checkbox based on body checkboxes
  useEffect(() => {
    const allSelected = data.length > 0 && checkedItems.length === data.length;
    setAllChecked(allSelected);
  }, [checkedItems, data]);

  const { parentColumns, childColumns } = useMemo(() => 
    getHeaderStructure(), 
  [getHeaderStructure]);

  const flattenedColumns = useMemo(() => 
    getFlattenedColumns(), 
  [getFlattenedColumns]);

  const noRecordsLabel = useMemo(() => translation('key_no_records_found'), []);

  /* SR-06: fixed tracks only for the flat schema; the grouped (pre-departure) header keeps auto layout */
  const trackedWidth = useMemo(
    () => (hasHierarchicalColumns ? null : listingTableWidth(columns)),
    [hasHierarchicalColumns, columns]
  );
  const tableStyle = trackedWidth ? { minWidth: trackedWidth } : undefined;

  // Render hierarchical header (two rows)
  const renderHierarchicalHeader = useCallback(() => (
    <>
      {/* Parent header row */}
      <tr>
        {showCheckbox && (
          <th scope="col" className="w30" rowSpan="2">
            <input
              type="checkbox"
              disabled={isMultiCheck != undefined && !isMultiCheck}
              checked={allChecked}
              onChange={handleHeaderCheckboxChange}
            />
          </th>
        )}
        {parentColumns.map((col, index) => {
          let colSpan = 1;
          let rowSpan = 1;

          if (col.isParent && col.children) {
            // Parent column with children
            colSpan = collapsedColumns[col.key] ? 1 : col.children.length;
            rowSpan = collapsedColumns[col.key] ? 2 : 1; // When collapsed, span both rows
          } else {
            // Regular column always spans both rows
            rowSpan = 2;
            colSpan = 1;
          }

          return (
            <th
              key={col.key || col.sortKey || `parent-${index}`}
              scope="col"
              className={`${col?.leftAlign ? 'text-left' : ''} ${col?.customClass} ${col.isRegularColumn ? 'regular-column' : 'parent-column'
                } ${col.header && tableHeaderfilter.sort === col.sortKey
                  ? (tableHeaderfilter.order === "ASC" ? "sorting_asc" : "sorting_desc")
                  : ''
                }`}
              colSpan={colSpan}
              rowSpan={rowSpan}
              onClick={col.isRegularColumn && col.header && col.sortKey ? () => sortTable(col.sortKey) : null}
              style={col.isRegularColumn ? listingTrackStyle(col) : { width: col.width }}
            >
              <div className="d-flex justify-content-between align-items-center">
                {!col?.leftAlign && <span></span>}
                <span className="cursor-pointer">
                  {col.header}
                </span>
                <span className="ml5 d-flex align-items-center">
                  {/* Collapse/Expand icon for parent columns */}
                  {col.isParent && col.children && (
                    <span
                      className="collapse-icon cursor-pointer mr-2"
                      onClick={() => toggleColumnCollapse(col.key)}
                      style={{ fontSize: '12px' }}
                    >
                      {collapsedColumns[col.key] ?
                        <img src={tableColumnCollapsibleIcon} alt="expand" height={14} width={14} />
                        : <img src={tableColumnCollapsibleIcon} alt="collapse" height={14} width={14} />}
                    </span>
                  )}
                  {/* Sorting icon for regular columns */}
                  {col.isRegularColumn && (tableHeaderfilter.sort === col.sortKey && col.header) && (
                    <span className="sorting-icon">
                      {tableHeaderfilter.order === "ASC" ?
                        <img src={ascendingIcon} alt="ascending" height={12} width={12} /> :
                        <img src={descendingIcon} alt="descending" height={12} width={12} />
                      }
                    </span>
                  )}
                </span>
              </div>
            </th>
          );
        })}
      </tr>

      <tr>
        {childColumns.map((col, index) => {
          // Skip placeholders for regular columns (they span both rows)
          if (col.isRegularPlaceholder) return null;

          return (
            <th
              key={col.key || col.sortKey || `child-${index}`}
              scope="col"
              className={`${col?.leftAlign ? 'text-left' : ''} ${col?.customClass} ${col.header && tableHeaderfilter.sort === col.sortKey
                ? (tableHeaderfilter.order === "ASC" ? "sorting_asc" : "sorting_desc")
                : ''
                } child-column`}
              onClick={col.header && col.sortKey ? () => sortTable(col.sortKey) : null}
              name={col.sortKey}
              value={tableHeaderfilter.sort === col.sortKey && tableHeaderfilter.order === "ASC" ? "ASC" : "DESC"}
              tabIndex={0}
              aria-controls="customTable"
              style={listingTrackStyle(col)}
            >
              <div className={`${!col?.leftAlign && 'justify-content-center'} d-flex align-items-center`}>
                {/* {!col?.leftAlign && <span></span>} */}
                <span className="cursor-pointer">
                  {col.header}
                </span>
              </div>
            </th>
          );
        })}
      </tr>
    </>
  ), [showCheckbox, isMultiCheck, allChecked, handleHeaderCheckboxChange, parentColumns, childColumns,
      collapsedColumns, tableHeaderfilter, sortTable, toggleColumnCollapse]);

  const renderSimpleHeader = useCallback(() => (
    <tr>
      {showCheckbox && (
        <th scope="col" className="w30">
          <input
            type="checkbox"
            disabled={isMultiCheck != undefined && !isMultiCheck}
            checked={allChecked}
            onChange={handleHeaderCheckboxChange}
          />
        </th>
      )}
      {columns.map((col, index) => (
        <React.Fragment key={col.key || col.sortKey || `simple-${index}`}>
          <th
            scope="col"
            className={`${col?.leftAlign ? 'text-left' : ''} ${col?.customClass} ${col.header && tableHeaderfilter.sort === col.sortKey
              ? (tableHeaderfilter.order === "ASC" ? "sorting_asc" : "sorting_desc")
              : ''
              }`}
            onClick={col.header ? () => sortTable(col.sortKey) : null}
            name={col.sortKey}
            value={tableHeaderfilter.sort === col.sortKey && tableHeaderfilter.order === "ASC" ? "ASC" : "DESC"}
            tabIndex={0}
            aria-controls="customTable"
            rowSpan={1}
            colSpan={1}
            aria-label={`${col.header} : activate to sort column ${tableHeaderfilter.sort === col.sortKey && tableHeaderfilter.order === "ASC" ? "ascending" : "descending"}`}
            style={listingTrackStyle(col)}
          >
            <div className={`${!col?.leftAlign && 'justify-content-center'} d-flex align-items-center`}>
              {/* {!col?.leftAlign && <span></span>} */}
              <span className="cursor-pointer">{col.header}</span>
              <span className="ml5">
                {(tableHeaderfilter.sort === col.sortKey && col.header) && (
                  <span className="sorting-icon">
                    {tableHeaderfilter.order === "ASC" ?
                      <img src={ascendingIcon} alt="ascending" /> :
                      <img src={descendingIcon} alt="descending" />
                    }
                  </span>
                )}
              </span>
            </div>
          </th>
        </React.Fragment>
      ))}
    </tr>
  ), [showCheckbox, isMultiCheck, allChecked, handleHeaderCheckboxChange, columns, tableHeaderfilter, sortTable]);

  return (
    <div className={`${roundedTable && 'br12'} ${isTableShadow && 'table-shadow'}`}>
      <div className={`${roundedTable && 'br12'} commonTable table-responsive ordinary-table`}>
        <div id="customTable_wrapper" className={`dataTables_wrapper dt-bootstrap4 no-footer`}>
          <table id="customTable" className={`${roundedTable && 'br20'} table dataTable no-footer text-center row-hover ${trackedWidth ? 'mc-tracks' : ''}`} style={tableStyle} aria-describedby="customTable_info">
            <thead>
              {hasHierarchicalColumns ? renderHierarchicalHeader() : renderSimpleHeader()}
            </thead>
            <tbody>
              {Array.isArray(data) && data.length > 0 ? (
                data.map((row, rowIndex) => (
                  <CommonTableRow
                    key={rowIndex}
                    row={row}
                    flattenedColumns={flattenedColumns}
                    showCheckbox={showCheckbox}
                    isChecked={checkedIdSet.has(row?.id)}
                    onCheckboxChange={handleCheckboxChange}
                    entityClick={entityClick}
                    rowOpen={rowOpen}
                    rowOpenLabel={rowOpenLabel}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={flattenedColumns.length + (showCheckbox ? 1 : 0)} className="text-center">
                    {noRecordsLabel}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

CommonTableCollapsible.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      header: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
      accessor: PropTypes.string,
      sortKey: PropTypes.string,
      width: PropTypes.string,
      className: PropTypes.string,
      render: PropTypes.func,
      isParent: PropTypes.bool,
      children: PropTypes.array,
      key: PropTypes.string,
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
  handleSelectedRows: PropTypes.func,
  isMultiCheck: PropTypes.bool,
  rowOpen: PropTypes.bool,
  rowOpenLabel: PropTypes.func,
};

export default React.memo(CommonTableCollapsible);