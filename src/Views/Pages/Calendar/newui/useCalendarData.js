import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getCalendar } from "../../../../services/calendar";
import { fetchBranchUsers } from "../../../../redux/Slices/settings/users/UsersSlice";
import { getCurrentUser } from "../../../../services/commonService";
import { normalizeCalendarPayload } from "./calendarEvents";
import { CAL_LIST_PARAMS, CAL_NON_REPORTEES_KEY, CAL_STAFF_LIST_PARAMS, CAL_STAFF_ME } from "./calendarConstants";

/* the Non-Reportees value → { all, ids }: a CSV of user ids = that scope; anything else = none. U-0407 (29 Oct, SPLIT): the
   legacy `y` = everyone fallback is emptied — the scope is an explicit permitted staff list (21 Oct), its editor control
   waits for Mike's shape. `all` stays in the shape for that control. */
export const nonReporteeScope = (selectedValue) => {
    const raw = String(selectedValue ?? '').trim();
    const ids = raw.split(',').map((v) => v.trim()).filter((v) => /^\d+$/.test(v));
    return { all: false, ids: new Set(ids) };
};

/*
 * Data for the visible days: one range request (from / to, inclusive) for one staff member — interviews, tasks due in
 * the range, and every overdue outstanding task whatever the range (HRMS API spec A4). The staff selector offers "Me",
 * the caller's reportees, and the other staff only with Calendar (Non-Reportees) (spec A11; PERM §15.2 — the HRMS
 * leave-calendar toggles are not read, they gate the HRMS pages).
 */
const EMPTY_EVENTS = Object.freeze({ interviews: [], tasks: [], overdueTasks: [] });
const meStaff = () => getCurrentUser()?.data?.staff || null;
const meName = () => {
    const staff = meStaff();
    return [staff?.first_name, staff?.last_name].filter(Boolean).join(' ') || staff?.name || '';
};

const useCalendarData = ({ days, staff }) => {
    const dispatch = useDispatch();
    const permissionList = useSelector((state) => state.users.permissionList);
    const branchUsers = useSelector((state) => state.users.branchUsers);
    /* conflict sheet U-0014 / U-0181: other staff's calendars follow the Non-Reportees key alone — read raw, so an admin
       account gets no default to every calendar; a CSV of user ids = that scope (backend 312; the `y` fallback went with U-0407) */
    const scope = useMemo(() => {
        const module = Array.isArray(permissionList?.data) ? permissionList.data.find((m) => m.module === 'calendar') : null;
        return nonReporteeScope(module?.category?.find((item) => item.id === CAL_NON_REPORTEES_KEY)?.selected_value);
    }, [permissionList?.data]);
    const meUserId = useMemo(() => getCurrentUser()?.data?.id ?? null, []);

    /* A11 rows carry `user_id` · `name` · `is_reportee`; `search_user_id` (A4) is that user id — for Me, the caller's own */
    const staffOptions = useMemo(() => {
        const others = Array.isArray(branchUsers)
            ? branchUsers
                .filter((user) => String(user?.user_id) !== String(meUserId) && (scope.all || scope.ids.has(String(user?.user_id)) || user?.is_reportee === true))
                .map((user) => ({ value: String(user.user_id), label: user.name || [user?.staff?.first_name, user?.staff?.last_name].filter(Boolean).join(' '), userId: user.user_id }))
            : [];
        return [{ value: CAL_STAFF_ME, label: meName(), userId: meUserId }, ...others];
    }, [branchUsers, scope, meUserId]);

    /* the list is the server's answer for this caller (reportees, plus everyone with the grant): asked once per visit */
    useEffect(() => { dispatch(fetchBranchUsers(CAL_STAFF_LIST_PARAMS)); }, [dispatch]);

    /* a staff value outside the grant resolves to Me (an unauthorised id in the address shows nothing of theirs) */
    const selectedStaff = useMemo(() => staffOptions.find((option) => option.value === staff) || staffOptions[0], [staffOptions, staff]);

    const [events, setEvents] = useState(EMPTY_EVENTS);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nonce, setNonce] = useState(0);
    const requestSeq = useRef(0);
    const from = days[0];
    const to = days[days.length - 1];

    useEffect(() => {
        const staffId = selectedStaff?.userId;
        if (!staffId) { setIsLoading(false); return undefined; }
        const seq = ++requestSeq.current;
        setIsLoading(true);
        setError(null);
        getCalendar({ [CAL_LIST_PARAMS.FROM]: from, [CAL_LIST_PARAMS.TO]: to, [CAL_LIST_PARAMS.USER]: staffId })
            .then((res) => {
                if (seq !== requestSeq.current) return;
                setEvents(normalizeCalendarPayload(res?.data?.data ?? res?.data));
            })
            .catch((err) => {
                if (seq !== requestSeq.current) return;
                setError(err?.response?.data?.message || true);
            })
            .finally(() => { if (seq === requestSeq.current) setIsLoading(false); });
        return undefined;
    }, [from, to, selectedStaff?.userId, nonce]);

    const refresh = useCallback(() => setNonce((n) => n + 1), []);

    /* `canSeeOthers`: any non-reportee scope at all (everyone, or a named set) */
    return { events, isLoading, error, refresh, staffOptions, selectedStaff, canSeeOthers: scope.all || scope.ids.size > 0, meUserId };
};

export default useCalendarData;
