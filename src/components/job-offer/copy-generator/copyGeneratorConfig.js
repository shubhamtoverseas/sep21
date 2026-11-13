// Job Offer copy generator (handoff v2.0) — constants and enum normalizers.
// Contract files: copy_input_schema_v2.json / copy_output_schema_v2.json (packaged with the brief).

export const COPY_SCHEMA_VERSION = 'job_offer_copy_input_2';

// Unicode code-point limits per language, from copy_output_schema_v2 (headline, description).
export const COPY_LIMITS = {
  en: [60, 450],
  id: [60, 450],
  zh: [240, 900],
};

export const COPY_ORIGINS = {
  GENERATION: 'GENERATION',
  REGENERATION: 'REGENERATION',
  RESTORE_AS_NEW: 'RESTORE_AS_NEW',
};
/* the facts-hash of a saved earlier round is unknown: it never equals the current one, so a restore of it reads as stale (U-0244) */
export const COPY_STALE_HASH = 'stale';

export const ORIGIN_LABEL_KEYS = {
  GENERATION: 'key_copy_origin_generated',
  REGENERATION: 'key_copy_origin_regenerated',
  RESTORE_AS_NEW: 'key_copy_origin_restored',
};

// Labels used when reporting which job details changed since the current copy version.
export const COPY_FIELD_LABEL_KEYS = {
  role: 'key_role',
  main_duties: 'key_main_duties',
  other_responsibilities: 'key_other_responsibilities',
  cooking_styles: 'key_cooking',
  household: 'key_jo_editor_sections_household',
  pets: 'key_pets',
  employer_background: 'key_employer_nationality',
  district: 'key_district',
  accommodation: 'key_jo_editor_accommodation',
  day_offs: 'key_day_off',
  coworker: 'key_co_worker',
  supplemental_job_facts: 'key_jo_editor_sections_notes',
};

// count → schema count band (adults, pets)
export const toCountBand = (count) => {
  const n = parseInt(count, 10);
  if (!n || n < 1) return null;
  return ['ONE', 'TWO', 'THREE', 'FOUR'][n - 1] || 'FIVE_PLUS';
};

// Admin dropdown names occasionally differ from the schema enum spellings; normalize known aliases
// and pass the source name through otherwise (backend re-validates against the schema).
const DUTY_ALIASES = {
  'House Chores': 'Household Chores',
  'Home Chores': 'Household Chores',
  'Grocery shopping': 'Grocery Shopping',
  'Pet care': 'Pet Care',
};

export const normalizeDutyName = (name) => DUTY_ALIASES[name] || name || null;

// D-07 pet type → schema pet type
export const PET_TYPE_MAP = { dog: 'Dogs', cat: 'Cats', other: 'Other' };

export const GENDER_MAP = { 1: 'Male', 2: 'Female' };

// D-07 care-recipient type → schema care_recipient.kind (the schema enum has no Toddler / Teen: both fold into Child)
export const CARE_KIND_MAP = {
  expecting: 'Expecting baby',
  baby_0_1: 'Baby',
  toddler_2_5: 'Child',
  child_6_12: 'Child',
  teen_13_17: 'Child',
  elderly_65: 'Elderly',
};

// Counts Unicode code points (spec counts code points, not UTF-16 units).
export const codePointLength = (str) => (str ? Array.from(String(str)).length : 0);

export const REGEN_INSTRUCTION_MAX = 1000;
/* prototype "Why regenerate?" reasons (sent as the instruction, kept with the round) */
export const REGEN_REASON_KEYS = {
  emphasis: 'key_jo_editor_regen_reason_emphasis',
  missing: 'key_jo_editor_regen_reason_missing',
  tone: 'key_jo_editor_regen_reason_tone',
  awkward: 'key_jo_editor_regen_reason_awkward',
};
export const SUPPLEMENTAL_FACTS_MAX = 1000;
export const EXPLICIT_CONTEXT_MAX = 300;

// ---------------------------------------------------------------------------
// DEMO MODE — off since the backend endpoint went live (D-08, 2026-10-08). Flip to
// true to review the UI flow against the deterministic packages below.
export const COPY_DEMO_MODE = false;
export const DEMO_DELAY_MS = 900;

const DEMO_PACKAGES = {
  initial: {
    english: {
      headline: 'Live-in helper for a caring family home',
      description: 'A family in Hong Kong is looking for a helper to run the household day to day. The focus is on child care, cooking and keeping the home tidy. You will have your own room and a fixed weekly day off.',
    },
    indonesian: {
      headline: 'ART menginap untuk keluarga yang peduli',
      description: 'Sebuah keluarga di Hong Kong mencari asisten rumah tangga untuk mengurus rumah sehari-hari. Fokusnya adalah menjaga anak, memasak dan menjaga kerapian rumah. Anda mendapat kamar sendiri dan satu hari libur tetap setiap minggu.',
    },
    traditional_chinese_review: {
      headline: '住家助理・照顧家庭生活',
      description: '香港一個家庭正在尋找助理，負責日常家務。工作重點是照顧小孩、煮食及保持家居整潔。僱主提供獨立房間，每週有固定休息日。',
    },
  },
  fresh: {
    english: {
      headline: 'Helper wanted for a warm family household',
      description: 'Join a Hong Kong family as their household helper. Daily work covers looking after the children, preparing family meals and general housekeeping. The role comes with a private room and a regular weekly rest day.',
    },
    indonesian: {
      headline: 'Dicari ART untuk keluarga yang hangat',
      description: 'Bergabunglah dengan keluarga di Hong Kong sebagai asisten rumah tangga. Pekerjaan harian meliputi menjaga anak, menyiapkan makanan keluarga dan pekerjaan rumah umum. Tersedia kamar pribadi dan hari istirahat mingguan tetap.',
    },
    traditional_chinese_review: {
      headline: '溫馨家庭誠聘家務助理',
      description: '加入香港家庭擔任家務助理。日常工作包括照顧小孩、準備家庭膳食及一般家務。提供私人房間及每週固定休息日。',
    },
  },
  instructed: {
    english: {
      headline: 'Family helper role with child care focus',
      description: 'A Hong Kong family is hiring a helper with child care as the first priority, supported by cooking and housekeeping. Expect a stable routine, your own room and a fixed day off every week.',
    },
    indonesian: {
      headline: 'Peran ART dengan fokus menjaga anak',
      description: 'Sebuah keluarga di Hong Kong mempekerjakan asisten dengan prioritas utama menjaga anak, didukung memasak dan pekerjaan rumah. Rutinitas stabil, kamar sendiri dan hari libur tetap setiap minggu.',
    },
    traditional_chinese_review: {
      headline: '以照顧小孩為主的家務助理',
      description: '香港家庭聘請助理，首要職責是照顧小孩，並協助煮食及家務。工作規律穩定，提供獨立房間，每週有固定休息日。',
    },
  },
};

export const pickDemoPackage = (copyInput) => {
  if (copyInput?.operation === 'GENERATE') return DEMO_PACKAGES.initial;
  return copyInput?.regeneration_instruction ? DEMO_PACKAGES.instructed : DEMO_PACKAGES.fresh;
};
