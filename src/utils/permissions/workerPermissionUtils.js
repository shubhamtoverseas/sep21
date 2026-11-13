import { getInnerPermissionCategory, getPermissionValue, isAdminUser } from "../../services/commonService";
import { isPartnerUser } from "../../services/permissionService";
import { WORKER_VIEW_DUPLICATES_KEY } from "../../Views/Pages/WorkerPage/workerModuleConstants";

const WORKER_MODULE = "worker";
const WORKER_ACCESS_KEY = "worker_access";

/**
 * View Worker Duplicates (worker_AUDIT D42 / H28 / X7; SETTINGS rows 17 / 20): a host grant of its own, never a partner's.
 * The grant does not exist in the Settings catalogue yet (backend ask W-8). Until the catalogue carries it, a host actor
 * falls back to Worker Access — otherwise every non-admin host would lose the duplicates page and rail card on the day
 * the frontend ships. The fallback switches itself off the moment the key appears in the permission payload.
 * @migration-unspecified(worker): the catalogue has no `worker_view_duplicates` yet; Worker Access stands in for it. Confirm with product before release.
 */
export const workerDuplicatesGrantInCatalogue = (permissionList) => Boolean(getInnerPermissionCategory(permissionList, WORKER_MODULE, WORKER_VIEW_DUPLICATES_KEY));

export const canViewWorkerDuplicates = (permissionList) => {
    if (isPartnerUser()) return false;
    if (isAdminUser()) return true;
    const key = workerDuplicatesGrantInCatalogue(permissionList) ? WORKER_VIEW_DUPLICATES_KEY : WORKER_ACCESS_KEY;
    return getPermissionValue(permissionList?.data, WORKER_MODULE, key) === "y";
};

/** the key the duplicates route hands ProtectedRoute (same fallback rule) */
export const workerDuplicatesRouteKey = (permissionList) => (workerDuplicatesGrantInCatalogue(permissionList) ? WORKER_VIEW_DUPLICATES_KEY : WORKER_ACCESS_KEY);
