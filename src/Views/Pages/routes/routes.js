import jobRoutes from './jobRoutes';
import employerRoutes from './employerRouters';
import workerRoutes from './workerRoutes';
import settingsRoutes from './settingsRoutes';
import generalRoutes from './generalRoutes';
import processingRoutes from './processingRoutes';
import invoiceRoutes from './invoiceRoutes';
import contractRoutes from './contractRoutes';
import insuranceRoutes from './insuranceRoutes';
import dashboardRoutes from './dashboardRoutes';
import reportRoutes from './reportRoutes';

const routes = [
  ...dashboardRoutes,
  ...jobRoutes,
  ...employerRoutes,
  ...workerRoutes,
  ...processingRoutes,
  ...insuranceRoutes,
  ...settingsRoutes,
  ...generalRoutes,
  ...invoiceRoutes,
  ...contractRoutes,
  ...reportRoutes,
];

export default routes;
