import * as yup from "yup";
import translation from "../../../../utils/translation";

const daysOfOperationSchema = yup.object().shape({
    doop_name: yup.string().required(translation("key_doop_name_is_required")),
    status: yup.boolean().required(),
    /* bug log #44 (fixed 2026-10-18): the field holds operating days, so the message no longer says "off day" */
    work_days: yup.array().min(1, translation("key_at_least_one_day_must_be_selected")),
});
export default daysOfOperationSchema;