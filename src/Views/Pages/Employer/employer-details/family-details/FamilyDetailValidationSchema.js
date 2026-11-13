import * as yup from "yup";
import translation from "../../../../../utils/translation";

export const FamilyDetailValidationSchema = yup.object().shape({
    family_member_info: yup.array().of(
        yup.object().shape({
            name: yup.string().required(translation('key_this_field_is_required')),
            relation: yup.string().required(translation('key_relationship_is_required')),
            hk_id: yup.string().required(translation('key_hkid_is_required')),
            year_only: yup.string().required(translation('key_year_only_selection_is_required')),
        })
    ),
});