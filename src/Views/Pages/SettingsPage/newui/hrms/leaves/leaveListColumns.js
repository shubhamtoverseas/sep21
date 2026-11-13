import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../../components/Icon/Icon";
import translation from "../../../../../../utils/translation";
import { customFromNow, getCurrentDate } from "../../../../../../services/commonService";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import styles from "../Hrms.module.css";
import { formatLeaveDate, halfDayLabel, leaveStatusLabel, leaveStatusTone } from "../hrmsConfig";
import { LEAVE_STATUS } from "../../settingsNewUiConstants";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

export const LeaveDateCell = ({ date, dayType }) => (
    <span className={styles.dateCell}>
        <span className={shared.softCell}>{formatLeaveDate(date)}</span>
        {dayType && <span className={listStyles.statusTag} data-tone="neutral">{halfDayLabel(dayType)}</span>}
    </span>
);
LeaveDateCell.propTypes = { date: PropTypes.string, dayType: PropTypes.string };

export const LeaveStatusCell = ({ status }) => (
    status == null ? <Dash /> : <span className={listStyles.statusTag} data-tone={leaveStatusTone(status)}>{leaveStatusLabel(status)}</span>
);
LeaveStatusCell.propTypes = { status: PropTypes.oneOfType([PropTypes.number, PropTypes.string]) };

const ActionsCell = ({ row, canEdit, onEdit, onWithdraw }) => {
    const isPending = Number(row?.status) === LEAVE_STATUS.PENDING;
    const isEditable = isPending && row?.from_date >= getCurrentDate();
    return (
        <span className={shared.rowActions}>
            {canEdit && (
                <button
                    type="button"
                    className={shared.rowIconBtn}
                    disabled={!isEditable}
                    onClick={(event) => { event.stopPropagation(); onEdit(row); }}
                    title={translation("key_edit")}
                    aria-label={translation("key_edit")}
                >
                    <Icon name="edit" size={14} />
                </button>
            )}
            {isPending && (
                <button type="button" className={styles.rowLink} onClick={(event) => { event.stopPropagation(); onWithdraw(row.id); }}>
                    {translation("key_withdraw")} <Icon name="external" size={12} />
                </button>
            )}
        </span>
    );
};
ActionsCell.propTypes = { row: PropTypes.object.isRequired, canEdit: PropTypes.bool, onEdit: PropTypes.func.isRequired, onWithdraw: PropTypes.func.isRequired };

/** Ports LeaveListTableColumns('my-leaves'): same sort keys, edit gated by edit_leave + pending + future. */
export const getLeaveListColumns = ({ canEdit, onEdit, onWithdraw }) => [
    { key: "leave_uuid", label: translation("key_leave_id"), sortKey: "leave_uuid", sticky: true, minWidth: 140, render: (row) => <span className={shared.codeCell}>{row?.leave_uuid}</span> },
    { key: "leave_type", label: translation("key_leave_type"), sortKey: "leave_type", render: (row) => <span className={shared.nameText}>{row?.leave_type}</span> },
    { key: "created_at", label: translation("key_applied_on"), sortKey: "created_at", render: (row) => (row?.created_at ? <span className={shared.softCell}>{customFromNow(row.created_at)}</span> : <Dash />) },
    { key: "from_date", label: translation("key_from"), sortKey: "from_date", render: (row) => <LeaveDateCell date={row?.from_date} dayType={row?.from_date_type} /> },
    { key: "to_date", label: translation("key_to"), sortKey: "to_date", render: (row) => <LeaveDateCell date={row?.to_date} dayType={row?.to_date_type} /> },
    { key: "duration", label: translation("key_total"), sortKey: "duration", align: "center", render: (row) => <span className={shared.countCell}>{row?.duration}</span> },
    { key: "status", label: translation("key_status"), sortKey: "status", render: (row) => <LeaveStatusCell status={row?.status} /> },
    { key: "actions", label: "", width: 150, align: "right", render: (row) => <ActionsCell row={row} canEdit={canEdit} onEdit={onEdit} onWithdraw={onWithdraw} /> },
];
