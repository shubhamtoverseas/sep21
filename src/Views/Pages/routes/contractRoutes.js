import { lazy } from "react";
import routes from "./routesConfig/index";

const ContractPage = lazy(() => import('../Contract/Contract'));
const ContractDetailsPage = lazy(() => import('../Contract/details/ContractDetails'));
const ExtendVisaCasePage = lazy(() => import('../Contract/extend-visa/ExtendVisaCase'));

const contractRoutes = [
  { path: routes.contracts, component: ContractPage, moduleKey: "contract", permissionKey: "contract_global_list" },
  /* U-0267: Global Screen only hides the nav entry — a deep link to a record is gated on record access */
  { path: routes.contractDetails, component: ContractDetailsPage, moduleKey: "contract_processing", permissionKey: "contract_processing_access" },
  { path: routes.extendVisaCase, component: ExtendVisaCasePage, moduleKey: "contract_processing", permissionKey: "contract_processing_access" },
];

export default contractRoutes;
