import { getModulePermissions } from './permissionUtils';

const SHIFT_MANAGEMENT_PERMISSIONS = {
  canViewShiftCode: 'view_shift_code',
  canEditShiftCode: 'edit_shift_code',
  canImportShiftCode: 'import_shift_roster',
  canViewShiftRoster: 'view_shift_roster'
};

export const getShiftManagementPermissions = (permissionList) => 
  getModulePermissions(permissionList, 'shift_management', SHIFT_MANAGEMENT_PERMISSIONS);

export const useShiftManagementPermissions = (permissionList) => 
  getShiftManagementPermissions(permissionList);