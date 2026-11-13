import React, { useEffect, useState, useCallback, useMemo } from "react";
import PropTypes from 'prop-types';

import ascendingIcon from "../../assets/img/svg/ascending-icon.svg";
import descendingIcon from "../../assets/img/svg/descending-icon.svg";
import translation from "../../utils/translation";
import { hasActiveTextSelection, isRowControlTarget, listingTableWidth, listingTrackStyle } from "../../services/commonService";
import constData from "../ReusableComponents/constants";
import './common-table.css';
import '../ui/listing-tracks.css';

const CustomCheckbox = React.lazy(() => import("../custom-checkbox/CustomCheckbox"));

const CommonTable = ({ columns, data = [], sortTable, tableHeaderfilter, entityClick, isHover, setIsHover, 
  showCheckbox, onChangeFunc, roundedTable = true, isTableShadow = true, setCheckedItems, 
  handleSelectedRows, isMultiCheck,
  selectedRowId, tableId, rowOpen = false, rowOpenLabel
 }) => {
  const [allChecked, setAllChecked] = useState(false);
  const [checkedItems, setLocalCheckedItems] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  const handleCheckboxChange = useCallback((e, row) => {
    e.stopPropagation();
    const isChecked = e.target.checked;

    let updatedCheckedItems;
    let updatedSelectedRows;

    if (isMultiCheck != undefined && !isMultiCheck) {
      // Single-check logic
      updatedCheckedItems = isChecked ? [row?.id] : [];
      updatedSelectedRows = isChecked ? [row] : [];
    } else {
      // Multi-check logic
      updatedCheckedItems = isChecked
        ? [...checkedItems, row?.id]
        : checkedItems.filter(itemId => itemId !== row?.id);

      updatedSelectedRows = isChecked
        ? [...selectedRows, row]
        : selectedRows.filter(selectedRow => selectedRow.id !== row?.id);
    }

    setLocalCheckedItems(updatedCheckedItems);
    setCheckedItems(updatedCheckedItems);
    onChangeFunc(e, row?.id);
    setSelectedRows(updatedSelectedRows);
    handleSelectedRows(updatedSelectedRows);
  }, [isMultiCheck, checkedItems, selectedRows, setCheckedItems, onChangeFunc, handleSelectedRows]);

  const handleHeaderCheckboxChange = useCallback((e) => {
    const isChecked = e.target.checked;
    setAllChecked(isChecked);

    // Update local checked items based on header checkbox state
    const allIds = isChecked ? data?.map(row => row?.id) : [];
    setLocalCheckedItems(allIds);
    setCheckedItems(allIds);

    const updatedSelectedRows = isChecked ? data : [];
    setSelectedRows(updatedSelectedRows);
    handleSelectedRows(updatedSelectedRows);
  }, [data, setCheckedItems, handleSelectedRows]);

  useEffect(() => {
    const allSelected = data.length > 0 && checkedItems.length === data.length;
    setAllChecked(allSelected);
  }, [checkedItems, data]);

  const noRecordsLabel = useMemo(() => translation('key_no_records_found'), []);

  /* SR-06: when every column declares a track their sum (plus the selection track) is the table's minimum width; it fills the card above that */
  const trackedWidth = useMemo(
    () => listingTableWidth(columns, undefined, showCheckbox ? constData.LISTING_TRACK_BOUNDS.full.select[1] : 0),
    [columns, showCheckbox]
  );
  const tableStyle = trackedWidth ? { minWidth: trackedWidth } : undefined;

  /* Whole-row opening (SR-05): the row is the single record-opening control; nested controls keep their own action */
  const handleRowOpen = useCallback((e, row) => {
    if (!entityClick || isRowControlTarget(e.target) || hasActiveTextSelection(e.currentTarget)) return;
    const cell = e.target.closest ? e.target.closest('td') : null;
    const cellIndex = cell ? Array.prototype.indexOf.call(cell.parentNode.children, cell) - (showCheckbox ? 1 : 0) : -1;
    entityClick(row, cellIndex >= 0 ? columns[cellIndex] : undefined);
  }, [entityClick, columns, showCheckbox]);

  const handleRowKey = useCallback((e, row) => {
    if (!entityClick || e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      entityClick(row);
    }
  }, [entityClick]);

  return (
    <div className={`${roundedTable && 'br12'} ${isTableShadow && 'table-shadow'}`}>
      <div className={`${roundedTable && 'br12'} commonTable table-responsive ordinary-table`}>
        <div id="customTable_wrapper" className={`dataTables_wrapper dt-bootstrap4 no-footer`}>
          <table id="customTable" className={`table dataTable no-footer text-center ${trackedWidth ? 'mc-tracks' : ''}`} style={tableStyle} aria-describedby="customTable_info">
            <thead>
              <tr>
                {showCheckbox && (
                  <>
                    <th scope="col" className="w30">
                       <CustomCheckbox
                            checkId={`head_checkbox_${tableId}`}
                            checked={allChecked}
                            onChange={handleHeaderCheckboxChange}
                            checkedLabel={''}
                            labelClasses="grey-border"
                            inputClasses="checkbox-input"
                            disabled={isMultiCheck != undefined && !isMultiCheck}
                        />
                    </th>
                  </>
                )}
                {columns.map((col, index) => (
                  <React.Fragment key={index}>
                    <th
                      scope="col"
                      className={`${col?.leftAlign ? 'text-left' : ''} ${col?.customClass} ${col.header && tableHeaderfilter.sort === col.sortKey
                        ? (tableHeaderfilter.order === "ASC" ? "sorting_asc" : "sorting_desc")
                        : ''}
                    `}
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
                      <div className="d-flex justify-content-between">
                        {!col?.leftAlign && <span></span>}
                        <span className="cursor-pointer lh-24">{col.header}</span>
                        <span className="ml5">
                          {(tableHeaderfilter.sort === col.sortKey && col.header) && (
                            <span className="sorting-icon">
                              {tableHeaderfilter.order === "ASC" ? <img src={ascendingIcon} alt="ascending" width={12} height={12} /> : <img src={descendingIcon} alt="descending" width={12} height={12} />}
                            </span>
                          )}
                        </span>
                      </div>
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.isArray(data) && data.length > 0 ? (
                data.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={`ct-row ${(isHover === row?.id || isHover === row?.role_id) ? 'active' : ''} ${
                      (selectedRowId === row?.id) ? 'selected-row' : ''
                    }`.trim()}
                    data-row-open={rowOpen ? (row?.id ?? rowIndex) : undefined}
                    tabIndex={rowOpen ? 0 : undefined}
                    aria-label={rowOpen && rowOpenLabel ? rowOpenLabel(row) : undefined}
                    onClick={rowOpen ? (e) => handleRowOpen(e, row) : undefined}
                    onKeyDown={rowOpen ? (e) => handleRowKey(e, row) : undefined}
                    onMouseOver={() => setIsHover(row?.id || row?.role_id)}
                    onMouseOut={() => setIsHover(false)}
                  >
                    {showCheckbox && (
                      <>
                        <td>
                           <CustomCheckbox
                              checkId={`body_checkbox_${row?.id || rowIndex}`}
                              checked={checkedItems.includes(row?.id)}
                              onChange={(e) => handleCheckboxChange(e, row)}
                              checkedLabel={''}
                              labelClasses="grey-border"
                              inputClasses="checkbox-input"
                          />
                        </td>
                      </>
                    )}
                    {columns.map((col, colIndex) => (
                      <React.Fragment key={colIndex}>
                        <td className={col?.leftAlign ? 'text-left' : ''} style={col?.trackRole ? listingTrackStyle(col) : undefined} onClick={rowOpen ? undefined : () => entityClick(row, col)}>
                          {col.render ? col.render(row) : row[col.accessor]}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + (showCheckbox ? 1 : 0)} className="text-center">
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

CommonTable.propTypes = {
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
  isHover: PropTypes.any,
  setIsHover: PropTypes.func,
  showCheckbox: PropTypes.bool,
  handleSelectedRows: PropTypes.func,
  isMultiCheck: PropTypes.bool,
  selectedRowId: PropTypes.any,
  tableId: PropTypes.string,
  rowOpen: PropTypes.bool,
  rowOpenLabel: PropTypes.func,
};

export default React.memo(CommonTable);
