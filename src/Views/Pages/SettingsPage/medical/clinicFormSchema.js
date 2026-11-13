import * as yup from "yup";
import translation from "../../../../utils/translation";

export const clinicFormSchema = yup.object().shape({
    clinic_name: yup.string().required(translation("key_clinic_name_is_required")),
    agency_id: yup.string().required(translation("key_agency_id_is_required")),
    country_id: yup.string().required(translation("key_country_id_is_required")),
    clinic_map_link: yup.string().url(translation("key_invalid_url")).nullable(),
    clinic_address: yup.string().nullable(),
    clinic_email: yup.string().required(translation('key_email_is_required')).email(translation('key_invalid_email')),
});