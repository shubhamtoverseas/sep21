import * as yup from "yup";
import dayjs from "dayjs";
import { MACAU_LOCATION_ID } from "../../../../../components/ReusableComponents/constants";
import {
    JO_AGE, JO_CONSIDER_DEFAULT, JO_EDITOR_COPY, JO_HOUSE_SIZE_MAX_DIGITS, JO_LEGACY_CARE_TYPE, JO_MAIN_DUTIES_MAX, JO_NO_PREFERENCE_ID,
    JO_NOTES_MAX, JO_NULL_CHOICE, JO_PET_PLUS, JO_SALARY, JO_SAVE_ACTION, jobOfferDayOffRows,
} from "../../jobOfferConstants";

const C = JO_EDITOR_COPY;
const API_DATE = 'YYYY-MM-DD';
const toNumberOrNull = (value) => { if (value === '' || value === null || value === undefined) return null; const n = Number(value); return Number.isNaN(n) ? null : n; };

export const JOB_OFFER_FORM_DEFAULTS = Object.freeze({
    start_date: '', asap: 0, flexible_start_date: '',
    role_id: '', spoken_language: [], helper_nationality: [], current_location: [], overseas_exp: JO_NULL_CHOICE, contract_status: JO_NULL_CHOICE,
    skills: [], responsibilities: [], cooking: [], special_course: [JO_NO_PREFERENCE_ID], education: JO_NULL_CHOICE,
    employer_nationality: '', employer_district: '', employer_house_size: '',
    helper_accommadation: '', day_off: [], coworker_status: '0',
    expected_salary: '', min_salary: '', max_salary: '', fixed_salary: '',
    higher_salary: JO_CONSIDER_DEFAULT, salary_bonus: JO_CONSIDER_DEFAULT,
    detailed_description: '', adults_are_working: '',
    religion: [JO_NO_PREFERENCE_ID], having_siblings: JO_NULL_CHOICE, marital_status: '0', having_children: JO_NULL_CHOICE,
    min_age: null, max_age: null,
    head_line: '', job_description_english: '', indonesian_head_line: '', indonesian_job_description: '',
    care_recipients: [], pets: [],
});

export const jobOfferSchema = yup.object().shape({
    asap: yup.number(),
    start_date: yup.string().when('asap', { is: 1, then: (s) => s.notRequired(), otherwise: (s) => s.required(C.required).test('valid', C.required, (v) => dayjs(v).isValid()) }),
    flexible_start_date: yup.string().nullable().transform((v) => (v === '' ? null : v)).when('asap', { is: 1, then: (s) => s.notRequired(), otherwise: (s) => s.required(C.required) }),
    role_id: yup.string().required(C.required),
    spoken_language: yup.array().min(1, C.atLeastOne),
    helper_nationality: yup.array().min(1, C.atLeastOne),
    current_location: yup.array().min(1, C.atLeastOne),
    /* both prototypes: "No preference is a valid choice" — it is the default and saves as null */
    overseas_exp: yup.mixed().test('picked', C.required, (v) => v === null || v !== ''),
    contract_status: yup.mixed().test('picked', C.required, (v) => v === null || v !== ''),
    skills: yup.array().min(1, C.atLeastOne).max(JO_MAIN_DUTIES_MAX, C.mainDutiesCap),
    responsibilities: yup.array(),
    cooking: yup.array(), /* U-0247: optional even when Cooking is a main duty — an empty list means no cuisine constraint */
    special_course: yup.array().min(1, C.atLeastOne),
    education: yup.mixed().test('picked', C.required, (v) => v === null || v !== ''),
    employer_nationality: yup.string().required(C.required),
    employer_district: yup.string().test('hk-district', C.required, function (value) { return this.options?.context?.isMacau ? true : Boolean(value); }),
    employer_house_size: yup.string().nullable().transform((v) => (v === null || v === undefined ? '' : String(v))).matches(new RegExp(`^\\d{0,${ JO_HOUSE_SIZE_MAX_DIGITS }}$`), C.houseSizeDigits),
    helper_accommadation: yup.string().required(C.required),
    day_off: yup.array().min(1, C.atLeastOne),
    coworker_status: yup.string().required(C.required),
    expected_salary: yup.string().required(C.required),
    min_salary: yup.mixed().when('expected_salary', {
        is: JO_SALARY.RANGE_ID,
        then: (s) => s.test('min-required', C.salaryRequired, (v) => toNumberOrNull(v) !== null)
            .test('floor', C.minBelowFloor, function (v) { const n = toNumberOrNull(v); if (n === null) return true; if (n >= JO_SALARY.FLOOR) return true; return n === this.options?.context?.recordedBelowFloor?.amount; }),
        otherwise: (s) => s.nullable(),
    }),
    max_salary: yup.mixed().when('expected_salary', {
        is: JO_SALARY.RANGE_ID,
        then: (s) => s.test('max-required', C.salaryRequired, (v) => toNumberOrNull(v) !== null)
            .test('ceiling', C.maxAboveCeiling, (v) => { const n = toNumberOrNull(v); return n === null || n <= JO_SALARY.CEILING; })
            .test('above-min', C.maxBelowMin, function (v) { const hi = toNumberOrNull(v); const lo = toNumberOrNull(this.parent?.min_salary); return hi === null || lo === null || hi >= lo; }),
        otherwise: (s) => s.nullable(),
    }),
    fixed_salary: yup.mixed().when('expected_salary', {
        is: JO_SALARY.FIXED_ID,
        then: (s) => s.test('fixed-required', C.salaryRequired, (v) => toNumberOrNull(v) !== null)
            .test('floor', C.minBelowFloor, function (v) { const n = toNumberOrNull(v); if (n === null) return true; if (n >= JO_SALARY.FLOOR) return true; return n === this.options?.context?.recordedBelowFloor?.amount; })
            .test('ceiling', C.maxAboveCeiling, (v) => { const n = toNumberOrNull(v); return n === null || n <= JO_SALARY.CEILING; }),
        otherwise: (s) => s.nullable(),
    }),
    higher_salary: yup.string().required(C.required),
    salary_bonus: yup.string().required(C.required),
    detailed_description: yup.string().nullable().max(JO_NOTES_MAX, C.notesMax),
    adults_are_working: yup.string().nullable(),
    religion: yup.array(),
    marital_status: yup.mixed().nullable(),
    having_siblings: yup.mixed().nullable(),
    having_children: yup.mixed().nullable(),
    min_age: yup.number().nullable().min(JO_AGE.MIN).max(JO_AGE.MAX),
    max_age: yup.number().nullable().min(JO_AGE.MIN).max(JO_AGE.MAX),
    care_recipients: yup.array(),
    pets: yup.array(),
});

const csvIds = (value) => (value ? String(value).split(',').map(Number).filter((n) => !Number.isNaN(n)) : []);
/* D-07 arrays as stored: `[{ type, count }]`, zero counts dropped */
/* a count is a number, or the string "5+" for pets (backend 12 Oct ask 16) */
const countValue = (count) => (count === JO_PET_PLUS ? JO_PET_PLUS : Number(count));
const typedCounts = (rows) => (Array.isArray(rows) ? rows.filter((row) => row?.type && (row.count === JO_PET_PLUS || Number(row.count) > 0)).map((row) => ({ type: row.type, count: countValue(row.count) })) : []);
/* rollout fallback: the legacy `*_count_info` arrays still returned beside the new shape */
const legacyCareRecipients = (source) => Object.entries(JO_LEGACY_CARE_TYPE)
    .map(([legacyKey, type]) => ({ type, count: Array.isArray(source?.[`${ legacyKey }_count_info`]) ? source[`${ legacyKey }_count_info`].length : Number(source?.[`${ legacyKey }_count`]) || 0 }))
    .filter((row) => row.count > 0);
const careRecipientsOf = (record, legacySource) => (Array.isArray(record?.care_recipients) ? typedCounts(record.care_recipients) : legacyCareRecipients(legacySource));

export const hydrateJobOfferForm = (detail) => {
    if (!detail) return { ...JOB_OFFER_FORM_DEFAULTS };
    const emp = detail.employer_details || {};
    const values = {
        ...JOB_OFFER_FORM_DEFAULTS,
        start_date: detail.start_date ? dayjs(detail.start_date).format(API_DATE) : '',
        asap: Number(detail.asap) === 1 ? 1 : 0,
        flexible_start_date: detail.flexible_start_date_info?.id != null ? String(detail.flexible_start_date_info.id) : (detail.flexible_start_date ? String(detail.flexible_start_date) : ''),
        role_id: detail.role?.id != null ? String(detail.role.id) : '',
        spoken_language: csvIds(detail.spoken_language),
        helper_nationality: detail.helper_nationality ? csvIds(detail.helper_nationality) : [JO_NO_PREFERENCE_ID],
        current_location: detail.current_location ? csvIds(detail.current_location) : [JO_NO_PREFERENCE_ID],
        overseas_exp: detail.overseas_exp === null || detail.overseas_exp === undefined ? JO_NULL_CHOICE : String(detail.overseas_exp),
        contract_status: detail.contract_status ? String(detail.contract_status) : JO_NULL_CHOICE,
        skills: csvIds(detail.skills),
        responsibilities: csvIds(detail.responsibilities),
        cooking: csvIds(detail.cooking),
        special_course: detail.special_course ? csvIds(detail.special_course) : [JO_NO_PREFERENCE_ID],
        education: detail.education_info?.id != null ? String(detail.education_info.id) : JO_NULL_CHOICE,
        employer_nationality: emp.nationality_info?.id != null ? String(emp.nationality_info.id) : '',
        employer_district: emp.district_info?.id != null ? String(emp.district_info.id) : '',
        employer_house_size: emp.house_size ? String(emp.house_size) : '',
        helper_accommadation: detail.helper_accommadation_info?.id != null ? String(detail.helper_accommadation_info.id) : (detail.helper_accommadation?.id != null ? String(detail.helper_accommadation.id) : ''),
        day_off: jobOfferDayOffRows(detail).map((row) => String(row?.id ?? row)).filter((id) => id && id !== 'undefined'),
        coworker_status: detail.coworker_status == null ? '0' : String(detail.coworker_status),
        expected_salary: detail.expected_salary_info?.id != null ? String(detail.expected_salary_info.id) : (detail.expected_salary?.id != null ? String(detail.expected_salary.id) : ''),
        min_salary: detail.min_salary ?? '',
        max_salary: detail.max_salary ?? '',
        fixed_salary: detail.fixed_salary ?? '',
        higher_salary: detail.higher_salary == null ? JO_CONSIDER_DEFAULT : String(detail.higher_salary),
        salary_bonus: detail.salary_bonus == null ? JO_CONSIDER_DEFAULT : String(detail.salary_bonus),
        detailed_description: detail.detailed_description || '',
        adults_are_working: detail.adults_are_working == null ? '' : String(detail.adults_are_working),
        religion: detail.religion ? csvIds(detail.religion) : [JO_NO_PREFERENCE_ID],
        having_siblings: detail.having_siblings == null ? JO_NULL_CHOICE : detail.having_siblings,
        marital_status: detail.marital_status?.id != null ? String(detail.marital_status.id) : (detail.marital_status ? String(detail.marital_status) : '0'),
        having_children: detail.having_children == null ? JO_NULL_CHOICE : detail.having_children,
        min_age: detail.min_age ?? null,
        max_age: detail.max_age ?? null,
        head_line: detail.head_line || '', job_description_english: detail.job_description_english || '',
        indonesian_head_line: detail.indonesian_head_line || '', indonesian_job_description: detail.indonesian_job_description || '',
        care_recipients: careRecipientsOf(detail, emp),
        pets: typedCounts(detail.pets),
    };
    return values;
};

export const seedFromEmployer = (employer) => {
    if (!employer) return {};
    const seed = {};
    if (employer.nationality) seed.employer_nationality = String(employer.nationality);
    if (employer.house_size) seed.employer_house_size = String(employer.house_size);
    if (employer.district) seed.employer_district = String(employer.district);
    if (employer.adults_are_working != null) seed.adults_are_working = String(employer.adults_are_working);
    seed.care_recipients = careRecipientsOf(employer, employer);
    seed.pets = typedCounts(employer.pets);
    return seed;
};

const nullify = (value) => (value === JO_NULL_CHOICE ? null : value);

/* `action` (D-10) and `copy` (D-09) ride on the save; a Draft may carry empty dates, so they are sent as null */
export const buildJobOfferPayload = (values, { jobId, employerId, moduleKey, action, copy }) => {
    const data = { ...values, care_recipients: typedCounts(values.care_recipients), pets: typedCounts(values.pets), day_off: (Array.isArray(values.day_off) ? values.day_off : []).map(Number).filter((n) => Number.isFinite(n)) };
    const payload = Object.keys(data).reduce((acc, key) => { acc[key] = nullify(data[key]); return acc; }, {});
    if (payload.expected_salary !== JO_SALARY.FIXED_ID) delete payload.fixed_salary;
    if (payload.expected_salary === JO_SALARY.FIXED_ID) { delete payload.min_salary; delete payload.max_salary; }
    if (payload.employer_house_size === '') payload.employer_house_size = null;
    if (payload.min_age == null || payload.max_age == null) { payload.min_age = null; payload.max_age = null; }
    const startDate = payload.asap === 1 ? dayjs() : (payload.start_date ? dayjs(payload.start_date) : null);
    return {
        ...payload,
        start_date: startDate && startDate.isValid() ? startDate.format(API_DATE) : null,
        flexible_start_date: payload.asap === 1 ? 0 : (payload.flexible_start_date || null),
        employer_id: employerId,
        ...(jobId ? { job_id: jobId } : {}),
        module_key: moduleKey,
        ...(action ? { action } : {}),
        ...(copy ? { copy: { ...copy, approved: action === JO_SAVE_ACTION.APPROVE_OPEN } } : {}),
    };
};

export const isMacauEmployer = (employer, countries) => {
    const locationId = employer?.location_info?.id ?? employer?.location ?? (Array.isArray(countries) ? countries.find((c) => c.code === employer?.country_code)?.id : null);
    return Number(locationId) === MACAU_LOCATION_ID;
};

export const recordedBelowFloor = (detail) => {
    if (!detail) return null;
    const mode = String(detail.expected_salary_info?.id ?? detail.expected_salary?.id ?? '');
    const amount = mode === JO_SALARY.FIXED_ID ? Number(detail.fixed_salary) : mode === JO_SALARY.RANGE_ID ? Number(detail.min_salary) : null;
    if (!amount || amount >= JO_SALARY.FLOOR) return null;
    return { amount, date: detail.created_at ? dayjs(detail.created_at).format('DD/MM/YYYY') : '—' };
};
