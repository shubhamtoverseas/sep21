import * as yup from 'yup';
import translation from '../../../../../utils/translation';

export const salaryBenefitsFormSchema = yup.object().shape({
    salary_basis: yup.string().nullable()
        .transform((value, originalValue) => {
            return originalValue === "" ? null : value;
        }),
    salary_amount: yup
    .number()
    .typeError(translation('key_salary_amount_must_be_a_number'))
    .nullable()
    .transform((value, originalValue) => (originalValue === "" ? null : value))
    .max(999999999, translation('key_salary_amount_too_large'))
    .test(
        'maxDigits',
        translation('key_salary_amount_max_digits'), 
        (value) => {
        if (!value) return true;
        return value.toString().replace('.', '').length <= 12;
        }
    ),
    salary_mpf_contri_type: yup.number().nullable()
        .transform((value, originalValue) => {
            return originalValue === "" ? null : value;
        }),
    salary_mpf_contri_amount: yup.number()
        .typeError(translation('key_mpf_contribution_amount_must_be_a_number'))
        .nullable()
        .transform((value, originalValue) => {
            return originalValue === "" ? null : value;
        }),
    salary_mpf_contri_rate: yup.number()
        .typeError(translation('key_mpf_contribution_rate_must_be_a_number'))
        .nullable()
        .transform((value, originalValue) => {
            return originalValue === "" ? null : value;
        }),
    overtime_pay: yup.number().nullable()
        .transform((value, originalValue) => {
            return originalValue === "" ? null : value;
        }),
    doop_id: yup.string().nullable()
        .transform((value, originalValue) => {
            return originalValue === "" ? null : value;
        }),
    leave_policy: yup.string().nullable()
        .transform((value, originalValue) => {
            return originalValue === "" ? null : value;
        }),
    holiday_list_id: yup.string().nullable()
        .transform((value, originalValue) => {
            return originalValue === "" ? null : value;
        }),
});
