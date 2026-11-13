import * as yup from 'yup';
import translation from '../../../../utils/translation';

export const leaveSchema = yup.object().shape({
    leave_policy_details_id: yup.string().required(translation('key_leave_type_is_required')),
    from_date: yup.date().required(translation('key_leave_from_date_is_required')).typeError(translation('key_leave_from_date_is_required')),
    from_date_type: yup.string().oneOf(['first_half', 'second_half']).required(translation('key_leave_from_date_type_is_required')),
    to_date: yup.date().required(translation('key_leave_to_date_is_required')).typeError(translation('key_leave_to_date_is_required')),
    to_date_type: yup.string().oneOf(['first_half', 'second_half']).required(translation('key_leave_to_date_type_is_required')),
    comment: yup.string().required(translation('key_comment_is_required')),
});
