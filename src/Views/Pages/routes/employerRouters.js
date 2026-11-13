import { lazy } from "react";
import routes from "./routesConfig/index";

const EmployerPage = lazy(() => import("../Employer/newui/EmployerDashboard"));
const EmployerDetailPage = lazy(() => import("../Employer/newui/details/EmployerDetailsPage"));
const DuplicatesEmployerTable = lazy(() => import("../Employer/newui/duplicates/EmployerDuplicatesPage"));
const employerRoutes = [
    { path: routes.employers, component: EmployerPage, permissionKey: "employer_access", moduleKey: "employer" },
    { path: `${ routes.employerDetails }/:tab?`, component: EmployerDetailPage, permissionKey: "employer_access", moduleKey: "employer" },
    { path: routes.DuplicatesEmployers, component: DuplicatesEmployerTable, permissionKey: "employer_access", moduleKey: "employer" }

];

export default employerRoutes;