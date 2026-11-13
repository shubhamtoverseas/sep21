import { translation } from '../../../utils/translation';
import { isMark } from '../../../services/commonService';

// 1. Define all translation keys
const TRANSLATION_KEYS = {
  // Common Documents
  PASSPORT_MAIN: 'key_passport_main_page_copy',
  PASSPORT_SIGN: 'key_passport_sign_page_copy',
  PASSPORT_PHOTO: 'key_passport_size_photo',
  HELPER_HKID: 'key_helpers_hkid_copy',
  HKID: 'key_employers_hkid_copy',
  E_VISA: 'key_e_visa_copy',
  OLD_CONTRACT: 'key_old_contract_original',
  ENGLISH_ADDRESS_PROOF: 'key_english_address_proof',
  
  // Indonesian Specific
  PT_ONLINE: 'key_pt_online',
  KJRI_SUBMISSION: 'key_kjri_submission',
  EC_002_FORM: 'key_ec_002_form_kjri',
  KITKI: 'key_kitki',
  INDONESIAN_MEDICAL: 'key_indonesian_medical_certificate_copy',
  
  // Thai Specific
  THAI_ID: 'key_thai_id_copy',
  MEDICAL_CHECKUP: 'key_medical_check_up_within_6_months_copy',
  
  // Bangladeshi Specific
  BANGLADESHI_TRAINING: 'key_bangladesh_training_certificate',
  INFO_SHEET_COVER: 'key_information_sheet_cover',
  COVER_LETTER_AGENCY: 'key_cover_letter_from_employment_agency',
  DEMAND_LETTER_COVER: 'key_demand_letter_cover_showing_remaining',
  JOB_OFFER_COVER: 'key_job_offer_cover_letter_signed',
  
  // OFW Specific
  OFW_INFO_SHEET: 'key_ofw_information_sheet',
  OWWA_PAYMENT: 'key_proof_of_owwa_payment',
  RELEASE_LETTER: 'key_release_letter_copy',
  RELEASE_LETTER_FROM_PREV_EMP: 'key_release_letter_from_previous_er_copy',
  
  // Contracts
  SIGNED_4_CONTRACTS: 'key_4_signed_contracts_original',
  X4_CONTRACTS: 'key_x4_contracts_original',
  X2_CONTRACTS: 'key_x2_contracts_original',
  SIGNED2_CONTRACTS: 'key_x2_contracts_original',
  
  // Employer Documents
  LETTER_GUARANTEE: 'key_letter_of_guarantee',
  EMPLOYER_HKID: 'key_employers_hkid_copy',
  APPLICATION_FORM: 'key_application_form_1_1dh',
  UNDERTAKING: 'key_undertaking',
  COLOR_PHOTO: 'key_color_photo',
  EMPLOYER_ADDRESS_PROOF: 'key_employer_address_proof',
  MOBILE_PHONE: 'key_mobile_phone'
};

// 2. Helper function to create document groups with translations
const createDocGroup = (items) => {
  return Object.fromEntries(
    Object.entries(items).map(([key, value]) => [translation(key), value]));
};

// 3. Helper Document Groups
const HELPER_DOC_GROUP1_INDONESIAN = createDocGroup({
  [TRANSLATION_KEYS.PASSPORT_MAIN]: "helper_passport_main_page_copy",
  [TRANSLATION_KEYS.PASSPORT_SIGN]: "helper_passport_signature_page_copy",
  [TRANSLATION_KEYS.PASSPORT_PHOTO]: "helper_passport_size_photo_copy",
  [TRANSLATION_KEYS.HELPER_HKID]: "helper_hkid_copy",
  [TRANSLATION_KEYS.PT_ONLINE]: "pt_online",
  [TRANSLATION_KEYS.KJRI_SUBMISSION]: "kjri_submission",
  [TRANSLATION_KEYS.EC_002_FORM]: "ec_002_form",
  [TRANSLATION_KEYS.E_VISA]: "e_visa_copy",
  [TRANSLATION_KEYS.KITKI]: "kitki",
  [TRANSLATION_KEYS.ENGLISH_ADDRESS_PROOF]: "english_address_proof_copy",
  [TRANSLATION_KEYS.INDONESIAN_MEDICAL]: "indonesian_medical_certificate",
  [TRANSLATION_KEYS.OLD_CONTRACT]: "old_contract_copy"
});

const HELPER_DOC_GROUP1_THAI = createDocGroup({
  [TRANSLATION_KEYS.PASSPORT_MAIN]: "helper_passport_main_page_copy",
  [TRANSLATION_KEYS.PASSPORT_SIGN]: "helper_passport_signature_page_copy",
  [TRANSLATION_KEYS.THAI_ID]: "thai_id_copy",
  [TRANSLATION_KEYS.HELPER_HKID]: "helper_hkid_copy",
  [TRANSLATION_KEYS.MEDICAL_CHECKUP]: "medical_check_up_copy"
});

const HELPER_DOC_GROUP1_BANGLADESHI = createDocGroup({
  [TRANSLATION_KEYS.PASSPORT_MAIN]: "helper_passport_main_page_copy",
  [TRANSLATION_KEYS.PASSPORT_SIGN]: "helper_passport_signature_page_copy",
  [TRANSLATION_KEYS.PASSPORT_PHOTO]: "helper_passport_size_photo_copy",
  [TRANSLATION_KEYS.BANGLADESHI_TRAINING]: "bangladeshi_training_certificate",
  [TRANSLATION_KEYS.INFO_SHEET_COVER]: "information_sheet_cover",
  [TRANSLATION_KEYS.COVER_LETTER_AGENCY]: "cover_letter_from_employment_agency",
  [TRANSLATION_KEYS.DEMAND_LETTER_COVER]: "demand_letter_cover",
  [TRANSLATION_KEYS.JOB_OFFER_COVER]: "job_offer_cover_letter"
});

const HELPER_DOC_GROUP2 = createDocGroup({
  [TRANSLATION_KEYS.PASSPORT_PHOTO]: "helper_passport_size_photo_copy",
  [TRANSLATION_KEYS.HELPER_HKID]: "helper_hkid_copy",
  [TRANSLATION_KEYS.E_VISA]: "e_visa_copy",
  [TRANSLATION_KEYS.OFW_INFO_SHEET]: "ofw_information_sheet",
  [TRANSLATION_KEYS.OWWA_PAYMENT]: "proof_of_owwa_payment",
  [TRANSLATION_KEYS.ENGLISH_ADDRESS_PROOF]: "english_address_proof_copy"
});

const HELPER_DOC_GROUP3_INDONESIAN = HELPER_DOC_GROUP1_INDONESIAN;
const HELPER_DOC_GROUP3_THAI = HELPER_DOC_GROUP1_THAI;
const HELPER_DOC_GROUP3_BANGLADESHI = HELPER_DOC_GROUP1_BANGLADESHI;

const HELPER_DOC_GROUP4 = createDocGroup({
  [TRANSLATION_KEYS.PASSPORT_MAIN]: "helper_passport_main_page_copy",
  [TRANSLATION_KEYS.HELPER_HKID]: "helper_hkid_copy",
  [TRANSLATION_KEYS.E_VISA]: "e_visa_copy",
  [TRANSLATION_KEYS.OFW_INFO_SHEET]: "ofw_information_sheet",
  [TRANSLATION_KEYS.OWWA_PAYMENT]: "proof_of_owwa_payment",
  [TRANSLATION_KEYS.ENGLISH_ADDRESS_PROOF]: "english_address_proof_copy",
  [TRANSLATION_KEYS.OLD_CONTRACT]: "old_contract_copy",
  [TRANSLATION_KEYS.RELEASE_LETTER_FROM_PREV_EMP]: "release_letter_from_previous_employer"
});

// 4. Contract Document Groups
const CONTRACT_GROUP1 = createDocGroup({
  [TRANSLATION_KEYS.SIGNED_4_CONTRACTS]: "signed_4_contracts"
});

const CONTRACT_GROUP1_BANGLADESHI = createDocGroup({
  [TRANSLATION_KEYS.X4_CONTRACTS]: "x4_contracts"
});

const CONTRACT_GROUP2 = createDocGroup({
  [TRANSLATION_KEYS.SIGNED2_CONTRACTS]: "signed_2_contracts"
});

const CONTRACT_GROUP3 = CONTRACT_GROUP1;
const CONTRACT_GROUP3_BANGLADESHI = createDocGroup({
  [TRANSLATION_KEYS.X4_CONTRACTS]: "x4_contracts_original"
});

const CONTRACT_GROUP4 = CONTRACT_GROUP2;

// 5. Employer Document Groups
const EMPLOYER_DOC_GROUP1_INDONESIAN = createDocGroup({
  [TRANSLATION_KEYS.LETTER_GUARANTEE]: "letter_of_guarantee",
  [TRANSLATION_KEYS.EMPLOYER_HKID]: "employer_hkid_copy"
});

const EMPLOYER_DOC_GROUP1_THAI = createDocGroup({
  [TRANSLATION_KEYS.EMPLOYER_HKID]: "employer_hkid_copy",
  [TRANSLATION_KEYS.APPLICATION_FORM]: "application_form_1_1dh",
  [TRANSLATION_KEYS.UNDERTAKING]: "undertaking",
  [TRANSLATION_KEYS.COLOR_PHOTO]: "color_photo_of_accomodation"
});

const EMPLOYER_DOC_GROUP1_BANGLADESHI = createDocGroup({
  [TRANSLATION_KEYS.EMPLOYER_HKID]: "employer_hkid_copy",
  [TRANSLATION_KEYS.EMPLOYER_ADDRESS_PROOF]: "employer_address_proof",
  [TRANSLATION_KEYS.MOBILE_PHONE]: "employer_mobile_phone"
});

const EMPLOYER_DOC_GROUP2 = createDocGroup({
  [TRANSLATION_KEYS.EMPLOYER_HKID]: "employer_hkid_copy"
});

const EMPLOYER_DOC_GROUP3_INDONESIAN = EMPLOYER_DOC_GROUP1_INDONESIAN;
const EMPLOYER_DOC_GROUP3_THAI = EMPLOYER_DOC_GROUP1_THAI;
const EMPLOYER_DOC_GROUP3_BANGLADESHI = EMPLOYER_DOC_GROUP1_BANGLADESHI;
const EMPLOYER_DOC_GROUP4 = EMPLOYER_DOC_GROUP2;

const getDownloadPdfKey = (formKey) => {
    const pdfKeyMapping = {
        'proof_of_owwa_payment': 'OWWA_MEMBERSHIP_FORM',
        'undertaking': 'EMPLOYER_UNDERTAKING_THAI',
    };
    return pdfKeyMapping[formKey] || null;
}

// 6. Core Functions
const mapTableData = (processingDetails, groupMapping, groupName) => {
  return Object.keys(groupMapping).map((item) => ({
    label: item,
    eng: item, // Keep original English text
    prepared: isMark(processingDetails[groupMapping[item] + "_prepared"]),
    ready: isMark(processingDetails[groupMapping[item] + "_ready"]),
    isDoc: isMark(processingDetails[groupMapping[item] + "_uploaded"]),
    uploaded: isMark(processingDetails[groupMapping[item] + "_uploaded"]) ? "Yes" : "No",
    selectedGroupName: groupName,
    isPdfLoading: false,
    key: getDownloadPdfKey(groupMapping[item])
  }));
};

const mapConsulateHelperDocTableData = (processingDetails, contractDetails) => {
  if (!contractDetails) return [];
  
  const { processing_group, worker_nationality_name } = contractDetails;
  
  switch (processing_group) {
    case 1:
      if (worker_nationality_name === 'Indonesian') return mapTableData(processingDetails, HELPER_DOC_GROUP1_INDONESIAN, 'HELPER_DOC_GROUP1_INDONESIAN');
      if (worker_nationality_name === 'Thai') return mapTableData(processingDetails, HELPER_DOC_GROUP1_THAI, 'HELPER_DOC_GROUP1_THAI');
      if (worker_nationality_name === 'Bangladeshi') return mapTableData(processingDetails, HELPER_DOC_GROUP1_BANGLADESHI, 'HELPER_DOC_GROUP1_BANGLADESHI');
      break;
    case 2:
      return mapTableData(processingDetails, HELPER_DOC_GROUP2, 'HELPER_DOC_GROUP2');
    case 3:
      if (worker_nationality_name === 'Indonesian') return mapTableData(processingDetails, HELPER_DOC_GROUP3_INDONESIAN, 'HELPER_DOC_GROUP3_INDONESIAN');
      if (worker_nationality_name === 'Thai') return mapTableData(processingDetails, HELPER_DOC_GROUP3_THAI, 'HELPER_DOC_GROUP3_THAI');
      if (worker_nationality_name === 'Bangladeshi') return mapTableData(processingDetails, HELPER_DOC_GROUP3_BANGLADESHI, 'HELPER_DOC_GROUP3_BANGLADESHI');
      break;
    case 4:
      return mapTableData(processingDetails, HELPER_DOC_GROUP4, 'HELPER_DOC_GROUP4');
    default:
      return [];
  }
  return [];
};

const mapConsulateContractTableData = (processingDetails, contractDetails) => {
  if (!contractDetails) return [];
  
  const { processing_group, worker_nationality_name } = contractDetails;
  
  switch (processing_group) {
    case 1:
      if (worker_nationality_name === 'Bangladeshi') return mapTableData(processingDetails, CONTRACT_GROUP1_BANGLADESHI, 'CONTRACT_GROUP1_BANGLADESHI');
      return mapTableData(processingDetails, CONTRACT_GROUP1, 'CONTRACT_GROUP1');
    case 2:
      return mapTableData(processingDetails, CONTRACT_GROUP2, 'CONTRACT_GROUP2');
    case 3:
      if (worker_nationality_name === 'Bangladeshi') return mapTableData(processingDetails, CONTRACT_GROUP3_BANGLADESHI, 'CONTRACT_GROUP3_BANGLADESHI');
      return mapTableData(processingDetails, CONTRACT_GROUP3, 'CONTRACT_GROUP3');
    case 4:
      return mapTableData(processingDetails, CONTRACT_GROUP4, 'CONTRACT_GROUP4');
    default:
      return [];
  }
};

const mapConsulateEmpooyerDocTableData = (processingDetails, contractDetails) => {
  if (!contractDetails) return [];
  
  const { processing_group, worker_nationality_name } = contractDetails;
  
  switch (processing_group) {
    case 1:
      if (worker_nationality_name === 'Indonesian') return mapTableData(processingDetails, EMPLOYER_DOC_GROUP1_INDONESIAN, 'EMPLOYER_DOC_GROUP1_INDONESIAN');
      if (worker_nationality_name === 'Thai') return mapTableData(processingDetails, EMPLOYER_DOC_GROUP1_THAI, 'EMPLOYER_DOC_GROUP1_THAI');
      if (worker_nationality_name === 'Bangladeshi') return mapTableData(processingDetails, EMPLOYER_DOC_GROUP1_BANGLADESHI, 'EMPLOYER_DOC_GROUP1_BANGLADESHI');
      break;
    case 2:
      return mapTableData(processingDetails, EMPLOYER_DOC_GROUP2, 'EMPLOYER_DOC_GROUP2');
    case 3:
      if (worker_nationality_name === 'Indonesian') return mapTableData(processingDetails, EMPLOYER_DOC_GROUP3_INDONESIAN, 'EMPLOYER_DOC_GROUP3_INDONESIAN');
      if (worker_nationality_name === 'Thai') return mapTableData(processingDetails, EMPLOYER_DOC_GROUP3_THAI, 'EMPLOYER_DOC_GROUP3_THAI');
      if (worker_nationality_name === 'Bangladeshi') return mapTableData(processingDetails, EMPLOYER_DOC_GROUP3_BANGLADESHI, 'EMPLOYER_DOC_GROUP3_BANGLADESHI');
      break;
    case 4:
      return mapTableData(processingDetails, EMPLOYER_DOC_GROUP4, 'EMPLOYER_DOC_GROUP4');
    default:
      return [];
  }
  return [];
};

const updatePayloadOfConsulate = (contractData, employerDocumentsData, helperDocumentsData) => {
  const getPayload = (data, groupName) => {
    if (!data.length) return {};
    const groupMapping = eval(groupName);
    return data.reduce((payload, item) => {
      const key = groupMapping[item.label];
      if (key) {
        payload[`${key}_prepared`] = item.prepared ? 1 : 0;
        payload[`${key}_ready`] = item.ready ? 1 : 0;
        if (item.uploaded !== undefined) {
          payload[`${key}_uploaded`] = item.uploaded === 'Yes' ? 1 : 0;
        }
      }
      return payload;
    }, {});
  };

  return {
    ...getPayload(contractData, contractData[0]?.selectedGroupName),
    ...getPayload(employerDocumentsData, employerDocumentsData[0]?.selectedGroupName),
    ...getPayload(helperDocumentsData, helperDocumentsData[0]?.selectedGroupName)
  };
};

// 7. Export Config
const consulateConfig = {
  mapConsulateContractTableData,
  mapConsulateEmpooyerDocTableData,
  mapConsulateHelperDocTableData,
  updatePayloadOfConsulate,
  TRANSLATION_KEYS
};

export default consulateConfig;