import { getModulePermissions } from './permissionUtils';

const LEAVE_MANAGEMENT_PERMISSIONS = {
  canViewLeave: 'view_leave',
  canEditLeave: 'edit_leave',
  canManualUpdateLeave: 'manual_update_leave',
  canViewLeaveLedger: 'view_leave_ledger',
  canViewLeaveLedgerNonReportees: 'view_leave_ledger_non_reportees'
};

export const getLeaveManagementPermissions = (permissionList) => 
  getModulePermissions(permissionList, 'leave_management', LEAVE_MANAGEMENT_PERMISSIONS);

export const useLeaveManagementPermissions = (permissionList) => 
  getLeaveManagementPermissions(permissionList);