import { getModulePermissions } from './permissionUtils';

const HRMS_PERMISSIONS = {
  canAccessHrms: 'hrms_access',
  canViewMyProfile: 'view_my_profile',
  canViewMyCalendar: 'view_my_calendar',
  canViewOthersCalendar: 'view_others_calendar',
  canAddLeave: 'add_leave',
  canEditLeave: 'edit_leave',
  canApproveLeave: 'approve_leave',
  canApproveLeaveNonReportees: 'approve_leave_non_reportees',
  canEditApproveLeave: 'edit_approve_leave',
  canRaiseTimeRequest: 'raise_time_request',
  canApproveTimeRequest: 'approve_time_request',
  canApproveTimeRequestNonReportees: 'approve_time_request_non_reportees',
  canAddTimeCredit: 'add_time_credit',
  canAddTimeCreditNonReportees: 'add_time_credit_non_reportees',
  canManualUpdateLeave: 'manual_update_leave',
  /* view_leave_ledger lives in the leave_management module (Priyanka 11 Nov, audit #115) — the stray hrms
     mapping is removed so nothing reads the key from the wrong module again */
};

export const getHrmsPermissions = (permissionList) => 
  getModulePermissions(permissionList, 'hrms', HRMS_PERMISSIONS);

export const useHrmsPermissions = (permissionList) => 
  getHrmsPermissions(permissionList);