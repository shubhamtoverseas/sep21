import React from 'react';

import constData from '../../../../components/ReusableComponents/constants';
import translation from '../../../../utils/translation';
import { ReportStatusChip } from '../ReportShell';
import { INTERVIEW_STATUS_VARIANT, REPORT_CHIP_DEFAULT_VARIANT } from '../reportConstants';
import dayjs from 'dayjs';

export const InterviewReportTableColumns = () => {
    const formatInterviewStatus = (status) => {
        switch (status) {
            case 1:
                return translation('key_invited');
            case 2:
                return translation('key_applied');
            case 3:
                return translation('key_matched');
            case 4:
                return translation('key_pending');
            case 5:
                return translation('key_upcoming');
            case 6:
                return translation('key_completed');
            case 10:
                return translation('key_cancelled');
            default:
                return translation('key_na');
        }
    }

    const allColumns = [
        {
            header: translation('key_interview') + ' ' + translation('key_id'),
            sortKey: 'id',
            leftAlign: true,
            render: (row) => <span>{row?.id || '-'}</span>,
        },
        {
            header: translation('key_interview') + ' ' + translation('key_name'),
            sortKey: 'reference_id',
            render: (row) => <span>{row?.reference_id ? `JOID-Employer-Worker` : '-'}</span>,
        },
        {
            header: translation('key_employer') + ' ' + translation('key_id'),
            sortKey: 'employer_reference_id',
            render: (row) => <span>{row?.employer_reference_id || '-'}</span>,
        },
        {
            header: translation('key_employer'),
            sortKey: 'employer_fullname',
            render: (row) => <span>{row?.employer_fullname || '-'}</span>,
        },
        {
            header: translation('key_worker') + ' ' + translation('key_id'),
            sortKey: 'worker_reference_id',
            render: (row) => <span>{row?.worker_reference_id || '-'}</span>,
        },
        {
            header: translation('key_worker'),
            sortKey: 'worker_fullname',
            render: (row) => <span>{row?.worker_fullname || '-'}</span>,
        },
        {
            header: translation('key_job_id'),
            sortKey: 'reference_id',
            render: (row) => <span>{row?.reference_id || '-'}</span>,
        },
        {
            header: translation('key_cs'),
            sortKey: 'cs_email',
            render: (row) => <span>{row?.cs_email || '-'}</span>,
        },
        {
            header: translation('key_interpreter'),
            sortKey: 'interpreter_email',
            render: (row) => <span>{row?.interpreter_email || '-'}</span>,
        },
        {
            header: translation('key_interview') + ' ' + translation('key_category'),
            sortKey: 'interview_category',
            render: (row) => {
                const category = constData?.getInterviewCategoryOptions(row?.interview_category);
                return <span>{category ? translation(category) : '-'}</span>;
            }
        },
        {
            header: translation('key_gmeet_link'),
            sortKey: 'google_meet_link',
            render: (row) => {
                if (row?.google_meet_link) {
                    return (
                        <a 
                            href={row.google_meet_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary"
                        >
                            {row.google_meet_link}
                        </a>
                    );
                }
                return '-';
            },
        },
        {
            header: translation('key_branch_name'),
            sortKey: 'branch_display_name',
            render: (row) => <span>{row?.branch_display_name || '-'}</span>,
        },
        {
            header: translation('key_original_interview_time'),
            sortKey: 'interview_date',
            render: (row) => {
                if (row?.interview_date && row?.interview_time) {
                    return dayjs(`${row.interview_date} ${row.interview_time}`).format('DD MMM YYYY, hh:mm A');
                }
                return '-';
            },
        },
        {
            header: translation('key_invited') + ' ' + translation('key_on'),
            sortKey: 'interview_invited_at',
            render: (row) => {
                return row?.interview_invited_at 
                    ? dayjs(row.interview_invited_at).format('DD MMM YYYY, hh:mm A') 
                    : '-';
            },
        },
        {
            header: translation('key_declined') + ' ' + translation('key_on'),
            sortKey: 'interview_declined_at',
            render: (row) => {
                return row?.interview_declined_at 
                    ? dayjs(row.interview_declined_at).format('DD MMM YYYY, hh:mm A') 
                    : translation('key_na');
            },
        },
        {
            header: translation('key_accepted_on'),
            sortKey: 'interview_accepted_at',
            render: (row) => {
                return row?.interview_accepted_at 
                    ? dayjs(row.interview_accepted_at).format('DD MMM YYYY, hh:mm A') 
                    : translation('key_na');
            },
        },
        {
            header: translation('key_reschedule_requested'),
            sortKey: 'is_reschedule',
            render: (row) => <span>{row?.is_reschedule ? translation('key_yes') : translation('key_no')}</span>,
        },
        {
            header: translation('key_reschedule_requested_time'),
            sortKey: 'new_interview_date',
            render: (row) => {
                if (row?.new_interview_date && row?.new_interview_time) {
                    return dayjs(`${row.new_interview_date} ${row.new_interview_time}`).format('DD MMM YYYY, hh:mm A');
                }
                return translation('key_na');
            },
        },
        {
            header: translation('key_reschedule_accepted'),
            sortKey: 'is_reschedule',
            render: (row) => {
                if (row?.is_reschedule) {
                    return row?.interview_accepted_at ? translation('key_yes') : translation('key_no');
                }
                return translation('key_na');
            },
        },
        {
            header: translation('key_updated_interview_time'),
            sortKey: 'new_interview_date',
            render: (row) => {
                if (row?.new_interview_date && row?.new_interview_time) {
                    return dayjs(`${row.new_interview_date} ${row.new_interview_time}`).format('DD MMM YYYY, hh:mm A');
                }
                return '-';
            },
        },
        {
            header: translation('key_interview_final_status'),
            sortKey: 'status',
            render: (row) => {
                const statusColors = {
                    1: 'invited',
                    2: 'applied',
                    3: 'matched',
                    4: 'pending',
                    5: 'upcoming',
                    6: 'completed',
                    10: 'cancelled',
                };
                return <ReportStatusChip variant={INTERVIEW_STATUS_VARIANT[statusColors[row?.status]] || REPORT_CHIP_DEFAULT_VARIANT}>{formatInterviewStatus(row?.status)}</ReportStatusChip>;
            },
        },
        {
            header: translation('key_cancelled') + ' ' + translation('key_reason'),
            sortKey: 'no_show_flag',
            render: (row) => {
                if (row?.status === 4) {
                    return row?.no_show_flag || translation('key_na');
                }
                return translation('key_na');
            },
        },
        {
            header: translation('key_report') + ' ' + translation('key_comment'),
            sortKey: 'comment',
            render: (row) => <span className="text-wrap mw232 d-block">{row?.comment || '-'}</span>,
        },
        {
            header: translation('key_reported_by'),
            sortKey: 'interview_report_marked_name',
            render: (row) => {
                if (row?.interview_report_marked_by_system) {
                    return translation('key_interview_marked_by_system');
                }
                return row?.interview_report_marked_name;
            },
        },
        {
            header: translation('key_reported_time'),
            sortKey: 'interview_report_marked_at',
            render: (row) => {
                return row?.interview_report_marked_at 
                    ? dayjs(row.interview_report_marked_at).format('DD MMM YYYY, hh:mm A') 
                    : '-';
            },
        },
    ];

    return allColumns;
};