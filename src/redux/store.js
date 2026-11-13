import { combineReducers, configureStore } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage";
import { persistReducer, persistStore } from "redux-persist";
import authReducer from "./Slices/Auth";
import uploadProfileReducer from "./Slices/UploadProfile";
import addWorkerReducer from "./Slices/AddWorker";
import sendRegLinkReducer from "./Slices/SendRegLinks";
import workerDetailsReducer from "./Slices/WorkerDetailsDropdowns";
import messageReducer from "./Slices/Messages";
import AgenciesReducer from "./Slices/settings/agencies/AgenciesSlice";
import BranchesReducer from "./Slices/settings/branches/BranchesSlice";
import CountriesReducer from "./Slices/common/countries/CountriesSlice";
import NationalitiesReducer from "./Slices/common/nationalities/NationalitiesSlice";
import WorkerStatusesReducer from "./Slices/common/workerStatuses/WorkerStatusesSlice";
import LocationsReducer from "./Slices/common/locations/LocationsSlice";
import DistrictReducer from "./Slices/common/district/DistrictSlice";
import SpokenLanguageReducer from "./Slices/common/spokenLanguage/SpokenLanguageSlice";
import RolesReducer from "./Slices/settings/roles/RolesSlice";
import usersReducer from "./Slices/settings/users/UsersSlice";
import doopsReducer from "./Slices/settings/doops/DoopSlice";
import feedbackReportsReducer from "./Slices/settings/feedback-report/FeedbackReportSlice";
import reportsReducer from "./Slices/reports/reportSlice";
import interviewReportsReducer from "./Slices/settings/interview-report/InterviewReportSlice";
import HolidaySlice from "./Slices/settings/holidays/HolidaySlice";
import UserPermissionSlice from "./Slices/settings/user-permissions/UserPermissionSlice";
import UserSessionSlice from "./Slices/settings/user-session/UserSessionSlice";
import ShiftCodeSlice from "./Slices/settings/shift-code/ShiftCodeSlice";
import LeavesSlice from "./Slices/settings/leaves/LeavesSlice";
import TemplateSlice from "./Slices/settings/templates/TemplateSlice";
import ProfileSlice from "./Slices/profile/ProfileSlice";
import TimeRequests from "./Slices/settings/time-request/TimeRequestSlice";
import LedgerSlice from "./Slices/settings/ledger/LedgerSlice";
import CalendarSlice from "./Slices/calendar/CalendarSlice";
import LeavePolicySlice from "./Slices/settings/leavePolicy/LeavePolicySlice";
import JobOfferSlice from "./Slices/job-offer/JobOfferSlice";
import EmployerSlice from "./Slices/employer/EmployerSlice";
import RemarkSlice from "./Slices/remarks/RemarkSlice";
import ContractSlice from "./Slices/contract/ContractSlice";
import InvoicesSlice from "./Slices/invoices/InvoicesSlice";
import InsuranceSlice from "./Slices/insurance/InsuranceSlice";

import CSSlice from "./Slices/common/cs/CsSlice";
import CommonSlice from "./Slices/common/CommonSlice";
import WorkerSlice from "./Slices/worker/WorkerSlice";
import InterviewSlice from "./Slices/common/interview/InterviewSlice";
import processingSlice from "./Slices/processing/ProcessingSlice";
import priceListSlice from "./Slices/settings/price-list/PriceListSlice";
import medicalSlice from "./Slices/settings/medical/MedicalSlice";
import PromptManagerSlice from "./Slices/settings/prompt-manager/PromptManagerSlice";
import loginSlice from "./Slices/common/login/LoginSlice";

import ChatSlice from "./Slices/chat/ChatSlice";
import logoutMiddleware from "./LogoutMiddleware";
import { hydrateInvoiceDraft, invoiceDraftMiddleware } from "./invoiceDraftSession";

// Only durable slices. auth/login stay out (JWT lives in sessionStorage, not localStorage);
// server-data slices (worker, invoices, chat, ...) must NOT be persisted.
const PERSIST_WHITELIST = ["users", "userPermissions"];

const persistConfig = {
  key: "root",
  storage,
  version: 1,
  whitelist: PERSIST_WHITELIST,
  migrate: (state) => {
    if (!state) return Promise.resolve(undefined);
    const migrated = {};
    [...PERSIST_WHITELIST, "_persist"].forEach((key) => {
      if (state[key] !== undefined) migrated[key] = state[key];
    });
    return Promise.resolve(migrated);
  },
};

const reducer = {
  auth: authReducer,
  sendRegLink: sendRegLinkReducer,
  addWorker: addWorkerReducer,
  workerDetails: workerDetailsReducer,
  // jobsList: jobsListReducer,
  uploadProfile: uploadProfileReducer,
  message: messageReducer,
  agencies: AgenciesReducer,
  branches: BranchesReducer,
  countries: CountriesReducer,
  nationalities: NationalitiesReducer,
  workerStatuses: WorkerStatusesReducer,
  locations: LocationsReducer,
  district: DistrictReducer,
  spokenLanguage: SpokenLanguageReducer,
  roles: RolesReducer,
  users: usersReducer,
  doops: doopsReducer,
  feedbackReports: feedbackReportsReducer,
  reports: reportsReducer,
  interviewReports: interviewReportsReducer,
  holidays: HolidaySlice,
  userPermissions: UserPermissionSlice,
  userSession: UserSessionSlice,
  shiftCodes: ShiftCodeSlice,
  leaves: LeavesSlice,
  templates: TemplateSlice,
  profile: ProfileSlice,
  timeRequests: TimeRequests,
  ledger: LedgerSlice,
  calendar: CalendarSlice,
  leavePolicy: LeavePolicySlice,
  jobOffer: JobOfferSlice,
  employer: EmployerSlice,
  remarks: RemarkSlice,
  cs: CSSlice,
  contracts: ContractSlice,
  invoices: InvoicesSlice,
  insurance: InsuranceSlice,
  chat: ChatSlice,
  common: CommonSlice,
  worker: WorkerSlice,
  interview: InterviewSlice,
  processing: processingSlice,
  priceList: priceListSlice,
  medical: medicalSlice,
  promptManager: PromptManagerSlice,
  login: loginSlice,

};
const appReducer = combineReducers({ ...reducer });

const rootReducer = (state, action) => {
  if (action.type === "RESET_REDUX_AFTER_LANGUAGE_CHANGE") {
    const stateToKeep = {
      users: state.users,
      auth: state.auth,
      login: state.login,
      userPermissions: state.userPermissions
    };

    return appReducer(stateToKeep, { type: "@@INIT" });
  }

  return appReducer(state, action);
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }).concat(logoutMiddleware, invoiceDraftMiddleware),
});
/* the in-progress Add Invoice draft lives in sessionStorage for the tab's lifetime (invoiceDraftSession.js) —
   not through redux-persist, which stays limited to the durable slices above */
hydrateInvoiceDraft(store);
export const persistor = persistStore(store);
