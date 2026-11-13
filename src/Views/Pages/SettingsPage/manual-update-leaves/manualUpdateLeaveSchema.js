import * as yup from 'yup';
import translation from '../../../../utils/translation';

export const manualUpdateLeaveSchema = yup.object().shape({
    method: yup.string().typeError(translation('key_this_field_is_required')).required(translation('key_mode_of_withdrawal_is_required')),
    leave_policy_details_id: yup.number().typeError(translation('key_this_field_is_required')).required(translation('key_leave_type_is_required')),
    user_id: yup.number().typeError(translation('key_this_field_is_required')).required(translation('key_employee_is_required')),
    leave_count: yup.number()
        .typeError(translation('key_this_field_is_required'))
        .required(translation('key_leave_count_is_required'))
        .min(1)
        .max(365),
    comment: yup.string().typeError(translation('key_this_field_is_required')).required(translation('key_comment_is_required')),
});
