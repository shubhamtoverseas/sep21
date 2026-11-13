/**
 * Lightweight permission and auth utilities extracted from commonService.js
 * to avoid pulling in dayjs, file-saver, awsS3Functions, etc. on every page.
 */
import { ADMIN_ROLE_ID } from '../components/ReusableComponents/constants';
import { getStoredUser } from '../utils/storage';

export const getCurrentUser = () => {
  const currentUser = getStoredUser();
  return currentUser || null;
};

export const isPartnerUser = () => getCurrentUser()?.data?.staff?.staff_type === 'partner';

export const isAdminUser = () => {
  const currentUser = getStoredUser();
  return currentUser?.data?.role?.id === ADMIN_ROLE_ID;
};

export const findPermission = (permissionModule, permissionId) => {
  if (!permissionModule || !permissionModule.category) return null;
  return permissionModule.category.find(item => item.id === permissionId) || null;
};

export const getPermissionValue = (permissionList, moduleId, permissionId) => {
  if (isAdminUser()) return 'y';
  if (!permissionList || !Array.isArray(permissionList)) return false;
  const module = permissionList.find(m => m.module === moduleId);
  if (!module) return '';
  const permission = findPermission(module, permissionId);
  return permission?.selected_value;
};

export const isDisabledCsOption = (e, permission) => {
  const currentStaffId = getCurrentUser()?.data?.staff?.id;
  /* backend 273: the CS-filter grant is a CSV of owner / all ("owner", "all", "owner,all"); All ⊇ Owner */
  const scope = String(permission || '').split(',').map((v) => v.trim());
  if (isAdminUser() || scope.includes('all')) return false;
  if (scope.includes('owner') && e.id === currentStaffId) return false;
  return true;
};

export const showErrorMessage = (response) => {
  const { error, payload } = response;
  if (error) {
    const errorMessage = payload?.message ? payload.message : (payload?.data?.data?.message) ?? 'An unexpected error occurred.';
    import('../components/show-toast/ShowToast').then(({ ShowToast }) => {
      ShowToast('error', errorMessage);
    });
  }
};
