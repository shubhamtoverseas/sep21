import { lazy } from "react";
import routes from "./routesConfig/index";

/* The Processing list and detail are retired (one Contracts entry; Processing is a status card): their addresses
   redirect to the Contracts dashboard / the Contract record (ProcessingRedirect). Documents redirects into the record's
   Documents view. The Forms live on the record's Forms tab only. */
const ProcessingRedirect = lazy(() => import("../ProcessingPage/ProcessingRedirect"));
const ProcessingDocuments = lazy(() => import("../ProcessingPage/processing-documents/ProcessingDocumentsRedirect"));

const processingRoutes = [
  { path: routes.processings, component: ProcessingRedirect, moduleKey: "contract", permissionKey: "contract_global_list" },
  { path: routes.processingDetails, component: ProcessingRedirect, moduleKey: "contract_processing", permissionKey: "contract_processing_access" },
  { path: routes.processingDocuments, component: ProcessingDocuments, moduleKey: "contract_processing", permissionKey: "contract_processing_access" },
];

export default processingRoutes;
