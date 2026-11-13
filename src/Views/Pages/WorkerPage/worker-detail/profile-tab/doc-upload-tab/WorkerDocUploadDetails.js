import React, { useEffect, useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { dispatchWithHandling } from "../../../../../../utils/dispatchHandler";
import { fetchWokerDetail, fetchWorkerActivityLog, fetchWorkerValidateStatus, fetchWorkerDocumentUploadInfoInfo } from "../../../../../../redux/Slices/worker/WorkerSlice";
import { indonesiaId, fillipinoId } from "../../../../../../components/ReusableComponents/constants";
import CustomSpinner from "../../../../../../components/ReusableComponents/CustomSpinner";
import WkdDocList from "../../newui/WkdDocList";
import WkdDocReview from "../../newui/doc-review/WkdDocReview";
import "../../newui/wkd-docs-partner.css";
import translation from "../../../../../../utils/translation";
import { DOC_EVENT_KEY_MAP, DOC_PATH_NOTES, CENTRAL_KTP_LABEL, PASSPORT_NEVER_APPLIED_REASON, PASSPORT_LOST_REASON_KEYS } from "../../../workerModuleConstants";

const selectWorkerState = (state) => state.worker;

function WorkerDocUploadDetails({ onRefreshStatus, worker_id, uploadDocPermission, isAdmin, workerDetailTabInfo, action }) {
  const dispatch = useDispatch();
  const { workerDocumentUploadInfo, status } = useSelector(selectWorkerState);
  /* the review document is chosen once the nationality's list is known (first row), or by the deep-linked action */
  const [activeTab, setActiveTab] = useState(action || null);

  useEffect(() => {
    dispatchWithHandling(dispatch, fetchWokerDetail(worker_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, worker_id]);

  const workerOverseasInfo = workerDocumentUploadInfo?.worker_overseas_detail_info;

  const passportStatus = workerOverseasInfo?.passport_status;
  const indonesianIdStatus = workerOverseasInfo?.indonesian_id_status;
  /* Path A (passport never applied): KTP is the central document, passport is Not Applicable */
  const isPathA = workerOverseasInfo?.passport_lost_reason === PASSPORT_NEVER_APPLIED_REASON;
  /* W-27: the central document's verification gates every dependent's Verify (Path A: KTP, otherwise Passport) */
  const centralVerified = (isPathA ? indonesianIdStatus : passportStatus) === 'verified';

  const dispatchTabData = useCallback((eventKey) => {
    const mapping = DOC_EVENT_KEY_MAP[eventKey];
    if (!mapping) return;
    dispatchWithHandling(dispatch, fetchWorkerDocumentUploadInfoInfo({
      worker_id: worker_id,
      type: "document"
    }));
    dispatchWithHandling(dispatch, fetchWorkerActivityLog({
      worker_id: worker_id,
      type: mapping.logType,
      module_key: "worker"
    }));
    dispatchWithHandling(dispatch, fetchWorkerValidateStatus({
      worker_id: worker_id,
      type: mapping.activityType
    }));
  }, [dispatch, worker_id]);

  useEffect(() => {
    if (action) {
      setActiveTab(action);
      dispatchTabData(action);
    }
  }, [action, dispatchTabData]);

  const handleSelect = useCallback((eventKey) => {
    dispatchTabData(eventKey);
    setActiveTab(eventKey);
  }, [dispatchTabData]);

  const handleRefreshActivity = useCallback((eventKey) => {
    onRefreshStatus('doc-upload');
    /* W-27: a central Action Required rolls waiting dependents back to Uploaded server-side — re-read every document's status */
    dispatchWithHandling(dispatch, fetchWorkerDocumentUploadInfoInfo({ worker_id: worker_id, type: "document" }));
    const mapping = DOC_EVENT_KEY_MAP[eventKey];
    if (!mapping) return;
    dispatchWithHandling(dispatch, fetchWorkerActivityLog({
      worker_id: worker_id,
      type: mapping.logType,
      module_key: "worker"
    }));
    dispatchWithHandling(dispatch, fetchWorkerValidateStatus({
      worker_id: worker_id,
      type: mapping.activityType
    }));
  }, [dispatch, worker_id, onRefreshStatus]);

  /* the document rows; `centralVerified` is set only where the W-27 gate applies (the KTP on Path B, every other Indonesian dependent) */
  const tabs = useMemo(() => {
    if (!workerDocumentUploadInfo?.nationality?.id) return [];
    const nationalityId = workerDocumentUploadInfo.nationality.id;
    const o = workerOverseasInfo || {};

    if (fillipinoId == nationalityId) {
      return [
        { eventKey: "eregistration", label: translation('key_e_registration'), type: translation('key_doc_type_eregistration'), statusRaw: o.eregistration_status, uploaded: Boolean(o.eregistration_file), uploadedAt: o.eregistration_file_uploaded_at },
        { eventKey: "peos-certificate", label: translation('key_peos_certificate'), type: translation('key_doc_type_peos'), statusRaw: o.peos_certification_status, uploaded: Boolean(o.peos_certification_file), uploadedAt: o.peos_certification_file_uploaded_at },
        { eventKey: "tesda", label: translation('TESDA'), type: translation('key_doc_type_tesda'), statusRaw: o.tesda_status, uploaded: Boolean(o.tesda_file), uploadedAt: o.tesda_file_uploaded_at },
      ];
    } else if (indonesiaId == nationalityId) {
      return [
        {
          eventKey: "passport", disabled: isPathA, notApplicable: isPathA, label: translation('key_passport'), type: translation('key_doc_type_passport'), central: !isPathA,
          statusRaw: o.passport_status, uploaded: Boolean(o.passport_file), uploadedAt: o.passport_uploaded_at,
          /* a declared lost / expired passport has no scan but keeps its review card (declaration in place of the fields) */
          declaration: Boolean(PASSPORT_LOST_REASON_KEYS[o.passport_lost_reason]) && !isPathA,
        },
        {
          eventKey: "indonesian-id", label: translation('key_indonesian_id'), type: translation('key_doc_type_indonesian_id'), central: isPathA, dependent: !isPathA,
          statusRaw: o.indonesian_id_status, uploaded: Boolean(o.indonesian_id_file), uploadedAt: o.indonesian_id_file_uploaded_at,
          centralVerified: isPathA ? undefined : centralVerified,
        },
        { eventKey: "birth-certificate", label: translation('key_birth_cert'), type: translation('key_doc_type_birth'), dependent: true, statusRaw: o.birth_certificate_status, uploaded: Boolean(o.birth_certificate_file), uploadedAt: o.birth_certificate_file_uploaded_at, centralVerified },
        { eventKey: "family-certificate", label: translation('key_family_cert'), type: translation('key_doc_type_family'), dependent: true, statusRaw: o.family_certificate_status, uploaded: Boolean(o.family_certificate_file), uploadedAt: o.family_certificate_file_uploaded_at, centralVerified },
        { eventKey: "education-certificate", label: translation('key_education_cert'), type: translation('key_doc_type_education'), dependent: true, statusRaw: o.education_certificate_status, uploaded: Boolean(o.education_certificate_file), uploadedAt: o.education_certificate_file_uploaded_at, centralVerified },
      ];
    }
    return [];
  }, [workerDocumentUploadInfo, workerOverseasInfo, isPathA, centralVerified]);

  const isIndo = indonesiaId == workerDocumentUploadInfo?.nationality?.id;
  const effectiveTab = tabs.some((t) => t.eventKey === activeTab && !t.disabled) ? activeTab : (tabs.find((t) => !t.disabled) || tabs[0])?.eventKey;
  const active = tabs.find((t) => t.eventKey === effectiveTab);

  /* loading / unknown nationality: a real state, never a blank pane */
  if (!workerDocumentUploadInfo || tabs.length === 0) {
    return (
      <div className="wkd-docws wkd-docws-state">
        { status === 'loading' || !workerDocumentUploadInfo
          ? <CustomSpinner />
          : <div className="wkd-docws-empty">{ translation('key_no_document_found') }</div> }
      </div>
    );
  }

    return (
      <div className="wkd-docws">
        <WkdDocList
          docs={ tabs.map((t) => ({
            key: t.eventKey, label: t.label, type: t.type, statusRaw: t.statusRaw,
            central: t.central, dependent: t.dependent, disabled: t.disabled,
            notApplicable: t.notApplicable, uploaded: t.uploaded, uploadedAt: t.uploadedAt,
          })) }
          activeKey={ effectiveTab }
          onSelect={ handleSelect }
          overallStatusRaw={ workerDetailTabInfo?.doc_upload_status }
          note={ isIndo ? (isPathA ? DOC_PATH_NOTES.indoA : DOC_PATH_NOTES.indoB) : DOC_PATH_NOTES.fil }
          centralName={ isPathA ? translation(CENTRAL_KTP_LABEL) : translation('key_passport') }
          centralVerified={ centralVerified }
          showCascadeNote={ isIndo }
        />
        { /* prototype: a document awaiting upload has no review workspace — the list row is the whole state */ }
        { active && (active.uploaded || active.declaration) && (
          <WkdDocReview
            key={ active.eventKey }
            docKey={ active.eventKey }
            uploadDocPermission={ uploadDocPermission }
            isAdmin={ isAdmin }
            onRefreshActivity={ handleRefreshActivity }
            centralVerified={ active.centralVerified }
          />
        ) }
      </div>
    );
}

WorkerDocUploadDetails.propTypes = {
  onRefreshStatus: PropTypes.func,
  worker_id: PropTypes.string.isRequired,
  uploadDocPermission: PropTypes.any,
  isAdmin: PropTypes.any,
  workerDetailTabInfo: PropTypes.object,
  action: PropTypes.string,
};

export default React.memo(WorkerDocUploadDetails);
