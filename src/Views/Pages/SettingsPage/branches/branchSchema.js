import * as yup from 'yup';
import translation from '../../../../utils/translation';

const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
];

const validateBranchHours = (branch, checkedDays) => {
    let errors = {};

    for (let index = 0; index < days.length; index++) {
        const day = days[index];
        const startTimeField = `${day}_branch_operating_start_time`;
        const endTimeField = `${day}_branch_operating_end_time`;
        const startTime = branch[startTimeField];
        const endTime = branch[endTimeField];
        const isChecked = checkedDays?.includes(index + 1);
        if (isChecked) {
            if (!startTime) {
                errors[startTimeField] = 'Start time is required.';
            }
            if (!endTime) {
                errors[endTimeField] = 'End time is required.';
            } else if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
                errors[day] = 'Start time must be earlier than end time.';
            }
        }
    }

    return errors;
};

const branchOperatingTimeSchema = yup
    .date()
    .nullable()
    .transform((value, originalValue) => (originalValue === '' ? null : value));

const branchSchemaFields = days.reduce((schema, day) => {
    schema[`${day}_branch_operating_start_time`] = branchOperatingTimeSchema;
    schema[`${day}_branch_operating_end_time`] = branchOperatingTimeSchema;
    return schema;
}, {});

export const getBranchSchema = (isPartnerAgency = false, isMacau = false) => {
    return yup.object().shape({
        agency_id: yup.string().required(translation('key_agency_id_is_required')),
        branch_name: yup.string().required(translation('key_branch_name_is_required')),
        branch_display_name_en: yup.string().required(translation('key_this_field_is_required')),
        branch_display_name_in: yup.string().required(translation('key_this_field_is_required')),
        branch_display_name_zh_CN: yup.string().required(translation('key_this_field_is_required')),
        branch_code: yup.string().required(translation('key_branch_code_is_required')),
        branch_poc: yup.string().required(translation('key_branch_poc_is_required')),
        branch_phone_number: yup.string()
            .required(translation('key_branch_phone_number_is_required'))
            .matches(/^\d{7,13}$/, translation('key_number_must_be_between_7_and_13_digits')),
        branch_email: yup.string()
            .required(translation('key_branch_email_is_required'))
            .email(translation('key_invalid_email_format')),
        branch_address: yup.string().required(translation('key_branch_address_is_required')),
        // Conditional validation for branch_provinces based on agency category
        branch_provinces: (isPartnerAgency || isMacau)
            ? yup.string().nullable().optional()
            : yup.string().nullable().required(translation('key_branch_provinces_is_required')),
        branch_country_code: yup.string().required(translation('key_branch_country_code_is_required')),
        branch_time_zone: yup.string().required(translation('key_this_field_is_required')),
        branch_google_map_link: yup.string().required(translation('key_branch_google_map_link_is_required')),
        status: yup.string().required(translation('key_status_is_required')),
        off_days: yup.array().required(translation('key_at_least_one_day_must_be_selected')).min(1, translation('key_at_least_one_day_must_be_selected')),
        ...branchSchemaFields,
    }).test('valid-branch-hours', function (branch) {
        const { off_days } = branch;

        const errors = validateBranchHours(branch, off_days);
        if (Object.keys(errors).length > 0) {
            const formattedErrors = Object.entries(errors)
                .map(([key, value]) => `${key}: ${value}`)
                .join('<br>');

            return this.createError({ message: formattedErrors });
        }

        return true;
    }).default([]);
};

// Keep the original export for backward compatibility
export const branchSchema = getBranchSchema(false);