import configData from "./app-configs";
import translation from "../../utils/translation";

const mockCurrentProcessingConfig = (contractDetails) => {
  return {
    hkid: contractDetails.worker_reference_id || '',
    branch: contractDetails.branch_name || '',
    cs: contractDetails.cs_name || '',
    // Excel Contract No. 17 / 20: "CS Assistant —" when empty (rendered by ProcessingInfoCard).
    cs_assistant: contractDetails.cs_assistant_name || '',
    cs_assistant_staff_id: contractDetails.cs_assistant_staff_id || null,
    cs_staff_id: contractDetails.cs_staff_id || null,
    doc_team1: '',
    doc_team2: '',
    name: contractDetails.employer_name || '',
    contract_number: contractDetails.contract_number || '',
    alternate_mobile_number: contractDetails.employer_alternate_mobile_number || '',
    alternate_mobile_country_code: contractDetails.employer_alternate_mobile_country_code || '',
    whatsapp_number: contractDetails.employer_whatsapp_number || '',
    whatsapp_country_code: contractDetails.employer_whatsapp_country_code || '',
    user: {
      country_code: contractDetails.employer_country_code || '',
      mobile_number: contractDetails.employer_mobile_number || '',
    },
    status: contractDetails?.contract_invoice_status_name || '',
    employer_id: contractDetails.employer_id || '',
    employer_user_id: contractDetails.employer_user_id || '',
    cs_staff_email: contractDetails.cs_staff_email || '',
  };
};


const formatContractDetails = (details) => {
  return [{
    title: "Category Type",
    details: [
      { key: "key_contract_category", value: details.contract_category_name || "" },
      { key: "key_nationality", value: details.worker_nationality_name || "" },
      { key: "key_type_internal", value: details.contract_type || "" }
    ],
  },
  {
    title: "Passport Information",
    details: [
      { key: "key_passport_number", value: details.passport_number || "" },
      { key: "key_passport_expiry", value: configData.formatDateToDDMMYYYY(details.passport_expiry_date) || "" }
    ],
  },
  {
    title: "Visa",
    details: [
      { key: "key_visa_reference_no", value: details?.["processingVisaDocumentModel.visa_reference_no"] || "" },
      { key: "key_visa_release", value: configData.formatDateToDDMMYYYY(details?.['processingVisaDocumentModel.e_visa_payment_date']) || "" },
      { key: "key_visa_expiry", field: "visa_expiry", rawValue: details?.['processingVisaDocumentModel.visa_expiry_date'] || "", value: configData.formatDateToDDMMYYYY(details?.['processingVisaDocumentModel.visa_expiry_date']) || "" },
    ],
  },
  {
    title: "Insurance",
    details: [
      { key: "key_insurance_no", value: details?.insurance_number || "" },
      { key: "key_insurance_expiry", value: configData.formatDateToDDMMYYYY(details?.insurance_expiry_date) || "" },
      // the record's coverage as Insurance shows it (conflicts sheet U-0089)
      { key: "key_ins_coverage", value: details?.insurance_cov_label ? translation(`key_ins_coverage_${details.insurance_cov_label}`) : "" },
    ],
  },
  {
    title: "Contract",
    details: [
      { key: "key_contract_date", value: configData.formatDateToDDMMYYYY(details?.contract_date) || "" },
      { key: "key_contract_no", value: details?.contract_number || "" },

    ],
  },
  {
    title: "Contract",
    details: [
      { key: "key_requested_start", value: configData.formatDateToDDMMYYYY(details.requested_start_date) || "" },
      { key: "key_arrival_date", value: configData.formatDateToDDMMYYYY(details['processingDeploymentModel.arrival_date']) || "" },
      // { key: "key_expected_start", value: configData.formatDateToDDMMYYYY(details.expected_start_date) || "" }, //temporarily hidden as per request
    ],
  },
  ];
};


const processingConfigData = {
  mockCurrentProcessingConfig,
  formatContractDetails,
}

export default processingConfigData;