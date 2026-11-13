import { hasPermission } from '../../services/commonService';

/*
 * Follow Up grants (SETTINGS_AND_PERMISSIONS L9-L13; PERM L3215; hrms task.access.utils RULES). Every source has its own
 * Follow Up key; any one of them implies Calendar access — never the reverse (Calendar access alone grants no Follow Up).
 * `permissionData` is the permission list array (state.users.permissionList.data); admin passes inside hasPermission.
 */
export const FOLLOW_UP_GRANTS = Object.freeze([
    ['worker', 'worker_follow_up'],
    ['employer', 'employer_follow_up'],
    ['jo_cs_owner', 'jo_cs_owner_follow_up'],
    ['jo_cs_non_owner', 'jo_cs_non_owner_follow_up'],
    ['processing_cs_owner', 'processing_cs_owner_follow_up'],
    ['processing_cs_non_owner', 'processing_cs_non_owner_follow_up'],
    ['insurance', 'insurance_follow_up'],
    ['invoice', 'invoice_follow_up'],
]);

export const hasCalendarAccess = (permissionData) => hasPermission(permissionData, 'calendar', 'calendar_access')
    || FOLLOW_UP_GRANTS.some(([module, key]) => hasPermission(permissionData, module, key));

/* the per-source Follow Up grants; record access is decided by the server on every call */
export const hasInvoiceFollowUp = (permissionData) => hasPermission(permissionData, 'invoice', 'invoice_follow_up');
export const hasWorkerFollowUp = (permissionData) => hasPermission(permissionData, 'worker', 'worker_follow_up');
export const hasEmployerFollowUp = (permissionData) => hasPermission(permissionData, 'employer', 'employer_follow_up');
export const hasEntityFollowUp = (permissionData, entityType) => (entityType === 'employer' ? hasEmployerFollowUp(permissionData) : hasWorkerFollowUp(permissionData));

/* I-16: the Insurance Follow Up source grant (conflicts sheet U-0115); record access is decided by the server on every call */
export const hasInsuranceFollowUp = (permissionData) => hasPermission(permissionData, 'insurance', 'insurance_follow_up');
