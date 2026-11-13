import * as yup from 'yup';
import translation from '../../../../../utils/translation';

export const basicInformationFormSchema = yup.object().shape({
    status: yup.bool(),
    first_name: yup.string().required(translation('key_first_name_is_required')),
    last_name: yup.string().required(translation('key_last_name_is_required')),
    email: yup.string().email(translation('key_invalid_email')).required(translation('key_email_is_required')),
    phone: yup.string().nullable()
        .transform((value, originalValue) => {
            return originalValue === "" ? null : value;
        })
        .matches(/^\d{7,13}$/, translation('key_number_must_be_between_7_and_13_digits')),
    date_of_joining: yup.date()
        .nullable()
        .transform((value, originalValue) => {
            return originalValue === "" ? null : value;
        })
        .required('Date of joining is required'),
    role_id: yup.string().required(translation('key_role_is_required')),
    whatsapp_country_code_name: yup
        .string()
        .nullable()
        .transform((value) => value === null ? '' : value)
        .required(translation('key_this_field_is_required')),

    whatsapp: yup
        .string()
        .nullable()
        .transform((value) => value === null ? '' : value)
        .required(translation('key_this_field_is_required'))
        .min(7, translation('key_number_must_be_between_7_and_13_digits'))
        .max(13, translation('key_number_must_be_between_7_and_13_digits')),
    telephone: yup.string()
        .nullable()
        .transform((value, originalValue) => {
            return originalValue === "" ? null : value;
        })
        .matches(/^\d{7,13}$/, translation('key_number_must_be_between_7_and_13_digits')),
    personal_email: yup.string().nullable().email(translation('key_invalid_email')),
    skype: yup.string().nullable().url(translation('key_invalid_url')),
    facebook: yup.string().nullable().url(translation('key_invalid_url')),
    airtable: yup.string().nullable().url(translation('key_invalid_url')),
    bank_name: yup.string().nullable(),
    bank_account_number: yup.string().nullable(),
    bank_account_name: yup.string().nullable(),
    bank_branch_code: yup.string().nullable(),
    bank_hkid_copy: yup.string().nullable(),
    bank_employment_contract: yup.string().nullable(),
});
