import * as yup from "yup";
import translation from "../../../../../utils/translation";

export const addWorkerPromotionSchema = yup.object().shape({
    agency_id: yup.number().typeError(translation("key_agency_id_is_required")).required(translation("key_agency_id_is_required")),
    interview_mode: yup.string().required(translation("key_interview_mode_is_required")),
    start_date: yup.date().required(translation("key_start_date_is_required")),
    /* bug log #69: `isInfinite` is a form field now (the hook mirrors the checkbox into it), so this condition is live */
    isInfinite: yup.boolean(),
    end_date: yup.date()
        .nullable()
        .when("isInfinite", {
            is: false,
            then: yup.date()
                .required(translation("key_end_date_is_required"))
                .min(
                    yup.ref("start_date"), 
                    translation("key_end_date_cannot_be_before_start_date")
                )
                .typeError(translation("key_invalid_date_format")),
    }),
});