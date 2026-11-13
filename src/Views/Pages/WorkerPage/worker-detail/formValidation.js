import * as yup from 'yup';
import translation from '../../../../utils/translation';
import { BIODATA_EXPERIENCE_YEARS, BIODATA_WEIGHT_RANGE } from '../workerModuleConstants';

/*
 * Biodata (WORKER.md §3; conflict sheet U-0206): an incomplete draft Save is allowed —
 * completeness is the section roll-up, not a save blocker. Only validity rules live here:
 * formats, ranges and the value lists.
 */
const isBlank = (originalValue) => originalValue === '' || originalValue === null || originalValue === undefined;
const blankToNull = (value, originalValue) => (isBlank(originalValue) ? null : value);
const optionalNumber = (typeErrorKey) => yup.number().transform(blankToNull).nullable().notRequired().typeError(translation(typeErrorKey));
const optionalDate = (typeErrorKey) => yup.date().transform(blankToNull).nullable().notRequired().typeError(translation(typeErrorKey));
const optionalList = () => yup.array().nullable().notRequired();
/* 0 … N or "N+" (Family Background selects) */
const optionalCount = (typeErrorKey) => yup.mixed().nullable().notRequired().test(
  'count',
  translation(typeErrorKey),
  (value) => isBlank(value) || /^\d+\+?$/.test(String(value))
);
/* U-0206: the list is 2 … 20+; a stored 1 is preserved */
const experienceYears = yup.mixed().nullable().notRequired().test(
  'experience-years',
  translation('key_this_field_is_required'),
  (value) => {
    if (isBlank(value) || value === BIODATA_EXPERIENCE_YEARS.plus) return true;
    const n = Number(value);
    return Number.isInteger(n) && (n === BIODATA_EXPERIENCE_YEARS.legacyMin || (n >= BIODATA_EXPERIENCE_YEARS.min && n <= BIODATA_EXPERIENCE_YEARS.max));
  }
);
const validDateOrBlank = yup.mixed().nullable().notRequired().test(
  'is-valid-date-or-null',
  translation('key_please_enter_a_valid_date'),
  (value) => !value || !isNaN(new Date(value).getTime())
);

const biodataValidityRules = {
  current_location: yup.string().nullable().notRequired(),
  role: yup.string().nullable().notRequired(),
  work_experience: experienceYears,
  nationality: yup.string().nullable().notRequired(),
  religion: yup.string().nullable().notRequired(),
  height: yup.string().nullable().notRequired(),
  marital_status: yup.string().nullable().notRequired(),
  children_count: optionalCount('key_children_count_must_be_a_number'),
  siblings_count: optionalCount('key_siblings_count_must_be_a_number'),
  spoken_language: optionalList(),
  education: yup.string().nullable().notRequired(),
  college_name: yup.string().trim().transform(blankToNull).nullable().notRequired(),
  interview_day: optionalList(),
  share_work: optionalNumber('key_share_work_is_required'),
  share_room: optionalNumber('key_share_room_is_required'),
  reference_letter: optionalNumber('key_reference_letter_is_required'),
  care_disability: optionalNumber('key_care_disability_is_required'),
  care_elderly: optionalNumber('key_this_field_is_required'),
  skills: optionalList(),
  day_off: optionalList(),
  /* the form seeds an unset weight as 0 — that is "not given", not a value to range-check */
  weight: optionalNumber('key_weight_must_be_a_number')
    .transform((value, originalValue) => (Number(originalValue) === 0 ? null : value))
    .min(BIODATA_WEIGHT_RANGE.min, translation('key_weight_must_be_non_negative'))
    .max(BIODATA_WEIGHT_RANGE.max, translation('key_weight_must_be_less_than_150')),
  date_of_birth: optionalDate('key_date_of_birth_must_be_a_valid_date'),
  gender: yup.string().nullable().notRequired(),
};

export const validateAddBioWorker = yup.object().shape({
  ...biodataValidityRules,
  visa_expiry_date: validDateOrBlank,
  preferred_interview_locations: optionalList(),
});

export const validateAddBioOverseasWorker = yup.object().shape(biodataValidityRules);

export const validateSaveBasicProfile = yup.object().shape({
  surname: yup.string().required(translation('key_surname_is_required')),
  name: yup.string().required(translation('key_this_field_is_required')),
  chinese_name: yup.string().notRequired(),
  maiden_surname: yup.string().notRequired(),
  alias_name: yup.string().notRequired(),
  hk_id: yup.string().notRequired(),
  marital_status: yup.string().required(translation('key_marital_status_is_required')),
  nationality: yup.string().required(translation('key_nationality_is_required')),
  date_of_birth: yup
    .date()
    .typeError(translation('key_date_of_birth_must_be_a_valid_date'))
    .max(new Date(), translation('key_date_of_birth_cannot_be_in_the_future'))
    .required(translation('key_date_of_birth_is_required')),
  birth_place: yup.string().notRequired(),
  origin_place: yup.string().notRequired(),
  occupation: yup.string().notRequired(),
  primary_present_address: yup.string().notRequired(),
  primary_domicile_address: yup.string().notRequired(),
  current_employer_name: yup.string().notRequired(),
  current_employer_address_line_1: yup.string().notRequired()
});

export const validateSaveBasicConsulate = yup.object().shape({
  sss_number: yup.string().required(translation('key_sss_no_is_required')),
  phill_health_number: yup.string().required(translation('key_philhealth_no_is_required')),
  pag_ibig_number: yup.string().required(translation('key_pag_ibig_no_is_required')),
  beneficiary_name: yup.string().required(translation('key_beneficiary_name_is_required')),
  beneficiary_contact: yup.string().required(translation('key_beneficiary_contact_is_required')),
  beneficiary_address: yup.string().required(translation('key_beneficiary_address_is_required')),
  relationship_with_worker: yup.string().required(translation('key_relationship_to_worker_is_required')),
});

export const validateSaveBasicConsulateIndo = yup.object().shape({
  ktp: yup.string().required(translation('key_ktp_is_required')),
  nama_suami: yup.string().required(translation('key_nama_suami_is_required')),
  nama_ayah: yup.string().required(translation('key_nama_ayah_is_required')),
  nama_ibu: yup.string().required(translation('key_nama_ibu_is_required')),
});

export const validateWorkerUploadPassport = yup.object().shape({
  passport_number: yup.string().required(translation('key_passport_no_is_required')),
  passport_place_of_issue: yup.string().required(translation('key_place_of_issue_is_required')),
  passport_issue_date: yup
    .date()
    .typeError(translation('key_passport_issue_date_must_be_a_valid_date'))
    .required(translation('key_passport_issue_date_is_required')),
  passport_expiry_date: yup
    .date()
    .typeError(translation('key_passport_expiry_date_must_be_a_valid_date'))
    .required(translation('key_passport_expiry_date_is_required')),
});

