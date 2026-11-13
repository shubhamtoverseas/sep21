import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import { LEAVE_POLICY_SORT_KEYS } from "../settingsNewUiConstants";
import { formatListDate } from "./leavePolicyConfig";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const NameCell = ({ value }) => (value ? <span className={shared.nameText}>{value}</span> : <Dash />);
const TextCell = ({ value }) => (value ? <span className={shared.softCell}>{value}</span> : <Dash />);
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
        title={translation("key_edit_leave_policy")}
        aria-label={translation("key_edit_leave_policy")}
    >
        <Icon name="edit" size={14} />
    </button>
);

const valueProp = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
NameCell.propTypes = valueProp;
TextCell.propTypes = valueProp;
CountCell.propTypes = valueProp;
StatusCell.propTypes = { active: PropTypes.bool };
EditCell.propTypes = { row: PropTypes.object, canEdit: PropTypes.bool, onEdit: PropTypes.func.isRequired };

export const getLeavePolicyListColumns = ({ canEdit, onEdit }) => [
    {
        key: "name",
        label: translation("key_policy_name"),
        sortKey: LEAVE_POLICY_SORT_KEYS.NAME,
        minWidth: 220,
        sticky: true,
        render: (row) => <NameCell value={row?.leave_policy_name} />,
    },
    {
        key: "types",
        label: translation("key_leave_type"),
        sortKey: LEAVE_POLICY_SORT_KEYS.TYPES,
        width: 120,
        align: "center",
        render: (row) => <CountCell value={row?.leave_policy_count} />,
    },
    {
        key: "annual_total",
        label: translation("key_annual_total"),
        sortKey: LEAVE_POLICY_SORT_KEYS.ANNUAL_TOTAL,
        width: 130,
        align: "center",
        render: (row) => <CountCell value={row?.annual_total_sum || 0} />,
    },
    {
        key: "updated_on",
        label: translation("key_updated_on"),
        sortKey: LEAVE_POLICY_SORT_KEYS.UPDATED_ON,
        width: 130,
        render: (row) => <CountCell value={formatListDate(row?.updated_on)} />,
    },
    {
        key: "updated_by",
        label: translation("key_updated_by"),
        sortKey: LEAVE_POLICY_SORT_KEYS.UPDATED_BY,
        width: 170,
        render: (row) => <TextCell value={row?.updated_by_name} />,
    },
    {
        key: "employees",
        label: translation("key_employees"),
        sortKey: LEAVE_POLICY_SORT_KEYS.EMPLOYEES,
        width: 120,
        align: "center",
        render: (row) => <CountCell value={row?.employees_count} />,
    },
    {
        key: "status",
        label: translation("key_active"),
        sortKey: LEAVE_POLICY_SORT_KEYS.STATUS,
        width: 100,
        render: (row) => <StatusCell active={Boolean(row?.status)} />,
    },
    {
        key: "actions",
        label: "",
        width: 56,
        align: "center",
        render: (row) => <EditCell row={row} canEdit={canEdit} onEdit={onEdit} />,
    },
];
