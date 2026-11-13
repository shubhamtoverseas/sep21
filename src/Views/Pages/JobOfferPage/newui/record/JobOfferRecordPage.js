import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import "../../../WorkerPage/worker-detail/newui/worker-details.css";
import "./job-offer-record.css";
import Btn from "../../../../../components/ui/Btn";
import Icon from "../../../../../components/Icon/Icon";
import CustomSpinner from "../../../../../components/ReusableComponents/CustomSpinner";
import routes from "../../../routes/routesConfig";
import { changeJobOfferStatus, fetchChangedJobStatus, fetchJobDetail, fetchWorkerJobEncriptedID } from "../../../../../redux/Slices/job-offer/JobOfferSlice";
import { fetchEmployerDetail } from "../../../../../redux/Slices/employer/EmployerSlice";
import { useJobOfferPermissions } from "../../../../../utils/permissions/jobPermissionsUtils";
import { showErrorMessage, showSuccessOrError } from "../../../../../services/commonService";
import { REACT_JOB_VIEW_URL, REACT_WORKER_VIEW_URL } from "../../../../../services/apiPath";
import { gcCanOpenDetails } from "../../../Conversaction/newui/gcHelpers";
import RecordFollowUp from "../../../../../components/follow-up/RecordFollowUp";
import FollowUpSheet from "../../../../../components/follow-up/FollowUpSheet";
import { CAL_FROM_JOB_OFFER, CAL_TASK_SOURCE, CAL_TASK_SOURCE_LABEL, FU_COPY_KEY } from "../../../Calendar/newui/calendarConstants";
import { headingCase } from "../../../../../utils/utils";
import translation from "../../../../../utils/translation";
import JoStatusMenu from "./JoStatusMenu";
import JoChangeOwnerDialog from "./JoChangeOwnerDialog";
import { CHAT_USER_TYPES } from "../../../Employer/newui/employerNewUiConstants";
import JobOfferRecordHeader from "./JobOfferRecordHeader";
import JoSendTemplate from "./JoSendTemplate";
import JoApplicantList from "./JoApplicantList";
import JoApplicantProfile from "./JoApplicantProfile";
import JoApplicantDialogs from "./JoApplicantDialogs";
import useJoApplicantActions from "./useJoApplicantActions";
import { applicantActions, followUpContextOf } from "./joApplicantActions";
import { joStatusLabel } from "../JoStatusTag";
import {
    JO_ACTION, JO_APPLICANT_COPY, JO_EDIT_FROM, JO_LOAD_STATE, JO_RECORD_COPY, JO_RETURN_STATE_KEY, JO_ROUTE_QUERY, JO_SEND_TEMPLATE,
    JO_SHARE_WORKER_TEMPLATE, jobOfferEditPath, workerDetailsFromJobOfferPath,
} from "../../jobOfferConstants";

const JobOfferSuggestModal = lazy(() => import("../suggest/JobOfferSuggestModal"));
const JoApplicantViewModal = lazy(() => import("./JoApplicantViewModal"));
const GcMiniChat = lazy(() => import("../../../Conversaction/newui/GcMiniChat"));
const CommonIndividualChat = lazy(() => import("../../../../../components/Processing/CommonIndividualChat"));

const readReturnState = () => { try { return JSON.parse(sessionStorage.getItem(JO_RETURN_STATE_KEY) || 'null'); } catch { return null; } };
const writeReturnState = (state) => { try { sessionStorage.setItem(JO_RETURN_STATE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } };
const clearReturnState = () => { try { sessionStorage.removeItem(JO_RETURN_STATE_KEY); } catch { /* storage unavailable */ } };
const httpStatusOf = (res) => Number(res?.payload?.data?.status ?? res?.payload?.data?.httpStatus ?? res?.payload?.httpStatus ?? 0);

const JobOfferRecordPage = () => {
    const { jobId } = useParams();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const from = searchParams.get(JO_ROUTE_QUERY.FROM);
    const seed = location.state?.jobOfferObj && String(location.state.jobOfferObj.id) === String(jobId) ? location.state.jobOfferObj : null;

    const { jobDetailView, changedJOStatus } = useSelector((state) => state.jobOffer);
    const currentEmployer = useSelector((state) => state.employer.currentEmployer);
    const { permissionList, ownerOnboardingList } = useSelector((state) => state.users);
    const detail = jobDetailView && String(jobDetailView?.id) === String(jobId) ? jobDetailView : null;
    const employerId = detail?.employer_id ?? seed?.employer_id ?? null;
    const perms = useJobOfferPermissions(permissionList, ownerOnboardingList, employerId, typeof detail?.is_owner === 'boolean' ? detail.is_owner : undefined);
    const { canViewDetails, canChangeJoStatus, canSuggestWorker, canFollowUp, canChangeOwner } = perms;
    const [isChangeOwner, setIsChangeOwner] = useState(false);
    /* the header launcher's `openWith` — a row Follow Up opens the same panel (and count) with the applicant context */
    const openFollowUpWith = useRef(null);
    /* the Follow Up panel mounts INSIDE the profile column in place of the applicant profile (prototype v211
       renderProfile → #jod-profile), never as a drawer over the page; the row editor opens over it */
    const [fuPane, setFuPane] = useState(null);        /* { initialTaskId, createContext, nonce } while open */
    const fuControls = useRef({});
    const canOpenWorker = useMemo(() => gcCanOpenDetails('worker', permissionList), [permissionList]);
    const employer = currentEmployer?.employer_id && String(currentEmployer.employer_id) === String(employerId) ? currentEmployer : null;

    const returnState = useMemo(() => {
        const saved = readReturnState();
        return saved && String(saved.jobId) === String(jobId) ? saved : null;
    }, [jobId]);
    useEffect(() => { if (returnState) clearReturnState(); }, [returnState]);

    const [loadState, setLoadState] = useState(detail ? JO_LOAD_STATE.READY : JO_LOAD_STATE.LOADING);
    const [selected, setSelected] = useState(null);
    const [isSuggestOpen, setIsSuggestOpen] = useState(false);
    const [isApplicantView, setIsApplicantView] = useState(Boolean(returnState?.applicantView));
    const [sendTemplate, setSendTemplate] = useState(null);
    const [rightChat, setRightChat] = useState(null);
    const [groupChat, setGroupChat] = useState(null);
    const [refreshNonce, setRefreshNonce] = useState(0);
    const workerDetails = useRef({});

    const load = useCallback(() => {
        setLoadState(JO_LOAD_STATE.LOADING);
        dispatch(fetchJobDetail(jobId)).then((res) => {
            if (!res?.error) { setLoadState(JO_LOAD_STATE.READY); return; }
            const code = httpStatusOf(res);
            setLoadState(code === 403 || code === 401 ? JO_LOAD_STATE.DENIED : code === 404 ? JO_LOAD_STATE.INVALID : JO_LOAD_STATE.ERROR);
        });
        dispatch(fetchChangedJobStatus({ job_id: jobId, page_type: 'edit' }));
    }, [dispatch, jobId]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (employerId && String(currentEmployer?.employer_id) !== String(employerId)) dispatch(fetchEmployerDetail({ employer_id: employerId }));
    }, [dispatch, employerId, currentEmployer?.employer_id]);

    const refresh = useCallback(() => {
        setRefreshNonce((n) => n + 1);
        dispatch(fetchJobDetail(jobId));
    }, [dispatch, jobId]);

    const handleStatusPick = useCallback((item) => {
        dispatch(changeJobOfferStatus({ job_id: jobId, status: item.id, ...(item.type === 'extend' && { type: item.type }) })).then((res) => {
            showSuccessOrError(res);
            if (!res?.error) {
                dispatch(fetchChangedJobStatus({ job_id: jobId, page_type: 'edit' }));
                refresh();
            }
        });
    }, [dispatch, jobId, refresh]);

    const handleSelect = useCallback((row) => {
        setSelected((prev) => (String(prev?.id) === String(row?.id) ? (row || null) : row || null));
        setRightChat(null);
    }, []);

    /* the header button toggles the list (prototype: a second press closes); a row Follow Up / an arrival (re)opens with its payload */
    const launchFollowUp = useCallback((payload) => {
        setRightChat(null);
        setFuPane((prev) => (prev && !payload?.createContext && !payload?.initialTaskId
            ? null
            : { initialTaskId: payload?.initialTaskId || null, createContext: payload?.createContext || null, nonce: (prev?.nonce || 0) + 1 }));
    }, []);
    const closeFollowUp = useCallback(() => {
        setFuPane(null);
        document.querySelector('[data-fu-launcher="job-offer"]')?.focus();
    }, []);
    const handleFuCount = useCallback((n) => fuControls.current.setCount?.(n), []);
    const handleFuDenied = useCallback(() => { fuControls.current.deny?.(); setFuPane(null); }, []);
    const rememberWorkerDetail = useCallback((workerId, data) => { workerDetails.current[workerId] = data; }, []);
    const workerDetailFor = useCallback((row) => workerDetails.current[row?.id], []);

    const saveReturnState = useCallback(() => {
        writeReturnState({ jobId, selectedId: selected?.id ?? null, applicantView: isApplicantView });
    }, [jobId, selected?.id, isApplicantView]);

    const openWorker = useCallback((row) => {
        if (!canOpenWorker || !row?.id) return;
        saveReturnState();
        navigate(workerDetailsFromJobOfferPath(row.id));
    }, [canOpenWorker, navigate, saveReturnState]);

    /* the editor opens read-only without the Edit grant (U-0136); Details View is the only gate here */
    const openEdit = useCallback(() => {
        if (!canViewDetails) return;
        saveReturnState();
        navigate(jobOfferEditPath(jobId, JO_EDIT_FROM.RECORD));
    }, [canViewDetails, jobId, navigate, saveReturnState]);

    /* Share from the Applicant View opens Send Template over it: the view returns when the template closes */
    const shareJob = useCallback(() => { setIsApplicantView(false); setSendTemplate({ template: JO_SEND_TEMPLATE, reopenView: true }); }, []);
    /* Share (worker): the stage-aware worker profile link is generated first; the server resolves {{worker_profile_link}} from it
       and the worker / Job Offer tokens from the records */
    const shareWorker = useCallback((row) => {
        if (!row?.id) return;
        dispatch(fetchWorkerJobEncriptedID({ worker_id: row.id, job_id: jobId, employer_id: employerId, interview_id: row.interview?.id })).then((res) => {
            showErrorMessage(res);
            if (res?.error) return;
            const data = res?.payload?.data || {};
            const link = `${ REACT_WORKER_VIEW_URL }?worker_id=${ data.worker_id }&job_id=${ data.job_id }&employer_id=${ data.employer_id }${ data.interview_id ? `&interview_id=${ data.interview_id }` : '' }&token=${ data.token }`;
            setSendTemplate({ template: JO_SHARE_WORKER_TEMPLATE, workerId: row.id, links: { worker_profile_link: link } });
        });
    }, [dispatch, jobId, employerId]);
    const closeSendTemplate = useCallback(() => {
        setSendTemplate((open) => { if (open?.reopenView) setIsApplicantView(true); return null; });
    }, []);

    const openEmployerChatWithDraft = useCallback((draft) => {
        if (!employer) return;
        setIsApplicantView(false);
        setFuPane(null);           /* the chat takes the column the panel held */
        setRightChat({
            userType: CHAT_USER_TYPES.EMPLOYER,
            name: employer.name,
            draft,
            entity: {
                employer_name: `${ employer.name || '' } ${ employer.surname || '' }`.trim(),
                employer_user_id: employer.employer_user_id,
                employer_id: employer.employer_id,
                whatsapp_number: `${ employer.whatsapp_country_code || '' }${ employer.whatsapp_number || '' }`,
            },
        });
    }, [employer]);
    const addJobLink = useCallback(() => {
        dispatch(fetchWorkerJobEncriptedID({ job_id: jobId, employer_id: employerId })).then((res) => {
            showErrorMessage(res);
            if (res?.error) return;
            const data = res?.payload?.data || {};
            openEmployerChatWithDraft(`${ REACT_JOB_VIEW_URL }?job_id=${ data.job_id }&employer_id=${ data.employer_id }&token=${ data.token }`);
        });
    }, [dispatch, jobId, employerId, openEmployerChatWithDraft]);
    const addWorkerLink = useCallback((row) => {
        dispatch(fetchWorkerJobEncriptedID({ worker_id: row.id, job_id: jobId, employer_id: employerId, interview_id: row.interview?.id })).then((res) => {
            showErrorMessage(res);
            if (res?.error) return;
            const data = res?.payload?.data || {};
            const link = `${ REACT_WORKER_VIEW_URL }?worker_id=${ data.worker_id }&job_id=${ data.job_id }&employer_id=${ data.employer_id }${ data.interview_id ? `&interview_id=${ data.interview_id }` : '' }&token=${ data.token }`;
            openEmployerChatWithDraft(link);
        });
    }, [dispatch, jobId, employerId, openEmployerChatWithDraft]);
    const messageWorker = useCallback((row) => {
        setFuPane(null);
        setRightChat({
            userType: 'worker',
            name: row.name,
            draft: '',
            entity: { worker_name: row.name, worker_user_id: row.user_id, worker_id: row.id },
        });
    }, []);
    const closeRightChat = useCallback(() => setRightChat(null), []);

    const openGroupChat = useCallback((row) => {
        setGroupChat({
            media_type: '', entity_id: '', entity_type: 'group', friend_type: CHAT_USER_TYPES.GROUP_TEAM, group_type: 'job', platform: 'app',
            id: row.job_stage_id, job_worker_id: row.id, job_interview_id: row.interview?.id,
        });
    }, []);

    const actions = useJoApplicantActions({ jobId, jobRef: detail?.reference_id, employerId, employer, onRefresh: refresh, onGroupChat: openGroupChat, workerDetailFor });
    const actionsFor = useCallback((row) => applicantActions(row, perms, actions.reportFlags), [perms, actions.reportFlags]);
    /* row Follow Up: the one Job Offer task source with the applicant + interview as its exact context */
    const runAction = useCallback((actionId, row) => {
        if (actionId === JO_ACTION.FOLLOW_UP) { openFollowUpWith.current?.(followUpContextOf(row)); return undefined; }
        return actions.run(actionId, row);
    }, [actions]);

    const backLabel = from ? (JO_RECORD_COPY.backTo[from] || translation('key_back')) : null;
    const goBack = useCallback(() => navigate(-1), [navigate]);

    /* a neutral denial never discloses the reference (prototype JOD-ACCESS-01) */
    const crumbFor = (showRef) => (
        <nav className="jor-routebar" aria-label={ translation('key_job_offers') }>
            { backLabel
                ? <button type="button" className="back" onClick={ goBack }>‹ { backLabel }</button>
                : <Link className="here" to={ routes.jobOffers }>{ headingCase(translation('key_job_offers')) }</Link> }
            <span className="sep">/</span>
            <span className="here-static">{ JO_RECORD_COPY.title }</span>
            { showRef && <code className="mono">{ detail?.reference_id || '' }</code> }
        </nav>
    );
    const crumb = crumbFor(true);

    if (loadState === JO_LOAD_STATE.DENIED || (detail && !canViewDetails)) {
        return (
            <div className="jor">
                { crumbFor(false) }
                <section className="jor-state" role="status" data-mc-denial="neutral" data-mc-record-denied="1">
                    <b>{ translation('key_not_available') }</b>
                    <span>{ JO_RECORD_COPY.deniedText }</span>
                </section>
            </div>
        );
    }
    if (loadState === JO_LOAD_STATE.INVALID) {
        return (
            <div className="jor">
                { crumb }
                <section className="jor-state" role="status">
                    <b>{ JO_RECORD_COPY.invalidTitle }</b>
                    <code className="mono">{ String(jobId || '') }</code>
                </section>
            </div>
        );
    }
    if (loadState === JO_LOAD_STATE.ERROR && !detail) {
        return (
            <div className="jor">
                { crumb }
                <section className="jor-state" role="status">
                    <b>{ translation('key_couldnt_load_this_view') }</b>
                    <div><Btn variant="secondary" onClick={ load }>{ translation('key_retry') }</Btn></div>
                </section>
            </div>
        );
    }
    if (!detail) {
        return <div className="jor">{ crumb }<div className="jor-state"><CustomSpinner /></div></div>;
    }

    const statusMenu = canChangeJoStatus ? <JoStatusMenu items={ changedJOStatus } onPick={ handleStatusPick } /> : null;
    /* Follow Up (1 Oct Job Offer #2): on the record surface beside the controls, never inside the Applicant View; owner / non-owner grant */
    /* sheet head: "JO-2024-08311 · Chan Wai Ming · Open" (FIN-F01c); facts: employer + status (prototype task-ui) */
    const employerName = detail.employers_fullname || employer?.name || '';
    const followUpSource = {
        type: CAL_TASK_SOURCE.JOB_OFFER, id: detail.id, ref: detail.reference_id || '', sub: [employerName, joStatusLabel(detail.status)].filter(Boolean).join(' · '),
        kindLabel: CAL_TASK_SOURCE_LABEL.job_offer, facts: { employer_name: employerName || null, status: joStatusLabel(detail.status) || null }, from: CAL_FROM_JOB_OFFER,
    };
    const followUp = (
        <RecordFollowUp source={ followUpSource } granted={ canFollowUp } onLaunch={ launchFollowUp }>
            { ({ count, open, openWith, launcherRef, setCount, deny }) => {
                openFollowUpWith.current = openWith;
                fuControls.current = { setCount, deny };
                return (
                <span ref={ launcherRef } className="jor-fu">
                    { /* prototype: the launcher is a toggle carrying aria-pressed + the accent pressed treatment while the panel is open */ }
                    <Btn variant="secondary" title={ translation(FU_COPY_KEY.followUp) } aria-pressed={ Boolean(fuPane) } data-fu-launcher="job-offer" onClick={ open }>
                        { translation(FU_COPY_KEY.followUp) }
                        { count > 0 && <span className="fu-count" data-fu-count={ count }>{ count }</span> }
                    </Btn>
                </span>
                );
            } }
        </RecordFollowUp>
    );

    return (
        <div className="jor" data-jo-record={ detail.id }>
            { crumb }
            <JobOfferRecordHeader detail={ detail } seed={ seed } employer={ employer } followUp={ followUp } onStatusMenu={ statusMenu } onApplicantView={ canViewDetails ? () => setIsApplicantView(true) : null } applicantViewOpen={ isApplicantView } onChangeOwner={ canChangeOwner ? () => setIsChangeOwner(true) : null } />
            { isChangeOwner && <JoChangeOwnerDialog jobId={ detail.id } currentOwnerName={ detail.cs_owner_name || detail.cs_name || '' } currentAssistant={ detail.cs_assistant?.id != null ? { id: detail.cs_assistant.id, name: detail.cs_assistant.name || detail.cs_assistant_name || '' } : null } onClose={ () => setIsChangeOwner(false) } onDone={ refresh } /> }

            <div className="jor-split">
                <JoApplicantList
                    jobId={ detail.id }
                    detail={ detail }
                    canSuggest={ canSuggestWorker }
                    showInvited={ Boolean(perms?.canInvitedWorkerChat) }
                    selectedId={ selected?.id ?? returnState?.selectedId ?? null }
                    selectionResolved={ Boolean(selected) }
                    onSelect={ handleSelect }
                    onOpenSuggest={ () => setIsSuggestOpen(true) }
                    actionsFor={ actionsFor }
                    onAction={ runAction }
                    refreshNonce={ refreshNonce }
                    canOpenWorker={ canOpenWorker }
                    onOpenWorker={ openWorker }
                />
                { rightChat ? (
                    <section className="jor-profile jor-chat-host" aria-label={ rightChat.name || '' }>
                        <div className="tools">
                            <button type="button" className="wd-btn" onClick={ closeRightChat }><Icon name="chev_left" size={ 13 } /> { JO_APPLICANT_COPY.backToProfile }</button>
                            <b className="mc-person-name">{ rightChat.name }</b>
                        </div>
                        <Suspense fallback={ <CustomSpinner /> }>
                            <GcMiniChat entityDetails={ rightChat.entity } user_type={ rightChat.userType } initialDraft={ rightChat.draft } />
                        </Suspense>
                    </section>
                ) : fuPane ? (
                    <section className="jor-profile jor-fu-pane" aria-label={ translation(FU_COPY_KEY.followUp) }>
                        <FollowUpSheet
                            key={ fuPane.nonce }
                            embedded
                            source={ followUpSource }
                            initialTaskId={ fuPane.initialTaskId }
                            createContext={ fuPane.createContext }
                            onClose={ closeFollowUp }
                            onCount={ handleFuCount }
                            onDenied={ handleFuDenied }
                        />
                    </section>
                ) : (
                    <JoApplicantProfile
                        row={ selected }
                        perms={ perms }
                        canOpenWorker={ canOpenWorker }
                        onOpenWorker={ openWorker }
                        onShare={ shareWorker }
                        onAddLink={ addWorkerLink }
                        onMessage={ messageWorker }
                        onDetail={ rememberWorkerDetail }
                    />
                ) }
            </div>

            <JoApplicantDialogs actions={ actions } onRefresh={ refresh } />
            { isSuggestOpen && (
                <Suspense fallback={ null }>
                    <JobOfferSuggestModal
                        jobId={ detail.id }
                        detail={ detail }
                        employer={ employer }
                        perms={ perms }
                        canOpenWorker={ canOpenWorker }
                        onOpenWorker={ openWorker }
                        onClose={ () => setIsSuggestOpen(false) }
                        onChanged={ refresh }
                    />
                </Suspense>
            ) }
            { isApplicantView && (
                <Suspense fallback={ null }>
                    <JoApplicantViewModal
                        detail={ detail }
                        employer={ employer }
                        perms={ perms }
                        onShare={ () => { setIsApplicantView(false); shareJob(); } }
                        onAddLink={ addJobLink }
                        onEdit={ openEdit }
                        onClose={ () => setIsApplicantView(false) }
                    />
                </Suspense>
            ) }
            { sendTemplate && employer && (
                <JoSendTemplate detail={ detail } currentEmployer={ employer } jobOfferId={ jobId } template={ sendTemplate.template } workerId={ sendTemplate.workerId || null } links={ sendTemplate.links || null } onClose={ closeSendTemplate } />
            ) }
            { groupChat && (
                <Suspense fallback={ null }>
                    <CommonIndividualChat entityDetails={ groupChat } handleOnCloseChat={ () => setGroupChat(null) } user_type={ CHAT_USER_TYPES.GROUP_TEAM } />
                </Suspense>
            ) }
        </div>
    );
};

export default JobOfferRecordPage;
