import React from "react";
import translation from "../../../../utils/translation";
import { formatDuration } from "../../../../services/commonService";
import dayjs from "dayjs";

export const SessionHistoryReportTableColumns = () => {
    const columns = [
        {
            header: translation('key_employee'),
            sortKey: 'name',
            leftAlign: true,
            render: (row) => (
                <div className="position-relative d-inline-block">
                    {row?.name}
                </div>
            )
        },
        {
            header: translation('key_date'),
            sortKey: 'login_date',
            render: (row) => (
                <div className="">
                    {dayjs(row?.login_date).format('DD MMM YYYY')}
                </div>
            )
        },
        {
            header: translation('key_first_login'),
            accessor: 'first_login',
            sortKey: 'first_login',
            render: (row) => (
                <div className="">
                    {row?.first_login ? dayjs(row.first_login).format('hh:mm A') : '—'}
                </div>
            )
        },
        {
            /* Priyanka 11 Nov: the day's LAST LOGOUT (UTC ISO), actual time not relative; null = the session
               is still open — row.last_login is no longer read in this table */
            header: translation('key_last_logout'),
            accessor: 'last_logout',
            sortKey: 'last_logout',
            render: (row) => (
                <div className="">
                    {row?.last_logout ? dayjs(row.last_logout).format('hh:mm A') : '—'}
                </div>
            )
        },
        {
            header: translation('key_sessions'),
            sortKey: 'sessions',
            render: (row) => (
                <div className="">
                    {row?.sessions}
                </div>
            )
        },
        {
            header: translation('key_avg_session_duration'),
            sortKey: 'avg_seconds',
            render: (row) => (
                <div className="">
                    {formatDuration(row?.avg_seconds)}
                </div>
            )
        },
        {
            header: translation('key_total_duration'),
            sortKey: 'total_seconds',
            render: (row) => (
                <div className="">
                    {formatDuration(row?.total_seconds)}
                </div>
            )
        },
    ];
    return columns;
};