import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dropdown } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from 'prop-types';
import { clearReceivedNotification, fetchNotificationList } from "../../../redux/Slices/common/CommonSlice";
import { ShowToast } from "../../show-toast/ShowToast";
import translation from "../../../utils/translation";
import notificationBlue from "../../../assets/img/svg/notification.svg";
import Icon from "../../Icon/Icon";
import routes from "../../../Views/Pages/routes/routesConfig";
import { NOTIFICATION_COPY, NOTIFICATION_FILTER, NOTIFICATION_PANEL_LIMIT } from "../../../Views/Pages/Notifications/notificationConstants";
import NotificationRow from "../../../Views/Pages/Notifications/newui/NotificationRow";
import useNotificationActions from "../../../Views/Pages/Notifications/newui/useNotificationActions";
import "../../../Views/Pages/Notifications/newui/notifications.css";
import "./notification-dropdown.css";

/*
 * Bell panel (prototype notifications-bell.js panelHTML; NOTIFICATION-MAP; CR § Notifications): title · All | Unread N ·
 * Mark all read (deferred until the endpoint) · the recent items in the shared row anatomy · footer note + View all.
 * Opening the panel marks nothing; opening an item marks that item read, also when its destination is unavailable
 * (neutral toast). The socket layer stays as delivered.
 */
const NotificationDropdown = ({ notificationUnreadCount, customTrigger }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const receivedNotification = useSelector((state) => state.common.receivedNotification);
    const dropdownToggleRef = useRef(null);
    const [filter, setFilter] = useState(NOTIFICATION_FILTER.ALL);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [nonce, setNonce] = useState(0);

    useEffect(() => {
        let live = true;
        setLoading(true); setLoadError(false);
        dispatch(fetchNotificationList({ limit: NOTIFICATION_PANEL_LIMIT, page: 1, ...(filter === NOTIFICATION_FILTER.UNREAD ? { is_read: false } : {}) })).then((res) => {
            if (!live) return;
            if (res?.error) { setLoadError(true); setLoading(false); return; }
            setRows(res?.payload?.data || []);
            setLoading(false);
        });
        return () => { live = false; };
    }, [dispatch, filter, nonce]);

    useEffect(() => {
        if (!receivedNotification?.id) return;
        setRows((prev) => (prev.some((n) => n.id === receivedNotification.id) ? prev : [receivedNotification, ...prev].slice(0, NOTIFICATION_PANEL_LIMIT)));
        dispatch(clearReceivedNotification());
    }, [dispatch, receivedNotification]);

    const closePanel = useCallback(() => { dropdownToggleRef.current?.click?.(); }, []);
    const markReadLocal = useCallback((id, isRead = true) => setRows((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: isRead } : n))), []);
    const markAllReadLocal = useCallback(() => setRows((prev) => prev.map((n) => (n.is_read ? n : { ...n, is_read: true }))), []);
    /* NT-01: an unavailable destination uses the neutral unavailable treatment — the item is still marked read */
    const onUnavailable = useCallback(() => ShowToast('info', translation('key_not_available')), []);
    const actions = useNotificationActions({ markReadLocal, markAllReadLocal, onUnavailable, onNavigate: closePanel });
    const viewAll = useCallback(() => { closePanel(); navigate(routes.notifications); }, [closePanel, navigate]);

    const visible = filter === NOTIFICATION_FILTER.UNREAD ? rows.filter((n) => !n.is_read) : rows;

    return (
        <Dropdown className="nav-item notification-dropdown p-0">
            <Dropdown.Toggle as="div" ref={ dropdownToggleRef } className={ customTrigger ? "notif-custom-toggle" : "nav-link chat-notification-wrapper" }>
                { customTrigger || (
                    <Link>
                        <img src={ notificationBlue } alt="notification" className="header-notification-icon" width={ 24 } height={ 24 } />
                        { notificationUnreadCount > 0 && (
                            <span className="notification-badge">{ notificationUnreadCount > 99 ? '99+' : notificationUnreadCount }</span>
                        ) }
                    </Link>
                ) }
            </Dropdown.Toggle>
            <Dropdown.Menu align="end" className="notif-menu nf-root nf-panel">
                <div className="notif-head">
                    <span className="notif-head-title">{ translation('key_notifications') }</span>
                    <div className="nf-seg sm" role="group" aria-label={ translation('key_notifications') }>
                        <button type="button" aria-pressed={ filter === NOTIFICATION_FILTER.ALL } onClick={ () => setFilter(NOTIFICATION_FILTER.ALL) }>{ translation('key_all') }</button>
                        <button type="button" aria-pressed={ filter === NOTIFICATION_FILTER.UNREAD } onClick={ () => setFilter(NOTIFICATION_FILTER.UNREAD) }>{ translation('key_unread') } { notificationUnreadCount }</button>
                    </div>
                    <button type="button" className="notif-mark-all" disabled={ !notificationUnreadCount } onClick={ () => actions.markAllRead().then((ok) => { if (ok) ShowToast('success', NOTIFICATION_COPY.markAllDone); }) }>{ NOTIFICATION_COPY.markAllRead }</button>
                    <button type="button" className="notif-close" onClick={ closePanel } aria-label={ translation('key_close') }><Icon name="x" size={ 16 } /></button>
                </div>
                <div className="nf-panel-list">
                    { loadError ? (
                        <div className="notif-error" role="alert">
                            <span>{ NOTIFICATION_COPY.failTitle }</span>
                            <button type="button" className="notif-retry" onClick={ () => setNonce((n) => n + 1) }>{ translation('key_retry') }</button>
                        </div>
                    ) : visible.length > 0 ? visible.map((item) => (
                        <NotificationRow key={ item.id } item={ item } compact available={ actions.isAvailable(item) } onOpen={ actions.open } onMarkRead={ actions.markRead } onMarkUnread={ actions.markUnread } />
                    )) : (
                        <div className="nf-panel-empty" data-nf-empty="1">{ loading ? `${ translation('key_loading') }…` : NOTIFICATION_COPY.nothingUnread }</div>
                    ) }
                </div>
                <div className="nf-panel-foot">
                    <span>{ NOTIFICATION_COPY.panelNote }</span>
                    <button type="button" className="nf-viewall" onClick={ viewAll }>{ NOTIFICATION_COPY.viewAll } ›</button>
                </div>
            </Dropdown.Menu>
        </Dropdown>
    );
};

NotificationDropdown.propTypes = {
    notificationUnreadCount: PropTypes.number.isRequired,
    customTrigger: PropTypes.node,
};

export default NotificationDropdown;
