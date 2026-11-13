import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import { TEMPLATE_ACCESSIBILITY, TEMPLATE_SORT_KEYS } from "../settingsNewUiConstants";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const NameCell = ({ value }) => (value ? <span className={shared.nameText}>{value}</span> : <Dash />);
const TextCell = ({ value }) => (value ? <span className={shared.softCell}>{value}</span> : <Dash />);
const CodeCell = ({ value }) => (value ? <span className={shared.codeCell}>{value}</span> : <Dash />);

const AccessCell = ({ value }) => {
    if (!value) return <Dash />;
    const isPublic = value === TEMPLATE_ACCESSIBILITY.PUBLIC;
    return (
        <span className={listStyles.statusTag} data-tone={isPublic ? "blue-1" : "neutral"}>
            {translation(isPublic ? "key_public" : "key_private")}
        </span>
    );
};

const ActionsCell = ({ row, canEdit, canDelete, onEdit, onDelete }) => (
    <span className={shared.rowActions}>
        {canEdit && (
            <button type="button" className={shared.rowIconBtn} onClick={(event) => { event.stopPropagation(); onEdit(row); }} title={translation("key_edit_template")} aria-label={translation("key_edit_template")}>
                <Icon name="edit" size={14} />
            </button>
        )}
        {canDelete && (
            <button type="button" className={`${shared.rowIconBtn} ${shared.rowIconDanger}`} onClick={(event) => { event.stopPropagation(); onDelete(row); }} title={translation("key_delete")} aria-label={translation("key_delete")}>
                <Icon name="trash" size={14} />
            </button>
        )}
    </span>
);

const valueProp = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
NameCell.propTypes = valueProp;
TextCell.propTypes = valueProp;
CodeCell.propTypes = valueProp;
AccessCell.propTypes = valueProp;
ActionsCell.propTypes = { row: PropTypes.object, canEdit: PropTypes.bool, canDelete: PropTypes.bool, onEdit: PropTypes.func.isRequired, onDelete: PropTypes.func.isRequired };

export const getTemplateListColumns = ({ canEdit, canDelete, onEdit, onDelete }) => [
    { key: "module", label: translation("key_module"), sortKey: TEMPLATE_SORT_KEYS.MODULE, width: 140, sticky: true, render: (row) => <CodeCell value={row?.module_key} /> },
    { key: "category", label: translation("key_category"), sortKey: TEMPLATE_SORT_KEYS.CATEGORY, minWidth: 160, render: (row) => <TextCell value={row?.category_name} /> },
    { key: "language", label: translation("key_message_language"), sortKey: TEMPLATE_SORT_KEYS.LANGUAGE, width: 150, render: (row) => <TextCell value={row?.language_name} /> },
    { key: "name", label: translation("key_template_name"), sortKey: TEMPLATE_SORT_KEYS.NAME, minWidth: 220, render: (row) => <NameCell value={row?.template_name} /> },
    { key: "accessibility", label: translation("key_accessibility"), sortKey: TEMPLATE_SORT_KEYS.ACCESSIBILITY, width: 120, render: (row) => <AccessCell value={row?.accessibility} /> },
    { key: "created_by", label: translation("key_created_by"), sortKey: TEMPLATE_SORT_KEYS.CREATED_BY, width: 160, render: (row) => <TextCell value={row?.created_by_name} /> },
    { key: "updated_by", label: translation("key_last_modified_by"), sortKey: TEMPLATE_SORT_KEYS.UPDATED_BY, width: 170, render: (row) => <TextCell value={row?.updated_by_name} /> },
    { key: "actions", label: "", width: 88, align: "center", render: (row) => <ActionsCell row={row} canEdit={canEdit} canDelete={canDelete} onEdit={onEdit} onDelete={onDelete} /> },
];
