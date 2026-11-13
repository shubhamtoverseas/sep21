import React from 'react';

import translation from '../../../../utils/translation';
import JoStatusTag from '../../JobOfferPage/newui/JoStatusTag';
import dayjs from 'dayjs';
import { ReportClamp } from '../ReportShell';

export const JobOfferReportTableColumns = () => {

    const allColumns = [
        {
            header: translation('key_job_id'),
            sortKey: 'job_offer_reference_id',
            leftAlign: true,
            render: (row) => <span>{row?.job_offer_reference_id || '-'}</span>,
        },
        {
            header: translation('key_employer') + ' ' + translation('key_id'),
            sortKey: 'employer_reference_id',
            render: (row) => <span>{row?.employer_reference_id || '-'}</span>,
        },
        {
            header: translation('key_employer'),
            sortKey: 'employer_name',
            render: (row) => <span>{row?.employer_name || '-'}</span>,
        },
        {
            header: translation('key_cs'),
            sortKey: 'cs_name',
            render: (row) => <span>{row?.cs_name || '-'}</span>,
        },
        {
            header: translation('key_job') + ' ' + translation('key_title'),
            sortKey: 'head_line',
            render: (row) => <ReportClamp title={row?.head_line || ''}>{row?.head_line || ''}</ReportClamp>,
        },
        {
            header: translation('key_job') + ' ' + translation('key_role'),
            sortKey: 'role_name',
            render: (row) => <span>{row?.role_name || '-'}</span>,
        },
        {
            header: translation('key_branch_name'),
            sortKey: 'branch_display_name',
            render: (row) => <span>{row?.branch_display_name || '-'}</span>,
        },
        {
            header: translation('key_created_on'),
            sortKey: 'created_at',
            render: (row) => {
                return row?.created_at
                    ? dayjs(row.created_at).format('DD MMM YYYY, hh:mm A')
                    : '-';
            },
        },
        {
            header: translation('key_created_by'),
            sortKey: 'created_by_name',
            render: (row) => <span>{row?.created_by_name || '-'}</span>,
        },
        {
            header: translation('key_expected_start_date'),
            sortKey: 'start_date',
            render: (row) => {
                return row?.start_date
                    ? dayjs(row.start_date).format('DD MMM YYYY')
                    : '-';
            },
        },
        {
            header: translation('key_approved') + ' ' + translation('key_on'),
            sortKey: 'opening_date_time',
            render: (row) => {
                return row?.opening_date_time
                    ? dayjs(row.opening_date_time).format('DD MMM YYYY, hh:mm A')
                    : '-';
            },
        },
        {
            header: translation('key_expiry_date'),
            sortKey: 'expiry_date',
            render: (row) => {
                return row?.expiry_date
                    ? dayjs(row.expiry_date).format('DD MMM YYYY')
                    : '-';
            },
        },
        {
            header: translation('key_closed') + ' ' + translation('key_on'),
            sortKey: 'closing_date_time',
            render: (row) => {
                return row?.closing_date_time
                    ? dayjs(row.closing_date_time).format('DD MMM YYYY, hh:mm A')
                    : '-';
            },
        },
        {
            header: translation('key_current') + ' ' + translation('key_status'),
            sortKey: 'status',
            width: '179px',
            render: (row) => (row?.status ? <JoStatusTag status={ row.status } /> : '-')
        },
        {
            header: translation('key_workers') + ' ' + translation('key_interacted'),
            sortKey: 'views_count',
            render: (row) => <span>{row?.views_count || '0'}</span>,
        },
        {
            header: translation('key_suggested'),
            sortKey: 'suggested_count',
            render: (row) => <span>{row?.suggested_count || '0'}</span>,
        },
        {
            header: translation('key_viewed'),
            sortKey: 'views_count',
            render: (row) => <span>{row?.views_count || '0'}</span>,
        },
        {
            header: translation('key_applied'),
            sortKey: 'applied_count',
            render: (row) => <span>{row?.applied_count || '0'}</span>,
        },
        {
            header: translation('key_apply_percentage'),
            sortKey: 'apply_percentage',
            render: (row) => <span>{row?.apply_percentage ? `${row.apply_percentage}%` : '0%'}</span>,
        },
        {
            header: translation('key_matched'),
            sortKey: 'matched_count',
            render: (row) => <span>{row?.matched_count || '0'}</span>,
        },
        {
            header: translation('key_interview') + ' ' + translation('key_invited'),
            sortKey: 'pending_interview_count',
            render: (row) => <span>{row?.pending_interview_count || '0'}</span>,
        },
        {
            header: translation('key_interview') + ' ' + translation('key_scheduled'),
            sortKey: 'upcoming_interview_count',
            render: (row) => <span>{row?.upcoming_interview_count || '0'}</span>,
        },
        {
            header: translation('key_interview_completed'),
            sortKey: 'completed_interview_count',
            render: (row) => <span>{row?.completed_interview_count || '0'}</span>,
        },
        {
            header: translation('key_interview_cancelled'),
            sortKey: 'cancelled_interview_count',
            render: (row) => <span>{row?.cancelled_interview_count || '0'}</span>,
        },
        {
            header: translation('key_qr_interviews'),
            sortKey: 'qr_interview_count',
            render: (row) => <span>{row?.qr_interview_count || '0'}</span>,
        },
        {
            header: translation('key_instant_interviews'),
            sortKey: 'instant_interview_count',
            render: (row) => <span>{row?.instant_interview_count || '0'}</span>,
        },
        {
            header: translation('key_offer_extended'),
            sortKey: 'offer_extended_count',
            render: (row) => <span>{row?.offer_extended_count || '0'}</span>,
        },
    ];

    return allColumns;
};