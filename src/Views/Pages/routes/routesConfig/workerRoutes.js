const workerRoutes = {
  workers: "/workers",
  /* declared before the record route so the segment is never read as a worker id */
  workerSendRegistrationLink: "/workers/send-registration-link",
  /* optional trailing segment = record tab (job-offer | profile | details | contract | invoice | insurance | activity) */
  workerDetails: "/workers/details/:worker_id/:tab?",
  WorkerDuplicates: "/workers/duplicate/:user_id",
};

export default workerRoutes;
