import * as yup from 'yup';
import translation from '../../../../../utils/translation';

export const securityFormSchema = () => {
    return yup.object().shape({
        multifactor_email_authentication: yup.boolean(),
        password: yup.string()
            .nullable()
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W)(?=.{8,16})/, {
                message: translation('key_password_must_be_8_16_characters_long_include_at_least_one_uppercase_letter_one_lowercase_letter_one_digit_and_one_special_character'),
                excludeEmptyString: true,
            }),
    });
};