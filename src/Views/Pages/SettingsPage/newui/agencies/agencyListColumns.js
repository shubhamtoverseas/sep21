import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import { getDisplayAgencyCategory, getDisplayAgencyType } from "../../../../../services/commonService";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import { AGENCY_SORT_KEYS } from "../settingsNewUiConstants";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const stop = (event) => event.stopPropagation();

const NameCell = ({ row }) => {
    if (!row?.agency_name) return <Dash />;
    return row?.link
        ? <Link className={shared.nameLink} to={row.link} onClick={stop}>{row.agency_name}</Link>
        : <span className={shared.nameText}>{row.agency_name}</span>;
};

const CountCell = ({ value }) => (
    <span className={shared.countCell}>{value ?? 0}</span>
);

const TextCell = ({ value }) => (value ? <span className={shared.softCell}>{value}</span> : <Dash />);

const CodeCell = ({ value }) => (value ? <span className={shared.codeCell}>{value}</span> : <Dash />);

const EditCell = ({ row, canEdit, onEdit }) => (
    <button
        type="button"
        className={shared.rowIconBtn}
        disabled={!canEdit}
        onClick={(event) => { stop(event); onEdit(row); }}
        title={translation("key_edit_agency")}
        aria-label={translation("key_edit_agency")}
    >
        <Icon name="edit" size={14} />
    </button>
);

const rowProp = { row: PropTypes.object };
NameCell.propTypes = rowProp;
EditCell.propTypes = { ...rowProp, canEdit: PropTypes.bool, onEdit: PropTypes.func.isRequired };
CountCell.propTypes = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
TextCell.propTypes = CountCell.propTypes;
CodeCell.propTypes = CountCell.propTypes;

export const getAgencyListColumns = ({ canEdit, onEdit }) => [
    {
        key: "name",
        label: translation("key_agency_name"),
        sortKey: AGENCY_SORT_KEYS.NAME,
        minWidth: 220,
        sticky: true,
        render: (row) => <NameCell row={row} />,
    },
    {
        key: "country_count",
        label: `${translation("key_country")} ${translation("key_count")}`,
        width: 130,
        align: "center",
        render: (row) => <CountCell value={row?.country_count} />,
    },
    {
        key: "branch_count",
        label: `${translation("key_branch")} ${translation("key_count")}`,
        width: 130,
        align: "center",
        render: (row) => <CountCell value={row?.branch_count} />,
    },
    {
        key: "type",
        label: translation("key_agency_type"),
        sortKey: AGENCY_SORT_KEYS.TYPE,
        width: 140,
        render: (row) => <TextCell value={getDisplayAgencyType(row?.agency_type)} />,
    },
    {
        key: "category",
        label: translation("key_agency_category"),
        sortKey: AGENCY_SORT_KEYS.CATEGORY,
        width: 150,
        render: (row) => <TextCell value={getDisplayAgencyCategory(row?.agency_category)} />,
    },
    {
        key: "code",
        label: translation("key_agency_code"),
        sortKey: AGENCY_SORT_KEYS.CODE,
        width: 120,
        render: (row) => <CodeCell value={row?.agency_code} />,
    },
    {
        key: "actions",
        label: "",
        width: 56,
        align: "center",
        render: (row) => <EditCell row={row} canEdit={canEdit} onEdit={onEdit} />,
    },
];
