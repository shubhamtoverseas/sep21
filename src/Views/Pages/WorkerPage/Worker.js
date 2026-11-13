import React, { lazy, Suspense } from "react";
import translation from "../../../utils/translation";
const WorkerDashboard = lazy(() => import("./dashboard/WorkerDashboard"));

const Worker = () => (
  <Suspense fallback={ <div>{ translation('key_loading') }...</div> }>
    <WorkerDashboard />
  </Suspense>
);

export default Worker;

