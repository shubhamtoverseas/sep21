import React from "react";
import { convertTo12HourFormat, getTimeRequestStatusLabel } from "../../../../services/commonService";
import translation from "../../../../utils/translation";
import { ReportStatusChip } from "../ReportShell";
import { REPORT_CHIP_DEFAULT_VARIANT, TIME_REQUEST_STATUS_VARIANT, statusKeyOf } from "../reportConstants";

export const TimeRequestReportTableColumns = () => {
    let columns = [
        {
            header: translation('key_request_number'),
            sortKey: 'request_number',
            render: (row) => (
                <div className="position-relative d-inline-block">
                    {row?.request_number}
                </div>
            )
        },
        {
            header: translation('key_raised_by'),
            sortKey: 'raised_by',
            render: (row) => (
                <div className="">
                    {row?.raised_by}
                </div>
            )
        },
        {
            header: translation('key_raised_on'),
            sortKey: 'raised_on',
            render: (row) => (
                <div className="">
                    {row?.raised_on}
                </div>
            )
        },
        {
            header: translation('key_actioned_by'),
            sortKey: 'actioned_by',
            render: (row) => (
                <div className="">
                    {row?.actioned_by}
                </div>
            )
        },
        {
            header: translation('key_actioned_on'),
            sortKey: 'actioned_on',
            render: (row) => (
                <div className="">
                    {row?.actioned_on}
                </div>
            )
        },
        {
            header: translation('key_for_date'),
            sortKey: 'for_date',
            render: (row) => (
                <div className="">
                    {row?.for_date}
                </div>
            )
        },
        {
            header: translation('key_from'),
            sortKey: 'from',
            render: (row) => (
                <div className="">
                    {row?.from ? convertTo12HourFormat(row?.from) : '-'}
                </div>
            )
        },
        {
            header: translation('key_to'),
            sortKey: 'to',
            render: (row) => (
                <div className="">
                    {row?.to ? convertTo12HourFormat(row?.to) : '-'}
                </div>
            )
        },
        {
            header: translation('key_asked_duration'),
            sortKey: 'time_asked',
            render: (row) => (
                <div className="">
                    {row?.time_asked ? row?.time_asked : '-'}
                </div>
            )
        },
        {
            header: translation('key_approved_duration'),
            sortKey: 'time_approved',
            render: (row) => (
                <div className="">
                    {row?.time_approved ? row?.time_approved : '-'}
                </div>
            )
        },
        {
            header: translation('key_status'),
            sortKey: 'status',
            render: (row) => {
                const status = getTimeRequestStatusLabel(parseInt(row?.status));
                return <ReportStatusChip variant={TIME_REQUEST_STATUS_VARIANT[statusKeyOf(status?.className)] || REPORT_CHIP_DEFAULT_VARIANT}>{status?.label || '-'}</ReportStatusChip>;
            }
        },
    ];
    return columns
};
