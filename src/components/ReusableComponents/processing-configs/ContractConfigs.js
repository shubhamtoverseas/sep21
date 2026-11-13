import translation from "../../../utils/translation";

const REVIEWED_KEY_SUFFIX = "_reviewed";

// Define all translation keys in one place
const TRANSLATION_KEYS = {
  CONTRACT_CHECKLIST: {
    X4_CONTRACTS: 'key_x4_contracts_original',
    EMPLOYER_SIGNATURE: 'key_employer_signature_in_all_4_contracts',
    HELPER_SIGNATURE: 'key_helper_signature_in_4_contracts',
    COMPANY_CHOP: 'key_company_chop_and_witness_signature_in_4_contracts',
    WAGES_FOOD: 'key_wages_and_food_allowance',
    EMPLOYER_ADDRESS: 'key_employer_address',
    ACCOMMODATION: 'key_accommodation_details',
    DOMESTIC_DUTIES: 'key_domestic_duties_details'
  },
  SERVICE_AGREEMENT: {
    ER_SERVICE: 'key_er_service_agreement',
    FDH_SERVICE: 'key_fdh_service_agreement',
    ER_ACKNOWLEDGEMENT: 'key_er_acknowledgement_form',
    FDH_ACKNOWLEDGEMENT: 'key_fdh_acknowledgement_form',
    JOB_ORDER: 'key_job_order',
    EMPLOYER_DATA: 'key_employer_data_form',
    ER_INSURANCE: 'key_er_insurance_air_ticket_sheet'
  }
};

const contractCheckListTableData = [
  {
    contract_checklist: translation(TRANSLATION_KEYS.CONTRACT_CHECKLIST.X4_CONTRACTS),
    eng: "x4 Contracts (Original)",
    cs: true
  },
  {
    contract_checklist: translation(TRANSLATION_KEYS.CONTRACT_CHECKLIST.EMPLOYER_SIGNATURE),
    eng: "Employer Signature in all 4 Contracts",
    cs: true
  },
  {
    contract_checklist: translation(TRANSLATION_KEYS.CONTRACT_CHECKLIST.HELPER_SIGNATURE),
    eng: "Helper Signature in 4 Contracts",
    cs: true
  },
  {
    contract_checklist: translation(TRANSLATION_KEYS.CONTRACT_CHECKLIST.COMPANY_CHOP),
    eng: "Company Chop and Witness Signature in 4 Contracts",
    cs: true
  },
  {
    contract_checklist: translation(TRANSLATION_KEYS.CONTRACT_CHECKLIST.WAGES_FOOD),
    eng: "Wages and Food Allowance",
    cs: true
  },
  {
    contract_checklist: translation(TRANSLATION_KEYS.CONTRACT_CHECKLIST.EMPLOYER_ADDRESS),
    eng: "Employer Address",
    cs: true
  },
  {
    contract_checklist: translation(TRANSLATION_KEYS.CONTRACT_CHECKLIST.ACCOMMODATION),
    eng: "Accommodation Details",
    cs: true
  },
  {
    contract_checklist: translation(TRANSLATION_KEYS.CONTRACT_CHECKLIST.DOMESTIC_DUTIES),
    eng: "Domestic Duties Details",
    cs: true
  }
];

const serviceAgreementMapping = {
  [translation(TRANSLATION_KEYS.SERVICE_AGREEMENT.ER_SERVICE)]: "er_service_agreement",
  [translation(TRANSLATION_KEYS.SERVICE_AGREEMENT.FDH_SERVICE)]: "fdh_service_agreement",
  [translation(TRANSLATION_KEYS.SERVICE_AGREEMENT.ER_ACKNOWLEDGEMENT)]: "er_acknowledgement_form",
  [translation(TRANSLATION_KEYS.SERVICE_AGREEMENT.FDH_ACKNOWLEDGEMENT)]: "fdh_acknowledgement_form",
  [translation(TRANSLATION_KEYS.SERVICE_AGREEMENT.JOB_ORDER)]: "job_order",
  [translation(TRANSLATION_KEYS.SERVICE_AGREEMENT.EMPLOYER_DATA)]: "employer_data_form",
  [translation(TRANSLATION_KEYS.SERVICE_AGREEMENT.ER_INSURANCE)]: "er_insurance_air_ticketsheet"
};

const checklistMapping = {
  [translation(TRANSLATION_KEYS.CONTRACT_CHECKLIST.X4_CONTRACTS)]: "x4_contracts_original",
  [translation(TRANSLATION_KEYS.CONTRACT_CHECKLIST.EMPLOYER_SIGNATURE)]: "employer_signature_in_all_4_contracts",
  [translation(TRANSLATION_KEYS.CONTRACT_CHECKLIST.HELPER_SIGNATURE)]: "helper_signature_in_all_4_contracts",
  [translation(TRANSLATION_KEYS.CONTRACT_CHECKLIST.COMPANY_CHOP)]: "company_chop_and_witness_signature_in_4_contracts",
  [translation(TRANSLATION_KEYS.CONTRACT_CHECKLIST.WAGES_FOOD)]: "wages_and_food_allowance",
  [translation(TRANSLATION_KEYS.CONTRACT_CHECKLIST.EMPLOYER_ADDRESS)]: "employer_address",
  [translation(TRANSLATION_KEYS.CONTRACT_CHECKLIST.ACCOMMODATION)]: "accommodation_details",
  [translation(TRANSLATION_KEYS.CONTRACT_CHECKLIST.DOMESTIC_DUTIES)]: "domestic_duties_details"
};

const mapContractCheckListTableData = (processingDetails) => {
  return contractCheckListTableData.map((item) => ({
    ...item,
    cs: processingDetails[checklistMapping[item.contract_checklist] + REVIEWED_KEY_SUFFIX] === 1, 
  }));
};

const getDownloadPdfKey = (formKey) => {
    const pdfKeyMapping = {
        'fdh_service_agreement': 'LOCAL_EMPLOYMENT_AGREEMENT',
        'job_order': 'JOB_ORDER',
        'employer_data_form': 'EMPLOYER_DATA_FORM'
    };
    return pdfKeyMapping[formKey] || null;
}

const mapContractServiceAgreementData = (processingDetails) => {  
  return Object.keys(serviceAgreementMapping).map((agreement) => ({
    service_agreement: agreement,
    eng: agreement, // Keep original English text for reference
    cs: processingDetails[serviceAgreementMapping[agreement] + REVIEWED_KEY_SUFFIX] === 1,
    uploaded: processingDetails[serviceAgreementMapping[agreement] + "_uploaded"] ? "Yes" : "No",
    isDoc: !!processingDetails[serviceAgreementMapping[agreement] + "_uploaded"],
    isPdfLoading: false,
    key: getDownloadPdfKey(serviceAgreementMapping[agreement])
  }));
};

const updatePayloadOfContract = (serviceAgreementData, checklistData, additionalFields) => {
  const serviceAgreementPayload = serviceAgreementData.reduce((payload, item) => {
    const key = serviceAgreementMapping[item.service_agreement];
    if (key) {
      payload[key + REVIEWED_KEY_SUFFIX] = item.cs ? 1 : 0;
      payload[key + '_uploaded'] = item.uploaded === 'Yes' ? 1 : 0;
    }
    return payload;
  }, {});

  const checklistPayload = checklistData.reduce((payload, item) => {
    const key = checklistMapping[item.contract_checklist];
    if (key) {
      payload[key + REVIEWED_KEY_SUFFIX] = item.cs ? 1 : 0;
    }
    return payload;
  }, {});

  return {
    ...serviceAgreementPayload,
    ...checklistPayload,
    ...additionalFields,
  };
};

const contractConfig = {
  mapContractCheckListTableData,
  mapContractServiceAgreementData,
  updatePayloadOfContract,
  serviceAgreementMapping,
  checklistMapping,
  TRANSLATION_KEYS
};

export default contractConfig;