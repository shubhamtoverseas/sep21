import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../../components/Icon/Icon";
import translation from "../../../../../../utils/translation";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import styles from "../Hrms.module.css";

const Tag = ({ value }) => (value ? <span className={listStyles.statusTag} data-tone="neutral">{value}</span> : <span className={listStyles.mutedDash}>—</span>);
Tag.propTypes = { value: PropTypes.node };

const ActionsCell = ({ row, canDelete, onView, onDelete }) => (
    <span className={shared.rowActions}>
        <button type="button" className={shared.rowIconBtn} onClick={(event) => { event.stopPropagation(); onView(row); }} title={translation("key_view")} aria-label={translation("key_view")}>
            <Icon name="eye" size={14} />
        </button>
        {canDelete && (
            <button type="button" className={`${shared.rowIconBtn} ${shared.rowIconDanger}`} onClick={(event) => { event.stopPropagation(); onDelete(row?.id); }} title={translation("key_delete")} aria-label={translation("key_delete")}>
                <Icon name="trash" size={14} />
            </button>
        )}
    </span>
);
ActionsCell.propTypes = { row: PropTypes.object.isRequired, canDelete: PropTypes.bool, onView: PropTypes.func.isRequired, onDelete: PropTypes.func.isRequired };

/** Ports ApprovedTimeEntryTableColumns.js — legacy never passed `deleteTimeCredit`, so canDelete stays false. */
export const getTimeCreditColumns = ({ canDelete = false, onView, onDelete }) => [
    { key: "request_id", label: translation("key_credit_id"), sortKey: "request_id", sticky: true, minWidth: 140, render: (row) => <span className={shared.codeCell}>{row?.request_id}</span> },
    {
        key: "created_on",
        label: translation("key_created_on"),
        sortKey: "created_on",
        render: (row) => (
            <span className={styles.dateCell}>
                <span className={shared.softCell}>{row?.created_on}</span>
                <Tag value={row?.created_at} />
            </span>
        ),
    },
    { key: "created_for", label: translation("key_date_for"), sortKey: "created_for", render: (row) => <span className={shared.softCell}>{row?.created_for}</span> },
    { key: "from_time", label: translation("key_start_time"), sortKey: "from_time", render: (row) => <Tag value={row?.from_time} /> },
    { key: "to_time", label: translation("key_end_time"), sortKey: "to_time", render: (row) => <Tag value={row?.to_time} /> },
    { key: "duration", label: translation("key_duration"), sortKey: "duration", render: (row) => <span className={shared.countCell}>{row?.duration}</span> },
    { key: "employee", label: translation("key_employee"), render: (row) => <span className={shared.nameText}>{row?.employee}</span> },
    { key: "actions", label: "", width: 90, align: "center", render: (row) => <ActionsCell row={row} canDelete={canDelete} onView={onView} onDelete={onDelete} /> },
];
