import * as yup from 'yup';
import translation from '../../../../../utils/translation';
import dayjs from 'dayjs';
import { PROFILE_ADDRESS_MAX, PROFILE_MIN_BIRTH_YEAR, PROFILE_TEXT_MAX } from '../../newui/settingsNewUiConstants';
import { validateHKIDStripped } from '../../../../../utils/utils';

/* backend 341 (29 Oct): every key is optional; a key that is sent must be valid — these mirror the server rules so the
   user sees the message before Save. "" / null clear a value. */
const emptyToNull = (value) => (value === '' || value === undefined ? null : value);
const digits = (messageKey) => yup.string().nullable().notRequired().transform(emptyToNull)
    .test('digits-7-13', translation(messageKey), (value) => value === null || /^\d{7,13}$/.test(value));
const link = () => yup.string().nullable().notRequired().transform(emptyToNull)
    .max(PROFILE_TEXT_MAX, `${PROFILE_TEXT_MAX} ${translation('key_characters_allowed')}`)
    .test('valid-link', translation('key_invalid_url_format'), (value) => value === null || (/^https?:\/\//i.test(value) && yup.string().url().isValidSync(value)));
const text = (max = PROFILE_TEXT_MAX) => yup.string().nullable().notRequired().transform(emptyToNull).max(max, `${max} ${translation('key_characters_allowed')}`);

export const profileSchema = yup.object().shape({
    mobile_number: digits('key_number_must_be_between_7_and_13_digits'),
    email: yup.string().nullable().notRequired(),
    /* U-0399 (10 Nov package): the one shared format + check-digit validator, not a local pattern */
    hk_id: yup.string().nullable().notRequired().transform(emptyToNull)
        .test('hkid-format', translation('key_hkid_format_invalid'), (value) => value === null || validateHKIDStripped(value).valid),
    birth_date: yup.string().nullable().notRequired().transform(emptyToNull)
        .test('format', translation('key_birth_date_must_be_in_yyyy_mm_dd_format'), (value) => value === null || (/^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value, 'YYYY-MM-DD', true).isValid() && dayjs(value).year() >= PROFILE_MIN_BIRTH_YEAR))
        .test('not-future', translation('key_birth_date_cannot_be_in_the_future'), (value) => value === null || !dayjs(value, 'YYYY-MM-DD', true).isAfter(dayjs(), 'day')),
    address1: text(PROFILE_ADDRESS_MAX),
    emergency_contact_name: text(),
    emergency_contact_relationship: text(),
    emergency_contact_phone: digits('key_emergency_contact_mobile_number_must_be_between_7_and_13_digits'),
    whatsapp: digits('key_whatsapp_number_must_be_between_7_and_13_digits'),
    telephone: digits('key_telephone_number_must_be_between_7_and_13_digits'),
    personal_email: yup.string().nullable().notRequired().transform(emptyToNull).max(PROFILE_TEXT_MAX, `${PROFILE_TEXT_MAX} ${translation('key_characters_allowed')}`).email(translation('key_invalid_email')),
    skype: link(),
    facebook: link(),
    instagram: link(),
    airtable: link(),
    bank_name: text(),
    bank_account_number: text(),
    bank_account_name: text(),
    bank_branch_code: text(),
    bank_remarks: text(),
    bank_hkid_copy: link(),
    bank_copy: link(),
    bank_employment_contract: link(),
});
