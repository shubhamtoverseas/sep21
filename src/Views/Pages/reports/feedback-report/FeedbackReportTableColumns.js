import React from 'react';
import dayjs from 'dayjs';

import translation from '../../../../utils/translation';
import { formatFeedbackType } from '../../../../services/commonService';
import { ReportClamp } from '../ReportShell';

export const FeedbackReportTableColumns = () => {
    const allColumns = [
        {
            header: translation('key_timestamp'),
            sortKey: 'created_at',
            leftAlign: true,
            render: (row) => {
               return row.created_at ? dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss') : '-';
            },
        },
        {
            header: translation('key_rating'),
            sortKey: 'rating',
            render: (row) => <span>{row?.rating || '-'}</span>,
        },
        {
            header: translation('key_feedback_for'),
            sortKey: 'feedback_type',
            render: (row) => <span>{row?.feedback_type ? translation(formatFeedbackType(row?.feedback_type)?.translationKey) : '-'}</span>,
        },
        {
            header: translation('key_bug_reporter'),
            sortKey: 'feedback_user_name',
            render: (row) => <span>{!row?.feedback_user_name ? '-' : row?.feedback_user_name }</span>,
        },
        {
            header: translation('key_user_type'),
            sortKey: 'created_by_type',
            render: (row) => <span>{row?.created_by_type || '-'}</span>,
        },
        {
            header: translation('key_email'),
            sortKey: 'feedbackByUser.email',
            render: (row) => <span>{row?.['feedbackByUser.email'] || '-'}</span>,
        },
        {
            header: translation('key_phone'),
            sortKey: 'feedbackByUser.mobile_number',
            render: (row) => <span>{row?.['feedbackByUser.mobile_number'] || '-'}</span>,
        },
        {
            header: translation('key_feedback'),
            sortKey: 'comment',
            render: (row) => <ReportClamp title={row?.comment || ''}>{row?.comment || '-'}</ReportClamp>,
        },
    ];

    return allColumns;
};