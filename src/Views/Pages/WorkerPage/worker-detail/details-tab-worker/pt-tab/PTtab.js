import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import { dispatchWithHandling } from "../../../../../../utils/dispatchHandler";
import { WkdG2SectionTabs } from "../../newui/WkdG2PartnerNav";
import "../../newui/wkd-docs-partner.css";
const MedicalTab = lazy(() => import("./medical-tab/MedicalTab"));
const SubmitDocumentsTab = lazy(() => import("./submit-documents-tab/SubmitDocumentsTab"));
const LaborIDTab = lazy(() => import("./labor-id-tab/LaborIDTab"));
const TrainingCertificateTab = lazy(() => import("./training-certificate-tab/TrainingCertificateTab"));
import { fetchWorkerActivityLog, fetchWorkerValidateStatus, fetchWorkerDocumentUploadInfoInfo } from "../../../../../../redux/Slices/worker/WorkerSlice";
import translation from "../../../../../../utils/translation";
import { PT_PARTNER_READONLY_SECTIONS } from "../../../workerModuleConstants";

/* `readOnly` (partner staff, §16.18): Medical / Training Certificate / Labour ID are visible without any write control; Submit Documents stays host-only */
const PTtab = ({ worker_id, isWorkerPermissionAccessInfo, isAdmin, action, readOnly = false }) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState(action ? action : "medical");
  const { workerDocumentUploadInfo, activityLogList, status } = useSelector((state) => state.worker);
  const overseasInfo = workerDocumentUploadInfo?.worker_overseas_detail_info;
  /* the default section is now Medical (no Overview): the legacy section tabs
   * read the worker's document record once on mount, so a section is mounted
   * only once this worker's document record is in the store — exactly the
   * point at which the legacy Overview→Medical click would have mounted it. */
  const hasWorkerDocInfo = String(workerDocumentUploadInfo?.id ?? '') === String(worker_id);

  const medicalStatus = overseasInfo?.medical_status;
  const submitDocumentsStatus = overseasInfo?.submit_document_status;
  const labourIdStatus = overseasInfo?.labour_id_status;
  const trainingCertificateStatus = overseasInfo?.training_certificate_status;

  const dispatchTabData = useCallback((eventKey) => {
    const tabConfig = {
      "medical": { activityType: "update_medical", validateType: "medical" },
      "submit-documents": { activityType: "update_submit_document", validateType: "submit_document" },
      "training-certificate": { activityType: "update_training_certificate", validateType: "training_certificate" },
      "labor-id": { activityType: "update_labour_id", validateType: "labour_id" },
    };
    const config = tabConfig[eventKey];
    if (config) {
      dispatchWithHandling(dispatch, fetchWorkerActivityLog({
        "worker_id": worker_id,
        "type": config.activityType,
        "module_key": "worker"
      }));
      dispatchWithHandling(dispatch, fetchWorkerValidateStatus({
        "worker_id": worker_id,
        "type": config.validateType
      }));
    }
  }, [dispatch, worker_id]);

  const handleSelect = useCallback((eventKey) => {
    setActiveTab(eventKey);
    dispatchTabData(eventKey);
  }, [dispatchTabData]);

  const handleRefreshStatus = useCallback((eventKey) => {
    dispatchTabData(eventKey);
    dispatchWithHandling(dispatch, fetchWorkerDocumentUploadInfoInfo({
      "worker_id": worker_id,
      "type": "document"
    }));
  }, [dispatchTabData, dispatch, worker_id]);

  useEffect(() => {
    if (action) {
      setActiveTab(action);
      handleSelect(action);
    }
  }, [action, handleSelect]);

  /* §16.2: lifecycle sections carry their label only — no completion marker on the tab */
  const sections = useMemo(() => [
    { key: 'medical', label: translation('key_medical') },
    { key: 'submit-documents', label: translation('key_submit_documents') },
    { key: 'training-certificate', label: translation('key_training_certificate') },
    { key: 'labor-id', label: translation('key_labour_id') },
  ].filter((s) => !readOnly || PT_PARTNER_READONLY_SECTIONS.includes(s.key)), [readOnly]);

  const visibleTab = sections.some((s) => s.key === activeTab) ? activeTab : sections[0]?.key;

  const tabs = useMemo(() => [
    {
      eventKey: "medical",
      title: <>{ translation('key_medical') }</>,
      content: visibleTab === "medical" && hasWorkerDocInfo ? <MedicalTab
        activityLogList={ activityLogList }
        status={ status }
        workerDocumentUploadInfo={ workerDocumentUploadInfo }
        updateStatus={ medicalStatus }
        onRefreshStatus={ handleRefreshStatus }
        isWorkerPermissionAccessInfo={ isWorkerPermissionAccessInfo }
        isAdmin={ isAdmin }
        readOnly={ readOnly }
      /> : null,
    },
    {
      eventKey: "submit-documents",
      title: <>{ translation('key_submit_documents') }</>,
      content: visibleTab === "submit-documents" && hasWorkerDocInfo ? <SubmitDocumentsTab
        activityLogList={ activityLogList }
        status={ status }
        workerDocumentUploadInfo={ workerDocumentUploadInfo }
        updateStatus={ submitDocumentsStatus }
        onRefreshStatus={ handleRefreshStatus }
        isWorkerPermissionAccessInfo={ isWorkerPermissionAccessInfo }
        isAdmin={ isAdmin }
        readOnly={ readOnly }
      /> : null,
    },
    {
      eventKey: "training-certificate",
      title: <> { translation('key_training_certificate') }</>,
      content: visibleTab === "training-certificate" && hasWorkerDocInfo ? <TrainingCertificateTab
        activityLogList={ activityLogList }
        status={ status }
        workerDocumentUploadInfo={ workerDocumentUploadInfo }
        updateStatus={ trainingCertificateStatus }
        onRefreshStatus={ handleRefreshStatus }
        isWorkerPermissionAccessInfo={ isWorkerPermissionAccessInfo }
        isAdmin={ isAdmin }
        readOnly={ readOnly }
      /> : null,
    },
    {
      eventKey: "labor-id",
      title: <>{ translation('key_labour_id') }</>,
      content: visibleTab === "labor-id" && hasWorkerDocInfo ? <LaborIDTab
        activityLogList={ activityLogList }
        status={ status }
        workerDocumentUploadInfo={ workerDocumentUploadInfo }
        updateStatus={ labourIdStatus }
        onRefreshStatus={ handleRefreshStatus }
        isWorkerPermissionAccessInfo={ isWorkerPermissionAccessInfo }
        isAdmin={ isAdmin }
        readOnly={ readOnly }
      /> : null,
    },
  ], [visibleTab, hasWorkerDocInfo, activityLogList, status, workerDocumentUploadInfo, medicalStatus, submitDocumentsStatus, trainingCertificateStatus, labourIdStatus, handleRefreshStatus, isWorkerPermissionAccessInfo, isAdmin, readOnly]);

  const activeContent = tabs.find((t) => t.eventKey === visibleTab)?.content || null;

  return <Suspense fallback={ <div>{ translation('key_loading') }...</div> }>
    <div className="wkd-g2 wkd-g2-partner">
      <WkdG2SectionTabs sections={ sections } active={ visibleTab } onSelect={ handleSelect } />
      <div className="wkd-g2sec">{ activeContent }</div>
    </div>
  </Suspense>;
};
PTtab.propTypes = {
  worker_id: PropTypes.string.isRequired,
  isWorkerPermissionAccessInfo: PropTypes.any,
  isAdmin: PropTypes.any,
  action: PropTypes.string,
  readOnly: PropTypes.bool
};
export default PTtab;
