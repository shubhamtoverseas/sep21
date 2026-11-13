import { getModulePermissions } from './permissionUtils';

const CONFIGURATION_PERMISSIONS = {
  canAccessConfiguration: 'configurations_access',
  canViewDoop: 'view_doop',
  canEditDoop: 'edit_doop',
  canViewHoliday: 'view_holiday',
  canEditHoliday: 'edit_holiday',
  canViewTemplate: 'view_template',
  canAddTemplate: 'add_template',
  canEditTemplate: 'edit_template',
  /* Task Template Manager (Priyanka 14 Oct): one y/n key gates the page, the editor's Create/edit template entry and the grid row */
  canTaskTemplateManager: 'task_template_manager',
  canDeleteTemplate: 'delete_template',
  /* R-SET-1 (owner 5 Nov): Prompt Manager (Backend 268 P-3 keys) */
  canViewPromptManager: 'view_prompt_manager',
  canEditPromptManager: 'edit_prompt_manager',
  canViewFixedItemPrice: 'view_fixed_item_price',
  canEditFixedItemPrice: 'edit_fixed_item_price',
  canViewConditionalItemPrice: 'view_conditional_item_price',
  canEditConditionalItemPrice: 'edit_conditional_item_price',
  canViewConditionalLocalItemPrice: 'view_conditional_local_item_price',
  canEditConditionalLocalItemPrice: 'edit_conditional_local_item_price',
  canEditConditionalOverseasItemPrice: 'edit_conditional_overseas_item_price',
  canEditConditionalDirectItemPrice: 'edit_conditional_direct_item_price',
  canViewPromotion: 'view_promotion',
  canEditPromotion: 'edit_promotion',
  canViewWorkerPromotion: 'view_worker_promotion',
  canEditWorkerPromotion: 'edit_worker_promotion',
  canViewMedicalClinic: 'view_medical_clinic',
  canEditMedicalClinic: 'edit_medical_clinic',
  canDeleteMedicalClinic: 'delete_medical_clinic',
};

export const getConfigurationPermissions = (permissionList) => 
  getModulePermissions(permissionList, 'configuration', CONFIGURATION_PERMISSIONS);

export const useConfigurationPermissions = (permissionList) => 
  getConfigurationPermissions(permissionList);