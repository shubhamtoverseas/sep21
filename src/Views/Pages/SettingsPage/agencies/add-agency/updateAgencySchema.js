import * as yup from 'yup';
import translation from '../../../../../utils/translation';

export const updateAgencySchema = yup.object().shape({
    agency_id: yup.number().required(translation('key_agency_name_is_required')),
    agency_name: yup.string().required(translation('key_agency_name_is_required')),
    agency_type: yup.string().required(translation('key_agency_type_is_required')),
    agency_code: yup.string().required(translation('key_agency_code_is_required')),
    agency_category: yup.string().required(translation('key_agency_category_is_required')),
    agency_poc: yup.string().required(translation('key_agency_poc_is_required')),
    agency_phone_number: yup.string()
        .required(translation('key_agency_phone_number_is_required'))
        .matches(/^\d{7,13}$/, translation('key_number_must_be_between_7_and_13_digits')),
    status: yup.string().required(translation('key_status_is_required')),
});
