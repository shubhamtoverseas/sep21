import { lazy } from "react";
import routes from "./routesConfig/index";
import { hasPermission } from "../../../services/commonService";
import { isPartnerUser } from "../../../services/permissionService";
import { store } from "../../../redux/store";
import { workerDuplicatesRouteKey } from "../../../utils/permissions/workerPermissionUtils";

const Worker = lazy(() => import("../WorkerPage/Worker"));
const WorkerDetails = lazy(() => import("../WorkerPage/worker-detail/WorkerDetail"));
const SendRegistrationLink = lazy(() => import("../WorkerPage/send-registration-link/SendRegistrationLinkPage"));
const WorkerDuplicates = lazy(() => import("../WorkerPage/dashboard/duplicates/WorkerDuplicatesPage"));

/* worker_AUDIT D51 / X27: the staff type is read when the route is rendered (getters), not once at module import, so a
   logout / re-login as another staff type without a reload resolves the right module. `hostKey` / `partnerKey` are the
   grants ProtectedRoute checks; `partnerKey: null` excludes partners (the key is absent from their module → redirect). */
/* a key no partner module carries — ProtectedRoute redirects */
const PARTNER_EXCLUDED_KEY = "worker_view_duplicates";
const workerRoute = (path, component, hostKey, partnerKey) => ({
  path,
  component,
  get moduleKey() { return isPartnerUser() ? "partner_worker" : "worker"; },
  get permissionKey() {
    if (isPartnerUser()) return partnerKey || PARTNER_EXCLUDED_KEY;
    return typeof hostKey === "function" ? hostKey() : hostKey;
  },
});

/* D46 / OvN #16 / U-0215: the Send registration link page opens on Send Link OR Access — ProtectedRoute checks one key,
   so the key the actor actually holds is the one handed to it (the page itself still blocks a missing Send Link grant) */
const sendLinkOrAccess = () => (hasPermission(store.getState().users?.permissionList?.data, "worker", "worker_send_link") ? "worker_send_link" : "worker_access");

const workerRoutes = [
  workerRoute(routes.workers, Worker, "worker_access", "partner_worker_access"),

  /* declared before the record route so `send-registration-link` is never read as a worker id */
  workerRoute(routes.workerSendRegistrationLink, SendRegistrationLink, sendLinkOrAccess, "partner_worker_access"),

  workerRoute(routes.workerDetails, WorkerDetails, "worker_access", "partner_worker_access"),

  /* D42 / W-04: View Worker Duplicates grant (Worker Access while the catalogue lacks the key — workerPermissionUtils); partners never reach the page */
  workerRoute(routes.WorkerDuplicates, WorkerDuplicates, () => workerDuplicatesRouteKey(store.getState().users?.permissionList), null),
];

export default workerRoutes;