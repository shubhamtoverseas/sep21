import React from 'react';

import translation from '../../../../utils/translation';
import { ReportStatusChip } from '../ReportShell';
import { CONTRACT_REPORT_STATUS_VARIANT, REPORT_CHIP_DEFAULT_VARIANT } from '../reportConstants';
import dayjs from 'dayjs';

export const ContractReportTableColumns = () => {

    const allColumns = [
        {
            header: translation('key_contract_ref'),
            sortKey: 'contract_number',
            leftAlign: true,
            render: (row) => <span>{row?.contract_number || '-'}</span>,
        },
        {
            header: translation('key_invoice_ref_no'),
            sortKey: 'invoice_reference',
            render: (row) => <span>{row['contractInvoiceModel.invoice_number'] || '-'}</span>,
        },
        {
            header: translation('key_employer') + ' ' + translation('key_id'),
            sortKey: 'employer_reference_id',
            render: (row) => <span>{row?.employer_reference_id || '-'}</span>,
        },
        {
            header: translation('key_employer'),
            sortKey: 'employer_name',
            render: (row) => <span className="d-inline-block">{row?.employer_name || '-'}</span>
        },
        {
            header: translation('key_worker') + ' ' + translation('key_id'),
            sortKey: 'worker_reference_id',
            render: (row) => <span>{row?.worker_reference_id || '-'}</span>,
        },
        {
            header: translation('key_worker'),
            sortKey: 'worker_name',
            render: (row) => <span className="d-inline-block">{row?.worker_name || '-'}</span>
        },
        {
            header: translation('key_branch'),
            sortKey: 'branch_name',
            render: (row) => <span>{row?.branch_name || '-'}</span>,
        },
        {
            header: translation('key_cs'),
            sortKey: 'cs_name',
            render: (row) => <span>{row?.cs_name || '-'}</span>,
        },
        {
            header: translation('key_type_internal'),
            sortKey: 'contract_type',
            render: (row) => <span>{row?.contract_type || '-'}</span>,
        },
        {
            header: translation('key_contract_category'),
            sortKey: 'contract_category_name',
            render: (row) => <span>{row?.contract_category_name || '-'}</span>,
        },
        {
            header: translation('key_nationality'),
            sortKey: 'worker_nationality_name',
            render: (row) => <span>{row?.worker_nationality_name || '-'}</span>,
        },
        {
            header: translation('key_contract_date'),
            sortKey: 'contract_date',
            render: (row) => {
                return row?.created_at
                    ? dayjs(row.created_at).format('DD MMM YYYY')
                    : '-';
            },
        },
        {
            header: translation('key_visa_expiry'),
            sortKey: 'visa_expiry_date',
            render: (row) => {
                return row['processingVisaDocumentModel.visa_expiry_date']
                    ? dayjs(row['processingVisaDocumentModel.visa_expiry_date']).format('DD MMM YYYY')
                    : '-';
            },
        },
        {
            header: translation('key_group'),
            sortKey: 'group',
            render: (row) => <span>{row?.group || '-'}</span>,
        },
        {
            header: translation('key_status'),
            sortKey: 'status',
            width: '140px',
            render: (row) => {
                const key = String(row.contract_status_name || '').toLowerCase();
                return <ReportStatusChip variant={CONTRACT_REPORT_STATUS_VARIANT[key] || REPORT_CHIP_DEFAULT_VARIANT}>{row.contract_status_name}</ReportStatusChip>;
            }
        },
    ];

    return allColumns;
};