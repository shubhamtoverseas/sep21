import { apiPath, API_CHAT_URL } from './apiPath';
import app from './appClient';
import createApiInstance from './createApiInstance'

const chatApi = createApiInstance(API_CHAT_URL);

export const getJobOffers = (reqPayload) => app.post(apiPath.getJobofferList, reqPayload);
export const getJobWorkerList = (reqPayload) => app.post(apiPath.getJobWorkerList, reqPayload);
export const getJobStatus = (params) => app.get(apiPath.getJobStatus, { params });
export const updateJobOfferStatus = (reqPayload) => app.post(apiPath.updateJobOfferStatus, reqPayload);
export const addNewJobOffer = (reqPayload) => app.post(apiPath.addNewJobOffer, reqPayload);
export const getJobDetail = (jobId) => app.get(apiPath.getJobDetails + '/' + jobId);
export const cancelSuggestedInterview = (reqPayload) => app.post(apiPath.cancelSuggestion, reqPayload);
export const sendExtendOffer = (reqPayload) => app.post(apiPath.sendExtendOffer, reqPayload);
export const searchWorker = (reqPayload) => app.post(apiPath.findWorker, reqPayload);
export const addNewSuggestWorker = (reqPayload) => app.post(apiPath.addNewSuggestWorker, reqPayload);
export const getJobActivityLogList = (reqPayload) => app.post(apiPath.jobActivityLogList, reqPayload);
export const getDuplicateJobs = (params) => chatApi.get(apiPath.getDuplicateJobs, { params })
export const getWorkerJobEncriptedIDAPI = (payload) => app.post(apiPath.workerJobEncriptedID,  payload)
/* Change CS Owner of one Job Offer + its eligible CS staff `[{ id, name, branch_name }]` (backend 12 Oct ask 3) */
export const changeJobOfferCsOwnerAPI = (reqPayload) => app.post(apiPath.changeJobOfferCsOwner, reqPayload);
export const getJobOfferEligibleCsAPI = (reqPayload) => app.post(apiPath.jobOfferEligibleCs, reqPayload);
