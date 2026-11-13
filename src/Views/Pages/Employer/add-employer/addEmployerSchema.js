import * as yup from "yup";
import translation from '../../../../utils/translation';
import { MACAU_LOCATION_ID } from '../../../../components/ReusableComponents/constants';

export const addEmployerSchema = yup.object().shape({
    title: yup.string().required(translation('key_title_is_required')),
    name: yup
        .string()
        .min(2, translation('key_name_min_2_characters'))
        .required(translation('key_this_field_is_required')),
    surname: yup
        .string()
        .min(2, translation('key_surname_min_2_characters'))
        .required(translation('key_surname_is_required')),
    chinese_name: yup.string().nullable(),
    country_code: yup.string().required(translation('key_country_code_is_required')),
    mobile_number: yup
        .string()
        .matches(/^\d+$/, translation('key_mobile_number_must_be_numeric'))
        .min(7, translation('key_mobile_number_must_be_at_least_7_digits'))
        .typeError(translation('key_mobile_number_is_required'))
        .transform((value, originalValue) => {
                    return originalValue === "" ? null : value;
                })
                .matches(/^\d{7,13}$/, translation('key_number_must_be_between_7_and_13_digits'))
        .required(translation('key_mobile_number_is_required')),
    whatsapp_country_code: yup.string().nullable()
        .when('whatsapp_number', {
            is: (val) => val && val.length > 0, // Check if whatsapp_number is present
            then: yup.string().required(translation('key_country_code_is_required')),
            otherwise: yup.string().nullable() // Make it nullable if whatsapp_number is not present
        }),
    // whatsapp_number: yup
    //     .string()
    //     .matches(/^\d+$/, "WhatsApp number must be numeric")
    //     .min(7, "WhatsApp number must be at least 7 digits")
    //     .nullable(),
    email: yup.string().email(translation('key_invalid_email')).nullable(),
    spoken_language: yup.string().required(translation('key_language_is_required')),
    nationality: yup.string().required(translation('key_nationality_is_required')),
    /* EMP §2.4: District is required for a Hong Kong Location and not applicable for Macau. Forms without a Location
       field (Invoice / Insurance pickers) keep the older mobile-code rule. */
    district: yup.string().nullable()
        .typeError(translation('key_this_field_is_required'))
        .when(['country_code', 'location'], {
            is: (code, location) => (location ? Number(location) !== MACAU_LOCATION_ID : Boolean(code) && code === '+852'),
            then: yup
                .string()
                .required(translation('key_this_field_is_required'))
                .typeError(translation('key_this_field_is_required')),
            otherwise: yup.string().nullable()
        }),
    branch_id: yup.string().required(translation('key_branch_is_required')),
});

export const addEmployerOfInvoiceSchema = yup.object().shape({
    branch_id: yup.string().required(translation('key_branch_is_required')),
    title: yup.string().required(translation('key_title_is_required')),
    name: yup
        .string()
        .min(2, translation('key_name_min_2_characters'))
        .required(translation('key_this_field_is_required')),
    surname: yup
        .string()
        // .min(2, translation('key_surname_is_required'))
        .required(translation('key_surname_is_required')),
    chinese_name: yup.string().nullable(),
    country_code: yup.string().required(translation('key_country_code_is_required')),
    mobile_number: yup
        .string()
        .matches(/^\d+$/, translation('key_mobile_number_must_be_numeric'))
        .min(7, translation('key_mobile_number_must_be_at_least_7_digits'))
        .required(translation('key_mobile_number_is_required')),
    // whatsapp_country_code: yup.string().nullable(),
    // whatsapp_number: yup
    //     .string()
    //     .matches(/^\d+$/, "WhatsApp number must be numeric")
    //     .min(7, "WhatsApp number must be at least 7 digits")
    //     .nullable(),
    email: yup.string().email(translation('key_invalid_email')).nullable(),
    // spoken_language: yup.array().of(yup.string()).min(1, "At least one language is required"),
    nationality: yup.string().required(translation('key_this_field_is_required')),
    spoken_language: yup
        .string()
        .required(translation('key_primary_language_is_required')),
    hk_id: yup.string().required(translation('key_hkid_is_required')),
    district: yup.string().nullable(),
    //birth_year_only: yup.string().nullable(),
    occupation: yup.string().nullable(),
    source: yup.string().nullable(),
    residential_address: yup.string().nullable(),
    correspondance_address: yup.string().nullable(),
    date_of_birth: yup.string().nullable(),
});
