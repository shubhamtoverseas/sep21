import * as yup from 'yup';
import translation from '../../../../utils/translation';

export const addAddressSchema = yup.object().shape({
    type: yup.string().required(translation('key_address_type_is_required')),
    address_line_1: yup.string().required(translation('key_address_line_1_is_required')),
});