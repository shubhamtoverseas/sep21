import React from "react";
import translation from "../../../../utils/translation";
import { formatTimeTo12HourFormat } from "../../../../services/commonService";
import dayjs from "dayjs";

export const ScheduleComplianceReportTableColumns = () => {

    const columns = [
        {
            header: translation("key_employee"),
            sortKey: "email",
            leftAlign: true,
            render: (row) => <div>{row?.email}</div>
        },
        {
            header: translation("key_date"),
            sortKey: "actual_login_date",
            render: (row) => (
                <div>{dayjs(row?.actual_login_date).format("DD MMM YYYY")}</div>
            )
        },
        {
            header: translation("key_day"),
            sortKey: "login_day",
            render: (row) => <div>{row?.login_day}</div>
        },
        {
            header: translation("key_schedule_time_in"),
            sortKey: "shift_start_time",
            render: (row) => row?.shift_start_time || '-'
        },
        {
            header: translation("key_actual_time_in"),
            sortKey: "actual_login_time",
            render: (row) =>
                row?.actual_login_time
                    ? formatTimeTo12HourFormat(row.actual_login_time)
                    : "-"
        },
        {
            header: translation("key_time_in_discrepancy_mins"),
            sortKey: "shift_start_diff",
            render: (row) => <div>{row?.login_time_difference}</div> 
        },
        {
            header: translation("key_schedule_time_out"),   
            sortKey: "shift_end_time",
            render: (row) => row?.shift_end_time || '-'
        },
        {
            header: translation("key_actual_time_out"),
            sortKey: "actual_logout_time",
            render: (row) =>
                row?.actual_logout_time
                    ? formatTimeTo12HourFormat(row.actual_logout_time)
                    : "-"
        },
        {
            header: translation("key_time_out_discrepancy_mins"),
            sortKey: "shift_end_diff",
            render: (row) => <div>{row?.logout_time_difference}</div> 
        }
    ];

    return columns;
};
