import { useLocation } from "react-router-dom";
import dayjs from 'dayjs';
import uploadFileToS3, { uploadFilesToS3 } from "./awsS3Functions";
import { saveAs } from 'file-saver';
import { ShowToast } from "../components/show-toast/ShowToast";
import { getStoredUser } from "../utils/storage";
import constData, {
    ADMIN_ROLE_ID, fillipinoId, indonesiaId, FILE_UPLOAD_SIZE_LIMIT, HONGKONG_LOCATION_ID, MACAU_LOCATION_ID, JO_LOCATION_IDS,
} from "../components/ReusableComponents/constants";
import { HOST_TYPE, REACT_APP_X_API_KEY } from "./apiPath";
import translation from "../utils/translation";


/* the worker-record permission shape (PERM §5.9); getWorkerPermissionAccess fills a FRESH copy per call */
const EMPTY_WORKER_PERMISSION_INFO = Object.freeze({
    'worker_chat': [],
    'worker_contact_details': [],
    'worker_remarks': [],
    'worker_action_require_history': [],
    'worker_chat_history': [],
    'worker_status_to_hold': [],
    'worker_status_to_suspended': [],
    'worker_status_to_ban': [],
    'worker_change_interpreter': [],
    'worker_jo': [],
    'worker_employer_chat': [],
    'worker_jo_share': [],
    'worker_jo_share_link': [],
    'worker_interview_decline': [],
    'worker_interview_accept': [],
    'worker_interview_reschedule': [],
    'worker_interview_report': [],
    'worker_worker_profile': [],
    'worker_worker_biodata': [],
    'worker_worker_photo': [],
    'worker_philippines_worker_doc_upload': [],
    'worker_philippines_worker_assign_partner': [],
    'worker_indonesia_worker_doc_upload': [],
    'worker_indonesia_worker_assign_partner': [],
    'worker_indonesia_worker_assign_pt': [],
    'worker_worker_details': [],
    'worker_worker_basic_details': [],
    'worker_worker_consulate_details': [],
    'worker_worker_passport_details': [],
    'worker_worker_activity': [],
});

const dayMapping = {
    1: "Sunday",
    2: "Monday",
    3: "Tuesday",
    4: "Wednesday",
    5: "Thursday",
    6: "Friday",
    7: "Saturday"
};

const getAccessToken = () => {
    const currentUser = getStoredUser();
    if (currentUser && currentUser.token) {
        return currentUser.token;
    }
    return null;
}

const getCurrentUser = () => {
    const currentUser = getStoredUser();
    if (currentUser) {
        return currentUser;
    }
    return null;
}

const relationMap = {
    1: 'Father',
    2: 'Mother',
    3: 'Brother',
    4: 'Sister',
    5: 'Son',
    6: 'Daughter'
};

const getCalculatedAge = (dobFormat, yearOnly) => {
    if (!dobFormat) {
        return null;
    }

    if (yearOnly === 'y') {
        const birthYear = dayjs(dobFormat, 'YYYY').year();
        const currentYear = dayjs().year();
        return currentYear - birthYear;
    } else {
        const birthDate = dayjs(dobFormat, 'YYYY-MM-DD');
        if (!birthDate.isValid()) {
            return null;
        }
        return dayjs().diff(birthDate, 'years');
    }
};

const extractIds = (options) => options?.filter(e => e?.id != null).map(e => e.id) || [];

const convertToYesNo = (value) => (value === 1 ? "yes" : "no");

const convertToNumeric = (value) => (value === "yes" ? 1 : 0);

const formatDateTime = (date) => dayjs(new Date(date)).format("YYYY-MM-DD HH:mm:ss");

const getCurrentDate = () => dayjs(new Date()).format("YYYY-MM-DD");

const formatDate = (date) => dayjs(new Date(date)).format("YYYY-MM-DD");

const formatTime = (date, format = 'HH:mm:ss') => {
    return dayjs(new Date(date)).format(format);
};

const convertToDayType = (value) => (value === "first_half" ? "key_first_half" : "key_second_half");

const leaveDisplayStatus = (value) => (value === 0 ? "Pending" : (value === 1 ? "Approved" : (value === 2 ? "Rejected" : "Withdrawn")));

const getLeaveButtonClass = (leaveType) => {
    switch (leaveType) {
        case 'Casual Leaves':
            return 'casual';
        case 'Sick Leaves':
            return 'sick';
        case 'Paid Leaves':
            return 'leave';
        case 'Birthday Leaves':
            return 'birthday';
        case 'Priviledged Leaves':
            return 'priviledged';
        case 'Extra Leaves':
            return 'extra';
        default:
            return 'casual';
    }
};

const getLocalTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const calculateDuration = (start_date, start_date_type, end_date, end_date_type) => {
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    let durationInMs = endDate - startDate;
    if (startDate.toDateString() === endDate.toDateString() && start_date_type !== end_date_type) {
        return 1;
    } else if (startDate.toDateString() === endDate.toDateString() && start_date_type === start_date_type) {
        return 0.5;
    }
    if (start_date_type === 'first_half' && end_date_type === 'second_half') {
        durationInMs += (24 * 60 * 60 * 1000);
    } else if ((start_date_type === 'first_half' && end_date_type === 'first_half') || (start_date_type === 'second_half' && end_date_type === 'second_half')) {
        durationInMs += (12 * 60 * 60 * 1000);
    }
    const durationInDays = durationInMs / (1000 * 60 * 60 * 24);
    return durationInDays;
};

const useQuery = () => new URLSearchParams(useLocation().search);

const doopDays = (doop_names) => {
    return doop_names.split(',').map(num => dayMapping[num.trim()]).join(', ')
}

const shortenText = (text, length = 20) => {
    return text.length > length ? `${ text.substring(0, length) }...` : text;
}

const validateUploadFile = (file, allowedExtensions = null) => {
    if (!file) return { valid: false, errorKey: null };
    if (allowedExtensions) {
        const extension = file.name.substring(file.name.lastIndexOf(".") + 1);
        if (!allowedExtensions.includes(extension)) {
            return { valid: false, errorKey: 'key_please_upload_valid_image' };
        }
    }
    if (file.size > FILE_UPLOAD_SIZE_LIMIT) {
        return { valid: false, errorKey: 'key_please_upload_a_file_smaller_than_5_mb' };
    }
    return { valid: true, errorKey: null };
};

const uploadFile = async (filesToUpload) => {
    let image = {};
    for (const file of filesToUpload) {
        await uploadFileToS3(file.file, file.name, true)
            .then((path) => {
                image = path;
            })
            .catch((err) => {
                console.log(err);
            });
    }
    return image;
}

const uploadFiles = async (filesToUpload) => {

    let response = {};
    // for (const file of filesToUpload) {
    await uploadFilesToS3(filesToUpload)
        .then((res) => {
            response = res;
        })
        .catch((err) => {
            console.log(err);
        });
    // }
    return response;
}

export const handleMobileInput = (e) => {
    let value = e.target.value;

    value = value.replace(/\D/g, "");

    if (value.length > 13) {
        value = value.slice(0, 13);
    }

    e.target.value = value;
};

export const loadViewState = (key) => {
    try {
        const parsed = JSON.parse(localStorage.getItem(key));
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch { return null; }
};
export const saveViewState = (key, state) => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* storage unavailable */ }
};
export const clearViewState = (key) => {
    try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
};
/* the same, for state that must not outlive the browser session (a typed search survives a round trip to a record, not a new session) */
export const loadSessionViewState = (key) => {
    try {
        const parsed = JSON.parse(sessionStorage.getItem(key));
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch { return null; }
};
export const saveSessionViewState = (key, state) => {
    try { sessionStorage.setItem(key, JSON.stringify(state)); } catch { /* storage unavailable */ }
};
export const clearSessionViewState = (key) => {
    try { sessionStorage.removeItem(key); } catch { /* storage unavailable */ }
};

/* DASH §8.2: the actor's Location scope is derived from their staff country — a Macau staff is Macau-only,
   everyone else sees Hong Kong and Macau with Hong Kong as the default. Clear filters returns to this default. */
const isMacauActor = () => Number(getCurrentUser()?.data?.staff?.staff_country_id) === MACAU_LOCATION_ID;
export const getActorLocationIds = () => (isMacauActor() ? [MACAU_LOCATION_ID] : JO_LOCATION_IDS);
export const getActorDefaultLocationId = () => (isMacauActor() ? MACAU_LOCATION_ID : HONGKONG_LOCATION_ID);

/* Current engagement only (U-0127 / U-0238: Job Offer surfaces never infer it from the registration channel); null when the API is silent */
export const getCurrentEngagementKind = (row) => {
    const current = String(row?.current_engagement || row?.engagement || '').toLowerCase();
    return constData.ENGAGEMENT_API_VALUES[current] || null;
};

/* Listing engagement icon kind: the API's current engagement (on every list row and the detail since backend 375 / E-9);
   never the registration source */
export const getEngagementKind = (row) => getCurrentEngagementKind(row);

/* Dashboard phone masking (DASH §6): country code kept, every digit but the last four becomes a bullet */

/* Remembered column visibility (SH-06 / N-02): stored column KEYS are normalised against the allowed set,
   mandatory columns are always present, and anything unknown is dropped. */
export const loadColumnKeys = (storageKey, defaults, allowed = defaults, mandatory = []) => {
    const saved = loadViewState(storageKey)?.columns;
    if (!Array.isArray(saved)) return defaults;
    const allowedSet = new Set(allowed);
    return Array.from(new Set([...mandatory, ...saved.filter((key) => allowedSet.has(key))]));
};
export const saveColumnKeys = (storageKey, columns) => saveViewState(storageKey, { columns });

/* Listing tracks (SR-06): a column declares a role and an optional width inside the role's range.
   A width below the role minimum governs nothing and falls back to the preferred track. */
export const listingTrackWidth = (role, declared, profile = constData.LISTING_TRACK_PROFILES.FULL) => {
    const bounds = constData.LISTING_TRACK_BOUNDS[profile] || constData.LISTING_TRACK_BOUNDS.full;
    const [min, preferred, max] = bounds[role] || bounds.staff;
    const value = Number(declared);
    if (!Number.isFinite(value) || value < min) return preferred;
    return Math.min(value, max);
};

/* th/td inline geometry for a column; legacy columns without a role keep their own width.
   The track is the column's share and floor, not a cap: the table fills its card and the
   spare width is split in proportion to the tracks (Shubham, 2 Nov 2026) */
export const listingTrackStyle = (column, profile) => {
    if (column?.trackRole) {
        const width = listingTrackWidth(column.trackRole, column.trackWidth, profile);
        return { width, minWidth: width };
    }
    if (column?.width) return { width: column.width, minWidth: column.minWidth || column.width };
    return undefined;
};

/* the sum of the tracks = the table's minimum width (it scrolls below that, fills the card above it); null when a column has no track */
export const listingTableWidth = (columns, profile, leadingWidth = 0) => {
    if (!Array.isArray(columns) || columns.length === 0) return null;
    if (columns.some((column) => !column?.trackRole)) return null;
    return columns.reduce((sum, column) => sum + listingTrackWidth(column.trackRole, column.trackWidth, profile), leadingWidth);
};

/* Whole-row opening (SR-05): a click on a nested control, or one that ends a text selection, is not a row open */
export const isRowControlTarget = (target) =>
    Boolean(target?.closest && target.closest(constData.ROW_OPEN_CONTROL_SELECTOR));

export const hasActiveTextSelection = (container) => {
    try {
        const selection = window.getSelection ? window.getSelection() : null;
        if (!selection || selection.isCollapsed || !String(selection).trim()) return false;
        return !container || container.contains(selection.anchorNode);
    } catch (e) {
        return false;
    }
};

export const isAbsoluteUrl = (value) => /^(https?:)?\/\/|^(data|blob):/i.test(String(value || ""));

export const formatPhoneDisplay = (value) => {
    const digits = String(value ?? "").replace(/\D/g, "");
    if (digits.length <= 4) return digits;
    const remainder = digits.length % 3;
    const headLength = remainder === 0 ? 3 : remainder === 1 ? 4 : 2;
    const groups = [digits.slice(0, headLength)];
    for (let i = headLength; i < digits.length; i += 3) groups.push(digits.slice(i, i + 3));
    return groups.join(" ");
};

export const handleFaxNumberInput = (e) => {
    let value = e.target.value;

    // Allow digits, plus sign, spaces, parentheses, dashes, and dots
    // Remove everything except digits and plus sign
    value = value.replace(/[^\d+]/g, "");

    // Ensure plus sign is only at the beginning
    const hasPlus = value.startsWith('+');
    const digitsOnly = value.replace(/\+/g, '');

    // If plus was in the middle, remove it
    let formattedValue = hasPlus ? '+' + digitsOnly : digitsOnly;

    // Enforce maximum length (15 for E.164 standard + 1 for plus sign = 16)
    if (formattedValue.length > 16) {
        formattedValue = formattedValue.slice(0, 16);
    }

    // Prevent multiple plus signs
    if (formattedValue.split('+').length > 2) {
        formattedValue = '+' + formattedValue.replace(/\+/g, '');
    }

    e.target.value = formattedValue;
};


// Formats a stored HKID for display as "ABC123456(7)"; returns "" for blank/placeholder values
export const formatHKIDForDisplay = (hkId) => {
    if (!hkId || hkId === "''" || hkId === '""' || hkId === "''''''") return "";
    const cleaned = String(hkId).replace(/\s|\(|\)/g, '').toUpperCase();
    if (!cleaned) return "";
    return `${ cleaned.slice(0, -1) }(${ cleaned.slice(-1) })`;
};


const showSuccessOrError = (response) => {
    const { error, payload } = response;
    if (error) {
        const errorMessage = payload?.message ? payload?.message : (payload?.data && payload?.data?.data && payload?.data?.data?.message) ? payload?.data?.data?.message : 'An unexpected error occurred.';
        ShowToast('error', errorMessage);
    } else {
        if (!payload.status) {
            const errorMessage = payload?.message;
            ShowToast('error', errorMessage);
        } else {
            const successMessage = payload?.message || 'Operation completed successfully.';
            ShowToast('success', successMessage);
        }
    }
};

const showErrorMessage = (response) => {
    const { error, payload } = response;
    if (error) {
        const errorMessage = payload?.message ? payload?.message : (payload?.data && payload?.data?.data && payload?.data?.data?.message) ? payload?.data?.data?.message : 'An unexpected error occurred.';
        ShowToast('error', errorMessage);
    }
};


const uploadChatFile = async (filesToUpload) => {
    let image = {};
    for (const file of filesToUpload) {
        const path = await uploadFileToS3(file.file, file.name, true)
            .catch((err) => {
                console.log(err);
                return false;
            });
        if (!path || !path.url) {
            throw new Error('File upload failed. This file type may not be supported.');
        }
        image = path;
    }
    return image;
}

const getTimeRequestStatusLabel = (status) => {
    switch (status) {
        case 0:
            return { label: 'Pending', className: 'chip pending' };
        case 1:
            return { label: 'Partially Approved', className: 'chip approved' };
        case 2:
            return { label: 'Approved', className: 'chip approved' };
        case 3:
            return { label: 'Rejected', className: 'chip rejected' };
        case 4:
            return { label: 'Withdrawn', className: 'chip withdrawn' };
        default:
            return { label: 'Unknown', className: 'chip unknown' };
    }
};

const ledgerDisplayType = (type) => {
    return type == "minus" ? "Debit" : "Credit";
};

const arrayToObjectCovert = (array) => {
    // APIs can return a blank/failed body, so never assume an array here —
    // throwing inside a reducer would unmount the whole app
    if (!Array.isArray(array)) return {};
    const object = array.reduce((acc, item) => {
        if (item?.id === undefined || item?.id === null) return acc;
        acc[item.id] = item;
        return acc;
    }, {});
    return object;
};

const mapFamilyDetailsInfo = (currentEmployer) => [
    { needsCare: "Adults", name: "adult_count", count: currentEmployer.adult_count },
    { needsCare: "Age 5 to 18", name: "child_age_5_8_count", count: currentEmployer.child_age_5_8_count },
    { needsCare: "Age below 5", name: "child_age_below_5_count", count: currentEmployer.child_age_below_5_count },
    { needsCare: "Expecting Babies", name: "expecting_baby_count", count: currentEmployer.expecting_baby_count },
    { needsCare: "Special Needs", name: "special_needs_count", count: currentEmployer.special_needs_count }
];




const mapFamilyDetails = (currentEmployer) => [
    { needsCare: "Adults", count: currentEmployer.adult_count, details: currentEmployer.adult_count_info },
    { needsCare: "Expecting Baby", count: currentEmployer.expecting_baby_count, details: [] },
    { needsCare: "Baby (under 1 Y/O)", count: currentEmployer.baby_count, details: currentEmployer.baby_count_info },
    { needsCare: "Child", count: currentEmployer.child_count, details: currentEmployer.child_count_info },
    { needsCare: "Elderly", count: currentEmployer.elderly_count, details: currentEmployer.elderly_count_info }
];

const getDisplayAgencyType = (type) => {
    switch (type) {
        case 'internal':
            return 'Internal';
        case 'external':
            return 'External';
        default:
            return 'Internal';
    }
};

const getDisplayAgencyCategory = (category) => {
    switch (category) {
        case 'host':
            return 'Host';
        case 'partner':
            return 'Partner';
        default:
            return 'Host';
    }
};

const downloadExcelFromBufferData = async (response, filename) => {
    try {
        const fileBlob = new Blob([response], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        saveAs(fileBlob, filename);
    } catch (error) {
        console.error('Error downloading the file:', error);
    }
};

const generateFilename = (keyword, extension) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const dateTimeString = `${ year }-${ month }-${ day }_${ hours }-${ minutes }-${ seconds }`;
    const filename = `${ keyword }_${ dateTimeString }.${ extension }`;
    return filename;
}

const downloadFile = (filePath) => {
    const link = document.createElement("a");
    link.href = filePath;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
const timeSince = (date) => {
    if (!date) return '';

    if (date instanceof Date) {
        return customFromNow(date);
    }

    if (typeof date === 'number') {
        return customFromNow(date);
    }

    if (typeof date === 'string') {
        if (date.endsWith('Z') || date.includes('T')) {
            return customFromNow(dayjs.utc(date));
        } else {
            return customFromNow(dayjs(date, 'YYYY-MM-DD HH:mm:ss', true));
        }
    }

    return '';
};
const getDisplayName = (str) => {
    return str
        .split('_')           // Split the string by underscores
        .map(word =>           // Capitalize the first letter of each word
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(' ');
};

const isDisabledCsOption = (e, permission) => {
    const currentStaffId = getCurrentUser()?.data.staff?.id;
    if (isAdminUser() || permission === 'all') {
        return false;
    } else if (permission === 'owner' && e.id === currentStaffId) {
        return false;
    }
    return true;
}

const getPredefinedRangeFromDates = (start, end) => {
    const diffDays = dayjs(end).diff(dayjs(start), 'days');
    const today = dayjs().startOf('day');
    const yearStart = dayjs().startOf('year');

    if (dayjs(start).isSame(today, 'day') && dayjs(end).isSame(today, 'day')) {
        return "today";
    }
    if (dayjs(start).isSame(today.clone().subtract(1, 'day'), 'day') &&
        dayjs(end).isSame(today.clone().subtract(1, 'day'), 'day')) {
        return "yesterday";
    }
    if (diffDays === 6 && dayjs(end).isSame(today, 'day')) {
        return "last_7_days";
    }
    if (diffDays === 29 && dayjs(end).isSame(today, 'day')) {
        return "last_30_days";
    }
    if (diffDays === 59 && dayjs(end).isSame(today, 'day')) {
        return "last_60_days";
    }
    if (diffDays === 89 && dayjs(end).isSame(today, 'day')) {
        return "last_90_days";
    }
    if (dayjs(start).isSame(dayjs().startOf('month'), 'day') &&
        dayjs(end).isSame(dayjs().endOf('month'), 'day')) {
        return "this_month";
    }
    if (dayjs(start).isSame(dayjs().subtract(1, 'month').startOf('month'), 'day') &&
        dayjs(end).isSame(dayjs().subtract(1, 'month').endOf('month'), 'day')) {
        return "last_month";
    }
    if (dayjs(start).isSame(dayjs().startOf('quarter'), 'day') &&
        dayjs(end).isSame(dayjs().endOf('quarter'), 'day')) {
        return "this_quarter";
    }
    if (dayjs(start).isSame(yearStart, 'day') &&
        dayjs(end).isSame(today, 'day')) {
        return "year_to_date";
    }
    if (dayjs(start).isSame(dayjs().subtract(1, 'year').startOf('year'), 'day') &&
        dayjs(end).isSame(dayjs().subtract(1, 'year').endOf('year'), 'day')) {
        return "last_year";
    }
    return null;
};

const checkPermission = (permissions, labelKey) => {
    const user = getStoredUser();
    if (user) {
        const guardName = user?.data?.role?.guard_name;
        if (guardName !== "admin" && guardName !== "sub-admin" && permissions) {
            const flag = permissions.find((element) => {
                return labelKey == element.label_key && element.permission_value == 1;
            });
            return !!flag;
        } else {
            return true;
        }
    }
};

const formatDuration = (seconds) => {
    const d = dayjs.duration(seconds, "seconds");
    const h = Math.floor(d.asHours());
    const m = d.minutes();

    return `${ h }h ${ m }m`;
};

const getObejctByModule = (key) => {
    if (key === 'worker_interpreter_owner') {
        return {
            'worker_interpreter_owner_worker_chat': 'worker_chat',
            'worker_interpreter_owner_worker_contact_details': 'worker_contact_details',
            'worker_interpreter_owner_worker_remark': 'worker_remarks',
            'worker_interpreter_owner_action_require_history': 'worker_action_require_history',
            'worker_interpreter_owner_chat_history': 'worker_chat_history',
            'worker_interpreter_owner_change_status_to_hold': 'worker_status_to_hold',
            'worker_interpreter_owner_change_status_to_suspended': 'worker_status_to_suspended',
            'worker_interpreter_owner_change_status_to_ban': 'worker_status_to_ban',
            'worker_interpreter_owner_change_interpreter': 'worker_change_interpreter',
            'worker_interpreter_owner_jo': 'worker_jo',
            'worker_interpreter_owner_employer_chat': 'worker_employer_chat',
            'worker_interpreter_owner_jo_share': 'worker_jo_share',
            'worker_interpreter_owner_jo_share_link': 'worker_jo_share_link',
            'worker_interpreter_owner_interview_decline': 'worker_interview_decline',
            'worker_interpreter_owner_interview_accept': 'worker_interview_accept',
            'worker_interpreter_owner_interview_reschedule': 'worker_interview_reschedule',
            'worker_interpreter_owner_interview_report': 'worker_interview_report',
            'worker_interpreter_owner_worker_profile': 'worker_worker_profile',
            'worker_interpreter_owner_worker_biodata': 'worker_worker_biodata',
            'worker_interpreter_owner_worker_photo': 'worker_worker_photo',
            'worker_interpreter_owner_philippines_worker_doc_upload': 'worker_philippines_worker_doc_upload',
            'worker_interpreter_owner_philippines_worker_assign_partner': 'worker_philippines_worker_assign_partner',
            'worker_interpreter_owner_indonesia_worker_doc_upload': 'worker_indonesia_worker_doc_upload',
            'worker_interpreter_owner_indonesia_worker_assign_partner': 'worker_indonesia_worker_assign_partner',
            'worker_interpreter_owner_indonesia_worker_assign_pt': 'worker_indonesia_worker_assign_pt',
            'worker_interpreter_owner_worker_details': 'worker_worker_details',
            'worker_interpreter_owner_worker_basic_details': 'worker_worker_basic_details',
            'worker_interpreter_owner_worker_consulate_details': 'worker_worker_consulate_details',
            'worker_interpreter_owner_worker_passport_details': 'worker_worker_passport_details',
            'worker_interpreter_owner_worker_activity': 'worker_worker_activity',
        };
    } else if (key === 'worker_onboarding_owner') {
        return {
            'worker_onboarding_owner_worker_chat': 'worker_chat',
            'worker_onboarding_owner_worker_contact_details': 'worker_contact_details',
            'worker_onboarding_owner_worker_remark': 'worker_remarks',
            'worker_onboarding_owner_action_require_history': 'worker_action_require_history',
            'worker_onboarding_owner_chat_history': 'worker_chat_history',
            'worker_onboarding_owner_change_status_to_hold': 'worker_status_to_hold',
            'worker_onboarding_owner_change_status_to_suspended': 'worker_status_to_suspended',
            'worker_onboarding_owner_change_status_to_ban': 'worker_status_to_ban',
            'worker_onboarding_owner_change_interpreter': 'worker_change_interpreter',
            'worker_onboarding_owner_jo': 'worker_jo',
            'worker_onboarding_owner_employer_chat': 'worker_employer_chat',
            'worker_onboarding_owner_jo_share': 'worker_jo_share',
            'worker_onboarding_owner_jo_share_link': 'worker_jo_share_link',
            'worker_onboarding_owner_interview_decline': 'worker_interview_decline',
            'worker_onboarding_owner_interview_accept': 'worker_interview_accept',
            'worker_onboarding_owner_interview_reschedule': 'worker_interview_reschedule',
            'worker_onboarding_owner_interview_report': 'worker_interview_report',
            'worker_onboarding_owner_worker_profile': 'worker_worker_profile',
            'worker_onboarding_owner_worker_biodata': 'worker_worker_biodata',
            'worker_onboarding_owner_worker_photo': 'worker_worker_photo',
            'worker_onboarding_owner_philippines_worker_doc_upload': 'worker_philippines_worker_doc_upload',
            'worker_onboarding_owner_philippines_worker_assign_partner': 'worker_philippines_worker_assign_partner',
            'worker_onboarding_owner_indonesia_worker_doc_upload': 'worker_indonesia_worker_doc_upload',
            'worker_onboarding_owner_indonesia_worker_assign_partner': 'worker_indonesia_worker_assign_partner',
            'worker_onboarding_owner_indonesia_worker_assign_pt': 'worker_indonesia_worker_assign_pt',
            'worker_onboarding_owner_worker_details': 'worker_worker_details',
            'worker_onboarding_owner_worker_basic_details': 'worker_worker_basic_details',
            'worker_onboarding_owner_worker_consulate_details': 'worker_worker_consulate_details',
            'worker_onboarding_owner_worker_passport_details': 'worker_worker_passport_details',
            'worker_onboarding_owner_worker_activity': 'worker_worker_activity',
        };
    } else if (key === 'worker_interpreter_onboarding_non_owner') {
        return {
            'worker_interpreter_onboarding_non_owner_worker_chat': 'worker_chat',
            'worker_interpreter_onboarding_non_owner_worker_contact_details': 'worker_contact_details',
            'worker_interpreter_onboarding_non_owner_worker_remark': 'worker_remarks',
            'worker_interpreter_onboarding_non_owner_action_require_history': 'worker_action_require_history',
            'worker_interpreter_onboarding_non_owner_chat_history': 'worker_chat_history',
            'worker_interpreter_onboarding_non_owner_change_status_to_hold': 'worker_status_to_hold',
            'worker_interpreter_onboarding_non_owner_change_status_to_suspended': 'worker_status_to_suspended',
            'worker_interpreter_onboarding_non_owner_change_status_to_ban': 'worker_status_to_ban',
            'worker_interpreter_onboarding_non_owner_change_interpreter': 'worker_change_interpreter',
            'worker_interpreter_onboarding_non_owner_jo': 'worker_jo',
            'worker_interpreter_onboarding_non_owner_employer_chat': 'worker_employer_chat',
            'worker_interpreter_onboarding_non_owner_jo_share': 'worker_jo_share',
            'worker_interpreter_onboarding_non_owner_jo_share_link': 'worker_jo_share_link',
            'worker_interpreter_onboarding_non_owner_interview_decline': 'worker_interview_decline',
            'worker_interpreter_onboarding_non_owner_interview_accept': 'worker_interview_accept',
            'worker_interpreter_onboarding_non_owner_interview_reschedule': 'worker_interview_reschedule',
            'worker_interpreter_onboarding_non_owner_interview_report': 'worker_interview_report',
            'worker_interpreter_onboarding_non_owner_worker_profile': 'worker_worker_profile',
            'worker_interpreter_onboarding_non_owner_worker_biodata': 'worker_worker_biodata',
            'worker_interpreter_onboarding_non_owner_worker_photo': 'worker_worker_photo',
            'worker_interpreter_onboarding_non_owner_philippines_worker_doc_upload': 'worker_philippines_worker_doc_upload',
            'worker_interpreter_onboarding_non_owner_philippines_worker_assign_partner': 'worker_philippines_worker_assign_partner',
            'worker_interpreter_onboarding_non_owner_indonesia_worker_doc_upload': 'worker_indonesia_worker_doc_upload',
            'worker_interpreter_onboarding_non_owner_indonesia_worker_assign_partner': 'worker_indonesia_worker_assign_partner',
            'worker_interpreter_onboarding_non_owner_indonesia_worker_assign_pt': 'worker_indonesia_worker_assign_pt',
            'worker_interpreter_onboarding_non_owner_worker_details': 'worker_worker_details',
            'worker_interpreter_onboarding_non_owner_worker_basic_details': 'worker_worker_basic_details',
            'worker_interpreter_onboarding_non_owner_worker_consulate_details': 'worker_worker_consulate_details',
            'worker_interpreter_onboarding_non_owner_worker_passport_details': 'worker_worker_passport_details',
            'worker_interpreter_onboarding_non_owner_worker_activity': 'worker_worker_activity',
        };
    } else if (key === 'partner_worker') {
        /* PERM Partner access / U-0213: partner keys only — host Change Status, Interview Report, Doc Upload and
           Assign Partner are never granted to a partner, so their keys are not read here */
        return {
            'partner_worker_chat': 'worker_chat',
            'partner_worker_contact_details_view': 'worker_contact_details',
            'partner_worker_remarks': 'worker_remarks',
            'partner_worker_profile': 'worker_worker_profile',
            'partner_worker_biodata': 'worker_worker_biodata',
            'partner_worker_photo': 'worker_worker_photo',
            'partner_worker_details_tab': 'worker_worker_details',
            'partner_worker_basic_details': 'worker_worker_basic_details',
            'partner_worker_consulate_details': 'worker_worker_consulate_details',
            'partner_worker_passport_details': 'worker_worker_passport_details',
            'partner_worker_activity': 'worker_worker_activity',
        };
    } else {
        return false;
    }
}

/* two owner blocks on the same key: `y` wins; else the union of the CSV tokens; `n` only when neither grants anything */
const mergeWorkerGrant = (a, b) => {
    const all = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])];
    if (all.includes('y')) return ['y'];
    const tokens = [...new Set(all.filter((v) => v !== 'n'))];
    return tokens.length ? tokens : (all.length ? ['n'] : []);
};

/*
 * Worker-record permissions for the current actor on ONE worker (PERM §5.5 / §5.9).
 * Column: partner actors (by staff type) read the partner_worker module; a host actor reads Interpreter Owner when
 * they interpret for the worker, Onboarding Owner when they are its Onboarding 1 or Onboarding 2 owner, else Non-Owner.
 * U-0343 / backend 304 (21 Oct package): a viewer who is BOTH the interpreter owner and an onboarding owner reads the
 * two blocks COMBINED (`y` wins; CSV tokens united) — the server evaluates the same union; Non-Owner only when neither applies.
 * Returns a fresh object every call — callers keep it in state and compare by reference.
 */
export const getWorkerPermissionAccess = (ownerOnboardingList, id, permissionList) => {
    const permissionInfo = Object.fromEntries(Object.keys(EMPTY_WORKER_PERMISSION_INFO).map((key) => [key, []]));
    if (!Array.isArray(permissionList)) return permissionInfo;
    const workerId = Number(id);
    const owns = (listKey) => Array.isArray(ownerOnboardingList?.[listKey]) && ownerOnboardingList[listKey].includes(workerId);
    const isPartnerStaff = getStoredUser()?.data?.staff?.staff_type === 'partner';
    let moduleKeys;
    if (isPartnerStaff) moduleKeys = ['partner_worker'];
    else if (!ownerOnboardingList) return permissionInfo;
    else {
        moduleKeys = [];
        if (owns('interpreter_of_worker_ids')) moduleKeys.push('worker_interpreter_owner');
        if (owns('onboarding1_of_worker_ids') || owns('onboarding2_of_worker_ids')) moduleKeys.push('worker_onboarding_owner');
        if (!moduleKeys.length) moduleKeys.push('worker_interpreter_onboarding_non_owner');
    }

    const seen = new Set();
    moduleKeys.forEach((moduleKey) => {
        const module = permissionList.find((m) => m.module === moduleKey);
        const permissionKeyMap = getObejctByModule(moduleKey);
        if (!module || !Array.isArray(module.category) || !permissionKeyMap) return;
        module.category.forEach((item) => {
            let value = item.selected_value;
            if (typeof value === 'string' && value) {
                value = value.split(',').map((v) => v.trim());
            }
            const key = permissionKeyMap[item.id];
            if (!key) return;
            permissionInfo[key] = seen.has(key) ? mergeWorkerGrant(permissionInfo[key], value) : value;
            seen.add(key);
        });
    });
    return permissionInfo;
};

export const isOwnerOnBoarding = (ownerOnboardingList, key, id, permissionList, permissionModule) => {
    let permissionInfo = {
        'worker_chat': '',
        'worker_contact_details': '',
        'worker_remarks': '',
        'worker_action_require_history': '',
        'worker_chat_history': '',
        'worker_status_to_hold': '',
        'worker_status_to_suspended': '',
        'worker_status_to_ban': '',
        'worker_employer_chat': '',
        'worker_jo_share': '',
        'worker_jo_share_link': '',
        'worker_interview_decline': '',
        'worker_interview_accept': '',
        'worker_interview_reschedule': '',
        'worker_interview_report': '',
        'worker_worker_profile': '',
        'worker_worker_biodata': '',
        'worker_worker_photo': "",
        'worker_philippines_worker_doc_upload': '',
        'worker_philippines_worker_assign_partner': '',
        'worker_indonesia_worker_doc_upload': '',
        'worker_indonesia_worker_assign_partner': '',
        'worker_indonesia_worker_assign_pt': '',
        'worker_worker_details': '',
        'worker_worker_basic_details': '',
        'worker_worker_consulate_details': '',
        'worker_worker_passport_details': '',
        'worker_worker_activity': '',
    };

    if (ownerOnboardingList && permissionList && ownerOnboardingList[key] && ownerOnboardingList[key].includes(Number(id))) {
        const module = permissionList.find(m => m.module === permissionModule);
        if (module) {
            if (module.category && Array.isArray(module.category)) {
                // Map of permissionInfo keys to category item ids
                const permissionKeyMap = getObejctByModule(permissionModule);
                if (permissionKeyMap) {
                    module.category.forEach(item => {
                        let value = item.selected_value;
                        if (typeof value === 'string' && value) {
                            value = value.split(',').map(v => v.trim());
                        }
                        const key = permissionKeyMap[item.id];
                        if (key) {
                            permissionInfo[key] = value;
                        }
                    });
                }
            }
        }
    }
    return permissionInfo;
};

const isAdminUser = () => {
    const currentUser = getStoredUser();
    return currentUser?.data?.role?.id === ADMIN_ROLE_ID;
};

export const findPermission = (permissionModule, permissionId) => {
    if (!permissionModule || !permissionModule.category) return null;

    const per = permissionModule.category.find(item => item.id === permissionId) || null;
    return per;
};

export const hasPermission = (permissionList, moduleId, permissionId) => {
    if (isAdminUser()) return true;
    if (!permissionList || !Array.isArray(permissionList)) return false;

    const module = permissionList.find(m => m.module === moduleId);
    if (!module) return false;

    const permission = findPermission(module, permissionId);
    return permission?.selected_value === 'y';
};

export const hasAnyModulePermission = (permissionList, pairs) =>
    Array.isArray(pairs) && pairs.some(([moduleId, permissionId]) => getPermissionValue(permissionList, moduleId, permissionId) === 'y');

export const getPermissionValue = (permissionList, moduleId, permissionId) => {
    if (isAdminUser()) return 'y';
    if (!permissionList || !Array.isArray(permissionList)) return false;

    const module = permissionList.find(m => m.module === moduleId);
    if (!module) return '';

    const permission = findPermission(module, permissionId);
    return permission?.selected_value;
};

export const getPermissionModule = (permissionList, moduleId) => {
    if (!permissionList || !Array.isArray(permissionList)) return false;

    const module = permissionList.find(m => m.module === moduleId);
    if (!module) return '';
    return module;
};

const getTimeDifference = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    let diff = end - start;
    if (diff < 0) {
        diff += 24 * 60 * 60 * 1000;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${ hours } hr ${ minutes } min`;
};

const isOwnerPermissionsOfContract = (ownerOnboardingList, contract_id) => {
    return ownerOnboardingList?.cs_of_contract_ids?.includes(contract_id) || false;
};

const isOwnerPermissionsOfJob = (ownerOnboardingList, empId) => {
    return ownerOnboardingList?.cs_of_employer_ids?.includes(empId) || false;
};

const getProcessingPermission = (permissionList, isOwner, permissionKey) => {
    const prefix = isOwner ? 'processing_cs_owner' : 'processing_cs_non_owner';
    return getPermissionValue(permissionList?.data, prefix, `${ prefix }_${ permissionKey }`) === 'y' || isAdminUser();
};

const customFromNow = (date) => {
    const now = dayjs();
    const targetDate = dayjs(date);
    const diffMinutes = now.diff(targetDate, 'minutes');

    // Handle "a few seconds ago" and similar dayjs.js phrases
    if (diffMinutes < 1) {
        const timeString = dayjs(date).fromNow();
        if (timeString.startsWith('a few') || timeString.startsWith('in a few seconds')) {
            return 'Few seconds ago';
        }
        return timeString
            .replace(/^a /, '1 ')
            .replace(/^an /, '1 ');
    }

    const diffHours = now.diff(targetDate, 'hours');
    const diffDays = now.diff(targetDate, 'days');
    const diffYears = now.diff(targetDate, 'years', true);

    if (diffMinutes < 60) {
        return `${ diffMinutes }min ago`;
    } else if (diffHours < 24) {
        const roundedHours = Math.round(diffHours);
        return `${ roundedHours }h ago`;
    } else if (diffDays < 30) {
        const roundedDays = Math.round(diffDays);
        return `${ roundedDays }d ago`;
    } else if (diffDays < 365) {
        const exactMonths = diffDays / 30;
        const roundedMonths = Math.round(exactMonths);
        return `${ roundedMonths }mo ago`;
    } else {
        const roundedYears = Math.round(diffYears);
        return `${ roundedYears }y ago`;
    }
};

const convertTo12HourFormat = (isoString) => {
    const date = new Date(isoString);
    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${ hours }:${ formattedMinutes } ${ ampm }`;
};

const getUserProfileDetails = (workerDetail) => [
    [
        { label: "key_age", value: workerDetail?.age },
        { label: "key_nationality", value: workerDetail?.nationality?.name },
    ],
    [
        { label: "key_height", value: workerDetail?.height?.name },
        { label: "key_chinese_horoscope", value: workerDetail?.chinese_horoscope?.name },
    ],
    [
        { label: "key_weight", value: `${ workerDetail?.weight } ${ workerDetail?.weight_measurement }` },
        { label: "key_horoscope", value: workerDetail?.horoscope?.name },
    ],
    [
        { label: "key_religion", value: workerDetail?.religion?.name },
        { label: "key_marital_status", value: workerDetail?.marital_status?.name },
    ],
];
const getFamilyDetails = (workerDetail) => [
    [
        {
            key: "key_number_of_children",
            label: "key_number_of_children",
            value: workerDetail?.children_count,
        },
        {
            key: "key_age_of_oldest_child",
            label: "key_age_of_oldest_child",
            value: workerDetail?.oldest_child_age,
        },
    ],
];


const formatFeedbackType = (type) => {
    switch (type) {
        case 'report_a_bug':
            return { label: 'Bug Reported', translationKey: 'key_bug_reporter' };
        case 'general_feedback':
            return { label: 'Feedback', translationKey: 'key_feedback' };
        case 'customer_service':
            return { label: 'Customer Service', translationKey: 'key_customer_service' };
        case 'employer':
            return { label: 'Employer', translationKey: 'key_employer' };
        case 'helper':
            return { label: 'Helper', translationKey: 'key_helper' };
        case 'other':
            return { label: 'Other', translationKey: 'key_other' };
        default:
            return { label: 'Other', translationKey: 'key_other' };
    }
}

const getExperienceDetails = (experience) => [
    [
        {
            label: "key_employer_nationality",
            value: experience?.employer_nationality_info?.name || "Not Provided",
        },
        {
            label: "key_size_of_home",
            value: experience?.house_size
                ? `${ experience?.house_size } Sq Ft`
                : "Not Provided",
        },
    ],
    [
        {
            label: "key_district",
            value: experience?.district_info?.name || "Not Provided",
        },
        {
            label: "key_household_size",
            value: experience?.family_size || "Not Provided",
        },
    ],
    [
        {
            label: "key_language_spoken",
            value: experience?.spoken_language_info
                ? experience?.spoken_language_info.map((lang) => lang.name).join(", ")
                : "Not Provided",
        },
        {
            label: "key_reason_of_leaving",
            value: experience?.contract_status_info?.admin_panel_status || experience?.contract_status_info?.name || experience?.leaving_reason_info?.name || "Not Provided",
        },
    ],
];

const getDeviceType = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile/i.test(userAgent)) {
        return { name: "App", id: 2 };
    } else if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
        return { name: "Tab", id: 3 };
    } else {
        return { name: "Desktop", id: 1 };
    }
};

const getDownloadPdfKey = (formKey) => {
    const pdfKeyMapping = {
        'employer_id_988b': 'ID988B',
        'immigration_emp_doc': 'ID934A',
        'id_934a': 'ID934A',
        'key_id_988a': 'ID988A',
        'helper_id_988a': 'ID988A',
        'immigration_driver_duties_doc': 'ID678',
        'employer_id_407e': 'ID407E',
        'immigration_public_rental_doc': 'ID407G',
        'speed_up_letter': 'VISA_SPEED_UP_LETTER_TO_IMMIGRATION'
    };
    return pdfKeyMapping[formKey] || null;
}

/** a Prepared / Ready / Uploaded mark: 1, "1" or true (never "0" / "No") */
export const isMark = (value) => value === true || Number(value) === 1;

const mapTableData = (processingDetails, groupMapping, groupName) => {
    return Object.keys(groupMapping).map((item) => ({
        label: item,
        eng: item,
        /* marks arrive as 1 / "1" / true depending on the row's origin (the case-only rows of backend 256 are newer code) */
        prepared: isMark(processingDetails[groupMapping[item] + "_prepared"]),
        ready: isMark(processingDetails[groupMapping[item] + "_ready"]),
        isDoc: isMark(processingDetails[groupMapping[item] + "_uploaded"]),
        uploaded: isMark(processingDetails[groupMapping[item] + "_uploaded"]) ? "Yes" : "No",
        selectedGroupName: groupName,
        isPdfLoading: false,
        key: getDownloadPdfKey(groupMapping[item]),
        // Stable requirement ID (DB column stem) — never the translated label (Excel Contract No. 11).
        requirementKey: groupMapping[item],
    }));
};

const getPermissionCategory = (permissionsData, permissionName) => {
    return permissionsData?.data?.find((module) => module.module === permissionName);
}

const getPageName = (workerObj) => {
    if (workerObj?.job_stage?.is_suggested && workerObj?.job_stage_status_id === 2) {
        return 'suggested';
    } else if (workerObj?.job_stage_status_id === 3) {
        return 'matched';
    } else if (workerObj?.job_stage_status_id === 4 ||
        workerObj?.job_stage_status_id === 5 ||
        workerObj?.job_stage_status_id === 6 ||
        workerObj?.job_stage_status_id === 10
    ) {
        return 'interview';
    } else if (!workerObj?.job_stage?.is_suggested && workerObj?.job_stage_status_id === 2) {
        return 'applied';
    } else if (workerObj?.job_stage_status_id === 1) {
        return 'invited';
    }
}

const getWorkerDeeplinkPageName = (workerObj) => {
    if (!workerObj) return '';

    const { job_stage_status, job_stage_is_suggested } = workerObj;

    if (job_stage_status === 20) {
        return 'profile';
    } else if ((job_stage_status === 2 && job_stage_is_suggested === 1) || job_stage_status === 17) {
        return 'suggested';
    } else if (job_stage_status === 2 && job_stage_is_suggested === 0) {
        return 'applied';
    } else if ([4, 5, 6, 10].includes(job_stage_status)) {
        return 'interview';
    } else if (job_stage_status === 3) {
        return 'matched';
    } else if (job_stage_status === 1) {
        return 'invited';
    } else {
        return '';
    }
};

const getInnerPermissionCategory = (permissionsData, moduleName, id) => {
    const employerModule = getPermissionCategory(permissionsData, moduleName);
    if (!employerModule) return null;

    // Check direct
    const mainCategory = employerModule.category.find(cat => cat.id === id);
    if (mainCategory) return mainCategory;

    // Check in child array
    for (const category of employerModule.category) {
        if (category.child) {
            const childCategory = category.child.find(child => child.id === id);
            if (childCategory) return childCategory;
        }
    }

    return null;
};

const getSavedLanguage = () => {
    const savedLanguage = localStorage.getItem('i18nextLng');
    return savedLanguage || 'en';
}

const getPdfFileName = (row, contractDetails) => {
    return `${ row?.service_agreement || row?.key || row?.pdfFileName || 'document' }-${ contractDetails?.id }-${ contractDetails?.worker_name }-${ contractDetails?.employer_name }.pdf`;
}

const copyToClipboard = async (text) => {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    input.setSelectionRange(0, 99999); // For mobile compatibility

    try {
        document.execCommand('copy');
        ShowToast('success', translation('key_copied_to_clipboard'));
    } catch (copyErr) {
        console.error('Failed to copy text: ', copyErr);
    }
    document.body.removeChild(input);
};

const nullifyIfStringNull = (value) => value === 'null' ? null : value;



const getFilesNeedingConversion = (files) => {
    return Array.from(files).filter(file =>
        file.type !== "application/pdf" &&
        ['image/jpeg', 'image/png', 'image/jpg', 'application/doc', 'application/docx'].includes(file.type)
    );
};

const deepLinkAPIHeader = () => {
    return {
        'x-api-key': REACT_APP_X_API_KEY,
        'hosttype': HOST_TYPE,
        'device': navigator.userAgent,
        'Content-Type': 'application/json',
        'timezone': Intl.DateTimeFormat().resolvedOptions().timeZone
    }
}

const isOverseasIndoOrFilipino = (worker) => {
    if (!worker) return false;

    const { nationality_id, type } = worker;
    return (nationality_id === indonesiaId || nationality_id === fillipinoId) && (type === 2 || type === 'Overseas');
}

const formatTimeTo12HourFormat = (timeString) => {
    if (!timeString) return '-';
    return dayjs(timeString, 'HH:mm:ss').format('hh:mm A');
};

const getMessagesHeight = (containerHeight, inputHeight) => {
    //for resizable chat window 
    if (containerHeight) {
        if (containerHeight && containerHeight !== 'auto') {
            const inputBarHeight = 61;
            // const paddingAndMargin = 12;
            const headerHeight = 135;
            return Math.max(200, containerHeight - inputBarHeight - headerHeight);
        }
        return 300;
    }

    //for chat page
    const baseInputHeight = 38;
    const extraHeight = inputHeight - baseInputHeight;
    const reducingHeight = 341 + extraHeight;

    return `calc(100vh - ${ reducingHeight }px)`;
}

const handleOtpInputChange = (e, maxLength = 6, onChangeCallback) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > maxLength) {
        value = value.slice(0, maxLength);
    }
    e.target.value = value;
    onChangeCallback(value);
};

const getInvoiceDetailPath = (invoice) => {
    if (!invoice?.id) return '/invoices';
    const type = invoice.invoice_type || '';
    const isGeneral = type === 'general' || type === 'general_refund';
    const base = isGeneral ? '/invoices/general' : '/invoices/add-contract-invoice';
    const s = Number(invoice.status);
    if (s === 8 || s === 9) return base + '/refund-invoice/' + invoice.id;
    if (s === 6 && type.includes('refund')) return base + '/refund-invoice/' + invoice.id;
    if (s === 10) return base + '/exchange-payment-review/' + invoice.id;
    if (s === 11 && !isGeneral) return base + '/exchange-payment-type-invoice/' + invoice.id;
    return base + '/payment-type-invoice/' + invoice.id;
};

export {
    getAccessToken,
    convertToYesNo,
    convertToNumeric,
    formatDateTime,
    getCurrentDate,
    formatDate,
    formatTime,
    extractIds,
    convertToDayType,
    leaveDisplayStatus,
    getLeaveButtonClass,
    calculateDuration,
    getLocalTimeZone,
    useQuery,
    doopDays,
    getCurrentUser,
    isAdminUser,
    shortenText,
    uploadFile,
    uploadChatFile,
    getTimeRequestStatusLabel,
    ledgerDisplayType,
    arrayToObjectCovert,
    mapFamilyDetails,
    mapFamilyDetailsInfo,
    getDisplayAgencyType,
    getDisplayAgencyCategory,
    downloadExcelFromBufferData,
    generateFilename,
    downloadFile,
    timeSince,
    getDisplayName,
    checkPermission,
    getTimeDifference,
    convertTo12HourFormat,
    customFromNow,
    getUserProfileDetails,
    getFamilyDetails,
    getExperienceDetails,
    getDeviceType,
    getCalculatedAge,
    relationMap,
    showSuccessOrError,
    showErrorMessage,
    dayMapping,
    uploadFiles,
    validateUploadFile,
    mapTableData,
    copyToClipboard,
    nullifyIfStringNull,
    getFilesNeedingConversion,
    getPermissionCategory,
    getInnerPermissionCategory,
    isDisabledCsOption,
    getPredefinedRangeFromDates,
    isOwnerPermissionsOfContract,
    isOwnerPermissionsOfJob,
    getProcessingPermission,
    deepLinkAPIHeader,
    getPageName,
    getWorkerDeeplinkPageName,
    getPdfFileName,
    isOverseasIndoOrFilipino,
    getSavedLanguage,
    formatDuration,
    formatFeedbackType,
    formatTimeTo12HourFormat,
    getMessagesHeight,
    handleOtpInputChange,
    getInvoiceDetailPath
};