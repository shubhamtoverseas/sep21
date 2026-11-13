import * as yup from 'yup';
import translation from '../../../../../utils/translation';

export const reporteesActionSchema = yup.object().shape({
    time_approved_hours: yup.number()
        .required(translation('key_duration_hours_are_required'))
        .min(1, translation('key_minimum_1_hour'))
        .max(24,translation('key_maximum_24_hours')),
    /* bug log #108 (fixed 2026-10-06): 0 minutes is valid (hours require ≥ 1), so a request for N hours 0 minutes can be fully approved */
    time_approved_minutes: yup.number()
        .required(translation('key_duration_minutes_are_required'))
        .min(0, translation('key_minimum_1_minute'))
        .max(59,  translation('key_maximum_60_minutes')),
    admin_comment: yup.string()
        .required(translation('key_comment_is_required'))
        .min(10, translation('key_comment_should_be_at_least_10_characters_long'))
        .max(1000, translation('key_comment_should_not_exceed_1000_characters')),   /* backend 353: admin_comment ≤ 1000 */
});