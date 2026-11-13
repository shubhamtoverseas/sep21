import { lazy } from "react";
import routes from "./routesConfig/index";
import { hasPermission } from "../../../services/commonService";
import { isPartnerUser } from "../../../services/permissionService";
import { store } from "../../../redux/store";

const CalendarPage = lazy(() => import("../Calendar/newui/CalendarPage"));
const CalendarRedirect = lazy(() => import("../Calendar/newui/CalendarRedirect"));
const NotificationsPage = lazy(() => import("../Notifications/newui/NotificationsPage"));
const MyProfile = lazy(() => import("../SettingsPage/newui/hrms/profile/MyProfilePage"));
const TimeRequests = lazy(() => import("../SettingsPage/newui/hrms/time-requests/TimeRequestList"));
const RaiseTimeRequest = lazy(() => import("../SettingsPage/newui/hrms/time-requests/RaiseTimeRequestPage"));
const ApproveLeaves = lazy(() => import("../SettingsPage/newui/hrms/reportees/MyReporteesPage"));
// const ChatPage = lazy(() => import("../chat/Chat"));
const Conversaction = lazy(() => import("../Conversaction/newui/GlobalChat"));

/* PK-01 P1-18 (HPM-012): My Reportees opens on Approve Leave, Approve Time Request or Add Time Credit, the keys the hrms
   endpoints of its three tabs check; the key the user holds is the one handed to ProtectedRoute, read when the route renders */
export const MY_REPORTEES_KEYS = Object.freeze(["approve_leave", "approve_time_request", "add_time_credit"]);
export const myReporteesKey = () => MY_REPORTEES_KEYS.find((key) => hasPermission(store.getState().users?.permissionList?.data, "hrms", key)) || MY_REPORTEES_KEYS[0];

const generalRoutes = [
    /* gate = Calendar Access or any Follow Up grant, enforced by CalendarPage (one route key cannot express it) */
    { path: routes.calendar, component: CalendarPage },
    { path: routes.calendarRedirectFrom, component: CalendarRedirect },
    { path: routes.notifications, component: NotificationsPage },
    /* PK-01 P1-18 (HPM-012): View My Profile, the key every hrms profile endpoint checks. A partner has no HRMS module to hold it
       in and the page lets partners in (useMyProfile), so no key is handed for them. */
    // @migration-unspecified(pk01): spec is silent on a partner's My Profile (hrms refuses its data; Change Password works).
    // Retained existing behaviour. Confirm with product before release.
    { path: routes.myProfile, component: MyProfile, get moduleKey() { return isPartnerUser() ? undefined : "hrms"; }, get permissionKey() { return isPartnerUser() ? null : "view_my_profile"; } },
    { path: routes.timeRequests, component: TimeRequests, moduleKey: "hrms", permissionKey: "approve_time_request" },
    { path: routes.addTimeRequest, component: RaiseTimeRequest, moduleKey: "hrms", permissionKey: 'raise_time_request' },
    { path: routes.myReportees, component: ApproveLeaves, moduleKey: "hrms", get permissionKey() { return myReporteesKey(); } },
    { path: routes.chat, component: Conversaction },
    // { path: routes.altchat, component: Chat1Page },
    { path: routes.conversaction, component: Conversaction }
];

export default generalRoutes;
