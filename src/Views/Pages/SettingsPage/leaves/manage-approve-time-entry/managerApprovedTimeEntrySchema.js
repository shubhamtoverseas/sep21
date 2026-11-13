import * as Yup from 'yup';
import translation from '../../../../../utils/translation';

export const managerApprovedTimeEntrySchema = Yup.object().shape({
    user_id: Yup.array()
        .nullable()
        .required(translation('key_user_id_is_required'))
        .min(1, translation('key_user_is_required')),
    from_date: Yup.date()
        .nullable()
        .required(translation('key_from_date_is_required'))
        .typeError(translation('key_invalid_date_format')),
    from_time: Yup.string().nullable().required(translation('key_from_time_is_required')),
    to_time: Yup.string().nullable().required(translation('key_to_time_is_required')),
    time_asked_hours: Yup.number()
        .nullable()
        .min(1, translation('key_minimum_1_hour'))
        .max(24, translation('key_maximum_24_hours')),
    time_asked_minutes: Yup.number()
        .nullable()
        .min(1, translation('key_minimum_1_minute'))
        .max(60, translation('key_maximum_60_minutes')),
    comment: Yup.string()
        .required(translation('key_comment_is_required'))
        .min(10, translation('key_comment_should_be_at_least_10_characters_long'))
        .max(500, translation('key_comment_should_not_exceed_500_characters')),
});

