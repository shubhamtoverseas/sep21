
import translation from "../../../utils/translation";

const REVIEWED_KEY_SUFFIX = "_reviewed";

// Define all translation keys in one place
const TRANSLATION_KEYS = {
  VISA_AUTH_LETTER: {
    LETTER_OF_AUTHORIZATION_EMPLOYER: 'key_letter_of_authorization_employer',
    LETTER_OF_AUTHORIZATION_HELPER: 'key_letter_of_authorization_helper'
  }
};

const visaAuthLetterTableData = [
  {
    label: translation(TRANSLATION_KEYS.VISA_AUTH_LETTER.LETTER_OF_AUTHORIZATION_EMPLOYER),
    eng: "Letter of Authorization (Employer)",
    cs: false,
    pdfFileName: "AUTHORIZE_CHANGE_EMPLOYER"
  },
    {
    label: translation(TRANSLATION_KEYS.VISA_AUTH_LETTER.LETTER_OF_AUTHORIZATION_HELPER),
    eng: "Letter of Authorization (Helper)",
    cs: false,
    pdfFileName: "AUTHORIZATION_LETTER_RENEW_OR_EXTEND" 
  }
];

const visaAuthLetterMapping = {
  [translation(TRANSLATION_KEYS.VISA_AUTH_LETTER.LETTER_OF_AUTHORIZATION_EMPLOYER)]: "employer_authorization_letter",
  [translation(TRANSLATION_KEYS.VISA_AUTH_LETTER.LETTER_OF_AUTHORIZATION_HELPER)]: "helper_authorization_letter"
};

const mapVisaAuthLetterTableData = () => {
  return visaAuthLetterTableData.map((item) => ({
    ...item,
  }));
};

const updatePayloadOfVisaAuthLetter = (visaAuthLetterData) => {
  const payload = visaAuthLetterData.reduce((acc, item) => {
    const key = visaAuthLetterMapping[item.label];
    if (key) {
      acc[key + REVIEWED_KEY_SUFFIX] = item.cs ? 1 : 0;
    }
    return acc;
  }, {});

  return {
    ...payload,
  };
};

const visaConfigs = {
  mapVisaAuthLetterTableData,
  updatePayloadOfVisaAuthLetter,
  visaAuthLetterMapping,
  TRANSLATION_KEYS
};

export default visaConfigs;