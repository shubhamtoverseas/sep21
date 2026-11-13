import * as Yup from 'yup';
import translation from '../../../../utils/translation';

export const timeRequestSchema = Yup.object().shape({
    date: Yup.date()
        .required(translation('key_date_is_required'))
        .nullable(),
    durationHours: Yup.number()
        .required(translation('key_duration_hours_are_required'))
        .min(1, translation('key_minimum_1_hour'))
        .max(24, translation('key_maximum_24_hours')),
    /* bug log #101 (fixed 2026-10-06): the minute list offers 0 and hours already require ≥ 1, so 0 minutes is valid */
    durationMinutes: Yup.number()
        .required(translation('key_duration_minutes_are_required'))
        .min(0, translation('key_minimum_1_minute'))
        .max(59, translation('key_maximum_60_minutes')),
    comment: Yup.string()
        .required(translation('key_comment_is_required'))
        .min(10, translation('key_comment_should_be_at_least_10_characters_long'))
        .max(500, translation('key_comment_should_not_exceed_500_characters')),
    attachment: Yup.mixed()
        .nullable()
});
