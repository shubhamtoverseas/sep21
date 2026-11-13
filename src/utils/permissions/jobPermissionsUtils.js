import { JO_SEARCH_ACCESS, JO_STAGE_ID } from "../../Views/Pages/JobOfferPage/jobOfferConstants";
import { getWorkerPermissionAccess, isOwnerPermissionsOfJob, getPermissionValue, isAdminUser } from '../../services/commonService';

/*
 * Worker Chat is granted per applicant stage (PERM §4.12.1) — the ONE resolver every surface uses
 * (Global Chat applicant profile, Job Offer record applicant view, Worker Job Offer tab).
 * Suggested (17) and Not Interested (9) carry no chat grant in the permission grid, so they never open a chat.
 */
export const canChatWorkerAtStage = (stageId, perms) => {
    const stage = Number(stageId);
    if (stage === JO_STAGE_ID.INVITED) return Boolean(perms?.canInvitedWorkerChat);
    if (stage === JO_STAGE_ID.APPLIED || stage === JO_STAGE_ID.MATCHED) return Boolean(perms?.canAppliedMatchedWorkerChat);
    if (stage === JO_STAGE_ID.PENDING || stage === JO_STAGE_ID.UPCOMING || stage === JO_STAGE_ID.COMPLETED) return Boolean(perms?.canPendingUpcomingCompletedWorkerChat);
    return false;
};

/**
 * @param {Object} permissionList - Permission list from Redux state
 * @param {Array} ownerOnboardingList - Owner onboarding list from Redux state
 * @param {string} job Id - Job ID to check ownership
 * @returns {Object} Permission object with all job offer permissions
 */
export const getJobOfferPermissions = (permissionList, ownerOnboardingList, empId, isOwnerOfJob = undefined) => {
    const isAdmin = isAdminUser();
    /* conflict sheet U-0152: the owner is the CS stamped on the Job Offer (`is_owner` from the record) — the employer's CS only until the API carries it */
    const isOwnerPermissions = typeof isOwnerOfJob === 'boolean' ? isOwnerOfJob : isOwnerPermissionsOfJob(ownerOnboardingList, empId);

    // Base permission configuration
    const buildPermissions = (permissionList, isOwner) => {
        const prefix = isOwner ? 'jo_cs_owner' : 'jo_cs_non_owner';

        return {
            /* 12 Oct #18: a CS always sees the Job Offers they own (the API never answers 'n' for the owner) */
            detailsView: isOwner ? 'y' : getPermissionValue(permissionList?.data, prefix, `${ prefix }_jo_details_view`),
            editJobOffer: getPermissionValue(permissionList?.data, prefix, `${ prefix }_edit_jo`),
            share: getPermissionValue(permissionList?.data, prefix, `${ prefix }_jo_share`),
            shareWorkerProfile: getPermissionValue(permissionList?.data, prefix, `${ prefix }_share_worker_profile`),
            scheduleInterview: getPermissionValue(permissionList?.data, prefix, `${ prefix }_schedule_interview`),
            interviewAgain: getPermissionValue(permissionList?.data, prefix, `${ prefix }_interview_again`),
            instantInterview: getPermissionValue(permissionList?.data, prefix, `${ prefix }_instant_interview`),
            interviewReport: getPermissionValue(permissionList?.data, prefix, `${ prefix }_interview_report`),
            extendInterview: getPermissionValue(permissionList?.data, prefix, `${ prefix }_extend_interview`),
            addNewContract: getPermissionValue(permissionList?.data, prefix, `${ prefix }_contract_invoice_add`),
            markAsNotInterested: getPermissionValue(permissionList?.data, prefix, `${ prefix }_mark_as_not_interested`),
            startGroupChat: getPermissionValue(permissionList?.data, prefix, `${ prefix }_start_group_chat`),
            invitedWorkerChat: getPermissionValue(permissionList?.data, prefix, `${ prefix }_invited_worker_chat`),
            appliedMatchedWorkerChat: getPermissionValue(permissionList?.data, prefix, `${ prefix }_applied_matched_worker_chat`),
            pendingUpcomingCompletedWorkerChat: getPermissionValue(permissionList?.data, prefix, `${ prefix }_pending_upcoming_completed_worker_chat`),
            suggestWorker: getPermissionValue(permissionList?.data, prefix, `${ prefix }_suggest_worker`),
            changeJoStatus: getPermissionValue(permissionList?.data, prefix, `${ prefix }_change_jo_status`),
            changeOwner: getPermissionValue(permissionList?.data, prefix, `${ prefix }_change_owner`),
            /* Δ Follow Up (backend key 2026-10-07): create / work Follow Up tasks on this Job Offer */
            followUp: getPermissionValue(permissionList?.data, prefix, `${ prefix }_follow_up`),
        };
    };

    const ownerPermissions = buildPermissions(permissionList, true);
    const nonOwnerPermissions = buildPermissions(permissionList, false);
    const activePermissions = isOwnerPermissions ? ownerPermissions : nonOwnerPermissions;
    /* Search Access on the Job Offers list (backend key `jo_access_type` 2026-10-07): '' none · restricted · full_access */
    const searchAccess = String(getPermissionValue(permissionList?.data, 'jo', 'jo_access_type') || '');

    return {
        isAdmin,
        isOwnerPermissions,
        searchAccess: isAdmin ? JO_SEARCH_ACCESS.FULL : searchAccess,
        canFollowUp: isAdmin || activePermissions.followUp === 'y',
        scheduleInterview: activePermissions.scheduleInterview,
        canInterviewAgain: activePermissions.interviewAgain === 'y',
        canDoInstantInterview: activePermissions.instantInterview === 'y',
        canViewInterviewReport: activePermissions.interviewReport === 'y',
        canExtendInterview: isAdmin || activePermissions.extendInterview === 'y',
        /* the CS Owner always has Details View (PERM §4.12: locked ON for the Owner column) */
        canViewDetails: isAdmin || isOwnerPermissions || activePermissions.detailsView === 'y',
        canEditJobOffer: isAdmin || activePermissions.editJobOffer === 'y',
        canShare: isAdmin || activePermissions.share === 'y',
        canShareWorkerProfile: isAdmin || activePermissions.shareWorkerProfile === 'y',
        canScheduleInterview: isAdmin || activePermissions.scheduleInterview === 'y',
        canAddNewContract: isAdmin || activePermissions.addNewContract === 'y',
        canMarkAsNotInterested: isAdmin || activePermissions.markAsNotInterested === 'y',
        canSuggestWorker: isAdmin || activePermissions.suggestWorker === 'y',
        canChangeJoStatus: isAdmin || activePermissions.changeJoStatus === 'y',
        canChangeOwner: isAdmin || activePermissions.changeOwner === 'y',
        canStartGroupChat: isAdmin || activePermissions.startGroupChat === 'y',
        /* U-0241: Reschedule is the Worker module's PERM §5.9.2 grant (`worker_interview_reschedule`), read in the actor's
           owner / non-owner context for that worker — one key shared by the Job Offer row, the Worker Job Offer list and Calendar */
        canRescheduleFor: (row) => isAdmin || (Array.isArray(getWorkerPermissionAccess(ownerOnboardingList, row?.id, permissionList?.data)?.worker_interview_reschedule)
            && getWorkerPermissionAccess(ownerOnboardingList, row?.id, permissionList?.data).worker_interview_reschedule.includes('y')),
        canInvitedWorkerChat: isAdmin || activePermissions.invitedWorkerChat === 'y',
        canAppliedMatchedWorkerChat: isAdmin || activePermissions.appliedMatchedWorkerChat === 'y',
        canPendingUpcomingCompletedWorkerChat: isAdmin || activePermissions.pendingUpcomingCompletedWorkerChat === 'y',
    };
};

/**
 * Hook-like function to get job offer permissions (for use in components)
 * @param {Object} permissionList - Permission list from Redux
 * @param {Object} ownerOnboardingList - Owner onboarding list from Redux
 * @param {string} empId - Job ID
 * @returns {Object} Complete job offer permissions object
 */
export const useJobOfferPermissions = (permissionList, ownerOnboardingList, empId, isOwnerOfJob) => {
    return getJobOfferPermissions(permissionList, ownerOnboardingList, empId, isOwnerOfJob);
};