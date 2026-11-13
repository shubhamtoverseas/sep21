import dayjs from "dayjs";
import copyKeys from "../../../../utils/copyKeys";


export const DATE_DISPLAY_FORMAT = "DD/MM/YYYY";
export const API_DATE_FORMAT = "YYYY-MM-DD";

/* v3 (28 Oct): a remembered District that no longer matched the remembered Location is discarded once (frontend 414) */
export const EMPLOYER_VIEW_STATE_KEY = "egd_view_state_v3";
/* the search text is kept for the session only (conflict sheet U-0026): a round trip to a record keeps it, a new session does not */
export const EMPLOYER_SEARCH_SESSION_KEY = "egd_search_v1";
/* SR-05 return state: the opened row and the scroll offset, restored (and focus put back on the row) on Back */
export const EMPLOYER_RETURN_STATE_KEY = "egd_return_v1";
export const DEFAULT_PAGE_LIMIT = 10;
export const ALL_OPTION_VALUE = "";
export const SKELETON_ROWS = 6;
/* Employer Dashboard column tracks — SR-06 role + declared width (prototype employer-dashboard listing) */
export const EMPLOYER_DASHBOARD_TRACKS = Object.freeze({
    name: { role: "name", width: 200 },
    code: { role: "ref", width: 140 },
    mobile: { role: "ref", width: 140 },
    whatsapp: { role: "ref", width: 140 },
    language: { role: "staff", width: 150 },
    district: { role: "staff", width: 132 },
    cs: { role: "staff", width: 150 },
    branch: { role: "staff", width: 132 },
});
export const ADDED_TOAST_MS = 8000;
export const DEDUPE_SEARCH_PAYLOAD = { pagination_false: 1, context: "search" };
export const ACTIVE_BRANCH_PARAMS = { status: 1, type: "host" };

export const DEFAULT_EMPLOYER_FILTERS = Object.freeze({
    page: 1,
    limit: DEFAULT_PAGE_LIMIT,
    search_text: "",
    sort_by: "",
    sort_order: "",
    location: Object.freeze([]),
    branch_id: Object.freeze([]),
    primary_language: Object.freeze([]),
    district: Object.freeze([]),
    created: "",
    start_date: null,
    end_date: null,
});

/* Title options as the prototype edit sheet lists them (Mr · Mrs · Ms · Miss · Dr · Prof); the create dialog shows four —
   the complete list is with product (U-0040); the backend accepts all six */
export const EMPLOYER_TITLE_OPTIONS = copyKeys([
    { value: "Mr", key: "key_mr" },
    { value: "Mrs", key: "key_mrs" },
    { value: "Ms", key: "key_ms" },
    { value: "Miss", label: 'key_emp_employer_title_options_3_label' },
    { value: "Dr", label: 'key_emp_employer_title_options_4_label' },
    { value: "Prof", label: 'key_emp_employer_title_options_5_label' },
]);
/* Details tab sub-tabs (prototype [aria-label="Details sections"], walkthrough E01 step 8) */
export const EMPLOYER_DETAILS_SUBTABS = Object.freeze({ EMPLOYER: 'employer-details', FAMILY: 'family-details' });
/* New Employer dialog copy (prototype .mgrid / #otp-row / validate()) — English literals, no keys added */
export const EMPLOYER_FORM_COPY = copyKeys(Object.freeze({
    sameAsMobile: 'key_emp_employer_form_same_as_mobile',
    codeSentTo: 'key_emp_employer_form_code_sent_to',
    missingOne: 'key_required_field_is_missing',
    missingMany: 'key_required_fields_are_missing',
}));
export const OTP_RESEND_SECONDS = 60;
export const OTP_SOURCE = "add_employer";
export const OTP_TYPE = { SEND: 1, VERIFY: 2 };
export const OTP_CODE_LENGTH = 6;
/* work order 22 Oct (contact changes need OTP): verification_type per phone field — the alternate mobile uses the mobile semantics */
export const OTP_VERIFICATION_TYPE = Object.freeze({ MOBILE: "mobile_verified", WHATSAPP: "whatsapp_verified", EMAIL: "email_verified" });
export const CONTACT_OTP_FIELDS = Object.freeze([
    { key: "mobile", verificationType: OTP_VERIFICATION_TYPE.MOBILE, payloadKey: "mobile", labelKey: "key_mobile_number" },
    { key: "whatsapp", verificationType: OTP_VERIFICATION_TYPE.WHATSAPP, payloadKey: "whatsapp", labelKey: "key_whatsapp_number" },
    { key: "alternate", verificationType: OTP_VERIFICATION_TYPE.MOBILE, payloadKey: "alternate_mobile", labelKey: "key_alternate_mobile_number" },
]);
export const CONTACT_OTP_COPY = Object.freeze({ pending: "key_replacement_pending", savedNote: "key_otp_saved_number_note", unverifiedBanner: "key_otp_unverified_banner", emailReadOnly: "key_otp_email_read_only" });
/* server refusals of /update-contact-details (legacy rule): a changed value without its OTP verification */
export const CONTACT_VERIFY_CODE = Object.freeze({ VERIFY_MOBILE: "mobile", VERIFY_WHATSAPP: "whatsapp", VERIFY_ALTERNATE_MOBILE: "alternate", VERIFY_EMAIL: "email" });
export const EMPTY_VERIFY = { mobile_verified: 0, mobile_verified_at: null, whatsapp_verified: 0, whatsapp_verified_at: null, email_verified: 0, email_verified_at: null };
export const EMPTY_SNAPSHOT = { mobile_number: null, country_code: null, whatsapp_number: null, whatsapp_country_code: null, email: null };

/* E-1 / U-0032 (backend answers 16 Oct §1): a duplicate phone number on /save-employer and /update-contact-details is a
   warning the admin reviews and confirms — HTTP 200, `status: false`, this code; the same payload plus the confirm flag saves */
export const EMPLOYER_SAVE_CODE = Object.freeze({ DUPLICATE_MOBILE: "DUPLICATE_MOBILE" });
export const EMPLOYER_CONFIRM_DUPLICATE_FIELD = "confirm_duplicate";
/* `data.fields` → label; `duplicates[].source` → label (the server's `number` is already masked) */
export const EMPLOYER_DUPLICATE_FIELD_KEYS = Object.freeze({ mobile_number: "key_mobile_number", whatsapp_number: "key_whatsapp_number" });
export const EMPLOYER_DUPLICATE_SOURCE_KEYS = Object.freeze({ employer: "key_employer", worker: "key_worker", staff: "key_staff", user: "key_user" });
/* a confirmed duplicate Mobile creates a second users row; the employer app's OTP login finds the older one — say so */
export const EMPLOYER_DUPLICATE_OTP_NOTE_FIELD = "mobile_number";
export const EMPLOYER_DUPLICATE_COPY = copyKeys(Object.freeze({
    saveAnyway: "key_save_anyway",
    mobileOtpNote: "key_duplicate_mobile_otp_note",
}));

/* E-6 / U-0039: spoken Primary Language — GET /get-primary-language (cantonese · english · mandarin); a legacy row carries
   `primary_language_legacy` (the stored text, shown as a disabled selected option, never offered as a choice) */
export const PRIMARY_LANGUAGE_QUERY_KEY = Object.freeze(["ref", "primary-language"]);

export const FIELD_LABEL_KEYS = {
    title: "key_title",
    surname: "key_surname",
    name: "key_given_names",
    country_code: "key_country_code",
    mobile_number: "key_mobile",
    whatsapp_country_code: "key_whatsapp",
    whatsapp_number: "key_whatsapp",
    email: "key_email",
    primary_language: "key_primary_language",
    nationality: "key_employer_nationality",
    location: "key_location",
    district: "key_district",
    branch_id: "key_branch",
};

/* written language of the link (conflict sheet U-0039): English · Traditional Chinese · Simplified Chinese. The ids are
   the codes today's send-link API accepts; the combined spoken/written labels are gone */
export const REG_LINK_LANGUAGES = copyKeys([
    { id: "en", label: 'key_english' },
    { id: "yue", label: 'key_emp_reg_link_languages_1_label' },
    { id: "cmn", label: 'key_simplified_chinese' },
]);
export const WHATSAPP_LIST_TYPE = { type: "1" };

export const ACTIVE_EMPLOYER_STATUS = 1;
/* backend 375 (E-22): the only other stored value */
export const BANNED_EMPLOYER_STATUS = 2;
/* L-47 footer variants (singular / plural), shown with the accessible total from backend 375 — raw key names, the
   table translates (not a copyKeys proxy, which would resolve the text on read) */
export const EMPLOYER_FOOTER_MATCH_KEYS = Object.freeze({
    searchOne: 'key_emp_footer_matches_search', searchMany: 'key_emp_footer_match_search',
    filtersOne: 'key_emp_footer_matches_filters', filtersMany: 'key_emp_footer_match_filters',
});
export const employerFooterMatchKey = (info) => {
    const kind = info?.searching ? 'search' : 'filters';
    return EMPLOYER_FOOTER_MATCH_KEYS[`${ kind }${ Number(info?.total) === 1 ? 'One' : 'Many' }`];
};
export const CHAT_REOPEN_DELAY_MS = 2000;
export const CHAT_OPEN_DELAY_MS = 1000;
export const CHAT_USER_TYPES = { EMPLOYER: "employer", GROUP_TEAM: "group_team" };

/* PERM §17 step 10 / U-0055: the cross-module tabs defer entirely to the referenced module — its Access (owner or non-owner column)
   AND its Details View (`details`: any one grants; Invoice has no Details View key in the catalogue, so Access alone) */
export const EMPLOYER_CROSS_MODULE_TAB_ACCESS = Object.freeze({
    contract: { module: "contract_processing", keys: ["contract_processing_access", "contract_processing_access_cs_non_owner"], details: [{ module: "processing_cs_owner", key: "processing_cs_owner_details" }, { module: "processing_cs_non_owner", key: "processing_cs_non_owner_details" }] },
    invoice: { module: "invoice", keys: ["invoice_access", "invoice_access_cs_non_owner"], details: [] },
    insurance: { module: "insurance", keys: ["insurance_access", "insurance_access_cs_non_owner"], details: [{ module: "insurance", key: "insurance_details_view" }] },
});
/* U-0056: the New button on a cross-module tab is that module's own create action — hidden without its grant */
export const EMPLOYER_CROSS_MODULE_CREATE = Object.freeze({
    contract: { module: "contract", key: "contract_invoice_add_from_contract_global" },
    insurance: { module: "insurance", key: "insurance_add" },
});

export const EMPLOYER_DETAIL_TABS = {
    JOB_OFFER: "job-offer",
    DETAILS: "details",
    CONTRACT: "contract",
    INVOICE: "invoice",
    INSURANCE: "insurance",
    ACTIVITY: "activity",
};

/* record header: the icon and its accessible name carry the CURRENT engagement (SR-06, DASH §5; sheet U-0127 / U-0238:
   App · Web · Staff-assisted, never the "Registered through…" acquisition wording) — keyed by the engagement kind
   (`getEngagementKind`: the API's current engagement, else the registration source until it is sent) */
export const EMPLOYER_ENGAGEMENT_HEADER = copyKeys(Object.freeze({
    app: { icon: "smartphone", title: 'key_jo_dash_type_options_0_label' },
    web: { icon: "laptop", title: 'key_jo_dash_type_options_1_label' },
    staff: { icon: "user", title: 'key_jo_dash_type_options_2_label' },
}));

/* Ban / Restore (prototype mc-emp-actions): menu wording and the confirmation copy */
export const EMPLOYER_BAN_COPY = copyKeys(Object.freeze({
    banAction: 'key_emp_employer_ban_ban_action',
    restoreAction: 'key_emp_employer_ban_restore_action',
    banTitle: 'key_emp_employer_ban_ban_title',
    banBody: 'key_emp_employer_ban_ban_body',
    restoreTitle: 'key_emp_employer_ban_restore_title',
    restoreBody: 'key_emp_employer_ban_restore_body',
}));

/* U-0046 (21 Oct) / backend 323: Ban / Restore need an explicit reason (`reason`, ≤ 1000; the audit event is the server's) */
export const EMPLOYER_BAN_REASON_MAX = 1000;

export const DETAILS_CARDS = { BASIC: "basic", OTHER_CONTACT: "other-contact", FAMILY: "family" };

/* U-0047 (21 Oct): Send Template is a per-section action — Basic and Family each carry one, on that section's own send
   grant plus its View (never an Employer Chat bypass). The template categories (module `employer`) are backend 329 / SQL 21 §A:
   `basic_details` and `family_details`; until the category list of an environment returns the slug the control stays
   disabled (which templates sit under them is Mike's). `contextKey` names the section on the composer. */
export const EMPLOYER_TEMPLATE_USER_TYPE = 'employer';
export const EMPLOYER_SECTION_TEMPLATE = Object.freeze({
    basic: Object.freeze({ slug: 'basic_details', contextKey: 'key_employer_details' }),
    family: Object.freeze({ slug: 'family_details', contextKey: 'key_family_details' }),
});
export const ADDRESS_TYPE = { residential: 1, correspondence: 2 };
export const ADDRESS_TYPE_OPTIONS = [
    { value: ADDRESS_TYPE.residential, key: "key_residential" },
    { value: ADDRESS_TYPE.correspondence, key: "key_correspondence" },
];
export const FAMILY_TABLE_HEADER_KEYS = ["key_name", "key_year_only", "key_date_of_birth", "key_age", "key_relationship", "key_hkid"];
export const FAMILY_YEAR_OPTIONS = Array.from({ length: 100 }, (_, i) => dayjs().year() - i);
export const EMPTY_FAMILY_MEMBER = { name: "", dob: "", year: "", relation: "", hk_id: "", year_only: "n", action: "add" };
export const ADULT_AGE = 18;
export const CHILD_AGE = 5;

export const JO_STATUS_ALL = 0;
export const OPEN_JO_LIMIT = 2;
export const JOB_OFFER_ID_PARAM = "jobOfferId";
export const MODE_PARAM = "mode";
export const EDIT_MODE = "edit";
export const CREATE_PARAM = "createJobOffer";
/* prototype / l10n column labels: "JO Ref" (audit D-16) */
export const JO_LISTING_COLUMN_KEYS = [
    "key_jo_ref", "key_jo_status", "key_open", "key_views",
    "key_apply_percent", "key_start_date", "key_stage_details", "key_cs_owner",
];

export const JO_STAGE_COUNT_KEYS = {
    invited: "invited_stages_count",
    applied: "applied_stages_count",
    matched: "matched_stages_count",
    pending: "pending_stages_count",
    upcoming: "upcoming_stages_count",
    completed: "completed_stages_count",
    cancelled: "cancelled_stages_count",
};

/* the six applicant stages in lifecycle order (U-0129 Pending before Upcoming; U-0133 no Invited) */
export const JO_STAGE_ORDER = [
    { className: "applied", label: "key_applied" },
    { className: "matched", label: "key_matched" },
    { className: "pending", label: "key_interview_pending" },
    { className: "upcoming", label: "key_interview_upcoming" },
    { className: "completed", label: "key_interview_completed" },
    { className: "cancelled", label: "key_cancelled" },
];

export const JO_STAGE_ICON_PATHS = {
    applied: [["circle", { cx: "12", cy: "8", r: "4" }], ["path", { d: "M4 21c0-4 4-6 8-6s8 2 8 6" }]],
    matched: [["path", { d: "M10 13a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1" }], ["path", { d: "M14 11a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1" }]],
    upcoming: [["rect", { x: "3", y: "5", width: "18", height: "16", rx: "2" }], ["path", { d: "M3 9h18M8 3v4M16 3v4" }]],
    pending: [["circle", { cx: "12", cy: "12", r: "9" }], ["path", { d: "M12 7v5l3 2" }]],
    completed: [["path", { d: "m4 12 5 5L20 6" }]],
    cancelled: [["path", { d: "m6 6 12 12M6 18 18 6" }]],
};

/* Employer Details entry states (adapter showDenied / showInvalid; CR SR-02, SR-05) */
export const EMPLOYER_LOAD_STATE = Object.freeze({ DENIED: 'denied', INVALID: 'invalid', ERROR: 'error' });
export const EMPLOYER_RECORD_COPY = copyKeys(Object.freeze({
    deniedText: 'key_fu_not_available',
    invalidTitle: 'key_emp_employer_record_invalid_title',
}));

/* Search Access (PERM §1.3, §9.1; DASH §7.1): unticked = search disabled; Restricted = hard cap of 10 rows, no further pages */
export const EMPLOYER_SEARCH_ACCESS = Object.freeze({ NONE: '', OFF: 'off', RESTRICTED: 'restricted', FULL: 'full_access' });   /* backend 269: `off` = search disabled */
export const EMPLOYER_RESTRICTED_ROW_CAP = 10;
export const EMPLOYER_SEARCH_COPY = copyKeys(Object.freeze({
    disabledTitle: 'key_emp_employer_search_disabled_title',
    tooMany: 'key_ins_capped_refine',
}));

/* DASH §9 search field: short placeholder; the help names FIELDS, never a record value */
export const EMPLOYER_SEARCH_PLACEHOLDER = 'Search employers…';
/* an HKID attempt is 1–2 letters + 6 digits + a check character; an email attempt contains "@" (SEARCH.md format rules) */
export const EMPLOYER_SEARCH_FORMAT = Object.freeze({
    hkidAttempt: /^[A-Za-z]{1,2}\d{6}.+$/,
    /* U-0399: validity itself comes from the one shared validator (utils.validateHKIDStripped), not a local regex */
    emailAttempt: /@/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
});
export const EMPLOYER_SEARCH_FORMAT_ERROR = Object.freeze({
    hkid: 'Invalid HKID format. Please enter a valid HKID (e.g., Z947984(8)).',
    email: 'Invalid email format. Please ensure you enter a valid email address.',
});
export const EMPLOYER_SEARCH_HELP_TEXT = 'Search by Mobile, WhatsApp, Email, HKID, English Name, Chinese Name or Employer Code.';
/* header sort (listing.js D-SORT-01): ascending → descending → module default; the button announces the next action (en keys, audit P-13) */
export const EMPLOYER_SORT_NEXT = Object.freeze({ asc: 'key_cd_ascending', desc: 'key_cd_descending', clear: 'key_clear_sort' });

/* Other Contact card: the fields its Save validates and posts (audit W88 / P-08); backend 334 validates per card — an
   Other-Contact-only payload names itself with `edit_type` */
export const OTHER_CONTACT_FIELDS = Object.freeze(['contact_telephone_number', 'contact_telephone_ext', 'home_telephone_number']);
export const EMPLOYER_EDIT_TYPE = Object.freeze({ OTHER_CONTACT: 'other_contact' });
/* form keys that belong to no card: the record id and the legacy language field the new UI never posts */
export const EMPLOYER_CARD_META_FIELDS = Object.freeze(['employer_id', 'spoken_language']);

/* @migration-unspecified(employer): no document enumerates employer gender ids; the legacy forms treat a stored 0 as "not set"
   and show it as Male (id 2) — kept as named constants (audit P-27) */
export const EMPLOYER_GENDER_LEGACY_UNSET = 0;
export const EMPLOYER_GENDER_MALE_ID = 2;

