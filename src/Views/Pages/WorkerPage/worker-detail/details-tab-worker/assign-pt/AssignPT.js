import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
const SelectAgentBranch = lazy(() => import("../../../../../../components/worker/assign-pt/SelectAgentBranch"));
const SearchPartner = lazy(() => import("../../../../../../components/worker/assign-pt/SearchPartner"));
const CustomSpinner = lazy(() => import("../../../../../../components/ReusableComponents/CustomSpinner"));
const ActivityStatusCollapsible = lazy(() => import("../../../../../../components/activity-status/ActivityStatusCollapsible"));
const WkdPartnerInquiryDialog = lazy(() => import("../../newui/WkdPartnerInquiryDialog"));
import { canSendPartnerInquiry, sendPartnerAssignedMessage } from "../../newui/partnerInquiry";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { workerNationalityList } from "../../../../../../components/ReusableComponents/constants";
import { setWorkerLoading, clearWorkerLoading, saveAssignPTWorker } from "../../../../../../redux/Slices/worker/WorkerSlice";
import { fetchMappingAgencies } from "../../../../../../redux/Slices/settings/agencies/AgenciesSlice";
import { searchPartnerStaff } from '../../../../../../redux/Slices/common/cs/CsSlice';
import { getPermissionValue } from "../../../../../../services/permissionService";
import translation from "../../../../../../utils/translation";
import "../../newui/wkd-docs-partner.css";
import { REGISTRATION_ORIGIN_LABELS } from "../../../workerModuleConstants";

const registrationOriginLabel = (type) => (type ? (REGISTRATION_ORIGIN_LABELS[type] || REGISTRATION_ORIGIN_LABELS.default) : '—');
const infoIcon = (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="8" cy="8" r="6" /><path d="M8 7.2v4M8 4.8h.01" />
    </svg>
);

/*
 * Assign Partner (WORKER.md §16.2, §16.15, §16.16; CR W-02 ¶3): its own Not Assigned / Assigned lifecycle — no Change Status and no
 * worker-facing Send Template here (P-76). The partner inquiry (the approved WhatsApp template to the proposed PT, package ST-04 /
 * ST-06, ruling Q5) asks whether the Partner will accept; sending it changes nothing — assignment happens only through the explicit
 * Assign action (P-77, F-12), which then tells the worker in-app with category 65 (ruling A).
 */
const AssignPT = ({ activityLogList, onRefreshStatus, assignPartnerPermission, isAdmin, workerDetailTabInfo, handleOpenChat }) => {
    const dispatch = useDispatch();
    const [isViewAssignPT, setIsViewAssignPT] = useState(false);
    const [isViewAssignStaff, setIsViewAssignStaff] = useState(false);
    const [isStatus, setIsStatus] = useState(false);
    const { workerProfileInfo } = useSelector((state) => state.worker)
    const mappingAgencies = useSelector((state) => state.agencies.mappingAgencies);
    const { status, partnerStaffList } = useSelector((state) => state.cs);
    const [agencyInfo, setAgencyInfo] = useState(null);
    const [agencyBranchInfo, setAgencyBranchInfo] = useState(null);
    const [submitStatus, setSubmitStatus] = useState(false);
    const [inquiryOpen, setInquiryOpen] = useState(false);
    const [inquirySent, setInquirySent] = useState(false);
    const workerPhilNationality = useMemo(() => workerNationalityList().find((nationality) => nationality.key === "philippines"), []);
    const workerIndoNationality = useMemo(() => workerNationalityList().find((nationality) => nationality.key === "indonesia"), []);
    const isIndonesian = workerIndoNationality?.id === workerDetailTabInfo?.nationality?.id;
    const isFilipino = workerPhilNationality?.id === workerDetailTabInfo?.nationality?.id;
    /* conflict sheet U-0204: one screen, two names — Assign Partner (Filipino) / Assign PT (Indonesian) */
    const assignLabel = translation(isIndonesian ? 'key_assign_pt' : 'key_assign_partner');
    /* U-0203 / §16.3: reassignment is the separately granted top-level Change Partner permission */
    const permissionList = useSelector((state) => state.users.permissionList);
    const canChangePartner = isAdmin || getPermissionValue(permissionList?.data, 'worker', 'worker_change_partner') === 'y';
    useEffect(() => {
        dispatch(fetchMappingAgencies({ type: "branch", status: 1, worker_id: workerProfileInfo?.id }));
    }, [dispatch, workerProfileInfo?.id]);

    useEffect(() => {
        workerProfileInfo?.worker_overseas_detail_info?.agency_details &&
            setAgencyBranchInfo({ ...workerProfileInfo?.worker_overseas_detail_info?.agency_details, pt_interpretor_name: workerProfileInfo?.worker_overseas_detail_info?.pt_name });
    }, [workerProfileInfo]);

    const handleRowClick = useCallback((agency) => {
        setAgencyInfo({ ...agency, worker_id: workerProfileInfo.id })
    }, [workerProfileInfo?.id]);

    const handleRowClickNext = useCallback(() => {
        setIsViewAssignPT(true);
        dispatch(searchPartnerStaff({
            type: "worker",
            branch_id: agencyInfo?.branch_id
        }))
    }, [dispatch, agencyInfo?.branch_id]);

    const handleSelectStaff = useCallback((staff) => {
        setAgencyInfo((prev) => ({ ...prev, staff: staff }))
    }, []);

    const handleSubmitPT = useCallback(() => {
        let payload = {
            pt_staff_id: agencyInfo?.staff?.id,
            worker_id: workerProfileInfo.id,
            pt_staff_agency_id: agencyInfo?.id,
            pt_staff_branch_id: agencyInfo?.branch_id
        }
        dispatch(setWorkerLoading())
        setIsStatus(true)
        dispatch(saveAssignPTWorker(payload)).then(res => {
            if (res?.payload?.status) {
                ShowToast("success", res?.payload?.message);
                dispatch(clearWorkerLoading())
                setIsStatus(false)
                setSubmitStatus(true)
                onRefreshStatus('assign-pt');
                setInquiryOpen(false);
                /* the actual assignment: the worker is told in-app (category 65, ruling A) */
                sendPartnerAssignedMessage(dispatch, { workerUserId: workerDetailTabInfo?.user_id, workerName: workerDetailTabInfo?.fullname, senderUserId: workerDetailTabInfo?.onboarding2_user_id });
            } else {
                /* a refusal ({status:false}, e.g. ACCESS_NOT_FOUND) is a toast only — no refetch, the picked
                   agency / staff stay on screen for a retry (Priyanka, 11 Nov) */
                ShowToast("error", res?.payload?.message);
                setIsStatus(false)
                setSubmitStatus(false)
                setInquiryOpen(false);
                dispatch(clearWorkerLoading())
            }
        });
    }, [dispatch, agencyInfo, workerProfileInfo?.id, onRefreshStatus, workerDetailTabInfo?.user_id, workerDetailTabInfo?.fullname, workerDetailTabInfo?.onboarding2_user_id]);

    /* §16.15 / OvN 64: the pre-assignment inquiry (the approved WhatsApp template to the proposed PT) is its own action — it never
     * assigns. U-0204: it exists for Filipino / Indonesian workers only; Thai / Bangladeshi assignment is direct. ST-04 / ST-06: it
     * needs the journey's Assign Partner — Send Template grant. */
    const canSendInquiry = Boolean(agencyInfo?.staff?.whatsapp_country_code && agencyInfo?.staff?.whatsapp) && (isIndonesian || isFilipino) && !inquirySent
        && canSendPartnerInquiry(assignPartnerPermission, isAdmin);
    const handleSendInquiry = useCallback(() => {
        if (!agencyInfo?.staff || !canSendInquiry) return;
        setInquiryOpen(true);
    }, [agencyInfo?.staff, canSendInquiry]);

    const handleSelectStaffCancel = useCallback(() => {
        setIsViewAssignStaff(false);
        setAgencyInfo({ ...agencyInfo, staff: "", worker_id: workerProfileInfo.id });
        setSubmitStatus(false);
        setIsStatus(false);
        setInquirySent(false);
        setInquiryOpen(false);
        onRefreshStatus('assign-pt');
        setIsViewAssignPT(false);
    }, [onRefreshStatus, agencyInfo, workerProfileInfo?.id]);

    const handleSearchInput = useCallback((e) => {
        dispatch(fetchMappingAgencies({ type: "branch", search_text: e.target.value, status: 1, worker_id: workerProfileInfo?.id }));
    }, [dispatch, workerProfileInfo?.id]);

    const handleChangePT = useCallback(() => {
        setIsViewAssignPT(false)
        setIsViewAssignStaff(false)
        setInquirySent(false)
        setAgencyInfo({})
    }, []);

    const [previousRelationship, setPreviousRelationship] = useState(null);

    const handleChangeAgent = useCallback(() => {
        setPreviousRelationship(agencyBranchInfo);
        setIsViewAssignPT(false)
        setIsViewAssignStaff(false)
        setAgencyInfo({})
        setAgencyBranchInfo(null);
    }, [agencyBranchInfo]);

    useEffect(() => {
        if (agencyBranchInfo) setPreviousRelationship(null);
    }, [agencyBranchInfo]);

    /* the inquiry was sent: the dialog closes and the proposed PT stays selected for the separate Assign; nothing is assigned (§16.15) */
    const handleInquirySent = useCallback(() => {
        setInquiryOpen(false);
        setInquirySent(true);
        setIsViewAssignStaff(true);
    }, []);
    const handleInquiryClosed = useCallback(() => setInquiryOpen(false), []);

    const handleIsChatOpen = useCallback((userInfo) => {
        if (userInfo) {
            handleOpenChat(userInfo);
        }
    }, [handleOpenChat]);

    const isAssigned = workerProfileInfo?.worker_overseas_detail_info?.pt_assign_status == "verified";
    const isChangeMode = Boolean(previousRelationship) && !agencyBranchInfo;
    /* §16.3 / OvN 21: no Worker Code yet reads "Not Assigned" (no Copy) */
    const workerCode = workerProfileInfo?.reference_id || workerDetailTabInfo?.reference_id || translation('key_not_assigned');

    return (
        <div className="assign-pt-view mt-3 wkd-g2">
            <Suspense fallback={ <div>{ translation('key_loading') }...</div> }>
            {/* v18.6 g2AssignmentHTML: card shell — title + assignment chip + meta */}
            <div className="g2-card">
            <div className="g2-card-header g2-clean-header">
                <h2 className="g2-title">{ isChangeMode ? translation('key_change_partner') : assignLabel }</h2>
                { !isChangeMode && (
                    <span className={ `g2-status-tag g2-assignment-state${ isAssigned ? ' assigned' : '' }` }>
                        <span className="g2-lifecycle-dot" />
                        { isAssigned ? translation('key_assigned') : translation('key_not_assigned') }
                    </span>
                ) }
                <span className="wkd-g2-spacer" />
                { agencyBranchInfo && canChangePartner && <button type="button" className="g2-button" onClick={ handleChangeAgent }>{ translation('key_change_partner') }</button> }
            </div>
            <div className="wkd-g2-body">
                <div className="col-12 expanded-col p-0">
                    {/* v18.6 g2ReassignmentHTML: current → proposed compare header */}
                    { previousRelationship && !agencyBranchInfo && (
                        <>
                            <div className="wkd-g2-change">
                                <div className="cur">
                                    <div className="lbl">{ translation('key_current_relationship') }</div>
                                    <div className="ag">{ previousRelationship?.agency_name } ({ previousRelationship?.agency_code })</div>
                                    <div className="br">{ previousRelationship?.branch_name }{ previousRelationship?.branch_code ? ` (${ previousRelationship.branch_code })` : '' }</div>
                                    <div className="code">{ workerCode }</div>
                                </div>
                                <div className="arr">
                                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 8h10M9.5 4.5 13 8l-3.5 3.5" /></svg>
                                </div>
                                <div className="pro">
                                    <div className="lbl">{ translation('key_proposed_relationship') }</div>
                                    <div className="hint">{ translation('key_select_new_partner_below') }</div>
                                </div>
                            </div>
                        </>
                    ) }
                    { (agencyInfo) && !agencyBranchInfo && <p className="fz16 mb22">
                        { translation('key_assign_agent_from') } <span className="">{ translation('key_agency') }</span><span className=""> { agencyInfo?.agency_name } { agencyInfo?.code } </span>
                        <span className="">{ translation('key_branch') }</span> <span className=""> { agencyInfo?.branch_name } { agencyInfo?.branch_code }</span>
                    </p> }
                    {/* v18.6 g2AssignedSummaryHTML: readonly relationship grid */}
                    { (agencyBranchInfo) && (
                        <div className="g2-grid">
                            <div>
                                <div className="g2-field-label">{ translation('key_partner_agency') }</div>
                                <div className="g2-field is-readonly"><span>{ agencyBranchInfo?.agency_name } ({ agencyBranchInfo?.agency_code })</span><span className="wkd-g2-active">{ translation('key_active') }</span></div>
                            </div>
                            <div>
                                <div className="g2-field-label">{ translation('key_partner_branch') }</div>
                                <div className="g2-field is-readonly"><span>{ agencyBranchInfo?.branch_name }{ agencyBranchInfo?.branch_code ? ` (${ agencyBranchInfo.branch_code })` : '' }</span><span className="wkd-g2-active">{ translation('key_active') }</span></div>
                            </div>
                            <div>
                                <div className="g2-field-label">{ translation('key_pt') }</div>
                                <div className="g2-field is-readonly"><span>{ agencyBranchInfo?.pt_interpretor_name }</span></div>
                            </div>
                            <div>
                                <div className="g2-field-label">{ translation('key_registration_origin') }</div>
                                <div className="g2-field is-readonly"><span>{ registrationOriginLabel(workerProfileInfo?.registration_type) }</span></div>
                            </div>
                            <div>
                                <div className="g2-field-label">{ translation('key_worker_code') }</div>
                                <div className="g2-field is-readonly"><span className="wkd-g2-code">{ workerCode }</span></div>
                            </div>
                        </div>
                    ) }
                    { status === 'loading' && <CustomSpinner /> }
                    {/* Back button logic */ }
                    { (isViewAssignPT || isViewAssignStaff) && !agencyBranchInfo && (
                        <button
                            className="btn btn-link mb-3 px-0"
                            type="button"
                            onClick={ () => {
                                if (isViewAssignStaff) {
                                    setIsViewAssignStaff(false);
                                    setAgencyInfo({ ...agencyInfo, staff: undefined });
                                } else if (isViewAssignPT) {
                                    setIsViewAssignPT(false);
                                    setAgencyInfo({});
                                }
                            } }
                        >
                            &larr; { translation('key_back') }
                        </button>
                    ) }
                    { !isViewAssignPT && !agencyBranchInfo ? (
                        <>
                            <div className="w-50 mb24">
                                <div className="input-group customInputGroup mb-md-0 mb24">
                                    <div className="input-group-prepend">
                                        <span className="input-group-text pl-0 border-0 bg-transparent">
                                            <i className="ri-search-line" />
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        className="form-control border-0 setting-search-filter bg-transparent small grey9b pl-0"
                                        aria-label={ translation('key_search') }
                                        placeholder={ translation('key_search_pt_code') }
                                        onChange={ handleSearchInput }
                                    />
                                </div>
                            </div>
                            { (assignPartnerPermission.includes('edit') || isAdmin) && <div className="row m-0">
                                <SelectAgentBranch onRowClick={ handleRowClick } mappingAgencies={ mappingAgencies } />
                            </div> }
                        </>
                    ) : (
                        (!isViewAssignStaff && !agencyBranchInfo && status !== 'loading') && <SearchPartner onClickSelectStaff={ handleSelectStaff } staffList={ partnerStaffList } handleIsChatOpen={ handleIsChatOpen } />
                    ) }
                    { (isViewAssignStaff && !agencyBranchInfo) &&
                        <div className="assign-pt-view">
                            <p className="fz20 fw-500 mb-1">{ agencyInfo?.agency_name } <span className="">({ agencyInfo?.code })</span></p>
                            <span>{ agencyInfo?.branch_name } <span className="">({ agencyInfo?.branch_code })</span> { translation('key_branch') }</span>
                            <span className="d-block mt-1 text-underline">{ agencyInfo?.staff?.email }</span>
                            <p className="fz18 fw-400 black mt-1">{ agencyInfo?.staff?.mobile_number }</p>
                        </div>
                    }

                    { isChangeMode && (
                        <div className="g2-callout wkd-g2-change-note">
                            { infoIcon }
                            <div>{ translation('key_wkr_confirming_versions_the_relationship_and_issues_') }</div>
                        </div>
                    ) }
                    { !agencyBranchInfo ?
                        <div className="bottom-bar d-flex justify-content-end p-3 bg-light">
                            { isViewAssignStaff ? (
                                <div key="buttons">
                                    { (!submitStatus) ?
                                        <div>
                                            <button type="button" disabled={ isStatus } className="g2-button" onClick={ handleChangePT }>{ translation('key_change_pt') }</button>
                                            <button type="button" disabled={ isStatus } className="g2-button primary" onClick={ handleSubmitPT }>{ isStatus ? translation('key_processing') + "..." : assignLabel }</button>
                                        </div>
                                        :
                                        <div>
                                            <button type="button" disabled={ submitStatus } className="g2-button">{ translation('key_submitted') }</button>
                                        </div>
                                    }

                                </div>
                            ) :
                                (
                                    (!isViewAssignPT && agencyInfo?.branch_id) ?
                                        <button type="button" onClick={ handleRowClickNext } className="g2-button primary">{ translation('key_next_select_agent') }</button>
                                        : ""
                                )
                            }
                            { (!isViewAssignStaff && isViewAssignPT) ?
                                <><button type="button" onClick={ handleSelectStaffCancel } className="g2-button">{ translation('key_cancel') }</button>
                                    {/* two distinct actions: the inquiry (Send Template to the PT) and the explicit Assign */}
                                    { canSendInquiry && <button type="button" onClick={ handleSendInquiry } disabled={ isStatus } className="g2-button">{ translation('key_wkr_send_inquiry') }</button> }
                                    <button type="button" onClick={ handleSubmitPT } disabled={ isStatus || !agencyInfo?.staff } aria-disabled={ isStatus || !agencyInfo?.staff } className="g2-button primary">{ isStatus ? translation('key_processing') + "..." : translation('key_assign') }</button></>

                                : "" }
                        </div>
                        : null
                    }
                </div>
                <ActivityStatusCollapsible variant="flat" defaultOpen documentStatus={ activityLogList } />
            </div>
            </div>

            {/* { isChatOpened && <CommonIndividualChat entityDetails={ workerChatInfo } handleOnCloseChat={ () => setIsChatOpened(false) } user_type="user" /> } */ }

            { inquiryOpen && agencyInfo?.staff && <WkdPartnerInquiryDialog pt={ agencyInfo.staff } agencyName={ agencyInfo?.agency_name } branchName={ agencyInfo?.branch_name }
                worker={ { name: workerDetailTabInfo?.fullname, nationality: workerDetailTabInfo?.nationality?.name, code: workerDetailTabInfo?.reference_id } }
                onClose={ handleInquiryClosed } onSent={ handleInquirySent } /> }

            </Suspense>
        </div >
    );
};

AssignPT.propTypes = {
    activityLogList: PropTypes.any,
    onRefreshStatus: PropTypes.func,
    assignPartnerPermission: PropTypes.any,
    isAdmin: PropTypes.any,
    workerDetailTabInfo: PropTypes.object,
    handleOpenChat: PropTypes.func
};

export default React.memo(AssignPT);
