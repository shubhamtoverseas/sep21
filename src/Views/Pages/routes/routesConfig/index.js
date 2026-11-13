import authRoutes from './authRoutes';
import homeRoutes from './homeRoutes';
import jobRoutes from './jobRoutes';
import employerRoutes from './employerRoutes';
import workerRoutes from './workerRoutes';
import settingsRoutes from './settingsRoutes';
import generalRoutes from './generalRoutes';
import processingRoutes from './processingRoutes';
import invoiceRoutes from './invoiceRoutes';
import contractRoutes from './contractRoutes';
import insuranceRoutes from './insuranceRoutes';
import reportRoutes from './reportRoutes';

const routes = {
  ...homeRoutes,
  ...authRoutes,
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
};

export default routes;
