import * as yup from 'yup';
import translation from '../../../../utils/translation';

export const roleSchema = yup.object().shape({
    role_name: yup.string().required(translation('key_role_name_is_required')),
    status: yup.string().required(translation('key_status_is_required')),
});
