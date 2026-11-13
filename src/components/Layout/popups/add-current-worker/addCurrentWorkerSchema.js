import dayjs from 'dayjs';
import * as yup from 'yup';
import translation from '../../../../utils/translation';

export const addCurrentWorkerSchema = yup.object().shape({
    worker_name: yup.string().required(translation('key_worker_name_is_required')),
    employer_name: yup.string().required(translation('key_employer_name_is_required')),
    // hk_id: yup.string()
    //     .required(translation('key_hkid_is_required'))
    //     .test('is-hkid-valid', translation('key_hkid_format'), value => {
    //         if (!value) return false;
    //         return /^[a-zA-Z]\d{7}$/.test(value);
    //     }),
    hk_id: yup.string()
        .required(translation('key_hkid_is_required')),
    staying_till_date_in_hk: yup
        .mixed()
        .test(
            'valid-date-or-empty',
            translation('key_stay_in_hk_till_date_is_required'),
            value => {
                if (value === '') {
                    return false; 
                }
                return dayjs(value, dayjs.ISO_8601, true).isValid(); 
            }
        )
        .required(translation('key_stay_in_hk_till_date_is_required')),
});