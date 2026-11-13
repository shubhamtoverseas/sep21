import * as yup from 'yup';
import translation from '../../../../../utils/translation';
import { MACAU_LOCATION_ID } from '../../../../../components/ReusableComponents/constants';

const validateBranchHours = (branch, checkedDays) => {
    const days = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday'
    ];
    let errors = [];

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
            } else if (new Date(startTime) >= new Date(endTime)) {
                errors[day.charAt(0).toUpperCase() + day.slice(1)] = 'Start time must be earlier than end time.';
            }
        }
    }

    return errors;
};



export const addAgencySchema = yup.object().shape({
    agency_name: yup.string().required(translation('key_agency_name_is_required')),
    agency_type: yup.string().required(translation('key_agency_type_is_required')),
    agency_code: yup.string().required(translation('key_agency_code_is_required')),
    agency_category: yup.string().required(translation('key_agency_category_is_required')),
    agency_poc: yup.string().required(translation('key_agency_poc_is_required')),
    agency_phone_number: yup.string()
        .required(translation('key_agency_phone_number_is_required'))
        .matches(/^\d{7,13}$/, translation('key_number_must_be_between_7_and_13_digits')),
    status: yup.string().required(translation('key_status_is_required')),
    country_id: yup.string()
        .nullable()
        .when('agency_category', {
            is: 'partner',
            then: (schema) => schema.required(translation('key_this_field_is_required')),
            otherwise: (schema) => schema.nullable()
        }),
    branch_data: yup.array().of(
        yup.object().shape({
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
            branch_time_zone: yup.string().required(translation('key_this_field_is_required')),
            branch_provinces: yup.string()
                .nullable()
                .test('conditional-required', function (value) {
                    const rootObject = this.from?.[this.from.length - 1]?.value || this.options?.context;
                    const agencyCategory = rootObject?.agency_category;
                    const branchCountryCode = Number(this.parent?.branch_country_code);

                    if (agencyCategory !== 'partner' && branchCountryCode !== MACAU_LOCATION_ID && (!value || value === '')) {
                        return this.createError({
                            message: translation('key_branch_provinces_is_required')
                        });
                    }
                    return true;
                }),
            // branch_postal_code: yup.string().required(translation('key_branch_postal_code_is_required')),
            branch_country_code: yup.string()
                .nullable()  // Add this to allow null values
                .test('conditional-required', function (value) {
                    const rootObject = this.from?.[this.from.length - 1]?.value || this.options?.context;
                    const agencyCategory = rootObject?.agency_category;

                    if (agencyCategory !== 'partner' && (!value || value === '')) {
                        return this.createError({
                            message: translation('key_branch_country_code_is_required')
                        });
                    }
                    return true;
                }),
            off_days: yup.array().required(translation('key_at_least_one_day_must_be_selected')).min(1, translation('key_at_least_one_day_must_be_selected')),
            branch_google_map_link: yup.string()
                .required(translation('key_branch_google_map_link_is_required'))
                .url(translation('key_invalid_url_format')),
            sunday_branch_operating_start_time: yup.date().nullable(),
            sunday_branch_operating_end_time: yup.date().nullable(),
            monday_branch_operating_start_time: yup.date().nullable(),
            monday_branch_operating_end_time: yup.date().nullable(),
            tuesday_branch_operating_start_time: yup.date().nullable(),
            tuesday_branch_operating_end_time: yup.date().nullable(),
            wednesday_branch_operating_start_time: yup.date().nullable(),
            wednesday_branch_operating_end_time: yup.date().nullable(),
            thursday_branch_operating_start_time: yup.date().nullable(),
            thursday_branch_operating_end_time: yup.date().nullable(),
            friday_branch_operating_start_time: yup.date().nullable(),
            friday_branch_operating_end_time: yup.date().nullable(),
            saturday_branch_operating_start_time: yup.date().nullable(),
            saturday_branch_operating_end_time: yup.date().nullable(),
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

        })
    ).default([])
});
