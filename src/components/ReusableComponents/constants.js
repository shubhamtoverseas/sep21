import PropTypes from "prop-types";

// import adminWhite from "../../assets/img/svg/admin-white.svg";
// import adminOrange from "../../assets/img/svg/admin-orange.svg";
import phoneWhite from "../../assets/img/svg/phone-white.svg";
import phoneBlue from "../../assets/img/svg/phone-blue.svg";
// import tabletOrange from "../../assets/img/svg/tablet-orange.svg";
// import tabletWhite from "../../assets/img/svg/tablet-white.svg";
import desktopGreen from "../../assets/img/svg/desktop-green.svg";
import desktopWhite from "../../assets/img/svg/desktop-white.svg";
import translation from "../../utils/translation";
import { customStylesOfMultiSelect } from "../../utils/customStylesOfMultiSelect";

const DRIVING_SKILL_ID = 13;
const COOKING_SKILL_ID = 10;
/* Main Skills: 1–3 selections, Cooking counted separately (W-02) */
const MAIN_SKILLS_MAX = 3;
const DRIVER_ROLE_ID = 2;
const BABY_CARE_SKILL_ID = 1;
const TODDLER_CARE_SKILL_ID = 2;
const CHILD_CARE_SKILL_ID = 3;
/* WORKER.md Step 7: "Any child care → Age Groups Cared For"; the skill-detail group opens for any of these */
const CHILD_CARE_SKILL_IDS = [BABY_CARE_SKILL_ID, TODDLER_CARE_SKILL_ID, CHILD_CARE_SKILL_ID];
/* Teen Care (WORKER.md Step 7 / U-0209): `main_skills` has no fixed id and no slug; the row is `name_en = 'Teen Care'`
   (backend 375, 2 Nov) — matched by name until a slug exists */
const TEEN_CARE_SKILL_NAME_EN = 'Teen Care';
const isChildCareSkill = (skill) => CHILD_CARE_SKILL_IDS.includes(Number(skill?.id))
  || String(skill?.name_en || skill?.name || '').trim().toLowerCase() === TEEN_CARE_SKILL_NAME_EN.toLowerCase();
const ELDERLY_CARE_SKILL_ID = 5;

const PARTNER_BANGLADESH_COUNTRY_ID = 14;
const PARTNER_THAILAND_COUNTRY_ID = 170;
const PARTNER_PHILIPPINES_COUNTRY_ID = 141;
const PARTNER_INDONESIAN_COUNTRY_ID = 77;

export const indonesiaId = 95;
export const fillipinoId = 71;
export const bangladeshId = 18;
export const thaiId = 198;
export const SEARCH_DEBOUNCE_MS = 400;

export const FILE_UPLOAD_SIZE_LIMIT = 2000 * 1024;
/* WORKER.md / l10n "Choose a JPG or PNG photo." */
export const IMAGE_UPLOAD_EXTENSIONS = ['png', 'jpeg', 'jpg'];
export const workerMinAgeByNationalityId = {
    [indonesiaId]: 21,
    [fillipinoId]: 24,
    [bangladeshId]: 18,
    [thaiId]: 18,
};

export const HONGKONG_LOCATION_ID = 1;
export const MACAU_LOCATION_ID = 119;
/* Remembered column visibility per listing (browser storage, keys not labels — SH-06 / N-02) */
export const COLUMN_VIEW_STATE_KEYS = Object.freeze({
  jobOffers: 'jo_columns_v1',
  workers: 'worker_columns_v1',
  invoices: 'invoice_columns_v1',
  insurance: 'insurance_columns_v1',
  partner: 'partner_columns_v1',
});
/* Job Offer dashboard Location values (DASH §8.2): Hong Kong and Macau only */
export const JO_LOCATION_IDS = [HONGKONG_LOCATION_ID, MACAU_LOCATION_ID];
export const ADMIN_ROLE_ID = 1;

export const EMPTY_ROW = { shift_code: "", shift_start_time: "", shift_end_time: "", duration: "" };

let workerFilters = {
  limit: 10,
  page: 1,
  sort_by: "created_at",
  sort_order: "DESC",
};

let invoiceFilters = {
  limit: 10,
  page: 1,
  sort_by: "created_at",
  sort_order: "DESC",
};

const jobOfferFilters = {
  search_text: "",
  office_location: "",
  status: [],
  device_type: "",
  branch_location: [],
  start_date: "",
  end_date: "",
};
let contractsFilters = {
  limit: 10,
  page: 1,
  sort_by: "",
  sort_order: ""
};
const fillterListOne = [
  { name: "All", id: 0 },
  { name: "Admin", id: 1 },
  { name: "Direct", id: 2 },
];

const chatTypes = [
  { name: "Employer Chats", id: 0 },
  { name: "Worker Chats", id: 1 },
];

//permissions
const allPermissions = {
  empRegisterLink: "employer.send_registration_link",
  worker: "worker",
  workerRegisterLink: "worker.send_registration_link",
  addWorker: "worker.add",
  editWorker: "worker.update",
  workerChangeStatus: "worker.change_status",
  workerInfo: "worker.info",
  workerJobOffer: "worker.info.job_offer",
  workerActivity: "worker.info.activity",
  workerContract: "worker.info.contract",
  workerInvoice: "worker.info.invoice",
  workerDetails: "worker.info.details",
  workerChat: "worker.info.chat",
  jobOffer: "job offer",
  addJobOffer: "job_offer.add",
  editJobOffer: "job_offer.update",
  jobOfferChangeStatus: "job_offer.change_status",
  jobOfferInfo: "job_offer.info",
  jobOfferDetails: "job_offer.info.details",
  jobOfferInviteWorkerList: "job_offer.info.invite_worker_list",
  jobOfferInviteWorker: "job_offer.invite_worker",
};

const discount = (amount, perct) => {
  let dis = (perct / 100) * amount;
  return amount - dis;
};

const filterDevices = [
  { type: 'Direct', filterType: 2, blueImage: phoneWhite, grayImage: phoneBlue },
  { type: 'Web', filterType: 1, blueImage: desktopWhite, grayImage: desktopGreen },
  // { type: 'Tablet', filterType: 3, blueImage: tabletWhite, grayImage: tabletOrange },
  // { type: 'Admin', filterType: 4, blueImage: adminWhite, grayImage: adminOrange },
];
const status = [
  { id: 0, name: 'key_inactive' },
  { id: 1, name: 'key_active' },
  { id: 2, name: 'key_all' },
];
export const assignmentTypes = ['manual', 'round_robin', 'both'];
export const contract_types = ['new', 'renew', 'both'];

export const dateRangeFilterOptions = () => {
  return [
    { id: 7, name: 'Last 7 days' },
    { id: 30, name: 'Last 30 days' },
    { id: 60, name: 'Last 60 days' },
    { id: 90, name: 'Last 90 days' },
    { id: 365, name: 'Last 1 year' },
  ]
};

export const workerTypeList = () => {
  return [
    { id: 1, name: "Local", key: 'local', translationKey: 'key_local' },
    { id: 2, name: "Overseas", key: 'overseas', translationKey: 'key_overseas' },
  ]
};

export const workerTypeListLocal = () => {
  return [
    { id: 1, name: "Local", key: 'local' },
  ]
};

export const typeInternal = () => {
  return [
    { name: "New", key: 'new' },
    { name: "Replacement", key: 'replacement' },
  ]
};

const selectStyles = customStylesOfMultiSelect();
const noOptionsMsg = () => translation('key_no_options');
const typeInternalList = typeInternal();

export const workerNationalityList = () => {
  return [
    { id: 95, name: "Indonesia", key: "indonesia" },
    { id: 71, name: "Philippines", key: "philippines" },
    { id: 18, name: "Bangladeshi", key: "bangladeshi" },
    { id: 198, name: "Thai", key: "thai" },
  ]
};

export const salaryBasis = [
  { id: 'daily', name: "Daily" },
  { id: 'weekly', name: "Weekly" },
  { id: 'semi_monthly', name: "Semi Monthly" },
  { id: 'monthly', name: "Monthly" },
  { id: 'annual', name: "Annual" },
];

export const WorkerBioDataStatus = () => {
  return [
    { id: 'in_complete', name: "In Completed" },
    { id: 'in_review', name: "In Review" },
    { id: 'uploaded', name: "Uploaded" },
    { id: 'verified', name: "Verified" },
    { id: 'action_required', name: "Action Required" },
  ]
};

export const exceptionsStatusList = () => {
  return [
    { id: 0, name: "No" },
    { id: 1, name: "Yes" },
    { id: 2, name: "Consider" },
  ]
};

export const interviewDayList = () => {
  return [
    { id: 1, name: "Any Day" },
    { id: 2, name: "Sunday" },
    { id: 3, name: "Saturday" },
    { id: 4, name: "Friday" },
    { id: 5, name: "Thursday" },
    { id: 6, name: "Wednesday" },
    { id: 7, name: "Tuesday" },
    { id: 8, name: "Monday" },
  ]
};
export const timeSlots = [
  "8 AM", "8:30 AM", "9 AM", "9:30 AM", "10 AM", "10:30 AM", "11 AM", "11:30 AM",
  "12 PM", "12:30 PM", "1 PM", "1:30 PM", "2 PM", "2:30 PM", "3 PM", "3:30 PM",
  "4 PM", "4:30 PM", "5 PM", "5:30 PM", "6 PM", "6:30 PM"
];

export const getInsuranceSubmissionEmpDetails = () => [
  { title: 'Surname', value: 'Lee' },
  { title: 'Given Name', value: 'Chang Yeun Yi' },
  { title: 'Phone', value: '852812791' },
  { title: 'Email ID', value: 'chang@gmail.com' },
  { title: 'Date of Birth', value: '11/02/1993' },
  { title: 'Age', value: '33' },
  { title: 'HKID', value: '1234455' },
  { title: 'Address', value: '12, Alberto Heights, East Parkwood, Hong Kong, 400614' },
];

export const getInsuranceSubmissionWorkerDetails = () => [
  { title: 'Surname', value: 'De La Sanchez' },
  { title: 'Given Name', value: 'Angelissa' },
  { title: 'Worker Code', value: 'LPF129390' },
  { title: 'Phone', value: '852812791' },
  { title: 'Nationality', value: 'Indonesian' },
  { title: 'Date of Birth', value: '11/02/1993' },
  { title: 'Age', value: '33' },
  { title: 'Passport No', value: 'L-1234' },
  { title: 'HKID', value: '1234455' },

];

export const getInsuranceSubmissionInsuranceDetails = () => [
  { title: 'Insurance Type', value: 'Renew' },
  { title: 'Policy', value: 'One Year Full insurance with Cancer and Heart Disease' },
  { title: 'Previous Policy No', value: '38998292834' },
  { title: 'Policy Number', value: '' },
  { title: 'Effective Date', value: '' },
  { title: 'Expiry Date', value: '' },
  { title: 'Invoice', value: 'I-N37192928' },
];

export const configModules = {
  toolbar: [
    [{ header: '1' }, { header: '2' }, { font: [] }],
    [{ size: [] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [
      { list: 'ordered' },
      { list: 'bullet' },
      { indent: '-1' },
      { indent: '+1' },
    ],
    ['link', 'image', 'video'],
    ['clean'],
  ],
};
const jobGlobalFilters = {
  branch_location: [],
  location: '',
  status: [],
  device_type: '',
  search_text: '',
  from_date: '',
  to_date: '',
  dateRangeId: '',
  sort_by: '',
  sort_order: '',
  page: 1,
  limit: 10,
};

export const PROCESSING_FILE_UPLOAD_SIZE_LIMIT = 5 * 1024 * 1024;

const REMARKS_PERMISSION_KEYS = {
  employer: [["employer", "employer_remarks"]],
  worker: [
    ["worker_interpreter_owner", "worker_interpreter_owner_worker_remark"],
    ["worker_interpreter_onboarding_non_owner", "worker_interpreter_onboarding_non_owner_worker_remark"],
    ["worker_onboarding_owner", "worker_onboarding_owner_worker_remark"],
    ["partner_worker", "partner_worker_remarks"],
  ],
  processing: [
    ["processing_cs_owner", "processing_cs_owner_remarks"],
    ["processing_cs_non_owner", "processing_cs_non_owner_remarks"],
  ],
};

const REMARKS_UPDATE_ELSE_PERMISSION_KEYS = {
  employer: [["employer", "employer_update_else_remarks"]],
  worker: [
    ["worker_interpreter_owner", "worker_interpreter_owner_worker_update_else_remark"],
    ["worker_interpreter_onboarding_non_owner", "worker_interpreter_onboarding_non_owner_worker_update_else_remark"],
    ["worker_onboarding_owner", "worker_onboarding_owner_worker_update_else_remark"],
  ],
  processing: [
    ["processing_cs_owner", "processing_cs_owner_update_else_remarks"],
    ["processing_cs_non_owner", "processing_cs_non_owner_update_else_remarks"],
  ],
};

const processingGroupOptions = () => [
  { name: translation('key_group_1_filter_label'), id: 1 },
  { name: translation('key_group_2_filter_label'), id: 2 },
  { name: translation('key_group_3_filter_label'), id: 3 },
  { name: translation('key_group_4_filter_label'), id: 4 },
];

const processingGlobalFilters = {
  group: '',
  sort_by: '',
  sort_order: '',
  page: 1,
  limit: 10,
};
const partnerbGlobalFilters = {
  search_text: '',
  status: [],
  sort_by: '',
  sort_order: '',
  page: 1,
  limit: 10,
};

let workerGlobalFilters = {
  "page": 1,
  "search_text": "",
  "sort_by": "",
  "sort_order": "",
  "limit": 10,
  "type": "",
  "status": [],
  "profile_status": "",
  "nationality": [],
  "reference_id": [],
};

const qrOptions = (translation) => {
  return [
    {
      id: 1,
      name: translation('key_open_check_in_qr_code'),
      type: 0,
    },
    {
      id: 2,
      name: translation('key_open_check_in_qr_code'),
      type: 0,
    },
    {
      id: 3,
      name: translation('key_open_check_in_qr_code'),
      type: 0,
    }
  ]
}

let workerJobOfferFilters = {
  "page": 1,
  "search_text": "",
  "sort_by": "",
  "sort_order": "",
  "limit": 10,
};
const categories = [
  { key: 'adult', label: 'Adults', translationKey: 'key_adults' },
  { key: 'expecting_baby', label: 'Expecting Baby', translationKey: 'key_expecting_baby' },
  { key: 'baby', label: 'Baby', translationKey: 'key_baby' },
  { key: 'child', label: 'Child', translationKey: 'key_child' },
  { key: 'elderly', label: 'Elderly', translationKey: 'key_elderly' }
];

const feedbackReportFilters = {
  feedback_type: [],
  created_by_type: [],
  rating: [],
  start_date: null,
  end_date: null,
  selected_date_range_type: 'auto'
};

const templateFiltersData = {
  module_key: "",
  category_id: "",
  language_id: "",
  template_type: "",
  search_text: '',
  accessibility: "",
  page: 1,
  limit: 10,
};

const feedbackTypeOptions = [
  { value: 'helper', label: 'Helper' },
  { value: 'employer', label: 'Employer' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'report_a_bug', label: 'Bug Report' },
  { value: 'other', label: 'Other' }
];

const userTypeOptions = [
  { value: 'employer', label: 'Employer' },
  { value: 'worker', label: 'Worker' }
];

const ratingOptions = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' }
];

const accessPermissionOptions = [
  { id: "restricted", name: 'key_restricted' },
  { id: "full_access", name: 'key_full_access' }
];

const accessList = [
  { id: "public", name: 'Public', translationKey: 'key_public' },
  { id: "private", name: 'Private', translationKey: 'key_private' }
];

/* date-range labels for the Insurance permission grid (InsurancePermission.js) — the Contract grid no longer uses them (U-0271) */
const getDateRangeMap = (translation) => {
  return {
    "yesterday": translation('key_yesterday'),
    "last_7_days": translation('key_last_7_days'),
    "last_30_days": translation('key_last_30_days'),
    "last_60_days": translation('key_last_60_days'),
    "last_90_days": translation('key_last_90_days'),
    "this_month": translation('key_this_month'),
    "last_month": translation('key_last_month'),
    "this_quarter": translation('key_this_quarter'),
    "year_to_date": translation('key_year_to_date'),
    "last_year": translation('key_last_year')
  };
}

const dateRangeStaticProps = [
  "yesterday",
  "last_7_days",
  "last_30_days",
  "last_60_days",
  "last_90_days",
  "this_month",
  "last_month",
  "this_quarter",
  "year_to_date",
  "last_year",
  "y",
  "n",
]

const processingTabRequiredStatuses = {
  contract: 'ready',
  consulate: 'returned',
  // deployment: 'ready', 
  medical: 'approved_by_er',
  insurance: 'ready',
  immigration: 'submitted',
  visa: 'visa_released',
};

const interviewReportFilters = {
  page: 1,
  limit: 10,
  search_text: '',
  branch_id: [],
  cs_id: [],
  interpreter_id: [],
  interview_category: [],
  from_date: '',
  to_date: '',
  selected_date_range_type: 'auto',
};

const jobOfferReportFilters = {
  page: 1,
  limit: 10,
  search_text: '',
  branch_id: [],
  created_by: [],
  cs_owner_id: [],
  search_from_date: '',
  search_to_date: '',
};

const contractReportFilters = {
  page: 1,
  limit: 10,
  contract_from_date: '',
  contract_to_date: '',
  visa_expiry_from_date: '',
  visa_expiry_to_date: '',
  group: [],
  status: [],
  contract_type: [],
  nationality: [],
  contract_status: [],
  worker_reference_id: [],
  worker_current_location: [],
  branch_id: [],
  staff_id: [],
};

const insuranceReportFilters = {
  page: 1,
  limit: 10,
  expiry_from_date: '',
  expiry_to_date: '',
  effective_from_date: '',
  effective_to_date: '',
  branch_id: [],
  staff_id: [],
  type: [],
};

const getInterviewCategoryOptions = (category) => {
  switch (category) {
    case 'qr':
      return 'key_qr';
    case 'instant':
      return 'key_instant';
    case 'admin_scheduled':
      return 'key_admin_scheduled';
    case 'employer_scheduled':
      return 'key_employer_scheduled';
    case 'worker_requested':
      return 'key_worker_requested';
    default:
      return null;
  }
}

const getAccessOptions = () => {
  return [
    { id: "restricted", name: "Restricted" },
    { id: "full_access", name: "Full Access" }
  ];
};

const CATEGORY_OPTIONS = (t) => [
  { value: 'qr', label: t('key_qr') },
  { value: 'instant', label: t('key_instant') },
  { value: 'admin_scheduled', label: t('key_admin_scheduled') },
  { value: 'employer_scheduled', label: t('key_employer_scheduled') },
  { value: 'worker_requested', label: t('key_worker_requested') }
];

export const resolvedMethodShape = PropTypes.shape({
    value:          PropTypes.string.isRequired,
    label:          PropTypes.string.isRequired,
    tier:           PropTypes.number.isRequired,
    type:           PropTypes.string.isRequired,
    apple:          PropTypes.bool,
    groupLabel:     PropTypes.string,
    bornStatus:     PropTypes.string,
    fields:         PropTypes.arrayOf(PropTypes.string),
    proof:          PropTypes.string,
});

const NAV_SECTIONS = [
  { label: "Workspace",  paths: ["/dashboard", "/calendar", "/chat-view"] },
  { label: "Operations", paths: ["/job-offers", "/employers", "/workers", "/contracts", "/insurance"] },
  { label: "Finance",    paths: ["/invoices", "/reports"] },
  { label: "System",     paths: ["/settings"] },
];

const ROUTE_ICONS = {
  "/dashboard":    "home",
  "/calendar":     "calendar",
  "/chat-view":    "msg",
  "/job-offers":   "briefcase",
  "/employers":    "building",
  "/workers":      "user",
  "/contracts":    "progress",
  "/invoices":     "receipt",
  "/insurance":    "shield",
  "/reports":      "chart",
  "/settings":     "cog",
};

const LANGUAGE_MAP = {
  en: "en",
  zh_HK: "zh_HK",
  in: "in",
  zh_CN: "zh_CN",
};

const CONFIRM_POPUP_TYPES = {
  ZOOM: 'zoom',
  CANCEL_SUGGESTION: 'cancel-suggestion',
  EXTEND_OFFER: 'extend-offer',
  CANCEL_INTERVIEW: 'cancel-interview',
  NOT_INTERESTED: 'not-interested',
  CANCEL_INVITE: 'cancel-invite',
};

const STATUS_ACTION_MAP = {
  1: { label: 'Approve', icon: 'check' },
  2: { label: 'Pending Paid', icon: 'progress' },
  3: { label: 'Partial Pay', icon: 'receipt' },
  5: { label: 'Mark Unsettled', icon: 'alert' },
  6: { label: 'Void', icon: 'x' },
  7: { label: 'Mark Bad Debt', icon: 'alert' },
  8: { label: 'Refund', icon: 'refresh' },
};

/* MaidMatch status gallery (mc-status-tag-v17) — invoice domain tone per status id (prototype INVOICE_STATUS_TAG) */
const STATUS_TAG_TONES = {
  1: { tone: 'green' },                          // Paid
  2: { tone: 'orange' },                         // Pending Paid
  3: { tone: 'orange' },                         // Partial
  4: { tone: 'blue-1' },                         // Reservation Fee
  5: { tone: 'severe-red', treatment: 'solid' }, // Unsettled
  6: { tone: 'neutral' },                        // Void
  7: { tone: 'dark', treatment: 'solid' },       // Bad Debt
  8: { tone: 'orange' },                         // Refunded / Unapproved
  9: { tone: 'neutral' },                        // Refunded
  10: { tone: 'orange' },                        // Exchange / Unapproved
  11: { tone: 'purple' },                        // Exchange
};


/* Employer Dashboard list sort keys (header sort + "Sort By" filter) */
const EMPLOYER_SORT_KEYS = {
  NAME: 'name',
  CODE: 'reference_id',
};

/* Employer / Job Offer listing engagement icons (DASH §5): current engagement, three shapes distinguishable without colour */
const ENGAGEMENT_KINDS = { APP: 'app', WEB: 'web', STAFF: 'staff' };
const ENGAGEMENT_ICONS = {
  app: {
    label: 'App',
    shapes: [['rect', { x: 7, y: 2, width: 10, height: 20, rx: 2 }], ['path', { d: 'M11 18h2' }]],
  },
  web: {
    label: 'Web',
    shapes: [['rect', { x: 2, y: 4, width: 20, height: 13, rx: 2 }], ['path', { d: 'M8 21h8M12 17v4' }]],
  },
  staff: {
    label: 'Staff-assisted',
    shapes: [
      ['circle', { cx: 9, cy: 8, r: 4 }],
      ['path', { d: 'M2 21c0-4 3.5-6 7-6' }],
      ['circle', { cx: 17, cy: 16, r: 3.2 }],
      ['path', { d: 'M17 11.8v1.4M17 18.8v1.4M21.2 16h-1.4M14.2 16h-1.4M20 13l-1 1M15 18l-1 1M20 19l-1-1M15 14l-1-1' }],
    ],
  },
};
const ENGAGEMENT_API_VALUES = { app: 'app', web: 'web', staff: 'staff', admin: 'staff', 'staff-assisted': 'staff' };

/* Listing column-sizing policy (SR-06): eight semantic roles with [min, preferred, max] tracks per profile */
const LISTING_TRACK_ROLES = {
  NAME: 'name', REF: 'ref', DATE: 'date', DATEX: 'datex', STATUS: 'status', AMOUNT: 'amount', STAFF: 'staff', SELECT: 'select',
};
const LISTING_TRACK_BOUNDS = {
  full: {
    name: [200, 208, 240], ref: [140, 140, 160], date: [112, 112, 128], datex: [150, 180, 200],
    status: [140, 152, 260], amount: [88, 120, 140], staff: [132, 132, 150], select: [38, 38, 56],
  },
  compact: {
    name: [150, 176, 210], ref: [104, 124, 144], date: [100, 100, 116], datex: [120, 150, 176],
    status: [112, 136, 190], amount: [72, 104, 124], staff: [96, 116, 136], select: [32, 40, 56],
  },
};
const LISTING_TRACK_PROFILES = { FULL: 'full', COMPACT: 'compact' };
const LISTING_STAGE_TRACK = 226;

/* Whole-row opening (SR-05): clicks on these nested controls must not also open the record */
const ROW_OPEN_CONTROL_SELECTOR = 'button, a, input, select, textarea, label, [role="checkbox"], [role="button"], [role="menu"], [role="menuitem"]';

/* Employer Dashboard "Created" presets — value → number of days back (null = custom) */
const EMPLOYER_CREATED_PRESETS = [
  { value: 'today', translationKey: 'key_today', days: 0 },
  { value: 'yesterday', translationKey: 'key_yesterday', days: 1 },
  { value: 'last_7_days', translationKey: 'key_last_7_days', days: 7 },
  { value: 'last_30_days', translationKey: 'key_last_30_days', days: 30 },
  { value: 'custom', translationKey: 'key_custom_range', days: null },
];

/* Payment Records glyph and intent per record type (reference recordVisuals) */
const RECORD_VISUALS = {
  invoice_created: { intent: 'info', icon: 'plus' },
  payment_recorded: { intent: 'warning', icon: 'receipt' },
  payment_confirmed: { intent: 'success', icon: 'check' },
  payment_approved: { intent: 'success', icon: 'check' },
  marked_unsettled: { intent: 'danger', icon: 'alert' },
  marked_bad_debt: { intent: 'danger', icon: 'alert' },
  revert: { intent: 'success', icon: 'check' },
  void: { intent: 'danger', icon: 'x' },
  refund_voided: { intent: 'danger', icon: 'x' },
  surplus_refund: { intent: 'info', icon: 'refresh' },
  rf_expired: { intent: 'danger', icon: 'calendar' },
  remark_added: { intent: '', icon: 'msg' },
  adjustment: { intent: 'warning', icon: 'edit' },
  write_off: { intent: 'warning', icon: 'edit' },
  refund_initiated: { intent: 'attention', icon: 'refresh' },
  refund_approved: { intent: 'success', icon: 'check' },
  exchange_initiated: { intent: 'attention', icon: 'refresh' },
  exchange_surplus: { intent: 'attention', icon: 'info' },
  surplus_write_off: { intent: 'warning', icon: 'edit' },
  surplus_credit: { intent: 'info', icon: 'plus' },
  underpayment_created: { intent: 'attention', icon: 'plus' },
  proof_uploaded: { intent: 'info', icon: 'upload' },
};

const ACTIVITY_VISUALS = [
  { test: /void/i, intent: 'danger', icon: 'x' },
  { test: /creat|open/i, intent: 'info', icon: 'plus' },
  { test: /status|exchang|refund|unsettl|bad.?debt|approv|revert/i, intent: 'attention', icon: 'refresh' },
  { test: /link|contract|context/i, intent: 'info', icon: 'paperclip' },
  { test: /insurance/i, intent: 'info', icon: 'shield' },
];

export const CREDIT_TYPES = {
  reservation_fee_expired: {
    key: "reservation_fee_expired",
    itemTypeLabel: "key_reservation_fee_credit",
    descLeadLabel: "key_expired_reservation_fee",
    badgeLabel: "key_reservation_fee_expired_badge",
    applyLabel: "key_apply_reservation_fee_expired",
    emptyLabel: "key_no_expired_reservation_fees",
    appliedCredit: "key_applied_credits"
  },
  exchange_surplus: {
    key: "exchange_surplus",
    itemTypeLabel: "key_saved_exchange_credit",
    descLeadLabel: "key_saved_exchange_credit",
    badgeLabel: "key_saved_exchange_credit_badge",
    applyLabel: "key_apply_saved_exchange_credit",
    emptyLabel: "key_no_saved_exchange_credits",
  },
};

const VOID_CANCELLATION_INVOICE_TYPES = ['contract', 'exchange'];

const INVOICE_EXPORT_MONEY_COLUMNS = ["Total", "Paid", "Unsettled", "Refunded", "Bad Debt", "Adjustments"];
const EXCEL_MONEY_FORMAT = '#,##0.00;[Red](#,##0.00)';

const INVOICE_ACTION_PERMISSION_MAP = [
  { key: 'invoice_adjustment', id: 0 },
  { key: 'invoice_write_off', id: 0 },
  { key: 'invoice_approve_payment', id: 1 },
  { key: 'invoice_mark_as_unsettled', id: 5 },
  { key: 'invoice_void', id: 6 },
  { key: 'invoice_mark_as_bad_debt', id: 7 },
  { key: 'invoice_approve_refund', id: 9 },
  { key: 'invoice_approve_exchange', id: 11 },
  { key: 'invoice_back_to_previous_status', id: 12 }
];

const AMOUNT_INPUT_REGEX = /^\d*\.?\d{0,2}$/; // money inputs: digits + max 2 decimals

const INVOICE_VOID_DATA_FORM = {
  cancel_contract: 0,
  cancellation_date: "",
  cancellation_reason: "",
  other_reason: "",
  remarks: "",
};

const INVOICE_LOG_LIMIT = 10;
const INVOICE_LOG_FIRST_PAGE = 1;


const INVOICE_DIRECT_STATUS_CHANGE_IDS = [7, 5, 12, 9, 8, 6];

// Contract categories treated as replacement/non-new flows on create screens
const INVOICE_REPLACEMENT_CATEGORIES = ['Local Transfer', 'Renewal', 'Renew', 'Direct Hire'];
// The only contract categories whose Contract Invoice asks for Type (Internal) (user ruling 22 Oct 2026: shown once a worker is
// selected; Overseas keeps the New / Replacement choice; Renew, Local Transfer and Direct Hire keep their automatic value)
const INVOICE_TYPE_INTERNAL_CATEGORIES = ['Overseas', 'Local Finished', 'Local Terminated', 'Local Terminated (TR)'];
const GENERAL_INVOICE_RESTRICTED_CATEGORIES = ['Local Transfer', 'Renewal', 'Direct Hire'];

// Worker pickers on invoice create flows
const INVOICE_WORKER_PROFILE_STATUS = [2, 3, 8];
const INVOICE_WORKER_CONTRACT_STATUS_NOT_IN = [1, 2];
const GENERAL_INVOICE_WORKER_DEFAULT_STATUS = [3, 8];

const INVOICE_DEFAULT_DYNAMIC_ITEM = { id: "", itemType: "", description: "", discount: "", promoCode: "", amount: 0, discountAmount: 0, total: 0, modelId: "", type: "dynamic", amount_type: "fixed", offers: [], new_item: 1 };

const INVOICE_ADJUST_TYPES = { WRITE_OFF: 'write_off', ADJUST: 'adjust_amount' };

const INVOICE_PAYMENT_INITIAL_FORM_DATA = {
  card_type: "",
  card_number: "",
  bank_name: "",
  bank_in_reference: "",
  cheque_number: "",
  cheque_date: "",
  approval_code: "",
  transaction_reference: "",
  receipt_number: "",
  received_by: "",
};

export const INVOICE_FILTERS_STORAGE_KEY = 'invoice_list_filters';

const INVOICE_LIST_API_SORT_KEYS = {
  invoice_status: 'status', refNo: 'invoice_number', payment: 'payment_method',
  staff: 'staff_name', date: 'invoices_date', employerName: 'employer_name',
  workerName: 'worker_name', code: 'worker_reference_id',
  balance_due: 'balance_due', branch: 'branch_name', last_activity: 'updated_at',
};

const GENERAL_CONFIRM_SELECTION_OPTIONS = [
  { key: "worker", title: "key_worker" },
  { key: "employer", title: "key_employer" },
];

const GENERAL_INVOICE_INITIAL_FORM_STATE = Object.freeze({ contract_type_internal: "new" });

const GENERAL_INVOICE_WORKER_DEFAULT_FILTERS = {
  invoice_profile_status: GENERAL_INVOICE_WORKER_DEFAULT_STATUS,
  status: [],
};
const INVOICE_WORKER_TABLE_INITIAL_HEADER_FILTER = {
  sort_by: "",
  sort_order: "",
  invoice_profile_status: INVOICE_WORKER_PROFILE_STATUS,
  status: [],
};

const INVOICE_SORT_BY_OPTIONS = (t) => [
  { value: 'status', label: t('key_invoice_status') },
  { value: 'payment_method', label: t('key_payment') },
  { value: 'invoice_number', label: t('key_ref_no') },
  { value: 'invoices_date', label: t('key_date') },
  { value: 'employer_name', label: t('key_employer_name') },
  { value: 'worker_name', label: t('key_worker_name') },
  { value: 'final_amount', label: t('key_total') },
  { value: 'paid_amount', label: t('key_paid') },
];
const CONTRACT_TYPE_INTERNAL_OPTIONS = (t) => [
  { value: 'new', label: t('key_new') },
  { value: 'replacement', label: t('key_replacement') },
];

let constData = {
  CATEGORY_OPTIONS,
  CREDIT_TYPES,
  VOID_CANCELLATION_INVOICE_TYPES,
  INVOICE_EXPORT_MONEY_COLUMNS,
  EXCEL_MONEY_FORMAT,
  INVOICE_ACTION_PERMISSION_MAP,
  AMOUNT_INPUT_REGEX,
  INVOICE_VOID_DATA_FORM,
  INVOICE_LOG_LIMIT,
  INVOICE_LOG_FIRST_PAGE,
  INVOICE_DIRECT_STATUS_CHANGE_IDS,
  INVOICE_REPLACEMENT_CATEGORIES,
  INVOICE_TYPE_INTERNAL_CATEGORIES,
  GENERAL_INVOICE_RESTRICTED_CATEGORIES,
  INVOICE_WORKER_PROFILE_STATUS,
  INVOICE_WORKER_CONTRACT_STATUS_NOT_IN,
  GENERAL_INVOICE_WORKER_DEFAULT_STATUS,
  INVOICE_DEFAULT_DYNAMIC_ITEM,
  INVOICE_ADJUST_TYPES,
  INVOICE_PAYMENT_INITIAL_FORM_DATA,
  INVOICE_LIST_API_SORT_KEYS,
  INVOICE_FILTERS_STORAGE_KEY,
  GENERAL_CONFIRM_SELECTION_OPTIONS,
  GENERAL_INVOICE_INITIAL_FORM_STATE,
  GENERAL_INVOICE_WORKER_DEFAULT_FILTERS,
  INVOICE_WORKER_TABLE_INITIAL_HEADER_FILTER,
  INVOICE_SORT_BY_OPTIONS,
  CONTRACT_TYPE_INTERNAL_OPTIONS,
  PARTNER_BANGLADESH_COUNTRY_ID,
  PARTNER_THAILAND_COUNTRY_ID,
  PARTNER_PHILIPPINES_COUNTRY_ID,
  PARTNER_INDONESIAN_COUNTRY_ID,
  filterDevices,
  workerTypeList,
  workerNationalityList,
  workerFilters,
  jobOfferFilters,
  fillterListOne,
  chatTypes,
  allPermissions,
  discount,
  status,
  assignmentTypes,
  contract_types,
  salaryBasis,
  WorkerBioDataStatus,
  jobGlobalFilters,
  partnerbGlobalFilters,
  workerGlobalFilters,
  contractsFilters,
  workerJobOfferFilters,
  categories,
  invoiceFilters,
  processingGlobalFilters,
  processingGroupOptions,
  REMARKS_PERMISSION_KEYS,
  REMARKS_UPDATE_ELSE_PERMISSION_KEYS,
  DRIVING_SKILL_ID,
  COOKING_SKILL_ID,
  MAIN_SKILLS_MAX,
  DRIVER_ROLE_ID,
  BABY_CARE_SKILL_ID,
  TODDLER_CARE_SKILL_ID,
  CHILD_CARE_SKILL_ID,
  CHILD_CARE_SKILL_IDS,
  TEEN_CARE_SKILL_NAME_EN,
  isChildCareSkill,
  ELDERLY_CARE_SKILL_ID,
  ratingOptions,
  userTypeOptions,
  feedbackTypeOptions,
  feedbackReportFilters,
  accessPermissionOptions,
  templateFiltersData,
  accessList,
  getDateRangeMap,
  processingTabRequiredStatuses,
  interviewReportFilters,
  jobOfferReportFilters,
  contractReportFilters,
  insuranceReportFilters,
  getInterviewCategoryOptions,
  getAccessOptions,
  dateRangeStaticProps,
  qrOptions,
  LANGUAGE_MAP,
  CONFIRM_POPUP_TYPES,
  STATUS_ACTION_MAP,
  STATUS_TAG_TONES,
  EMPLOYER_SORT_KEYS,
  EMPLOYER_CREATED_PRESETS,
  ROW_OPEN_CONTROL_SELECTOR,
  LISTING_TRACK_ROLES,
  LISTING_TRACK_BOUNDS,
  LISTING_TRACK_PROFILES,
  LISTING_STAGE_TRACK,
  ENGAGEMENT_KINDS,
  ENGAGEMENT_ICONS,
  ENGAGEMENT_API_VALUES,
  RECORD_VISUALS,
  ACTIVITY_VISUALS,
  selectStyles,
  noOptionsMsg,
  typeInternalList,
  ROUTE_ICONS,
  NAV_SECTIONS
};

export default constData;

/* ActivityStatusCollapsible variant="flat": one dot row per log (status label + by/when) */
export const ACTIVITY_FLAT_STATUS_META = {
    in_complete: { key: 'key_not_submitted', dot: 'red', noMeta: true },
    'In complete': { key: 'key_not_submitted', dot: 'red', noMeta: true },
    Incomplete: { key: 'key_incomplete', dot: 'red', noMeta: true },
    action_required: { key: 'key_action_required', dot: 'violet' },
    'Action required': { key: 'key_action_required', dot: 'violet' },
    in_review: { key: 'key_in_review', dot: 'blue' },
    'In review': { key: 'key_in_review', dot: 'blue' },
    verified: { key: 'key_verified', dot: 'green' },
    Verified: { key: 'key_verified', dot: 'green' },
    Active: { key: 'key_active', dot: 'green', withMessage: true },
    Submitted: { key: 'key_submitted', dot: 'blue', withMessage: true },
    'Add Coverage': { key: 'key_add_coverage', dot: 'violet', withMessage: true },
    Endorsement: { key: 'key_endorsement', dot: 'violet', withMessage: true },
    Renewal: { key: 'key_renewal', dot: 'green', withMessage: true },
};
