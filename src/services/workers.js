import { apiPath, REACT_APP_CONTRACT_API_URL, SETTINGS_API_URL, API_CHAT_URL } from './apiPath';
import app from "./appClient";
import commonClient from './commonClient';
import createApiInstance from './createApiInstance'

const chatApi = createApiInstance(API_CHAT_URL);
const settingsApi = createApiInstance(SETTINGS_API_URL);

export const getWorkerRoles = (params) =>
  app.get(apiPath.getWorkerRoles, { params });
export const getWorkers = (reqPayload) =>
  app.post(apiPath.getWorkersList, reqPayload);
export const getWorkerDashboardCounts = () =>
  app.get(apiPath.getWorkerDashboardCounts);
/* Worker Dashboard new UI — proposed endpoints (pending backend; callers degrade gracefully) */
export const getWorkerPipelineCounts = (params) =>
  app.get(apiPath.getWorkerPipelineCounts, { params });
export const sendWorkerRegistrationLink = (reqPayload) =>
  app.post(apiPath.sendWorkerRegistrationLink, reqPayload);
/* Send registration link (U001): host and partner invite by { agency_id, branch_id, email } */
/* W-10: one Idempotency-Key per form submission, re-used on Retry (the client adds a fresh one only when none is given) */
export const addNewWorkerByAdmin = (reqPayload, idempotencyKey) =>
  app.post(apiPath.addNewWorkerByAdmin, reqPayload, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined);
export const getWorkerInvitation = (params) =>
  app.get(apiPath.workerInvitation, { params });
export const resendWorkerInvitation = (reqPayload) =>
  app.post(apiPath.workerInvitationResend, reqPayload);
export const revokeWorkerInvitation = (reqPayload) =>
  app.post(apiPath.workerInvitationRevoke, reqPayload);
export const bulkChangeWorkerPartner = (reqPayload) =>
  app.post(apiPath.bulkChangeWorkerPartner, reqPayload);
export const getBranchCheckinSessions = (params) =>
  app.get(apiPath.getBranchCheckinSessions, { params });
export const extendBranchCheckinSession = (reqPayload) =>
  app.post(apiPath.extendBranchCheckinSession, reqPayload);
export const getWorkerDetail = (workerId) =>
  app.get(apiPath.getWorkerDetail + "/" + workerId);
export const changeWorkerStatus = (workerData) =>
  app.post(apiPath.changeWorkerStatus, workerData);
export const saveWorkerBiodata = (reqPayload) =>
  app.post(apiPath.saveWorkerBiodata, reqPayload);
export const saveWorkerBasicProfile = (reqPayload) =>
  app.post(apiPath.saveWorkerBasicProfilePath, reqPayload);
export const updateWorkerDetails = (reqPayload) =>
  app.post(apiPath.updateWorkerDetails, reqPayload);
/* Contract setup · Review work history (INV-C1b): writes the review to the worker, under the worker edit permission */
export const saveWorkHistoryReview = (reqPayload) =>
  app.post(apiPath.saveWorkHistoryReview, reqPayload);
export const saveWorkerConsulate = (reqPayload) =>
  app.post(apiPath.saveWorkerConsulate, reqPayload);
export const saveWorkerPassportDetails = (reqPayload) =>
  app.post(apiPath.saveWorkerPassportDetails, reqPayload);
export const saveWorkerOverseasDetail = (reqPayload) =>
  app.post(apiPath.saveWorkerOverseasDetail, reqPayload);
export const uploadIndoDocumentAfterPTAssign = (reqPayload) =>
  app.post(apiPath.uploadIndoDocumentAfterPTAssign, reqPayload);
export const assignPTWorker = (reqPayload) =>
  app.post(apiPath.assignPTWorker, reqPayload);
export const getWorkerValidateStatus = (reqPayload) =>
  app.post(apiPath.getWorkerValidateStatus, reqPayload);
export const getWorkerActivityLog = (reqPayload) =>
  app.post(apiPath.getWorkerActivityLog, reqPayload);
export const getWorkerMainActivityLog = (reqPayload) =>
  app.post(apiPath.getWorkerActivityLog, reqPayload);
export const updateWorkerValidateStatus = (reqPayload) =>
  app.post(apiPath.saveWorkerValidateStatus, reqPayload);
export const getWorkerAllStateInfo = (reqPayload) =>
  app.get(apiPath.getWorkerDetail + "/" + reqPayload.worker_id + "?type=" + reqPayload.type);
export const getWorkerReferenceIdInitialsAPI = (params) =>
  app.get(apiPath.getWorkerReferenceIdInitials, { params });

const toRelativeImagePath = (value) =>
  typeof value === "string" ? value.replace(/^https?:\/\/[^/]+\//, "") : value;

export const updateSaveWorkerProfileImage = (reqPayload) => {
  const payload = { ...reqPayload };
  ["original_image_path", "cropped_image_path", "without_bg_image_path", "final_image_path"].forEach((key) => {
    if (payload[key]) payload[key] = toRelativeImagePath(payload[key]);
  });
  return app.post(apiPath.updateWorkerProfileImage, payload);
};

export const deleteWorkerIndonesianDocumentApi = (reqPayload) =>
  app.post(apiPath.deleteWorkerIndonesianDocumentPath, reqPayload)
export const updateUserContactInfo = (reqPayload) =>
  app.post(apiPath.updateContactDetail, reqPayload)
export const setPrimaryContactInfo = (reqPayload) =>
  app.post(apiPath.setPrimaryContact, reqPayload)
export const getWorkerJobOfferDetails = (params) =>
  app.get(apiPath.getJobDetails + "/" + params.job_id)
export const getWorkerJobStatusList = (params) =>
  app.get(apiPath.getWorkerJobStages, { params });
export const setGlobalWorkerStatus = (reqPayload) =>
  app.post(apiPath.changeWorkerStatus, reqPayload)
export const getWorkerRefrenceIdInitals = (params) =>
  app.get(apiPath.workerRefrenceIdInitals, { params })
export const getWorkerJobOfferList = (reqPayload) =>
  app.post(apiPath.getWorkerJobs, reqPayload)
export const getWorkerCanStartDate = (reqPayload) =>
  app.post(apiPath.getWorkerCanStartDate, reqPayload);
export const saveWorkerJobOfferAcceptInterview = (reqPayload) => app.post(apiPath.saveWorkerJobOfferAcceptInterview, reqPayload);
export const saveWorkerJobOfferCancelInterview = (reqPayload) => app.post(apiPath.saveWorkerJobOfferCancelInterview, reqPayload);
export const updateContractWorker = (reqPayload) => commonClient.post(REACT_APP_CONTRACT_API_URL + apiPath.updateContractWorker, reqPayload);
export const getWorkerOnboarding = (reqPayload) => commonClient.post(SETTINGS_API_URL + apiPath.getWorkerOnboarding, reqPayload);
export const updateWorkerOnboardingStaff = (reqPayload) => commonClient.post(SETTINGS_API_URL + apiPath.updateWorkerOnboardingStaff, reqPayload);
export const saveWorkerManageSuggestedJob = (reqPayload) => app.post(apiPath.saveWorkerManageSuggestedJob, reqPayload);
export const saveWorkerManageJob = (reqPayload) => app.post(apiPath.saveWorkerManageJob, reqPayload);
export const getDuplicateWorkerCount = (params) => chatApi.get(apiPath.getDuplicateWorkerCount, { params })
export const getDuplicateWorkers = (params) => chatApi.get(apiPath.getDuplicateWorkers, { params })
export const searchInterpreterStaffAPI = (reqPayload) => commonClient.post(SETTINGS_API_URL + apiPath.serachStaffInterpreter, reqPayload);
export const changeInterpreterAPI = (reqPayload) => commonClient.post(SETTINGS_API_URL + apiPath.changeInterpreter, reqPayload);
export const chatvalidateChangeUserGroupCsInterpreter = (reqPayload) => chatApi.post(apiPath.chatvalidateChangeUserGroupCsInterpreter, reqPayload);
export const getInterviewCounts = (reqPayload) => app.post(apiPath.getInterviewCounts, reqPayload);
export const getWorkerJobStatus = (params) => app.get((apiPath.workerJobStatus), { params });
export const qrBranchGenerateCodeAPI = (reqPayload) => settingsApi.post(apiPath.qrBranchGenerateCode, reqPayload);
export const qrBranchReGenerateCodeAPI = (reqPayload) => settingsApi.post(apiPath.qrBranchReGenerateCode, reqPayload);
export const workerCheckoutAtBranchApi = (reqPayload) => app.post(apiPath.workerCheckoutAtBranch, reqPayload);