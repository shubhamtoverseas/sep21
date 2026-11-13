import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from 'prop-types';
const BiodataView = React.lazy(() => import("./biodata-tab/BiodataView"));
const WorkerPhotoDetails = React.lazy(() => import("../newui/photo/WkdPhotoTab"));
const AssignPT = React.lazy(() => import("../details-tab-worker/assign-pt/AssignPT"));
const WkdPartnerAssignmentCard = React.lazy(() => import("../newui/WkdPartnerAssignmentCard"));
const WkdInvitationCard = React.lazy(() => import("../newui/WkdInvitationCard"));
const PTtab = React.lazy(() => import("../details-tab-worker/pt-tab/PTtab"));
const WorkerDocUploadDetails = React.lazy(() => import("./doc-upload-tab/WorkerDocUploadDetails"));
import { fetchWorkerActivityLog, fetchWorkerValidateStatus, fetchWorkerCommonDetailInfo, fetchWorkerDocumentUploadInfoInfo, fetchWorkerPhotoInfo, fetchWorkerDetailTabInfo } from "../../../../../redux/Slices/worker/WorkerSlice";
import { WKD_PHOTO_ACTIVITY_TYPES } from "../../workerModuleConstants";
import { dispatchWithHandling } from "../../../../../utils/dispatchHandler";
import PreparationTabs from "../newui/WkdSubTabBar";
import { indonesiaId, fillipinoId, thaiId, bangladeshId } from "../../../../../components/ReusableComponents/constants";
import translation from "../../../../../utils/translation";
import { DOC_UPLOAD_ACTIONS, PT_ACTIONS, DOC_UPLOAD_PARTNER_ORIGIN_NOTE, SENT_LINK_REGISTRATION_RE, WORKER_STATUS_ID } from "../../workerModuleConstants";
import { photoRecords } from "../newui/photo/photoModel";

const selectWorkerState = (state) => state.worker;

const resolveActionTabKey = (actionKey) => {
    if (DOC_UPLOAD_ACTIONS.has(actionKey)) return "doc upload";
    if (PT_ACTIONS.has(actionKey)) return "pt";
    return actionKey;
};

const hasViewPermission = (permArr, isAdmin) =>
    (Array.isArray(permArr) && permArr.includes('view')) || isAdmin;

const ProfileTab = ({ workerProfileInfo, worker_id, isWorkerPermissionAccessInfo, isAdmin, staffType, action, handleOpenChat }) => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState(action ? resolveActionTabKey(action) : "biodata");
    const { activityLogList, workerDetailTabInfo, workerPhotoInfo, workerDocumentUploadInfo } = useSelector(selectWorkerState);
    const [uploadDocPermission, setUploadDocPermission] = useState([]);
    const [assignPartnerPermission, setAssignPartnerPermission] = useState([]);

    /* conflict sheet U-0202: Assign Partner is a lifecycle, not a completion section — reachable whenever the grant allows */
    const isPTDisabled = useMemo(() => !(assignPartnerPermission.includes('view') || isAdmin), [assignPartnerPermission, isAdmin]);

    const dispatchTabFetches = useCallback((eventKey) => {
        if (eventKey === "assign-pt") {
            dispatchWithHandling(dispatch, fetchWorkerActivityLog({ worker_id, type: "update_pt_assign_status", module_key: "worker" }));
            dispatchWithHandling(dispatch, fetchWorkerValidateStatus({ worker_id, type: "pt_assign" }));
            dispatchWithHandling(dispatch, fetchWorkerCommonDetailInfo({ worker_id, type: "document" }));
        } else if (eventKey === "biodata") {
            dispatchWithHandling(dispatch, fetchWorkerCommonDetailInfo({ worker_id, type: "biodata" }));
            dispatchWithHandling(dispatch, fetchWorkerActivityLog({ worker_id, type: "update_biodata", module_key: "worker" }));
            dispatchWithHandling(dispatch, fetchWorkerValidateStatus({ worker_id, type: "biodata" }));
        } else if (eventKey === "photo") {
            dispatchWithHandling(dispatch, fetchWorkerPhotoInfo({ worker_id, type: "image" }));
            dispatchWithHandling(dispatch, fetchWorkerActivityLog({ worker_id, type: WKD_PHOTO_ACTIVITY_TYPES, module_key: "worker" }));
            dispatchWithHandling(dispatch, fetchWorkerValidateStatus({ worker_id, type: "image" }));
        } else if (eventKey === "doc upload") {
            dispatchWithHandling(dispatch, fetchWorkerDocumentUploadInfoInfo({ worker_id, type: "document" }));
            if (fillipinoId == workerDetailTabInfo?.nationality?.id && action == undefined) {
                dispatchWithHandling(dispatch, fetchWorkerActivityLog({ worker_id, type: "update_eregistration", module_key: "worker" }));
                dispatchWithHandling(dispatch, fetchWorkerValidateStatus({ worker_id, type: "eregistration" }));
            } else if (indonesiaId == workerDetailTabInfo?.nationality?.id && action == undefined) {
                dispatchWithHandling(dispatch, fetchWorkerActivityLog({ worker_id, type: "update_passport", module_key: "worker" }));
                dispatchWithHandling(dispatch, fetchWorkerValidateStatus({ worker_id, type: "passport" }));
            }
        } else if (eventKey === "pt") {
            dispatchWithHandling(dispatch, fetchWorkerDocumentUploadInfoInfo({ worker_id, type: "document" }));
            dispatchWithHandling(dispatch, fetchWorkerActivityLog({ worker_id, type: "update_medical", module_key: "worker" }));
            dispatchWithHandling(dispatch, fetchWorkerValidateStatus({ worker_id, type: "medical" }));
        }
    }, [dispatch, worker_id, workerDetailTabInfo?.nationality?.id, action]);

    useEffect(() => {
        if (action) {
            if (DOC_UPLOAD_ACTIONS.has(action)) {
                setActiveTab("doc upload");
                dispatchTabFetches("doc upload");
            } else if (PT_ACTIONS.has(action)) {
                setActiveTab('pt');
                dispatchTabFetches('pt');
            }
        }
    }, [action, dispatchTabFetches]);

    useEffect(() => {
        const nationalityId = workerDetailTabInfo?.nationality?.id;
        if (fillipinoId == nationalityId) {
            setUploadDocPermission(isWorkerPermissionAccessInfo?.worker_philippines_worker_doc_upload || []);
            setAssignPartnerPermission(isWorkerPermissionAccessInfo?.worker_philippines_worker_assign_partner || []);
        } else if (indonesiaId == nationalityId) {
            setUploadDocPermission(isWorkerPermissionAccessInfo?.worker_indonesia_worker_doc_upload || []);
            setAssignPartnerPermission(isWorkerPermissionAccessInfo?.worker_indonesia_worker_assign_partner || []);
        }
    }, [workerDetailTabInfo?.nationality?.id, isWorkerPermissionAccessInfo]);

    useEffect(() => {
        if (worker_id) {
            dispatch(fetchWorkerDetailTabInfo({ worker_id, type: 'basic' }));
        }
    }, [dispatch, worker_id]);

    const handleSelect = useCallback((eventKey) => {
        setActiveTab(eventKey);
        dispatchTabFetches(eventKey);
    }, [dispatchTabFetches]);

    const handleRefreshStatus = useCallback((eventKey) => {
        if (eventKey === "biodata") {
            dispatchWithHandling(dispatch, fetchWorkerCommonDetailInfo({ worker_id, type: "biodata" }));
            dispatchWithHandling(dispatch, fetchWorkerActivityLog({ worker_id, type: "update_biodata", module_key: "worker" }));
            dispatchWithHandling(dispatch, fetchWorkerValidateStatus({ worker_id, type: "biodata" }));
        } else if (eventKey === "photo") {
            dispatchWithHandling(dispatch, fetchWorkerPhotoInfo({ worker_id, type: "image" }));
            dispatchWithHandling(dispatch, fetchWorkerActivityLog({ worker_id, type: WKD_PHOTO_ACTIVITY_TYPES, module_key: "worker" }));
            dispatchWithHandling(dispatch, fetchWorkerValidateStatus({ worker_id, type: "image" }));
        } else if (eventKey === "doc-upload") {
            dispatchWithHandling(dispatch, fetchWorkerDocumentUploadInfoInfo({ worker_id, type: "document" }));
        } else if (eventKey === "assign-pt") {
            dispatchWithHandling(dispatch, fetchWorkerActivityLog({ worker_id, type: "update_pt_assign_status", module_key: "worker" }));
            dispatchWithHandling(dispatch, fetchWorkerValidateStatus({ worker_id, type: "pt_assign" }));
            dispatchWithHandling(dispatch, fetchWorkerCommonDetailInfo({ worker_id, type: "document" }));
        } else if (eventKey === "pt") {
            dispatchWithHandling(dispatch, fetchWorkerDocumentUploadInfoInfo({ worker_id, type: "document" }));
        }
        dispatchWithHandling(dispatch, fetchWorkerDetailTabInfo({ worker_id, type: "basic" }));
    }, [dispatch, worker_id]);

    const isPartnerStaff = staffType === 'partner';
    const nationalityId = Number(workerDetailTabInfo?.nationality?.id);
    const canViewBiodata = hasViewPermission(isWorkerPermissionAccessInfo?.worker_worker_biodata, isAdmin);
    const canViewPhoto = hasViewPermission(isWorkerPermissionAccessInfo?.worker_worker_photo, isAdmin);
    const canViewDocUpload = uploadDocPermission.includes('view') || isAdmin;
    const canViewAssignPT = assignPartnerPermission.includes('view') || isAdmin;
    /* §16.18 / W-03: partner staff read Medical / Training Certificate / Labour ID; the host grant gates everyone else */
    const canViewPT = isPartnerStaff || hasViewPermission(isWorkerPermissionAccessInfo?.worker_indonesia_worker_assign_pt, isAdmin);
    const isPartnerRegistration = workerDetailTabInfo?.registration_type === "partner_added" || workerDetailTabInfo?.registration_type === "partner_sent_link";
    /* W-10: a worker created by a link shows its invitation card (the API answers null for any other record) */
    const showInvitation = canViewAssignPT && (SENT_LINK_REGISTRATION_RE.test(String(workerDetailTabInfo?.registration_type || "")) || Number(workerDetailTabInfo?.status) === WORKER_STATUS_ID.NOT_REGISTERED);
    /* §16.17: "Doc Upload · Not required" is the partner-origin INDONESIAN case only (a partner-origin Filipino keeps E-Reg / PEOS / TESDA);
     * conflict sheet U-0211: Thai / Bangladeshi workers have no document rows — the same disabled, annotated tab */
    const isPartnerOriginIndonesian = isPartnerRegistration && Number(indonesiaId) === nationalityId;
    const isDocUploadNotRequired = isPartnerOriginIndonesian || [thaiId, bangladeshId].map(Number).includes(nationalityId);
    const isDocUploadDisabled = !canViewDocUpload || isDocUploadNotRequired;
    const isPTTabDisabled = (!isPartnerStaff && isPTDisabled) || workerDetailTabInfo?.worker_overseas_detail_info?.pt_assign_status !== 'verified';
    /* §16.2 / §16.6.1: the Photo tab dot and the Photo section chip read the same source — Verified while an approved photo exists */
    const photoStatus = useMemo(() => {
        if (!workerPhotoInfo) return workerDetailTabInfo?.image_status;
        const { current, status: itemStatus } = photoRecords(workerPhotoInfo);
        return current ? 'verified' : itemStatus;
    }, [workerPhotoInfo, workerDetailTabInfo?.image_status]);

    const tabs = useMemo(() => {
        const allTabs = [
            {
                eventKey: "biodata",
                disabled: !canViewBiodata,
                title: translation('key_biodata'),
                content: canViewBiodata ? <BiodataView onRefreshStatus={ handleRefreshStatus } isWorkerPermissionAccessInfo={ isWorkerPermissionAccessInfo } isAdmin={ isAdmin } workerProfileInfo={ workerProfileInfo } /> : null,
                status: workerDetailTabInfo?.biodata_status === 'verified' ? 'completed' : workerDetailTabInfo?.biodata_status
            },
            {
                eventKey: "photo",
                disabled: !canViewPhoto,
                title: translation('key_photo'),
                content: canViewPhoto ? <WorkerPhotoDetails onRefreshStatus={ handleRefreshStatus } isWorkerPermissionAccessInfo={ isWorkerPermissionAccessInfo } isAdmin={ isAdmin } /> : null,
                status: photoStatus === 'verified' ? 'completed' : photoStatus
            },
            {
                eventKey: "doc upload",
                disabled: isDocUploadDisabled,
                title: translation('key_doc_upload'),
                /* WORKER.md §16.17: partner-origin records show `Doc Upload · Not required`, disabled and accessible as disabled; no document rows exist for them */
                content: (canViewDocUpload && !isDocUploadNotRequired) ? <WorkerDocUploadDetails onRefreshStatus={ handleRefreshStatus } worker_id={ worker_id } uploadDocPermission={ uploadDocPermission } isAdmin={ isAdmin } workerDetailTabInfo={ workerDetailTabInfo } action={ action } /> : null,
                status: isDocUploadNotRequired ? null : (workerDocumentUploadInfo?.doc_upload_status || workerDetailTabInfo?.doc_upload_status) === 'verified' ? 'completed' : (workerDocumentUploadInfo?.doc_upload_status || workerDetailTabInfo?.doc_upload_status || "incomplete"),
                /* U-0211: the single permitted tab annotation and its one note — reused as-is for Thai / Bangladeshi */
                meta: isDocUploadNotRequired ? translation('key_not_required') : undefined,
                metaTone: isDocUploadNotRequired ? 'muted' : undefined,
                disabledReason: isDocUploadNotRequired ? translation(DOC_UPLOAD_PARTNER_ORIGIN_NOTE) : undefined
            },
            {
                eventKey: 'assign-pt',
                disabled: isPTDisabled,
                /* conflict sheet U-0204: one screen, two names — Assign Partner (Filipino) / Assign PT (Indonesian) */
                title: translation(indonesiaId == workerDetailTabInfo?.nationality?.id ? 'key_assign_pt' : 'key_assign_partner'),
                content: <>{ showInvitation && <WkdInvitationCard workerId={ worker_id } /> }{ canViewAssignPT && isPartnerRegistration ? <WkdPartnerAssignmentCard worker={ workerDetailTabInfo } /> : canViewAssignPT ? <AssignPT activityLogList={ activityLogList } onRefreshStatus={ handleRefreshStatus } worker_id={ worker_id } assignPartnerPermission={ assignPartnerPermission } isAdmin={ isAdmin } workerDetailTabInfo={ workerDetailTabInfo } handleOpenChat={ handleOpenChat } /> : null }</>,
                status: null
            },
            {
                eventKey: 'pt',
                disabled: isPTTabDisabled || !canViewPT,
                title: translation('key_partner'),
                content: (!isPTTabDisabled && canViewPT) ? <PTtab worker_id={ worker_id } isWorkerPermissionAccessInfo={ isWorkerPermissionAccessInfo } isAdmin={ isAdmin } action={ action } readOnly={ isPartnerStaff } /> : null,
                status: null
            }
        ];

        let filtered = allTabs;
        if (workerProfileInfo?.type === 1) {
            filtered = filtered.filter((tab) => tab.eventKey !== "doc upload" && tab.eventKey !== "assign-pt" && tab.eventKey !== "pt");
        }
        if (indonesiaId != workerDetailTabInfo?.nationality?.id) {
            filtered = filtered.filter((tab) => tab.eventKey !== "pt");
        }
        /* partners get Biodata + Photo and a read-only Partner tab (§16.18) — Doc Upload / Assign Partner are host controls */
        if (isPartnerStaff) {
            filtered = filtered.filter((tab) => tab.eventKey === "biodata" || tab.eventKey === "photo" || tab.eventKey === "pt");
        }
        return filtered;
    }, [canViewBiodata, canViewPhoto, canViewDocUpload, canViewAssignPT, canViewPT,
        isDocUploadDisabled, isDocUploadNotRequired, isPTDisabled, isPTTabDisabled, isPartnerRegistration, isPartnerStaff, photoStatus, showInvitation,
        workerDetailTabInfo, workerDocumentUploadInfo,
        activityLogList, handleRefreshStatus,
        isWorkerPermissionAccessInfo, isAdmin, workerProfileInfo,
        worker_id, uploadDocPermission, assignPartnerPermission,
        action, handleOpenChat]);

    return <>
        <PreparationTabs tabs={ tabs } activeKey={ activeTab } onSelect={ handleSelect } />
    </>

};

ProfileTab.propTypes = {
    workerProfileInfo: PropTypes.object,
    worker_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    isWorkerPermissionAccessInfo: PropTypes.any,
    isAdmin: PropTypes.any,
    staffType: PropTypes.string,
    action: PropTypes.string,
    handleOpenChat: PropTypes.func
};
export default React.memo(ProfileTab);
