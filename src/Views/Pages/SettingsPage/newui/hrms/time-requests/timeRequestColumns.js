import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../../components/Icon/Icon";
import translation from "../../../../../../utils/translation";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import styles from "../Hrms.module.css";
import { TimeRequestStatusCell } from "../reportees/reporteesTimeRequestColumns";
import { TIME_REQUEST_STATUS } from "../../settingsNewUiConstants";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const TextCell = ({ value }) => (value ? <span className={shared.softCell}>{value}</span> : <Dash />);
TextCell.propTypes = { value: PropTypes.node };

const ActionsCell = ({ row, canEdit, onEdit, onWithdraw }) => {
    const pending = Number(row?.status) === TIME_REQUEST_STATUS.PENDING;
    return (
        <span className={shared.rowActions}>
            <button
                type="button"
                className={shared.rowIconBtn}
                disabled={!(canEdit && pending)}
                onClick={(event) => { event.stopPropagation(); onEdit(row); }}
                title={translation("key_edit")}
                aria-label={translation("key_edit")}
            >
                <Icon name="edit" size={14} />
            </button>
            {pending && (
                <button type="button" className={styles.rowLink} onClick={(event) => { event.stopPropagation(); onWithdraw(row.id); }}>
                    {translation("key_withdraw")} <Icon name="external" size={12} />
                </button>
            )}
        </span>
    );
};
ActionsCell.propTypes = { row: PropTypes.object.isRequired, canEdit: PropTypes.bool, onEdit: PropTypes.func.isRequired, onWithdraw: PropTypes.func.isRequired };

/** Ports TimeRequestTableColumns.js (editTimeRequest = true). */
export const getTimeRequestColumns = ({ canEdit, onEdit, onWithdraw }) => [
    { key: "request_id", label: translation("key_request_id"), sortKey: "request_id", sticky: true, minWidth: 140, render: (row) => <span className={shared.codeCell}>{row?.request_id}</span> },
    { key: "created_on", label: translation("key_created_on"), sortKey: "created_on", render: (row) => <TextCell value={row?.created_on} /> },
    { key: "created_for", label: translation("key_created_for"), sortKey: "created_for", render: (row) => <TextCell value={row?.created_for} /> },
    { key: "from_time", label: translation("key_from_time"), sortKey: "from_time", render: (row) => <TextCell value={row?.from_time} /> },
    /* Priyanka 11 Nov: empty time_asked / time_approved / actioned_by read as the em dash — never "N/A" or 0 */
    { key: "time_asked", label: translation("key_time_asked"), sortKey: "time_asked", render: (row) => (row?.time_asked ? <span className={shared.countCell}>{row.time_asked}</span> : <Dash />) },
    { key: "time_approved", label: translation("key_time_approved"), sortKey: "time_approved", render: (row) => (row?.time_approved ? <span className={shared.countCell}>{row.time_approved}</span> : <Dash />) },
    { key: "status", label: translation("key_status"), sortKey: "status", render: (row) => <TimeRequestStatusCell status={row?.status} /> },
    { key: "actioned_by", label: translation("key_actioned_by"), sortKey: "actioned_by", render: (row) => <TextCell value={row?.actioned_by || row?.approved_by} /> },
    { key: "actions", label: "", width: 150, align: "right", render: (row) => <ActionsCell row={row} canEdit={canEdit} onEdit={onEdit} onWithdraw={onWithdraw} /> },
];
