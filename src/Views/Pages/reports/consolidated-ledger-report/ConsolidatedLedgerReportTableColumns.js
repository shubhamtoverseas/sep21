import React from 'react';
import translation from '../../../../utils/translation';
import dayjs from 'dayjs';

export const ConsolidatedLedgerReportTableColumns = () => {

    const allColumns = [
        {
            header: translation('key_timestamp'),
            sortKey: 'timestamp',
            leftAlign: true,
            render: (row) => (
                <span>{row?.timestamp ? dayjs(row.timestamp).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
            ),
        },
        {
            header: translation('key_ledger') + ' ' + translation('key_id'),
            sortKey: 'ledger_id',
            render: (row) => <span>{row?.ledger_id || '-'}</span>,
        },
        {
            header: translation('key_invoice') + ' ' + translation('key_id'),
            sortKey: 'invoice_id',
            render: (row) => <span>{row?.invoice_id || '-'}</span>,
        },
        {
            header: translation('key_action'),
            sortKey: 'action',
            render: (row) => <span>{row?.action || '-'}</span>,
        },
        {
            header: translation('key_total'),
            sortKey: 'total',
            render: (row) => <span>{row?.total ?? '-'}</span>,
        },
        {
            header: translation('key_paid'),
            sortKey: 'paid',
            render: (row) => <span>{row?.paid ?? '-'}</span>,
        },
        {
            header: translation('key_unsettled'),
            sortKey: 'unsettled',
            render: (row) => <span>{row?.unsettled ?? '-'}</span>,
        },
        {
            header: translation('key_bad_debt'),
            sortKey: 'bad_debt',
            render: (row) => <span>{row?.bad_debt ?? '-'}</span>,
        },
        {
            header: '+ ' + translation('key_adjustment'),
            sortKey: 'adjustment_plus',
            render: (row) => <span>{row?.adjustment_plus ?? '-'}</span>,
        },
        {
            header: '- ' + translation('key_adjustment'),
            sortKey: 'adjustment_minus',
            render: (row) => <span>{row?.adjustment_minus ?? '-'}</span>,
        },
        {
            header: translation('key_refund'),
            sortKey: 'refund',
            render: (row) => <span>{row?.refund ?? '-'}</span>,
        },
        {
            header: translation('key_write_off'),
            sortKey: 'write_off',
            render: (row) => <span>{row?.write_off ?? '-'}</span>,
        },
        {
            header: translation('key_payment_method'),
            sortKey: 'payment_method',
            render: (row) => <span>{row?.payment_method || '-'}</span>,
        },
        {
            header: translation('key_employer'),
            sortKey: 'employer_name',
            render: (row) => <span className="d-inline-block">{row?.employer_name || '-'}</span>,
        },
        {
            header: translation('key_worker'),
            sortKey: 'worker_name',
            render: (row) => <span className="d-inline-block">{row?.worker_name || '-'}</span>,
        },
        {
            header: translation('key_branch'),
            sortKey: 'branch_name',
            render: (row) => <span>{row?.branch_name || '-'}</span>,
        },
        {
            header: translation('key_invoice') + ' ' + translation('key_cs'),
            sortKey: 'invoice_cs',
            render: (row) => <span>{row?.invoice_cs || '-'}</span>,
        },
    ];

    return allColumns;
};

