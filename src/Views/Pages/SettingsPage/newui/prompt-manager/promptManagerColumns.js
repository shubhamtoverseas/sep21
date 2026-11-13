import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import { Switch } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import { PROMPT_SORT_KEY } from "../settingsNewUiConstants";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const TextCell = ({ value }) => (value ? <span className={shared.softCell}>{value}</span> : <Dash />);
const CountCell = ({ value }) => (value ? <span className={shared.countCell}>{value}</span> : <Dash />);
const valueProp = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
TextCell.propTypes = valueProp;
CountCell.propTypes = valueProp;

const ActionsCell = ({ row, onToggle, onEdit, onDelete }) => (
    <span className={shared.rowActions}>
        <Switch
            id={`prompt-active-${row?.id}`}
            checked={Boolean(row?.is_active)}
            onChange={(checked) => onToggle(row.id, checked)}
        />
        <button type="button" className={shared.rowIconBtn} onClick={(event) => { event.stopPropagation(); onEdit(row); }} title={translation("key_edit")} aria-label={translation("key_edit_icon")}>
            <Icon name="edit" size={14} />
        </button>
        <button type="button" className={`${shared.rowIconBtn} ${shared.rowIconDanger}`} onClick={(event) => { event.stopPropagation(); onDelete(row.id); }} title={translation("key_delete")} aria-label={translation("key_delete_icon")}>
            <Icon name="trash" size={14} />
        </button>
    </span>
);
ActionsCell.propTypes = {
    row: PropTypes.object.isRequired,
    onToggle: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};

/** Ports PromptManagerTableColumns.js (every column keeps the legacy "name" sort key). */
export const getPromptManagerColumns = ({ onToggle, onEdit, onDelete }) => [
    { key: "name", label: translation("key_prompt_template_name"), sortKey: PROMPT_SORT_KEY, sticky: true, minWidth: 220, render: (row) => <span className={shared.nameText}>{row?.name || ""}</span> },
    { key: "number_of_lines", label: translation("key_lines"), sortKey: PROMPT_SORT_KEY, align: "center", render: (row) => <CountCell value={row?.number_of_lines} /> },
    { key: "total_dynamic_fields", label: translation("key_dynamic_fields"), sortKey: PROMPT_SORT_KEY, align: "center", render: (row) => <CountCell value={row?.total_dynamic_fields} /> },
    { key: "last_used_on", label: translation("key_last_used_on"), sortKey: PROMPT_SORT_KEY, render: (row) => <TextCell value={row?.last_used_on} /> },
    { key: "created_by", label: translation("key_created_by"), sortKey: PROMPT_SORT_KEY, render: (row) => <TextCell value={row?.created_by} /> },
    { key: "updated_by", label: translation("key_last_modified_by"), sortKey: PROMPT_SORT_KEY, render: (row) => <TextCell value={row?.updated_by} /> },
    { key: "actions", label: translation("key_actions"), width: 130, align: "center", render: (row) => <ActionsCell row={row} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} /> },
];
