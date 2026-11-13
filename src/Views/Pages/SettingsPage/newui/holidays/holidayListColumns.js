import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import { HOLIDAY_SORT_KEYS } from "../settingsNewUiConstants";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const NameCell = ({ value }) => (value ? <span className={shared.nameText}>{value}</span> : <Dash />);
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
        title={translation("key_edit_holiday_list")}
        aria-label={translation("key_edit_holiday_list")}
    >
        <Icon name="edit" size={14} />
    </button>
);

const valueProp = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
NameCell.propTypes = valueProp;
CountCell.propTypes = valueProp;
StatusCell.propTypes = { active: PropTypes.bool };
EditCell.propTypes = { row: PropTypes.object, canEdit: PropTypes.bool, onEdit: PropTypes.func.isRequired };

export const getHolidayListColumns = ({ canEdit, onEdit }) => [
    { key: "name", label: translation("key_list_name"), sortKey: HOLIDAY_SORT_KEYS.NAME, minWidth: 240, sticky: true, render: (row) => <NameCell value={row?.list_name} /> },
    { key: "days", label: translation("key_no_of_days"), sortKey: HOLIDAY_SORT_KEYS.DAYS, width: 130, align: "center", render: (row) => <CountCell value={row?.days_count} /> },
    { key: "users", label: translation("key_no_of_employees"), sortKey: HOLIDAY_SORT_KEYS.USERS, width: 160, align: "center", render: (row) => <CountCell value={row?.users_count} /> },
    { key: "status", label: translation("key_active"), sortKey: HOLIDAY_SORT_KEYS.STATUS, width: 100, render: (row) => <StatusCell active={Boolean(row?.status)} /> },
    { key: "actions", label: "", width: 56, align: "center", render: (row) => <EditCell row={row} canEdit={canEdit} onEdit={onEdit} /> },
];
