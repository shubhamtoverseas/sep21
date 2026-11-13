import { lazy } from "react";
import routes from "./routesConfig/index";

const JobOfferDashboard = lazy(() => import("../JobOfferPage/newui/dashboard/JobOfferDashboard"));
const jobOffersDuplicates = lazy(() => import("../JobOfferPage/JobOfferDuplicates"));
const JobOfferRecordPage = lazy(() => import("../JobOfferPage/newui/record/JobOfferRecordPage"));
const JobOfferEditPage = lazy(() => import("../JobOfferPage/newui/editor/JobOfferEditPage"));

const jobRoutes = [
  { path: routes.jobOffers, component: JobOfferDashboard, permissionKey: "jo_access", moduleKey: "jo" },
  { path: routes.jobOffersDuplicate, component: jobOffersDuplicates, permissionKey: "jo_access", moduleKey: "jo" },
  { path: routes.jobOfferDetails, component: JobOfferRecordPage, permissionKey: "jo_access", moduleKey: "jo" },
  { path: routes.jobOfferEdit, component: JobOfferEditPage, permissionKey: "jo_access", moduleKey: "jo" },
];

export default jobRoutes;
