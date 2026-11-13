import React from 'react';

import translation from '../../../../utils/translation';
import dayjs from 'dayjs';
import configData from '../../../../components/ReusableComponents/app-configs';

export const InsuranceReportTableColumns = () => {

    const allColumns = [
        {
            header: translation('key_insurance_id'),
            sortKey: 'insurance_number',
            leftAlign: true,
            render: (row) => <span>{row?.insurance_number || '-'}</span>,
        },
        {
            header: translation('key_policy_name'),
            sortKey: 'policy_name',
            render: (row) => <span>{row?.policy_name || '-'}</span>,
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
            header: translation('key_worker') + ' ' + translation('key_id'),
            sortKey: 'worker_reference_id',
            render: (row) => <span>{row?.worker_reference_id || '-'}</span>,
        },
        {
            header: translation('key_worker'),
            sortKey: 'worker_name',
            render: (row) => <span>{row?.worker_name || '-'}</span>, 
        },
        {
            header: translation('key_branch'),
            sortKey: 'branch_name',
            render: (row) => <span>{row?.branch_name || '-'}</span>,
        },
        {
            header: translation('key_cs') + ' ' + translation('key_owner'),
            sortKey: 'cs_name',
            render: (row) => <span>{row?.cs_name || '-'}</span>, 
        },
        {
            // the applicable period's kind: New policy / Renewal / Legacy - to review (PROMPT 8 row 5, Q8-1 (a))
            header: translation('key_type'),
            sortKey: 'type',
            render: (row) => <span>{configData.insuranceReportTypeLabel(row?.type) || '-'}</span>,
        },
        {
            header: translation('key_policy_no'),
            sortKey: 'policy_number',
            render: (row) => <span>{row?.policy_number || '-'}</span>,
        },
        {
            header: translation('key_previous_policy_number'),
            sortKey: 'previous_policy_number',
            render: (row) => <span>{row?.previous_policy_number || '-'}</span>,
        },
        {
            header: translation('key_effective_date'),
            sortKey: 'effective_date',
            render: (row) => {
                return row?.effective_date
                    ? dayjs(row.effective_date).format('DD MMM YYYY')
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
            // Coverage as Insurance shows it (Active / Starts later / No active policy; conflicts sheet U-0089)
            header: translation('key_ins_coverage'),
            sortKey: 'cov_label',
            render: (row) => <span>{row?.cov_label ? translation(`key_ins_coverage_${row.cov_label}`) : '-'}</span>,
        },
        {
            header: translation('key_invoice'),
            sortKey: 'invoice_number',
            render: (row) => <span>{row?.invoice_number || '-'}</span>,
        },
        {
            header: translation('key_additional_coverage'),
            sortKey: 'additional_coverage',
            render: (row) => <span>{row?.coverage_details?.policy_name || '-'}</span>,
        },
        {
            header: translation('key_coverage_effective_date'),
            sortKey: 'coverage_effective_date',
            render: (row) => {
                return (row?.coverage_details && row.coverage_details?.effective_date)
                    ? dayjs(row.coverage_details?.effective_date).format('DD MMM YYYY')
                    : '-';
            },
        },
        {
            header: translation('key_coverage_expiry_date'),
            sortKey: 'coverage_expiry_date',
            render: (row) => {
                return (row?.coverage_details && row.coverage_details?.expiry_date)
                    ? dayjs(row.coverage_details?.expiry_date).format('DD MMM YYYY')
                    : '-';
            },
        },
        {
            header: translation('key_coverage_invoice'),
            sortKey: 'coverage_invoice',
            render: (row) => <span>{row?.coverage_details?.invoice_number || '-'}</span>,
        },
    ];

    return allColumns;
};