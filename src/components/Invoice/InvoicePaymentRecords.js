import React, { useCallback, useMemo, useState } from "react";
import { formatHKMinus } from "../../utils/utils";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import Icon from "../Icon/Icon";
import constData from "../ReusableComponents/constants";
import { paymentLogRecordType } from "../../utils/utils";
import { fetchInvoicePaymentLogList } from "../../redux/Slices/invoices/InvoicesSlice";
import InvoiceFeedError from "./InvoiceFeedError";
import CustomSpinner from "../ReusableComponents/CustomSpinner";

const LIMIT = constData.INVOICE_LOG_LIMIT;
const FIRST_PAGE = constData.INVOICE_LOG_FIRST_PAGE;

const fmtDT = (d) => (d ? dayjs(d).format("DD MMM YYYY HH:mm") : "—");

/* HK$ formatter — matches the new-UI design bundle. */
/**
 * Payment Records / Financial Audit History tab — append-only financial event
 * log for an invoice. Reads the payment log from redux (fetched on page load by
 * the parent for the tab badge count) and owns its own "load more" pagination.
 */
const InvoicePaymentRecords = ({ invoiceId }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const invoicePaymentLogList = useSelector(
        (state) => state.invoices.invoicePaymentLogList
    );
    const invoicePaymentLogHasMore = useSelector(
        (state) => state.invoices.invoicePaymentLogHasMore
    );
    const invoicePaymentLogStatus = useSelector(
        (state) => state.invoices.invoicePaymentLogStatus
    );

    const [paymentLogPage, setPaymentLogPage] = useState(FIRST_PAGE);
    const [paymentLogLoadingMore, setPaymentLogLoadingMore] = useState(false);

    const auditRecords = useMemo(() =>
        (invoicePaymentLogList || []).map((p) => ({
            type: p.type || paymentLogRecordType(p.title),
            title: p.title || (t('key_payment_recorded') || 'Payment recorded'),
            note: p.message || '',
            ts: p.created_at,
            who: p.log_created_by || p.created_by || 'system',
            amt: p.amount != null && p.amount !== '' ? Number(p.amount) : null,
        })),
        [invoicePaymentLogList, t]);

    const handleLoadMorePayment = useCallback(() => {
        if (paymentLogLoadingMore || !invoicePaymentLogHasMore) return;
        const nextPage = paymentLogPage + 1;
        setPaymentLogLoadingMore(true);
        setPaymentLogPage(nextPage);
        dispatch(
            fetchInvoicePaymentLogList({ invoice_id: invoiceId, limit: LIMIT, page: nextPage })
        ).finally(() => setPaymentLogLoadingMore(false));
    }, [dispatch, invoiceId, paymentLogPage, paymentLogLoadingMore, invoicePaymentLogHasMore]);

    const handleRetry = useCallback(() => {
        setPaymentLogPage(FIRST_PAGE);
        dispatch(fetchInvoicePaymentLogList({ invoice_id: invoiceId, limit: LIMIT, page: FIRST_PAGE }));
    }, [dispatch, invoiceId]);

    return (
        <div className="detail-section">
            <div className="head">
                <h2>{ t('key_payment_records_financial_audit_history') || 'Payment Records / Financial Audit History' }</h2>
                <span className="helper">{ t('key_append_only_financial_events_only') || 'Append-only · financial events only' }</span>
            </div>
            <div className="body">
                { invoicePaymentLogStatus === 'error'
                    ? <InvoiceFeedError onRetry={ handleRetry } />
                    : invoicePaymentLogStatus === 'loading'
                    ? <CustomSpinner />
                    : auditRecords.length === 0
                    ? <div className="remark-empty">{ t('key_no_payment_records_yet') || 'No payment records yet.' }</div>
                    : <>
                        <div className="audit-list">
                            { auditRecords.map((r, i) => {
                                const cfg = constData.RECORD_VISUALS[r.type] || { intent: '', icon: 'info' };
                                return (
                                    <div className={ 'audit-item ' + cfg.intent } key={ i }>
                                        <div className="glyph"><Icon name={ cfg.icon } size={ 11 } /></div>
                                        <div className="body">
                                            <div className="title">{ r.title }</div>
                                            <div className="note">{ r.note }</div>
                                            <div className="meta">{ fmtDT(r.ts) } · { r.who }</div>
                                        </div>
                                        <div className={ 'amt ' + (r.amt < 0 ? 'neg' : (!r.amt ? 'dash' : '')) }>
                                            { !r.amt ? '—' : formatHKMinus(r.amt) }
                                        </div>
                                    </div>
                                );
                            }) }
                        </div>
                        { invoicePaymentLogHasMore && (
                            <div className="audit-more">
                                <button type="button" className="audit-more-btn" onClick={ handleLoadMorePayment } disabled={ paymentLogLoadingMore }>
                                    { paymentLogLoadingMore ? <CustomSpinner variant="inline" /> : (t('key_load_more') || 'Load more') }
                                    { !paymentLogLoadingMore && <Icon name="chev_down" size={ 14 } /> }
                                </button>
                            </div>
                        ) }
                    </>
                }
            </div>
        </div>
    );
};

InvoicePaymentRecords.propTypes = {
    invoiceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default InvoicePaymentRecords;
