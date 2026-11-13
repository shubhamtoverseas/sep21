import { lazy } from "react";
import routes from "./routesConfig/index";
import { hasPermission } from "../../../services/commonService";
import { store } from "../../../redux/store";

const Agencies = lazy(() => import("../SettingsPage/newui/agencies/AgencyList"));
const Settings = lazy(() => import("../SettingsPage/newui/SettingsHome"));
const AddAgency = lazy(() => import("../SettingsPage/newui/agencies/AgencyFormPage"));
const Branches = lazy(() => import("../SettingsPage/newui/branches/BranchList"));
const Roles = lazy(() => import("../SettingsPage/newui/roles/RoleList"));
const AddBranch = lazy(() => import("../SettingsPage/newui/branches/BranchFormPage"));
const AddRole = lazy(() => import("../SettingsPage/newui/roles/RoleFormPage"));
const Users = lazy(() => import("../SettingsPage/newui/users/UserList"));
const AddUser = lazy(() => import("../SettingsPage/newui/users/UserFormPage"));
const UserPermissions = lazy(() => import("../SettingsPage/newui/users/UserPermissionsPage"));
const Leaves = lazy(() => import("../SettingsPage/newui/hrms/leaves/LeaveList"));
const ApplyLeave = lazy(() => import("../SettingsPage/newui/hrms/leaves/ApplyLeavePage"));
const DaysOfOperation = lazy(() => import("../SettingsPage/newui/doop/DoopList"));
const AddDaysOfOpertaion = lazy(() => import("../SettingsPage/newui/doop/DoopFormPage"));
const HolidayList = lazy(() => import("../SettingsPage/newui/holidays/HolidayList"));
const TemplateList = lazy(() => import("../SettingsPage/newui/templates/TemplateList"));
const TaskTemplateList = lazy(() => import("../SettingsPage/newui/task-templates/TaskTemplateList"));
const AddHoliday = lazy(() => import("../SettingsPage/newui/holidays/HolidayFormPage"));
const AddTemplate = lazy(() => import("../SettingsPage/newui/templates/TemplateFormPage"));
const ShiftCodes = lazy(() => import("../SettingsPage/newui/shift-codes/ShiftCodeList"));
const ShiftRosterViewer = lazy(() => import("../SettingsPage/newui/shift-codes/roster/RosterViewerPage"));
const AddShiftCode = lazy(() => import("../SettingsPage/newui/shift-codes/ShiftCodeFormPage"));
const ImportShiftRoster = lazy(() => import("../SettingsPage/newui/shift-codes/import/ImportShiftRosterPage"));
const LeavePolicy = lazy(() => import("../SettingsPage/newui/leave-policy/LeavePolicyList"));
const AddLeavePolicy = lazy(() => import("../SettingsPage/newui/leave-policy/LeavePolicyFormPage"));
const ManualUpdateLeaves = lazy(() => import("../SettingsPage/newui/manual-update-leaves/ManualUpdateLeavePage"));
const ViewLeaveLedger = lazy(() => import("../SettingsPage/newui/leave-ledger/LeaveLedgerPage"));
const PriceList = lazy(() => import("../SettingsPage/newui/price-list/PriceListPage"));
const MedicalList = lazy(() => import("../SettingsPage/newui/medical/MedicalList"));
const AddMedicalClinic = lazy(() => import("../SettingsPage/newui/medical/MedicalFormPage"));
const PreparedReadyDefaults = lazy(() => import("../SettingsPage/newui/prepared-ready-defaults/PreparedReadyDefaultsPage"));
const PromptManager = lazy(() => import("../SettingsPage/newui/prompt-manager/PromptManagerList"));
const NewPromptTemplate = lazy(() => import("../SettingsPage/newui/prompt-manager/PromptTemplateFormPage"));

/* QA-27-015: the Price List opens on any of its view keys (the one the user holds is handed to ProtectedRoute, read when the
   route renders); with none of them it opens on its own "You don't have permission to view the Price List." state (PL-UI1
   row 13), never a redirect to the dashboard */
export const PRICE_LIST_VIEW_KEYS = Object.freeze(["view_fixed_item_price", "view_conditional_item_price", "view_conditional_local_item_price", "view_promotion", "view_worker_promotion"]);
export const priceListViewKey = () => PRICE_LIST_VIEW_KEYS.find((key) => hasPermission(store.getState().users?.permissionList?.data, "configuration", key)) || null;

/* PK-01 P1-18 (SETTINGS-007): Leaves opens on Add Leave (HRMS) or View Leave (Leave Management), the two keys its hrms list
   call accepts (checkAnyPermission); the [module, key] the user holds is handed to ProtectedRoute, Add Leave when neither */
export const LEAVES_ROUTE_KEYS = Object.freeze([["hrms", "add_leave"], ["leave_management", "view_leave"]]);
export const leavesRouteKey = () => LEAVES_ROUTE_KEYS.find(([module, key]) => hasPermission(store.getState().users?.permissionList?.data, module, key)) || LEAVES_ROUTE_KEYS[0];

/* Priyanka 11 Nov (audit #115): the ledger opens on either leave_management key — view_leave_ledger OR
   view_leave_ledger_non_reportees; the one the user holds is handed to ProtectedRoute */
export const LEAVE_LEDGER_ROUTE_KEYS = Object.freeze(["view_leave_ledger", "view_leave_ledger_non_reportees"]);
export const leaveLedgerRouteKey = () => LEAVE_LEDGER_ROUTE_KEYS.find((key) => hasPermission(store.getState().users?.permissionList?.data, "leave_management", key)) || LEAVE_LEDGER_ROUTE_KEYS[0];

const settingsRoutes = [
  { path: routes.settings, component: Settings, moduleKey: "settings", permissionKey: "settings_access"},
  { path: routes.agencies, component: Agencies, moduleKey:"settings", permissionKey: "view_agency" },
  { path: routes.addAgency, component: AddAgency, moduleKey:"settings", permissionKey: 'edit_agency' },
  { path: routes.branches, component: Branches, moduleKey:"settings", permissionKey: "view_branch" },
  { path: routes.addBranch, component: AddBranch, moduleKey:"settings", permissionKey: 'edit_branch' },
  { path: routes.roles, component: Roles, moduleKey:"users", permissionKey: "view_role" },
  { path: routes.addRole, component: AddRole, moduleKey:"users", permissionKey: "edit_role" },
  { path: routes.users, component: Users, moduleKey:"users", permissionKey: "users_access" },
  { path: routes.addUser, component: AddUser, moduleKey:"users", permissionKey: "edit_user" },
  /* U-0357: Settings → People → Users → Permissions; gated as tab 4 was (edit_user) until a manage-permissions key is minted */
  { path: routes.userPermissions, component: UserPermissions, moduleKey:"users", permissionKey: "edit_user" },
  { path: routes.leaves, component: Leaves, get permissionKey() { return leavesRouteKey()[1]; }, get moduleKey() { return leavesRouteKey()[0]; } },
  { path: routes.applyLeave, component: ApplyLeave, moduleKey: "hrms", permissionKey: "add_leave" },
  { path: routes.daysOfOperation, component: DaysOfOperation, moduleKey:"configuration", permissionKey: "view_doop" },
  { path: routes.addDaysOfOperation, component: AddDaysOfOpertaion, moduleKey:"configuration", permissionKey: "edit_doop" },
  { path: routes.holidays, component: HolidayList, moduleKey:"configuration", permissionKey: "view_holiday" },
  { path: routes.addHoliday, component: AddHoliday, moduleKey:"configuration", permissionKey: "edit_holiday"   },
  { path: routes.templates, component: TemplateList, moduleKey: "configuration", permissionKey: "view_template" },
  /* Task Template Manager: the new permission key is not minted yet — the spec's proposed binding (view_template) gates the route meanwhile */
  { path: routes.taskTemplates, component: TaskTemplateList, moduleKey: "configuration", permissionKey: "task_template_manager" },
  { path: routes.addTemplate, component: AddTemplate, moduleKey: "configuration", permissionKey: "add_template" },
  { path: routes.rosterViewer, component: ShiftRosterViewer, moduleKey:"shift_management", permissionKey: "view_shift_roster" },
  { path: routes.shiftCodes, component: ShiftCodes, moduleKey:"shift_management", permissionKey: "view_shift_code" },
  { path: routes.addShiftCode, component: AddShiftCode, moduleKey:"shift_management", permissionKey: "edit_shift_code" },
  { path: routes.importShiftRoster, component: ImportShiftRoster, moduleKey:"shift_management", permissionKey: "import_shift_roster" },
  { path: routes.leavePolicy, component: LeavePolicy, moduleKey:"leave_management", permissionKey: "view_leave" },
  { path: routes.addLeavePolicy, component: AddLeavePolicy, moduleKey:"leave_management", permissionKey: "edit_leave" },
  { path: routes.manualUpdateLeaves, component: ManualUpdateLeaves, moduleKey:"leave_management", permissionKey: "manual_update_leave" },
  { path: routes.viewLeaveLedger, component: ViewLeaveLedger, moduleKey:"leave_management", get permissionKey() { return leaveLedgerRouteKey(); } },
  { path: routes.priceList, component: PriceList, moduleKey: "configuration", get permissionKey() { return priceListViewKey(); } },
  { path: routes.medicalList, component: MedicalList, moduleKey: "configuration", permissionKey: "view_medical_clinic" },
  { path: routes.addMedicalClinic, component: AddMedicalClinic, moduleKey: "configuration", permissionKey: "edit_medical_clinic" },
  /* R-SET-1 (owner 5 Nov): the Prompt Manager opens on View Prompt Manager, a new or edited template on Edit Prompt Manager */
  { path: routes.promptManager, component: PromptManager, moduleKey: "configuration", permissionKey: "view_prompt_manager" },
  /* PK-01 P1-18: Manage assignment eligibility, the authority processing checks for the defaults (22 Oct package N01) */
  { path: routes.preparedReadyDefaults, component: PreparedReadyDefaults, moduleKey: "users", permissionKey: "manage_assignment_eligibility" },
  { path: routes.newPromptTemplate, component: NewPromptTemplate, moduleKey: "configuration", permissionKey: "edit_prompt_manager" },
];

export default settingsRoutes;