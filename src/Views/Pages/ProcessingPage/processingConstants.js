/* Processing (Contracts) module constants */
/* Contract record address: ?stage=<stage key> selects a Progress stage, ?tab=<record tab> a record tab, ?docs=<folder>
   the Documents view (prototype openDocs); the retired Processing detail used ?tab=<stage> (ProcessingRedirect maps it) */
export const CONTRACT_RECORD_QUERY = Object.freeze({ STAGE: 'stage', TAB: 'tab', DOCS: 'docs' });
export const LEGACY_PROCESSING_QUERY = Object.freeze({ TAB: 'tab' });
/* stage key → the Processing stage tab key (one stage, two spellings in the legacy tabs) */
export const CONTRACT_STAGE_TAB_KEY = Object.freeze({ pre_departure: 'pre-departure' });

/* Contract lifecycle phase ids (contract `status`) */
export const CONTRACT_STATUS = Object.freeze({
    PROCESSING: 1,
    ACTIVE: 2,
    CANCELLED: 3,
    COMPLETED: 4,
});

/* Pick Up statuses that complete Deployment (U-0168: `not_needed` was migrated to `not_required` server-side; no old label in the interface) */
export const PICKUP_TERMINAL_STATUSES = Object.freeze(["helper_picked_up", "not_required"]);
export const PICKUP_NOT_REQUIRED_STATUS = "not_required";
/* backend 281 (U-0370): a Deployment sub-stage (DHL · Flight · HKID · Pick Up) or Medical marked Not Required keeps its values but refuses
   every details save with 409 SUB_STAGE_NOT_REQUIRED — the form locks until the status changes */
export const SUB_STAGE_NOT_REQUIRED_STATUS = "not_required";
export const SUB_STAGE_NOT_REQUIRED_CODE = "SUB_STAGE_NOT_REQUIRED";
export const isSubStageNotRequired = (status) => status === SUB_STAGE_NOT_REQUIRED_STATUS;
/* the file types the Medical report and the Pre-Departure medical file accept (PROCESS §8.1 image evidence) */
export const PROCESSING_MEDICAL_ACCEPT = ".jpg, .jpeg, .png";
/* Contract card metadata (prototype SERVICE_TYPE_VALUES; `contract_type` carries the lowercase value) */
export const CONTRACT_SERVICE_TYPES = Object.freeze(["new", "replacement"]);
export const CONTRACT_SERVICE_TYPE_LABEL_KEYS = Object.freeze({ new: "key_new", replacement: "key_replacement" });
/* Pre-Departure sub-stages (Group 2; prototype PD_SUBS): tab key = the API `type`, field = the preDepartureDocument prefix */
export const PRE_DEPARTURE_SUBS = Object.freeze([
    { key: "medical", field: "medical", labelKey: "key_medical", questionKey: "key_have_you_completed_checkup" },
    { key: "nbi_clearance", field: "nbi_clearance", labelKey: "key_nbi_clearance", questionKey: "key_have_you_completed_nbi_clearance" },
    { key: "phil_health_membership", field: "phil_health_membership", labelKey: "key_philhealth", questionKey: "key_have_you_completed_your_philhealth_membership_registraction" },
    { key: "pag_ibig", field: "pag_ibig", labelKey: "key_pag_ibig", questionKey: "key_have_you_completed_your_pagbig_enrollment" },
    { key: "pdos", field: "pdos", labelKey: "key_pdos", questionKey: "key_have_you_completed_your_predeparture_orientation_seminar" },
    { key: "owwa", field: "owwa", labelKey: "key_owwa", questionKey: "key_have_you_enrolled_in_owwa" },
    { key: "oec", field: "oec", labelKey: "key_oec", questionKey: "key_have_you_secured_your_overseas_employment_certificate" },
]);
/* Deployment sub-stages (prototype DEP_SUBS): key = the API `type`, statusField = the deploymentDocument status column */
export const DEPLOYMENT_SUBS = Object.freeze([
    { key: "dhl_contract", statusField: "dhl_contract_status", labelKey: "key_dhl_contract" },
    { key: "flight_details", statusField: "flight_details_status", labelKey: "key_flight_details" },
    { key: "hkid", statusField: "hkid_status", labelKey: "key_hkid" },
    { key: "medical", statusField: "medical.status", labelKey: "key_medical" },
    { key: "pickup", statusField: "pickup_status", labelKey: "key_pick_up" },
]);
/* Flight Details · Booking Made By (PROCESS.md §6.9 / API ENUM; prototype V28_BOOKED_BY) */
export const FLIGHT_BOOKED_BY = Object.freeze([
    { value: "partner", labelKey: "key_partner" },
    { value: "team", labelKey: "key_team" },
    { value: "employer", labelKey: "key_employer" },
    { value: "worker", labelKey: "key_worker" },
]);
export const HKID_SCHEDULE = Object.freeze({ YES: "y", NO: "n" });
export const HKID_BRING_BACK_OTHER = "other";
/* Immigration checklist (prototype immigrationPanel / v210ImmPanel) */
/* U-0304 Revised (21 Oct package): the storable assessments are applies · does_not_apply · needs_review; an unassessed
   section is the fourth, display-only state (Unknown). Unknown and Needs review both block Ready to Submit. */
export const IMMIGRATION_APPLICABILITY = Object.freeze({ APPLIES: "applies", NOT_APPLIES: "does_not_apply", NEEDS_REVIEW: "needs_review", UNKNOWN: "unknown" });
/* K-18: the application purpose (CT-03 / CROSSWALK §1) — fixed by the category or confirmed by staff from `options[]` */
export const IMMIGRATION_PURPOSE = Object.freeze({ ENTRY: "entry", CHANGE: "change", RENEW: "renew" });
export const IMMIGRATION_PURPOSE_LABEL_KEYS = Object.freeze({ [IMMIGRATION_PURPOSE.ENTRY]: "key_entry_visa", [IMMIGRATION_PURPOSE.CHANGE]: "key_change", [IMMIGRATION_PURPOSE.RENEW]: "key_renew" });
/* The working checklist (admin API `immigration_checklist`, backend 242 / 256 / 260 — contract 22 Oct 2026): every row's
   presence, order, treatment, section and blocking flag come from the server; the frontend only labels and groups them. */
export const IMMIGRATION_TREATMENT = Object.freeze({ SHOW: "show", CONDITIONAL: "conditional", CASE_ONLY: "case_only", OPTIONAL: "optional" });
export const IMMIGRATION_GROUP = Object.freeze({ CONTRACT: "contract", EMPLOYER: "employer", HELPER: "helper", OPTIONAL: "optional" });
export const IMMIGRATION_GROUP_LABEL_KEYS = Object.freeze({
    [IMMIGRATION_GROUP.CONTRACT]: "key_contracts", [IMMIGRATION_GROUP.EMPLOYER]: "key_employer_documents", [IMMIGRATION_GROUP.HELPER]: "key_helper_documents", [IMMIGRATION_GROUP.OPTIONAL]: "key_optional",
});
/* requirement key (DB column stem) → label + the Contracts / Employer / Helper group of a row outside the conditional sections;
   `subKey` = the small print under the name, `pdfKey` = the system form's download key. A key the server adds later falls back to `key_<requirement_key>` and the Helper group. */
export const IMMIGRATION_ROW_REGISTRY = Object.freeze({
    notarized_contract_original: { labelKey: "key_notarized_contracts_original", group: IMMIGRATION_GROUP.CONTRACT },
    contract: { labelKey: "key_1_contract", group: IMMIGRATION_GROUP.CONTRACT },
    employer_id_988b: { label: "ID 988B", group: IMMIGRATION_GROUP.EMPLOYER, pdfKey: "ID988B" },
    employer_hkid_copy: { labelKey: "key_employers_hkid_copy", group: IMMIGRATION_GROUP.EMPLOYER },
    employer_address_proof_copy: { labelKey: "key_address_proof_copy", group: IMMIGRATION_GROUP.EMPLOYER },
    employer_income_proof: { labelKey: "key_income_proof_copy", group: IMMIGRATION_GROUP.EMPLOYER },
    employer_id_407e: { labelKey: "key_id_407e_if_applicable", group: IMMIGRATION_GROUP.EMPLOYER, pdfKey: "ID407E" },
    helper_id_988a: { labelKey: "key_id_988a", group: IMMIGRATION_GROUP.HELPER, pdfKey: "ID988A" },
    helper_passport_main_page_copy: { labelKey: "key_passport_main_page_copy", group: IMMIGRATION_GROUP.HELPER },
    helper_passport_original: { labelKey: "key_helpers_passport_original", group: IMMIGRATION_GROUP.HELPER },
    testimonial_copy: { labelKey: "key_testimonial_copy", group: IMMIGRATION_GROUP.HELPER },
    helper_hkid_copy: { labelKey: "key_helpers_hkid_copy", group: IMMIGRATION_GROUP.HELPER },
    release_letter_from_previous_employer: { labelKey: "key_release_letter_from_previous_er_copy", group: IMMIGRATION_GROUP.HELPER },
    previous_contract_copy: { labelKey: "key_previous_contract_copy", group: IMMIGRATION_GROUP.HELPER },
    id_522_copy: { labelKey: "key_id_522_copy", group: IMMIGRATION_GROUP.HELPER },
    latest_immigration_evidence_copy: { labelKey: "key_latest_immigration_evidence_copy", group: IMMIGRATION_GROUP.HELPER },
    id_934a: { labelKey: "key_id_934a", pdfKey: "ID934A" },
    letter_of_financial_support: { labelKey: "key_letter_of_financial_support" },
    financial_supporter_hkid_copy: { labelKey: "key_financial_supporter_hkid_copy" },
    supporters_income_proof_copy: { labelKey: "key_supporters_income_proof_copy" },
    supporters_marriage_certificate_copy: { labelKey: "key_supporters_marriage_certificate_copy", subKey: "key_only_if_relationship_relied_on" },
    supporters_birth_certificate_copy: { labelKey: "key_supporters_birth_certificate_copy", subKey: "key_only_if_relationship_relied_on" },
    tenancy_agreement: { labelKey: "key_tenancy_agreement" },
    approval_letter_for_housing_dept: { labelKey: "key_approval_letter_for_housing_dept" },
    letter_of_financial_support_company: { labelKey: "key_letter_of_financial_support" },
    financial_supporter_hkid_copy_company: { labelKey: "key_financial_supporter_hkid_copy" },
    supporters_income_proof_copy_company: { labelKey: "key_supporters_income_proof_copy" },
    additional_supporting_letter: { labelKey: "key_additional_supporting_letter", group: IMMIGRATION_GROUP.OPTIONAL },
    speed_up_letter: { labelKey: "key_speed_up_letter", group: IMMIGRATION_GROUP.OPTIONAL, pdfKey: "VISA_SPEED_UP_LETTER_TO_IMMIGRATION" },
});
/* conditional section key (API `section_key`) → heading; the question text comes with `immigration_applicability[section]` */
export const IMMIGRATION_SECTION_LABEL_KEYS = Object.freeze({
    helper_hkid: "key_helpers_hkid_copy", driving_duties: "key_driving_duties", financial_support: "key_financial_support", public_rental: "key_if_living_in_public_rental",
    company_support: "key_if_company_support", renew_employer_proof: "key_renew_employer_proof", helper_passport_inspection: "key_helper_passport_inspection", immigration_evidence: "key_immigration_evidence",
});
/* system forms that download through the non-editable PDF endpoint (every other `key` → editable) */
export const IMMIGRATION_NON_EDITABLE_PDF_KEYS = Object.freeze(["VISA_SPEED_UP_LETTER_TO_IMMIGRATION"]);

/* Prepared / Ready sign-off (CPERM §8, OWNERS.md "Prepared and Ready"; admin API CHANGE_HISTORY 252): the registers, the
   `sign_off.*_blocker` codes of GET /get-processing-details, the HTTP 403 codes of POST /update-processing-full-details */
export const SIGN_OFF_REGISTER = Object.freeze({ PREPARED: "prepared", READY: "ready" });
export const SIGN_OFF_BLOCKER = Object.freeze({ NO_EDIT: "no_edit", UNASSIGNED: "unassigned", NOT_HOLDER: "not_holder" });
export const SIGN_OFF_REFUSAL_CODES = Object.freeze(["NOT_PREPARED_OWNER", "NOT_READY_OWNER", "PREPARED_OWNER_UNASSIGNED", "READY_OWNER_UNASSIGNED"]);
/* one line per blocked register (no copy for `no_edit`: those ticks were silently disabled before and stay so) */
export const SIGN_OFF_HINT_KEYS = Object.freeze({
    prepared: { unassigned: "key_cr_signoff_prepared_unassigned", not_holder: "key_cr_signoff_prepared_not_holder" },
    ready: { unassigned: "key_cr_signoff_ready_unassigned", not_holder: "key_cr_signoff_ready_not_holder" },
});
/* prototype gateNote (contract-details app.js): a blocked status entry's outstanding items are listed in the menu note, six at most, then "… and N more" */
export const STATUS_MENU_BLOCKERS_SHOWN = 6;

/* Deployment sub-stage inputs that save on blur (input id → draft key): a document refresh must not overwrite the one being
   typed in (Mubin 4 Nov: SIM Card Number backspaces undone by the refresh of an earlier save) */
export const DEPLOYMENT_TYPED_FIELDS = Object.freeze({
    dhl_contract: Object.freeze({ "dhl-sim": "sim_card_number" }),
    flight_details: Object.freeze({ "fl-no": "flight_number", "fl-fr": "from_place", "fl-to": "to_place" }),
    hkid: Object.freeze({ "hk-sp": "other_branch" }),
});
