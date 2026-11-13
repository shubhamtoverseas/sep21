import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import LayoutComponent from "../../components/Layout/LayoutComponent";
import ProtectedRoute from "../../components/ReusableComponents/ProtectedRoute";
import CustomSpinner from "../../components/ReusableComponents/CustomSpinner";
import routes from "./routes/routes";
import routesConfig from "./routes/routesConfig/index";
import socketIO from "socket.io-client"
import { HOST_TYPE, REACT_APP_SCHEDULER_URL, REACT_APP_X_API_KEY } from "../../services/apiPath";
import { getCurrentUser } from "../../services/commonService";
import { setupSchedulerSocket } from "../../utils/sockets";
import TranslationProvider from "../../components/translation-provider/TranslationProvider";
import RouteErrorBoundary from "../../components/ErrorBoundary/RouteErrorBoundary";
import "../../utils/dayjsConfig";
import { chatSocketHandle } from "../../utils/sockets";

export const UserContext = React.createContext();
const Login = lazy(() => import("./LoginPage/Login"));
const HomePage = lazy(() => import("./HomePage/HomePage"));
const ForgotPasswordPage = lazy(() => import("./LoginPage/ForgotPasswordPage"));
const CodeSentToEmailPage = lazy(() => import("./LoginPage/CodeSentToEmailPage"));
const ResetPasswordPage = lazy(() => import("./LoginPage/ResetPasswordPage"));
const PrivacyPage = lazy(() => import("./PublicPages/PrivacyPage"));
const QrCodePage = lazy(() => import("./PublicPages/QrCodePage"));
const TermsPage = lazy(() => import("./PublicPages/TermsPage"));
const ShareStageDetailsPage = lazy(() => import("./PublicPages/deep-link/ShareStageDetails"));
const WorkerDetailDeepLinkPage = lazy(() => import("./PublicPages/deep-link/WorkerDetailDeepLinkPage"));
const JobDetailDeepLinkPage = lazy(() => import("./PublicPages/deep-link/JobDetailDeepLinkPage"));
const IAmInterestedPage = lazy(() => import("./PublicPages/deep-link/IAmInterestedPage"));
const SendInterviewRequestDatePage = lazy(() => import("./PublicPages/deep-link/send-interview-request/SendInterviewRequestDatePage"));
const SendInterviewRequestTimePage = lazy(() => import("./PublicPages/deep-link/send-interview-request/SendInterviewRequestTimePage"));
const SendInterviewRequestLocationPage = lazy(() => import("./PublicPages/deep-link/send-interview-request/SendInterviewRequestLocationPage"));
const SendInterviewRequestConfirmPage = lazy(() => import("./PublicPages/deep-link/send-interview-request/SendInterviewRequestConfirmPage"));
const SendInterviewRequestSuccessPage = lazy(() => import("./PublicPages/deep-link/send-interview-request/SendInterviewRequestSuccessPage"));
const RescheduleRequestPage = lazy(() => import("./PublicPages/deep-link/reschedule-request/RescheduleRequestPage"));

const LoggedInRoutes = () => (
  <Suspense fallback={<CustomSpinner />}>
    <Routes>
      <Route path={routesConfig.login} element={<Login />} />
      <Route path={routesConfig.home} element={<HomePage />} />
      <Route path={routesConfig.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={routesConfig.codeSentToEmail} element={<CodeSentToEmailPage />} />
      <Route path={routesConfig.resetPassword} element={<ResetPasswordPage />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  </Suspense>
);

const App = () => {
  const { isLoggedIn } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  useEffect(() => {
    if (!isLoggedIn) return;

    const currentUser = getCurrentUser()?.data;

    const socket = socketIO(REACT_APP_SCHEDULER_URL, {
      withCredentials: false,
      transportOptions: {
        polling: {
          extraHeaders: {
            "hosttype": HOST_TYPE,
            "device": navigator.userAgent,
            'x-api-key': REACT_APP_X_API_KEY,
            'language': localStorage.getItem('i18nextLng'),
            'Accept-Language': localStorage.getItem('i18nextLng'),
          }
        }
      }
    });

    const { connectSchedulerSocket, disconnectSchedulerSocket } = setupSchedulerSocket(
      socket,
      currentUser,
      dispatch
    );

    const { connectSocketChat, disconnectSocketChat } = chatSocketHandle(
      currentUser,
      dispatch
    );

    connectSocketChat(); // Set up chat socket connection

    connectSchedulerSocket();

    return () => {
      disconnectSchedulerSocket();
      disconnectSocketChat();
    };
  }, [isLoggedIn, dispatch]);

  return (
    <TranslationProvider >
      <Suspense fallback={<CustomSpinner />}>
        <Routes>
          <Route path={routesConfig.qrCode} element={<QrCodePage />} />
          <Route path={routesConfig.privacyPolicy} element={<PrivacyPage />} />
          <Route path={routesConfig.termAndCondition} element={<TermsPage />} />
          <Route path={routesConfig.deeplLinkJobDetail} element={<JobDetailDeepLinkPage />} />
          <Route path={routesConfig.shareStageDetails} element={<ShareStageDetailsPage />} />
          <Route path={routesConfig.deeplLinkWorkerDetail} element={<WorkerDetailDeepLinkPage />} />
          <Route path={routesConfig.deeplLinkWorkerInterested} element={<IAmInterestedPage />} />
          <Route path={routesConfig.deeplLinkSendInterviewRequestDate} element={<SendInterviewRequestDatePage />} />
          <Route path={routesConfig.deeplLinkSendInterviewRequestTime} element={<SendInterviewRequestTimePage />} />
          <Route path={routesConfig.deeplLinkSendInterviewRequestLocation} element={<SendInterviewRequestLocationPage />} />
          <Route path={routesConfig.deeplLinkSendInterviewRequestConfirm} element={<SendInterviewRequestConfirmPage />} />
          <Route path={routesConfig.deeplLinkSendInterviewRequestSuccess} element={<SendInterviewRequestSuccessPage />} />
          <Route path={routesConfig.reScheduleRequest} element={<RescheduleRequestPage />} />
          <Route path="/*" element={
            !isLoggedIn ? (
              <LoggedInRoutes />
            ) : (
              <UserContext.Provider value="Rerender">
                <LayoutComponent>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                    {routes.map((route, index) => {
                      const { path, component: Component, permissionKey, moduleKey } = route;
                      return (
                        <Route
                          key={`${path}-${index}`}
                          path={path}
                          element={
                             <ProtectedRoute moduleKey={moduleKey} permissionKey={permissionKey || ""}>
                              <RouteErrorBoundary>
                                <Component />
                              </RouteErrorBoundary>
                            </ProtectedRoute>
                          }
                        />
                      );
                    })}
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </LayoutComponent>
              </UserContext.Provider>
            )
          } />
        </Routes>
      </Suspense>
    </TranslationProvider>
  );
};

export default App;