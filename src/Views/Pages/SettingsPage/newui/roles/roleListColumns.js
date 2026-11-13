import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import { toTitleCase } from "../../../../../utils/utils";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import { ROLE_SORT_KEYS } from "../settingsNewUiConstants";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const NameCell = ({ value }) => (value ? <span className={shared.nameText}>{value}</span> : <Dash />);
const CountCell = ({ value }) => <span className={shared.countCell}>{value ?? 0}</span>;

const EditCell = ({ row, canEdit, onEdit }) => (
    <button
        type="button"
        className={shared.rowIconBtn}
        disabled={!canEdit}
        onClick={(event) => { event.stopPropagation(); onEdit(row); }}
        title={toTitleCase(translation("key_edit_role"))}
        aria-label={toTitleCase(translation("key_edit_role"))}
    >
        <Icon name="edit" size={14} />
    </button>
);

const valueProp = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
NameCell.propTypes = valueProp;
CountCell.propTypes = valueProp;
EditCell.propTypes = { row: PropTypes.object, canEdit: PropTypes.bool, onEdit: PropTypes.func.isRequired };

export const getRoleListColumns = ({ canEdit, onEdit }) => [
    {
        key: "name",
        label: translation("key_role_name"),
        sortKey: ROLE_SORT_KEYS.NAME,
        minWidth: 260,
        sticky: true,
        render: (row) => <NameCell value={row?.role_name} />,
    },
    {
        key: "employees",
        label: translation("key_number_of_employees"),
        sortKey: ROLE_SORT_KEYS.EMPLOYEES,
        width: 200,
        align: "center",
        render: (row) => <CountCell value={row?.number_of_employee} />,
    },
    {
        key: "actions",
        label: "",
        width: 56,
        align: "center",
        render: (row) => <EditCell row={row} canEdit={canEdit} onEdit={onEdit} />,
    },
];
