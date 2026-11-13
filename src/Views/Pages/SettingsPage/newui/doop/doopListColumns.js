import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import { doopDays } from "../../../../../services/commonService";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import { DOOP_SORT_KEYS } from "../settingsNewUiConstants";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const NameCell = ({ value }) => (value ? <span className={shared.nameText}>{value}</span> : <Dash />);
const DaysCell = ({ value }) => (value ? <span className={shared.softCell}>{doopDays(value)}</span> : <Dash />);
const CountCell = ({ value }) => <span className={shared.countCell}>{value ?? 0}</span>;

const StatusCell = ({ active }) => (
    <span className={listStyles.statusTag} data-tone={active ? "green" : "neutral"}>
        {translation(active ? "key_yes" : "key_no")}
    </span>
);

const EditCell = ({ row, canEdit, onEdit }) => (
    <button
        type="button"
        className={shared.rowIconBtn}
        disabled={!canEdit}
        onClick={(event) => { event.stopPropagation(); onEdit(row); }}
        title={translation("key_edit")}
        aria-label={translation("key_edit")}
    >
        <Icon name="edit" size={14} />
    </button>
);

const valueProp = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
NameCell.propTypes = valueProp;
DaysCell.propTypes = valueProp;
CountCell.propTypes = valueProp;
StatusCell.propTypes = { active: PropTypes.bool };
EditCell.propTypes = { row: PropTypes.object, canEdit: PropTypes.bool, onEdit: PropTypes.func.isRequired };

export const getDoopListColumns = ({ canEdit, onEdit }) => [
    { key: "name", label: translation("key_name"), sortKey: DOOP_SORT_KEYS.NAME, minWidth: 200, sticky: true, render: (row) => <NameCell value={row?.doop_name} /> },
    { key: "work_days", label: translation("key_operation_days"), sortKey: DOOP_SORT_KEYS.WORK_DAYS, minWidth: 260, render: (row) => <DaysCell value={row?.work_days} /> },
    { key: "off_days", label: translation("key_days_off"), sortKey: DOOP_SORT_KEYS.OFF_DAYS, minWidth: 180, render: (row) => <DaysCell value={row?.off_days} /> },
    { key: "employees", label: translation("key_employees"), sortKey: DOOP_SORT_KEYS.EMPLOYEES, width: 120, align: "center", render: (row) => <CountCell value={row?.number_of_employee} /> },
    { key: "status", label: translation("key_active"), sortKey: DOOP_SORT_KEYS.STATUS, width: 100, render: (row) => <StatusCell active={row?.status === 1} /> },
    { key: "actions", label: "", width: 56, align: "center", render: (row) => <EditCell row={row} canEdit={canEdit} onEdit={onEdit} /> },
];
