const generalRoutes = {
  home: "/",
  myProfile: "/my-profile",
  timeRequests: "/time-requests",
  addTimeRequest: "/add-time-request",
  myReportees: "/my-reportees",
  calendar: "/calendar",
  calendarRedirectFrom: "/my-calendar",   /* old address, redirects to calendar */
  notifications: "/notifications",         /* the full view of the signed-in user's own records */
  chat: "/chat-view",
  altchat: "/altchat",
  conversaction: "/chats/:user_type/:user_id/:id",
  termAndCondition: "/term-and-condition",
  shareStageDetails: "/share-stage-details",
  privacyPolicy: "/privacy-policy",
  qrCode: "/qr-code",
  deeplLinkJobDetail: "/job-details",
  deeplLinkWorkerDetail: "/job-stage-details",
  deeplLinkWorkerInterested: "/job-stage-details/worker-interested",
  deeplLinkSendInterviewRequestDate: "/job-stage-details/send-interview-request-date",
  deeplLinkSendInterviewRequestTime: "/job-stage-details/send-interview-request-time",
  deeplLinkSendInterviewRequestLocation: "/job-stage-details/send-interview-request-location",
  deeplLinkSendInterviewRequestConfirm: "/job-stage-details/send-interview-request-confirm",
  deeplLinkSendInterviewRequestSuccess: "/job-stage-details/send-interview-request-success",
  reScheduleRequest: "/job-stage-details/reschedule-request",
};

export default generalRoutes;
