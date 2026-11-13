import {
  COPY_SCHEMA_VERSION,
  toCountBand,
  normalizeDutyName,
  PET_TYPE_MAP,
  CARE_KIND_MAP,
  SUPPLEMENTAL_FACTS_MAX,
  EXPLICIT_CONTEXT_MAX,
} from './copyGeneratorConfig';

const findName = (list, id) => {
  const item = (list || []).find((entry) => entry.id === parseInt(id, 10));
  return item ? (item.name_en || item.name) : null;
};

// D-07 household: one `{ type, count }` per care-recipient type → one schema recipient per person (age / gender unknown)
const buildCareRecipients = (formValues) => {
  const recipients = [];
  (formValues.care_recipients || []).forEach((row) => {
    const kind = CARE_KIND_MAP[row?.type];
    const count = parseInt(row?.count, 10);
    if (!kind || !count) return;
    for (let i = 0; i < count; i += 1) recipients.push({ kind, age_years: null, gender: null });
  });
  return recipients.slice(0, 13);
};

const buildPets = (formValues) => (formValues.pets || [])
  .filter((pet) => pet?.type && parseInt(pet?.count, 10) > 0)
  .slice(0, 3)
  .map((pet) => ({
    type: PET_TYPE_MAP[pet.type] || PET_TYPE_MAP.other,
    count_band: toCountBand(pet.count) || 'ONE',
  }));

const trimOrNull = (value, maxLength) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  return maxLength ? Array.from(trimmed).slice(0, maxLength).join('') : trimmed;
};

const COOKING_DUTY_ID = 10;

/**
 * Builds the copy_source object of copy_input_schema_v2 from the add-JO form values.
 * `lists` carries the resolved dropdown lists so ids become the schema's display strings.
 * Salary, home size, private preferences (religion/marital/children/siblings/helper age),
 * languages, nationality preference, education and courses are copy-excluded by spec.
 */
export const buildCopySource = (formValues, lists) => {
  const {
    workerRoles, mainSkills, cookingList, dayOffList,
    accommodations, employerNationalities, districts, employerCountryCode,
  } = lists;

  const orderedDuties = (formValues.skills || [])
    .map((id) => normalizeDutyName(findName(mainSkills, id)))
    .filter(Boolean);

  const cookingSelected = (formValues.skills || []).includes(COOKING_DUTY_ID)
    || (formValues.responsibilities || []).includes(COOKING_DUTY_ID);

  return {
    role: findName(workerRoles, formValues.role_id) || 'Helper',
    primary_main_duty: orderedDuties[0] || null,
    supporting_main_duties: orderedDuties.slice(1, 3),
    other_responsibilities: (formValues.responsibilities || [])
      .map((id) => normalizeDutyName(findName(mainSkills, id)))
      .filter(Boolean),
    legacy_main_duties_unranked: [],
    household: {
      adult_count_band: null,
      care_recipients: buildCareRecipients(formValues),
      pets: buildPets(formValues),
    },
    cooking_styles: cookingSelected
      ? (formValues.cooking || []).map((id) => findName(cookingList, id)).filter(Boolean)
      : [],
    employer_background: {
      country_code: (employerCountryCode || 'HK').toUpperCase().slice(0, 2),
      explicit_context: trimOrNull(findName(employerNationalities, formValues.employer_nationality), EXPLICIT_CONTEXT_MAX),
    },
    district: trimOrNull(findName(districts, formValues.employer_district), 100),
    accommodation: findName(accommodations, formValues.helper_accommadation),
    /* Day Off is multi (backend 12 Oct ask 12) */
    day_offs: (Array.isArray(formValues.day_off) ? formValues.day_off : [formValues.day_off]).map((id) => findName(dayOffList, id)).filter(Boolean),
    coworker: Number(formValues.coworker_status) === 1 ? 'Yes' : 'No',
    supplemental_job_facts: trimOrNull(formValues.detailed_description, SUPPLEMENTAL_FACTS_MAX),
  };
};

// `why` = { reason, note } of a REGENERATE, stored with the round (backend 12 Oct ask 16); the joined instruction stays
export const buildCopyInput = (copySource, operation, regenerationInstruction, why = null) => ({
  schema_version: COPY_SCHEMA_VERSION,
  operation,
  source_mode: 'CANONICAL',
  copy_source: copySource,
  regeneration_instruction: operation === 'GENERATE' ? null : (regenerationInstruction || null),
  ...(operation === 'GENERATE' ? {} : { reason: why?.reason || null, note: why?.note || null }),
});

// Staleness hash: the copy source itself is the snapshot boundary
// ({source_mode, copy_source} per spec — source_mode is constant here).
export const copySnapshotHash = (copySource) => JSON.stringify(copySource);

// Top-level copy_source keys that differ between two snapshots (for "job details changed: …").
export const diffCopySources = (previous, current) => {
  if (!previous || !current) return [];
  const grouped = {
    role: ['role'],
    main_duties: ['primary_main_duty', 'supporting_main_duties', 'legacy_main_duties_unranked'],
    other_responsibilities: ['other_responsibilities'],
    cooking_styles: ['cooking_styles'],
    employer_background: ['employer_background'],
    district: ['district'],
    accommodation: ['accommodation'],
    day_offs: ['day_offs'],
    coworker: ['coworker'],
    supplemental_job_facts: ['supplemental_job_facts'],
  };
  const changed = Object.keys(grouped).filter((label) =>
    grouped[label].some((key) => JSON.stringify(previous[key]) !== JSON.stringify(current[key])));
  const householdChanged = ['adult_count_band', 'care_recipients'].some((key) =>
    JSON.stringify(previous.household?.[key]) !== JSON.stringify(current.household?.[key]));
  if (householdChanged) changed.push('household');
  if (JSON.stringify(previous.household?.pets) !== JSON.stringify(current.household?.pets)) changed.push('pets');
  return changed;
};

// Minimum source fields the generator needs before a request is sent.
export const missingCopySourceFields = (copySource) => {
  const missing = [];
  if (!copySource.primary_main_duty) missing.push('main_duties');
  if (!copySource.accommodation) missing.push('accommodation');
  if (!copySource.day_offs.length) missing.push('day_offs');
  return missing;
};
