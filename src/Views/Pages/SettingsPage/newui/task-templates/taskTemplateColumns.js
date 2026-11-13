import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import { TASK_TEMPLATE_COPY, TASK_TEMPLATE_SORT_KEYS, TASK_TEMPLATE_STATUS } from "../settingsNewUiConstants";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;
const NameCell = ({ value }) => (value ? <span className={shared.nameText}>{value}</span> : <Dash />);
const TextCell = ({ value }) => (value ? <span className={shared.softCell} lang="zh-HK">{value}</span> : <Dash />);

const StatusCell = ({ value }) => {
    const retired = value === TASK_TEMPLATE_STATUS.RETIRED;
    return (
        <span className={listStyles.statusTag} data-tone={retired ? "neutral" : "green"}>
            {retired ? TASK_TEMPLATE_COPY.retired : translation("key_active")}
        </span>
    );
};

const ActionsCell = ({ row, onEdit }) => (
    <span className={shared.rowActions}>
        <button type="button" className={shared.rowIconBtn} onClick={(event) => { event.stopPropagation(); onEdit(row); }} title={translation("key_edit")} aria-label={`${translation("key_edit")} ${row?.title_en || row?.title_zh || ""}`}>
            <Icon name="edit" size={14} />
        </button>
    </span>
);

const valueProp = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
NameCell.propTypes = valueProp;
TextCell.propTypes = valueProp;
StatusCell.propTypes = valueProp;
ActionsCell.propTypes = { row: PropTypes.object.isRequired, onEdit: PropTypes.func.isRequired };

/* sheet U-0011: Task Title · Traditional Chinese · Status · Edit */
export const getTaskTemplateColumns = ({ canManage, onEdit }) => [
    { key: "title_en", label: TASK_TEMPLATE_COPY.titleEn, sortKey: TASK_TEMPLATE_SORT_KEYS.TITLE_EN, minWidth: 260, sticky: true, render: (row) => <NameCell value={row?.title_en} /> },
    { key: "title_zh", label: TASK_TEMPLATE_COPY.titleZh, sortKey: TASK_TEMPLATE_SORT_KEYS.TITLE_ZH, minWidth: 220, render: (row) => <TextCell value={row?.title_zh} /> },
    { key: "status", label: translation("key_status"), sortKey: TASK_TEMPLATE_SORT_KEYS.STATUS, width: 120, render: (row) => <StatusCell value={row?.status} /> },
    ...(canManage ? [{ key: "actions", label: "", width: 64, align: "center", render: (row) => <ActionsCell row={row} onEdit={onEdit} /> }] : []),
];
