import React from "react";
import PropTypes from "prop-types";
import Btn from "../../../../../../components/ui/Btn";
import Icon from "../../../../../../components/Icon/Icon";
import translation from "../../../../../../utils/translation";
import { customFromNow } from "../../../../../../services/commonService";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import styles from "../Hrms.module.css";
import { LeaveDateCell, LeaveStatusCell } from "../leaves/leaveListColumns";
import { LEAVE_ACTION, LEAVE_STATUS } from "../../settingsNewUiConstants";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const SelectCell = ({ row, selectedIds, onToggle }) => (
    <input
        type="checkbox"
        className={styles.rowSelect}
        checked={selectedIds.includes(row.id)}
        onChange={(event) => onToggle(row.id, event.target.checked)}
        onClick={(event) => event.stopPropagation()}
        aria-label={row?.leave_uuid}
    />
);
SelectCell.propTypes = { row: PropTypes.object.isRequired, selectedIds: PropTypes.array.isRequired, onToggle: PropTypes.func.isRequired };

/* Actioned status cell: tag + pencil; the pencil turns ITS row into Approve / Reject buttons (bug log #91, fixed 2026-10-06). */
const ActionedStatusCell = ({ row, canEdit, statusChangeRowId, onShowStatusChange, onRowAction }) => {
    if (row?.status === undefined) return <Dash />;
    /* backend 352: a Withdrawn leave can no longer be actioned (409 LEAVE_WITHDRAWN_NO_ACTION is the fallback) */
    if (row.status === LEAVE_STATUS.WITHDRAWN) return <LeaveStatusCell status={row.status} />;
    if (canEdit && statusChangeRowId != null && String(statusChangeRowId) === String(row.id)) {
        return (
            <span className={shared.rowActions}>
                <Btn variant="primary" type="button" onClick={(event) => { event.stopPropagation(); onRowAction(row.id, LEAVE_ACTION.APPROVE); }}>{translation("key_approve")}</Btn>
                <Btn variant="secondary" type="button" onClick={(event) => { event.stopPropagation(); onRowAction(row.id, LEAVE_ACTION.REJECT); }}>{translation("key_reject")}</Btn>
            </span>
        );
    }
    return (
        <span className={shared.rowActions}>
            <LeaveStatusCell status={row.status} />
            <button
                type="button"
                className={shared.rowIconBtn}
                disabled={!canEdit}
                onClick={(event) => { event.stopPropagation(); onShowStatusChange(row.id); }}
                title={translation("key_edit")}
                aria-label={translation("key_edit")}
            >
                <Icon name="edit" size={14} />
            </button>
        </span>
    );
};
ActionedStatusCell.propTypes = {
    row: PropTypes.object.isRequired,
    canEdit: PropTypes.bool,
    statusChangeRowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onShowStatusChange: PropTypes.func.isRequired,
    onRowAction: PropTypes.func.isRequired,
};

/** Ports LeaveListTableColumns('pending'|'actioned'): employee column inserted after Leave ID. */
export const getReporteesLeaveColumns = ({ isPending, selectedIds, onToggleSelect, canEdit, statusChangeRowId, onShowStatusChange, onRowAction }) => {
    const columns = [
        { key: "leave_uuid", label: translation("key_leave_id"), sortKey: "leave_uuid", sticky: true, minWidth: 140, render: (row) => <span className={shared.codeCell}>{row?.leave_uuid}</span> },
        { key: "email", label: translation("key_employee"), sortKey: "email", render: (row) => <span className={shared.nameText}>{row?.email}</span> },
        { key: "leave_type", label: translation("key_leave_type"), sortKey: "leave_type", render: (row) => <span className={shared.softCell}>{row?.leave_type}</span> },
        { key: "created_at", label: translation("key_applied_on"), sortKey: "created_at", render: (row) => (row?.created_at ? <span className={shared.softCell}>{customFromNow(row.created_at)}</span> : <Dash />) },
        { key: "from_date", label: translation("key_from"), sortKey: "from_date", render: (row) => <LeaveDateCell date={row?.from_date} dayType={row?.from_date_type} /> },
        { key: "to_date", label: translation("key_to"), sortKey: "to_date", render: (row) => <LeaveDateCell date={row?.to_date} dayType={row?.to_date_type} /> },
        { key: "duration", label: translation("key_total"), sortKey: "duration", align: "center", render: (row) => <span className={shared.countCell}>{row?.duration}</span> },
    ];
    if (isPending) {
        columns.unshift({ key: "select", label: "", width: 40, align: "center", render: (row) => <SelectCell row={row} selectedIds={selectedIds} onToggle={onToggleSelect} /> });
    } else {
        columns.push({
            key: "status",
            label: translation("key_status"),
            sortKey: "status",
            minWidth: 200,
            render: (row) => <ActionedStatusCell row={row} canEdit={canEdit} statusChangeRowId={statusChangeRowId} onShowStatusChange={onShowStatusChange} onRowAction={onRowAction} />,
        });
    }
    return columns;
};
