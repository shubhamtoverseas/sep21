import {apiPath } from './apiPath';
import app from './appClient';

export const confirmScheduledInterview = (reqPayload) => app.post(apiPath.confirmScheduledInterview, reqPayload);
export const reScheduleInterviewAPI = (reqPayload) => app.post(apiPath.rescheduleInterview, reqPayload);
export const generateInstantInterview = (reqPayload) => app.post(apiPath.generateInstantInterview, reqPayload);
export const reformInstantInterviewStatus = (reqPayload) => app.post(apiPath.updateInstantInterviewStatus, reqPayload);
export const fetchNewInterviewDetails = (interviewID) => app.get(apiPath.getNewInterviewDetails + interviewID);
export const getUpcomingInterviews = (reqPayload) => app.post(apiPath.getUpcomingINterviews, reqPayload);
export const getInterviewTimeSlots = (reqPayload) => app.post(apiPath.getInterviewTimeSlots, reqPayload);
export const getInterviewDateSlots = (reqPayload) => app.post(apiPath.getInterviewDateSlots, reqPayload);
export const markInterviewCompleted = (reqPayload) => app.post(apiPath.markInterviewCompleted, reqPayload);
export const cancelInterviewAPI = (reqPayload) => app.post(apiPath.cancelInterview, reqPayload);
export const manageInterviewStatusAPI = (reqPayload) => app.post(apiPath.manageInterviewStatus, reqPayload);
export const changeJobStageStatusAPI = (reqPayload) => app.post(apiPath.changeJobStageStatus, reqPayload);
export const cancelInviteAPI = (reqPayload) => app.post(apiPath.cancelInvite, reqPayload);
export const unArchiveJobStageAPI = (reqPayload) => app.post(apiPath.unArchiveJobStage, reqPayload);
export const getInterviewsToBeCompleted = () => app.get(apiPath.getInterviewsToBeCompleted);