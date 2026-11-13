import * as yup from 'yup';
import translation from '../../../../../utils/translation';

/* bug log #27 (fixed 2026-10-18): the pickers store Date objects, so the times are `mixed` (required), not strings */
export const shiftCodeRowSchema = yup.object().shape({
    shift_code:       yup.string().required(translation("key_shift_code_is_required")),
    shift_start_time: yup.mixed().required(translation("key_this_field_is_required")),
    shift_end_time:   yup.mixed().required(translation("key_this_field_is_required")),
});

export const shiftCodeSchema = yup.object().shape({
    shift_code_data: yup.array().of(shiftCodeRowSchema),
});

/* bug log #29 (fixed 2026-10-18): the edit dialog validates the same three fields as the add form */
export const editShiftCodeSchema = shiftCodeRowSchema;