import * as yup from 'yup';
import translation from '../../../../utils/translation';

export const holidaySchema = yup.object().shape({
    list_name: yup.string().required(translation('key_list_name_is_required')),
    holidays_data: yup.array().of(
        yup.object().shape({
            holiday_name: yup.string().required(translation('key_holiday_name_is_required')),
            holiday_date: yup.date()
            .typeError(translation('key_holiday_date_is_required')) 
            .required(translation('key_holiday_date_is_required')) 

        })
    )
});