  import { lazy } from "react";
  import routes from "./routesConfig/index";
  
  const InsuranceDashboardPage = lazy(() => import("../insurance/dashboard/InsuranceDashboardPage"));
  const InsuranceRecordPage = lazy(() => import("../insurance/record/InsuranceRecordPage"));
  const NewInsuranceForm = lazy(() => import("../insurance/new/NewInsuranceForm"));
  const InsuranceLegacyLinkResolver = lazy(() => import("../insurance/record/InsuranceLegacyLinkResolver"));
  
  const insuranceRoutes = [
    { path: routes.insurance, component: InsuranceDashboardPage, moduleKey: "insurance", permissionKey: "insurance_access" },
    { path: routes.insuranceNew, component: NewInsuranceForm, moduleKey: "insurance", permissionKey: "insurance_access" },
    { path: routes.insuranceRecord, component: InsuranceRecordPage, moduleKey: "insurance", permissionKey: "insurance_access" },
    { path: routes.insuranceDetails, component: InsuranceLegacyLinkResolver, moduleKey: "insurance", permissionKey: "insurance_access" },
  ];
  
  export default insuranceRoutes;

