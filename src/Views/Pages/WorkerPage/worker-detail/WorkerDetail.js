import React, { useRef, useEffect, useState, useMemo, useCallback, lazy } from "react";
import { useLocation, useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from "react-redux";
import "./newui/worker-details.css";
import { dispatchWithHandling } from "../../../../utils/dispatchHandler";
import { workerTypeList } from "../../../../components/ReusableComponents/constants";
const WkdActivityTab = lazy(() => import("./newui/WkdActivityTab"));
const WorkerContractListing = lazy(() => import("./newui/listing/WorkerContractListing"));
const WorkerHeaderSection = lazy(() => import("./newui/WorkerHeaderSection"));
const WkdContextRail = lazy(() => import("./newui/context/WkdContextRail"));
const ProfileTab = lazy(() => import("./profile-tab/ProfileTab"));
const DetailsTabWorker = lazy(() => import("./details-tab-worker/DetailsTabWorker"));
const CustomSpinner = lazy(() => import("../../../../components/ReusableComponents/CustomSpinner"));
import WkdEditWorkerDrawer from "./newui/WkdEditWorkerDrawer";
const EditProfilePopup = lazy(() => import("../update-worker/EditWorker"));
import { ShowToast } from "../../../../components/show-toast/ShowToast";
const WorkerJobOfferTab = lazy(() => import("./joboffer-tab/WorkerJobOfferTab"));
const CommonIndividualChat = lazy(() => import("../../../../components/Processing/CommonIndividualChat"));
const GcMiniChat = lazy(() => import("../../Conversaction/newui/GcMiniChat"));
import { REACT_JOB_VIEW_URL } from '../../../../../src/services/apiPath';
import { changeWorkerStatusGlobal } from "../../../../redux/Slices/AddWorker";
import { assignPartnerGrant, canSendPartnerInquiry } from "./newui/partnerInquiry";
import { clearStateDetails, fetchWorkerCommonDetailInfo, fetchWorkerDetailTabInfo, fetchWorkerActivityLog, fetchWorkerValidateStatus, fetchWorkerJobOfferList, fetchWorkerPhotoInfo, fetchDuplicateWorkerCount } from "../../../../redux/Slices/worker/WorkerSlice";
import { fetchWorkerStatuses } from "../../../../redux/Slices/common/workerStatuses/WorkerStatusesSlice";
import translation from "../../../../utils/translation";
import {
  getPermissionValue, isAdminUser,
  getWorkerPermissionAccess, getCurrentUser,
  showErrorMessage
} from "../../../../services/commonService";
const WorkerInsuranceListing = lazy(() => import("./newui/listing/WorkerInsuranceListing"));
const WorkerInvoiceListing = lazy(() => import("./newui/listing/WorkerInvoiceListing"));
import { fetchWorkerJobEncriptedID } from "../../../../redux/Slices/job-offer/JobOfferSlice";
import ConfirmModal from "../../../../components/ui/ConfirmModal";
import { canViewWorkerDuplicates } from "../../../../utils/permissions/workerPermissionUtils";
import {
  NEWUI_LISTING_TABS, WKD_TAB_KEYS, WKD_TAB_ALIASES, WKD_PARTNER_HIDDEN_TABS, WKD_ENTRY_ERROR, WKD_IMAGE_STATUS_VERIFIED,
  JOB_OFFER_ID_PARAM, WORKER_STATUS_ID, WORKER_STATUS_CHANGE_PAYLOAD, STALE_VERSION_CODE, workerDetailsPath,
} from "../workerModuleConstants";

const WorkerDetails = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const limit = 100;
  const isAdmin = isAdminUser();
  const query = new URLSearchParams(location.search);
  const action = query.get('action');
  const staffTypeInitial = getCurrentUser()?.data?.staff?.staff_type;
  const { worker_id, tab: tabParam } = useParams();
  /* the tab lives in the URL (/workers/details/:id/:tab?) so reload, Back and shared links keep it;
   * a legacy segment (`address`) lands on the tab that absorbed it; an unknown segment is an invalid entry, not a silent fallback */
  const tabAlias = tabParam ? WKD_TAB_ALIASES[tabParam] : undefined;
  const tabFromUrlRaw = tabParam ? (WKD_TAB_KEYS.includes(tabParam) ? tabParam : (tabAlias || null)) : undefined;
  /* a partner addressing a host-only tab lands on the permitted view — that tab does not exist for them */
  const tabFromUrl = (staffTypeInitial === 'partner' && WKD_PARTNER_HIDDEN_TABS.includes(tabFromUrlRaw)) ? 'profile' : tabFromUrlRaw;
  const [activeTab, setActiveTabState] = useState(tabFromUrl || (staffTypeInitial === 'partner' ? "profile" : "job-offer"));
  const setActiveTab = useCallback((key) => {
    setActiveTabState(key);
    navigate(`${ workerDetailsPath(worker_id, null, key) }${ window.location.search }`, { replace: true });
  }, [navigate, worker_id]);
  useEffect(() => {
    if (tabAlias) setActiveTab(tabAlias);
  }, [tabAlias, setActiveTab]);
  const [searchParams] = useSearchParams();
  const jobOfferIdParam = searchParams.get(JOB_OFFER_ID_PARAM);
  const [editPopup, setEditPopup] = useState(false);
  const [isChatOpened, setIsChatOpened] = useState(false);
  const [railChatMode, setRailChatMode] = useState(false);
  const [workerChatInfo, setWorkerChatInfo] = useState("");
  const [isChatWith, setIsChatWith] = useState("worker");
  const [isProcessComplete, setIsProcessComplete] = useState(null);
  /* why the record could not be opened: DENIED (403, names nothing) · INVALID (unknown id / segment) · FAILED (anything else, with Retry) */
  const [entryError, setEntryError] = useState(tabFromUrl === null ? WKD_ENTRY_ERROR.INVALID : null);
  const [retryTick, setRetryTick] = useState(0);
  /* Change Status confirm step: { status, isBackToPreviousStatus, name } while the dialog is open */
  const [pendingStatus, setPendingStatus] = useState(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const { status, workerProfileInfo, workerDetailTabInfo, workerJobOfferList, workerPhotoInfo, duplicateWorkerCount } = useSelector((state) => state.worker)
  const { workerStatuses, allWorkerStatuses } = useSelector((state) => state.workerStatuses || []);
  const { permissionList, ownerOnboardingList } = useSelector((state) => state.users);
  // Get staffType once on initial render (does not need state or useEffect)
  const staffType = useMemo(() => getCurrentUser()?.data?.staff?.staff_type, []);
  // Only check owner onboarding roles once on initial mount (e.g., page refresh)
  const [isWorkerPermissionAccessInfo, setIsWorkerPermissionAccessInfo] = useState({});

  useEffect(() => {
    setIsWorkerPermissionAccessInfo(getWorkerPermissionAccess(ownerOnboardingList, worker_id, permissionList?.data));
  }, [permissionList, ownerOnboardingList, worker_id]);
  /* View Worker Duplicates (OvN 58): host grant only — partners never see the duplicates card, drawer or count (catalogue fallback in the util) */
  const canViewDuplicates = canViewWorkerDuplicates(permissionList);

  /* worker A → worker B: nothing of A survives — slice record state, entry error, one-shot handoffs */
  const handledHandoff = useRef(false);
  const handledUnknownJobOffer = useRef(false);
  useEffect(() => {
    setEntryError(tabFromUrl === null ? WKD_ENTRY_ERROR.INVALID : null);
    setIsProcessComplete(null);
    handledHandoff.current = false;
    handledUnknownJobOffer.current = false;
    return () => { dispatch(clearStateDetails()); };
  }, [dispatch, worker_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (action === "photo" || action === "biodata" || action === "eregistration" || action === "peos-certificate" || action === "tesda" || action === "passport" || action === "indonesian-id" || action === "birth-certificate" || action === "family-certificate" || action === "education-certificate" || action === "assign-pt" || action === "medical" || action === "submit-documents" || action === "training-certificate" || action === "labor-id") {
      setActiveTab('profile');
    }
  }, [action, setActiveTab]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await dispatch(fetchWorkerCommonDetailInfo({
        "worker_id": worker_id,
        "type": "biodata"
      }));
      /* 403 → denied screen (names nothing); 404 / an empty answer → invalid entry; any other failure → error + Retry.
       * The dependent fetches run only for a record that opened. */
      if (res?.error) {
        const httpStatus = res?.payload?.httpStatus;
        setEntryError(httpStatus === 403 ? WKD_ENTRY_ERROR.DENIED : httpStatus === 404 ? WKD_ENTRY_ERROR.INVALID : WKD_ENTRY_ERROR.FAILED);
        return;
      }
      if (res?.payload && res.payload.status === false && !res.payload?.data) {
        setEntryError(WKD_ENTRY_ERROR.INVALID);
        return;
      }
      if (res?.payload?.status) {
        setIsProcessComplete(true);
      }
      dispatchWithHandling(dispatch, fetchWorkerPhotoInfo({
        "worker_id": worker_id,
        "type": "image"
      }));
      dispatch(fetchWorkerJobOfferList({ worker_id: worker_id, "page": 1, "limit": limit }));
      dispatch(fetchWorkerDetailTabInfo({ "worker_id": worker_id, type: 'basic' }));
      dispatch(fetchWorkerStatuses({ worker_id }));
    };
    fetchData();
  }, [dispatch, worker_id, limit, retryTick]);

  useEffect(() => {
    if (canViewDuplicates && workerProfileInfo?.user_id) {
      dispatch(fetchDuplicateWorkerCount({ "user_id": workerProfileInfo.user_id }));
    }
  }, [dispatch, canViewDuplicates, workerProfileInfo?.user_id]);

  useEffect(() => {
    if (allWorkerStatuses.length === 0) {
      dispatch(fetchWorkerStatuses());
    }
  }, [dispatch, allWorkerStatuses.length]);

  useEffect(() => {
    if (location.state?.viewWorker) {
      setActiveTab('profile');
    }
  }, [location.state, setActiveTab]);

  // Clean up beforeunload event
  // Memoize the clearStateDetails handler to avoid unnecessary re-creation
  const handleBeforeUnload = useCallback(() => {
    dispatch(clearStateDetails());
  }, [dispatch]);

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [handleBeforeUnload]);

  const currentWorker = useMemo(() => ({
    name: workerProfileInfo?.fullname,
    user_id: workerProfileInfo?.user_id,
    worker_uuid: workerProfileInfo?.worker_uuid,
    worker_id: worker_id,
    alternate_mobile_number: workerProfileInfo?.alternate_mobile_number,
    alternate_mobile_country_code: workerProfileInfo?.alternate_mobile_country_code,
    whatsapp_number: workerProfileInfo?.whatsapp_number,
    whatsapp_country_code: workerProfileInfo?.whatsapp_country_code,
    type: translation(workerTypeList().find(o => o.id === workerProfileInfo?.type)?.['translationKey']) || '-',
    nationality: workerProfileInfo?.nationality?.['name'],
    nationality_id: workerProfileInfo?.nationality?.['id'],
    contract_status: workerProfileInfo?.contract_status_info?.['admin_panel_status'],
    /* the Verified headshot only (U-0201 / WORKER §16.6–16.7): a pending, Action Required or rejected photo never shows;
     * without one the header renders the neutral outline glyph */
    image: workerPhotoInfo?.image_status === WKD_IMAGE_STATUS_VERIFIED ? (workerPhotoInfo?.default_worker_image?.final_image || '') : '',
    mobile_number: workerProfileInfo?.mobile_number,
    country_code: workerProfileInfo?.country_code,
    email: workerProfileInfo?.email,
    status: workerProfileInfo?.status,
    current_location: workerProfileInfo?.current_location,
    worker_type: workerProfileInfo?.type,
    reference_id: workerProfileInfo?.reference_id,
    registration_type: workerDetailTabInfo?.registration_type,
    /* the RECORDED partner agency (+ branch) — never the PT person (WORKER §16.4 / U-0200) */
    partner_agency: workerDetailTabInfo?.worker_overseas_detail_info?.agency_details?.agency_name,
    partner_branch: workerDetailTabInfo?.worker_overseas_detail_info?.agency_details?.branch_name,
    onboarding1: workerDetailTabInfo?.onboarding1_name,
    onboarding2: workerDetailTabInfo?.onboarding2_name,
    /* Change Partner: the assignment's in-app message is sent as the Onboarding 2 owner (category 65, ruling A); the inquiry
       needs the journey's Assign Partner — Send Template grant (ST-04 / ST-06) */
    onboarding2_user_id: workerDetailTabInfo?.onboarding2_user_id,
    canSendPartnerInquiry: canSendPartnerInquiry(assignPartnerGrant(isWorkerPermissionAccessInfo, workerProfileInfo?.nationality?.['id']), isAdmin),
    /* U-0372 / backend 314: the newest Job Offer interpreter assignment — read-only; Change is the JO-scoped dialog */
    current_interpreter: workerDetailTabInfo?.current_interpreter || null,
    workerChangePartnerPermission: getPermissionValue(permissionList?.data, 'worker', 'worker_change_partner'),
    workerChangeOnboarding1Permission: getPermissionValue(permissionList?.data, 'worker', 'worker_change_onboarding1'),
    workerChangeOnboarding2Permission: getPermissionValue(permissionList?.data, 'worker', 'worker_change_onboarding2'),
    user: {
      country_code: workerProfileInfo?.country_code,
      mobile_number: workerProfileInfo?.mobile_number,
      email: workerProfileInfo?.email,
    }
  }), [workerProfileInfo, workerPhotoInfo, workerDetailTabInfo, permissionList, worker_id, isWorkerPermissionAccessInfo, isAdmin]);

  const handleWorkerChatOpen = useCallback(() => {
    if (workerProfileInfo?.user_id) {
      setIsChatWith("worker");
      setWorkerChatInfo({
        worker_name: workerProfileInfo?.fullname,
        worker_user_id: workerProfileInfo?.user_id,
        user_type: "worker",
        worker_id: workerProfileInfo?.id,
        conversation_sid: "",
        whatsapp_number: (workerProfileInfo?.whatsapp_country_code || "") + (workerProfileInfo?.whatsapp_number || ""),
        friendly_name: ""
      });
      setIsChatOpened(true);
    }
  }, [workerProfileInfo]);

  const handleOpenChatPT = useCallback((userInfo) => {
    if (userInfo) {
      setRailChatMode(false);
      setIsChatWith("user");
      setWorkerChatInfo({
        name: userInfo?.name,
        user_id: userInfo?.user_id,
        user_type: "user",
        cs_owner_id: userInfo?.id,
        conversation_sid: "",
        friendly_name: ""
      });
      setIsChatOpened(true);
    }
  }, []);

  const onHandleWorkerTextCopyInChat = useCallback((detailInfo) => {
    if (isChatOpened) {
      dispatch(fetchWorkerJobEncriptedID({
        job_id: detailInfo?.id,
        worker_id: worker_id
      }))
        .then((res) => {
          showErrorMessage(res);
          if (!res.error) {
            const encryptedJobId = res?.payload?.data?.job_id;
            setIsChatOpened(false);
            setWorkerChatInfo((prev) => ({
              ...prev,
              media_type: "job",
              entity_id: detailInfo?.id,
              media_link: REACT_JOB_VIEW_URL + "?job_id=" + encryptedJobId,
              entity_name: detailInfo?.head_line,
              entity_job_id: detailInfo?.reference_id,
              entity_type: "job",
              friendly_name: ""
            }));

            setTimeout(() => {
              setIsChatOpened(true);
            }, 2000);
          }
        });
    }
  }, [isChatOpened, dispatch, worker_id]);

  const [visitedTabs, setVisitedTabs] = useState(() => new Set([activeTab]));
  useEffect(() => {
    setVisitedTabs((prev) => (prev.has(activeTab) ? prev : new Set([...prev, activeTab])));
  }, [activeTab]);

  const renderTabContent = useCallback((tabKey) => {
    switch (tabKey) {
      case 'job-offer':
        return <WorkerJobOfferTab worker_id={worker_id} limit={limit} onHandleWorkerTextCopyInChat={onHandleWorkerTextCopyInChat} isWorkerPermissionAccessInfo={isWorkerPermissionAccessInfo} isAdmin={isAdmin} workerProfileInfo={workerProfileInfo} />;
      case 'profile':
        return <ProfileTab worker_id={worker_id} workerProfileInfo={workerProfileInfo} isWorkerPermissionAccessInfo={isWorkerPermissionAccessInfo} isAdmin={isAdmin} staffType={staffType} action={action} handleOpenChat={handleOpenChatPT} />;
      case 'details':
        return <DetailsTabWorker isRemarks={true} worker_id={worker_id} workerDetailTabInfo={workerDetailTabInfo} isWorkerPermissionAccessInfo={isWorkerPermissionAccessInfo} isAdmin={isAdmin} staffType={staffType} action={action} />;
      case 'invoice':
        return <WorkerInvoiceListing worker_id={worker_id} paginated />;
      case 'insurance':
        return <WorkerInsuranceListing worker_id={worker_id} paginated />;
      case 'contract':
        return <WorkerContractListing worker_id={parseInt(worker_id)} paginated />;
      case 'activity':
        return <WkdActivityTab worker_id={worker_id} />;
      default:
        return null;
    }
  }, [worker_id, limit, onHandleWorkerTextCopyInChat, isWorkerPermissionAccessInfo, isAdmin, workerProfileInfo, staffType, action, handleOpenChatPT, workerDetailTabInfo]);

  const canViewTab = useCallback((permArr) => (Array.isArray(permArr) && permArr.includes('y')) || isAdmin, [isAdmin]);
  /* the permission column has been resolved for this worker (a fresh object with every key) */
  const permissionsReady = Object.keys(isWorkerPermissionAccessInfo).length > 0;

  /* A denied tab is absent, not disabled. Partner actors see only Profile /
   * Details / scoped Activity (host-only Job Offer, Contract, Invoice,
   * Insurance are hidden) and land on Profile. The Job Offer tab needs its
   * master grant (PERM §5.9.2 `_jo`). */
  const tabs = useMemo(() => {
    const isPartner = staffType === 'partner';
    const all = [
      { eventKey: 'job-offer', title: translation("key_job_offer"), show: !isPartner && canViewTab(isWorkerPermissionAccessInfo?.worker_jo) },
      { eventKey: 'profile', title: translation("key_profile"), show: canViewTab(isWorkerPermissionAccessInfo?.worker_worker_profile) },
      { eventKey: 'details', title: translation("key_details"), show: canViewTab(isWorkerPermissionAccessInfo?.worker_worker_details) },
      { eventKey: 'contract', title: translation("key_contract"), show: !isPartner },
      { eventKey: 'invoice', title: translation("key_invoice"), show: !isPartner },
      { eventKey: 'insurance', title: translation("key_insurance"), show: !isPartner },
      { eventKey: 'activity', title: translation("key_activity"), show: canViewTab(isWorkerPermissionAccessInfo?.worker_worker_activity) },
    ];
    return all.filter((t) => t.show).map(({ eventKey, title }) => ({ eventKey, title, disabled: false }));
  }, [isWorkerPermissionAccessInfo, staffType, canViewTab]);

  /* ?jobOfferId= opens the Job Offer tab through the same path as a click (URL segment stays in step) */
  useEffect(() => {
    if (jobOfferIdParam && permissionsReady && tabs.some((t) => t.eventKey === 'job-offer') && activeTab !== 'job-offer') setActiveTab('job-offer');
  }, [jobOfferIdParam, permissionsReady, tabs, activeTab, setActiveTab]);
  /* a known-but-unpermitted tab (TAB_NOT_FOUND) lands on the first permitted tab, never on a blank body */
  useEffect(() => {
    if (permissionsReady && tabs.length > 0 && !tabs.some((t) => t.eventKey === activeTab)) setActiveTab(tabs[0].eventKey);
  }, [permissionsReady, tabs, activeTab, setActiveTab]);
  /* an unknown ?jobOfferId= (JOB_OFFER_TAB_MISMATCH): the record opens, the id is reported once, neutrally */
  useEffect(() => {
    if (!jobOfferIdParam || handledUnknownJobOffer.current || status === 'loading') return;
    const rows = Array.isArray(workerJobOfferList?.data) ? workerJobOfferList.data : (Array.isArray(workerJobOfferList) ? workerJobOfferList : null);
    if (!rows || rows.length === 0) return;
    if (!rows.some((job) => String(job.job_id) === String(jobOfferIdParam))) {
      handledUnknownJobOffer.current = true;
      ShowToast("error", translation('key_no_data_found'));
    }
  }, [jobOfferIdParam, workerJobOfferList, status]);

  // Memoize handlers
  const handleSelect = useCallback((eventKey) => {
    setActiveTab(eventKey);
    if (eventKey === "profile") {
      dispatch(fetchWorkerCommonDetailInfo({ "worker_id": worker_id, type: 'biodata' }));
      dispatchWithHandling(dispatch, fetchWorkerActivityLog({
        "worker_id": worker_id,
        "type": "update_biodata",
        "module_key": "worker"
      }));
      dispatchWithHandling(dispatch, fetchWorkerValidateStatus({
        "worker_id": worker_id,
        "type": "biodata"
      }));
    }
    if (eventKey == "details") {
      dispatch(fetchWorkerDetailTabInfo({ "worker_id": worker_id, type: 'basic' }));
    }
    if (eventKey == "job-offer") {
      dispatch(fetchWorkerJobOfferList({
        worker_id: worker_id, "page": 1, "limit": limit,
      }));
    }
  }, [dispatch, worker_id, limit, setActiveTab]);

  const handleEditProfilePopup = useCallback((e) => {
    e.preventDefault();
    setEditPopup((prev) => !prev);
    dispatch(fetchWorkerDetailTabInfo({ "worker_id": worker_id, type: 'basic' }));
  }, [dispatch, worker_id]);

  const handleRefreshWorkerInfo = useCallback(() => {
    setEditPopup(false);
    dispatch(fetchWorkerDetailTabInfo({ "worker_id": worker_id, type: 'basic' }));
  }, [dispatch, worker_id]);

  const handleRefreshWorkerInfoCustom = useCallback(() => {
    dispatch(fetchWorkerDetailTabInfo({ "worker_id": worker_id, type: 'basic' }));
  }, [dispatch, worker_id]);

  /* Change Status (WORKER §4.1 / U-0198): the SERVER decides which transition is legal — the client no longer
   * keeps a transition table. Picking a status opens a confirm step (reason recorded; On Hold is "by admin with reason"). */
  const handleUpdateStatus = useCallback((nextStatus, isBackToPreviousStatus, statusName) => {
    setStatusReason('');
    setPendingStatus({ status: nextStatus, isBackToPreviousStatus: Boolean(isBackToPreviousStatus), name: statusName || '' });
  }, []);
  const closeStatusConfirm = useCallback(() => {
    if (statusBusy) return;
    setPendingStatus(null);
    setStatusReason('');
  }, [statusBusy]);
  /* U-0325 (21 Oct): every host status change records a required reason (On Hold · Suspended · Banned) */
  const reasonRequired = Boolean(pendingStatus);
  const confirmStatusChange = useCallback(() => {
    if (!pendingStatus || statusBusy) return;
    if (reasonRequired && !statusReason.trim()) return;
    const payload = {
      [WORKER_STATUS_CHANGE_PAYLOAD.WORKER_ID]: worker_id,
      [WORKER_STATUS_CHANGE_PAYLOAD.STATUS]: pendingStatus.status,
      ...(pendingStatus.isBackToPreviousStatus && { [WORKER_STATUS_CHANGE_PAYLOAD.BACK_TO_PREVIOUS]: true }),
      ...(statusReason.trim() && { [WORKER_STATUS_CHANGE_PAYLOAD.REASON]: statusReason.trim() }),
      /* batch C (W-12): the detail's version travels; a stale one is refused with 409 STALE_VERSION */
      ...(workerDetailTabInfo?.version && { [WORKER_STATUS_CHANGE_PAYLOAD.VERSION]: workerDetailTabInfo.version }),
    };
    setStatusBusy(true);
    dispatch(changeWorkerStatusGlobal(payload)).then((res) => {
      setStatusBusy(false);
      if (res?.payload?.response?.data?.status) {
        ShowToast("success", res?.payload?.response?.data?.message);
        setPendingStatus(null);
        setStatusReason('');
        dispatch(fetchWorkerStatuses({ worker_id }));
        dispatchWithHandling(dispatch, fetchWorkerCommonDetailInfo({
          "worker_id": worker_id,
          "type": "biodata"
        }));
      } else {
        /* the server's refusal is the only transition rule the screen shows */
        ShowToast("error", res?.payload?.response?.data?.message || res?.payload?.message || res?.payload);
        if (res?.payload?.code === STALE_VERSION_CODE) {
          /* someone else changed the record: reload it (fresh version + status list); the confirm step stays open for re-apply, never auto-retried */
          dispatch(fetchWorkerDetailTabInfo({ "worker_id": worker_id, type: 'basic' }));
          dispatch(fetchWorkerStatuses({ worker_id }));
        }
      }
    });
  }, [dispatch, worker_id, pendingStatus, statusBusy, statusReason, reasonRequired, workerDetailTabInfo?.version]);

  const handleRailSwitchMode = useCallback((mode) => {
    if (mode === 'chat') {
      setRailChatMode(true);
      handleWorkerChatOpen();
    } else {
      setRailChatMode(false);
      setIsChatOpened(false);
    }
  }, [handleWorkerChatOpen]);

  /* Global Chat handoff (?from=global-chat): land with the scoped chat rail open, once per visit */
  const fromGlobalChat = searchParams.get('from') === 'global-chat';
  useEffect(() => {
    if (!fromGlobalChat || handledHandoff.current || !workerProfileInfo?.user_id) return;
    handledHandoff.current = true;
    handleRailSwitchMode('chat');
  }, [fromGlobalChat, workerProfileInfo?.user_id, handleRailSwitchMode]);

  const handleRailChatClose = useCallback(() => {
    setIsChatOpened(false);
    setRailChatMode(false);
  }, []);

  const onViewDuplicates = useCallback((event) => {
    event?.preventDefault?.();
    if (workerProfileInfo?.user_id) {
      const user_id = workerProfileInfo?.user_id;
      navigate(`/workers/duplicate/${user_id}`);
    } else {
      ShowToast("error", translation('key_no_data_found'));
    }
  }, [workerProfileInfo?.user_id, navigate]);

  /* The Verified photo pair for the header viewer: original + headshot (only a
   * Verified photo opens; a pending / Action Required / rejected one never does).
   * The photo API carries no file size, crop coordinates or approval stamp yet —
   * those render as — until delivered (backend ask). */
  const approvedPhoto = useMemo(() => {
    const img = workerPhotoInfo?.default_worker_image;
    if (!img?.final_image || workerPhotoInfo?.image_status !== WKD_IMAGE_STATUS_VERIFIED) return null;
    return {
      url: img.uploaded || img.final_image,
      file_name: img.file_name,
      file_size: img.file_size,
      crop: img.crop,
      approved_at: img.approved_at || img.verified_at,
      published: true,
    };
  }, [workerPhotoInfo]);

  /* Access denied (403): a neutral screen that names no record facts (SR-02) */
  if (entryError === WKD_ENTRY_ERROR.DENIED) {
    return (
      <section className="wkd wkd-page">
        <div className="wkd-invalid-entry" data-mc-denied="true" role="status">
          <div>
            <span className="mark">!</span>
            <h2>{ translation('key_not_available') }</h2>
            <p>{ translation('key_cr_no_access_to_record') }</p>
          </div>
        </div>
      </section>
    );
  }

  /* CTX-08 (invalidEntryHTML): the record could not be opened — no substitute
   * worker is loaded, the identifier is echoed for support */
  if (entryError === WKD_ENTRY_ERROR.INVALID) {
    return (
      <section className="wkd wkd-page">
        <div className="wkd-invalid-entry">
          <div>
            <span className="mark">!</span>
            <h2>{ translation('key_worker_details_could_not_be_opened') }</h2>
            <p>{ translation('key_invalid_worker_copy') }</p>
            <code>{ String(worker_id || 'unknown') }</code>
          </div>
        </div>
      </section>
    );
  }

  /* any other failure (network, 5xx): an honest error with Retry — not "the identifier is unknown" */
  if (entryError === WKD_ENTRY_ERROR.FAILED) {
    return (
      <section className="wkd wkd-page">
        <div className="wkd-invalid-entry" data-mc-failed="true" role="alert">
          <div>
            <span className="mark">!</span>
            <h2>{ translation('key_worker_details_could_not_be_opened') }</h2>
            <p>{ translation('key_something_went_wrong') }</p>
            <button type="button" className="wkd-btn-outline" onClick={ () => { setEntryError(null); setRetryTick((n) => n + 1); } }>{ translation('key_retry') }</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="wkd wkd-page">

      {isChatOpened && !railChatMode && <CommonIndividualChat entityDetails={workerChatInfo} handleOnCloseChat={() => setIsChatOpened(false)} user_type={isChatWith} />}

      {pendingStatus && (
        <ConfirmModal
          title={ translation('key_change_status') }
          body={ (
            <>
              { translation('key_are_you_sure_you_want_to_change_worker_status') }{ pendingStatus.name ? ` ${ pendingStatus.name }` : '' }
              <label className="wkd-status-reason">
                <span>{ translation('key_reason') }</span>
                <textarea
                  rows={ 3 }
                  value={ statusReason }
                  maxLength={ 500 }
                  required={ reasonRequired }
                  aria-required={ reasonRequired }
                  disabled={ statusBusy }
                  onChange={ (e) => setStatusReason(e.target.value) }
                />
              </label>
            </>
          ) }
          confirmLabel={ translation('key_confirm') }
          busy={ statusBusy }
          danger={ pendingStatus.status === WORKER_STATUS_ID.BANNED }
          onConfirm={ confirmStatusChange }
          onClose={ closeStatusConfirm }
        />
      )}

      {editPopup && (
        <WkdEditWorkerDrawer onClose={() => setEditPopup(false)} workerName={currentWorker?.name} workerCode={currentWorker?.reference_id}>
          <EditProfilePopup
            workerDetailTabInfo={workerDetailTabInfo}
            workerType={workerProfileInfo?.type}
            onClose={() => setEditPopup(false)}
            onRefreshWorkerInfo={handleRefreshWorkerInfo}
          />
        </WkdEditWorkerDrawer>
      )}

      <div className="wkd-body">
        <aside className="wkd-rail">
          { /* the rail renders its own fixed segment control + scrolling cards container */ }
          <WkdContextRail
            duplicateCount={canViewDuplicates ? (duplicateWorkerCount || 0) : 0}
            duplicateText={`${ translation('key_we_have_found') } ${ duplicateWorkerCount || 0 } ${ duplicateWorkerCount === 1 ? translation('key_potential_duplicate') : translation('key_potential_duplicates').toLowerCase() } ${ translation('key_of_this_worker') }`}
            onViewDuplicates={onViewDuplicates}
            /* PERM §5.9.1 Remarks "Unchecked: panel hidden" (card, count and drawer) */
            showRemarks={canViewTab(isWorkerPermissionAccessInfo?.worker_remarks)}
            /* host-only cards: partners never see Follow Up, Action Required History or host Chat History */
            showFollowUp={staffType !== 'partner'}
            showArHistory={Boolean(staffType !== 'partner' && canViewTab(isWorkerPermissionAccessInfo?.worker_action_require_history) && isProcessComplete && workerProfileInfo)}
            showChatHistory={Boolean(staffType !== 'partner' && canViewTab(isWorkerPermissionAccessInfo?.worker_chat_history) && workerProfileInfo && isProcessComplete)}
            worker_id={worker_id}
            userId={workerProfileInfo?.user_id}
            entityDetails={currentWorker}
            workerName={currentWorker?.name}
            workerCode={currentWorker?.reference_id}
            canChat={canViewTab(isWorkerPermissionAccessInfo?.worker_chat)}
            chatMode={railChatMode}
            onSwitchMode={handleRailSwitchMode}
            chatContent={(railChatMode && isChatOpened) ? (
              <div className="wkd-rail-chat">
                { /* partner messaging is in-app only (CR Partner workspace): no Global Chat for partner actors */ }
                {staffType !== 'partner' && <Link className="wkd-globalchat-link" to="/chat-view">{translation('key_global_chat')} ↗</Link>}
                <GcMiniChat entityDetails={workerChatInfo} handleOnCloseChat={handleRailChatClose} user_type={isChatWith} showTranslate />
              </div>
            ) : null}
          />
        </aside>

        <div className="wkd-main-col">
          {!workerProfileInfo ? <CustomSpinner /> : currentWorker && <WorkerHeaderSection
            currentWorker={currentWorker}
            onEditProfilePopup={handleEditProfilePopup}
            workerStatus={workerStatuses}
            allWorkerStatuses={allWorkerStatuses}
            onUpdateStatus={handleUpdateStatus}
            isWorkerPermissionAccessInfo={isWorkerPermissionAccessInfo}
            isAdmin={isAdmin}
            handleRefreshWorkerInfo={handleRefreshWorkerInfoCustom}
            staffType={staffType}
            handleOpenChats={handleOpenChatPT}
            workerProfileInfo={workerDetailTabInfo}
            tabs={tabs}
            activeTab={activeTab}
            onSelectTab={handleSelect}
            approvedPhoto={approvedPhoto}
          />}

          <div className="wkd-main">
            <div className="tab-content">
              {tabs.map((tab) => visitedTabs.has(tab.eventKey) && (
                <div key={tab.eventKey} className={tab.eventKey === activeTab ? '' : 'd-none'}>
                  {NEWUI_LISTING_TABS.includes(tab.eventKey)
                    ? renderTabContent(tab.eventKey)
                    : <div className="position-relative">
                      {renderTabContent(tab.eventKey)}
                    </div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkerDetails;