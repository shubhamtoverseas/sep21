import * as yup from 'yup';
import translation from '../../../../../utils/translation';
import { LIMIT_FLAG } from '../../newui/settingsNewUiConstants';

export const leavePolicySchema = yup.object().shape({
    leave_policy_type: yup
        .string()
        .required(translation('key_leave_type_name_is_required'))
        .trim(),

    accrual_type: yup
        .mixed()
        /* '' sat inside oneOf, so an untouched "Please Select" passed both rules and showed no error (user, 11 Nov) */
        .oneOf(['monthly', 'yearly', 'manual'], translation('key_accrual_type_is_required'))
        .required(translation('key_accrual_type_is_required')),

    accrual_rate: yup
        .number()
        .nullable()
        .transform((value, originalValue) => originalValue === '' ? null : value)
        .when('accrual_type', {
            is: (val) => val !== 'manual',
            then: (schema) => schema
                .required(translation('key_accrual_rate_is_required'))
                .positive(translation('key_accrual_rate_must_be_positive'))
                .typeError(translation('key_accrual_rate_is_required')),
            otherwise: (schema) => schema.nullable()
        }),

    effective_from_date_of_hire: yup
        .number()
        .nullable()
        .transform((value, originalValue) => originalValue === '' ? null : value)
        .min(0, translation('key_must_be_zero_or_positive'))
        .typeError(translation('key_must_be_a_number')),

    carry_forward: yup
        .mixed()
        .oneOf([0, 1, '0', '1'], translation('key_please_select_an_option'))
        .required(translation('key_carry_forwardable_is_required')),

    carry_forward_no_limit: yup
        .boolean()
        .default(false),

    carry_forward_max: yup
        .number()
        .nullable()
        .transform((value, originalValue) => {
            if (originalValue === '' || originalValue === null || originalValue === undefined) {
                return null;
            }
            return Number(originalValue);
        })
        .when(['carry_forward', 'carry_forward_no_limit'], {
            is: (carry_forward, carry_forward_no_limit) => 
                Number(carry_forward) === 1 && !carry_forward_no_limit,
            then: (schema) => schema
                .required(translation('key_carry_forward_max_is_required'))
                .positive(translation('key_must_be_positive'))
                /* Shubham 10 Nov: decimals allowed, up to 2 places (was whole numbers) */
                .test('two-decimals', translation('key_pl_two_decimals'), (value) => value == null || Math.abs(value * 100 - Math.round(value * 100)) < 1e-9)
                .test('max-percentage', function(value) {
                    const { carry_forward_max_type } = this.parent;
                    if (carry_forward_max_type === 'percentage' && value > 100) {
                        return this.createError({
                            message: translation('key_percentage_cannot_exceed_100')
                        });
                    }
                    return true;
                }),
            otherwise: (schema) => schema.nullable()
        }),

    /* backend 359: the type is required only for a limited row (No Limit sends "") */
    carry_forward_max_type: yup
        .string()
        .nullable()
        .when(['carry_forward', 'carry_forward_no_limit'], {
            is: (carry_forward, carry_forward_no_limit) =>
                Number(carry_forward) === 1 && !carry_forward_no_limit,
            then: (schema) => schema
                .required(translation('key_carry_forward_type_is_required'))
                .oneOf(['percentage', 'value'], translation('key_invalid_type')),
            otherwise: (schema) => schema.nullable()
        }),

    encashment: yup
        .mixed()
        .oneOf([0, 1, '0', '1'], translation('key_please_select_an_option'))
        .required(translation('key_encashable_is_required')),

    encashment_no_limit: yup
        .boolean()
        .default(false),

    encashment_max: yup
        .number()
        .nullable()
        .transform((value, originalValue) => {
            if (originalValue === '' || originalValue === null || originalValue === undefined) {
                return null;
            }
            return Number(originalValue);
        })
        .when(['encashment', 'encashment_no_limit'], {
            is: (encashment, encashment_no_limit) => 
                Number(encashment) === 1 && !encashment_no_limit,
            then: (schema) => schema
                .required(translation('key_encash_max_is_required'))
                .positive(translation('key_must_be_positive'))
                /* Shubham 10 Nov: decimals allowed, up to 2 places (was whole numbers) */
                .test('two-decimals', translation('key_pl_two_decimals'), (value) => value == null || Math.abs(value * 100 - Math.round(value * 100)) < 1e-9)
                .test('max-percentage', function(value) {
                    const { encashment_max_type } = this.parent;
                    if (encashment_max_type === 'percentage' && value > 100) {
                        return this.createError({
                            message: translation('key_percentage_cannot_exceed_100')
                        });
                    }
                    return true;
                }),
            otherwise: (schema) => schema.nullable()
        }),

    encashment_max_type: yup
        .string()
        .nullable()
        .when(['encashment', 'encashment_no_limit'], {
            is: (encashment, encashment_no_limit) =>
                Number(encashment) === 1 && !encashment_no_limit,
            then: (schema) => schema
                .required(translation('key_encash_type_is_required'))
                .oneOf(['percentage', 'value'], translation('key_invalid_type')),
            otherwise: (schema) => schema.nullable()
        }),

    threshold: yup
        .number()
        .nullable()
        .transform((value, originalValue) => originalValue === '' ? null : value)
        .min(0, translation('key_must_be_zero_or_positive'))
        .integer(translation('key_must_be_positive_whole_number'))
        .when('encashment', {
            is: (val) => Number(val) === 1,
            then: (schema) => schema.nullable(),
            otherwise: (schema) => schema.nullable()
        }),

    expiry_value_limit: yup
        .mixed()
        .oneOf(['y', 'n'], translation('key_please_select_an_option'))
        .required(translation('key_expiry_is_required')),

    expiry_no_limit: yup
        .boolean()
        .default(false),

    /* bug log #16 (fixed 2026-10-18): the form field is `expiry_value_limit` ("y" shows the expiry input), not `expiry` */
    expiry_in_days: yup
        .mixed()
        .nullable()
        .when(['expiry_value_limit', 'expiry_type'], {
            is: (expiryValueLimit) => expiryValueLimit === LIMIT_FLAG.NO_LIMIT,
            then: (schema) => schema
                .required(translation('key_expiry_value_is_required'))
                .test('valid-value', function (value) {
                    const { expiry_type } = this.parent;

                    // If type is days (string 'days'), validate as number
                    if (expiry_type === 'days') {
                        const numValue = Number(value);
                        if (isNaN(numValue) || numValue <= 0 || !Number.isInteger(numValue)) {
                            return this.createError({
                                message: translation('key_must_be_positive_whole_number')
                            });
                        }
                        return true;
                    }

                    // If type is date (string 'date'), validate as date string
                    if (expiry_type === 'date') {
                        if (!value || typeof value !== 'string') {
                            return this.createError({
                                message: translation('key_please_select_valid_date')
                            });
                        }
                        // Basic date validation (you might want to enhance this)
                        const date = new Date(value);
                        if (isNaN(date.getTime())) {
                            return this.createError({
                                message: translation('key_please_select_valid_date')
                            });
                        }
                        return true;
                    }

                    return true;
                }),
            otherwise: (schema) => schema.nullable()
        }),

    expiry_type: yup
        .string()
        .nullable()
        .when('expiry_value_limit', {
            is: (val) => val === LIMIT_FLAG.NO_LIMIT,
            then: (schema) => schema
                .oneOf(['days', 'date'], translation('key_invalid_type')),
            otherwise: (schema) => schema.nullable()
        }),

    status: yup
        .mixed()
        .oneOf([0, 1, '0', '1'])
        .default(1)
});