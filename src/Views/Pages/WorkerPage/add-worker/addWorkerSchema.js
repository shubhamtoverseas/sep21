import * as yup from "yup";
import translation from "../../../../utils/translation";

export const updateLocalWorkerOfInvoiceFormSchema = yup.object().shape({
    name: yup
        .string()
        .min(2, translation('key_name_min_2_characters'))
        .required(translation('key_this_field_is_required')),
    surname: yup
        .string()
        .min(2, translation('key_surname_min_2_characters'))
        .required(translation('key_surname_is_required')),
    nationality: yup.string().required(translation('key_nationality_is_required')),
    country_code: yup.string().required(translation('key_country_code_is_required')),
    mobile_number: yup
        .string()
        .matches(/^\d+$/, translation('key_mobile_number_must_be_numeric'))
        .min(7, translation('key_mobile_number_must_be_at_least_7_digits'))
        .required(translation('key_mobile_number_is_required')),
    contract_category: yup.string().required("Contract category is required"),
    whatsapp_country_code: yup.string().nullable(),
    whatsapp_number: yup.string().nullable(),
    email: yup.string().email(translation('key_invalid_email')).nullable(),
    hk_id: yup.string().nullable(),
    contract_status: yup.string().required(translation('key_contract_status_is_required')),
    contract_end_date: yup.string().nullable(),
    visa_expiry_date: yup.string().nullable(),
    early_release_date: yup.string().nullable(),
    wait_in_macau: yup.string().nullable(),
    //expect_released_early: yup.string().nullable(),

});

export const updateGeneralLocalWorkerOfInvoiceFormSchema = yup.object().shape({
    name: yup
        .string()
        .min(2, translation('key_name_min_2_characters'))
        .required(translation('key_this_field_is_required')),
    surname: yup
        .string()
        .min(2, translation('key_surname_min_2_characters'))
        .required(translation('key_surname_is_required')),
    // nationality: yup.string().required(translation('key_nationality_is_required')),
    country_code: yup.string().required(translation('key_country_code_is_required')),
    mobile_number: yup
        .string()
        .matches(/^\d+$/, translation('key_mobile_number_must_be_numeric'))
        .min(7, translation('key_mobile_number_must_be_at_least_7_digits'))
        .required(translation('key_mobile_number_is_required')),
    // contract_category: yup.string().required("Contract category is required"),
    whatsapp_country_code: yup.string().nullable(),
    whatsapp_number: yup.string().nullable(),
    email: yup.string().email(translation('key_invalid_email')).nullable(),
    hk_id: yup.string().required("HK id is required"),
    passport_number: yup.string().required("Passport number is required"),
    // contract_status: yup.string().required("Contract status is required"),
    // contract_end_date: yup.string().nullable(),
    // visa_expiry_date: yup.string().nullable(),
    // early_release_date: yup.string().nullable(),
    // wait_in_macau: yup.string().nullable(),
    //expect_released_early: yup.string().nullable(),

});

export const updateOverseasWorkerOfInvoiceFormSchema = yup.object().shape({
    name: yup
        .string()
        .min(2, translation('key_name_min_2_characters'))
        .required(translation('key_this_field_is_required')),
    surname: yup
        .string()
        .min(2, translation('key_surname_min_2_characters'))
        .required(translation('key_surname_is_required')),
    nationality: yup.string().required(translation('key_nationality_is_required')),
    country_code: yup.string().required(translation('key_country_code_is_required')),
    mobile_number: yup
        .string()
        .matches(/^\d+$/, translation('key_mobile_number_must_be_numeric'))
        .min(7, translation('key_mobile_number_must_be_at_least_7_digits'))
        .required(translation('key_mobile_number_is_required')),
    contract_category: yup.string().required("Contract category is required"),
    whatsapp_country_code: yup.string().nullable(),
    whatsapp_number: yup.string().nullable(),
    email: yup.string().email(translation('key_invalid_email')).nullable(),
    hk_id: yup.string().nullable(),
});

export const updateWorkerBasicDetailInfo = yup.object().shape({
    name: yup
        .string()
        .min(2, translation('key_name_min_2_characters'))
        .required(translation('key_this_field_is_required')),
    surname: yup
        .string()
        .min(2, translation('key_surname_min_2_characters'))
        .required(translation('key_surname_is_required')),
    // nationality: yup.string().required(translation('key_nationality_is_required')),
    country_code: yup.string().required(translation('key_country_code_is_required')),
    mobile_number: yup
        .string()
        .matches(/^\d+$/, translation('key_mobile_number_must_be_numeric'))
        .min(7, translation('key_mobile_number_must_be_at_least_7_digits'))
        .required(translation('key_mobile_number_is_required')),
    whatsapp_country_code: yup.string().nullable(),
    whatsapp_number: yup.string().nullable(),
    email: yup.string().email(translation('key_invalid_email')).nullable(),
});

/* Edit Worker drawer, overseas variant (WRK-016): no HK mobile yet, so the
 * mobile pair is optional and Email becomes the required channel. */
export const updateWorkerNameContactOverseas = yup.object().shape({
    name: yup
        .string()
        .min(2, translation('key_name_min_2_characters'))
        .required(translation('key_this_field_is_required')),
    surname: yup
        .string()
        .min(2, translation('key_surname_min_2_characters'))
        .required(translation('key_surname_is_required')),
    country_code: yup.string().nullable(),
    mobile_number: yup.string().nullable()
        .test('numeric', translation('key_mobile_number_must_be_numeric'), (v) => !v || /^\d+$/.test(v))
        .test('min7', translation('key_mobile_number_must_be_at_least_7_digits'), (v) => !v || v.length >= 7),
    whatsapp_country_code: yup.string().nullable(),
    whatsapp_number: yup.string().nullable(),
    email: yup.string().email(translation('key_invalid_email')).required(translation('key_email_is_required')),
});


export const updateGeneralOverseasWorkerOfInvoiceFormSchema = yup.object().shape({
    name: yup
        .string()
        .min(2, translation('key_name_min_2_characters'))
        .required(translation('key_this_field_is_required')),
    surname: yup
        .string()
        .min(2, translation('key_surname_min_2_characters'))
        .required(translation('key_surname_is_required')),
    // nationality: yup.string().required(translation('key_nationality_is_required')),
    country_code: yup.string().required(translation('key_country_code_is_required')),
    mobile_number: yup
        .string()
        .matches(/^\d+$/, translation('key_mobile_number_must_be_numeric'))
        .min(7, translation('key_mobile_number_must_be_at_least_7_digits'))
        .required(translation('key_mobile_number_is_required')),
    // contract_category: yup.string().required("Contract category is required"),
    whatsapp_country_code: yup.string().nullable(),
    whatsapp_number: yup.string().nullable(),
    email: yup.string().email(translation('key_invalid_email')).nullable(),
    hk_id: yup.string().required("HK id is required"),
    passport_number: yup.string().required("Passport number is required"),
});