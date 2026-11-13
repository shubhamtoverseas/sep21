import React from "react";
import { convertTo12HourFormat } from "../../../../services/commonService";
import translation from "../../../../utils/translation";
import { ReportDateCell, ReportTag } from "../ReportShell";

export const TimeEntryReportTableColumns = () => {

    const columns = [
        {
            header: translation('key_log_id'),
            sortKey: 'request_number',
            render: (row) => (
                <div className="position-relative d-inline-block">
                    {row?.request_number}
                </div>
            )
        },
        {
            header: translation('key_created_on'),
            sortKey: 'raised_on',
            render: (row) => (
                <ReportDateCell>
                    <span>{row?.raised_on}</span>
                    {row?.raised_on_time && <ReportTag>{row.raised_on_time}</ReportTag>}
                </ReportDateCell>
            )
        },
        {
            header: translation('key_date_for'),
            sortKey: 'for_date',
            render: (row) => (
                <div className="">
                    {row?.for_date}
                </div>
            )
        },
        {
            header: translation('key_start_time'),
            sortKey: 'from',
            render: (row) => (
                <ReportDateCell>
                    <span>{row?.for_date}</span>
                    <ReportTag>{row?.from ? convertTo12HourFormat(row?.from) : '-'}</ReportTag>
                </ReportDateCell>
            )
        },
        {
            header: translation('key_duration'),
            sortKey: 'time_asked',
            render: (row) => (
                <div className="">
                    {row?.time_asked}
                </div>
            )
        },
        {
            header: translation('key_employee'),
            sortKey: 'created_for',
            render: (row) => (
                <div className="">
                    {row?.created_for}
                </div>
            )
        },
        {
            header: translation('key_added_by'),
            sortKey: 'raised_by',
            render: (row) => (
                <div className="">
                    {row?.raised_by}
                </div>
            )
        },
    ];
    return columns;
};