import React, { useMemo, useState, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import WorkerIdentityHeader from './WorkerIdentityHeader';
import WkdChangeOwnerDialog from './WkdChangeOwnerDialog';
import WkdChangePartnerDialog from './WkdChangePartnerDialog';
import JoChangeInterpreterDialog from '../../../JobOfferPage/newui/record/JoChangeInterpreterDialog';
import { workerTypeList } from '../../../../../components/ReusableComponents/constants';
import { isOverseasIndoOrFilipino } from '../../../../../services/commonService';
import translation from '../../../../../utils/translation';
import configData from '../../../../../components/ReusableComponents/app-configs';
import { getPermissionValue } from '../../../../../services/permissionService';
import { NAME_NOT_PROVIDED, manualStatusTargets } from '../../workerModuleConstants';
import WkdSendLinkModal from './WkdSendLinkModal';
import WkdPhotoViewModal from './WkdPhotoViewModal';
import './wkd-header-rail.css';

const formatPhone = (code, number) => {
    if (!number) return '';
    const raw = String(number);
    const digits = raw.replace(/\D/g, '');
    const grouped = digits.length === 8 ? `${ digits.slice(0, 4) } ${ digits.slice(4) }` : raw;
    const cc = String(code || '').replace(/^\+/, '').trim();
    return cc ? `+${ cc } ${ grouped }` : grouped;
};

const WorkerHeaderSection = ({
    currentWorker, onEditProfilePopup, workerStatus, onUpdateStatus, allWorkerStatuses,
    isWorkerPermissionAccessInfo, isAdmin, handleRefreshWorkerInfo,
    staffType, handleOpenChats, workerProfileInfo,
    tabs, activeTab, onSelectTab, approvedPhoto,
}) => {
    const {
        registration_type, partner_agency, partner_branch, onboarding1, onboarding2, current_interpreter,
        workerChangePartnerPermission, workerChangeOnboarding1Permission, workerChangeOnboarding2Permission,
        worker_id, worker_type, type, nationality,
        current_location, status, image,
    } = currentWorker;
    const overseasWorkerType = useMemo(() => workerTypeList().find((t) => t.key === "overseas"), []);
    const [ownerDialog, setOwnerDialog] = useState(null);      /* 1 | 2 — Change Onboarding n open */
    const [partnerOpen, setPartnerOpen] = useState(false);
    const [interpreterOpen, setInterpreterOpen] = useState(false);
    const permissionList = useSelector((state) => state.users.permissionList);
    const [isSendLinkConfirm, setIsSendLinkConfirm] = useState(false);
    const [isPhotoOpen, setIsPhotoOpen] = useState(false);
    const isPartner = staffType === 'partner';
    /* Send registration link: a partner's own grant (`partner_send_link`, PERM Partner access / W-04); the host grant otherwise */
    const canSendLink = isAdmin || (isPartner
        ? getPermissionValue(permissionList?.data, 'partner', 'partner_send_link') === 'y'
        : getPermissionValue(permissionList?.data, 'worker', 'worker_send_link') === 'y');


    /* Change Status (WORKER §4.1 / U-0198 / U-0325): the server list reduced to the three host actions — On Hold · Suspended ·
     * Banned — each enabled by its role-block grant; Suspended waits for the server to accept it. The server decides the rest. */
    const statusActions = useMemo(() => {
        if (isPartner || !Array.isArray(workerStatus)) return [];
        return manualStatusTargets(workerStatus, { accessInfo: isWorkerPermissionAccessInfo, isAdmin }).map((s) => ({
            id: s.id,
            name: configData.workerStatusLabel(s.id, s.name),
            enable: s.enable,
            back_to_previous_status: s.back_to_previous_status ?? false,
        }));
    }, [workerStatus, isWorkerPermissionAccessInfo, isAdmin, isPartner]);

    const handlePickStatusAction = useCallback((s) => {
        onUpdateStatus(s.id, s.back_to_previous_status, s.name);
    }, [onUpdateStatus]);


    const isPartnerRegistered = registration_type === "partner_added" || registration_type === "partner_sent_link";
    const isOverseas = worker_type === overseasWorkerType?.id;
    /* U-0372 / backend 314: the interpreter is a Job Offer assignment — `current_interpreter` is the newest one; "Change" is the
       JO-scoped Change Interpreter dialog for its job_id (no worker-level change endpoint exists). Host grant: change_interpreter. */
    const hasInterpreterJob = Boolean(current_interpreter?.job_id);
    const canChangeInterpreter = !isPartner && hasInterpreterJob && (isAdmin
        || (Array.isArray(isWorkerPermissionAccessInfo?.worker_change_interpreter) && isWorkerPermissionAccessInfo.worker_change_interpreter.includes('y')));

    /* Actions (prototype P:1758 / P28:369-379): Change Onboarding 1 · Change Onboarding 2 (Overseas Filipino / Indonesian) ·
     * Change Partner (any Overseas with the grant) · Send registration link. A partner actor gets Send registration link only. */
    const menuActions = useMemo(() => {
        const items = [];
        if (!isPartner) {
            if (workerChangeOnboarding1Permission === 'y' || isAdmin) {
                items.push({ id: 'change-onboarding-1', label: `${ translation('key_change_onboarding') } 1`, onClick: () => setOwnerDialog(1) });
            }
            if (isOverseasIndoOrFilipino(currentWorker) && (workerChangeOnboarding2Permission === 'y' || isAdmin)) {
                items.push({ id: 'change-onboarding-2', label: `${ translation('key_change_onboarding') } 2`, onClick: () => setOwnerDialog(2) });
            }
            if (isOverseas && (workerChangePartnerPermission === 'y' || isAdmin)) {
                items.push({ id: 'change-partner', label: translation('key_change_partner'), onClick: () => setPartnerOpen(true) });
            }
            if (canChangeInterpreter) {
                items.push({ id: 'change-interpreter', label: translation('key_change_interpreter'), onClick: () => setInterpreterOpen(true) });
            }
        }
        if (canSendLink) {
            items.push({ id: 'send-registration-link', label: translation('key_wkr_send_registration_link'), onClick: () => setIsSendLinkConfirm(true) });
        }
        return items;
    }, [workerChangePartnerPermission, workerChangeOnboarding1Permission, workerChangeOnboarding2Permission, isAdmin, isPartner, isOverseas, currentWorker, canSendLink, canChangeInterpreter]);

    /* the owners popover "Edit" opens the owner action only when exactly one applies; with several, the Actions menu is the path */
    const ownersEdit = useMemo(() => {
        if (isPartner) return undefined;
        const ownerActions = menuActions.filter((m) => m.id !== 'send-registration-link');
        return ownerActions.length === 1 ? ownerActions[0].onClick : undefined;
    }, [menuActions, isPartner]);

    const owners = useMemo(() => {
        const onboardingLabel = translation('key_onboarding');
        const onboardingOwner = (n, ownerName) => ({
            role: `${ onboardingLabel } ${ n }`,
            name: ownerName,
            group: 'onboarding',
            groupLabel: onboardingLabel,
            sub: `${ onboardingLabel } ${ n } · (staff)`,
            tone: ownerName ? 'onb' : 'empty',
        });
        /* U-0200 (21 Oct): host onboarding / interpreter staff names have no partner-facing grant — a partner viewer gets only its own agency row */
        const list = isPartner ? [] : [onboardingOwner(1, onboarding1)];
        if (!isPartner && isOverseasIndoOrFilipino(currentWorker) && !isPartnerRegistered) {
            list.push(onboardingOwner(2, onboarding2));
        }
        /* the current interpreter (newest Job Offer assignment), read-only — the Job Offer it belongs to as the sub-line */
        if (!isPartner && current_interpreter?.staff_name) {
            const interpreterLabel = translation('key_interpreter');
            list.push({
                role: interpreterLabel, name: current_interpreter.staff_name, group: 'interpreter', groupLabel: interpreterLabel,
                sub: [current_interpreter.job_reference_id ? `#${ current_interpreter.job_reference_id }` : '', current_interpreter.staff_active === false ? translation('key_inactive') : ''].filter(Boolean).join(' · ') || undefined,
                tone: 'int',
            });
        }
        /* the Partner row is the RECORDED agency (· branch), added only when one is recorded (P:390-396; WORKER §16.4 / U-0200) */
        if (isOverseas && partner_agency) {
            list.push({
                role: translation('key_partner'),
                name: [partner_agency, partner_branch].filter(Boolean).join(' · '),
                group: 'partner', groupLabel: translation('key_partner'),
                sub: `(${ translation('key_agency') })`, tone: 'partner',
            });
        }
        return list;
    }, [onboarding1, onboarding2, partner_agency, partner_branch, currentWorker, isPartnerRegistered, isOverseas, isPartner, current_interpreter]);

    const statusInfo = useMemo(() => (Array.isArray(allWorkerStatuses) ? allWorkerStatuses.find((s) => s.id === status) : null), [allWorkerStatuses, status]);

    const canViewContacts = isAdmin || (
        Array.isArray(isWorkerPermissionAccessInfo?.worker_contact_details) &&
        (isWorkerPermissionAccessInfo.worker_contact_details.includes('view') || isWorkerPermissionAccessInfo.worker_contact_details.includes('y'))
    );
    /* PERM §5.9.1: Edit presupposes View on Worker Contact Details */
    const canEdit = isAdmin || (canViewContacts && Array.isArray(isWorkerPermissionAccessInfo?.worker_contact_details) && isWorkerPermissionAccessInfo.worker_contact_details.includes('edit'));

    const mobile = formatPhone(workerProfileInfo?.country_code, workerProfileInfo?.mobile_number);
    const whatsapp = formatPhone(workerProfileInfo?.whatsapp_country_code, workerProfileInfo?.whatsapp_number);
    /* only the recorded location — no invented default (WORKER §1.1 / SR-01) */
    const locationLabel = current_location?.name || undefined;

    return (
        <>
            <WorkerIdentityHeader
                name={ workerProfileInfo?.fullname || currentWorker.name || NAME_NOT_PROVIDED }
                image={ /^https?:/.test(image || '') ? image : undefined }
                code={ workerProfileInfo?.reference_id || currentWorker.reference_id }
                noCodeLabel={ translation('key_not_assigned') }
                statusLabel={ configData.workerStatusLabel(status, statusInfo?.name) }
                statusId={ status }
                typeLabel={ type }
                nationalityLabel={ nationality }
                locationLabel={ locationLabel }
                mobileLabel={ translation('key_mobile') }
                mobile={ mobile }
                whatsapp={ whatsapp }
                email={ workerProfileInfo?.email }
                showContacts={ canViewContacts }
                owners={ owners }
                statusActions={ statusActions }
                onPickStatusAction={ handlePickStatusAction }
                menuActions={ menuActions }
                onEdit={ canEdit ? onEditProfilePopup : undefined }
                editVariant="secondary"
                alwaysShowActions
                onOwnersEdit={ ownersEdit }
                ownerEmptyLabel={ translation('key_not_assigned') }
                onAvatarClick={ approvedPhoto?.url ? () => setIsPhotoOpen(true) : undefined }
                tabs={ tabs }
                activeTab={ activeTab }
                onSelectTab={ onSelectTab }
            />
            { isPhotoOpen && approvedPhoto?.url && (
                <WkdPhotoViewModal photo={ approvedPhoto } published={ approvedPhoto.published !== false } onClose={ () => setIsPhotoOpen(false) } />
            ) }
            { isSendLinkConfirm && (
                <WkdSendLinkModal
                    worker={ {
                        id: worker_id,
                        name: workerProfileInfo?.fullname || currentWorker.name,
                        code: workerProfileInfo?.reference_id || currentWorker.reference_id,
                        type: worker_type,
                        email: workerProfileInfo?.email,
                        country_code: workerProfileInfo?.country_code,
                        mobile_number: workerProfileInfo?.mobile_number,
                    } }
                    onClose={ () => setIsSendLinkConfirm(false) }
                />
            ) }
            { ownerDialog && (
                <WkdChangeOwnerDialog type={ ownerDialog } worker={ currentWorker } onClose={ () => setOwnerDialog(null) } onChanged={ handleRefreshWorkerInfo } />
            ) }
            { partnerOpen && (
                <WkdChangePartnerDialog worker={ currentWorker } onClose={ () => setPartnerOpen(false) } onChanged={ handleRefreshWorkerInfo } onOpenChat={ handleOpenChats } />
            ) }
            { interpreterOpen && hasInterpreterJob && (
                <JoChangeInterpreterDialog
                    row={ {
                        id: worker_id, job_id: current_interpreter.job_id, job_stage_id: current_interpreter.job_stage_id, type_display: type, nationality_display: nationality,
                        existing_interpreter: current_interpreter.staff_name ? { first_name: current_interpreter.staff_name } : null,
                    } }
                    onClose={ () => { setInterpreterOpen(false); handleRefreshWorkerInfo(); } }
                />
            ) }
        </>
    );
};

WorkerHeaderSection.propTypes = {
    currentWorker: PropTypes.object.isRequired,
    onEditProfilePopup: PropTypes.func,
    workerStatus: PropTypes.any,
    onUpdateStatus: PropTypes.func,
    allWorkerStatuses: PropTypes.any,
    isWorkerPermissionAccessInfo: PropTypes.any,
    isAdmin: PropTypes.bool,
    handleRefreshWorkerInfo: PropTypes.func.isRequired,
    staffType: PropTypes.string,
    handleOpenChats: PropTypes.func.isRequired,
    workerProfileInfo: PropTypes.any,
    tabs: PropTypes.array.isRequired,
    activeTab: PropTypes.string.isRequired,
    onSelectTab: PropTypes.func.isRequired,
    approvedPhoto: PropTypes.object,
};

export default memo(WorkerHeaderSection);
