import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import { BRANCH_SORT_KEYS } from "../settingsNewUiConstants";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const NameCell = ({ value }) => (value ? <span className={shared.nameText}>{value}</span> : <Dash />);
const TextCell = ({ value }) => (value ? <span className={shared.softCell}>{value}</span> : <Dash />);
const CodeCell = ({ value }) => (value ? <span className={shared.codeCell}>{value}</span> : <Dash />);

const EditCell = ({ row, canEdit, onEdit }) => (
    <button
        type="button"
        className={shared.rowIconBtn}
        disabled={!canEdit}
        onClick={(event) => { event.stopPropagation(); onEdit(row); }}
        title={translation("key_edit_branch")}
        aria-label={translation("key_edit_branch")}
    >
        <Icon name="edit" size={14} />
    </button>
);

const valueProp = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
NameCell.propTypes = valueProp;
TextCell.propTypes = valueProp;
CodeCell.propTypes = valueProp;
EditCell.propTypes = { row: PropTypes.object, canEdit: PropTypes.bool, onEdit: PropTypes.func.isRequired };

export const getBranchListColumns = ({ canEdit, onEdit }) => [
    {
        key: "name",
        label: translation("key_branch_name"),
        sortKey: BRANCH_SORT_KEYS.NAME,
        minWidth: 220,
        sticky: true,
        render: (row) => <NameCell value={row?.branch_name} />,
    },
    {
        key: "code",
        label: translation("key_branch_code"),
        sortKey: BRANCH_SORT_KEYS.CODE,
        width: 120,
        render: (row) => <CodeCell value={row?.branch_code} />,
    },
    {
        key: "province",
        label: translation("key_province"),
        sortKey: BRANCH_SORT_KEYS.PROVINCE,
        width: 160,
        render: (row) => <TextCell value={row?.district_name} />,
    },
    {
        key: "country",
        label: translation("key_country"),
        sortKey: BRANCH_SORT_KEYS.COUNTRY,
        width: 150,
        render: (row) => <TextCell value={row?.country_name} />,
    },
    {
        key: "phone",
        label: translation("key_phone_number"),
        sortKey: BRANCH_SORT_KEYS.PHONE,
        width: 150,
        render: (row) => <CodeCell value={row?.branch_phone_number} />,
    },
    {
        key: "poc",
        label: translation("key_branch_poc"),
        sortKey: BRANCH_SORT_KEYS.POC,
        width: 160,
        render: (row) => <TextCell value={row?.branch_poc} />,
    },
    {
        key: "actions",
        label: "",
        width: 56,
        align: "center",
        render: (row) => <EditCell row={row} canEdit={canEdit} onEdit={onEdit} />,
    },
];
