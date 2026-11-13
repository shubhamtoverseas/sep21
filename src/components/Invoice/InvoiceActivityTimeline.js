import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import Icon from "../Icon/Icon";
import constData from "../ReusableComponents/constants";
import { fetchInvoiceActivityLogList } from "../../redux/Slices/invoices/InvoicesSlice";
import InvoiceFeedError from "./InvoiceFeedError";
import CustomSpinner from "../ReusableComponents/CustomSpinner";

const LIMIT = constData.INVOICE_LOG_LIMIT;
const FIRST_PAGE = constData.INVOICE_LOG_FIRST_PAGE;

const fmtDT = (d) => (d ? dayjs(d).format("DD MMM YYYY HH:mm") : "—");
const activityVisual = (text) =>
    constData.ACTIVITY_VISUALS.find((v) => v.test.test(text || "")) || { intent: "info", icon: "info" };

/**
 * Activity Timeline tab — non-financial event log for an invoice.
 * Reads the activity list from redux (fetched on page load by the parent for the
 * tab badge count) and owns its own "load more" pagination.
 */
const InvoiceActivityTimeline = ({ invoiceId }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const invoiceActivityLogList = useSelector(
        (state) => state.invoices.invoiceActivityLogList
    );
    const invoiceActivityLogHasMore = useSelector(
        (state) => state.invoices.invoiceActivityLogHasMore
    );
    const invoiceActivityLogStatus = useSelector(
        (state) => state.invoices.invoiceActivityLogStatus
    );

    const [activityPage, setActivityPage] = useState(FIRST_PAGE);
    const [activityLoadingMore, setActivityLoadingMore] = useState(false);

    const handleLoadMoreActivity = useCallback(() => {
        if (activityLoadingMore || !invoiceActivityLogHasMore) return;
        const nextPage = activityPage + 1;
        setActivityLoadingMore(true);
        setActivityPage(nextPage);
        dispatch(
            fetchInvoiceActivityLogList({ invoice_id: invoiceId, limit: LIMIT, page: nextPage })
        ).finally(() => setActivityLoadingMore(false));
    }, [dispatch, invoiceId, activityPage, activityLoadingMore, invoiceActivityLogHasMore]);

    const handleRetry = useCallback(() => {
        setActivityPage(FIRST_PAGE);
        dispatch(fetchInvoiceActivityLogList({ invoice_id: invoiceId, limit: LIMIT, page: FIRST_PAGE }));
    }, [dispatch, invoiceId]);

    return (
        <div className="detail-section">
            <div className="head">
                <h2>{ t('key_activity_timeline') || 'Activity Timeline' }</h2>
                <span className="helper">{ t('key_activity_timeline_helper') || 'Non-financial events · status changes · context lifecycle. Distinct from Payment Records / Financial Audit History.' }</span>
            </div>
            <div className="body">
                { invoiceActivityLogStatus === 'error'
                    ? <InvoiceFeedError onRetry={ handleRetry } />
                    : invoiceActivityLogStatus === 'loading'
                    ? <CustomSpinner />
                    : (!invoiceActivityLogList || invoiceActivityLogList.length === 0)
                    ? <div className="remark-empty">{ t('key_no_activity_recorded_yet') || 'No activity recorded yet.' }</div>
                    : <>
                        <div className="audit-list">
                            { invoiceActivityLogList.map((e, i) => {
                                const c = activityVisual(e.title || e.message);
                                return (
                                    <div className={ 'audit-item ' + c.intent } key={ e.id || i }>
                                        <div className="glyph"><Icon name={ c.icon } size={ 11 } /></div>
                                        <div className="body">
                                            <div className="title" style={ { textTransform: 'capitalize' } }>{ e?.title || (t('key_activity')) }</div>
                                            <div className="note">{ e.message }</div>
                                            <div className="meta">{ fmtDT(e.created_at) } · { e.log_created_by || e.created_by || 'system' }</div>
                                        </div>
                                        <div className="amt dash">—</div>
                                    </div>
                                );
                            }) }
                            <div className="audit-note">
                                { t('key_activity_timeline_note') || 'Activity Timeline is intentionally separate from Payment Records / Financial Audit History. Financial events live on the Payment Records tab; this view shows context, status and ownership lifecycle only.' }
                            </div>
                        </div>
                        { invoiceActivityLogHasMore && (
                            <div className="audit-more">
                                <button type="button" className="audit-more-btn" onClick={ handleLoadMoreActivity } disabled={ activityLoadingMore }>
                                    { activityLoadingMore ? <CustomSpinner variant="inline" /> : (t('key_load_more') || 'Load more') }
                                    { !activityLoadingMore && <Icon name="chev_down" size={ 14 } /> }
                                </button>
                            </div>
                        ) }
                    </>
                }
            </div>
        </div>
    );
};

InvoiceActivityTimeline.propTypes = {
    invoiceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default InvoiceActivityTimeline;
