import { lazy } from "react";
import routes from "./routesConfig/index";


const DashboardPage = lazy(() => import("../DashboardPage/DashboardPage"));

const dashboardRoutes = [
  { path: routes.dashboard, component: DashboardPage},
];

export default dashboardRoutes;
