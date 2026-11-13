import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../../components/Icon/Icon";
import translation from "../../../../../../utils/translation";
import { convertTo12HourFormat } from "../../../../../../services/commonService";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import styles from "../Hrms.module.css";
import { timeRequestStatus } from "../hrmsConfig";
import { TIME_REQUEST_STATUS } from "../../settingsNewUiConstants";

export const TimeRequestStatusCell = ({ status }) => {
    const info = timeRequestStatus(status);
    return <span className={listStyles.statusTag} data-tone={info.tone}>{info.label}</span>;
};
TimeRequestStatusCell.propTypes = { status: PropTypes.oneOfType([PropTypes.number, PropTypes.string]) };

const ActionCell = ({ row, onView, onAction }) => {
    const pending = Number(row?.status) === TIME_REQUEST_STATUS.PENDING;
    return (
        <button type="button" className={styles.rowLink} onClick={(event) => { event.stopPropagation(); (pending ? onAction : onView)(row); }}>
            {translation(pending ? "key_take_action" : "key_view")} <Icon name="external" size={12} />
        </button>
    );
};
ActionCell.propTypes = { row: PropTypes.object.isRequired, onView: PropTypes.func.isRequired, onAction: PropTypes.func.isRequired };

/** Ports TimeRequestsTableColumns.js (reportees, takeAction = true). */
export const getReporteesTimeRequestColumns = ({ onView, onAction }) => [
    { key: "request_number", label: translation("key_request_number"), sortKey: "request_number", sticky: true, minWidth: 140, render: (row) => <span className={shared.codeCell}>{row?.request_number}</span> },
    { key: "status", label: translation("key_status"), sortKey: "status", render: (row) => <TimeRequestStatusCell status={row?.status} /> },
    { key: "raised_by", label: translation("key_employee"), sortKey: "raised_by", render: (row) => <span className={shared.nameText}>{`${row?.raised_by}(${row?.raised_by_email})`}</span> },
    /* backend 364: no branch column on the server, so the header does not sort */
    { key: "branch", label: translation("key_branch"), render: (row) => <span className={shared.softCell}>{row?.branch}</span> },
    { key: "raised_on", label: translation("key_created_on"), sortKey: "raised_on", render: (row) => <span className={shared.softCell}>{row?.raised_on}</span> },
    /* Priyanka 11 Nov: an empty time_asked reads as the em dash — never "N/A" or 0 */
    { key: "duration", label: translation("key_asked_duration"), sortKey: "duration", render: (row) => (row?.time_asked ? <span className={shared.countCell}>{row.time_asked}</span> : <span className={listStyles.mutedDash}>—</span>) },
    {
        key: "for_date",
        label: translation("key_raised_for"),
        sortKey: "for_date",
        render: (row) => (
            <span className={styles.dateCell}>
                <span className={shared.softCell}>{row?.for_date}</span>
                {row?.from && <span className={listStyles.statusTag} data-tone="neutral">{convertTo12HourFormat(row.from)}</span>}
            </span>
        ),
    },
    { key: "action", label: "", width: 130, align: "right", render: (row) => <ActionCell row={row} onView={onView} onAction={onAction} /> },
];
