import { getModulePermissions } from './permissionUtils';

const USER_PERMISSIONS = {
  canAccessUsers: 'users_access',
  canViewRole: 'view_role',
  canEditRole: 'edit_role',
  canViewUser: 'view_user',
  canEditUser: 'edit_user',
  canManageAssignmentEligibility: 'manage_assignment_eligibility'
};

export const getUserPermissions = (permissionList) => 
  getModulePermissions(permissionList, 'users', USER_PERMISSIONS);

export const useUserPermissions = (permissionList) => 
  getUserPermissions(permissionList);