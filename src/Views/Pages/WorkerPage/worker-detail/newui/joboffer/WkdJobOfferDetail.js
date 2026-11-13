import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Spinner } from "react-bootstrap";
import PropTypes from 'prop-types';
import dayjs from "dayjs";
import WkdStageChip, { wkdStageLabel, wkdStageTone } from "../WkdStageChip";
import WkdJoConfirmModal from "./WkdJoConfirmModal";
import { ivMethodIcon } from "./wkdJoIcons";
import "../wkd-listings.css";
import { showSuccessOrError, getPermissionValue, isAdminUser } from "../../../../../../services/commonService";
import { workerJobOfferAcceptInterview, workerJobOfferCancelnterview, workerManageJob } from "../../../../../../redux/Slices/worker/WorkerSlice";
import { fetchInterviewDetails } from "../../../../../../redux/Slices/common/interview/InterviewSlice";
import translation from "../../../../../../utils/translation";
import { getInitials } from "../../../../../../utils/utils";
import { useSelector } from "react-redux";
import { getJobOfferPermissions } from "../../../../../../utils/permissions/jobPermissionsUtils";
import { JO_EDIT_FROM, JO_FROM, JO_INTERVIEW_CELL_FORMAT, JO_INTERVIEW_METHOD, JO_OPEN_STATUS_IDS, jobOfferDayOffNames, jobOfferDetailsPath, jobOfferEditPath } from "../../../../JobOfferPage/jobOfferConstants";
import { WKD_JO_IN_PERSON_TYPE, WKD_JO_STATUS_KEY, WKD_MANAGE_JOB_ACTION } from "../../../workerModuleConstants";
import { SEND_SITE } from "../../../../SettingsPage/newui/templates/templateConfiguration";

const WkdInterviewReportPanel = React.lazy(() => import('./WkdInterviewReportPanel'));
const WkdSuggestTimeDrawer = React.lazy(() => import('./WkdSuggestTimeDrawer'));
const WkdSendTemplateModal = React.lazy(() => import("../WkdSendTemplateModal"));
const GcScheduleInterview = React.lazy(() => import('../../../../Conversaction/newui/GcScheduleInterview'));
const GcInterviewReport = React.lazy(() => import('../../../../Conversaction/newui/GcInterviewReport'));

const linkIcon = (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M6.5 9.5a3 3 0 0 0 4.2.2l2-2a3 3 0 0 0-4.2-4.2l-1 1M9.5 6.5a3 3 0 0 0-4.2-.2l-2 2a3 3 0 0 0 4.2 4.2l1-1" />
    </svg>
);

const shareIcon = (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="3.5" r="1.8" /><circle cx="4" cy="8" r="1.8" /><circle cx="12" cy="12.5" r="1.8" /><path d="M5.6 7.1l4.8-2.7M5.6 8.9l4.8 2.7" />
    </svg>
);

const WkdJobOfferDetail = ({ handleOnClose, workerJobOfferDetails, isJobInfo, onHandleTextCopyInChat, permissionList, isWorkerPermissionAccessInfo, isAdmin, workerProfileInfo, handleRefreshJobList }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const ownerOnboardingList = useSelector((state) => state.users.ownerOnboardingList);
    const workerGlobalSendLink = useMemo(() => getPermissionValue(permissionList?.data, 'worker', 'worker_send_link'), [permissionList?.data]);
    const jobPerms = useMemo(
        () => getJobOfferPermissions(permissionList, ownerOnboardingList, workerJobOfferDetails?.employer_id),
        [permissionList, ownerOnboardingList, workerJobOfferDetails?.employer_id]
    );
    const canEditJobOffer = Boolean(jobPerms?.canEditJobOffer);
    const canOpenJobOffer = Boolean(jobPerms?.canViewDetails);
    const handleEditClick = useCallback(() => {
        navigate(jobOfferEditPath(workerJobOfferDetails?.id, JO_EDIT_FROM.WORKER));
    }, [navigate, workerJobOfferDetails]);

    const [isSendTemplatePopup, setIsSendTemplatePopup] = useState(false);
    const mainDuties = Array.isArray(workerJobOfferDetails?.skills_info) ? workerJobOfferDetails.skills_info : [];

    const entityClick = useCallback((e) => {
        e.preventDefault();
        navigate(jobOfferDetailsPath(workerJobOfferDetails?.id, JO_FROM.WORKER), { state: { jobOfferObj: workerJobOfferDetails } });
    }, [navigate, workerJobOfferDetails]);

    /* Add link inserts the Job Offer link into the open chat draft and does nothing else — never copied, never sent (U-0132) */
    const handleCopyLinkClick = useCallback((e) => {
        e.preventDefault();
        if (isAdminUser() || workerGlobalSendLink === 'y') onHandleTextCopyInChat(workerJobOfferDetails);
    }, [workerJobOfferDetails, onHandleTextCopyInChat, workerGlobalSendLink]);

    /* Share (X-03): the Share JO Link category to this worker, about this Job Offer */
    const handleSendTemplateClick = useCallback((e) => {
        e.preventDefault();
        setIsSendTemplatePopup(true);
    }, []);

    const granted = (key) => Array.isArray(isWorkerPermissionAccessInfo?.[key]) && isWorkerPermissionAccessInfo[key].includes('y');
    /* Add link is shown only when its handler will act: the JO share-link grant AND the Worker Send Link grant (PERM 5.9.2) */
    const canCopyLink = isAdmin || (granted('worker_jo_share_link') && workerGlobalSendLink === 'y');
    const canSendTemplate = granted('worker_jo_share') || isAdmin;
    const canAccept = granted('worker_interview_accept') || isAdmin;
    const canDecline = granted('worker_interview_decline') || isAdmin;
    const canReschedule = granted('worker_interview_reschedule') || isAdmin;
    const canInterviewReport = granted('worker_interview_report') || isAdmin;
    /* proto panelFor (JO-007) / W-33: Request Interview follows the JO lifecycle — the list row's `job_status_key` decides:
       `open` enables it, `expiring` shows it disabled with the status as tooltip; a row without the key falls back to the JO detail's status id. */
    const joStatusKey = isJobInfo?.job_status_key;
    const joOpenForRequests = joStatusKey
        ? joStatusKey === WKD_JO_STATUS_KEY.OPEN
        : (workerJobOfferDetails?.status == null || JO_OPEN_STATUS_IDS.includes(Number(workerJobOfferDetails.status)));
    const joExpiringForRequests = joStatusKey === WKD_JO_STATUS_KEY.EXPIRING;
    const [isScheduleInterview, setScheduleInterview] = useState(false);
    const [isSuggestOpen, setSuggestOpen] = useState(false);
    const [isReportOpen, setReportOpen] = useState(false);
    const [isFillReportOpen, setFillReportOpen] = useState(false);
    const [scheduleParams, setScheduleParams] = useState({ type: 're-schedule', from: 'from-upcoming' });
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmBusy, setConfirmBusy] = useState(false);

    const openSchedule = useCallback((type, from) => {
        setScheduleParams({ type, from });
        setScheduleInterview(true);
    }, []);

    /* every action returns its request promise so the confirm modal can stay locked until it settles */
    const handleInterviewAction = useCallback((status) => {
        const onSuccess = (res) => {
            showSuccessOrError(res);
            if (!res?.error) {
                if (handleRefreshJobList) handleRefreshJobList();
                handleOnClose();
            }
        };
        /* U-0326: no Suggested (17) branch — Apply / Decline on a suggestion are not worker-tab actions */
        const stage = isJobInfo?.job_stage_status;
        if (status === 'accept') {
            if (stage === 4) {
                return dispatch(workerJobOfferAcceptInterview({ interview_id: isJobInfo?.interview_id, log_type: "worker", type: 'worker' })).then(onSuccess);
            }
        } else if (status === 'decline') {
            if (stage === 4) {
                return dispatch(workerJobOfferCancelnterview({ interview_id: isJobInfo?.interview_id, log_type: "worker", cancel_flag: "declined" })).then(onSuccess);
            }
        } else if (status === 'cancel') {
            return dispatch(workerJobOfferCancelnterview({ interview_id: isJobInfo?.interview_id, log_type: "worker", cancel_flag: "cancelled" })).then(onSuccess);
        }
        return Promise.resolve();
    }, [dispatch, isJobInfo, handleRefreshJobList, handleOnClose]);

    const [interviewMeta, setInterviewMeta] = useState(null);
    useEffect(() => {
        const interviewId = isJobInfo?.interview_id;
        if (!interviewId) {
            setInterviewMeta(null);
            return undefined;
        }
        let alive = true;
        dispatch(fetchInterviewDetails(interviewId)).then((res) => {
            if (alive && !res?.error) setInterviewMeta(res?.payload?.data || null);
        });
        return () => { alive = false; };
    }, [dispatch, isJobInfo?.interview_id]);

    const interviewMethodLocation = useMemo(() => {
        const type = interviewMeta?.worker_interview_type ?? isJobInfo?.worker_interview_type;
        const method = JO_INTERVIEW_METHOD[Number(type)] ? translation(JO_INTERVIEW_METHOD[Number(type)].key) : '';
        const location = Number(type) === WKD_JO_IN_PERSON_TYPE
            ? (interviewMeta?.office_location_info?.branch_name || isJobInfo?.branch_display_name)
            : '';
        return [method, location].filter(Boolean).join(' · ');
    }, [interviewMeta, isJobInfo?.worker_interview_type, isJobInfo?.branch_display_name]);

    const handleManageJob = useCallback((action) => {
        return dispatch(workerManageJob({
            worker_id: workerProfileInfo?.id,
            job_id: workerJobOfferDetails?.id,
            action,
        })).then((res) => {
            showSuccessOrError(res);
            if (!res?.error) {
                if (handleRefreshJobList) handleRefreshJobList();
                handleOnClose();
            }
        });
    }, [dispatch, workerProfileInfo?.id, workerJobOfferDetails?.id, handleRefreshJobList, handleOnClose]);

    const salary = workerJobOfferDetails?.fixed_salary > 0
        ? `$${ workerJobOfferDetails?.fixed_salary } ${ workerJobOfferDetails?.expected_salary?.name || '' }`
        : workerJobOfferDetails?.expected_salary?.name;
    const languages = Array.isArray(workerJobOfferDetails?.spoken_language_info)
        ? workerJobOfferDetails.spoken_language_info.map(lang => lang.name).filter(Boolean)
        : [];
    const coworker = `${ workerJobOfferDetails?.coworker_status ? translation('key_yes') : translation('key_no') }${ workerJobOfferDetails?.co_worker_count ? ` ${ workerJobOfferDetails.co_worker_count } ${ translation('key_other') }` : '' }`;
    const interviewType = interviewMeta?.worker_interview_type ?? isJobInfo?.worker_interview_type;
    const interviewOwners = [interviewMeta?.cs_owner?.name, interviewMeta?.cs_assistant?.name, interviewMeta?.interpreter_owner?.name].filter(Boolean);

    return (
        <div className="wkd-jo-detail-card jo-detail">
            <div className="wkd-jo-detail-head">
                <span className="wkd-jo-detail-title">{ translation('key_job_offer') }</span>
                <div className="wkd-jo-toolbar">
                    { canSendTemplate && (
                        <button type="button" className="wkd-jo-toolbtn" onClick={ handleSendTemplateClick }>
                            { shareIcon }<span>{ translation('key_share') }</span>
                        </button>
                    ) }
                    { canCopyLink && (
                        <button type="button" className="wkd-jo-toolbtn" onClick={ handleCopyLinkClick }>
                            { linkIcon }<span>{ translation('key_add_link') }</span>
                        </button>
                    ) }
                    { canEditJobOffer && (
                        <button type="button" className="wkd-jo-toolbtn" onClick={ handleEditClick }>
                            { translation('key_edit') }
                        </button>
                    ) }
                </div>
                <span className="grow" />
                <span className="wkd-jo-cs" data-mc-static="true" data-mc-owner-control="static" aria-label={ `${ translation('key_cs_owner') } ${ isJobInfo?.cs_name || '—' }` }>
                    <span className="wkd-jo-cs-av">{ getInitials(isJobInfo?.cs_name || '') }</span>
                    <span className="wkd-jo-cs-lbl">{ translation('key_cs_owner') } ·</span>
                    <span className="wkd-jo-cs-name">{ isJobInfo?.cs_name || '—' }</span>
                </span>
            </div>

            <div className="jo-body">
                <div>
                    <div className="wkd-jo-titleblock">
                        <div className="refrow">
                            { canOpenJobOffer
                                ? <button type="button" className="mc-code-link" onClick={ entityClick }>{ workerJobOfferDetails?.reference_id }</button>
                                : <span className="mc-code-plain" data-mc-plain-job-offer-ref="true">{ workerJobOfferDetails?.reference_id }</span> }
                            <WkdStageChip label={ wkdStageLabel(isJobInfo) } tone={ wkdStageTone(isJobInfo) } />
                        </div>
                        <div className="wkd-jo-headline">{ workerJobOfferDetails?.head_line }</div>
                        { (isJobInfo?.employers_fullname || workerJobOfferDetails?.employer_details?.nationality_info?.name) && (
                            <div className="wkd-jo-fam">
                                { isJobInfo?.employers_fullname
                                    || `${ workerJobOfferDetails.employer_details.nationality_info.name } Family` }
                            </div>
                        ) }
                        <div className="wkd-jo-loc">
                            { workerJobOfferDetails?.employer_details?.district_info?.name }
                            { workerJobOfferDetails?.employer_details?.house_size ? `, ${ workerJobOfferDetails.employer_details.house_size } sq. ft.` : '' }
                        </div>
                    </div>

                    <div className="wkd-jo-sec">
                        <div className="wkd-lbl">{ translation('key_job_description') }</div>
                        <div className="wkd-jo-desc">{ workerJobOfferDetails?.detailed_description }</div>
                    </div>

                    <div className="wkd-jo-sec">
                        <div className="wkd-lbl">{ translation('key_main_duties') }</div>
                        <div className="wkd-jo-chips">
                            { mainDuties.map((item) => (
                                <span key={ item.id } className="wkd-jo-chip">{ item.name }</span>
                            )) }
                        </div>
                    </div>

                    <div className="wkd-jo-kv">
                        <div className="wkd-flbl k">{ translation('key_salary') }</div>
                        <div className="v">{ salary || '—' }</div>
                        <div className="wkd-flbl k">{ translation('key_start_date') }</div>
                        <div className="v mono">
                            { workerJobOfferDetails?.asap === 1 ? "ASAP" : (workerJobOfferDetails?.start_date ? dayjs(workerJobOfferDetails.start_date).format('D MMM YYYY') : '—') }
                        </div>
                        <div className="wkd-flbl k">{ translation('key_language') }</div>
                        <div className="v">
                            { languages.length ? languages.map((name) => <div key={ name }>{ name }</div>) : '—' }
                        </div>
                    </div>

                    <div className="wkd-jo-sec">
                        <div className="wkd-lbl">{ translation('key_other_responsibilities') }</div>
                        <div className="wkd-jo-chips">
                            { workerJobOfferDetails?.responsibilities_info?.map((item) => (
                                <span key={ item.id } className="wkd-jo-chip">{ item.name }</span>
                            )) }
                        </div>
                    </div>

                    <div className="wkd-jo-kv last">
                        <div className="wkd-flbl k">{ translation('key_accommodation') }</div>
                        <div className="v">{ workerJobOfferDetails?.helper_accommadation?.name || '—' }</div>
                        <div className="wkd-flbl k">{ translation('key_coworker') }</div>
                        <div className="v">{ coworker }</div>
                        <div className="wkd-flbl k">{ translation('key_day_off') }</div>
                        <div className="v">{ jobOfferDayOffNames(workerJobOfferDetails).join(', ') || '—' }</div>
                    </div>
                </div>

                <div className="wkd-jo-side">
                    { isJobInfo?.job_stage_status === 1 && (
                        <div className="wkd-jo-appacts">
                            <div className="wkd-flbl">{ translation('key_actions') }</div>
                            <div className="wkd-jo-int-acts">
                                { canAccept && (
                                    <button type="button" className="wkd-jo-int-btn primary" onClick={ () => setConfirmAction('apply') }>
                                        { translation('key_apply') }
                                    </button>
                                ) }
                                { canDecline && (
                                    <button type="button" className="wkd-jo-int-btn" onClick={ () => setConfirmAction('remove') }>
                                        { translation('key_remove') }
                                    </button>
                                ) }
                            </div>
                        </div>
                    ) }
                    { [2, 3].includes(isJobInfo?.job_stage_status) && canDecline && (
                        <div className="wkd-jo-appacts">
                            <div className="wkd-flbl">{ translation('key_actions') }</div>
                            <div className="wkd-jo-int-acts">
                                <button type="button" className="wkd-jo-int-btn primary" onClick={ () => setConfirmAction('cancel_application') }>
                                    { translation('key_cancel_application') }
                                </button>
                            </div>
                        </div>
                    ) }
                    { isJobInfo?.interview_date && isJobInfo?.interview_time && (
                        <div className="wkd-jo-int">
                            <div className="wkd-jo-int-toprow">
                                <span className="wkd-jo-int-title">{ translation('key_interview') }</span>
                                <WkdStageChip label={ wkdStageLabel(isJobInfo) } tone={ wkdStageTone(isJobInfo) } variant="tag" />
                            </div>
                            { isJobInfo?.job_stage_status === 4 && workerProfileInfo?.fullname && (
                                <div className="wkd-jo-int-ctx">
                                    <span className="wkd-jo-acting">{ translation('key_acting_for') } { workerProfileInfo.fullname }</span>
                                </div>
                            ) }
                            <div className="wkd-jo-int-rows">
                                <div>
                                    <div className="wkd-flbl">{ translation('key_date') } &amp; { translation('key_time') }</div>
                                    <div className="wkd-jo-int-dt">
                                        { dayjs(`${ isJobInfo.interview_date } ${ isJobInfo.interview_time }`).format(JO_INTERVIEW_CELL_FORMAT) }
                                    </div>
                                </div>
                                { interviewMethodLocation && (
                                    <div>
                                        <div className="wkd-flbl">{ translation('key_method') } · { translation('key_location') }</div>
                                        <div className="wkd-jo-int-v">{ ivMethodIcon(interviewType) }<span>{ interviewMethodLocation }</span></div>
                                    </div>
                                ) }
                                { /* the team saved on the interview (Delta 28 Sep Required Interview CS Assistant; backend 12 Oct ask 5): read-only */ }
                                { interviewOwners.length > 0 && (
                                    <div data-wkd-interview-owners="true">
                                        <div className="wkd-flbl">{ translation('key_cs_owner') } · { translation('key_cal_task_cs_assistant') } · { translation('key_interpreter') }</div>
                                        <div className="wkd-jo-int-v"><span>{ interviewOwners.join(' · ') }</span></div>
                                    </div>
                                ) }
                                { isJobInfo?.job_stage_status === 4 && (
                                    <div className="wkd-jo-int-acts">
                                        { canAccept && (
                                            <button type="button" className="wkd-jo-int-btn primary" onClick={ () => setConfirmAction('int_accept') }>
                                                { translation('key_accept_for_worker') }
                                            </button>
                                        ) }
                                        { canDecline && (
                                            <button type="button" className="wkd-jo-int-btn" onClick={ () => setConfirmAction('int_decline') }>
                                                { translation('key_decline_for_worker') }
                                            </button>
                                        ) }
                                        { canReschedule && (
                                            <button type="button" className="wkd-jo-int-btn" onClick={ () => setSuggestOpen(true) }>
                                                { translation('key_suggest_another_time') }
                                            </button>
                                        ) }
                                    </div>
                                ) }
                                { isJobInfo?.job_stage_status === 5
                                    && isJobInfo?.interview_date && isJobInfo?.interview_time
                                    && dayjs(`${ isJobInfo.interview_date } ${ isJobInfo.interview_time }`).isBefore(dayjs()) && (
                                    <div className="wkd-jo-endpassed">
                                        <span className="wkd-jo-endpassed-dot" />
                                        <div>
                                            <strong>{ translation('key_scheduled_end_passed') }</strong>
                                            <span>{ translation('key_report_determines_outcome') }</span>
                                            { /* proto panelFor noteAct: the report is filled from the note (Interview Report grant) */ }
                                            { canInterviewReport && isJobInfo?.interview_id && (
                                                <button type="button" className="wkd-jo-endpassed-act" onClick={ () => setFillReportOpen(true) }>
                                                    { translation('key_fill_interview_report') } →
                                                </button>
                                            ) }
                                        </div>
                                    </div>
                                ) }
                                { isJobInfo?.job_stage_status === 5 && (
                                    <div className="wkd-jo-int-acts">
                                        { interviewMeta?.worker_interview_type === 1 && interviewMeta?.google_meet_link && (
                                            <button type="button" className="wkd-jo-int-btn primary" onClick={ () => window.open(interviewMeta.google_meet_link, '_blank', 'noopener') }>
                                                { translation('key_open_interview') }
                                            </button>
                                        ) }
                                        { canReschedule && (
                                            <button
                                                type="button"
                                                className={ `wkd-jo-int-btn${ (interviewMeta?.worker_interview_type === 1 && interviewMeta?.google_meet_link) ? '' : ' primary' }` }
                                                onClick={ () => openSchedule('re-schedule', 'from-upcoming') }
                                            >
                                                { translation('key_reschedule') }
                                            </button>
                                        ) }
                                        { canDecline && (
                                            <button type="button" className="wkd-jo-int-btn" onClick={ () => setConfirmAction('int_cancel') }>
                                                { translation('key_cancel') }
                                            </button>
                                        ) }
                                    </div>
                                ) }
                                { isJobInfo?.job_stage_status === 6 && isJobInfo?.interview_id && canInterviewReport && (
                                    <div className="wkd-jo-int-acts">
                                        <button type="button" className="wkd-jo-int-btn primary wide" onClick={ () => setReportOpen(true) }>
                                            { translation('key_view_interview_report') }
                                        </button>
                                    </div>
                                ) }
                                { isJobInfo?.job_stage_status === 10 && canReschedule && (joOpenForRequests || joExpiringForRequests) && (
                                    <div className="wkd-jo-int-acts">
                                        <button
                                            type="button"
                                            className="wkd-jo-int-btn primary wide"
                                            disabled={ joExpiringForRequests }
                                            title={ joExpiringForRequests ? translation('key_wkr_request_interview_expiring_tip') : undefined }
                                            onClick={ () => openSchedule('schedule', 'from-cancelled') }
                                        >
                                            { translation('key_request_interview') }
                                        </button>
                                    </div>
                                ) }
                            </div>
                        </div>
                    ) }
                </div>
            </div>

            { isSendTemplatePopup && (
                <React.Suspense fallback={ <Spinner /> }>
                    <WkdSendTemplateModal onClose={ () => setIsSendTemplatePopup(false) } title={ translation('key_send_template') } site={ SEND_SITE.WORKER_JOB_OFFER }
                        context={ { worker_id: workerProfileInfo?.id, job_offer_id: workerJobOfferDetails?.id } } userType="worker" slug="share_jo_link"
                        parties={ { worker: { name: workerProfileInfo?.fullname || "", phone: workerProfileInfo?.whatsapp_number || workerProfileInfo?.mobile_number || "" } } }
                        contextLabel={ translation('key_job_offer') } />
                </React.Suspense>
            ) }

            { isReportOpen && (
                <React.Suspense fallback={ <Spinner /> }>
                    <WkdInterviewReportPanel
                        onClose={ () => setReportOpen(false) }
                        jobRef={ workerJobOfferDetails?.reference_id }
                        detail={ interviewMeta }
                        workerName={ workerProfileInfo?.fullname }
                        employerName={ isJobInfo?.employers_fullname }
                        methodLocation={ interviewMethodLocation }
                    />
                </React.Suspense>
            ) }

            { isFillReportOpen && (
                <React.Suspense fallback={ <Spinner /> }>
                    <GcInterviewReport
                        mode="mark"
                        interviewId={ isJobInfo?.interview_id }
                        jobStageStatusName={ wkdStageLabel(isJobInfo) || '' }
                        onClose={ () => setFillReportOpen(false) }
                        onSubmitted={ () => {
                            setFillReportOpen(false);
                            if (handleRefreshJobList) handleRefreshJobList();
                            handleOnClose();
                        } }
                    />
                </React.Suspense>
            ) }

            { isSuggestOpen && (
                <React.Suspense fallback={ <Spinner /> }>
                    <WkdSuggestTimeDrawer
                        onClose={ () => setSuggestOpen(false) }
                        jobRef={ workerJobOfferDetails?.reference_id }
                        workerName={ workerProfileInfo?.fullname }
                        proposedDt={ (isJobInfo?.interview_date && isJobInfo?.interview_time)
                            ? dayjs(`${ isJobInfo.interview_date } ${ isJobInfo.interview_time }`).format(JO_INTERVIEW_CELL_FORMAT) : '' }
                        methodLocation={ interviewMethodLocation }
                        row={ isJobInfo }
                        workerId={ workerProfileInfo?.id }
                        interviewTypeNum={ interviewMeta?.worker_interview_type ?? isJobInfo?.worker_interview_type }
                        onSent={ handleRefreshJobList }
                    />
                </React.Suspense>
            ) }

            { isScheduleInterview && (
                <React.Suspense fallback={ <Spinner /> }>
                    <GcScheduleInterview
                        jobId={ isJobInfo?.job_id }
                        handleOnClose={ () => setScheduleInterview(false) }
                        selectedjobWorkerObj={ isJobInfo }
                        interviewType={ scheduleParams.type }
                        scheduleInterviewFrom={ scheduleParams.from }
                        employerId={ workerJobOfferDetails?.employer_id }
                        onScheduled={ () => {
                            if (handleRefreshJobList) handleRefreshJobList();
                            handleOnClose();
                        } }
                    />
                </React.Suspense>
            ) }

            { confirmAction && (() => {
                const workerName = workerProfileInfo?.fullname || '';
                const workerCode = workerProfileInfo?.reference_id || '';
                const closeConfirm = () => { if (!confirmBusy) setConfirmAction(null); };
                /* the modal stays open and locked until the request settles, then closes */
                const run = (fn, arg) => () => {
                    setConfirmBusy(true);
                    Promise.resolve(fn(arg)).finally(() => {
                        setConfirmBusy(false);
                        setConfirmAction(null);
                    });
                };
                const workerRow = {
                    label: translation('key_worker'),
                    value: <>{ workerName }{ workerCode ? <> · <span className="mc-code">{ workerCode }</span></> : null }</>,
                };
                const employerRow = isJobInfo?.employers_fullname
                    ? [{ label: translation('key_employer'), value: isJobInfo.employers_fullname }] : [];
                const joRow = {
                    label: translation('key_job_offer'),
                    value: <span className="mc-code">{ workerJobOfferDetails?.reference_id }</span>,
                };
                const stageRow = { label: translation('key_current_stage'), value: wkdStageLabel(isJobInfo) };
                const timeRows = (isJobInfo?.interview_date && isJobInfo?.interview_time)
                    ? [{ label: translation('key_proposed_time'), value: dayjs(`${ isJobInfo.interview_date } ${ isJobInfo.interview_time }`).format(JO_INTERVIEW_CELL_FORMAT), mono: true }] : [];
                const mlRows = interviewMethodLocation
                    ? [{ label: `${ translation('key_method') } · ${ translation('key_location') }`, value: interviewMethodLocation }] : [];
                const behalfNote = (actionLabel, consequenceKey) => (
                    <>{ translation('key_youre_performing') } <b>{ actionLabel }</b> { translation('key_on_behalf_of') } <b>{ workerName }</b>. { translation(consequenceKey) } { translation('key_action_recorded') }</>
                );
                const interviewNote = (verbKey) => (
                    <>{ translation(verbKey) } <b>{ translation('key_on_behalf_of') } { workerName }</b>. { translation('key_action_recorded') }</>
                );
                const CFG = {
                    apply: {
                        title: `${ translation('key_apply') } — ${ translation('key_for_worker') }`,
                        rows: [workerRow, ...employerRow, joRow, stageRow],
                        note: behalfNote(translation('key_apply'), 'key_jo_moves_applied'),
                        tone: 'primary',
                        confirmLabel: `${ translation('key_confirm') } — ${ translation('key_apply') }`,
                        onConfirm: run(handleManageJob, WKD_MANAGE_JOB_ACTION.APPLY),
                    },
                    remove: {
                        title: `${ translation('key_remove') } — ${ translation('key_for_worker') }`,
                        rows: [workerRow, ...employerRow, joRow, stageRow],
                        note: behalfNote(translation('key_remove'), 'key_pair_suppressed'),
                        tone: 'danger',
                        confirmLabel: `${ translation('key_confirm') } — ${ translation('key_remove') }`,
                        /* W-32: declining an invitation is its own action (WORKER_DECLINED_INVITE; NOT_INVITED once the stage moved on) */
                        onConfirm: run(handleManageJob, WKD_MANAGE_JOB_ACTION.DECLINE_INVITE),
                    },
                    cancel_application: {
                        title: `${ translation('key_cancel_application') } — ${ translation('key_for_worker') }`,
                        rows: [workerRow, ...employerRow, joRow, stageRow],
                        note: behalfNote(translation('key_cancel_application'), 'key_pair_suppressed'),
                        tone: 'danger',
                        confirmLabel: `${ translation('key_confirm') } — ${ translation('key_cancel_application') }`,
                        onConfirm: run(handleManageJob, WKD_MANAGE_JOB_ACTION.CANCEL_APPLICATION),
                    },
                    int_accept: {
                        title: translation('key_accept_interview_for_worker'),
                        rows: [workerRow, ...employerRow, joRow, ...timeRows, ...mlRows],
                        note: interviewNote('key_youre_accepting_interview'),
                        tone: 'primary',
                        confirmLabel: `${ translation('key_confirm') } — ${ translation('key_accept_for_worker') }`,
                        onConfirm: run(handleInterviewAction, 'accept'),
                    },
                    int_decline: {
                        title: translation('key_decline_interview_for_worker'),
                        rows: [workerRow, ...employerRow, joRow, ...timeRows, ...mlRows],
                        note: interviewNote('key_youre_declining_interview'),
                        tone: 'danger',
                        confirmLabel: `${ translation('key_confirm') } — ${ translation('key_decline_for_worker') }`,
                        onConfirm: run(handleInterviewAction, 'decline'),
                    },
                    int_cancel: {
                        title: translation('key_cancel_interview'),
                        rows: [
                            joRow,
                            ...(timeRows.length ? [{ ...timeRows[0], label: translation('key_scheduled') }] : []),
                            ...mlRows,
                            { label: translation('key_acting_for'), value: workerName },
                        ],
                        note: (
                            <>{ translation('key_interview_becomes_cancelled') } <span className="danger-word">{ translation('key_cancelled') }</span>. { translation('key_participants_notified') } { translation('key_action_recorded') }</>
                        ),
                        tone: 'danger',
                        confirmLabel: translation('key_cancel_interview'),
                        onConfirm: run(handleInterviewAction, 'cancel'),
                    },
                };
                const cfg = CFG[confirmAction];
                return cfg ? <WkdJoConfirmModal { ...cfg } onClose={ closeConfirm } loading={ confirmBusy } /> : null;
            })() }
        </div>
    );
};

WkdJobOfferDetail.propTypes = {
    handleOnClose: PropTypes.func,
    workerJobOfferDetails: PropTypes.object,
    isJobInfo: PropTypes.object,
    onHandleTextCopyInChat: PropTypes.func,
    permissionList: PropTypes.oneOfType([PropTypes.object, PropTypes.array]).isRequired,
    isWorkerPermissionAccessInfo: PropTypes.any,
    isAdmin: PropTypes.any,
    workerProfileInfo: PropTypes.object,
    handleRefreshJobList: PropTypes.func,
};

export default React.memo(WkdJobOfferDetail);
