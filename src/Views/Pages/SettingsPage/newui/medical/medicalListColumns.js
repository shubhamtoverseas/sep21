import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import { MEDICAL_SORT_KEYS } from "../settingsNewUiConstants";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const NameCell = ({ value }) => (value ? <span className={shared.nameText}>{value}</span> : <Dash />);
const TextCell = ({ value }) => (value ? <span className={shared.softCell}>{value}</span> : <Dash />);

const EditCell = ({ row, canEdit, onEdit }) => (
    <button
        type="button"
        className={shared.rowIconBtn}
        disabled={!canEdit}
        onClick={(event) => { event.stopPropagation(); onEdit(row); }}
        title={translation("key_edit_medical_clinic")}
        aria-label={translation("key_edit_medical_clinic")}
    >
        <Icon name="edit" size={14} />
    </button>
);

const valueProp = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
NameCell.propTypes = valueProp;
TextCell.propTypes = valueProp;
EditCell.propTypes = { row: PropTypes.object, canEdit: PropTypes.bool, onEdit: PropTypes.func.isRequired };

export const getMedicalListColumns = ({ canEdit, onEdit }) => [
    { key: "name", label: `${translation("key_medical_clinic")} ${translation("key_name")}`, sortKey: MEDICAL_SORT_KEYS.NAME, minWidth: 240, sticky: true, render: (row) => <NameCell value={row?.clinic_name} /> },
    { key: "country", label: translation("key_country"), sortKey: MEDICAL_SORT_KEYS.COUNTRY, width: 160, render: (row) => <TextCell value={row?.country_name} /> },
    { key: "agency", label: translation("key_agency"), sortKey: MEDICAL_SORT_KEYS.AGENCY, minWidth: 180, render: (row) => <TextCell value={row?.agency_name} /> },
    { key: "email", label: translation("key_email"), sortKey: MEDICAL_SORT_KEYS.EMAIL, minWidth: 220, render: (row) => <TextCell value={row?.clinic_email} /> },
    { key: "actions", label: "", width: 56, align: "center", render: (row) => <EditCell row={row} canEdit={canEdit} onEdit={onEdit} /> },
];
