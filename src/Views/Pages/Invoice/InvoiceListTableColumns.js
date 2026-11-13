import { getInitials } from "../../../utils/utils";
import { INVOICE_LIST_TRACKS } from './invoiceConstants';
import React, { useMemo } from 'react';
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import dayjs from 'dayjs';
import configData from '../../../components/ReusableComponents/app-configs';
import Icon from '../../../components/Icon/Icon';
import InvoiceStatusTag from '../../../components/Invoice/InvoiceStatusTag';
import styles from './InvoiceList.module.css';

import { paymentMethodLabel } from "./payment-method-selector/paymentMethodCatalogue";
import { balanceDueOf } from "./invoiceBalance";
/* HK$ money formatting — matches the new-UI reference (invoice.html):
   mono tabular numerals, negatives in parentheses, dashes for empty. */
const fmtHK = (n) => {
  const num = Number(n);
  const s = 'HK$' + Math.abs(Math.round(num)).toLocaleString();
  return num < 0 ? `(${ s })` : s;
};

const isEmptyAmt = (v) => v == null || v === '' || Number(v) === 0;

/* renderAmt — void rows read HK$0 muted; zero reads HK$0 muted; negative red. */
const renderAmt = (value, row) => {
  if (row.status === 6) return <span className={ `${ styles.amt } ${ styles.amtDash }` }>{ fmtHK(0) }</span>;
  if (value == null || value === '') return <span className={ `${ styles.amt } ${ styles.amtDash }` }>—</span>;
  const num = Number(value);
  if (num === 0) return <span className={ `${ styles.amt } ${ styles.amtDash }` }>{ fmtHK(0) }</span>;
  if (num < 0) return <span className={ `${ styles.amt } ${ styles.amtNeg }` }>{ fmtHK(num) }</span>;
  return <span className={ styles.amt }>{ fmtHK(num) }</span>;
};

const dashAmt = <span className={ `${ styles.amt } ${ styles.amtDash }` }>—</span>;

/* Staff avatar initials (one neutral avatar for everyone, reference .mc-avatar) */
const initialsOf = getInitials;
/* Owner names abbreviate to "First S." (reference abbrevOwner); a surname not in Latin letters stays whole */
const abbrevOwner = (full) => {
  const parts = String(full).split(/[ ]+/).filter(Boolean);
  if (parts.length < 2) return full;
  const surname = parts[parts.length - 1];
  if (!/^[A-Za-z]/.test(surname)) return full;
  return `${ parts[0] } ${ surname[0].toUpperCase() }.`;
};

/* Relative time for Last Activity (reference fmtRelative). */
const fmtRelative = (iso) => {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return Math.round(diff) + 's ago';
  if (diff < 3600) return Math.round(diff / 60) + 'm ago';
  if (diff < 86400) return Math.round(diff / 3600) + 'h ago';
  if (diff < 30 * 86400) return Math.round(diff / 86400) + 'd ago';
  return Math.round(diff / 86400 / 30) + 'mo ago';
};

const buildInvoiceListColumns = (fieldsToShow, t, navigate) => {
    const allColumns = [
        {
            header: t('key_type'),
            columnKey: 'key_type',
            sortKey: 'invoice_type',
            leftAlign: true,
            trackRole: INVOICE_LIST_TRACKS.type.role,
            trackWidth: INVOICE_LIST_TRACKS.type.width,
            /* Design-system: Type is plain text, never a coloured chip. */
            render: (row) => <span className={ styles.typeCell }>{ configData.invoiceTypeLabel(row.invoice_type, row.payment_type) || '' }</span>,
        },
        {
            header: t('key_invoice_status'),
            columnKey: 'key_invoice_status',
            sortKey: 'invoice_status',
            leftAlign: true,
            trackRole: INVOICE_LIST_TRACKS.status.role,
            trackWidth: INVOICE_LIST_TRACKS.status.width,
            /* MaidMatch status gallery tag — tone chip with dot; solid for Unsettled / Bad Debt. */
            render: (row) => <InvoiceStatusTag status={ row.status } />,
        },
        {
            header: t('key_payment'),
            columnKey: 'key_payment',
            sortKey: 'payment',
            leftAlign: true,
            trackRole: INVOICE_LIST_TRACKS.payment.role,
            trackWidth: INVOICE_LIST_TRACKS.payment.width,
            render: (row) => {
                const label = paymentMethodLabel(row?.payment_method);
                if (!label) return <span className={ styles.mutedDash }>—</span>;
                /* Confirmed tick — Paid / approved states only (reference: no tick on Pending Paid). */
                const confirmed = [1, 9, 11].includes(row?.status)
                    || ((row?.payment_method === 'cheque' || row?.payment_method === 'cash' || row?.payment_method === 'bank_in' || row?.payment_method === 'bank_transfer') && row?.payment_attachment_uploaded === "yes");
                const review = row?.status === 2 ? t('key_payment_review_pending') : confirmed ? t('key_payment_confirmed') : undefined;
                return (
                    <span className={ styles.paymentCell } title={ review }>
                        <span>{ label }</span>
                        { confirmed && <span className={ styles.paymentTick } aria-label="Payment confirmed"><Icon name="check" size={11} strokeWidth={2.4} /></span> }
                    </span>
                );
            },
        },
        {
            header: t('key_date'),
            columnKey: 'key_date',
            sortKey: 'date',
            leftAlign: true,
            trackRole: INVOICE_LIST_TRACKS.date.role,
            trackWidth: INVOICE_LIST_TRACKS.date.width,
            render: (row) => row?.invoices_date
                ? <span className={ styles.dateCell }>{ dayjs(row.invoices_date).format('DD/MM/YYYY') }</span>
                : <span className={ styles.mutedDash }>—</span>,
        },
        {
            /* Invoice Ref — plain mono text, not a link (row click opens detail). */
            header: t('key_ref_no'),
            columnKey: 'key_ref_no',
            sortKey: 'refNo',
            leftAlign: true,
            trackRole: INVOICE_LIST_TRACKS.ref.role,
            trackWidth: INVOICE_LIST_TRACKS.ref.width,
            render: (row) => <span className={styles.refCell}>{ row?.invoice_number }</span>,
        },
        {
            header: t('key_employer_name'),
            columnKey: 'key_employer_name',
            sortKey: 'employerName',
            leftAlign: true,
            trackRole: INVOICE_LIST_TRACKS.name.role,
            trackWidth: INVOICE_LIST_TRACKS.name.width,
            render: (row) => row?.employer_name
                ? <span className={ styles.employerCell }>{ row.employer_name }{ row?.chinese_name && <span className={ styles.zhSub }> · { row.chinese_name }</span> }</span>
                : <span className={ styles.mutedDash }>—</span>,
        },
        {
            /* Employer Code — a link to Employer Details only when the Invoice API says it opens (sheet row 8) */
            header: t('key_employer_code'),
            columnKey: 'key_employer_code',
            leftAlign: true,
            trackRole: INVOICE_LIST_TRACKS.code.role,
            trackWidth: INVOICE_LIST_TRACKS.code.width,
            render: (row) => {
                const code = row?.employer_reference_id || row?.employer_code;
                if (!code) return <span className={ styles.mutedDash }>—</span>;
                return row?.links?.employer?.can_open
                    ? <span className={ styles.codeLink } role="link" tabIndex={ 0 } title={ `${ t('key_open') } ${ t('key_employer_details') } — ${ code }` }
                        onClick={ (e) => { e.stopPropagation(); navigate(`/employers/details/${ row.employer_id }`); } }
                        onKeyDown={ (e) => { if (e.key === 'Enter') { e.stopPropagation(); navigate(`/employers/details/${ row.employer_id }`); } } }>{ code }</span>
                    : <span className={ styles.codeNeutral }>{ code }</span>;
            },
        },
        {
            header: t('key_worker_name'),
            columnKey: 'key_worker_name',
            sortKey: 'workerName',
            leftAlign: true,
            trackRole: INVOICE_LIST_TRACKS.name.role,
            trackWidth: INVOICE_LIST_TRACKS.name.width,
            render: (row) => row?.worker_name
                ? <span className={ styles.entityCell }>{ row.worker_name }</span>
                : <span className={ styles.mutedDash }>—</span>,
        },
        {
            /* Worker Code — a link to Worker Details only when the Invoice API says it opens (a profile exists and this
               user may open it; sheet row 8); otherwise plain text. */
            header: t('key_worker_code'),
            columnKey: 'key_worker_code',
            leftAlign: true,
            trackRole: INVOICE_LIST_TRACKS.code.role,
            trackWidth: INVOICE_LIST_TRACKS.code.width,
            render: (row) => {
                const code = row?.worker_reference_id;
                if (!code) return <span className={ styles.mutedDash }>—</span>;
                return row?.links?.worker?.can_open
                    ? <span className={ styles.codeLink } role="link" tabIndex={ 0 } title={ `${ t('key_open') } ${ t('key_worker_details') } — ${ code }` }
                        onClick={ (e) => { e.stopPropagation(); navigate(`/workers/details/${ row.worker_id }`); } }
                        onKeyDown={ (e) => { if (e.key === 'Enter') { e.stopPropagation(); navigate(`/workers/details/${ row.worker_id }`); } } }>{ code }</span>
                    : <span className={ styles.codeNeutral }>{ code }</span>;
            },
        },
        {
            header: t('key_total'),
            columnKey: 'key_total',
            sortKey: 'final_amount',
            rightAlign: true,
            trackRole: INVOICE_LIST_TRACKS.amount.role,
            trackWidth: INVOICE_LIST_TRACKS.amount.width,
            /* Zero-net model: Exchange invoices always present HK$0 (green). */
            render: (row) => (row.status === 10 || row.status === 11)
                ? <span className={ `${ styles.amt } ${ styles.amtSuccess }` }>{ fmtHK(0) }</span>
                : renderAmt(row?.final_amount, row),
        },
        {
            header: t('key_paid'),
            columnKey: 'key_paid',
            sortKey: 'paid_amount',
            rightAlign: true,
            trackRole: INVOICE_LIST_TRACKS.amount.role,
            trackWidth: INVOICE_LIST_TRACKS.amount.width,
            render: (row) => (row.status === 11) ? renderAmt(0, row) : renderAmt(row?.paid_amount, row),
        },
        {
            /* Balance Due — the read model's balance_due (QA-27-040) */
            header: t('key_balance_due'),
            columnKey: 'key_balance_due',
            sortKey: 'balance_due',
            rightAlign: true,
            trackRole: INVOICE_LIST_TRACKS.amount.role,
            trackWidth: INVOICE_LIST_TRACKS.amount.width,
            render: (row) => {
                const v = balanceDueOf(row);
                if (row.status === 6 || row.status === 10 || row.status === 11 || isEmptyAmt(v)) return dashAmt;
                return <span className={ `${ styles.amt } ${ styles.amtWarn }` }>{ fmtHK(v) }</span>;
            },
        },
        {
            header: t('key_refunded'),
            columnKey: 'key_refunded',
            sortKey: 'refund_amount',
            rightAlign: true,
            trackRole: INVOICE_LIST_TRACKS.amount.role,
            trackWidth: INVOICE_LIST_TRACKS.amount.width,
            render: (row) => (row.status !== 6 && row.status !== 11 && !isEmptyAmt(row?.refund_amount))
                ? <span className={ `${ styles.amt } ${ styles.amtNeg }` }>({ fmtHK(Math.abs(Number(row.refund_amount))) })</span>
                : dashAmt,
        },
        {
            header: t('key_unsettled'),
            columnKey: 'key_unsettled',
            sortKey: 'unsettled_amount',
            rightAlign: true,
            trackRole: INVOICE_LIST_TRACKS.amount.role,
            trackWidth: INVOICE_LIST_TRACKS.amount.width,
            render: (row) => (row.status !== 6 && row.status !== 11 && !isEmptyAmt(row?.unsettled_amount))
                ? <span className={ `${ styles.amt } ${ styles.amtNeg }` }>{ fmtHK(Math.abs(Number(row.unsettled_amount))) }</span>
                : dashAmt,
        },
        {
            header: t('key_bad_debt'),
            columnKey: 'key_bad_debt',
            sortKey: 'bad_debt_amount',
            rightAlign: true,
            trackRole: INVOICE_LIST_TRACKS.amount.role,
            trackWidth: INVOICE_LIST_TRACKS.amount.width,
            render: (row) => (row.status !== 6 && row.status !== 11 && !isEmptyAmt(row?.bad_debt_amount))
                ? <span className={ `${ styles.amt } ${ styles.amtNeg }` }>{ fmtHK(Math.abs(Number(row.bad_debt_amount))) }</span>
                : dashAmt,
        },
        {
            header: t('key_adjusted_amount'),
            columnKey: 'key_adjusted_amount',
            sortKey: 'adjusted_amount',
            rightAlign: true,
            trackRole: INVOICE_LIST_TRACKS.amount.role,
            trackWidth: INVOICE_LIST_TRACKS.amount.width,
            render: (row) => {
                const v = Number(row?.adjusted_amount);
                if (row.status === 6 || row.status === 11 || isEmptyAmt(row?.adjusted_amount)) return dashAmt;
                return v > 0
                    ? <span className={ `${ styles.amt } ${ styles.amtAdjPos }` }>+{ fmtHK(v) }</span>
                    : <span className={ `${ styles.amt } ${ styles.amtAdjNeg }` }>{ fmtHK(v) }</span>;
            },
        },
        {
            header: t('key_staff'),
            columnKey: 'key_staff',
            sortKey: 'staff',
            leftAlign: true,
            trackRole: INVOICE_LIST_TRACKS.staff.role,
            trackWidth: INVOICE_LIST_TRACKS.staff.width,
            render: (row) => row?.staff_name
                ? (
                    <span className={ styles.staffCell }>
                        <span className={ styles.csAvatar }>{ initialsOf(row.staff_name) }</span>
                        <span className={ styles.staffName } title={ row.staff_name }>{ abbrevOwner(row.staff_name) }</span>
                    </span>
                )
                : <span className={ styles.mutedDash }>—</span>,
        },
        {
            header: t('key_branch'),
            columnKey: 'key_branch',
            sortKey: 'branch',
            leftAlign: true,
            trackRole: INVOICE_LIST_TRACKS.branch.role,
            trackWidth: INVOICE_LIST_TRACKS.branch.width,
            render: (row) => row?.branch_name
                ? row.branch_name
                : <span className={ styles.mutedDash }>—</span>,
        },
        {
            header: t('key_last_activity'),
            columnKey: 'key_last_activity',
            sortKey: 'last_activity',
            leftAlign: true,
            trackRole: INVOICE_LIST_TRACKS.activity.role,
            trackWidth: INVOICE_LIST_TRACKS.activity.width,
            render: (row) => {
                const ts = row?.last_activity || row?.updated_at;
                return ts
                    ? <span className={ styles.lastActivity }>{ fmtRelative(ts) }</span>
                    : <span className={ styles.mutedDash }>—</span>;
            },
        },
    ];

    return allColumns?.filter(column => fieldsToShow?.includes(column.columnKey));
};

/* The list's columns, built once per language and field set (the memoised table keeps them across renders) */
export const InvoiceListTableColumns = (fieldsToShow) => {
    const { t } = useTranslation(); // Access translations
    const navigate = useNavigate();
    return useMemo(() => buildInvoiceListColumns(fieldsToShow, t, navigate), [fieldsToShow, t, navigate]);
};
