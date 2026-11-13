import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useSearchParams } from "react-router-dom";
import "./notifications.css";
import translation from "../../../../utils/translation";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import FilterSelect from "../../../../components/ui/FilterSelect";
import { headingCase } from "../../../../utils/utils";
import { clearReceivedNotification, fetchNotificationList } from "../../../../redux/Slices/common/CommonSlice";
import {
    NOTIFICATION_CATEGORY, NOTIFICATION_CATEGORY_ORDER, NOTIFICATION_COPY, NOTIFICATION_FILTER, NOTIFICATION_NOTICE, NOTIFICATION_PAGE_LIMIT,
    NOTIFICATION_QUERY,
} from "../notificationConstants";
import { categoryOf } from "./notificationModel";
import NotificationRow from "./NotificationRow";
import useNotificationActions from "./useNotificationActions";

/*
 * Notifications — the full view (prototype modules/notifications; NOTIFICATION-MAP; CR § Notifications): the same
 * per-user records and unread count as the bell. All / Unread, Category, Mark all read (deferred until the endpoint),
 * rows, the neutral "no longer available" notice and the connection-retry notice, URL-carried state
 * (?filter=&cat=&notice=). Every signed-in account, partners included (conflict sheet U-0017).
 */
const NotificationsPage = () => {
    const dispatch = useDispatch();
    const [searchParams, setSearchParams] = useSearchParams();
    const { notificationUnreadCount, receivedNotification } = useSelector((state) => ({
        notificationUnreadCount: state.common.notificationUnreadCount,
        receivedNotification: state.common.receivedNotification,
    }), shallowEqual);

    const filter = searchParams.get(NOTIFICATION_QUERY.FILTER) === NOTIFICATION_FILTER.UNREAD ? NOTIFICATION_FILTER.UNREAD : NOTIFICATION_FILTER.ALL;
    const category = NOTIFICATION_CATEGORY[searchParams.get(NOTIFICATION_QUERY.CATEGORY)] ? searchParams.get(NOTIFICATION_QUERY.CATEGORY) : NOTIFICATION_FILTER.ALL;
    const noticeParam = searchParams.get(NOTIFICATION_QUERY.NOTICE) || '';
    const notice = useMemo(() => {
        const m = /^(unavailable|fail):(.+)$/.exec(noticeParam);
        return m ? { kind: m[1], id: m[2] } : null;
    }, [noticeParam]);

    const setQuery = useCallback((patch) => {
        const next = new URLSearchParams(searchParams);
        Object.entries(patch).forEach(([k, v]) => { if (v === null || v === undefined || v === '' || v === NOTIFICATION_FILTER.ALL) next.delete(k); else next.set(k, v); });
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [nonce, setNonce] = useState(0);

    useEffect(() => { setRows([]); setPage(1); }, [filter]);
    useEffect(() => {
        let live = true;
        setLoading(true); setLoadError(false);
        const params = { limit: NOTIFICATION_PAGE_LIMIT, page, ...(filter === NOTIFICATION_FILTER.UNREAD ? { is_read: false } : {}) };
        dispatch(fetchNotificationList(params)).then((res) => {
            if (!live) return;
            if (res?.error) { setLoadError(true); setLoading(false); return; }
            const list = res?.payload?.data || [];
            setRows((prev) => (page === 1 ? list : [...prev, ...list.filter((n) => !prev.some((p) => p.id === n.id))]));
            setHasMore(list.length === NOTIFICATION_PAGE_LIMIT);
            setLoading(false);
        });
        return () => { live = false; };
    }, [dispatch, filter, page, nonce]);

    /* a live delivery lands on top (the socket layer stays as it is) */
    useEffect(() => {
        if (!receivedNotification?.id) return;
        setRows((prev) => (prev.some((n) => n.id === receivedNotification.id) ? prev : [receivedNotification, ...prev]));
        dispatch(clearReceivedNotification());
    }, [dispatch, receivedNotification]);

    const markReadLocal = useCallback((id, isRead = true) => setRows((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: isRead } : n))), []);
    const markAllReadLocal = useCallback(() => setRows((prev) => prev.map((n) => (n.is_read ? n : { ...n, is_read: true }))), []);
    const onUnavailable = useCallback((item) => setQuery({ [NOTIFICATION_QUERY.NOTICE]: `${ NOTIFICATION_NOTICE.UNAVAILABLE }:${ item.id }` }), [setQuery]);
    const actions = useNotificationActions({ markReadLocal, markAllReadLocal, onUnavailable });

    const visible = useMemo(() => rows.filter((n) => (filter === NOTIFICATION_FILTER.ALL || !n.is_read) && (category === NOTIFICATION_FILTER.ALL || categoryOf(n)?.id === category)), [rows, filter, category]);
    const dismiss = useCallback(() => setQuery({ [NOTIFICATION_QUERY.NOTICE]: null }), [setQuery]);
    /* the Category control is the kit filter popover the Employer / Worker toolbars use, not the browser's own select (3 Nov) */
    const categoryOptions = useMemo(() => [
        { value: NOTIFICATION_FILTER.ALL, label: translation('key_all') },
        ...NOTIFICATION_CATEGORY_ORDER.map((id) => ({ value: id, label: NOTIFICATION_CATEGORY[id].label })),
    ], []);
    const setCategory = useCallback((value) => setQuery({ [NOTIFICATION_QUERY.CATEGORY]: value }), [setQuery]);
    const retry = useCallback(() => {
        const item = rows.find((n) => String(n.id) === String(notice?.id));
        dismiss();
        if (item) actions.open(item); else setNonce((n) => n + 1);
    }, [rows, notice, dismiss, actions]);

    return (
        <div className="nf-root">
            <div className="nf-head">
                <h1>{ headingCase(translation('key_notifications')) }</h1>
                <span className="nf-unread" data-nf-unread={ notificationUnreadCount }>{ notificationUnreadCount } { NOTIFICATION_COPY.unreadN }</span>
                <div className="nf-seg" role="group" aria-label={ translation('key_notifications') }>
                    <button type="button" aria-pressed={ filter === NOTIFICATION_FILTER.ALL } onClick={ () => setQuery({ [NOTIFICATION_QUERY.FILTER]: null }) }>{ translation('key_all') }</button>
                    <button type="button" aria-pressed={ filter === NOTIFICATION_FILTER.UNREAD } onClick={ () => setQuery({ [NOTIFICATION_QUERY.FILTER]: NOTIFICATION_FILTER.UNREAD }) }>{ translation('key_unread') }</button>
                </div>
                <FilterSelect id="nf-category" className="nf-cat" label={ NOTIFICATION_COPY.category } value={ category } options={ categoryOptions } onChange={ setCategory } menuWidth={ 160 } />
                <button type="button" className="nf-markall" disabled={ !notificationUnreadCount } onClick={ () => actions.markAllRead().then((ok) => { if (ok) ShowToast('success', NOTIFICATION_COPY.markAllDone); }) }>{ NOTIFICATION_COPY.markAllRead }</button>
            </div>

            { notice && (
                <div className="nf-notice" role="status" data-nf-notice={ notice.kind }>
                    <div className="nf-notice-body">
                        <div className="t">{ notice.kind === NOTIFICATION_NOTICE.FAIL ? NOTIFICATION_COPY.failTitle : NOTIFICATION_COPY.unavailable }</div>
                    </div>
                    { notice.kind === NOTIFICATION_NOTICE.FAIL && <button type="button" className="nf-btn" onClick={ retry }>{ translation('key_retry') }</button> }
                    <button type="button" className="nf-dismiss" aria-label={ NOTIFICATION_COPY.dismiss } onClick={ dismiss }>×</button>
                </div>
            ) }

            { loadError && rows.length === 0 ? (
                <div className="nf-notice" role="alert" data-nf-notice={ NOTIFICATION_NOTICE.FAIL }>
                    <div className="nf-notice-body"><div className="t">{ NOTIFICATION_COPY.failTitle }</div></div>
                    <button type="button" className="nf-btn" onClick={ () => setNonce((n) => n + 1) }>{ translation('key_retry') }</button>
                </div>
            ) : (
                <div className="nf-rows" data-nf-rows={ visible.length }>
                    { visible.map((item) => (
                        <NotificationRow key={ item.id } item={ item } available={ actions.isAvailable(item) } highlighted={ String(notice?.id) === String(item.id) } onOpen={ actions.open } onMarkRead={ actions.markRead } onMarkUnread={ actions.markUnread } />
                    )) }
                    { !loading && visible.length === 0 && <div className="nf-empty" data-nf-empty="1">{ NOTIFICATION_COPY.noMatch }</div> }
                    { loading && <div className="nf-loading">{ translation('key_loading') }…</div> }
                    { !loading && hasMore && <div className="nf-more"><button type="button" className="nf-btn" onClick={ () => setPage((p) => p + 1) }>{ translation('key_load_more') }</button></div> }
                </div>
            ) }

        </div>
    );
};

export default NotificationsPage;
