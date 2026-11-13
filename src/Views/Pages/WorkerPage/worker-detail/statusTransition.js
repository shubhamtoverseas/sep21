import translation from '../../../../utils/translation';
import { headingCase } from '../../../../utils/utils';
import { PT_SECTION_STATES, SECTION_STATUS_TARGETS } from '../workerModuleConstants';

export const sectionStatusOptions = (allStatusList, currentStatus) =>
    (allStatusList || []).filter((s) => SECTION_STATUS_TARGETS.includes(s.id) && s.id !== currentStatus);

export const ptSectionStatusOptions = (currentStatus, { enableReady = true } = {}) => (
    currentStatus === PT_SECTION_STATES.ready
        ? [{ id: PT_SECTION_STATES.notReady, name: headingCase(translation('key_not_ready')), enable: true }]
        : [{ id: PT_SECTION_STATES.ready, name: translation('key_ready'), enable: enableReady }]
);

/* W-27 (backend 248): a dependent Indonesian document cannot be Verified while the central document (Passport, or KTP when the
   passport was never applied for) is not Verified — the option stays listed, disabled; the server refuses with CENTRAL_DOCUMENT_NOT_VERIFIED */
export const gateVerifyOnCentral = (options, centralVerified) => (
    centralVerified === false ? (options || []).map((o) => (o.id === 'verified' ? { ...o, enable: false } : o)) : options
);

export const getStatusTransitionError = (currentStatus, nextStatus, options = {}) => {
    const {
        strict = true,
        normalizeEmpty = true,
        incompleteCurrentKey = 'key_update_only_verified_or_in_review_status_or_action_required_status',
    } = options;

    if (strict && nextStatus === 'in_complete') {
        return 'key_update_only_verified_or_in_review_status_or_action_required_status';
    }

    const current = (normalizeEmpty && currentStatus === '') ? 'in_complete' : currentStatus;

    if (current === nextStatus) {
        return 'key_status_already_updated';
    }
    if (strict && current === 'in_complete') {
        return incompleteCurrentKey;
    }
    return null;
};
