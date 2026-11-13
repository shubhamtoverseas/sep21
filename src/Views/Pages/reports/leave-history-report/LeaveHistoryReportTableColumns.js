import React from "react";
import {
    formatDateTime,
    getTimeRequestStatusLabel,
} from '../../../../services/commonService';
import translation from "../../../../utils/translation";
import { ReportStatusChip } from "../ReportShell";
import { REPORT_CHIP_DEFAULT_VARIANT, TIME_REQUEST_STATUS_VARIANT, statusKeyOf } from "../reportConstants";

export const LeaveHistoryReportTableColumns = () => {
    let columns = [
        {
            header: translation('key_applied_by'),
            sortKey: 'applier_name',
            leftAlign: true,
            render: (row) => (
                <div className="position-relative d-inline-block">
                    {row?.applier_name}
                </div>
            )
        },
        {
            header: translation('key_raised_on'),
            sortKey: 'created_at',
            render: (row) => (
                <div className="">
                    {row.created_at ? formatDateTime(row.created_at) : 'NA'}
                </div>
            )
        },
        {
            header: translation('key_actioned_by'),
            sortKey: 'status',
            render: (row) => (
                <div className="">
                    {(row.status == 1 || row.status == 2) && row.approver_name ? row.approver_name : row.status == 3 && row.rejector_name ? row.rejector_name : 'NA'}
                </div>
            )
        },
        {
            header: translation('key_actioned_on'),
            sortKey: 'approved_at',
            render: (row) => (
                <div className="">
                    {(row.status == 1 || row.status == 2) && row.approved_at ? formatDateTime(row.approved_at) : row.status == 3 && row.rejected_at ? formatDateTime(row.rejected_at) : 'NA'}
                </div>
            )
        },
        {
            header: translation('key_from'),
            sortKey: 'from_date',
            render: (row) => (
                <div>
                    {row?.from_date}
                </div>
            )
        },
        {
            header: translation('key_to'),
            sortKey: 'to_date',
            render: (row) => (
                <div>
                    {row?.to_date}
                </div>
            )
        },
        {
            header: translation('key_days'),
            accessor: 'days',
            sortKey: 'duration',
            render: (row) => (
                <div className="">
                    {row?.duration}
                </div>
            )
        },
        {
            header: translation('key_status'),
            sortKey: 'status',
            render: (row) => {
                const status = getTimeRequestStatusLabel(parseInt(row?.status));
                return <ReportStatusChip variant={TIME_REQUEST_STATUS_VARIANT[statusKeyOf(status?.className)] || REPORT_CHIP_DEFAULT_VARIANT}>{status?.label}</ReportStatusChip>;
            }
        },
    ];
    return columns
};
