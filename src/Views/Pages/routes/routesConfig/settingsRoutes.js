const settingsRoutes = {
  settings: "/settings",
  agencies: "settings/agencies",
  addAgency: "settings/add-agency",
  branches: "settings/branches",
  addBranch: "settings/add-branch",
  roles: "settings/roles",
  addRole: "settings/add-role",
  users: "settings/users",
  addUser: "settings/add-user",
  userPermissions: "settings/user-permissions",   /* U-0357: the Permissions editor is its own page under the selected user */
  leaves: "settings/leaves",
  applyLeave: "settings/apply-leave",
  daysOfOperation: "settings/days-of-operation",
  addDaysOfOperation: "settings/add-doop",
  holidays: "settings/holidays",
  addHoliday: "settings/add-holiday",
  templates: "settings/templates",
  taskTemplates: "settings/task-templates",
  addTemplate: "settings/add-template",
  shiftCodes: "settings/shift-codes",
  addShiftCode: "settings/add-shift-code",
  manualUpdateLeaves: "settings/manual-update-leaves",
  viewLeaveLedger: "settings/view-leave-ledger",
  priceList: "settings/price-list",
  importShiftRoster: "/settings/import-roster",
  rosterViewer: "/settings/roster-viewer",
  leavePolicy: "settings/leave-policy",
  addLeavePolicy: "settings/add-leave-policy",
  medicalList: "settings/medical-list",
  addMedicalClinic: "settings/add-medical-clinic",
  promptManager: "settings/prompt-manager",
  preparedReadyDefaults: "settings/prepared-ready-defaults",
  // The :id? means the id parameter is optional in the route
  newPromptTemplate: "settings/new-prompt-template"
};

export default settingsRoutes;
