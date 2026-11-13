import { getProcessingPermission, isOwnerPermissionsOfContract, getPermissionValue, isAdminUser } from '../../services/commonService';

/**
 * @param {Object} permissionList - Permission list from Redux state
 * @param {Array} ownerOnboardingList - Owner onboarding list from Redux state
 * @param {string} contractId - Contract ID to check ownership
 * @returns {Object} Permission object with all processing permissions
 */
export const getProcessingPermissions = (permissionList, ownerOnboardingList, contractId) => {
    const isAdmin = isAdminUser();
    const isOwnerPermissions = isOwnerPermissionsOfContract(ownerOnboardingList, contractId);

    // Base permission configuration
    const buildPermissions = (permissionList, isOwner) => {
    
        const prefix = isOwner ? 'processing_cs_owner' : 'processing_cs_non_owner';

        return {
            details: getPermissionValue(permissionList?.data, prefix, `${prefix}_details`),
            stageActions: getPermissionValue(permissionList?.data, prefix, `${prefix}_stage_actions`),
            documentActions: getPermissionValue(permissionList?.data, prefix, `${prefix}_documents`),
            formActions: getPermissionValue(permissionList?.data, prefix, `${prefix}_forms`),
            employerChat: getProcessingPermission(permissionList, isOwner, 'employer_chat'),
            workerChat: getProcessingPermission(permissionList, isOwner, 'worker_chat'),
            partnerChat: getProcessingPermission(permissionList, isOwner, 'partner_chat'),
            edit: getProcessingPermission(permissionList, isOwner, 'edit'),
            followUp: getProcessingPermission(permissionList, isOwner, 'follow_up'),
            changeStatus: getProcessingPermission(permissionList, isOwner, 'change_status'),
            changeOwner: getProcessingPermission(permissionList, isOwner, 'change_owner'),
            /* PERM §6.7 Employer Contact Details — View · Edit (CSV) (U-0276) */
            employerContact: String(getPermissionValue(permissionList?.data, prefix, `${prefix}_employer_contact_details`) || ''),
        };
    };

    const ownerPermissions = buildPermissions(permissionList, true);
    const nonOwnerPermissions = buildPermissions(permissionList, false);
    const activePermissions = isOwnerPermissions ? ownerPermissions : nonOwnerPermissions;

    const stageActionPermissions = isAdmin
        ? ['view', 'edit', 'send_template', 'change_status']
        : activePermissions.stageActions
            ? activePermissions.stageActions.split(',')
            : [];

    const documentPermissions = isAdmin
        ? ['view', 'upload', 'manage']
        : activePermissions.documentActions
            ? activePermissions.documentActions.split(',')
            : [];

    const formPermissions = isAdmin
        ? ['view', 'edit']
        : activePermissions.formActions
            ? activePermissions.formActions.split(',')
            : [];

    return {
        isAdmin,
        isOwnerPermissions,

        // Detailed permissions
        details: activePermissions.details,
        
        // Stage action permissions as array
        stageActionPermissions,
        documentPermissions,
        formPermissions,

        // Legacy compatibility - individual permission flags
        isViewEmpChatPermission: activePermissions.employerChat,
        isViewWorkerChatPermission: activePermissions.workerChat,
        isViewPartnerChatPermission: activePermissions.partnerChat,
        isEditContractPermission: activePermissions.edit,
        isViewFollowUpPermission: activePermissions.followUp,
        isChangeStatusPermission: activePermissions.changeStatus,
        isChangeOwnerPermission: activePermissions.changeOwner,
        canViewEmployerContact: activePermissions.employerContact.split(',').map((v) => v.trim()).includes('view'),
        canEditEmployerContact: activePermissions.employerContact.split(',').map((v) => v.trim()).includes('edit'),
        stageActionPermission: stageActionPermissions,

        // Detail permissions for component access control
        processingCsOwnerDetailPermission: ownerPermissions.details,
        processingCsNonOwnerDetailPermission: nonOwnerPermissions.details,
    };
};

/**
 * Check if user can access processing details
 * @param {Object} permissions - Permissions object from getProcessingPermissions
 * @returns {boolean} True if user can access processing details
 */
export const canAccessProcessingDetails = (permissions) => {
    const { isAdmin, isOwnerPermissions, processingCsOwnerDetailPermission, processingCsNonOwnerDetailPermission } = permissions;

    return (
        (isOwnerPermissions && processingCsOwnerDetailPermission === 'y') ||
        (!isOwnerPermissions && processingCsNonOwnerDetailPermission === 'y') ||
        isAdmin
    );
};
/**
 * Hook-like function to get permissions (for use in components)
 * @param {Object} permissionList - Permission list from Redux
 * @param {Object} ownerOnboardingList - Owner onboarding list from Redux
 * @param {string} contractId - Contract ID
 * @returns {Object} Complete permissions object
 */
export const useProcessingPermissions = (permissionList, ownerOnboardingList, contractId) => {
    return getProcessingPermissions(permissionList, ownerOnboardingList, contractId);
};
