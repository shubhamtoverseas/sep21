import tickMark from "../../assets/img/svg/tick-mark.svg";
import closeMark from "../../assets/img/svg/close-mark.svg";
import userPlusBlue from '../../assets/img/svg/user-plus-blue.svg';
import pinkUser from '../../assets/img/svg/pink-user.svg';
import usersGreen from '../../assets/img/svg/users-green.svg';
import calendar from '../../assets/img/svg/calendar.svg';
import blankPurpleCalendar from '../../assets/img/svg/blank-purple-calendar.svg';
import calendarTickOrange from '../../assets/img/svg/calendar-tick-orange.svg';
import crossRed from '../../assets/img/svg/cross-red.svg';
import adminOrange from "../../assets/img/svg/admin-orange.svg";
import phoneWhite from "../../assets/img/svg/phone-white.svg";
import tabletOrange from "../../assets/img/svg/tablet-orange.svg";
import desktopWhite from "../../assets/img/svg/desktop-white.svg";
import routes from "../../Views/Pages/routes/routesConfig";
import crossLight from "../../assets/img/svg/cross-light.svg";
import greenTickIcon from "../../assets/img/svg/tick-mark.svg";
import { convertTo12HourFormat, customFromNow, formatDateTime, formatDuration, formatFeedbackType, formatTimeTo12HourFormat, getCurrentUser, getTimeRequestStatusLabel, hasPermission } from "../../services/commonService";
import translation from "../../utils/translation";
import { hasCalendarAccess } from "../../utils/permissions/followUpPermissionUtils";
import { WORKER_PROFILE_STATUS, workerProfileStatusLabel } from "../../Views/Pages/WorkerPage/workerModuleConstants";
import dayjs from "dayjs";

const profileConfig = [
  { label: "Role", value: "Helper" },
  { label: "Gender", value: "Female" },
  { label: "Nationality", value: "Filipino" },
  { label: "Date of Birth", value: "12/12/1999" },
  { label: "Height", value: "155 cm" },
  { label: "Weight", value: "47 kg" },
  { label: "Religion", value: "Christian" },
  { label: "Age", value: "24" },
];
const predefinedDateRanges = [
  { label: "Custom Date Range", value: "custom", key: "key_custom_date_range" },
  { label: "Yesterday", value: "yesterday", key: "key_yesterday" },
  { label: "Last 7 days", value: "last_7_days", key: "key_last_7_days" },
  { label: "Last 30 days", value: "last_30_days", key: "key_last_30_days" },
  { label: "Last 60 days", value: "last_60_days", key: "key_last_60_days" },
  { label: "Last 90 days", value: "last_90_days", key: "key_last_90_days" },
  { label: "This Month", value: "this_month", key: "key_this_month" },
  { label: "Last Month", value: "last_month", key: "key_last_month" },
  { label: "This Quarter", value: "this_quarter", key: "key_this_quarter" },
  { label: "Year to Date", value: "year_to_date", key: "key_year_to_date" },
  { label: "Last Year", value: "last_year", key: "key_last_year" },
];
const familyBackgroundConfig = [
  { label: "Marital Status", value: "Married" },
  { label: "No of Children", value: "3" },
  { label: "Age of eldest child", value: "?" },
  { label: "No. of siblings", value: "4" },
];

const languageAndEducationConfig = [
  { label: "Languages", value: "English, Chinese" },
  { label: "Special Course", value: "Bachelor of Nursing, Bachelor in Education" },
  { label: "Education", value: "College, University" },
  { label: "Institution", value: "University of Phillipens" },
];
const workExperienceConfig = [
  { label: "Role", value: "Helper" },
  { label: "Start Date - End Date", value: "July 2018 - June 2020" },
  { label: "Work Location", value: "Hong Kong" },
  { label: "District", value: "Wanchai" },
  { label: "Employer Nationality", value: "Chinese" },
  { label: "Language Spoken", value: "Cantonese" },
  { label: "Family Size", value: "4" },
  { label: "Size of Home", value: "500 Sq Ft" },
  { label: "Reason for Leaving", value: "Terminated Due to Employer (Financial Problem)" }
];
const expectationsConfig = [
  { label: "Care for newborn baby", value: "Yes" },
  { label: "Care for someone with disability", value: "No" },
  { label: "Share room with co-helper", value: "Yes" },
  { label: "Share work with another helper", value: "Consider" },
  { label: "Day off preference", value: "Thursday" },
  { label: "Can interview on", value: "Sun, Mon, Tues" },
  { label: "Reference Letter", value: "Available" }
];

const spouseConfig = [
  { label: "Name", value: "Akash Singh" }
];

const previousContractConfig = [
  { label: "Previous Agency", value: "-" },
  { label: "Previous Partner Agency", value: "-" }
]

const documentStatusConfig = {
  provided: { text: 'provided to pt', icon: tickMark, className: 'text-success' },
  not_provided: { text: 'not provided to pt', icon: closeMark, className: 'text-danger' },
  received: { text: 'received', icon: tickMark, className: 'text-success' },
  not_received: { text: 'not received', icon: closeMark, className: 'text-danger' },
  never_applied: { text: 'never applied before', icon: null, className: '' }
};

const documentsConfig = [
  { id: 1, name: 'Passport (Previous)', status: documentStatusConfig.never_applied, date: '' },
  { id: 2, name: 'Indonesian ID', status: documentStatusConfig.provided, date: '12/10/2024' },
  { id: 3, name: 'Birth Certificate', status: documentStatusConfig.not_provided, date: '' },
  { id: 4, name: 'Education Certificate', status: documentStatusConfig.provided, date: '12/10/2024' },
  { id: 5, name: 'Family Certificate', status: documentStatusConfig.provided, date: '12/10/2024' },
  { id: 6, name: 'Family Permission Letter', status: documentStatusConfig.not_received, date: '' },
  { id: 7, name: 'Reference Letter', status: documentStatusConfig.not_received, date: '' },
  { id: 8, name: 'Letter of Inheritance', status: documentStatusConfig.received, date: '12/10/2024' },
];
export const masterLinksConfig = (settingsPermission) => {
  return [
    { id: 0, name: 'key_agency', link: 'agencies', isPermitted: settingsPermission?.canViewAgency },
    { id: 1, name: 'key_branch_office', link: 'branches', isPermitted: settingsPermission?.canViewBranch },
  ];
}
export const peopleLinksConfig = (userPermissions) => {
  return [
    { id: 0, name: 'key_role', link: 'roles', isPermitted: userPermissions?.canViewRole },
    { id: 1, name: 'key_users', link: 'users', isPermitted: userPermissions?.canViewUser },
    /* Settings → People → Prepared and Ready defaults (client package 22 Oct 2026, requirements N02): Manage assignment
       eligibility, the route's key (PK-01 P1-18); the server's can_edit still decides Save */
    { id: 4, name: 'key_cr_prep_ready_defaults', link: 'prepared-ready-defaults', isPermitted: userPermissions?.canManageAssignmentEligibility },
    // { id: 2, name: 'key_manual_update_leaves', link: 'manual-update-leaves', isPermitted: hrmsPermissions?.canManualUpdateLeave },
    // { id: 3, name: 'key_view_leave_ledger', link: 'view-leave-ledger', isPermitted: hrmsPermissions?.canViewLeaveLedger },
  ];
}
/* Settings → Configuration titles (conflict sheet U-0011): en keys, read through translation() */
export const SETTINGS_LINK_LABELS = Object.freeze({ sendTemplateManager: 'key_set_send_template_manager', taskTemplateManager: 'key_set_task_template_manager' });

export const configurationLinksConfig = (configurationPermissions) => {
  return [
    { id: 0, name: 'key_holidays', link: 'holidays', isPermitted: configurationPermissions?.canViewHoliday },
    // { id: 1, name: 'key_leave_policy', link: 'leave-policy', isPermitted: configurationPermissions?.canViewLeavePolicy },
    { id: 2, name: 'key_doop', link: 'days-of-operation', isPermitted: configurationPermissions?.canViewDoop },
    // { id: 3, name: 'key_shifts', link: 'shift-codes', isPermitted: configurationPermissions?.canViewShiftCode },
    /* conflict sheet U-0011: "Templates" reads Send Template Manager, with Task Template Manager right below it on its own key (task_template_manager, 14 Oct) */
    { id: 6, name: 'key_templates', label: translation(SETTINGS_LINK_LABELS.sendTemplateManager), link: 'templates', isPermitted: configurationPermissions?.canViewTemplate },
    { id: 7, name: 'key_templates', label: translation(SETTINGS_LINK_LABELS.taskTemplateManager), link: 'task-templates', isPermitted: configurationPermissions?.canTaskTemplateManager },
    { id: 8, name: 'key_price_list', link: 'price-list', isPermitted: configurationPermissions?.canViewFixedItemPrice || configurationPermissions?.canViewConditionalItemPrice || configurationPermissions?.canViewConditionalLocalItemPrice },
    { id: 9, name: 'key_medical_clinic', link: 'medical-list', isPermitted: configurationPermissions?.canViewMedicalClinic },
    /* R-SET-1 (owner 5 Nov): the route's key, View Prompt Manager (was admin only) */
    { id: 10, name: 'key_prompt_manager', link: 'prompt-manager', isPermitted: configurationPermissions?.canViewPromptManager },
  ]
}
export const leaveManagementConfig = (leaveManagementPermissions) => {
  return [
    { id: 1, name: 'key_leave_policy', link: 'leave-policy', isPermitted: leaveManagementPermissions?.canViewLeave },
    /* Priyanka 11 Nov: the non-reportees grant alone also opens the ledger */
    { id: 2, name: 'key_view_leave_ledger', link: 'view-leave-ledger', isPermitted: leaveManagementPermissions?.canViewLeaveLedger || leaveManagementPermissions?.canViewLeaveLedgerNonReportees },
    { id: 3, name: 'key_manual_update_leaves', link: 'manual-update-leaves', isPermitted: leaveManagementPermissions?.canManualUpdateLeave },
  ]
}

export const shiftManagementConfig = (shiftManagementPermissions) => {
  return [
    { id: 1, name: 'key_shifts', link: 'shift-codes', isPermitted: shiftManagementPermissions?.canViewShiftCode },
    { id: 2, name: 'key_shift_import', link: 'import-roster', isPermitted: shiftManagementPermissions?.canImportShiftCode },
    { id: 3, name: 'key_shift_roster_view', link: 'roster-viewer', isPermitted: shiftManagementPermissions?.canViewShiftRoster },
  ]
}

const daysOfWeek = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/* Job Offer report export — the JO_STATUS vocabulary (jobOfferConstants.js); legacy 5 / 9 present as Closed (U-0126) */
const statusMappingConfig = {
  1: 'Open',
  2: 'In Review',
  3: 'On Hold',
  4: 'Open (Expiring)',
  5: 'Closed',
  6: 'Closed',
  7: 'Draft',
  8: 'Banned',
  9: 'Closed'
};

/* Invoice statuses (INV §3.2; 28 Sep sheet row 3): the one admin definition, in spec order, matching the Invoice API
   (maidmatch-contract src/domain/invoice/statuses.ts INVOICE_STATUS_SET; checked by src/__test__/invoice). Draft is a
   pre-save state of the create forms with no stored id. Status 3 stays on its 2 stored rows only (ruling B6) and reads
   as the OP-S1-01 proposal. */
const INVOICE_STATUSES = Object.freeze([
  { code: 'draft', id: null, labelKey: 'key_draft', className: 'draft' },
  { code: 'pending_paid', id: 2, labelKey: 'key_pending_paid', className: 'pending-paid' },
  { code: 'paid', id: 1, labelKey: 'key_paid', className: 'paid' },
  { code: 'reservation_fee', id: 4, labelKey: 'key_reservation_fee', className: 'reservation_fee' },
  { code: 'refunded_unapproved', id: 8, labelKey: 'key_refunded_unapproved', className: 'refunded' },
  { code: 'refunded', id: 9, labelKey: 'key_refunded', className: 'paid' },
  { code: 'exchange_unapproved', id: 10, labelKey: 'key_exchange_unapproved', className: 'exchange' },
  { code: 'exchanged', id: 11, labelKey: 'key_exchanged', className: 'paid' },
  { code: 'unsettled', id: 5, labelKey: 'key_unsettled', className: 'unsettled' },
  { code: 'bad_debt', id: 7, labelKey: 'key_bad_debt', className: 'bad-debt' },
  { code: 'void', id: 6, labelKey: 'key_void', className: 'void' },
]);
const LEGACY_INVOICE_STATUS = Object.freeze({ code: 'legacy_partial', id: 3, labelKey: 'key_unsettled_legacy', className: 'unsettled' });

/* stored status id → { label (translated when read), className } */
const invoiceStatusIdMapping = Object.freeze(Object.fromEntries(
  [...INVOICE_STATUSES.filter((s) => s.id !== null), LEGACY_INVOICE_STATUS].map((s) => [s.id, {
    className: s.className,
    get label() { return translation(s.labelKey); },
  }])
));

/* Invoice types (INV §3.1; 28 Sep sheet row 4; ruling OP-ST2-01): stored invoice_type / payment_type values stay; the
   spec type is derived here, matching the Invoice API (maidmatch-contract src/domain/invoice/types.ts INVOICE_TYPE_SET;
   checked by src/__test__/invoice). Reservation Fee is a Contract subtype (payment_type), separate from the
   Reservation Fee status. */
const INVOICE_TYPES = Object.freeze([
  { code: 'standalone', stored: ['general'], labelKey: 'key_standalone', titleKey: 'key_invoice_type_title_standalone' },
  { code: 'contract', stored: ['contract'], labelKey: 'key_contract', titleKey: 'key_invoice_type_title_contract' },
  { code: 'reservation_fee', stored: ['contract'], subtypeOf: 'contract', labelKey: 'key_reservation_fee', titleKey: 'key_invoice_type_title_reservation_fee' },
  { code: 'refund_child', stored: ['general_refund', 'contract_refund', 'overpaid_refund'], labelKey: 'key_invoice_type_refund_child', titleKey: 'key_invoice_type_title_refund_child' },
  { code: 'exchange', stored: ['exchange'], labelKey: 'key_exchange', titleKey: 'key_invoice_type_title_exchange' },
  { code: 'underpayment_child', stored: ['underpayment'], labelKey: 'key_invoice_type_underpayment_child', titleKey: 'key_invoice_type_title_underpayment_child' },
]);
const INVOICE_TYPE_CLASS = Object.freeze({
  general: 'general', contract: 'contract', general_refund: 'general-refund', contract_refund: 'contract-refund',
  overpaid_refund: 'overpaid-refund', exchange: 'exchange', underpayment: 'underpayment',
});
const invoiceTypeOf = (invoiceType, paymentType) => {
  const base = INVOICE_TYPES.find((t) => !t.subtypeOf && t.stored.includes(invoiceType));
  if (!base) return null;
  return base.code === 'contract' && paymentType === 'reservation_fee' ? INVOICE_TYPES.find((t) => t.code === 'reservation_fee') : base;
};
/* stored invoice_type → { label (translated when read), className }; without the subtype (it needs payment_type) */
const invoiceTypeIdMapping = Object.freeze(Object.fromEntries(Object.keys(INVOICE_TYPE_CLASS).map((stored) => [stored, {
  className: INVOICE_TYPE_CLASS[stored],
  get label() { return translation(invoiceTypeOf(stored).labelKey); },
}])));
/* the spec type label of an invoice, with the Reservation Fee subtype */
const invoiceTypeLabel = (invoiceType, paymentType) => {
  const type = invoiceTypeOf(invoiceType, paymentType);
  return type ? translation(type.labelKey) : '';
};
/* the INV §3.1 title ("Refund Child Invoice") */
const invoiceTypeTitle = (invoiceType, paymentType) => {
  const type = invoiceTypeOf(invoiceType, paymentType);
  return type ? translation(type.titleKey) : '';
};


/* Profile Status — a view over the ONE registry in workerModuleConstants (WORKER_PROFILE_STATUS):
   { id, label, className, key, translationKey } per status id, as the legacy readers expect. */
const WorkerStatusNameMapping = Object.fromEntries(Object.values(WORKER_PROFILE_STATUS).map((s) => [
  s.id, { id: s.id, label: s.label, className: s.className, key: s.key, translationKey: s.translationKey },
]));

/* Canonical Profile Status label for a status id (registry); falls back to the API name only for an unknown id. */
const workerStatusLabel = workerProfileStatusLabel;

const WorkerDocumentStatusNameMapping = {
  'in_complete': { label: 'Incomplete', className: 'blue', icon: crossLight },
  'in_review': { label: 'In Review', className: 'worker-in-review' },
  'action_required': { label: 'Action Required', className: 'text-purple' },
  'verified': { label: 'Verified', className: 'expired', icon: greenTickIcon },
  'uploaded': { label: 'Uploaded', className: 'yellow' },
};

const titlesConfig = {
  holiday: "Holiday",
  shiftStart: "Shift Start",
  shiftEnd: "Shift End",
  weekOff: "Week Off",
  workingDay: "Working Day"
};

const membersCountConfig = [
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
];

const changeOwnerTitles = {
  bulk: 'Bulk Change CS',
  individual: 'Change Individual CS',
};


const choiceMap = {
  1: "Yes",
  0: "No",
  null: "No Preference",
};

const getMembersCountConfig = (memberCountInfo) => {
  const data = [
    { category: 'key_adults', no: memberCountInfo?.adult_count },
    { category: 'key_age_below_5', no: memberCountInfo?.child_age_below_5_count },
    { category: 'key_age_5_to_18', no: memberCountInfo?.child_age_5_8_count },
    { category: 'key_expecting_babies', no: memberCountInfo?.expecting_baby_count },
    { category: 'key_special_needs', no: memberCountInfo?.special_needs_count },
  ];
  return data;
}

const legendsConfig = [
  { label: 'key_invited', icon: userPlusBlue, className: 'invited' },
  { label: 'key_applied', icon: pinkUser, className: 'applied' },
  { label: 'key_matched', icon: usersGreen, className: 'matched' },
  { label: 'key_interview_pending', icon: blankPurpleCalendar, className: 'pending' },
  { label: 'key_interview_upcoming', icon: calendar, className: 'upcoming' },
  { label: 'key_interview_completed', icon: calendarTickOrange, className: 'completed' },
  { label: 'key_cancelled', icon: crossRed, className: 'cancelled' },
];
const dutiesConfig = [
  { id: 1, label: "Elderly Care" },
  { id: 2, label: "Baby Care" },
  { id: 3, label: "Pet Care" },
];
const ChannelConfig = {
  WHATSAPP: 'Whatsapp',
  WECHAT: 'Wechat',
  SMS: 'SMS'
};
const deviceIconClasses = {
  1: 'bg-green border-0',
  2: 'bg-blue border-0',
  3: 'bg-transparent',
  4: '',
};

const deviceIcons = {
  1: desktopWhite,
  2: phoneWhite,
  3: tabletOrange,
  4: adminOrange,
};
const localWorkerDashboard2ColumnsConfig = ({ t }) => [
  t("key_worker_name"),
  t("key_updated"),
  t("key_profile_status"),
  t("key_delay"),
  t("key_biodata"),
  t("key_photo"),
  t("key_contract_status"),
  t("key_contract_visa_expiry"),
  t("key_interpreter"),
];

const philppinesWorkerDashboard2ColumnsConfig = ({ t }) => [
  t("key_worker_name"),
  t("key_activity_status"),
  t("key_days_available"),
  t("key_views"),
  t("key_job_offer_statistics"),
  t("key_passport"),
  t("key_overseas_exp"),
  t("key_interpreter"),
];
const availableFilipinoWorkerColumnsConfigDashboard1Local = ({ t }) => [
  t("key_worker_name"),
  t("key_profile_status"),
  t("key_activity_status"),
  t("key_days_available"),
  t("key_views"),
  t("key_job_offer_statistics"),
  t("key_contract_status"),
  t("key_contract_visa_expiry"),
  t("key_interpreter"),
];

const workerColumnsConfigDashboard2Oversease = ({ t }) => [
  t("key_worker_name"),
  t("key_updated"),
  t("key_profile_status"),
  t("key_delay"),
  t("key_biodata"),
  t("key_photo"),
  t("key_interpreter")
];

const filipinoWorkerColumnsConfigDashboard2Oversease = ({ t }) => [
  t("key_worker_name"),
  t("key_updated"),
  t("key_profile_status"),
  t("key_delay"),
  t("key_biodata"),
  t("key_photo"),
  t("key_e_registration"),
  t("key_peos"),
  t("key_tesda"),
  t("key_assign_partner"),
  t("key_interpreter")
];
const availableFilipinoWorkerColumnsConfigDashboard1Oversease = ({ t }) => [
  t("key_worker_name"),
  t("key_activity_status"),
  t("key_days_available"),
  t("key_views"),
  t("key_job_offer_statistics"),
  t("key_passport"),
  t("key_overseas_exp"),
  t("key_interpreter"),
];
const defaultWorkerColumnsConfig = ({ t }) => [
  t("key_worker_name"),
  t("key_profile_status")
];
const defaultWorkerColumnsConfigDashBoard2 = ({ t }) => [
  t("key_worker_name"),
  t("key_profile_status"),
  t("key_onboarding") + " 1",
  t("key_onboarding") + " 2"
];
const localWorkerColumnsConfig = ({ t }) => [
  t("key_worker_name"),
  t("key_updated"),
  t("key_profile_status"),
  t("key_delay"),
  t("key_biodata"),
  t("key_contract_status"),
  t("key_contract_visa_expiry"),
  t("key_interpreter")
];
const availableWorkerColumnsConfig = ({ t }) => [
  t("key_worker_name"),
  t("key_activity_status"),
  t("key_days_available"),
  t("key_views"),
  t("key_job_offer_statistics"),
  t("key_contract_status"),
  t("key_contract_visa_expiry"),
  t("key_interpreter"),
];
const philppinesWorkerColumnsConfig = ({ t }) => [
  t("key_worker_name"),
  t("key_updated"),
  t("key_profile_status"),
  t("key_delay"),
  t("key_biodata"),
  t("key_photo"),
  t("key_e_registration"),
  t("key_peos"),
  t("key_tesda"),
  t("key_assign_partner"),
  t("key_contract_status"),
  t("key_contract_visa_expiry"),
  t("key_interpreter"),
];
const indonesianWorkerColumnsConfig = ({ t }) => [
  t("key_worker_name"),
  t("key_updated"),
  t("key_profile_status"),
  t("key_delay"),
  t("key_biodata"),
  t("key_photo"),
  t("key_passport"),
  t("key_indonesian_id"),
  t("key_birth_certificate"),
  t("key_family_certificate"),
  t("key_education_certificate"),
  t("key_assign_partner"),
  t("key_medical"),
  t("key_submit_documents"),
  t("key_training_certificate"),
  t("key_labour_id"),
  t("key_interpreter"),
];
const indoWorkerColumnsConfigDashboard2Oversease = ({ t }) => [
  t("key_worker_name"),
  t("key_updated"),
  t("key_profile_status"),
  t("key_delay"),
  t("key_biodata"),
  t("key_photo"),
  t("key_passport"),
  t("key_indonesian_id"),
  t("key_birth_certificate"),
  t("key_family_certificate"),
  t("key_education_certificate"),
  t("key_assign_partner"),
  t("key_medical"),
  t("key_submit_documents"),
  t("key_training_certificate"),
  t("key_labour_id"),
  t("key_interpreter"),
];

const allOverseaseIndoWorkerColumnsConfig = ({ t }) => [
  t("key_worker_name"),
  t("key_updated"),
  t("key_profile_status"),
  t("key_delay"),
  t("key_biodata"),
  t("key_photo"),
  t("key_assign_partner"),
  t("key_pt"),
  t("key_interpreter"),
];

const availableLocalWorkerColumnsConfigDashboard1 = ({ t }) => [
  t("key_worker_name"),
  t("key_profile_status"),
  t("key_activity_status"),
  t("key_days_available"),
  t("key_views"),
  t("key_contract_status"),
  t("key_contract_visa_expiry"),
  t("key_interpreter"),
];
const defaultWorkerOptionConfig = ({ t }) => [
  t("key_worker_name"),
  t("key_profile_status")
];
const workerKababOptionsConfig = (type, allItems, isFieldsToDisplay, filtersData = "") => {
  let subItems = allItems;
  if (type == "default") {
    subItems = defaultWorkerOptionConfig;
  }
  const items = [];
  if (isFieldsToDisplay) {
    items.unshift({
      id: 1,
      name: translation('key_select_fields_to_display'),
      type: 0,
      subItem: subItems,
    })
  }
  if (filtersData !== "") {
    if (filtersData?.branch_id_checkin && filtersData?.branch_id_checkin.length > 0) {
      items.push(
        {
          id: 2,
          name: translation('key_open_checkin_qr_code'),
          type: 1,
          subItem: [],
        },
        {
          id: 3,
          name: translation('key_replace_checkin_qr_code'),
          type: 2,
          subItem: [],
        },
        {
          id: 4,
          name: translation('key_checkout_selected_worker'),
          type: 3,
          subItem: [],
        }
      );
    }
  }
  return items;
  /*if (isFieldsToDisplay) {
    return [
      {
        id: 1,
        name: "Select Fields to Display",
        type: 0,
        subItem: subItems,
      },
      { id: 2, name: "Bulk Change Interpreter", type: 1 },
      { id: 3, name: "Change Individual Interpreter", type: 2 },
    ];
  } else {
    return [
      { id: 1, name: "Bulk Change Interpreter", type: 1 },
      { id: 2, name: "Change Individual Interpreter", type: 2 },
    ];
  }*/
}
const employerColumnsConfig = [
  "Employer Name",
  "Chinese Name",
  "HKID",
  "Mobile",
  "Email",
  "Latest Job Offer",
  "JO Status",
  "Latest Contract",
  "CS",
];

/* SH-06: column visibility is stored by stable key (the header's translation key), never by the visible label */
const employerColumnsConfigTrans = () => [
  "key_employer_name",
  "key_chinese_names",
  "key_hkid",
  "key_mobile",
  "key_whatsapp",
  "key_email",
  "key_latest_job_offer",
  "key_jo_status",
  "key_latest_contract",
  "key_cs",
];
/* { value: key, label } options for a column-visibility menu */
const columnOptions = (keys, t) => keys.map((key) => ({ value: key, label: t(key) }));
const empKababOptionsConfig = (isFieldsToDisplay) => {
  const items = [
    // { id: 2, name: translation('key_bulk_change_owner'), type: 1 },
    { id: 3, name: translation('key_change_individual_owner'), type: 2 },
  ];
  if (isFieldsToDisplay) {
    items.unshift({
      id: 1,
      name: translation('key_select_fields_to_display'),
      type: 0,
      subItem: columnOptions([
        'key_employer_name', 'key_chinese_names', 'key_hkid', 'key_mobile', 'key_email',
        'key_latest_job_offer', 'key_jo_status', 'key_latest_contract', 'key_cs',
      ], translation),
    },)
  }
  return items;
}
const partnerColumnsConfigTrans = () => [
  "key_name", "key_worker_status", "key_updated", "key_biodata", "key_photo", "key_passport", "key_medical",
  "key_training_certificate", "key_labor_id", "key_details", "key_onboarding_1", "key_onboarding_2", "key_partner",
];



/* Insurance dashboard columns (ENUMS §H; stable ids). Default order per the prototype (Insurance.html dashboard.js COLUMNS;
   owner ruling Q-19, 10 Nov 2026): Worker Name · Employer Name · Insurance Ref · Open requests · Coverage status ·
   QBE policy number · Activity · Policy period, then the optional Expiry · Contract · Submitted by, and the CS Owner · Branch
   pair last. "openRequests" replaces the retired id "nextStep" (saved preferences are migrated, migrateInsurancePreferences).
   Provider is retired and never offered. */
const INSURANCE_COLUMN_IDS = [
  "workerName", "employerName", "insuranceRef", "openRequests", "coverageStatus", "qbePolicyNumber", "activity", "policyPeriod",
  "expiry", "contract", "submittedBy", "csOwner", "branch",
];

/* Optional columns: off by default, offered in the Columns chooser */
const INSURANCE_OPTIONAL_COLUMN_IDS = ["expiry", "contract", "submittedBy"];

const insuranceColumnLabels = ({ t }) => ({
  workerName: t("key_worker_name"),
  insuranceRef: t("key_ins_col_ref"),
  employerName: t("key_employer_name"),
  activity: t("key_ins_col_activity"),
  policyPeriod: t("key_ins_col_policy_period"),
  coverageStatus: t("key_ins_col_coverage_status"),
  openRequests: t("key_ins_col_open_requests"),
  csOwner: t("key_ins_col_cs_owner"),
  branch: t("key_branch"),
  expiry: t("key_expiry"),
  qbePolicyNumber: t("key_ins_col_qbe_policy_number"),
  contract: t("key_contract"),
  submittedBy: t("key_ins_col_submitted_by"),
});

/* Default visible set, in order: every column except the optional ones */
const insuranceColumnsConfigTrans = () => INSURANCE_COLUMN_IDS.filter((id) => !INSURANCE_OPTIONAL_COLUMN_IDS.includes(id));

/* Always shown; the Columns chooser cannot turn these off (register #82). A stored preference without one of them gets it back. */
const insuranceMandatoryColumnsTrans = () => ["workerName", "insuranceRef", "qbePolicyNumber"];

/* Every column the Columns chooser offers, in order */
const insuranceColumnsConfigTranslate = ({ translation }) => {
  const labels = insuranceColumnLabels({ t: translation });
  return INSURANCE_COLUMN_IDS.map((id) => ({ value: id, label: labels[id] }));
};


/* Invoice list columns — reference invoice.html default order:
   Status · Payment · Type · Ref No. · Date · Employer · Worker Name · Code ·
   Total · Paid · Balance Due · Refunded · Unsettled · Bad Debt · Adjustment ·
   Staff · Branch · Last Activity */
/* MaidMatch spec order: Type · Invoice Status · Payment · Date · Invoice Ref ·
   Employer Name · Employer Code · Worker Name · Worker Code · amounts · Staff ·
   Branch · Last Activity */
const INVOICE_COLUMN_KEYS = [
  "key_type", "key_invoice_status", "key_payment", "key_date", "key_ref_no", "key_employer_name", "key_employer_code",
  "key_worker_name", "key_worker_code", "key_total", "key_paid", "key_balance_due", "key_refunded", "key_unsettled",
  "key_bad_debt", "key_adjusted_amount", "key_staff", "key_branch", "key_last_activity",
];
/* Columns menu options ({ value: key, label }) */
const invoiceColumnsConfig = ({ translation }) => columnOptions(INVOICE_COLUMN_KEYS, translation);
/* default visible set — stable keys */
const invoiceColumnsConfigTrans = () => [...INVOICE_COLUMN_KEYS];

const invoiceOptionsConfig = ({ translation }) => {
  return [
    {
      id: 1,
      name: translation('key_select_fields_to_display'),
      type: 0,
      subItem: invoiceColumnsConfig({ translation }),
    }
  ];
};


const preferenceOptionsConfig = [
  { id: 1, name: 'Yes', translationKey: 'key_yes' },
  { id: 0, name: 'No', translationKey: 'key_no' },
];
const yesNoConfig = [
  { id: 1, name: 'Yes', translationKey: 'key_yes' },
  { id: 0, name: 'No', translationKey: 'key_no' },
];
const jobStageStatus = {
  INVITED: 1,
  APPLIED: 2,
  MATCHED: 3,
  PENDING: 4,
  UPCOMING: 5,
  COMPLETED: 6,
  CANCELLED: 10
};

const jobStageLabels = {
  [jobStageStatus.INVITED]: "Invited interview",
  [jobStageStatus.APPLIED]: "Applied interview",
  [jobStageStatus.MATCHED]: "Matched interview",
  [jobStageStatus.PENDING]: "Pending interview",
  [jobStageStatus.UPCOMING]: "Upcoming interview",
  [jobStageStatus.COMPLETED]: "Completed interview",
  [jobStageStatus.CANCELLED]: "Cancelled interview"
};
const reportsConfig = [
  {
    title: 'key_job_offer',
    description: 'key_job_report_description',
    link: routes.jobOfferReport,
    permissionKey: 'jo_report'
  },
  {
    title: 'key_interview',
    description: 'key_interview_report_description',
    link: routes.interviewReport,
    permissionKey: 'interview_report'
  },
  {
    title: 'key_feedback',
    description: 'key_feedback_report_description',
    link: routes.feedbackReport,
    permissionKey: 'feedback_report'
  },
  {
    title: 'key_insurance',
    description: 'key_insurance_report_description',
    link: routes.insuranceReport,
    permissionKey: 'insurance_report'
  },
  {
    title: 'key_contract',
    description: 'key_contract_report_description',
    link: routes.contractReport,
    permissionKey: 'contract_report'
  },
  {
    title: 'key_consolidated_ledger',
    description: 'key_consolidated_ledger_report_description',
    link: routes.consolidatedLedgerReport,
    permissionKey: 'consolidated_ledger_report'
  },
];

const hrmsReportsConfig = [
  {
    title: 'key_session_history',
    description: 'key_session_history_report_description',
    link: routes.sessionHistoryReport,
    permissionKey: 'session_history_report'
  },
  {
    title: 'key_schedule_compliance',
    description: 'key_schedule_compliance_report_description',
    link: routes.scheduleComplianceReport,
    permissionKey: 'schedule_compliance_report'
  },
  {
    title: 'key_time_request',
    description: 'key_time_request_report_description',
    link: routes.timeRequestReport,
    permissionKey: 'time_request_report'
  },
  {
    title: 'key_leave_history',
    description: 'key_leave_history_report_description',
    link: routes.leaveHistoryReport,
    /* PK-01 P1-18: the card's own report key (hrms /reports/leave-history); it was swapped with Time Credit's */
    permissionKey: 'applied_leave_history_report'
  },
  {
    title: 'key_time_credit',
    description: 'key_time_credit_report_description',
    link: routes.timeEntryReport,
    permissionKey: 'time_credit_report'
  },
];

const getNavConfig = ({ t, permissionList, isAdmin }) => {

  const staffType = getCurrentUser()?.data?.staff?.staff_type;
  const isJoGlobalScreen = hasPermission(permissionList, 'jo', 'jo_global_list') &&
    hasPermission(permissionList, 'jo', 'jo_access');
  /* Workers rail entry: PERM §5.6 Global Screen (`worker_global_list`) on top of Access (worker_AUDIT X16); record routes keep Access only */
  const isWorkerGlobalScreen = staffType === 'internal' ?
    (hasPermission(permissionList, 'worker', 'worker_global_list') && hasPermission(permissionList, 'worker', 'worker_access')) :
    hasPermission(permissionList, 'partner_worker', 'partner_worker_access');

  const isEmployerGlobalScreen = (hasPermission(permissionList, 'employer', 'employer_global_list') &&
    hasPermission(permissionList, 'employer', 'employer_access'));

  const isInvoiceGlobalScreen = hasPermission(permissionList, 'invoice', 'invoice_access');
  const isReportGlobalScreen = hasPermission(permissionList, 'reports', 'report_access');
  /* Insurance rail: Show in navigation (`insurance_global_list`) on top of Module access — PERM 22 Oct "Show in navigation …
     Requires: Insurance / Module access"; a retained child selection is unavailable while the parent is off (ClickUp 28 Oct:
     the icon showed for a user without Module access and opened a blank page, because the route is guarded by Access) */
  const isInsuranceGlobalScreen = hasPermission(permissionList, 'insurance', 'insurance_global_list') &&
    hasPermission(permissionList, 'insurance', 'insurance_access');
  const isContractGlobalScreen = hasPermission(permissionList, 'contract', 'contract_global_list');
  const isProcessingContractGlobalScreen = hasPermission(permissionList, 'contract_processing', 'contract_processing_access');
  const allNavItems = [
    { path: routes.dashboard, label: t('key_dashboard'), visible: isAdmin },
    /* Calendar rail entry: Calendar module Access or any Follow Up grant (HRMS calendar toggles are not read); partners never see it */
    { path: routes.calendar, label: t('key_calendar'), visible: isAdmin || (staffType === 'internal' && hasCalendarAccess(permissionList)) },
    { path: routes.chat, label: 'Chat', visible: isAdmin || staffType === 'internal' },
    { path: routes.jobOffers, label: t('key_job_offers'), visible: isAdmin || isJoGlobalScreen },
    { path: routes.employers, label: t('key_employers'), visible: isAdmin || isEmployerGlobalScreen },
    { path: routes.workers, label: t('key_workers'), visible: isAdmin || isWorkerGlobalScreen },
    { path: routes.contracts, label: t('key_contracts'), visible: isAdmin || (isContractGlobalScreen && isProcessingContractGlobalScreen) },
    { path: routes.invoices, label: t('key_invoices'), visible: isAdmin || isInvoiceGlobalScreen },
    { path: routes.insurance, label: t('key_insurance'), visible: isAdmin || isInsuranceGlobalScreen },
    { path: routes.reports, label: t('key_reports'), visible: isAdmin || isReportGlobalScreen },
    { path: routes.settings, label: t('key_settings'), visible: isAdmin || staffType === 'internal' }
  ];

  return allNavItems.filter(item => item.visible);
};

const promotionTableDataConfig = [
  { promo_name: 'Promo Name 1', worker_type: 'Overseas, Local', apply_to: 'BGS, SW', branch_location: '9', start_date: '12/12/2023', end_date: 'Indefinite', value: '10%' },
  { promo_name: 'Promo Name 2', worker_type: 'Overseas, Local', apply_to: 'BGS, SW', branch_location: 'All', start_date: '12/12/2023', end_date: '12/12/2024', value: '$10000' },
  { promo_name: 'Promo Name 3', worker_type: 'Local', apply_to: 'LPF, LPT', branch_location: '5', start_date: '12/12/2023', end_date: '12/12/2024', value: '$13980' },
  { promo_name: 'Promo Name 4', worker_type: 'Overseas, Local', apply_to: 'LPF, LPT', branch_location: 'All', start_date: '12/12/2023', end_date: '12/12/2024', value: '$13980' }
];

const handleContract = ({ contract, t }) => {
  const staticDetailsConfig = [
    {
      title: t("key_category_type"),
      details: [
        { key: t("key_contract_category"), value: contract.contract_category_name },
        { key: t("key_nationality"), value: contract.worker_nationality_name },
        { key: t("key_type_internal"), value: contract.contract_type },
      ],
    },
    {
      title: t("key_passport_information"),
      details: [
        { key: t("key_passport_number"), value: contract.passport_number },
        { key: t("key_passport_expiry"), value: contract.passport_expiry_date },
      ],
    },
    {
      title: t("key_visa"),
      details: [
        { key: t("key_visa_reference_no"), value: contract.visa_reference_no },
        { key: t("key_visa_release"), value: contract.e_visa_payment_date },
        { key: t("key_visa_expiry"), value: contract.visa_expiry_date },
      ],
    },
    {
      title: t("key_insurance"),
      details: [
        { key: t("key_insurance_no"), value: "" },
        { key: t("key_insurance_expiry"), value: "" },
      ],
    },
    {
      title: t("key_contract"),
      details: [
        { key: t("key_contract_date"), value: contract.contract_date },
        { key: t("key_contract_no"), value: contract.contract_number },
        { key: t("key_start_date"), value: "" },
      ],
    },
    {
      title: t("key_contract"),
      details: [
        { key: t("key_requested_start"), value: contract.requested_start_date },
        { key: t("key_expected_start"), value: contract.expected_start_date },
      ],
    },
  ];
  return staticDetailsConfig;
}

const insuranceStatusIdMapping = {
  "submitted": { label: 'Submitted', className: 'submitted' },
  "active": { label: 'Active', className: 'insurance-active' },
  "add_coverage": { label: 'Add Coverage', className: 'insurance-submitted' },
  "renewal": { label: 'Renewal', className: 'insurance-submitted' },
  "endorsement": { label: 'Endorsement', className: 'insurance-submitted' },
  "expired": { label: 'Expired', className: 'insurance-expired' },
};

const workerLocalDashboard1PhilOption = ({ t }) => [
  t("key_worker_name"),
  t("key_profile_status"),
  t("key_activity_status"),
  t("key_days_available"),
  t("key_views"),
  t("key_job_offer_statistics"),
  t("key_contract_status"),
  t("key_contract_visa_expiry"),
  t("key_interpreter"),
];

const workerOverseasDashboard1PhilOption = ({ t }) => [
  t("key_worker_name"),
  t("key_profile_status"),
  t("key_activity_status"),
  t("key_days_available"),
  t("key_views"),
  t("key_job_offer_statistics"),
  t("key_passport"),
  t("key_overseas_exp"),
  t("key_interpreter"),
  t("key_phone"),
];

const workerOverseasDashboard1IndoOption = ({ t }) => [
  t("key_worker_name"),
  t("key_profile_status"),
  t("key_activity_status"),
  t("key_days_available"),
  t("key_views"),
  t("key_job_offer_statistics"),
  t("key_passport"),
  t("key_overseas_exp"),
  t("key_interpreter"),
  t("key_phone"),
];

const workerLocalDashboard2Option = ({ t }) => [
  t("key_worker_name"),
  t("key_updated"),
  t("key_profile_status"),
  t("key_delay"),
  t("key_biodata"),
  t("key_photo"),
  t("key_contract_status"),
  t("key_contract_visa_expiry"),
  t("key_interpreter"),
  t("key_phone"),
  t("key_onboarding") + " 1",
  t("key_onboarding") + " 2"
];

const workerOverseasDashboard2Option = ({ t }) => [
  t("key_worker_name"),
  t("key_updated"),
  t("key_profile_status"),
  t("key_delay"),
  t("key_biodata"),
  t("key_photo"),
  t("key_interpreter"),
  t("key_phone"),
  t("key_onboarding") + " 1",
  t("key_onboarding") + " 2"
];

const workerLocalDashboard3Option = ({ t }) => [
  t("key_worker_name"),
  t("key_profile_status"),
  t("key_activity_status"),
  t("key_days_available"),
  t("key_views"),
  t("key_job_offer_statistics"),
  t("key_contract_status"),
  t("key_contract_end_date"),
  t("key_interpreter"),
  t("key_phone"),
];

const workerOverseasDashboard3Option = ({ t }) => [
  t("key_worker_name"),
  t("key_profile_status"),
  t("key_activity_status"),
  t("key_days_available"),
  t("key_views"),
  t("key_job_offer_statistics"),
  t("key_passport"),
  t("key_overseas_exp"),
  t("key_interpreter"),
  t("key_phone"),
];

const workerLocalDashboard4Option = ({ t }) => [
  t("key_worker_name"),
  t("key_updated"),
  t("key_profile_status"),
  t("key_delay"),
  t("key_biodata"),
  t("key_photo"),
  t("key_contract_status"),
  t("key_contract_visa_expiry"),
  t("key_interpreter"),
  t("key_phone"),
];

const workerOverseasDashboard4Option = ({ t }) => [
  t("key_worker_name"),
  t("key_profile_status"),
  t("key_activity_status"),
  t("key_days_available"),
  t("key_views"),
  t("key_job_offer_statistics"),
  t("key_passport"),
  t("key_overseas_exp"),
  t("key_interpreter"),
  t("key_phone"),
];

const workerLocalDashboard5Option = ({ t }) => [
  t("key_worker_name"),
  t("key_updated"),
  t("key_profile_status"),
  t("key_delay"),
  t("key_biodata"),
  t("key_photo"),
  t("key_contract_status"),
  t("key_contract_visa_expiry"),
  t("key_interpreter"),
  t("key_phone"),
];

const workerOverseasDashboard5Option = ({ t }) => [
  t("key_worker_name"),
  t("key_profile_status"),
  t("key_activity_status"),
  t("key_days_available"),
  t("key_views"),
  t("key_job_offer_statistics"),
  t("key_passport"),
  t("key_overseas_exp"),
  t("key_interpreter"),
  t("key_phone"),
];

const workerOverseasPhilipinoOption = ({ t }) => [
  t("key_worker_name"),
  t("key_updated"),
  t("key_profile_status"),
  t("key_delay"),
  t("key_biodata"),
  t("key_photo"),
  t("key_assign_partner"),
  t("key_pt"),
  t("key_interpreter"),
  t("key_phone"),
];

const workerOverseasHasPhillNationalityDashboard2Option = ({ t }) => [
  t("key_worker_name"),
  t("key_updated"),
  t("key_profile_status"),
  t("key_delay"),
  t("key_biodata"),
  t("key_photo"),
  t("key_e_registration"),
  t("key_peos"),
  t("key_tesda"),
  t("key_assign_partner"),
  t("key_phone"),
  t("key_interpreter"),
  t("key_onboarding") + " 1",
  t("key_onboarding") + " 2"
];

const workerOverseasHasIndonesianNationalityDashboard2Option = ({ t }) => [
  t("key_worker_name"),
  t("key_updated"),
  t("key_profile_status"),
  t("key_doc_upload"),
  t("key_delay"),
  t("key_biodata"),
  t("key_photo"),
  t("key_passport"),
  t("key_indonesian_id"),
  t("key_birth_certificate"),
  t("key_family_certificate"),
  t("key_education_certificate"),
  t("key_assign_pt"),
  t("key_pt"),
  t("key_medical"),
  t("key_submit_document"),
  t("key_training_certificate"),
  t("key_labour_id"),
  t("key_interpreter"),
  t("key_onboarding") + " 1",
  t("key_onboarding") + " 2"
];
const familyAndPetsCareMapping = {
  adult_count: 'employer_details.adult_count',
  baby_count: 'employer_details.baby_count',
  expecting_baby_count: 'employer_details.expecting_baby_count',
  expecting_baby_count_info: 'employer_details.expecting_baby_count_info',
  elderly_count: 'employer_details.elderly_count',
  child_count: 'employer_details.child_count',
  adult_count_info: 'employer_details.adult_count_info',
  baby_count_info: 'employer_details.baby_count_info',
  child_count_info: 'employer_details.child_count_info',
  elderly_count_info: 'employer_details.elderly_count_info',
};

const familyAndPetsCareMappingJob = {
  expecting_baby_count_info: 'expecting_baby_count_info',
  adult_count_info: 'adult_count_info',
  baby_count_info: 'baby_count_info',
  child_count_info: 'child_count_info',
  elderly_count_info: 'elderly_count_info',
  pet_count_info: 'pet_count_info',
};

/* HRMS Insurance report Type (PROMPT 8 row 5; owner, 11 Nov 2026, Q8-1 (a)): the kind of the record's applicable period, as
   hrms returns it (contract.insurance.repository INSURANCE_REPORT_TYPES). Replaces the legacy values new / renew. "New policy"
   and "Renewal" are Insurance's own request labels. */
const insuranceReportTypes = [
  { id: 'new_policy', translationKey: 'key_ins_req_new' },
  { id: 'renewal', translationKey: 'key_ins_req_renew' },
  { id: 'legacy_review', translationKey: 'key_ins_report_type_legacy_review' },
];
const insuranceReportTypeLabel = (code) => {
  const type = insuranceReportTypes.find((t) => t.id === code);
  return type ? translation(type.translationKey) : '';
};

const formatDateToDDMMYYYY = (date) => {
  return (date && dayjs(date).isValid()) ? dayjs(date).format('DD/MM/YYYY') : '';
}

const getInterviewStatusText = (status) => {
  switch (status) {
    case 1: return 'Invited';
    case 2: return 'Applied';
    case 3: return 'Matched';
    case 4: return 'Pending';
    case 5: return 'Upcoming';
    case 6: return 'Completed';
    case 10: return 'Cancelled';
    default: return 'N/A';
  }
};

const exportJobOffers = (jobOfferList) => {
  if (!jobOfferList || !Array.isArray(jobOfferList)) return [];

  return jobOfferList.map(row => ({
    'Job ID': row?.job_offer_reference_id || '-',
    'Employer ID': row?.employer_reference_id || '-',
    'Employer': row?.employer_name || '-',
    'CS': row?.cs_name || '-',
    'Job Title': row?.head_line || '-',
    'Job Role': row?.role_name || '-',
    'Branch Name': row?.branch_display_name || '-',
    'Created On': row?.created_at ? dayjs(row.created_at).format('DD MMM YYYY, hh:mm A') : '-',
    'Created By': row?.created_by_name || '-',
    'Expected Start Date': row?.start_date ? dayjs(row.start_date).format('DD MMM YYYY') : '-',
    'Approved On': row?.opening_date_time ? dayjs(row.opening_date_time).format('DD MMM YYYY, hh:mm A') : '-',
    'Expiry Date': row?.expiry_date ? dayjs(row.expiry_date).format('DD MMM YYYY') : '-',
    'Closed On': row?.closing_date_time ? dayjs(row.closing_date_time).format('DD MMM YYYY, hh:mm A') : '-',
    'Current Status': (row?.status && statusMappingConfig) ? statusMappingConfig[row.status] : row.status,
    'Workers Interacted': row?.views_count || '0',
    'Suggested': row?.suggested_count || '0',
    'Viewed': row?.views_count || '0',
    'Applied': row?.applied_count || '0',
    'Apply Percentage': row?.apply_percentage ? `${ row.apply_percentage }%` : '0%',
    'Matched': row?.matched_count || '0',
    'Interview Invited': row?.pending_interview_count || '0',
    'Interview Scheduled': row?.upcoming_interview_count || '0',
    'Interview Completed': row?.completed_interview_count || '0',
    'Interview Cancelled': row?.cancelled_interview_count || '0',
    'QR Interviews': row?.qr_interview_count || '0',
    'Instant Interviews': row?.instant_interview_count || '0',
    'Offer Extended': row?.offer_extended_count || '0',
  }));
}

const exportFeedbackReport = (feedbackList) => {
  if (!feedbackList || !Array.isArray(feedbackList)) return [];

  return feedbackList.map(item => ({
    'Timestamp': item.created_at || '-',
    'Rating': item.rating || '-',
    'Feedback For': formatFeedbackType(item?.feedback_type)?.label || '-',
    'Bug Reporter': item.feedback_user_name || '-',
    'User Type': item.created_by_type || '-',
    'Email': item['feedbackByUser.email'] || '-',
    'Phone': item['feedbackByUser.mobile_number'] || '-',
    'Feedback': item.comment || '-'
  }));
}

const exportInsuranceReport = (insuranceList) => {
  if (!insuranceList || !Array.isArray(insuranceList)) return [];

  return insuranceList.map((row) => ({
    'Insurance ID': row?.insurance_number || '-',
    'Policy Name': row?.policy_name || '-',
    'Employer ID': row?.employer_reference_id || '-',
    'Employer': row?.employer_name || '-',
    'Worker ID': row?.worker_reference_id || '-',
    'Worker': row?.worker_name || '-',
    'Branch': row?.branch_name || '-',
    'Type': insuranceReportTypeLabel(row?.type) || '-',
    'Policy No': row?.policy_number || '-',
    'Previous Policy Number': row?.previous_policy_number || '-',
    'Effective Date': row?.effective_date
      ? dayjs(row.effective_date).format('DD MMM YYYY')
      : '-',
    'Expiry Date': row?.expiry_date
      ? dayjs(row.expiry_date).format('DD MMM YYYY')
      : '-',
    'Coverage': row?.cov_label ? translation(`key_ins_coverage_${row.cov_label}`) : '-',
    'Invoice': row?.invoice_number || '-',
    'Additional Coverage': row?.coverage_details?.policy_name || '-',
    'Coverage Effective Date': (row?.coverage_details && row.coverage_details?.effective_date)
      ? dayjs(row.coverage_details.effective_date).format('DD MMM YYYY')
      : '-',
    'Coverage Expiry Date': (row?.coverage_details && row.coverage_details?.expiry_date)
      ? dayjs(row.coverage_details.expiry_date).format('DD MMM YYYY')
      : '-',
    'Coverage Invoice': row?.coverage_details?.invoice_number || '-',
  }));
};

const exportInterviews = (interviewList) => {
  return interviewList.map((interview) => ({
    "Interview ID": interview?.id || '-',
    "Interview Name": interview?.reference_id ? `JOID-Employer-Worker` : '-',
    "Employer ID": interview?.employer_reference_id || '-',
    "Employer Name": interview?.employer_fullname || '-',
    "Worker ID": interview?.worker_reference_id || '-',
    "Worker Name": interview?.worker_fullname || '-',
    "Job ID": interview?.reference_id || '-',
    "CS": interview?.cs_email || '-',
    "Interpreter": interview?.interpreter_email || '-',
    "GMeet Link": interview?.google_meet_link || '-',
    "Branch Name": interview?.branch_display_name || '-',
    "Original Interview Time": interview?.interview_date && interview?.interview_time
      ? `${ interview.interview_date } ${ interview.interview_time }`
      : '-',
    "Invited On": interview?.interview_invited_at || '-',
    "Declined On": interview?.interview_declined_at || '-',
    "Accepted On": interview?.interview_accepted_at || '-',
    "Reschedule Requested": interview?.is_reschedule ? 'Yes' : 'No',
    "Reschedule Requested Time": interview?.new_interview_date && interview?.new_interview_time
      ? `${ interview.new_interview_date } ${ interview.new_interview_time }`
      : '-',
    "Reschedule Accepted": interview?.is_reschedule
      ? (interview?.interview_accepted_at ? 'Yes' : 'No')
      : '-',
    "Updated Interview Time": interview?.new_interview_date && interview?.new_interview_time
      ? `${ interview.new_interview_date } ${ interview.new_interview_time }`
      : '-',
    "Interview Final Status": getInterviewStatusText(interview?.status),
    "Cancelled Reason": interview?.status === 4 ? interview?.no_show_flag || '-' : '-',
    "Report Comment": interview?.comment || '-',
    "Reported By": interview?.interview_report_marked_by_system
      ? 'System'
      : interview?.interview_report_marked_name || '-',
    "Reported Time": interview?.interview_report_marked_at || '-'
  }));
}

const exportContractReport = (contractReportList) => {
  if (!contractReportList || !Array.isArray(contractReportList)) return [];

  return contractReportList.map((row) => ({
    'Contract Ref': row?.contract_number || '-',
    'Invoice Ref No': row['contractInvoiceModel.invoice_number'] || '-',
    'Employer ID': row?.employer_reference_id || '-',
    'Employer': row?.employer_name || '-',
    'Worker ID': row?.worker_reference_id || '-',
    'Worker': row?.worker_name || '-',
    'Branch': row?.branch_name || '-',
    'CS': row?.cs_name || '-',
    'Type': row?.contract_type || '-',
    'Contract Category': row?.contract_category_name || '-',
    'Nationality': row?.worker_nationality_name || '-',
    'Contract Date': row?.created_at
      ? dayjs(row.created_at).format('DD MMM YYYY')
      : '-',
    'Visa Expiry': row['processingVisaDocumentModel.visa_expiry_date']
      ? dayjs(row['processingVisaDocumentModel.visa_expiry_date']).format('DD MMM YYYY')
      : '-',
    'Group': row?.group || '-',
    'Status': row?.contract_status_name || '-',
  }));
};

export const exportConsolidatedLedgerReport = (ledgerReportList) => {
    if (!ledgerReportList || !Array.isArray(ledgerReportList)) return [];

    return ledgerReportList.map((row) => ({
        'Timestamp': row?.timestamp ? dayjs(row.timestamp).format('YYYY-MM-DD HH:mm:ss') : '-',
        'Ledger ID': row?.ledger_id || '-',
        'Invoice ID': row?.invoice_id || '-',
        'Action': row?.action || '-',
        'Total': row?.total ?? '-',
        'Paid': row?.paid ?? '-',
        'Unsettled': row?.unsettled ?? '-',
        'Bad Debt': row?.bad_debt ?? '-',
        '+ Adjustment': row?.adjustment_plus ?? '-',
        '- Adjustment': row?.adjustment_minus ?? '-',
        'Refund': row?.refund ?? '-',
        'Write Off': row?.write_off ?? '-',
        'Payment Method': row?.payment_method || '-',
        'Employer': row?.employer_name || '-',
        'Worker': row?.worker_name || '-',
        'Branch': row?.branch_name || '-',
        'Invoice CS': row?.invoice_cs || '-',
    }));
};

const exportSessionHistory = (userSessionHistory) => {
  return userSessionHistory.map((sessionHistory) => ({
    "Employee": sessionHistory?.name || '-',
    "Date": dayjs(sessionHistory?.login_date).format('DD MMM YYYY') || '-',
    "First Login": customFromNow(sessionHistory.first_login) || '-',
    "Last Login": customFromNow(sessionHistory.last_login) || '-',
    "Sessions": sessionHistory?.sessions || '-',
    "Average Session Duration": formatDuration(sessionHistory?.avg_seconds) || '-',
    "Total Session Duration": formatDuration(sessionHistory?.total_seconds) || '-',
  }));
}

const exportTimeRequestReport = (timeRequestHistory) => {
  return timeRequestHistory.map((request) => ({
    "Request Number": request?.request_number || '-',
    "Raised By": request?.raised_by || '-',
    "Raised On": request?.raised_on || '-',
    "Actioned By": request?.actioned_by || '-',
    "Actioned On": request?.actioned_on || '-',
    "For Date": request?.for_date || '-',
    "From": request?.from ? convertTo12HourFormat(request?.from) : '-',
    "To": request?.to ? convertTo12HourFormat(request?.to) : '-',
    "Asked Duration": request?.time_asked ? request?.time_asked : '-',
    "Approved Duration": request?.time_approved ? request?.time_approved : '-',
    "Status": getTimeRequestStatusLabel(parseInt(request?.status))?.label || '-',
  }));
}

const exportLeaveHistoryReport = (leaveHistory) => {
  return leaveHistory.map((leave) => ({
    "Applied By": leave?.applier_name || '-',
    "Raised On": leave.created_at ? formatDateTime(leave.created_at) : 'NA',
    "Actioned By": (leave.status == 1 || leave.status == 2) && leave.approver_name ? leave.approver_name : leave.status == 3 && leave.rejector_name ? leave.rejector_name : 'NA',
    "Actioned On": (leave.status == 1 || leave.status == 2) && leave.approved_at ? formatDateTime(leave.approved_at) : leave.status == 3 && leave.rejected_at ? formatDateTime(leave.rejected_at) : 'NA',
    "From": leave?.from_date || '-',
    "To": leave?.to_date || '-',
    "Days": leave?.duration || '-',
    "Status": (() => { const status = getTimeRequestStatusLabel(parseInt(leave?.status)); return status?.label })(),
  }));
}

const exportTimeEntryReport = (reportTimeEntry) => {
  const exportData = reportTimeEntry.map((entry) => ({
    "Log ID": entry.request_number || '-',
    "Created On": entry.raised_on ? `${ entry.raised_on } ${ entry.raised_on_time }` : '-',
    "Date For": entry.for_date || '-',
    "Start Time": entry.from ? `${ entry.for_date } ${ convertTo12HourFormat(entry.from) }` : '-',
    "Duration": entry.time_asked || '-',
    "Employee": entry.created_for || '-',
    "Added By": entry.raised_by || '-',
  }));
  return exportData;
}

const exportScheduleCompliance = (scheduleComplianceList) => {
  const exportData = scheduleComplianceList.map((entry) => ({
    "Employee": entry?.email || '-',
    "Date": entry?.date ? dayjs(entry.actual_login_date).format('DD MMM YYYY') : '-',
    "Day": entry?.login_day || '-',
    "Schedule Time In": entry?.shift_start_time ? formatTimeTo12HourFormat(entry.shift_start_time) : '-',
    "Actual Time In": entry?.actual_login_time ? formatTimeTo12HourFormat(entry.actual_login_time) : '-',
    "Time In Discrepancy (mins)": entry?.shift_start_diff || 0,
    "Schedule Time Out": entry?.shift_end_time ? formatTimeTo12HourFormat(entry.shift_end_time) : '-',
    "Actual Time Out": entry?.actual_logout_time ? formatTimeTo12HourFormat(entry.actual_logout_time) : '-',
    "Time Out Discrepancy (mins)": entry?.shift_end_diff || 0,
  }));
  return exportData;
}

const summaryCardsConfig = [
  {
    key: 'paid',
    labelKey: 'key_paid',
    colorClass: 'text-success',
    iconClass: 'ri-indeterminate-circle-line fz20 text-success mr12',
    bgClass: 'bg-light-green',
  },
  {
    key: 'unsettled',
    labelKey: 'key_unsettled',
    colorClass: 'text-warning',
    iconClass: 'ri-indeterminate-circle-line fz20 text-warning mr12',
    bgClass: 'bg-light-yellow',
  },
  {
    key: 'refunded',
    labelKey: 'key_refunded',
    colorClass: 'text-danger',
    iconClass: 'ri-indeterminate-circle-line fz20 text-danger mr12',
    bgClass: 'bg-light-red',
  },
  {
    key: 'bad_debt',
    labelKey: 'key_bad_debt',
    colorClass: 'text-danger',
    iconClass: 'ri-indeterminate-circle-line fz20 text-danger mr12',
    bgClass: 'bg-light-red',
  },
  {
    key: 'net_total',
    labelKey: 'key_net_total',
    colorClass: 'text-primary',
    iconClass: 'ri-indeterminate-circle-line fz20 text-primary mr12',
    bgClass: 'bg-light-blue',
  },
];

const leavePolicyFormsConfig = {
  leave_policy_type: '',
  accrual_type: '',
  accrual_rate: '',
  effective_from_date_of_hire: '',
  carry_forward: 0,
  carry_forward_max: '',
  carry_forward_max_type: 'percentage',
  carry_forward_no_limit: false,
  encashment: 0,
  encashment_max: '',
  encashment_max_type: 'percentage',
  encashment_no_limit: false,
  threshold: '',
  expiry: 0,
  expiry_in_days: '',
  expiry_type: 'days',
  expiry_no_limit: false,
  status: 1
}

const CONFIRM_POPUP_TYPES = {
  ZOOM: 'zoom',
  CANCEL_SUGGESTION: 'cancel-suggestion',
  EXTEND_OFFER: 'extend-offer',
  CANCEL_INTERVIEW: 'cancel-interview',
  NOT_INTERESTED: 'not-interested',
  CANCEL_INVITE: 'cancel-invite',
};

let configData = {
  workerLocalDashboard1PhilOption,
  workerOverseasDashboard1PhilOption,
  workerOverseasDashboard1IndoOption,
  workerLocalDashboard2Option,
  workerOverseasDashboard2Option,
  workerLocalDashboard3Option,
  workerOverseasDashboard3Option,
  workerLocalDashboard4Option,
  workerOverseasDashboard4Option,
  workerLocalDashboard5Option,
  workerOverseasDashboard5Option,
  workerOverseasPhilipinoOption,
  workerOverseasHasPhillNationalityDashboard2Option,
  workerOverseasHasIndonesianNationalityDashboard2Option,
  profileConfig,
  familyBackgroundConfig,
  languageAndEducationConfig,
  workExperienceConfig,
  expectationsConfig,
  spouseConfig,
  previousContractConfig,
  documentStatusConfig,
  documentsConfig,
  titlesConfig,
  daysOfWeek,
  statusMappingConfig,
  INVOICE_STATUSES,
  empKababOptionsConfig,
  changeOwnerTitles,
  membersCountConfig,
  choiceMap,
  getMembersCountConfig,
  legendsConfig,
  dutiesConfig,
  ChannelConfig,
  insuranceColumnLabels,
  insuranceColumnsConfigTranslate,
  insuranceMandatoryColumnsTrans,
  WorkerStatusNameMapping,
  workerStatusLabel,
  WorkerDocumentStatusNameMapping,
  deviceIconClasses,
  deviceIcons,
  employerColumnsConfig,
  employerColumnsConfigTrans,
  partnerColumnsConfigTrans,
  localWorkerColumnsConfig,
  availableWorkerColumnsConfig,
  philppinesWorkerColumnsConfig,
  indonesianWorkerColumnsConfig,
  workerKababOptionsConfig,
  preferenceOptionsConfig,
  yesNoConfig,
  getNavConfig,
  insuranceColumnsConfigTrans,
  localWorkerDashboard2ColumnsConfig,
  philppinesWorkerDashboard2ColumnsConfig,
  availableFilipinoWorkerColumnsConfigDashboard1Local,
  defaultWorkerColumnsConfig,
  availableFilipinoWorkerColumnsConfigDashboard1Oversease,
  filipinoWorkerColumnsConfigDashboard2Oversease,
  workerColumnsConfigDashboard2Oversease,
  indoWorkerColumnsConfigDashboard2Oversease,
  allOverseaseIndoWorkerColumnsConfig,
  availableLocalWorkerColumnsConfigDashboard1,
  promotionTableDataConfig,
  invoiceStatusIdMapping,
  invoiceOptionsConfig,
  insuranceStatusIdMapping,
  familyAndPetsCareMapping,
  familyAndPetsCareMappingJob,
  handleContract,
  insuranceReportTypes,
  insuranceReportTypeLabel,
  invoiceColumnsConfigTrans,
  predefinedDateRanges,
  defaultWorkerColumnsConfigDashBoard2,
  jobStageLabels,
  formatDateToDDMMYYYY,
  exportJobOffers,
  exportInterviews,
  exportContractReport,
  exportConsolidatedLedgerReport,
  exportInsuranceReport,
  exportFeedbackReport,
  exportSessionHistory,
  exportTimeRequestReport,
  exportLeaveHistoryReport,
  exportTimeEntryReport,
  exportScheduleCompliance,
  leavePolicyFormsConfig,
  summaryCardsConfig,
  reportsConfig,
  hrmsReportsConfig,
  CONFIRM_POPUP_TYPES,
  invoiceTypeIdMapping,
  INVOICE_TYPES,
  invoiceTypeLabel,
  invoiceTypeTitle
}
export default configData;