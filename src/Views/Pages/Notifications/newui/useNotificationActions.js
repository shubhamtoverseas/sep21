import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchNotificationUnreadCount, notificationMarkAllRead, notificationMarkAsUnread, notificationMarkRead } from "../../../../redux/Slices/common/CommonSlice";
import { resolveTarget } from "./notificationModel";

/*
 * Open + read state shared by the bell panel and the full view (CR § Notifications): opening an item marks it read —
 * including an unavailable destination — then resolves the target with a fresh access check. `onUnavailable` / `onFail`
 * receive the item for the neutral and retry treatments; `markReadLocal(id, isRead)` / `markAllReadLocal()` let the host
 * update its own list. Read state (hrms API, 14 Oct): POST mark-read · mark-as-unread · mark-all-as-read — each reply
 * carries `total`, the new unread count, so the bell needs no second call (the count is re-fetched only on failure).
 */
const useNotificationActions = ({ markReadLocal, markAllReadLocal, onUnavailable, onNavigate }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const permissionList = useSelector((state) => state.users.permissionList);

    const markRead = useCallback((item) => {
        if (!item?.id) return Promise.resolve();
        markReadLocal?.(item.id, true);
        return dispatch(notificationMarkRead({ notification_id: item.id })).then((res) => { if (res?.error) { markReadLocal?.(item.id, false); dispatch(fetchNotificationUnreadCount()); } });
    }, [dispatch, markReadLocal]);
    const markUnread = useCallback((item) => {
        if (!item?.id) return Promise.resolve();
        markReadLocal?.(item.id, false);
        return dispatch(notificationMarkAsUnread({ notification_id: item.id })).then((res) => { if (res?.error) { markReadLocal?.(item.id, true); dispatch(fetchNotificationUnreadCount()); } });
    }, [dispatch, markReadLocal]);
    const markAllRead = useCallback(() => {
        markAllReadLocal?.();
        return dispatch(notificationMarkAllRead()).then((res) => { if (res?.error) dispatch(fetchNotificationUnreadCount()); return !res?.error; });
    }, [dispatch, markAllReadLocal]);

    const open = useCallback((item) => {
        if (!item?.is_read) markRead(item);
        const target = resolveTarget(item, permissionList);
        if (!target) { onUnavailable?.(item); return; }
        onNavigate?.();
        navigate(target.path);
    }, [markRead, permissionList, onUnavailable, onNavigate, navigate]);

    const isAvailable = useCallback((item) => Boolean(resolveTarget(item, permissionList)), [permissionList]);

    return { open, markRead, markUnread, markAllRead, isAvailable };
};

export default useNotificationActions;
