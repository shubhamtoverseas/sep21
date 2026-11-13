import { v4 as uuidv4 } from "uuid";
import { apiPath, REACT_APP_PDF_URL, REACT_APP_PROCESSING_API_URL } from './apiPath';
import app from './appClient';
import createApiInstance from './createApiInstance';


const processingAPI = createApiInstance(REACT_APP_PROCESSING_API_URL);
const pdfApi = createApiInstance(REACT_APP_PDF_URL);

export const uploadProcessingFiles = (reqPayload) => app.post(apiPath.uploadProcessingFiles, reqPayload);
export const getProcessingFiles = (reqPayload) => app.post(apiPath.getProcessingFiles, reqPayload);
export const getProcessingSatusList = (reqPayload) => app.post(apiPath.getProcessingSatusList, reqPayload);
export const getProcessingGlobalSatusListAPI = (params) => processingAPI.get(apiPath.getProcessingGlobalSatusList, {params});
export const updateProcessingGlobalSatusListAPI = (reqPayload) => processingAPI.post(apiPath.updateProcessingGlobalSatusList, reqPayload);
export const updateProcessingStatusAPI = (reqPayload) => app.post(apiPath.updateProcessingStatus, reqPayload);
export const updateProcessingDetailsAPI = (reqPayload) => processingAPI.post(apiPath.updateProcessingDetails, reqPayload);
export const removeProcessingFile = (remarkPayload) => app.post(apiPath.deleteProcessingFile, remarkPayload);
export const fetchProcessingLicenceAPI = (params) => app.get(apiPath.getProcessingLicence, { params });
export const getProcessingDetails = (params) => app.get(apiPath.getProcessingDetails + '/' + params.contract_id + '/' + params.type);
export const updateProcessingDocumentsAPI = (remarkPayload) => app.post(apiPath.updateProcessingDocuments, remarkPayload);
export const updateProcessingFullDetailsAPI = (remarkPayload) => app.post(apiPath.updateProcessingFullDetails, remarkPayload);
export const updateProcessingVisaEVisaAPI = (payload) => app.post(apiPath.updateProcessingVisaEVisa, payload);
export const associateProcessingFileAPI = (payload) => app.post(apiPath.associateProcessingFile, payload);
export const updateImmigrationApplicabilityAPI = (payload) => app.post(apiPath.updateImmigrationApplicability, payload);
// K-18: { contract_id, purpose: entry | change | renew | null }
export const updateImmigrationPurposeAPI = (payload) => app.post(apiPath.updateImmigrationPurpose, payload);
export const getProcessingActivityLogList = (payload) => app.post(apiPath.processingActivityLogList, payload);

export const medicalDocumentSaveAPI = (payload) => processingAPI.post(apiPath.medicalDocumentSave, payload);
export const medicalDocumentDeleteAPI = (payload) => processingAPI.post(apiPath.medicalDocumentDelete, payload);
export const medicalDocumentViewAPI = (id) => processingAPI.get(apiPath.medicalDocumentView + id);
export const visaDocumentDetailsAPI = (id) => app.get(apiPath.visaDocumentDetails + id);
export const deleteProcessingVisaFileAPI = (payload) => app.post(apiPath.deleteProcessingVisaFile, payload);
export const medicalDocumentStatusListAPI = (id) => processingAPI.get(apiPath.medicalDocumentStatusList + id);
export const medicalDocumentStatusChangeAPI = (payload) => processingAPI.post(apiPath.medicalDocumentStatusChange, payload);
export const insuranceDocumentStatusChangeAPI = (payload) => processingAPI.post(apiPath.insuranceDocumentStatusChange, payload);
export const eVisaDocumentStatusChangeAPI = (payload) => app.post(apiPath.eVisaDocumentStatusChange, payload);
export const insuranceDocumentStatusListAPI = (id) => processingAPI.get(apiPath.insuranceDocumentStatusList + id);
export const insuranceDocumentViewAPI = (id) => processingAPI.get(apiPath.insuranceDocumentView + id);
export const updateMasterFormAPI = (reqPayload) => pdfApi.post(apiPath.updateMasterForm, reqPayload);
export const getMasterFormDetailsAPI = (id) => pdfApi.get(apiPath.getMasterFormDetails + id);
export const fetchProfileDetailsAPI = (id) => pdfApi.get(apiPath.getProfileDetails + id);
export const fetchLastPullDetailsAPI = (id) => pdfApi.get(apiPath.getLastPullDetails + id);
export const preDepartureUploadMedFileAPI = (payload) => processingAPI.post(apiPath.preDepartureUploadMedFile, payload);
export const preDepartureMedicalDocStatusListAPI = (id) => processingAPI.get(apiPath.medicalDocStatusList + id);
export const preDepartureMedicalDocChangeStatusAPI = (payload) => processingAPI.post(apiPath.medicalDocStatusChange, payload);
export const preDepartureMedicalDocFileDeleteAPI = (payload) => processingAPI.post(apiPath.medicalDocumentFileDelete, payload);
export const preDepartureOtherDocStatusAPI = (payload) => processingAPI.get(apiPath.preDepartureOtherDocStatus + payload.id + '/' + payload.type);
export const getEvisaDocumentStatusListAPI = (payload) => app.get(apiPath.getEvisaDocumentStatusList + payload.id + '/' + payload.type);
export const preDepartureOtherDocChangeStatusAPI = (payload) => processingAPI.post(apiPath.preDepartureOtherDocChangeStatus, payload);
export const preDepartureDocumentViewAPI = (id) => processingAPI.get(apiPath.preDepartureDocumentView + id);
export const visaShareUpdateAPI = (reqPayload) => processingAPI.post(apiPath.visaShareUpdate, reqPayload);
export const medicalShareUpdateAPI = (reqPayload) => processingAPI.post(apiPath.medicalShareUpdate, reqPayload);
export const deploymentShareUpdateAPI = (reqPayload) => processingAPI.post(apiPath.deploymentDocumentShareUpdate, reqPayload);
export const deploymentDocumentViewAPI = (id) => processingAPI.get(apiPath.deploymentDocumentView + id);
export const deploymentUpdateDHLContractAPI = (reqPayload) => processingAPI.post(apiPath.deploymentUpdateDHLContract, reqPayload);
export const deploymentUpdateFlightDetailsAPI = (reqPayload) => processingAPI.post(apiPath.deploymentUpdateFlightDetails, reqPayload);
export const deploymentUpdateHKIDDetailsAPI = (reqPayload) => processingAPI.post(apiPath.deploymentUpdateHKIDDetails, reqPayload);
export const deploymentUpdatePickupDetailsAPI = (reqPayload) => processingAPI.post(apiPath.deploymentUpdatePickupDetails, reqPayload);
export const deploymentStatusListAPI = (reqPayload) => processingAPI.post(apiPath.deploymentStatusList, reqPayload);
export const deploymentChangeStatusAPI = (reqPayload) => processingAPI.post(apiPath.deploymentChangeStatus, reqPayload);
export const updateProcessingVisaAuthAPI = (reqPayload) => app.post(apiPath.updateProcessingVisaAuth, reqPayload);
export const activateProcessingAPI = (reqPayload) => processingAPI.post(apiPath.activateProcessing, reqPayload);
export const activateProcessingGroup1And2API = (reqPayload) => processingAPI.post(apiPath.activateProcessingGroup1And2, reqPayload);
export const chagneProcessingCsAPI = (reqPayload) => processingAPI.post(apiPath.changeProcessingCs, reqPayload);
export const changeProcessingCsAssistantAPI = (reqPayload) => processingAPI.post(apiPath.changeProcessingCsAssistant, reqPayload);
export const bulkChangeProcessingCsAssistantAPI = (reqPayload) => processingAPI.post(apiPath.bulkChangeProcessingCsAssistant, reqPayload);
export const processingVisaExpiryUpdateAPI = (reqPayload) => processingAPI.post(apiPath.processingVisaExpiryUpdate, reqPayload);
export const paosDetailsAPI = (contractId) => processingAPI.get(apiPath.paosDetails + contractId);
export const paosSaveAPI = (reqPayload) => processingAPI.post(apiPath.paosSave, reqPayload);
export const paosRosterAPI = (reqPayload) => processingAPI.post(apiPath.paosRoster, reqPayload);
export const processingVisaExpiryHistoryAPI = (contractId) => processingAPI.get(apiPath.processingVisaExpiryHistory + contractId);
// N-4 / K-17: [{ id, key, label, admin_panel_status, is_finished, requires_remarks, system_only }]
export const completionReasonsAPI = () => processingAPI.get(apiPath.processingCompletionReasons);
export const updateID988bFormDataAPI = (reqPayload) => pdfApi.post(apiPath.update988b, reqPayload);
export const updateID988aFormDataAPI = (reqPayload) => pdfApi.post(apiPath.update988a, reqPayload);
export const updateID407FormDataAPI = (reqPayload) => pdfApi.post(apiPath.update407, reqPayload);
export const downloadEditablePdfAPI = (reqPayload) => pdfApi.post(apiPath.downloadEditablePdf, reqPayload, {
    responseType: 'blob' 
  });
  export const downloadNonEditablePdfAPI = (reqPayload) => pdfApi.post(apiPath.downloadNonEditablePdf, reqPayload, {
    responseType: 'blob' 
  });
  

// REQ-14: bulk CS Owner / CS Assistant change with a per-record review.
// body: { register: 'cs_owner' | 'cs_assistant', scope: 'selected' | 'portfolio', contract_ids?, from_staff_id?, to_staff_id, reason }
export const bulkOwnershipPreviewAPI = (reqPayload) => processingAPI.post(apiPath.processingBulkOwnershipPreview, reqPayload);
export const bulkOwnershipCommitAPI = (reqPayload) => processingAPI.post(apiPath.processingBulkOwnershipCommit, reqPayload);
/* { register } → { register, holders: [{ id, name, inactive, count }], unassigned_count } over the caller's accessible Processing population */
export const bulkOwnershipHoldersAPI = (reqPayload) => processingAPI.post(apiPath.processingBulkOwnershipHolders, reqPayload);
// Prepared owner / Ready owner registers: the eligible list per record + register, one change, the per-Group defaults.
export const getPrepReadyEligibleAPI = (params) => processingAPI.get(apiPath.prepReadyOwnersEligible, { params });
export const changePrepReadyOwnerAPI = (reqPayload) => processingAPI.post(apiPath.changePrepReadyOwner, reqPayload);
export const getPrepReadyDefaultsAPI = () => processingAPI.get(apiPath.prepReadyOwnerDefaults);
export const savePrepReadyDefaultAPI = (reqPayload) => processingAPI.post(apiPath.prepReadyOwnerDefaults, reqPayload);

/* ---- Extend Visa case (EXTEND.md §2–§8; backend S2). Every mutation carries the case reference, the `version` of the case
   the screen loaded (409 = stale → reload) and a fresh `idempotency_key` per user click (a retry with the same key replays). ---- */
export const extendVisaMutationBody = (caseRef, body = {}) => ({
    contract_id: Number(caseRef.contract_id),
    ...(caseRef.extend_visa_case_id ? { extend_visa_case_id: caseRef.extend_visa_case_id } : {}),
    ...(caseRef.version !== undefined && caseRef.version !== null ? { version: caseRef.version } : {}),
    idempotency_key: uuidv4(),
    ...body,
});
export const getExtendVisaCasesAPI = (contractId) => processingAPI.get(apiPath.extendVisaCases + Number(contractId));
export const getExtendVisaCaseAPI = (contractId, caseId) => processingAPI.get(`${ apiPath.extendVisaCase }${ Number(contractId) }/${ encodeURIComponent(caseId) }`);
export const startExtendVisaAPI = (contractId) => processingAPI.post(apiPath.extendVisaStart, { contract_id: Number(contractId), idempotency_key: uuidv4() });
export const extendVisaApplicabilityAPI = (caseRef, body) => processingAPI.post(apiPath.extendVisaApplicability, extendVisaMutationBody(caseRef, body));
export const extendVisaMarkAPI = (caseRef, body) => processingAPI.post(apiPath.extendVisaMark, extendVisaMutationBody(caseRef, body));
export const extendVisaFilesAPI = (caseRef, body) => processingAPI.post(apiPath.extendVisaFiles, extendVisaMutationBody(caseRef, body));
export const extendVisaAssociateAPI = (caseRef, body) => processingAPI.post(apiPath.extendVisaAssociate, extendVisaMutationBody(caseRef, body));
export const extendVisaRemoveFileAPI = (caseRef, body) => processingAPI.post(apiPath.extendVisaRemoveFile, extendVisaMutationBody(caseRef, body));
export const extendVisaImmigrationStatusAPI = (caseRef, body) => processingAPI.post(apiPath.extendVisaImmigrationStatus, extendVisaMutationBody(caseRef, body));
export const extendVisaVisaFieldsAPI = (caseRef, body) => processingAPI.post(apiPath.extendVisaVisaFields, extendVisaMutationBody(caseRef, body));
export const extendVisaRefReleasedAPI = (caseRef) => processingAPI.post(apiPath.extendVisaRefReleased, extendVisaMutationBody(caseRef));
export const extendVisaReleaseAPI = (caseRef, body) => processingAPI.post(apiPath.extendVisaRelease, extendVisaMutationBody(caseRef, body));
export const extendVisaCancelAPI = (caseRef, body) => processingAPI.post(apiPath.extendVisaCancel, extendVisaMutationBody(caseRef, body));
/* backend 378 (v22 §X): { register: prepared_owner | ready_owner, staff_id } — assign / reassign only, never clear (DF-11) */
export const extendVisaOwnerAPI = (caseRef, body) => processingAPI.post(apiPath.extendVisaOwner, extendVisaMutationBody(caseRef, body));
// S1: visa issuance history for a contract in Processing.
export const processingVisaIssuanceHistoryAPI = (contractId) => processingAPI.get(apiPath.processingVisaIssuanceHistory + contractId);
