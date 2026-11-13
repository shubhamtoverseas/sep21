import { CR_FX, CR_FX_NEW_KEYS } from "../contractConstants";

/**
 * The canonical Forms model (workbook #62: one model behind Master Form, ID 988A, ID 988B and ID 407).
 * Keys are the server's own names from GET /pdf/form/get-master-details; where the legacy forms spelt one datum
 * several ways the model keeps ONE key and `payloadFor()` writes every spelling each endpoint expects.
 * `ui_*` keys exist only on screen (derived on load, never posted).
 */
const str = (v) => (v === null || v === undefined ? "" : String(v));
const num = (v) => (v === null || v === undefined || v === "" ? "" : String(v));
const stripHkid = (v) => str(v).replace(/[()\s]/g, "").toUpperCase();
const rowsOf = (v) => (Array.isArray(v) ? v : []);
const yearOf = (d) => (/^\d{4}/.test(str(d)) ? str(d).slice(0, 4) : "");
const dateOrNull = (v) => (str(v) ? str(v).slice(0, 10) : null);
const intOrZero = (v) => (Number.isFinite(Number(v)) && str(v) !== "" ? parseInt(v, 10) : 0);
const floatOrZero = (v) => (Number.isFinite(Number(v)) && str(v) !== "" ? parseFloat(v) : 0);

/* the `genders` master table: 1 = Female, 2 = Male (backend C-6); the stored profile code is read as-is */
const gender = (v) => (str(v) === CR_FX.GENDER.MALE || str(v) === CR_FX.GENDER.FEMALE ? str(v) : "");

export const BLANK_WORK = () => ({ id: 0, employer_name: "", employer_address: "", start_date: "", end_date: "", action: "add" });
export const BLANK_MEMBER = () => ({ id: 0, name: "", ui_year: "", relation: "", hk_id: "", action: "add" });
export const BLANK_HELPER = () => ({ id: 0, worker_name: "", hk_id: "", staying_till_date_in_hk: "", employer_name: "", action: "add" });

export const EMPTY_MODEL = Object.freeze({
    /* worker */
    worker_surname: "", worker_name: "", worker_chinese_name: "", worker_maiden_surname: "", worker_alias_name: "", worker_gender: "",
    worker_date_of_birth: "", worker_birth_place: "", worker_marital_status: "", worker_nationality: "", worker_occupation: "",
    ui_worker_has_hk_id: CR_FX.YES_NO.NO, worker_hk_id: "", worker_travel_document_type: "", worker_passport_number: "",
    worker_passport_place_of_issue: "", worker_passport_issue_date: "", worker_passport_expiry_date: "",
    ui_worker_present_address: "", ui_worker_domicile_address: "", worker_addresses: [],
    worker_contact_telephone_number: "", worker_contact_telephone_ext: "", worker_fax_number: "", worker_contact_email: "",
    worker_current_employer_name: "", worker_current_employer_address_line_1: "", worker_employers: [],
    worker_work_experience: "", worker_work_experience_in_months: "",
    /* employer */
    employer_surname: "", employer_name: "", employer_chinese_name: "", employer_maiden_surname: "", employer_gender: "", employer_birth_date: "",
    employer_hk_id: "", employer_nationality: "", employer_occupation: "", employer_travel_document_type: "", employer_travel_document_number: "",
    employer_residential_address: "", employer_correspondence_address: "", employer_day_time_contact_telephone_number: "",
    employer_contact_telephone_ext: "", employer_home_telephone_number: "", employer_fax_number: "", employer_contact_email: "",
    employer_monthly_household_check: CR_FX.YES_NO.YES, employer_monthly_household: "", employer_bedroom_no: "", separate_servant_room: "",
    employer_family: [], employer_workers: [],
    /* placement / application */
    /* K-18: the application type is Immigration's (`ui_app_type`); unresolved stays blank — it never defaults */
    entry_visa: "", ui_app_type: null, worker_purpose_of_application: "", employment_of_the_helper: CR_FX.EMPLOYMENT.FIRST, name_of_helper_being_replaced: "",
    hk_id_of_helper_being_replaced: "", contract_termination_date: "", helper_application_reference_no: "", relationship_with_helper: "",
    /* contract and accommodation */
    contract_number: "", worker_contract_date: "", worker_origin_place: "", contract_commencement_basis: CR_FX.BASIS.A, contract_commencing_date: "",
    previous_contract_number: "", wage: "", ui_food_arrangement: CR_FX.FOOD.PROVIDED, food_allowence: "", other_fees: "",
    employer_house_size: "", ui_house_size_unit: CR_FX.UNIT.SQFT, employer_adult_count: "", employer_child_age_5_8_count: "",
    employer_child_age_below_5_count: "", employer_expecting_baby_count: "", employer_special_needs_count: "", employer_no_of_helpers_to_serve_houseold: "",
    servant_room_size: "", ui_servant_room_unit: CR_FX.UNIT.SQFT, sleeping_arrangement: "", employer_share_room_with_no_of_child: "",
    employer_share_room_with_child_age: "", employer_separate_partitionate_area_size: "", ui_partition_unit: CR_FX.UNIT.SQFT,
    employer_other_servant_room_details: "",
    light_and_water_supply: "", toilet_and_bathing_facilities: "", bed: "", blankets_or_quilt: "", pillows: "", wardrobe: "", refrigerator: "", desk: "",
    other_facilities_please_specify: "", aged_care_required: CR_FX.AGED_CARE.REQUIRED, other_duties: "", employer_witness: "", worker_witness: "",
    /* ID 988A only */
    worker_current_status_in_hongkong: "", worker_current_status_other_text: "", worker_permit_date_in_hong_kong: "", worker_purpose_of_application_date: "",
    worker_change_name_option: CR_FX.YES_NO.NO, worker_change_name: "", worker_refused_visa: CR_FX.YN.NO, worker_refused_visa_details: "",
    convicted_of_any_crime: CR_FX.YN.NO, convicted_of_any_crime_details: "", worker_undertaking_live_in: CR_FX.YES_NO.YES,
    /* ID 988B only */
    mututaly_agreed_defer_leave_reason: "",
});

/* one address list → the first present (type 1) and the first domicile (type 2) texts */
const addressRows = (data) => {
    const rows = [];
    const push = (src, type, def) => {
        if (Array.isArray(src)) src.forEach((e) => rows.push({ ...e, type }));
        else if (typeof src === "string" && src.trim()) rows.push({ id: 0, address: src, type, default: def });
    };
    push(data?.worker_present_address, 1, 1); push(data?.worker_domicile_address, 2, 0);
    return rows;
};

export const modelFromServer = (data) => {
    const md = data?.master_form_details || {};
    const worker = data?.worker || {};
    const employer = data?.employer && typeof data.employer === "object" && !data.employer.error ? data.employer : {};
    const addresses = addressRows(data);
    const present = addresses.find((a) => Number(a.type) === 1);
    const domicile = addresses.find((a) => Number(a.type) === 2);
    const allowance = floatOrZero(md.food_allowence);
    const servantRoom = str(employer.separate_servant_room ?? md.separate_servant_room ?? employer.sleeping_arrangement_of_helper);
    /* K-18: pdf get-master-details → application_type { derived: a | b | null, purpose, resolved, fixed, options, entry_visa, source } */
    const at = data?.application_type && typeof data.application_type === "object" ? data.application_type : null;
    return {
        ...EMPTY_MODEL,
        worker_surname: str(worker.surname), worker_name: str(worker.name), worker_chinese_name: str(worker.chinese_name), worker_maiden_surname: str(worker.maiden_surname),
        worker_alias_name: str(worker.alias_name), worker_gender: gender(worker.gender), worker_date_of_birth: str(worker.date_of_birth), worker_birth_place: str(worker.birth_place),
        worker_marital_status: str(worker.marital_status), worker_nationality: str(worker.nationality), worker_occupation: str(worker.occupation),
        ui_worker_has_hk_id: str(worker.hk_id) ? CR_FX.YES_NO.YES : CR_FX.YES_NO.NO, worker_hk_id: str(worker.hk_id),
        worker_travel_document_type: str(worker.travel_document_type ?? md.worker_travel_document_type),
        worker_passport_number: str(worker.passport_number), worker_passport_place_of_issue: str(worker.passport_place_of_issue),
        worker_passport_issue_date: str(worker.passport_issue_date), worker_passport_expiry_date: str(worker.passport_expiry_date),
        ui_worker_present_address: str(present?.address), ui_worker_domicile_address: str(domicile?.address), worker_addresses: addresses,
        worker_contact_telephone_number: str(worker.contact_telephone_number ?? worker.helper_contact_telephone_number), worker_contact_telephone_ext: str(worker.contact_telephone_ext),
        worker_fax_number: str(worker.fax_number), worker_contact_email: str(worker.contact_email),
        worker_current_employer_name: str(worker.current_employer_name), worker_current_employer_address_line_1: str(worker.current_employer_address_line_1),
        worker_employers: rowsOf(data?.worker_employers).map((r) => ({ ...r, start_date: str(r.start_date), end_date: str(r.end_date) })),
        worker_work_experience: num(worker.work_experience), worker_work_experience_in_months: num(worker.work_experience_in_months),
        employer_surname: str(employer.surname), employer_name: str(employer.name), employer_chinese_name: str(employer.chinese_name), employer_maiden_surname: str(employer.maiden_surname),
        employer_gender: gender(employer.gender), employer_birth_date: str(employer.birth_date), employer_hk_id: str(employer.hk_id), employer_nationality: str(employer.nationality),
        employer_occupation: str(employer.occupation), employer_travel_document_type: str(employer.travel_document_type), employer_travel_document_number: str(employer.travel_document_number),
        employer_residential_address: str(data?.employer_residential_address ?? employer.residential_address), employer_correspondence_address: str(data?.employer_correspondence_address ?? employer.correspondence_address),
        employer_day_time_contact_telephone_number: str(employer.contact_telephone_number ?? employer.day_time_contact_telephone_number),
        employer_contact_telephone_ext: str(employer.contact_telephone_ext), employer_home_telephone_number: str(employer.home_telephone_number),
        employer_fax_number: str(employer.fax_number), employer_contact_email: str(employer.contact_email),
        employer_monthly_household_check: str(md.monthly_household_check) === CR_FX.YES_NO.NO ? CR_FX.YES_NO.NO : CR_FX.YES_NO.YES,
        employer_monthly_household: num(employer.monthly_household ?? md.monthly_household), employer_bedroom_no: num(employer.bedroom_no ?? md.bedroom_no),
        separate_servant_room: servantRoom === CR_FX.YN.YES || servantRoom === CR_FX.YN.NO ? servantRoom : "",
        employer_family: rowsOf(data?.employer_family).map((r) => ({ ...r, ui_year: yearOf(r.dob), relation: str(r.relation ?? r.relationship) })),
        employer_workers: rowsOf(data?.employer_workers).map((r) => ({ ...r, staying_till_date_in_hk: str(r.staying_till_date_in_hk) })),
        entry_visa: at?.resolved ? (str(at.entry_visa) || str(md.entry_visa)) : str(md.entry_visa),
        ui_app_type: at ? { derived: at.derived ?? null, resolved: Boolean(at.resolved), fixed: Boolean(at.fixed), purpose: at.purpose ?? null, options: Array.isArray(at.options) ? at.options : [] } : null,
        worker_purpose_of_application: str(md.worker_purpose_of_application),
        employment_of_the_helper: str(md.employment_of_the_helper) || CR_FX.EMPLOYMENT.FIRST,
        name_of_helper_being_replaced: str(md.name_of_helper_being_replaced), hk_id_of_helper_being_replaced: str(md.hk_id_of_helper_being_replaced),
        contract_termination_date: str(md.contract_termination_date), helper_application_reference_no: str(md.helper_application_reference_no), relationship_with_helper: str(md.relationship_with_helper),
        contract_number: str(md.contract_number), worker_contract_date: str(md.worker_contract_date || md.employer_contract_date || md.contract_creation_date),
        worker_origin_place: str(worker.origin_place), contract_commencement_basis: str(md.contract_commencement_basis) || (str(md.contract_commencing_date) ? CR_FX.BASIS.B : CR_FX.BASIS.A),
        contract_commencing_date: str(md.contract_commencing_date), previous_contract_number: str(md.previous_contract_number),
        wage: num(md.wage), ui_food_arrangement: allowance > 0 ? CR_FX.FOOD.ALLOWANCE : CR_FX.FOOD.PROVIDED, food_allowence: allowance > 0 ? num(md.food_allowence) : "", other_fees: str(md.other_fees ?? ""),
        employer_house_size: num(employer.house_size), employer_adult_count: num(employer.adult_count), employer_child_age_5_8_count: num(employer.child_age_5_8_count),
        employer_child_age_below_5_count: num(employer.child_age_below_5_count), employer_expecting_baby_count: num(employer.expecting_baby_count),
        employer_special_needs_count: num(employer.special_needs_count), employer_no_of_helpers_to_serve_houseold: num(employer.no_of_helpers_to_serve_houseold),
        servant_room_size: num(employer.servant_room_size || employer.estimated_size_of_the_servant_room), sleeping_arrangement: str(md.sleeping_arrangement ?? employer.sleeping_arrangement),
        employer_share_room_with_no_of_child: num(employer.share_room_with_no_of_child), employer_share_room_with_child_age: str(employer.share_room_with_child_age ?? md.share_room_with_child_age),
        employer_separate_partitionate_area_size: num(employer.separate_partitionate_area_size), employer_other_servant_room_details: str(md.other_servant_room_details),
        light_and_water_supply: num(md.light_and_water_supply), toilet_and_bathing_facilities: num(md.toilet_and_bathing_facilities), bed: num(md.bed), blankets_or_quilt: num(md.blankets_or_quilt),
        pillows: num(md.pillows), wardrobe: num(md.wardrobe), refrigerator: num(md.refrigerator), desk: num(md.desk),
        other_facilities_please_specify: str(md.other_facilities_please_specify), aged_care_required: str(md.aged_care_required) || CR_FX.AGED_CARE.REQUIRED,
        other_duties: str(md.other_duties), employer_witness: str(md.employer_witness), worker_witness: str(md.worker_witness),
        worker_current_status_in_hongkong: str(md.worker_current_status_in_hongkong), worker_current_status_other_text: str(md.worker_current_status_other_text),
        worker_permit_date_in_hong_kong: str(md.worker_permit_date_in_hong_kong), worker_purpose_of_application_date: str(md.worker_purpose_of_application_date),
        worker_change_name_option: str(worker.change_name) ? CR_FX.YES_NO.YES : CR_FX.YES_NO.NO, worker_change_name: str(worker.change_name),
        worker_refused_visa: str(md.worker_refused_visa) === CR_FX.YN.YES ? CR_FX.YN.YES : CR_FX.YN.NO, worker_refused_visa_details: str(md.worker_refused_visa_details),
        convicted_of_any_crime: str(md.convicted_of_any_crime) === CR_FX.YN.YES ? CR_FX.YN.YES : CR_FX.YN.NO, convicted_of_any_crime_details: str(md.convicted_of_any_crime_details),
        worker_undertaking_live_in: str(md.worker_undertaking_live_in) === CR_FX.YES_NO.NO ? CR_FX.YES_NO.NO : CR_FX.YES_NO.YES,
        mututaly_agreed_defer_leave_reason: str(md.mututaly_agreed_defer_leave_reason),
    };
};

/* derived facts the legacy endpoints keep as their own columns */
export const workerFullName = (m) => [m.worker_name, m.worker_surname].filter(Boolean).join(" ");
export const employerFullName = (m) => [m.employer_name, m.employer_surname].filter(Boolean).join(" ");
/* K-18: with the Immigration-owned type the home-leave radio is the one editable purpose (a (b) application only); the legacy
   derivation stays for a pdf API that does not send application_type yet */
const purposeOf = (m) => (m.ui_app_type ? (m.ui_app_type.derived === "b" ? m.worker_purpose_of_application || null : null) : (m.entry_visa === CR_FX.ENTRY_VISA.EXTEND ? CR_FX.PURPOSE.COMPLETE : CR_FX.PURPOSE.DEFER));
/* K-18: `entry_visa` is written by the server from the derived type once resolved — the client sends it only while unresolved */
const entryVisaOut = (m) => (m.ui_app_type?.resolved ? {} : { entry_visa: m.entry_visa || null });
const leavingOf = (m) => (m.entry_visa === CR_FX.ENTRY_VISA.RENEW_DEFER ? CR_FX.LEAVING.DEFER : m.entry_visa === CR_FX.ENTRY_VISA.RENEW_LEAVE ? CR_FX.LEAVING.BEFORE : "");
const rowAction = (r) => (r.id ? "edit" : "add");

/* the worker address list the server stores: the first present / domicile rows carry the screen text, the rest ride along */
const addressesOut = (m) => {
    const out = []; let present = false; let domicile = false;
    m.worker_addresses.forEach((a) => {
        const type = Number(a.type);
        if (type === 1 && !present) { present = true; out.push({ ...a, address: m.ui_worker_present_address, type: 1, default: 1 }); }
        else if (type === 2 && !domicile) { domicile = true; out.push({ ...a, address: m.ui_worker_domicile_address, type: 2, default: a.default ?? 0 }); }
        else out.push(a);
    });
    if (!present) out.unshift({ id: 0, address: m.ui_worker_present_address, type: 1, default: 1, action: "add" });
    if (!domicile && m.ui_worker_domicile_address) out.push({ id: 0, address: m.ui_worker_domicile_address, type: 2, default: 0, action: "add" });
    return out.filter((a) => a.id || str(a.address));
};
const workRows = (m) => m.worker_employers.map((r) => ({ ...r, start_date: dateOrNull(r.start_date), end_date: dateOrNull(r.end_date), action: rowAction(r) }));
const memberRows = (m, relationKey) => m.employer_family.map(({ ui_year, relation, relationship, ...r }) => ({
    ...r, dob: /^\d{4}$/.test(str(ui_year)) ? `${ ui_year }-01-01` : dateOrNull(r.dob), [relationKey]: str(relation ?? relationship), action: rowAction(r),
}));
const helperRows = (m) => m.employer_workers.map((r) => ({ ...r, staying_till_date_in_hk: dateOrNull(r.staying_till_date_in_hk), action: rowAction(r) }));
const facilities = (m) => ({
    light_and_water_supply: m.light_and_water_supply, toilet_and_bathing_facilities: m.toilet_and_bathing_facilities, bed: m.bed, blankets_or_quilt: m.blankets_or_quilt,
    pillows: m.pillows, wardrobe: m.wardrobe, refrigerator: m.refrigerator, desk: m.desk, other_facilities_please_specify: m.other_facilities_please_specify,
});
const newKeys = (m) => Object.fromEntries(CR_FX_NEW_KEYS.map((k) => [k, m[k]]));
const foodAllowance = (m) => (m.ui_food_arrangement === CR_FX.FOOD.ALLOWANCE ? floatOrZero(m.food_allowence) : 0);

/** POST /pdf/form/master-update — every fact the Master Form owns, in the master endpoint's spellings. */
export const masterPayload = (m, contractId) => ({
    contract_id: String(contractId),
    worker_surname: m.worker_surname, worker_name: m.worker_name, worker_chinese_name: m.worker_chinese_name, worker_maiden_surname: m.worker_maiden_surname,
    worker_alias_name: m.worker_alias_name, worker_gender: m.worker_gender, worker_date_of_birth: dateOrNull(m.worker_date_of_birth), worker_birth_place: m.worker_birth_place,
    worker_origin_place: m.worker_origin_place, worker_marital_status: m.worker_marital_status, worker_nationality: m.worker_nationality, worker_occupation: m.worker_occupation,
    worker_hk_id: m.ui_worker_has_hk_id === CR_FX.YES_NO.YES ? stripHkid(m.worker_hk_id) : "",
    worker_passport_number: m.worker_passport_number, worker_passport_place_of_issue: m.worker_passport_place_of_issue,
    worker_passport_issue_date: dateOrNull(m.worker_passport_issue_date), worker_passport_expiry_date: dateOrNull(m.worker_passport_expiry_date),
    worker_addresses: addressesOut(m),
    worker_contact_telephone_number: m.worker_contact_telephone_number, worker_contact_telephone_ext: m.worker_contact_telephone_ext, worker_fax_number: m.worker_fax_number, worker_contact_email: m.worker_contact_email,
    worker_current_employer_name: m.worker_current_employer_name, worker_current_employer_address_line_1: m.worker_current_employer_address_line_1,
    worker_employers: workRows(m), worker_work_experience: intOrZero(m.worker_work_experience), worker_work_experience_in_months: intOrZero(m.worker_work_experience_in_months),
    worker_current_status_in_hongkong: m.worker_current_status_in_hongkong, worker_current_status_other_text: m.worker_current_status_other_text,
    worker_permit_date_in_hong_kong: dateOrNull(m.worker_permit_date_in_hong_kong), worker_purpose_of_application: purposeOf(m), worker_purpose_of_application_date: dateOrNull(m.worker_purpose_of_application_date),
    worker_refused_visa: m.worker_refused_visa, worker_refused_visa_details: m.worker_refused_visa_details, convicted_of_any_crime: m.convicted_of_any_crime, convicted_of_any_crime_details: m.convicted_of_any_crime_details,
    employer_name: m.employer_name, employer_surname: m.employer_surname, employer_maiden_surname: m.employer_maiden_surname, employer_chinese_name: m.employer_chinese_name, employer_gender: m.employer_gender,
    employer_birth_date: dateOrNull(m.employer_birth_date), employer_hk_id: stripHkid(m.employer_hk_id), employer_nationality: m.employer_nationality, employer_occupation: m.employer_occupation,
    employer_travel_document_type: m.employer_travel_document_type, employer_travel_document_number: m.employer_travel_document_number,
    employer_residential_address: m.employer_residential_address, employer_correspondence_address: m.employer_correspondence_address,
    employer_home_telephone_number: m.employer_home_telephone_number, employer_fax_number: m.employer_fax_number, employer_day_time_contact_telephone_number: m.employer_day_time_contact_telephone_number,
    employer_contact_telephone_ext: m.employer_contact_telephone_ext, employer_contact_email: m.employer_contact_email,
    employer_bedroom_no: intOrZero(m.employer_bedroom_no), employer_monthly_household: m.employer_monthly_household_check === CR_FX.YES_NO.YES ? floatOrZero(m.employer_monthly_household) : 0,
    monthly_household_check: m.employer_monthly_household_check,
    employer_adult_count: intOrZero(m.employer_adult_count), employer_child_age_5_8_count: intOrZero(m.employer_child_age_5_8_count), employer_child_age_below_5_count: intOrZero(m.employer_child_age_below_5_count),
    employer_expecting_baby_count: intOrZero(m.employer_expecting_baby_count), employer_special_needs_count: intOrZero(m.employer_special_needs_count),
    employer_no_of_helpers_to_serve_houseold: intOrZero(m.employer_no_of_helpers_to_serve_houseold),
    employer_family: memberRows(m, "relation"), employer_workers: helperRows(m),
    contract_number: m.contract_number, worker_contract_date: dateOrNull(m.worker_contract_date), employer_contract_date: dateOrNull(m.worker_contract_date),
    employer_witness: m.employer_witness, worker_witness: m.worker_witness, wage: floatOrZero(m.wage), food_allowence: foodAllowance(m), other_fees: m.other_fees, employer_house_size: intOrZero(m.employer_house_size),
    servant_room_size: m.separate_servant_room === CR_FX.YN.YES ? intOrZero(m.servant_room_size) : 0, separate_servant_room: m.separate_servant_room, independent_room: m.separate_servant_room,
    estimated_size_of_the_servant_room: m.separate_servant_room === CR_FX.YN.YES ? num(m.servant_room_size) : "",
    sleeping_arrangement: m.separate_servant_room === CR_FX.YN.NO ? m.sleeping_arrangement : "",
    number_of_children: intOrZero(m.employer_share_room_with_no_of_child), share_room_with_child_age: m.employer_share_room_with_child_age, size_of_room: num(m.employer_separate_partitionate_area_size),
    others_description: m.employer_other_servant_room_details,
    ...facilities(m), toilet_and_bath_facilities: m.toilet_and_bathing_facilities,
    relationship_with_helper: m.relationship_with_helper, helper_application_reference_no: m.helper_application_reference_no, employment_of_the_helper: m.employment_of_the_helper,
    name_of_helper_being_replaced: m.name_of_helper_being_replaced, hk_id_of_helper_being_replaced: stripHkid(m.hk_id_of_helper_being_replaced), contract_termination_date: dateOrNull(m.contract_termination_date),
    ...entryVisaOut(m), contract_commencing_date: dateOrNull(m.contract_commencing_date), other_duties: m.other_duties, mututaly_agreed_defer_leave_reason: m.mututaly_agreed_defer_leave_reason,
    ...newKeys(m),
});

/** POST /pdf/form/407-update — the Employment Contract + Schedule facts in the 407 endpoint's spellings. */
export const id407Payload = (m, contractId) => ({
    contract_id: Number(contractId),
    employer_name: employerFullName(m), worker_name: workerFullName(m), contract_creation_date: dateOrNull(m.worker_contract_date), worker_origin_place: m.worker_origin_place,
    contract_commencing_date: m.contract_commencement_basis === CR_FX.BASIS.B ? dateOrNull(m.contract_commencing_date) : null, contract_number: m.contract_number,
    employer_residential_address: m.employer_residential_address, wage: floatOrZero(m.wage), food_allowence: foodAllowance(m),
    employer_house_size: intOrZero(m.employer_house_size), employer_adult_count: intOrZero(m.employer_adult_count), employer_child_age_5_8_count: intOrZero(m.employer_child_age_5_8_count),
    employer_child_age_below_5_count: intOrZero(m.employer_child_age_below_5_count), employer_expecting_baby_count: intOrZero(m.employer_expecting_baby_count),
    special_needs_count: intOrZero(m.employer_special_needs_count), employer_no_of_helpers_to_serve_houseold: intOrZero(m.employer_no_of_helpers_to_serve_houseold),
    employer_sleeping_arrangement_of_helper: m.separate_servant_room, employer_estimated_size_of_the_servant_room: m.separate_servant_room === CR_FX.YN.YES ? num(m.servant_room_size) : "",
    sleeping_arrangement: m.separate_servant_room === CR_FX.YN.NO ? m.sleeping_arrangement : "",
    employer_share_room_with_no_of_child: num(m.employer_share_room_with_no_of_child), employer_share_room_with_child_age: m.employer_share_room_with_child_age,
    employer_separate_partitionate_area_size: num(m.employer_separate_partitionate_area_size), employer_other_servant_room_details: m.employer_other_servant_room_details,
    ...facilities(m), employer_witness: m.employer_witness, worker_witness: m.worker_witness, other_duties: m.other_duties, other_fees: m.other_fees,
    ...newKeys(m),
});

/** POST /pdf/form/988a-update — the helper's application in the 988A endpoint's spellings. */
export const id988aPayload = (m, contractId) => ({
    contract_id: Number(contractId), ...entryVisaOut(m),
    worker_surname: m.worker_surname, worker_name: m.worker_name, worker_maiden_surname: m.worker_maiden_surname, worker_chinese_name: m.worker_chinese_name, worker_alias_name: m.worker_alias_name,
    worker_gender: m.worker_gender, worker_date_of_birth: dateOrNull(m.worker_date_of_birth), worker_birth_place: m.worker_birth_place, worker_marital_status: m.worker_marital_status,
    worker_hk_id: m.ui_worker_has_hk_id === CR_FX.YES_NO.YES ? stripHkid(m.worker_hk_id) : "", worker_nationality: m.worker_nationality, worker_occupation: m.worker_occupation,
    worker_passport_number: m.worker_passport_number, worker_passport_place_of_issue: m.worker_passport_place_of_issue,
    worker_passport_issue_date: dateOrNull(m.worker_passport_issue_date), worker_passport_expiry_date: dateOrNull(m.worker_passport_expiry_date),
    worker_addresses: addressesOut(m), worker_contact_telephone_number: m.worker_contact_telephone_number, worker_contact_telephone_ext: m.worker_contact_telephone_ext,
    worker_fax_number: m.worker_fax_number, worker_contact_email: m.worker_contact_email,
    worker_current_employer_name: m.worker_current_employer_name, worker_current_employer_address_line_1: m.worker_current_employer_address_line_1,
    worker_employers: workRows(m), worker_work_experience: intOrZero(m.worker_work_experience), worker_work_experience_in_months: intOrZero(m.worker_work_experience_in_months),
    worker_current_status_in_hongkong: m.worker_current_status_in_hongkong, worker_current_status_other_text: m.worker_current_status_other_text,
    worker_permit_date_in_hong_kong: dateOrNull(m.worker_permit_date_in_hong_kong), worker_purpose_of_application: purposeOf(m), worker_purpose_of_application_date: dateOrNull(m.worker_purpose_of_application_date),
    worker_change_name_option: m.worker_change_name_option, worker_change_name: m.worker_change_name_option === CR_FX.YES_NO.YES ? m.worker_change_name : "",
    worker_refused_visa: m.worker_refused_visa, worker_refused_visa_details: m.worker_refused_visa === CR_FX.YN.YES ? m.worker_refused_visa_details : "",
    convicted_of_any_crime: m.convicted_of_any_crime, convicted_of_any_crime_details: m.convicted_of_any_crime === CR_FX.YN.YES ? m.convicted_of_any_crime_details : "",
    other_duties: m.other_duties, contract_number: m.contract_number,
    ...newKeys(m),
});

/** POST /pdf/form/988b-update — the employer's application in the 988B endpoint's spellings. */
export const id988bPayload = (m, contractId) => ({
    contract_id: String(contractId),
    employer_chinese_name: m.employer_chinese_name, employer_surname: m.employer_surname, employer_name: m.employer_name, employer_gender: m.employer_gender ? Number(m.employer_gender) : null,
    employer_birth_date: dateOrNull(m.employer_birth_date), employer_hk_id_check: m.employer_hk_id ? "Yes" : "No", employer_hk_id: stripHkid(m.employer_hk_id),
    employer_nationality: m.employer_nationality, employer_occupation: m.employer_occupation, employer_travel_document_type: m.employer_travel_document_type, employer_travel_document_number: m.employer_travel_document_number,
    employer_default_residential_address: m.employer_residential_address, employer_default_correspondence_address: m.employer_correspondence_address,
    employer_day_time_contact_telephone_number: m.employer_day_time_contact_telephone_number, employer_contact_telephone_ext: m.employer_contact_telephone_ext,
    employer_fax_number: m.employer_fax_number, employer_home_telephone_number: m.employer_home_telephone_number, employer_contact_email: m.employer_contact_email,
    worker_name: workerFullName(m), helper_application_reference_no: m.helper_application_reference_no, relationship_with_helper: m.relationship_with_helper,
    employment_of_the_helper: m.employment_of_the_helper, name_of_helper_being_replaced: m.name_of_helper_being_replaced,
    hk_id_of_helper_being_replaced: stripHkid(m.hk_id_of_helper_being_replaced), contract_termination_date: dateOrNull(m.contract_termination_date),
    helper_leaving_terms: leavingOf(m), mututaly_agreed_defer_leave_reason: leavingOf(m) === CR_FX.LEAVING.DEFER ? m.mututaly_agreed_defer_leave_reason : "",
    employer_monthly_household_check: m.employer_monthly_household_check, employer_monthly_household: m.employer_monthly_household_check === CR_FX.YES_NO.YES ? floatOrZero(m.employer_monthly_household) : 0,
    employer_bedroom_no: intOrZero(m.employer_bedroom_no), employer_separate_servant_room: m.separate_servant_room,
    family_members: memberRows(m, "relationship"), current_helpers: helperRows(m), worker_origin_place: m.worker_origin_place, contract_number: m.contract_number,
    ...newKeys(m),
});

export const PAYLOAD_BY_FORM = Object.freeze({ "407": id407Payload, "988A": id988aPayload, "988B": id988bPayload });
export { stripHkid };
