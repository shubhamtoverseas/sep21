import { getModulePermissions } from './permissionUtils';

const SETTINGS_PERMISSIONS = {
    canViewSettings: 'settings_access',
    canEditBranch: 'edit_branch',
    canEditAgency: 'edit_agency',
    canViewAgency: 'view_agency',
    canViewBranch: 'view_branch'
};

export const getSettingsPermissions = (permissionList) => 
    getModulePermissions(permissionList, 'settings', SETTINGS_PERMISSIONS);

export const useSettingsPermissions = (permissionList) => 
    getSettingsPermissions(permissionList);